# خطة معالجة الحِمل على فيديوهات الدورات

## الوضع الحالي (المشكلة)
- الفيديوهات تُرفع إلى **Supabase Storage** في bucket خاص `lms-private`.
- المشغّل في `src/routes/learning-management-system.student.player.$courseId.tsx` يطلب `createSignedUrl` (ساعتان) ويُشغّل عبر `<video>` كملف واحد كامل.
- لا يوجد **HLS / تقطيع / Adaptive Bitrate / CDN فيديو متخصص**.

نتيجة: مع عشرات المشاهدين بنفس الوقت → تقطيع، تأخير تحميل، استهلاك Bandwidth مكلف، وSupabase Storage غير مصمّم لبث فيديو واسع.

---

## الحل المقترح: Bunny Stream
أرخص وأبسط CDN فيديو احترافي يدعم:
- تحويل تلقائي إلى **HLS متعدد الجودات** (240p → 1080p).
- **CDN عالمي** مع مشغّل جاهز (iframe) أو HLS مباشر.
- **حماية** عبر Signed URLs / Token Authentication / منع التحميل.
- التسعير ~ $0.005/GB بث + $0.005/دقيقة تخزين (أرخص بكثير من Cloudflare Stream).

البديل الأرخص: **YouTube Unlisted** كاحتياط (مجاني تماماً لكن أقل تحكم وحماية).

---

## مراحل التنفيذ

### المرحلة 1 — البنية التحتية والإعدادات
1. إنشاء حساب على Bunny.net وتفعيل **Stream Library**.
2. الحصول على: `BUNNY_STREAM_LIBRARY_ID`, `BUNNY_STREAM_API_KEY`, `BUNNY_STREAM_CDN_HOSTNAME`, `BUNNY_TOKEN_AUTH_KEY`.
3. تخزينها كأسرار في Lovable Cloud عبر `add_secret`.

### المرحلة 2 — تعديل قاعدة البيانات
إضافة أعمدة جديدة لـ `lms_lessons`:
- `bunny_video_id text` — معرّف الفيديو في Bunny.
- `video_provider text default 'supabase'` — `'supabase'` أو `'bunny'`.
- `video_duration_seconds int`.
- `video_status text` — `pending | processing | ready | failed`.

(الإبقاء على `video_url` للتوافق العكسي مع الفيديوهات القديمة).

### المرحلة 3 — رفع الفيديو (المُدرّب)
في صفحة `learning-management-system.instructor.courses.$id.tsx`:
1. إنشاء **server function** `createBunnyVideo` → ينشئ فيديو فارغ في Bunny ويرجع `video_id` + `upload_url`.
2. الرفع المباشر من المتصفح إلى Bunny (TUS resumable upload) — لا يمر عبر سيرفرنا.
3. حفظ `bunny_video_id` في الدرس مع `video_provider='bunny'`.
4. عرض حالة المعالجة (Bunny يحوّلها إلى HLS تلقائياً خلال دقائق).

### المرحلة 4 — تشغيل الفيديو (الطالب)
في `learning-management-system.student.player.$courseId.tsx`:
1. **server function** `getBunnyPlaybackToken` محمي بـ `requireSupabaseAuth`:
   - يتحقق أن الطالب مسجّل في الدورة.
   - يولّد **Signed Token** لـ Bunny (HMAC SHA256 + expiration + IP).
   - يُرجع `iframe_url` موقّع صالح لمدة 4 ساعات.
2. استبدال `<video>` بـ `<iframe>` من Bunny (يتعامل مع HLS + ABR + مشغّل احترافي تلقائياً).
3. للفيديوهات القديمة (`video_provider='supabase'`) → الإبقاء على المنطق الحالي.

### المرحلة 5 — الأمان
- **منع التنزيل** من إعدادات Bunny Library.
- **Token Authentication** إلزامي + IP locking + expiration قصير.
- **Referer restriction** على دومين الموقع فقط.
- عدم كشف `bunny_video_id` للعملاء بدون التحقق من التسجيل.

### المرحلة 6 — Webhook لتحديث حالة المعالجة
- Route عام `src/routes/api/public/bunny-webhook.ts` يستقبل أحداث Bunny (video ready / failed).
- يتحقق من التوقيع ثم يحدّث `video_status` و `video_duration_seconds`.

### المرحلة 7 — الترحيل (اختياري للفيديوهات الحالية)
- زر في لوحة الأدمن "ترحيل الفيديوهات القديمة إلى Bunny" يقوم بتنزيل من Supabase ورفع إلى Bunny دفعة دفعة.
- يمكن تركها كما هي والاكتفاء بتطبيق Bunny للفيديوهات الجديدة فقط.

---

## النتيجة المتوقعة
| المعيار | الآن (Supabase) | بعد Bunny |
|---|---|---|
| عدد المشاهدين المتزامنين | عشرات | آلاف |
| التحميل التكيفي (ABR) | ❌ | ✅ |
| CDN عالمي | ❌ | ✅ |
| التكلفة لكل 1000 مشاهد | مرتفعة | منخفضة جداً |
| جودة المشغّل | عادي | احترافي |

---

## الأسرار المطلوبة
سأطلبها بعد موافقتك على الخطة:
- `BUNNY_STREAM_LIBRARY_ID`
- `BUNNY_STREAM_API_KEY`
- `BUNNY_STREAM_CDN_HOSTNAME`
- `BUNNY_TOKEN_AUTH_KEY`

---

## ملاحظة مهمة
ممكن البدء بـ **المرحلة 1 → 4** فقط (الأساسيات) ثم إضافة الباقي تدريجياً. هل تريد البدء بـ Bunny أم تفضل بديل آخر (Cloudflare Stream أو YouTube Unlisted)؟
