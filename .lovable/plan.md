
# مبادرة مليون مستخدم — صفحة عامة + نظام إدارة كامل

## 1. المسارات الجديدة

```
/one-million-initiative-home   → الصفحة الرئيسية للمبادرة (عامة، RTL، عربي/إنكليزي)
/one-million-initiative/donors → جدول كل الرعاة والمساهمات
/initiative/claim?token=…      → استلام دعوة المقعد (إنشاء حساب LMS تلقائياً)
/learning-management-system/admin/initiative → إدارة كاملة للمبادرة
```
الصفحة القديمة `/one-million-initiative` تبقى كما هي.

## 2. أقسام الصفحة الرئيسية (بالترتيب)

1. **Hero** — اسم المبادرة + شعار + زرّان (ادفع وابدأ / سجّل على قائمة الانتظار).
2. **3 بطاقات قابلة للقلب (Flip Cards)** — حركة 3D، عند النقر يظهر الوجه الخلفي:
   - **حولنا (About):** التعريف + الجهة المنفذة من ملف PDF.
   - **رسالتنا (Mission):** الأهداف الاستراتيجية (الكمي + السمعة + البيانات + الحملة).
   - **قيمنا (Values):** نموذج المقاعد (1$/مقعد، B2B، قوائم الانتظار، B2C الفوري).
3. **Live Pie Chart** (Recharts) — 4 شرائح:
   - المستخدمون المتدربون (Done)
   - قائمة الانتظار (Waiting)
   - المقاعد المغطاة بالتبرع وغير المخصصة بعد (Covered, unassigned)
   - المتبقي للوصول لمليون (Remaining)
   مع عدّاد كبير "X / 1,000,000".
4. **Top 10 Donors Leaderboard** — جدول مرتّب تنازلياً (شعار/اسم، عدد المقاعد، المبلغ، التاريخ) + زر **عرض الكل** → `/one-million-initiative/donors`.
5. **CTA مزدوجة:**
   - **ادفع وابدأ** → modal بيانات (اسم/إيميل/هاتف) → placeholder لبوابة الدفع (سيتم ربطها لاحقاً) → عند نجاح الدفع: ينشأ enrollment فوري في كورس المبادرة.
   - **سجّل على قائمة الانتظار** → modal بيانات → إدراج في `initiative_waitlist` بحالة `pending` (auto-confirm = لا يحتاج موافقة يدوية، لكن لا يفعَّل الحساب حتى تتم التغطية).
6. **مسؤولية مجتمعية (Corporate Sponsorship)** — نموذج: اسم الشركة/الشخص، إيميل، هاتف، عدد المقاعد، إجمالي محسوب تلقائياً (chairs × rate) بعملة قابلة للاختيار (USD/SYP) → placeholder بوابة الدفع → عند النجاح: تُسجَّل المساهمة وتُغطّى مقاعد قائمة الانتظار FIFO تلقائياً.

## 3. منطق التغطية التلقائية FIFO

- جدول `initiative_donations` (مساهمات الشركات/الأفراد).
- جدول `initiative_waitlist` (المسجّلون بالانتظار، مرتّبون بتاريخ التسجيل).
- جدول `initiative_seats` يمثل كل مقعد ممول (1 مقعد = 1$).
- عند تأكيد تبرع بـ N مقعد: يُنشأ N سجل seats، ثم Postgres trigger يأخذ أقدم N من الانتظار، يربط كل واحد بمقعد، يولّد `claim_token`، يضع `status='covered'`، ويُدرج إيميل في طابور `transactional_emails`.
- المستخدم يفتح رابط الإيميل → صفحة `/initiative/claim` → يضع كلمة سر → نُنشئ حساب Supabase Auth + ينضم تلقائياً لكورس المبادرة (`initiative_settings.course_id`).
- الفرد الذي يدفع مباشرة (ادفع وابدأ) لا يمرّ بالانتظار: نُنشئ حسابه فوراً ونسجّله بالكورس.

## 4. قفل الجلسة على جهاز واحد (لكل مستخدمي LMS)

- جدول `lms_active_sessions(user_id PK, session_id, device_fingerprint, last_seen)`.
- عند تسجيل الدخول: نولّد `session_id` UUID جديد ونكتبه (يستبدل أي قيمة سابقة).
- نخزّن `session_id` في localStorage للعميل.
- middleware/hook في `_authenticated/route.tsx` يستدعي `serverFn validateSession` كل 30 ثانية + عند تغيّر التركيز؛ إذا اختلف الـ `session_id` المخزّن عن الموجود في DB → تسجيل خروج فوري مع رسالة "تم تسجيل الدخول من جهاز آخر".
- يطبَّق على **كل مستخدمي LMS** (طلاب، مدربون، أدمنز).

## 5. لوحة الإدارة `/learning-management-system/admin/initiative`

تبويبات:
- **نظرة عامة:** نفس أرقام الـ Pie + رسم بياني للنمو الأسبوعي.
- **الإعدادات:** سعر المقعد بـ USD، سعر صرف USD→SYP، كورس المبادرة (Select من lms_courses)، نص About/Mission/Values (عربي + إنكليزي).
- **التبرعات:** جدول كل التبرعات + إمكانية إضافة تبرع يدوي (للتبرعات النقدية) + تعديل/حذف.
- **قائمة الانتظار:** عرض، فرز، تصدير CSV، موافقة يدوية اختيارية (override للـ FIFO)، حذف.
- **الرعاة (Top Donors):** مُولَّد تلقائياً من `initiative_donations` بـ `GROUP BY donor_name`، مع إمكانية رفع شعار/تعديل اسم العرض.
- **المقاعد المُغطاة:** سجل كامل مع حالة كل مقعد (covered/claimed/enrolled).

## 6. التغييرات على قاعدة البيانات (Migration)

جداول جديدة:
- `initiative_settings` (صف واحد): `seat_price_usd`, `usd_to_syp_rate`, `course_id`, `about_ar/en`, `mission_ar/en`, `values_ar/en`.
- `initiative_donations`: `donor_name`, `donor_type` (individual/company), `email`, `phone`, `logo_url`, `chairs_count`, `amount`, `currency`, `status` (pending/confirmed), `payment_ref`.
- `initiative_waitlist`: `full_name`, `email` (unique), `phone`, `status` (waiting/covered/claimed/enrolled), `covered_at`, `claim_token`, `claimed_at`.
- `initiative_seats`: `donation_id`, `waitlist_id` (nullable), `status`.
- `initiative_direct_payments`: للأفراد B2C.
- `lms_active_sessions`: قفل الجهاز الواحد.

دوال/Triggers:
- `initiative_cover_waitlist_fifo(donation_id)` — تُستدعى بعد تأكيد التبرع.
- `initiative_claim_seat(token, password)` — تُنشئ المستخدم + enrollment.
- `lms_enforce_single_session()` — يُستدعى من client كل فترة.

RLS:
- `initiative_settings`: قراءة عامة للحقول النصية، تعديل: lms_admin فقط.
- `initiative_donations`: قراءة عامة للأعمدة الآمنة (اسم، مقاعد، تاريخ)، إدخال عبر serverFn فقط.
- `initiative_waitlist`: إدخال عام عبر serverFn (rate-limited)، قراءة: admin فقط.
- `lms_active_sessions`: المستخدم يقرأ/يحدّث صفّه فقط.

GRANTs الكاملة في نفس الميغريشن.

## 7. Server Functions (TanStack)

- `getInitiativeStats()` — public — أرقام الـ pie + total chairs.
- `getTopDonors(limit)` — public — top N.
- `getAllDonors(page)` — public — paginated.
- `submitWaitlist({name,email,phone})` — public — validation + insert.
- `submitDirectPayment(data)` — public — يرجع payment URL placeholder.
- `submitCorporateDonation({company,email,phone,chairs,currency})` — public — يحسب المبلغ، يُنشئ donation pending، يرجع placeholder URL.
- `confirmDonationWebhook(payment_ref)` — internal (سيُستخدم عند تركيب بوابة الدفع) — يحدّث `status='confirmed'` ويستدعي trigger التغطية.
- `claimSeatAccount({token,password,name})` — public.
- `validateActiveSession()` — protected — للتحقق من جهاز واحد.
- لوحة الإدارة: CRUD على donations/waitlist/settings بحماية `requireSupabaseAuth + has_role('lms_admin')`.

## 8. واجهة العميل — تفاصيل تقنية

- مكوّن `FlipCard` بـ Tailwind: `[perspective:1000px]` + `[transform-style:preserve-3d]` + `rotate-y-180` عند الحالة flipped.
- Pie Chart: `recharts` (موجود سلفاً في المشروع غالباً، وإلا `bun add recharts`).
- Polling: `useQuery` مع `refetchInterval: 30000` للإحصائيات.
- النماذج: `react-hook-form` + Zod (`name<=100, email valid, phone regex`, `chairs 1..10000`).
- ثنائية اللغة: استخدام نفس آلية `useLanguage` المستعملة في `ai-tot-graduation.tsx`.
- إضافة tab في `Navbar` (و LmsNavbar إذا لزم) باسم "المبادرة" يقود إلى `/one-million-initiative-home`.

## 9. الإيميلات

- استخدام البنية الحالية: قالب React Email جديد `initiative-seat-claim.tsx` (عربي + إنكليزي) يحتوي رابط `/initiative/claim?token=…`.
- إدراج في queue عبر `enqueue_email('transactional_emails', …)` داخل trigger التغطية.
- (يتطلب أن تكون البنية البريدية مفعّلة سلفاً — وهي مفعّلة بحسب الكود الحالي.)

## 10. ما لم يُنفَّذ الآن (placeholders صريحة)

- بوابة الدفع: زرّان يفتحان modal "سيتم ربط بوابة الدفع لاحقاً" مع TODO واضح في الكود يستقبل لاحقاً webhook على `/api/public/initiative/payment-webhook` (التوقيع + verify).
- اختيار كورس المبادرة: select فارغ في الإعدادات حتى تختاره أنت.

## 11. خطة التنفيذ (الترتيب)

1. Migration واحدة شاملة (جداول + RLS + GRANTs + triggers + RPC).
2. Server functions + نقطة webhook public (هيكلية بدون منطق الدفع الفعلي).
3. مكوّنات UI: FlipCard، StatsPie، DonorsLeaderboard، WaitlistDialog، DirectPaymentDialog، CorporateDonationDialog.
4. صفحة `/one-million-initiative-home` + صفحة `/one-million-initiative/donors` + صفحة `/initiative/claim`.
5. لوحة `/learning-management-system/admin/initiative` بكل تبويباتها.
6. تطبيق قفل الجلسة الواحدة على `_authenticated/route.tsx`.
7. قالب الإيميل + الربط مع الـ trigger.
8. إضافة الـ tab في Navbar.

## أسئلة ستحتاج إجابتها قبل المرحلة التالية (لا تعطّل البناء الآن)

- متى تختار كورس LMS الذي ستفتحه المبادرة؟ (سأتركه قابلاً للاختيار من لوحة الإعدادات.)
- بوابة الدفع: Stripe / Paddle / محلية؟ (سأبني الواجهة بدونها الآن.)
