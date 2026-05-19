# خطة العمل: حذف نظام المحفظة + تكامل Paymera eGate

## الجزء 1: حذف نظام المحفظة والأرباح بالكامل

### Frontend (حذف الملفات والروابط)
- حذف `src/routes/learning-management-system.student.wallet.tsx`
- حذف `src/routes/learning-management-system.instructor.earnings.tsx`
- حذف `src/routes/learning-management-system.admin.wallet.tsx`
- حذف `src/routes/learning-management-system.admin.payouts.tsx`
- إزالة أي روابط لهذه الصفحات من:
  - `src/components/lms/LmsNavbar.tsx`
  - `src/routes/learning-management-system.student.index.tsx`
  - `src/routes/learning-management-system.instructor.index.tsx`
  - `src/routes/learning-management-system.admin.index.tsx`

### Database (Migration)
حذف الجداول والدوال المرتبطة:
- `lms_wallets`
- `lms_transactions`
- `lms_payouts`
- `lms_instructor_earnings`
- النوع `lms_payout_status`
- الدوال: `lms_admin_topup`, `lms_request_payout`, `lms_process_payout`
- إبقاء `lms_settings` (لأنها قد تحتوي إعدادات عامة)

---

## الجزء 2: تكامل Paymera eGate (Test environment)

### 2.1 الـ Secrets المطلوبة (سأطلبها منك)
- `PAYMERA_USERNAME` — اسم المستخدم من Paymera
- `PAYMERA_PASSWORD` — كلمة المرور
- `PAYMERA_TERMINAL_ID` — رقم الـ Terminal
- `PAYMERA_BASE_URL` — `https://egate-t.paymera.cc` (للاختبار)

### 2.2 جدول جديد بقاعدة البيانات: `lms_payments`
الحقول:
- `id` (UUID)
- `paymera_payment_id` (text, unique) — الـ ID الراجع من Paymera
- `user_id` (uuid) — المشتري
- `course_id` (uuid) — الكورس المطلوب
- `amount` (numeric) — المبلغ بالليرة السورية
- `status` (text) — `pending` / `accepted` / `failed` / `canceled`
- `rrn` (text) — رقم العملية من البنك
- `notes` (text)
- `raw_response` (jsonb) — آخر استجابة من Paymera
- `created_at`, `updated_at`

**RLS:**
- المستخدم يقرأ مدفوعاته فقط
- الـ admin يقرأ الكل
- الكتابة فقط عبر server functions (service role)

### 2.3 Backend Files

**`src/lib/paymera.server.ts`** — wrapper للـ APIs:
- `createPayment(amount, notes)` → POST `/api/create-payment`
- `getPaymentStatus(paymentId)` → GET `/api/get-payment-status/{id}`
- `cancelPayment(paymentId)` → POST `/api/cancel-payment`
- يستخدم Basic Auth من env vars

**`src/lib/paymera.functions.ts`** — server functions تنادى من الفرونت:
- `initiateCoursePayment({ courseId })` — يتحقق من السعر، ينشئ payment بـ Paymera، يحفظ سجل، يرجّع URL للتحويل
- `checkPaymentStatus({ paymentId })` — يستعلم عن الحالة من Paymera ويحدث الجدول؛ إذا `accepted` يسجّل المستخدم بالكورس تلقائياً (insert في `lms_enrollments` عبر service role)

**`src/routes/api/public/paymera-trigger.ts`** — webhook:
- يستقبل نداء `triggerURL` من Paymera بعد كل عملية
- يستعلم عن الحالة ويحدث `lms_payments`
- إذا نجحت، ينشئ `lms_enrollments` للمستخدم

### 2.4 Frontend
- **`src/routes/learning-management-system.payment.callback.tsx`** — صفحة الرجوع:
  - تستقبل `?paymentId=...` من URL
  - تستعلم عن الحالة عبر `checkPaymentStatus`
  - تعرض: نجاح / فشل / إلغاء / قيد المعالجة (polling)
  - زر "اذهب للكورس" إذا نجح
- **تعديل صفحة الكورس** `learning-management-system.courses.$id.tsx`:
  - زر "اشترك الآن" للكورسات المدفوعة → ينادي `initiateCoursePayment` → يحوّل لـ Paymera URL

### 2.5 تحويل الأسعار
أسعار الكورسات حالياً `numeric` بالـ DB — Paymera يتوقع عدداً صحيحاً بالليرة السورية. سنرسلها كـ `Math.round(price)`.

---

## ملاحظات تقنية (للمرجع)

- جميع نداءات Paymera من **server-side فقط** (التوكنات لا تصل المتصفح أبداً)
- الإنرولمنت يتم **فقط** بعد تأكيد الحالة من Paymera (لا نثق بـ callback URL وحده، بل نتحقق من `get-payment-status`)
- الـ `triggerURL` و `callbackURL` يجب أن يحتويا الـ `paymentId` كـ query param لربط العملية
- بيئة الإنتاج تتطلب IP ثابت — هذا للتفعيل لاحقاً
