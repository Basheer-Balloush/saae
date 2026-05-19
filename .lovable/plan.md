## المشكلة

إيميلات تسجيل الدخول وتأكيد الحساب تطلع من `no-reply@auth.lovable.cloud` بدل `noreply@aisyria.org`.

**السبب:** Resend جاهز ودومين `aisyria.org` متحقق عنده، بس Supabase Auth ما بيعرف عنو — هو لسا عم يستخدم خدمة الإيميل الافتراضية. ما في طريقة برمجية لتعديل إعدادات SMTP في Supabase من خلال Lovable، والواجهة بتاعت Auth Settings ما فيها قسم SMTP.

## الحل المقترح: تفعيل Lovable Emails

Lovable Emails هي الخدمة المدمجة الرسمية اللي:
- بتستبدل إيميلات Supabase الافتراضية تلقائياً (تأكيد التسجيل، استعادة كلمة السر، magic link، إلخ)
- بترسل من دومينك `noreply@aisyria.org`
- بتدعم قوالب React Email مخصصة بهوية الموقع
- ما بتحتاج SMTP يدوي ولا أي إعداد إضافي

## الخطوات

### 1. إعداد دومين الإرسال
- فتح حوار إعداد الإيميل (`Set up email domain`)
- اختيار `aisyria.org` كدومين أساسي مع subdomain (مثلاً `notify.aisyria.org`)
- إضافة NS records عند مزود الدومين تبعك (يلي بيظهروا بالحوار)
- انتظار التحقق من DNS (لحد 72 ساعة، عادة أسرع بكتير)

### 2. تجهيز قوالب Auth Emails
- إنشاء قوالب React Email للإيميلات الستة (signup, magic-link, recovery, invite, email-change, reauthentication)
- تطبيق ستايل الموقع (ألوان، خط، شعار) بحيث تكون متناسقة مع هوية aisyria

### 3. التفعيل التلقائي
- بمجرد ما يتحقق DNS، Lovable Emails بتتفعل وحدها
- Supabase Auth بيوقف يستخدم الخدمة الافتراضية وبيبعت كل شي عبر Lovable Emails من `noreply@aisyria.org`
- ممكن متابعة الحالة من **Cloud → Emails**

## تنبيه مهم بخصوص Resend الحالي

لما نفعّل Lovable Emails على subdomain (مثلاً `notify.aisyria.org`):
- إذا Resend عندك مظبط على نفس الـ subdomain → رح يصير تعارض، لازم تختار واحد
- إذا Resend مظبط على الدومين الجذر `aisyria.org` أو subdomain تاني → الاثنين بيشتغلوا سوا بدون مشاكل

بتنصح أتركلك Resend شغال لأي إيميلات تطبيقية تانية بتحب تستخدمو فيها، وLovable Emails بتاخد إيميلات الـ Auth تلقائياً.

## البديل الوحيد لو ما بدك تستخدم Lovable Emails

الطريقة الوحيدة التانية = فتح Supabase Dashboard يدوياً وتظبيط SMTP Custom بتفاصيل Resend. بس هاد الشي خارج عن صلاحيات Lovable وما فيني أعملو إلك — لازم تعملو إنت.
