import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Coupon, CouponQuote, CouponUse, PaymentEntry, PaymentMethod } from "@/lib/coupons";

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

export type EnrollResult =
  | { ok: true; status: "pending"; request_id: string; final_price: number | null }
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
  completed_at: string | null;
  amount_due: number | null;
};

/** The signed-in learner's enrollment in a course, with what they owe and
    have paid. */
export async function loadMyEnrollment(courseId: string, userId: string) {
  const { data: e } = await db
    .from("lms_enrollments")
    .select("id, completion_source, completed_at, amount_due")
    .eq("course_id", courseId)
    .eq("student_id", userId)
    .maybeSingle();
  if (!e) return null;
  const { data: entries } = await db
    .from("lms_payment_entries")
    .select("id, kind, amount, corrects_id")
    .eq("course_id", courseId)
    .eq("student_id", userId);
  return {
    enrollment: e as MyEnrollment,
    entries: (entries ?? []) as Pick<PaymentEntry, "id" | "kind" | "amount" | "corrects_id">[],
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

/** Uses that still count against each coupon's limit. */
export async function countActiveUses(): Promise<Record<string, number>> {
  const rows = unwrap(
    await db
      .from("lms_coupon_redemptions")
      .select("coupon_id")
      .in("status", ["pending", "applied"]),
  ) as { coupon_id: string }[];
  const counts: Record<string, number> = {};
  for (const r of rows) counts[r.coupon_id] = (counts[r.coupon_id] ?? 0) + 1;
  return counts;
}

export async function cancelRecognition(useId: string, note: string) {
  unwrap(await db.rpc("lms_admin_cancel_recognition", { _redemption_id: useId, _note: note }));
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
    db
      .from("lms_enrollments")
      .select(
        "id, student_id, completion_source, list_price, discount, amount_due, amount_due_note",
      )
      .eq("course_id", courseId),
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
