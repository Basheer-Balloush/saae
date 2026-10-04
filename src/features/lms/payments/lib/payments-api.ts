import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { RECEIPTS_BUCKET } from "../config";

/* Course payments (migration 20261004120000_course_payments_sham_cash.sql).
   The generated Supabase types predate these tables and functions, so this
   module talks to them untyped and owns their types. Regenerating
   src/integrations/supabase/types.ts later does not change anything here. */
const db = supabase as unknown as SupabaseClient;

export type PaymentStatus = "pending" | "approved" | "rejected" | "suspended";

async function rpc<T>(fn: string, args?: Record<string, unknown>): Promise<T> {
  const { data, error } = await db.rpc(fn, args);
  if (error) throw error;
  return data as T;
}

/* ---------- student ---------- */

export type FormAnswer = { field_id: string; value: unknown };

/** A refused coupon comes back as { ok: false } and writes nothing. */
export function submitPaidEnrollment(args: {
  courseId: string;
  method: "sham_cash";
  receiptPaths: string[];
  answers: FormAnswer[];
  coupon?: string | null;
}) {
  return rpc<
    | { ok: true; request_id: string; payment_id: string; amount: number; status: "pending" }
    | { ok: false; error: string }
  >("lms_submit_paid_enrollment_request", {
    _course_id: args.courseId,
    _method: args.method,
    _receipt_paths: args.receiptPaths,
    _answers: args.answers,
    _coupon: args.coupon || null,
  });
}

export type MyCoursePayment = {
  id: string;
  status: PaymentStatus;
  reviewer_notes: string | null;
  created_at: string;
};

/** The student's latest payment for a course (RLS: own rows only). */
export async function getMyLatestCoursePayment(
  courseId: string,
  userId: string,
): Promise<MyCoursePayment | null> {
  const { data, error } = await db
    .from("lms_course_payments")
    .select("id,status,reviewer_notes,created_at")
    .eq("course_id", courseId)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data as MyCoursePayment | null) ?? null;
}

/* ---------- reviewer ---------- */

export type PaymentRow = {
  id: string;
  request_id: string;
  course_id: string;
  user_id: string;
  method: string;
  amount: number;
  currency: string;
  receipt_count: number;
  status: PaymentStatus;
  reviewer_notes: string | null;
  reviewed_at: string | null;
  suspended_at: string | null;
  created_at: string;
  course_title_ar: string;
  course_title_en: string | null;
  full_name: string | null;
  phone: string | null;
  email: string | null;
};

export type PaymentDetail = {
  payment: {
    id: string;
    request_id: string;
    course_id: string;
    user_id: string;
    method: string;
    amount: number;
    currency: string;
    receipt_paths: string[];
    status: PaymentStatus;
    reviewer_notes: string | null;
    reviewed_at: string | null;
    amount_confirmed_at: string | null;
    suspended_at: string | null;
    created_at: string;
  };
  course: {
    id: string;
    title_ar: string;
    title_en: string | null;
    slug: string | null;
    price: number;
    sale_price: number | null;
  } | null;
  account: {
    email: string | null;
    created_at: string | null;
    last_sign_in_at: string | null;
    email_confirmed_at: string | null;
    meta_full_name: string | null;
    meta_phone: string | null;
  } | null;
  profile: {
    full_name: string | null;
    phone: string | null;
    organization: string | null;
    biography: string | null;
    locale: string | null;
    created_at: string | null;
  } | null;
  answers: FormAnswer[] | null;
  fields: { id: string; label_ar: string; label_en: string | null; field_type: string }[];
  request: { status: string; notes: string | null; created_at: string } | null;
  enrollments: {
    course_title_ar: string;
    course_title_en: string | null;
    enrolled_at: string;
    progress: number;
    completed_at: string | null;
    suspended_at: string | null;
  }[];
  payments: {
    id: string;
    course_title_ar: string;
    course_title_en: string | null;
    amount: number;
    currency: string;
    status: PaymentStatus;
    created_at: string;
  }[];
};

export const listPaymentsForReview = () => rpc<PaymentRow[]>("lms_payment_review_list");

export const getPaymentDetail = (paymentId: string) =>
  rpc<PaymentDetail>("lms_payment_review_detail", { _payment_id: paymentId });

export const approvePayment = (paymentId: string, notes?: string) =>
  rpc("lms_payment_approve", {
    _payment_id: paymentId,
    _amount_confirmed: true,
    _notes: notes || null,
  });

export const rejectPayment = (paymentId: string, notes?: string) =>
  rpc("lms_payment_reject", { _payment_id: paymentId, _notes: notes || null });

export const suspendPayment = (paymentId: string, notes?: string) =>
  rpc("lms_payment_suspend", { _payment_id: paymentId, _notes: notes || null });

export const reactivatePayment = (paymentId: string) =>
  rpc("lms_payment_reactivate", { _payment_id: paymentId });

/** Short-lived links to a payment's receipts (reviewer or owner only). */
export async function signReceipts(paths: string[]): Promise<{ path: string; url: string }[]> {
  if (!paths.length) return [];
  const { data, error } = await supabase.storage
    .from(RECEIPTS_BUCKET)
    .createSignedUrls(paths, 60 * 10);
  if (error) throw error;
  return (data ?? []).flatMap((d) =>
    d.signedUrl ? [{ path: d.path ?? "", url: d.signedUrl }] : [],
  );
}

/** Payments attached to enrollment requests, for the course request lists. */
export async function getPaymentsForRequests(
  requestIds: string[],
): Promise<Record<string, { method: string; status: PaymentStatus }>> {
  if (!requestIds.length) return {};
  const { data, error } = await db
    .from("lms_course_payments")
    .select("request_id,method,status")
    .in("request_id", requestIds);
  if (error) return {};
  const map: Record<string, { method: string; status: PaymentStatus }> = {};
  for (const r of (data ?? []) as { request_id: string; method: string; status: PaymentStatus }[])
    map[r.request_id] = { method: r.method, status: r.status };
  return map;
}

/** Whether the signed-in account may review payments (dedicated role or super admin). */
export async function isPaymentReviewer(userId: string): Promise<boolean> {
  const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  if (error) throw error;
  return (data ?? []).some((r) => (r.role as string) === "lms_payment_admin" || r.role === "admin");
}

export const setPaymentReviewer = (userId: string, enabled: boolean) =>
  rpc("lms_set_payment_reviewer", { _user_id: userId, _enabled: enabled });

export const PAYMENT_METHOD_LABEL: Record<string, { ar: string; en: string }> = {
  sham_cash: { ar: "شام كاش", en: "Sham Cash" },
  paymera: { ar: "Paymera", en: "Paymera" },
  cash: { ar: "كاش", en: "Cash" },
};
