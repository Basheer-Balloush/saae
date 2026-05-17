
# منصة LMS كاملة — /learning-management-system

نظام منفصل (Auth/لوحة/تنسيق خاص فيه) مشابه لفكرة AMS، مع 4 أدوار: زائر، طالب، مدرس، أدمن LMS. الرابط الجذر: `/learning-management-system`.

نظراً لحجم الملف، رح ننفّذه على **5 مراحل** متتالية. كل مرحلة بتطلع شغّالة لحالها وبتنبني فوق يلي قبلها. هاي الخطة بتغطّي **المرحلة 1 (الأساس + الكاتالوج + لوحة الطالب الأولية)** بالتفصيل، وبتلخّص المراحل 2–5.

---

## المرحلة 1 — الأساس + الواجهة العامة + Player الطالب (هاي الجلسة)

### 1) قاعدة البيانات (migration واحد)

أدوار جديدة على enum `app_role`: `lms_student`, `lms_instructor`, `lms_admin` + دالة `has_lms_access(uid)`.

جداول جديدة (كلها بـ RLS):

- `lms_categories` — id, name_ar, name_en, slug, display_order
- `lms_instructors` — user_id (PK→auth.users), full_name, bio, specialty, avatar_url, linkedin_url, github_url, approved (bool), created_at
- `lms_courses` — id, instructor_id, title_ar/en, description_ar/en, category_id, level (enum: beginner/intermediate/advanced), price (numeric), is_free, cover_url, status (enum: draft/pending/rejected/published), rejection_reason, rating_avg, students_count, created_at, updated_at
- `lms_sections` — id, course_id, title, display_order
- `lms_lessons` — id, section_id, title, video_url, content_md, duration_seconds, display_order, attachments (jsonb)
- `lms_enrollments` — id, course_id, student_id, progress (numeric default 0), enrolled_at, completed_at
- `lms_lesson_progress` — student_id, lesson_id, is_completed, completed_at (PK مركّب)
- `lms_reviews` — id, course_id, student_id, rating (1-5), comment, created_at

Storage bucket: `lms-media` (عام للأغلفة) + `lms-private` (خاص للفيديوهات/الواجبات).

سياسات RLS مختصرة:
- `lms_courses` SELECT عام إذا status='published'، غير هيك فقط للمدرس صاحبها أو lms_admin.
- `lms_sections`/`lms_lessons` SELECT للمسجّلين أو المدرس/الأدمن (للدرس الأول free preview اختياري لاحقاً).
- `lms_enrollments` SELECT/INSERT للطالب نفسه فقط؛ DELETE للأدمن.
- `lms_lesson_progress` SELECT/UPSERT للطالب نفسه.
- جميع جداول الإدارة: INSERT/UPDATE/DELETE حسب الدور المناسب.

دالة RPC: `lms_enroll(course_uuid)` تعمل INSERT بـ enrollments + تتحقق ما في تكرار.
Trigger: عند UPSERT على `lms_lesson_progress` يعيد حساب progress في `lms_enrollments`، وإذا 100% يحدّث `completed_at`.

### 2) المصادقة (نظام منفصل)

- `/learning-management-system/login` — Email/Password + Google (عبر broker)
- `/learning-management-system/signup` — يختار الطالب دوره (طالب أو "تقدّم كمدرس")؛ طلب المدرّس بيخلق row بـ `lms_instructors` بـ `approved=false`
- hook `useLmsAuth` (مثل `useAmsAuth`) يرجّع: user, role (student/instructor/admin/none), loading
- Layout route `_learningManagementSystem` (pathless) يحرس المسارات الداخلية

### 3) الراوتات (file-based)

```
src/routes/
  learning-management-system.tsx            (Layout + Navbar خاص + Footer)
  learning-management-system.index.tsx      (Landing: Hero + كورسات مميزة + فئات + إحصائيات)
  learning-management-system.catalog.tsx    (شبكة كورسات + فلاتر: فئة، سعر، تقييم، مدرس، بحث)
  learning-management-system.courses.$id.tsx (تفاصيل الكورس + syllabus + زر تسجيل)
  learning-management-system.login.tsx
  learning-management-system.signup.tsx
  learning-management-system.student.tsx                     (Layout لوحة الطالب)
  learning-management-system.student.index.tsx               (Overview)
  learning-management-system.student.my-courses.tsx
  learning-management-system.student.player.$courseId.tsx    (مشغّل: Sidebar أقسام + فيديو + تبويبات مرفقات/Q&A placeholder)
```

### 4) المكوّنات الجديدة

- `src/components/lms/LmsNavbar.tsx` — تنقّل خاص (Catalog, My Courses, Logout)
- `src/components/lms/LmsFooter.tsx`
- `src/components/lms/CourseCard.tsx`
- `src/components/lms/CourseFilters.tsx`
- `src/components/lms/LessonAccordion.tsx`
- `src/components/lms/VideoPlayer.tsx` (HTML5 + onEnded → mark completed)
- `src/components/lms/ProgressBar.tsx`
- `src/lib/lms-i18n.ts` — ترجمات AR/EN خاصة بالـ LMS

### 5) التصميم

- يحافظ على نفس palette الموقع الأم (semantic tokens من `src/styles.css`) — ما في ألوان مباشرة
- responsive كامل (موبايل + ديسكتوب)
- RTL support للعربي
- skeleton loaders + toast notifications

### 6) منطق هاي المرحلة

- زائر يقدر يتصفّح الكاتالوج وتفاصيل الكورس فقط
- ضغط "تسجّل في الكورس" بدون تسجيل دخول → redirect لـ login
- بعد تسجيل الدخول كطالب → ضغطة زر التسجيل تستدعي `lms_enroll` (مجاناً مؤقتاً — الدفع بالمرحلة 4)
- داخل الـ Player: ضغط "أنهيت الدرس" أو نهاية الفيديو يحدّث `lms_lesson_progress` ويعيد حساب التقدم تلقائياً

---

## نظرة موجزة على المراحل التالية

**المرحلة 2 — لوحة المدرس + Course Builder**
- `student.tsx` نظير: `instructor.tsx` + sub-routes
- إنشاء/تعديل كورس، أقسام، دروس بـ drag&drop
- رفع فيديوهات/مرفقات على bucket `lms-private` + Signed URLs
- تقديم الكورس للمراجعة (status → pending)
- صفحة طلابي + إحصاءات تقدّم
- الرئيسية بـ chart للأرباح/الطلاب

**المرحلة 3 — اختبارات وواجبات + شهادات**
- جداول: `lms_quizzes`, `lms_questions`, `lms_quiz_submissions`, `lms_assignments`, `lms_assignment_submissions`, `lms_certificates`
- مشغّل اختبار بعدّاد + تقييم backend-only
- رفع واجب + واجهة تصحيح المدرّس
- توليد شهادة PDF عند 100% تقدّم

**المرحلة 4 — محفظة + Checkout + عمولات**
- جداول: `lms_wallets`, `lms_transactions`, `lms_instructor_earnings`, `lms_payouts`, `lms_coupons`
- Server Function `lms_checkout(course_id, coupon?)` بـ DB transaction
- سحب الأرباح (workflow طلب → escrow → موافقة أدمن)
- ربط Stripe لاحقاً عبر `recommend_payment_provider`

**المرحلة 5 — لوحة الأدمن LMS + إعدادات**
- موافقة/رفض كورسات
- إدارة مستخدمين (حظر، ترفيع طالب → مدرس)
- معالجة طلبات السحب + ضبط نسبة العمولة
- إعدادات عامة + مفاتيح APIs (Bunny/Vimeo) عبر secrets

---

## تفاصيل تقنية مهمة

- استخدام `createServerFn` لأي query حسّاسة (enroll, checkout, mark-progress)، وتغطية client-side بـ `supabase` مع RLS
- زر "إضافة مدرس/أدمن LMS" بصفحة `/super-admin` الموجودة (يضيف role)
- فيديوهات المرحلة 1: نخزّنها بـ bucket عام مؤقتاً (URL مباشر)؛ بالمرحلة 5 ننقل لـ Signed URLs
- ما رح نلمس أي صفحة موجودة بالموقع الأم (Home/About/News/Contact)؛ فقط نضيف رابط صغير بالـ Navbar الرئيسي لـ "LMS" (اختياري — أأكّد معك)

## القرار المطلوب قبل البدء بالكود

١. **هل أضيف رابط "LMS" بالنافبار الرئيسي للموقع؟** (أو نخليه مستقل بدون رابط ظاهر للعموم)
٢. **هل أبدأ التنفيذ بالمرحلة 1 الآن** بنفس الجلسة (migration + كل ملفات المرحلة 1)؟
