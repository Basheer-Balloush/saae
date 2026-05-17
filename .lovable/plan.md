# خطة: نظام Q&A + نظام الوظائف

## 1) نظام الأسئلة والأجوبة (Q&A)

### قاعدة البيانات
- **`lms_questions`**: `id, lesson_id, student_id, body, created_at`
- **`lms_answers`**: `id, question_id, author_id, body, is_instructor_answer, created_at`
- RLS: أي شخص مسجّل بالدورة (أو المدرّس/الأدمن) يقرأ ويكتب. صاحب السؤال/الرد أو المدرّس/الأدمن يحذف.

### الواجهة (داخل صفحة المشغل، مكان "قريباً")
- فورم لطرح سؤال جديد على الدرس الحالي
- لستة الأسئلة مع ردودها (مرتبة بالأحدث)
- زر "رد" تحت كل سؤال، شارة "مدرّب" على ردود المدرّس
- زر حذف للمالك/المدرّس

## 2) نظام الوظائف (Assignments)

### تخزين الملفات
- bucket خاص جديد: **`lms-assignments`** (خاص، RLS صارم)
- مسار ملف الوظيفة من المدرّس: `assignments/{assignment_id}/brief/{filename}`
- مسار تسليم الطالب: `submissions/{assignment_id}/{student_id}/{filename}`

### قاعدة البيانات
- **`lms_assignments`**: `id, lesson_id, course_id, title, description, brief_file_url, max_grade (default 100), due_date (nullable), created_by, created_at`
- **`lms_submissions`**: `id, assignment_id, student_id, file_url, submitted_at, grade (nullable), feedback (nullable), graded_by (nullable), graded_at (nullable)`
- ميزة `UNIQUE(assignment_id, student_id)` لمنع تسليم مكرر (مع إمكانية تحديث الملف)
- RLS:
  - الوظائف: يقرأها المسجّلون بالدورة + المدرّس + الأدمن. ينشئها/يعدّلها/يحذفها المدرّس صاحب الدورة + الأدمن.
  - التسليمات: الطالب يشوف تسليماته فقط. المدرّس صاحب الدورة + الأدمن يشوفو كل تسليمات وظائفه. الطالب يـINSERT/UPDATE تسليمه فقط. المدرّس يـUPDATE الـgrade والـfeedback فقط (RLS + trigger يحرس باقي الحقول).

### Storage RLS على bucket `lms-assignments`
- `brief/*`: قراءة للمسجّلين بالدورة + المدرّس. كتابة للمدرّس فقط.
- `submissions/{assignment_id}/{student_id}/*`: قراءة للطالب نفسه + المدرّس صاحب الدورة + الأدمن. كتابة للطالب نفسه فقط (مسار يطابق `auth.uid()`).

### الواجهة

**للطالب (داخل المشغل، تحت محتوى الدرس):**
- لستة وظائف الدرس
- لكل وظيفة: عنوان + وصف + زر تحميل ملف الوظيفة + حالة (لم يُسلّم/مُسلّم/تم التقييم)
- زر رفع ملف للتسليم (يستبدل الملف القديم إذا موجود)
- لما يجي تقييم: يظهر الرقم + التعليق

**للمدرّس (صفحة جديدة `/learning-management-system/instructor/assignments/$courseId`):**
- لستة الوظائف في الدورة + زر "إضافة وظيفة" (يختار الدرس + يكتب العنوان/الوصف + يرفع ملف)
- بكل وظيفة: لستة التسليمات (اسم الطالب + تاريخ + زر تحميل الملف + خانة درجة + خانة تعليق + زر حفظ التقييم)

## التفاصيل التقنية

### رفع الملفات (نقطة الاهتمام)
- مكوّن قابل لإعادة الاستخدام `<FileUploader>` يستعمل `supabase.storage.from(bucket).upload(path, file, { upsert: true })`
- يعرض progress + يتحقق من الحجم (مثلاً ≤25MB) ومن الأنواع المسموحة (`.pdf, .doc, .docx, .zip, .rar, .png, .jpg, .txt`)
- بعد الرفع، يخزّن المسار بصيغة `private:bucket/path` بحيث الفرونت يولّد signed URL وقت العرض (نفس النمط المستخدم بفيديو الدروس)
- دالة helper `getSignedUrl(path)` و `useSignedUrl(path)` hook

### Server functions (createServerFn)
- `createAssignment`, `updateAssignment`, `deleteAssignment` (مدرّس صاحب الدورة)
- `submitAssignment` (طالب — upsert تسليم)
- `gradeSubmission` (مدرّس — يحدّث grade/feedback/graded_by/graded_at)
- `listAssignmentsForLesson`, `listSubmissionsForAssignment`, `getMySubmission`
- كلها بـ`requireSupabaseAuth` middleware. التحقق من الصلاحيات بالـSQL/RLS + فحص إضافي بالـhandler.

### ثنائية اللغة
- حقول `title_ar/title_en` و `description_ar/description_en` على `lms_assignments` بنفس النمط الجديد للأقسام/الدروس.

## ملاحظات
- ما رح أعمل تعديل على Q&A بصفحة منفصلة — كله ضمن المشغل
- ملفات الوظائف خاصة (private bucket) للحفاظ على الخصوصية وعدم تسريب التسليمات
