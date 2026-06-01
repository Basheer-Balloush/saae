## خطة الشهادات (LMS Certificates)

### الوضع الحالي
- جدول `lms_certificates` موجود (id, course_id, student_id, serial فريد, issued_at).
- صفحة عرض الشهادة موجودة: `/learning-management-system/certificate/$id` مع زر طباعة.
- صفحة تحقق موجودة: `/learning-management-system/verify` + دالة `verify_certificate(serial)` SECURITY DEFINER للتحقق العام.
- البنية التحتية للإيميل (`enqueue_email` + قائمة الانتظار) مُهيّأة من قبل قوالب إيميلات المصادقة.
- **الناقص**: لا يوجد إصدار تلقائي موثّق عند إتمام الدورة، ولا قوالب إيميل تطبيقية، ولا إرسال بريد للمتدرب، ولا QR على الشهادة، وصفحة الشهادة محميّة بـ RLS (لا تُفتح بالرابط من الإيميل لشخص غير مسجّل دخوله).

---

### 1) الإصدار التلقائي للشهادة (Server Function)
- إنشاء `src/lib/lms-certificate.functions.ts` تحتوي `issueCertificate({ courseId })`:
  - محميّة بـ `requireSupabaseAuth` (المتدرّب فقط).
  - تتحقّق أن `lms_enrollments.progress = 100` (أو نجح في الكويز إن وُجد) لهذا الطالب والدورة.
  - تستخدم `supabaseAdmin` للإدراج في `lms_certificates` مع `serial` فريد بصيغة `SAAE-YYYY-XXXXXX` (8 خانات base32).
  - `ON CONFLICT (course_id, student_id) DO NOTHING`