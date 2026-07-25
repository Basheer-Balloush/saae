/**
 * Maps enrollment RPC error codes (raised by lms_checkout /
 * lms_approve_enrollment_request / lms_create_enrollment_internal) to
 * localized, user-friendly messages. Raw database errors are never surfaced.
 */
export type EnrollmentErrorCode =
  | "unauthenticated"
  | "forbidden"
  | "course_not_found"
  | "course_not_published"
  | "enrollment_closed"
  | "enrollment_deadline_passed"
  | "course_full"
  | "payment_required"
  | "already_enrolled"
  | "request_not_found"
  | "request_not_pending"
  | "invalid_arguments"
  | "invalid_channel";

const MESSAGES: Record<EnrollmentErrorCode, { ar: string; en: string }> = {
  unauthenticated: { ar: "يجب تسجيل الدخول أولاً", en: "Please sign in first" },
  forbidden: { ar: "لا تملك صلاحية تنفيذ هذا الإجراء", en: "You are not allowed to perform this action" },
  course_not_found: { ar: "الدورة غير موجودة", en: "Course not found" },
  course_not_published: { ar: "الدورة غير منشورة", en: "Course is not published" },
  enrollment_closed: { ar: "التسجيل مغلق حالياً", en: "Enrollment is closed" },
  enrollment_deadline_passed: { ar: "انتهى موعد التسجيل", en: "Enrollment deadline has passed" },
  course_full: { ar: "اكتمل عدد المقاعد في هذه الدورة", en: "This course is full" },
  payment_required: { ar: "هذه دورة مدفوعة وتتطلب إتمام الدفع", en: "This is a paid course and requires payment" },
  already_enrolled: { ar: "الطالب مسجّل في الدورة مسبقاً", en: "The student is already enrolled" },
  request_not_found: { ar: "الطلب غير موجود", en: "Request not found" },
  request_not_pending: { ar: "تمت معالجة هذا الطلب مسبقاً", en: "This request has already been decided" },
  invalid_arguments: { ar: "بيانات غير صالحة", en: "Invalid data" },
  invalid_channel: { ar: "بيانات غير صالحة", en: "Invalid data" },
};

function extractCode(error: unknown): EnrollmentErrorCode | null {
  const raw =
    typeof error === "string"
      ? error
      : error && typeof error === "object" && "message" in error
        ? String((error as { message?: unknown }).message ?? "")
        : "";
  const key = raw.trim().toLowerCase();
  for (const code of Object.keys(MESSAGES) as EnrollmentErrorCode[]) {
    if (key === code || key.includes(code)) return code;
  }
  return null;
}

export function enrollmentErrorMessage(error: unknown, ar: boolean): string {
  const code = extractCode(error);
  if (code) return ar ? MESSAGES[code].ar : MESSAGES[code].en;
  return ar ? "حدث خطأ غير متوقع، حاول مرة أخرى" : "Something went wrong, please try again";
}
