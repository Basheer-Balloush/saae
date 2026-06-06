# خطة تحسين أداء بث الفيديو وتحمّل المنصة

## الوضع الحالي (المشكلة)
- فيديوهات الدروس مرفوعة كـ MP4 على bucket `lms-private` في Lovable Cloud.
- المشغّل بالصفحة `learning-management-system.student.player.$courseId.tsx` يطلب **Signed URL** مدته ساعتين ويعرض الفيديو بوسم `<video>` عادي.
- هذا يعني:
  - **تحميل تدريجي (progressive)** بدون جودات متعددة → كل المستخدمين ينزّلون نفس الحجم حتى على إنترنت ضعيف.
  - **بدون CDN حقيقي للفيديو** → كل طلب يضرب نفس origin؛ مع 100+ مستخدم متزامن يصير بطء وتقطيع.
  - **بدون HLS / DASH** → ما في تكيّف مع السرعة، ولا قفز سريع داخل الفيديو، ولا حماية فعلية ضد التنزيل.
  - **التحكم في الوصول عبر signed URL فقط** → بمجرد ما يفتح الطالب الفيديو ينقدر يشاركه ساعتين.

## الهدف
بث فيديو سريع، متكيّف، محمي، يتحمل آلاف المستخدمين دون رفع تكلفة قاعدة البيانات، مع تحسينات عامة على المنصة لتقليل الضغط.

---

## 1) نقل بث الفيديو إلى خدمة Streaming متخصصة

### الخيار الموصى به: **Cloudflare Stream**
- يحوّل أي فيديو مرفوع تلقائياً إلى HLS بعدّة جودات (240p/360p/480p/720p/1080p).
- بث من شبكة CDN عالمية (نفس شبكة Cloudflare اللي عليها التطبيق أصلاً).
- تشغيل عبر `<iframe>` جاهز أو HLS URL مع توكن موقّع لكل مستخدم.
- تسعير بسيط: لكل دقيقة مخزّنة + لكل دقيقة مشاهدة.

بدائل مكافئة: **Mux Video**، **Bunny Stream** (الأرخص)، **api.video**.

### ما الذي يتغيّر
- إضافة جدول/أعمدة:
  - `lms_lessons.video_provider` (`'supabase' | 'cloudflare-stream'`)
  - `lms_lessons.video_uid` (معرّف الفيديو عند المزوّد)
  - `lms_lessons.video_duration_sec`, `lms_lessons.video_ready` (boolean)
- صفحة رفع الفيديو في لوحة المدرّب: بدل الرفع المباشر إلى Storage، يستدعي **server function** ترجع رابط رفع موقّع من Cloudflare Stream، والمتصفح يرفع مباشرة هناك.
- Webhook على `/api/public/stream-webhook` لاستقبال إشعار "الفيديو جاهز" وتحديث `video_ready=true`.
- المشغّل يستخدم `hls.js` (مكتبة خفيفة) مع توكن توقيع يولّده server function `getLessonStreamToken` (يتحقق من تسجيل الطالب قبل الإصدار، مدة قصيرة 10 دقائق، مرتبط بالـ IP اختيارياً).
- الفيديوهات الموجودة حالياً: سكربت ترحيل لمرة واحدة يرفعها إلى Cloudflare Stream عبر API ويعبّي الأعمدة الجديدة، ثم تُحذف من bucket تدريجياً.

### الفوائد الملموسة
- زمن بدء التشغيل ينخفض من ثوانٍ إلى < 1 ثانية.
- الباندويث ما عاد يضرب Lovable Cloud → تكلفة DB/Storage تنزل.
- جودة تلقائية حسب سرعة الطالب، ودعم mobile data.
- حماية أفضل ضد التنزيل المباشر.

---

## 2) تحسينات أداء عامة على المنصة

### أ) قاعدة البيانات
- مراجعة الاستعلامات الثقيلة في صفحات: المشغّل، كتالوج الدورات، صفحة الدورة، لوحة المدرّب.
- إضافة فهارس على الأعمدة المستعملة في الفلاتر (`lms_enrollments.student_id`, `lms_enrollments.course_id, status`, `lms_lessons.section_id`, `lms_lesson_progress.student_id`).
- استبدال الاستعلامات المتسلسلة في `Player` بـ RPC واحدة ترجع (sections + lessons + progress) دفعة وحدة.

### ب) التخزين المؤقت (Caching)
- اعتماد نمط TanStack Query loader + `useSuspenseQuery` في الصفحات العامة (الكتالوج، صفحة الدورة، الأخبار) بدل `useEffect + fetch` لتفعيل SSR caching.
- ضبط `Cache-Control` على الأصول العامة (شعارات الشركاء، صور الأخبار) لمدة طويلة.

### ج) الصور
- تفعيل `vite-imagetools` لتوليد WebP/AVIF تلقائياً لصور الأصول المحلية.
- إضافة `loading="lazy"` و `width/height` صريحة لكل `<img>` خارج الـ above-the-fold.
- صور الأخبار وشعارات الشركاء (المرفوعة): تمرير عبر Cloudflare Image Resizing عند العرض.

### د) حزمة الواجهة (Bundle)
- تقسيم الصفحات الثقيلة (محرر الكورس، QuizBuilder) بـ `React.lazy` لو لم تكن مقسّمة.
- إزالة أي مكتبة غير مستعملة من `package.json`.

### هـ) ترقية حجم instance لـ Lovable Cloud
- مع نمو المستخدمين المتزامنين، يُنصح برفع حجم instance من **Backend → Advanced settings → Upgrade instance** لاستيعاب اتصالات DB أكثر.

---

## 3) الحماية والمراقبة
- منع التنزيل عبر `controlsList="nodownload"` (موجود) + توكن HLS قصير العمر.
- تسجيل أحداث بدء/إنهاء المشاهدة في `lms_lesson_progress` كما هو الآن، إضافة عدّاد مشاهدات اختياري.
- تفعيل تتبّع Web Vitals في الصفحات الأساسية.

---

## ترتيب التنفيذ المقترح

```text
المرحلة 1 (الأهم — تأثير فوري على البث):
  1. إنشاء حساب Cloudflare Stream + إضافة secrets
     (CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_STREAM_TOKEN, CLOUDFLARE_STREAM_KEY_ID, CLOUDFLARE_STREAM_KEY_JWK)
  2. ميجريشن: أعمدة video_provider/video_uid/video_ready على lms_lessons
  3. Server functions: createStreamUploadUrl, getLessonStreamToken
  4. Webhook: /api/public/stream-webhook
  5. تحديث محرّر الدرس عند المدرّب لرفع جديد على Stream
  6. تحديث المشغّل ليستخدم hls.js مع التوكن
  7. سكربت ترحيل للفيديوهات الموجودة

المرحلة 2 (أداء عام):
  8. فهارس DB + RPC مجمّعة للمشغّل
  9. تحويل صفحات القراءة لنمط loader + useSuspenseQuery
  10. تحسين الصور (imagetools + lazy)

المرحلة 3 (اختياري):
  11. رفع حجم Lovable Cloud instance حسب الحاجة
  12. مراقبة Web Vitals
```

---

## ما يحتاج قرار منك قبل البدء
1. **مزوّد البث**: Cloudflare Stream (موصى به، نفس بيئة الاستضافة) أم Bunny Stream (أرخص ~50%) أم Mux (أفضل تحليلات)؟
2. **الفيديوهات الحالية**: نرحّلها كلها دفعة وحدة، أم نخلي القديمة على Supabase والجديدة فقط على المزوّد الجديد؟
3. **هل نبدأ بالمرحلة 1 فقط الآن** (الأثر الأكبر)، ونؤجل المرحلة 2 و3 لجولة لاحقة؟
