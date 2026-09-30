import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type {
  Coupon,
  CouponEffect,
  CouponQuote,
  CouponUse,
  PaymentEntry,
  PaymentMethod,
} from "@/features/lms/lib/coupons";

/*
 * Browser calls for coupons, recognition and payments. Every rule is checked
 * by the database functions these call; tables are read under row-level
 * security (learners see only their own uses and payments, admins see all).
 * The tables are not in the generated Supabase types yet, hence the untyped
 * client.
 */
const db = supabase as unknown as SupabaseClient;

/** Raises the database's error code (e.g. "request_already_pending"). */
function unwrap<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data as T;
}

/* ---------- learners ---------- */

export async function checkCoupon(courseId: string, code: string): Promise<CouponQuote> {
  return unwrap(await db.rpc("lms_check_coupon", { _course_id: courseId, _code: code }));
}

/** "pending": the request, or the recognition code on its own, waits for an
    admin. "recognized" comes only from a database that still applies a
    recognition code at once (before migration 20260930150000). */
export type EnrollResult =
  | {
      ok: true;
      status: "pending";
      request_id: string | null;
      effect?: CouponEffect | null;
      final_price?: number | null;
    }
  | {
      ok: true;
      status: "recognized";
      enrollment_id: string;
      certificate_id: string | null;
      reason: string | null;
    }
  | { ok: false; error: string };

export async function submitEnrollment(input: {
  courseId: string;
  answers: { field_id: string; value: unknown }[];
  coupon: string | null;
}): Promise<EnrollResult> {
  return unwrap(
    await db.rpc("lms_submit_enrollment_request", {
      _course_id: input.courseId,
      _payment_method: "manual",
      _answers: input.answers,
      _coupon: input.coupon,
    }),
  );
}

export async function redeemRecognitionCode(courseId: string, code: string): Promise<EnrollResult> {
  return unwrap(await db.rpc("lms_redeem_recognition_code", { _course_id: courseId, _code: code }));
}

export type MyRecognitionUse = Pick<CouponUse, "id" | "status" | "request_id" | "note">;

/** The learner's latest recognition code on a course: waiting for an admin,
    applied, or given back (refused, when it had no request). */
export async function loadMyRecognitionUse(
  courseId: string,
  userId: string,
): Promise<MyRecognitionUse | null> {
  const { data } = await db
    .from("lms_coupon_redemptions")
    .select("id, status, request_id, note")
    .eq("course_id", courseId)
    .eq("user_id", userId)
    .eq("effect", "recognition")
    .order("created_at", { ascending: false })
    .limit(1);
  return ((data ?? [])[0] as MyRecognitionUse | undefined) ?? null;
}

export type EnrollNote = { ar: string | null; en: string | null };

export async function loadEnrollNote(courseId: string): Promise<EnrollNote> {
  const { data } = await db
    .from("lms_courses")
    .select("enroll_note_ar, enroll_note_en")
    .eq("id", courseId)
    .maybeSingle();
  return { ar: data?.enroll_note_ar ?? null, en: data?.enroll_note_en ?? null };
}

export type MyEnrollment = {
  id: string;
  completion_source: "platform" | "recognition";
  amount_due: number | null;
};

/** The signed-in learner's enrollment in a course, with what they owe and
    have paid, and whether their certificate is already issued. */
export async function loadMyEnrollment(courseId: string, userId: string) {
  // The money columns are not readable from the table (instructors read it).
  const { data: e } = await db
    .rpc("lms_enrollment_billing", { _course_id: courseId })
    .select("id, completion_source, amount_due")
    .eq("student_id", userId)
    .maybeSingle();
  if (!e) return null;
  const [{ data: entries }, { data: certificate }] = await Promise.all([
    db
      .from("lms_payment_entries")
      .select("id, kind, amount, corrects_id")
      .eq("course_id", courseId)
      .eq("student_id", userId),
    db
      .from("lms_certificates")
      .select("id")
      .eq("course_id", courseId)
      .eq("student_id", userId)
      .maybeSingle(),
  ]);
  return {
    enrollment: e as MyEnrollment,
    entries: (entries ?? []) as Pick<PaymentEntry, "id" | "kind" | "amount" | "corrects_id">[],
    certified: !!certificate,
  };
}

/* ---------- admins: coupons ---------- */

export async function listCoupons(): Promise<Coupon[]> {
  return unwrap(await db.from("lms_coupons").select("*").order("created_at", { ascending: false }));
}

export type CouponInput = Omit<Coupon, "id" | "created_at">;

export async function createCoupon(input: CouponInput): Promise<Coupon> {
  return unwrap(await db.from("lms_coupons").insert(input).select("*").single());
}

export async function updateCoupon(id: string, patch: Partial<CouponInput>): Promise<Coupon> {
  return unwrap(await db.from("lms_coupons").update(patch).eq("id", id).select("*").single());
}

/** Deletes a coupon nobody used; returns false when it has been used. */
export async function deleteCoupon(id: string): Promise<boolean> {
  const rows = unwrap(await db.from("lms_coupons").delete().eq("id", id).select("id"));
  return (rows as unknown[]).length > 0;
}

/** Coupon uses with each coupon's code. */
export async function listCouponUses(filter: { couponId?: string; courseId?: string }) {
  let query = db
    .from("lms_coupon_redemptions")
    .select("*, lms_coupons(code)")
    .order("created_at", { ascending: false });
  if (filter.couponId) query = query.eq("coupon_id", filter.couponId);
  if (filter.courseId) query = query.eq("course_id", filter.courseId);
  const rows = unwrap(await query) as (CouponUse & { lms_coupons: { code: string } | null })[];
  return rows.map(({ lms_coupons, ...u }) => ({ ...u, code: lms_coupons?.code ?? null }));
}

/** Per coupon: the uses that still count against its limit, and how many of
    them wait for an admin. */
export async function countCouponUses(): Promise<{
  active: Record<string, number>;
  waiting: Record<string, number>;
}> {
  const rows = unwrap(
    await db
      .from("lms_coupon_redemptions")
      .select("coupon_id, status")
      .in("status", ["pending", "applied"]),
  ) as { coupon_id: string; status: "pending" | "applied" }[];
  const active: Record<string, number> = {};
  const waiting: Record<string, number> = {};
  for (const r of rows) {
    active[r.coupon_id] = (active[r.coupon_id] ?? 0) + 1;
    if (r.status === "pending") waiting[r.coupon_id] = (waiting[r.coupon_id] ?? 0) + 1;
  }
  return { active, waiting };
}

/** Recognition codes entered by learners who were already enrolled, waiting
    for an admin. They have no enrollment request, so they are counted next to
    the requests. Anyone but an admin counts none (row-level security). */
export function waitingRecognitionsQuery(courseId?: string) {
  const query = db
    .from("lms_coupon_redemptions")
    .select("id", { count: "exact", head: true })
    .eq("effect", "recognition")
    .eq("status", "pending")
    .is("request_id", null);
  return courseId ? query.eq("course_id", courseId) : query;
}

/** The same uses, with their course and date, for the requests board. */
export async function listWaitingRecognitions() {
  return unwrap(
    await db
      .from("lms_coupon_redemptions")
      .select("id, course_id, created_at")
      .eq("effect", "recognition")
      .eq("status", "pending")
      .is("request_id", null),
  ) as { id: string; course_id: string; created_at: string }[];
}

export async function cancelRecognition(useId: string, note: string) {
  unwrap(await db.rpc("lms_admin_cancel_recognition", { _redemption_id: useId, _note: note }));
}

/** Accepts or refuses a waiting recognition code. One that came with an
    enrollment request decides that request too. */
export async function decideRecognition(useId: string, approve: boolean, note: string | null) {
  return unwrap(
    await db.rpc("lms_admin_decide_recognition", {
      _redemption_id: useId,
      _approve: approve,
      _note: note,
    }),
  ) as { ok: true; status: "applied" | "released"; request_id: string | null };
}

/* ---------- admins: payments ---------- */

export type CourseEnrollmentMoney = {
  id: string;
  student_id: string;
  completion_source: "platform" | "recognition";
  list_price: number | null;
  discount: number | null;
  amount_due: number | null;
  amount_due_note: string | null;
};

export async function loadCoursePayments(courseId: string) {
  const [enr, entries, uses] = await Promise.all([
    db.rpc("lms_enrollment_billing", { _course_id: courseId }),
    db
      .from("lms_payment_entries")
      .select("*")
      .eq("course_id", courseId)
      .order("created_at", { ascending: true }),
    db
      .from("lms_coupon_redemptions")
      .select("*, lms_coupons(code)")
      .eq("course_id", courseId)
      .in("status", ["pending", "applied", "cancelled"]),
  ]);
  return {
    enrollments: unwrap(enr) as CourseEnrollmentMoney[],
    entries: unwrap(entries) as PaymentEntry[],
    uses: unwrap(uses) as (CouponUse & { lms_coupons: { code: string } | null })[],
  };
}

export type CertificateResult = {
  certificate_id: string | null;
  reason: string | null;
  issued?: boolean;
};

export async function recordPayment(input: {
  courseId: string;
  studentId: string;
  kind: "payment" | "waiver";
  amount: number;
  method: PaymentMethod | null;
  paidOn: string | null;
  reference: string | null;
  note: string | null;
}) {
  return unwrap(
    await db.rpc("lms_record_payment", {
      _course_id: input.courseId,
      _student_id: input.studentId,
      _kind: input.kind,
      _amount: input.amount,
      _method: input.method,
      _paid_on: input.paidOn,
      _reference: input.reference,
      _note: input.note,
    }),
  ) as { entry_id: string; paid: number; certificate: CertificateResult };
}

export async function cancelPaymentEntry(entryId: string, note: string) {
  return unwrap(await db.rpc("lms_cancel_payment_entry", { _entry_id: entryId, _note: note })) as {
    entry_id: string;
    paid: number;
  };
}

export async function setAmountDue(enrollmentId: string, amount: number, note: string) {
  return unwrap(
    await db.rpc("lms_set_amount_due", {
      _enrollment_id: enrollmentId,
      _amount: amount,
      _note: note,
    }),
  ) as { amount_due: number; certificate: CertificateResult };
}

/** The payment rule is admin-only (a database guard refuses anyone else). */
export async function setCertificateRequiresPayment(courseId: string, value: boolean) {
  unwrap(
    await db.from("lms_courses").update({ certificate_requires_payment: value }).eq("id", courseId),
  );
}

export async function loadCourseCouponSettings(courseId: string) {
  const { data } = await db
    .from("lms_courses")
    .select("certificate_requires_payment")
    .eq("id", courseId)
    .maybeSingle();
  return { certificateRequiresPayment: !!data?.certificate_requires_payment };
}
