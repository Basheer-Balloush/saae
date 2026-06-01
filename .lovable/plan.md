## هدف
استبدال رابط الدورة الطويل (UUID) برابط قصير مخصّص يحدّده المدرّب، مثل:
`…/learning-management-system/courses/intro-to-ai` بدلاً من `…/courses/9f3c…`.

## التغييرات

### 1) قاعدة البيانات (Migration)
- إضافة عمود `slug text` على `lms_courses` مع `UNIQUE` وفهرس.
- قيد تحقّق على الشكل: أحرف إنجليزية صغيرة/أرقام/شرطات فقط، طول 3–60، يبدأ وينتهي بحرف/رقم (regex: `^[a-z0-9]+(?:-[a-z0-9]+)*$`).
- دالة `generate_slug(text)` بسيطة لتوليد اقتراح من العنوان (Trigger عند الإنشاء فقط لو `slug IS NULL`) لتجنّب كسر الدورات الموجودة.
- backfill للدورات الحالية: توليد slug من `title_en` أو `title_ar` مع لاحقة قصيرة لضمان التفرّد.
- (الـ RLS الحالية لا تحتاج تعديل — التحديث محصور بالمدرّب/الأدمن).

### 2) المسار (Route)
- الإبقاء على الملف الحالي `learning-management-system.courses.$id.tsx` لكن جعل المعامل يقبل إمّا `slug` أو `uuid`:
  - في الـ loader/component: إن كان النصّ يطابق صيغة UUID → استعلام بـ `id`، وإلا → استعلام بـ `slug`.
- تحديث جميع روابط `<Link to="/learning-management-system/courses/$id" params={{ id }}>` لتمرّر `slug ?? id` (catalog, student dashboard, instructor dashboard, certificate, إلخ).
- تحويل اختياري: لو دخل المستخدم بـ UUID وللدورة slug → `redirect` 301 إلى نسخة الـ slug (لتحسين SEO وتوحيد الرابط).

### 3) واجهة المدرّب
- في `learning-management-system.instructor.courses.$id.tsx` (نموذج تعديل الدورة): إضافة حقل **"الرابط المخصّص (Slug)"**:
  - معاينة مباشرة للرابط الكامل تحت الحقل.
  - تحقّق فوري (debounce) من توفّر الـ slug عبر `supabase.from("lms_courses").select("id").eq("slug", value)`.
  - رسائل خطأ بالعربية/الإنجليزية: "الرابط مستخدم"، "أحرف غير صالحة"، "طول غير صالح".
  - زر "توليد تلقائي من العنوان".
- في **dialog إنشاء دورة جديدة** (`learning-management-system.instructor.index.tsx`): سيتم توليد slug تلقائياً من العنوان عند الإنشاء (يمكن للمدرّب تعديله لاحقاً من صفحة التعديل).

### 4) Sitemap
- تحديث `sitemap[.]xml.ts` لاستخدام slug في روابط الدورات المنشورة.

## ما لن يتغيّر
- المسارات الأخرى للطالب (`/student/player/$courseId`, `/student/quiz/$courseId`) ستبقى على UUID داخلياً (روابط خاصة بالمستخدم بعد التسجيل، لا حاجة لـ slug).
- الـ APIs والوظائف الخادمة (server functions) تبقى تعمل على `id`.

هل أتابع التنفيذ بهذا الشكل؟
