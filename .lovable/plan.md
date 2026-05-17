## Goal

استبدال شبكة الفئات الحاليّة (مربّعات صغيرة بسيطة) في الصفحة الرئيسيّة للمنصّة `/learning-management-system` ببطاقات كبيرة جذّابة، كلّ بطاقة تعرض:

- **خلفيّة متدرّجة** مميّزة لكلّ فئة (لأنّه لا توجد صورة مخزّنة لكلّ فئة في قاعدة البيانات).
- **أيقونة كبيرة** مناسبة للفئة.
- **اسم الفئة** بخطّ بارز.
- **عدّاد عدد الدورات المنشورة** في تلك الفئة (مثلاً: "12 دورة").
- تأثير hover ناعم (رفع البطاقة + توهّج خفيف).

## Layout

- شبكة من 3 أعمدة على الشاشات الكبيرة، عمودَين على الأجهزة المتوسّطة، عمود واحد على الموبايل.
- ارتفاع البطاقة ~ 200–220px لتظهر "كبيرة" مقارنةً بالتصميم الحاليّ.
- استخدام `aspect-[4/3]` تقريبيّ.

## Data

- جدول `lms_categories` لا يحتوي حقل `icon` أو `image`. سنُسند:
  - **أيقونة افتراضيّة** لكلّ فئة عبر mapping على `slug` (مع fallback إلى `BookOpen` للفئات غير المعروفة).
  - **تدرّج لونيّ** يُولَّد بشكل ثابت من ترتيب الفئة (palette من 6 تدرّجات).
- **عدّاد الدورات**: استعلام إضافيّ في `useEffect` يجلب `category_id` و `count` من `lms_courses` حيث `status='published'`، ثمّ نخزّنها في `Map<categoryId, number>`.

## Files to change

- `src/routes/learning-management-system.index.tsx`:
  - إضافة `state` جديد: `courseCountByCategory: Record<string, number>`.
  - في `useEffect`: استعلام `.from('lms_courses').select('category_id').eq('status','published')` ثمّ تجميع العدّ يدويّاً.
  - استبدال JSX قسم الفئات بالتصميم الجديد.
  - إضافة `categoryIconMap` و `categoryGradients` كثوابت في أعلى الملفّ.

## Technical notes

- لا حاجة لتعديل قاعدة البيانات.
- الأيقونات من `lucide-react` (مثل `Code2`, `Brain`, `Briefcase`, `Palette`, `LineChart`, `Megaphone`, `BookOpen`).
- التدرّجات تستخدم متغيّرات `--primary` و `--accent` مع opacity مختلفة للحفاظ على الـ design tokens.
- النصّ "X دورة / X courses" يستخدم `lang === 'ar'` للترجمة inline.
