
# نموذج تسجيل مخصص للدورة

## الفكرة
كل مدرّب يستطيع تصميم نموذج (Form) خاص بدورته، ويُجبر الطالب على تعبئته قبل إرسال طلب التسجيل. الإجابات تُربط بطلب التسجيل ويراها المدرّب والأدمن فقط.

## التغييرات على قاعدة البيانات

جدول `lms_course_forms` — تعريف النموذج لكل دورة:
- `course_id` (فريد)
- `is_active` (تشغيل/إيقاف النموذج)
- `created_by`

جدول `lms_course_form_fields` — حقول النموذج:
- `form_id`، `display_order`
- `field_type`: `short_text` | `long_text` | `number` | `single_choice` | `multi_choice` | `yes_no` | `date` | `file` | `dropdown`
- `label_ar`, `label_en`, `help_text`
- `options` (jsonb) للقوائم/الاختيارات
- `validation` (jsonb): min/max length, min/max value, regex, accepted file types
- `is_required` دائماً `true` (حسب القرار: إلزامي عند وجوده)

جدول `lms_enrollment_form_responses` — إجابات الطالب:
- `request_id` (FK إلى `lms_enrollment_requests`, فريد)
- `course_id`, `user_id`
- `answers` (jsonb): `[{ field_id, value }]`
- ملفات تُرفع إلى bucket `lms-private` تحت `form-uploads/{course_id}/{user_id}/...` ويُخزَّن المسار في الإجابة.

### RLS
- `lms_course_forms` + `lms_course_form_fields`:
  - SELECT عام عندما `is_active = true` (ليقرأ الطالب الحقول قبل التسجيل).
  - ALL للمدرّب صاحب الدورة + `is_lms_admin`.
- `lms_enrollment_form_responses`:
  - INSERT: الطالب لنفسه فقط، ويجب أن يكون له `lms_enrollment_requests` موافق له.
  - SELECT: صاحب الدورة (instructor) + admin فقط. **لا** يقرأها الطالب بعد الإرسال (حسب القرار).
  - لا UPDATE/DELETE من الطالب.

## تعديل تدفّق التسجيل
حالياً الطالب يُنشئ سجلاً في `lms_enrollment_requests` مباشرة. سنحوّل العملية إلى Server Function واحدة `submitEnrollmentRequest`:
1. تتحقّق أن النموذج (إن وُجد ومفعّل) كل حقوله معبّأة وصالحة.
2. تُنشئ صف `lms_enrollment_requests`.
3. تُنشئ صف `lms_enrollment_form_responses` مرتبط به.
4. ترفع المرفقات (مسبقاً عبر `supabase.storage` من الواجهة، ثم تُمرَّر المسارات).

## واجهات المستخدم

### المدرّب — في صفحة تحرير الدورة
قسم جديد "نموذج التسجيل":
- مفتاح تفعيل النموذج.
- Form Builder بسيط: إضافة/حذف/إعادة ترتيب حقول، اختيار النوع، تسميات AR/EN، خيارات للقوائم، قواعد التحقق.
- معاينة مباشرة.

### الطالب — عند الضغط على "تسجيل"
- إذا للدورة نموذج مفعّل: تُفتح نافذة/صفحة بالنموذج الديناميكي، يعبّئها ثم يُرسل (يستخدم Server Function أعلاه).
- إن لم يكن هناك نموذج: السلوك الحالي كما هو.

### الأدمن/المدرّب — في صفحة طلبات التسجيل
- زر "عرض إجابات النموذج" بجانب كل طلب يفتح Drawer يعرض الإجابات والمرفقات (روابط موقّعة قصيرة).

## ملفات ستُنشأ/تُعدَّل
- Migration: الجداول الثلاثة + RLS + bucket policies لـ `form-uploads/*`.
- `src/lib/lms-enrollment.functions.ts` — Server Functions: `submitEnrollmentRequest`, `getCourseForm`, `getResponseForRequest`.
- `src/components/lms/CourseFormBuilder.tsx` — للمدرّب.
- `src/components/lms/EnrollmentFormDialog.tsx` — للطالب.
- `src/components/lms/EnrollmentResponseViewer.tsx` — للمدرّب/الأدمن.
- تعديل: `learning-management-system.instructor.courses.$id.tsx`، `learning-management-system.courses.$id.tsx` (زر التسجيل)، `learning-management-system.admin.enrollment-requests.tsx`، صفحة طلبات الطالب (لإظهار حالة النموذج فقط دون الإجابات).

## نقاط للتأكيد قبل البناء
- اللغات في الحقول: عربي + إنكليزي (متّسق مع باقي LMS) ✅
- الملفات المرفقة: حد أقصى 10MB لكل ملف، أنواع شائعة (pdf/doc/docx/png/jpg).
- لا تعديل من الطالب بعد الإرسال — متّسق مع قرار "المدرّب + الأدمن فقط".
