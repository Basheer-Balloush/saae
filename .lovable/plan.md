# مشكلة `lms.aisyria.org` تحوّل للصفحة الرئيسية

## التشخيص

اختبرت `https://lms.aisyria.org/` بطلب HTTP مباشر، والرد:

```
HTTP/2 302
location: https://aisyria.org/
server: cloudflare
```

يعني الـ **edge تبع Lovable بيعمل redirect 302** على `aisyria.org` (الدومين الـ Primary) قبل ما يوصل الطلب أصلاً للسيرفر تبعنا. منطق `rewriteLmsSubdomain` بـ `src/server.ts` صحيح ١٠٠٪، بس ما عم يشتغل لأنو الطلب ما بيوصلو.

**السبب:** بنظام Lovable، أي دومين مش Primary بيعمل تلقائياً redirect على الـ Primary. توثيق Lovable حرفياً بقول: *"others will then redirect to Primary"*. هاد السلوك مدمج بمستوى الـ edge ومانو قابل للتعديل من داخل المشروع.

## الحلول الممكنة (لازم تختار)

### الخيار ١ — Cloudflare Worker قدّام Lovable (الموصى به)
- نقل DNS تبع `aisyria.org` لـ Cloudflare (مجاني).
- نكتب Worker صغير بيمسك `lms.aisyria.org` ويعمل `fetch` داخلي على `https://saae.lovable.app/learning-management-system{path}` ويرجّع الرد للمستخدم بدون redirect.
- الرابط بشريط العنوان بيضل `lms.aisyria.org`.
- **عيوب:** يحتاج إعداد Cloudflare + قواعد Worker، وأي ربط لاحق مع Supabase auth/cookies بيحتاج ضبط الـ `Host` header.

### الخيار ٢ — استخدام مسار بدل ساب-دومين
- نخلي الرابط `aisyria.org/lms` بدل `lms.aisyria.org`، ونحط redirect من ساب-دومين القديم للجديد.
- **ميزة:** صفر إعدادات بنية تحتية، شغّال فوراً.
- **عيب:** الرابط مش بشكل ساب-دومين.

### الخيار ٣ — إلغاء Primary وجعل المنصة الرئيسية على ساب-دومين
- مش مناسب لأنو `aisyria.org` لازم يضل الموقع الأساسي.

## ماذا سأفعل في وضع البناء؟

**أولاً:** بدي قرارك بين الخيارات. ما بقدر أنا أربط Cloudflare أو أعدل DNS من جهتك — هاد لازم تعملو إنت بحساب Hostinger/Cloudflare.

إذا اخترت:
- **الخيار ١:** بحضّرلك كود الـ Worker الكامل + خطوات نقل DNS لـ Cloudflare + ضبط الـ Worker Route.
- **الخيار ٢:** بشيل منطق `rewriteLmsSubdomain` من `src/server.ts` (ما عاد إلو فايدة) وبضيف redirect بسيط من `lms.aisyria.org` (لما يوصل للـ apex بعد الـ 302) → `/learning-management-system`، وبوثّق إنو الرابط النهائي صار `aisyria.org/lms`.

أي خيار بتفضّل؟
