# خطة العمل

## 1) زر "العودة للموقع" داخل LMS navbar
- في `src/components/lms/LmsNavbar.tsx` أضيف زر/لينك "← العودة للموقع" يوجّه إلى `/` (الصفحة الرئيسية للـ CMS).
- يظهر دائماً (ليس مشروطاً بـ referrer لأن referrer غير موثوق بعد reload).

## 2) حذف نظام المحفظة والأرباح بالكامل
- حذف الصفحات:
  - `src/routes/learning-management-system.student.wallet.tsx`
  - `src/routes/learning-management-system.instructor.earnings.tsx`
  - `src/routes/learning-management-system.admin.wallet.tsx`
  - `src/routes/learning-management-system.admin.payouts.tsx`
- إزالة كل الروابط لهذه الصفحات من `LmsNavbar.tsx` ولوحات student/instructor/admin index.
- Migration لحذف: جداول `lms_wallets`, `lms_transactions`, `lms_payouts`, `lms_instructor_earnings`، النوع `lms_payout_status`، والدوال `lms_admin_topup`, `lms_request_payout`, `lms_process_payout`.

## 3) تكامل بوابة Paymera eGate (Test)
- secrets مطلوبة: `PAYMERA_USERNAME`, `PAYMERA_PASSWORD`, `PAYMERA_TERMINAL_ID`, `PAYMERA_BASE_URL=https://egate-t.paymera.cc`.
- جدول جديد `lms_payments` يحفظ كل عملية (paymera_payment_id, user_id, course_id, amount, status, rrn, raw_response...).
- Server functions (`src/lib/paymera.functions.ts` + `paymera.server.ts`):
  - `initiateCoursePayment({ courseId })` ينشئ عملية ويرجّع URL التحويل.
  - `checkPaymentStatus({ paymentId })` يستعلم ويسجّل المستخدم إذا نجح.
- Webhook في `src/routes/api/public/paymera-trigger.ts` لاستقبال triggerURL.
- صفحة رجوع `learning-management-system.payment.callback.tsx`.

## 4) خياران للدفع: إلكتروني + يدوي
**على صفحة الكورس** المدفوع، يظهر للطالب زرّان:
- **دفع إلكتروني** → يفتح تدفّق Paymera (نقطة 3) ويسجّله تلقائياً عند النجاح.
- **دفع يدوي (طلب اشتراك)** → ينشئ طلباً قيد المراجعة، الأدمن يوافق يدوياً بعد استلام المبلغ.

**جدول جديد `lms_enrollment_requests`:**
- `id, course_id, user_id, payment_method ('manual'|'online'), status ('pending'|'approved'|'rejected'|'cancelled'), notes (للطالب), admin_notes, created_at, decided_at, decided_by`
- RLS: الطالب يقرأ/ينشئ طلباته فقط، الأدمن يقرأ/يحدّث الكل، المدرّب يقرأ طلبات كورساته.
- عند موافقة الأدمن: trigger أو RPC يُنشئ `lms_enrollments` ويزيد `students_count`.

**صفحة جديدة `learning-management-system.admin.enrollment-requests.tsx`:**
- قائمة الطلبات المعلّقة مع زر موافقة/رفض + حقل ملاحظات.

**في صفحة الطالب:** سكشن "طلباتي" يظهر حالة كل طلب.

## 5) إدارة التسجيل والسعة للمدرّب
**Migration على `lms_courses`:**
- `enrollment_open boolean DEFAULT true` — فتح/إغلاق التسجيل.
- `max_students integer NULL` — العدد الأقصى (NULL = غير محدود).

**في `src/routes/learning-management-system.instructor.courses.$id.tsx`:**
- Toggle "فتح/إغلاق التسجيل".
- Input للعدد الأقصى للطلاب.

**Validation:**
- زر الاشتراك (إلكتروني أو يدوي) معطّل/مخفي إذا `enrollment_open=false` أو `students_count >= max_students`.
- نفس التحقق على مستوى server function/RPC لمنع التحايل.
- موافقة الأدمن على طلب يدوي ترفض إذا الكورس امتلأ.

## 6) صفحة 404 — زر "Go home"
الزر الحالي في `src/routes/__root.tsx` يوجّه إلى `/` (الصفحة الرئيسية للموقع) — هذا صحيح أصلاً. سأتأكد فقط من:
- النص ثنائي اللغة (ar/en).
- إصلاح أي روابط داخلية مكسورة وُجدت أثناء التطوير (محذوفة بعد إزالة المحفظة).

---

## تفاصيل تقنية (مرجع)

**ترتيب التنفيذ المقترح:**
1. Migration واحد كبير: حذف جداول المحفظة + إنشاء `lms_payments` + `lms_enrollment_requests` + إضافة `enrollment_open`/`max_students` على `lms_courses`.
2. حذف ملفات المحفظة + تنظيف الروابط.
3. زر العودة في navbar + تحسين 404.
4. صفحة المدرّب: toggle + سعة.
5. تدفق الدفع اليدوي + صفحة طلبات الأدمن.
6. تكامل Paymera (يتطلب secrets منك أولاً).

**ملاحظة:** سأطلب الـ secrets الخاصة بـ Paymera عندما نصل لخطوة التكامل الفعلي؛ باقي الأقسام تتنفذ قبلها.
