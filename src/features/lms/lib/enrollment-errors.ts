/**
 * Maps enrollment RPC error codes (raised by lms_checkout /
 * lms_approve_enrollment_request / lms_create_enrollment_internal) to
 * localized, user-friendly messages. Raw database errors are never surfaced.
 */
export type EnrollmentErrorCode =
  | "course_instructor_cannot_enroll"
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
  | "invalid_answers"
  | "missing_required_fields"
  | "request_already_pending"
  | "invalid_channel"
  | "payment_review_required"
  | "payment_method_unavailable"
  | "course_is_free"
  | "enrollment_suspended"
  | "receipt_required"
  | "too_many_receipts"
  | "invalid_receipt"
  | "amount_not_confirmed"
  | "payment_not_found"
  | "payment_not_pending"
  | "payment_not_approved"
  | "payment_not_suspended"
  | "coupon_not_for_payment"
  | "nothing_to_pay";

const MESSAGES: Record<EnrollmentErrorCode, { ar: string; en: string }> = {
  course_instructor_cannot_enroll: {
    ar: "أنت أحد مدرّسي هذه الدورة، لذلك لا يمكنك التسجيل فيها كطالب.",
    en: "You teach this course. You cannot enroll in it as a student.",
  },
  unauthenticated: { ar: "يجب تسجيل الدخول أولاً", en: "Please sign in first" },
  forbidden: {
    ar: "لا تملك صلاحية تنفيذ هذا الإجراء",
    en: "You are not allowed to perform this action",
  },
  course_not_found: { ar: "الدورة غير موجودة", en: "Course not found" },
  course_not_published: { ar: "الدورة غير منشورة", en: "Course is not published" },
  enrollment_closed: { ar: "التسجيل مغلق حالياً", en: "Enrollment is closed" },
  enrollment_deadline_passed: { ar: "انتهى موعد التسجيل", en: "Enrollment deadline has passed" },
  course_full: { ar: "اكتمل عدد المقاعد في هذه الدورة", en: "This course is full" },
  payment_required: {
    ar: "هذه دورة مدفوعة وتتطلب إتمام الدفع",
    en: "This is a paid course and requires payment",
  },
  already_enrolled: { ar: "الطالب مسجّل في الدورة مسبقاً", en: "The student is already enrolled" },
  request_not_found: { ar: "الطلب غير موجود", en: "Request not found" },
  request_not_pending: {
    ar: "تمت معالجة هذا الطلب مسبقاً",
    en: "This request has already been decided",
  },
  invalid_arguments: { ar: "بيانات غير صالحة", en: "Invalid data" },
  invalid_answers: { ar: "بيانات غير صالحة", en: "Invalid data" },
  missing_required_fields: {
    ar: "يرجى تعبئة جميع الحقول المطلوبة",
    en: "Please fill in all required fields",
  },
  request_already_pending: {
    ar: "لديك طلب تسجيل قيد المراجعة لهذه الدورة",
    en: "You already have a pending request for this course",
  },
  invalid_channel: { ar: "بيانات غير صالحة", en: "Invalid data" },
  payment_review_required: {
    ar: "هذا الطلب مرتبط بدفعة، ويُعتمد أو يُرفض من صفحة مراجعة المدفوعات",
    en: "This request carries a payment; it is decided on the payment review page",
  },
  payment_method_unavailable: {
    ar: "طريقة الدفع هذه غير متاحة حالياً",
    en: "This payment method is not available yet",
  },
  course_is_free: { ar: "هذه الدورة مجانية ولا تحتاج إلى دفع", en: "This course is free" },
  enrollment_suspended: {
    ar: "تم إيقاف وصولك إلى هذه الدورة. يرجى التواصل مع الإدارة",
    en: "Your access to this course is suspended. Please contact the administration",
  },
  receipt_required: {
    ar: "يرجى إرفاق صورة واحدة على الأقل من إيصال التحويل",
    en: "Please attach at least one receipt",
  },
  too_many_receipts: {
    ar: "يمكن إرفاق ثلاثة إيصالات كحدّ أقصى",
    en: "You can attach up to three receipts",
  },
  invalid_receipt: {
    ar: "تعذّر التحقق من أحد الإيصالات، يرجى رفعه من جديد",
    en: "A receipt could not be verified; please upload it again",
  },
  amount_not_confirmed: {
    ar: "يجب تأكيد وصول المبلغ قبل الموافقة",
    en: "Confirm the amount arrived before approving",
  },
  payment_not_found: { ar: "الدفعة غير موجودة", en: "Payment not found" },
  payment_not_pending: {
    ar: "تمت معالجة هذه الدفعة مسبقاً",
    en: "This payment has already been decided",
  },
  payment_not_approved: {
    ar: "لا يمكن إيقاف دورة لم تُعتمد دفعتها",
    en: "Only an approved payment can be suspended",
  },
  payment_not_suspended: { ar: "هذه الدورة غير موقوفة", en: "This course is not suspended" },
  coupon_not_for_payment: {
    ar: "كود الاعتراف لا يحتاج إلى دفع؛ أرسل الطلب بدون إيصال",
    en: "A recognition code needs no payment; send the request without a receipt",
  },
  nothing_to_pay: {
    ar: "لا يوجد مبلغ للدفع بعد الخصم؛ أرسل الطلب بدون إيصال",
    en: "Nothing is left to pay after the discount; send the request without a receipt",
  },
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
