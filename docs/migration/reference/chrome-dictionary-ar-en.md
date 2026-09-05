# Chrome Dictionary — English / Arabic

Extracted from the prototype's `assets/js/language.js` (195 entries).

## How to use this file

These strings are for **new UI chrome only** — labels, eyebrows, section headings,
loader and ribbon copy that the live site never had. Add them as **new keys** in
`src/lib/translations.ts`, under both the `en` and `ar` objects.

**Precedence rules — read before using any row:**

1. If the string already exists in `translations.ts` or `about-content.ts`, **the
   existing Arabic wins.** It is the organisation's approved wording; the prototype's
   is a design-demo paraphrase.
2. If the string is database content — a news headline, excerpt, body, partner name,
   member name — **the database wins.** Rows below that look like news headlines are
   marked BLOCKED and must never be hardcoded.
3. Do **not** port the `language.js` runtime engine itself. It swaps DOM text nodes
   and will corrupt React's rendering. Only the strings travel.

---

| English | Arabic | |
|---|---|---|
| Skip to main content | انتقل إلى المحتوى الرئيسي |  |
| Syrian Association for AI & Entrepreneurship | الجمعية السورية للذكاء الاصطناعي وريادة الأعمال |  |
| News | الأخبار |  |
| Partners | الشركاء |  |
| How we work | كيف نعمل |  |
| Answers | إجابات |  |
| Ask about the initiative | استفسر عن المبادرة |  |
| Explore the initiative | استكشف المبادرة |  |
| Explore | استكشف |  |
| Home | الرئيسية |  |
| About | عن الجمعية |  |
| Menu | القائمة |  |
| Explore SAAE | استكشف الجمعية |  |
| Resources | المصادر |  |
| Official website | الموقع الرسمي |  |
| Opening | البداية |  |
| Loading cinematic scene | جارٍ تحميل المشهد السينمائي |  |
| Intelligence and entrepreneurship for a nation on the rise. | ذكاء وريادة لوطن ينهض |  |
| The learning platform | منصة التعلّم |  |
| Structured pathways, not scattered tutorials. | مسارات منظمة، لا دروس متفرقة. |  |
| Certified training tracks that build professional and technical skill, open to anyone in Syria. | مسارات تدريب معتمدة تبني مهارات مهنية وتقنية، ومتاحة للجميع في سورية. |  |
| Ask about learning | استفسر عن التعلّم |  |
| The Million Syrian AI Users initiative | مبادرة مليون مستخدم سوري للذكاء الاصطناعي |  |
| One million people. One national step forward. | مليون شخص. خطوة وطنية إلى الأمام. |  |
| A national effort to make AI knowledge practical, trusted and reachable. | جهد وطني يجعل معرفة الذكاء الاصطناعي عملية وموثوقة ومتاحة. |  |
| SAAE in numbers | الجمعية بالأرقام |  |
| 5,000+ people learning with SAAE. | أكثر من 5,000 متعلم مع الجمعية. |  |
| trainees | متدربون |  |
| courses | دورات |  |
| strategic partners | شركاء استراتيجيون |  |
| communities | مجتمعات |  |
| SAAE communities | مجتمعات الجمعية |  |
| Building Syria's Digital Future | نبني المستقبل الرقمي لسورية |  |
| Build Syria's AI future. | نبني مستقبل الذكاء الاصطناعي في سورية. |  |
| Practical AI learning, research and entrepreneurship, connected for people across Syria. | تعلّم وبحث وريادة أعمال عملية في الذكاء الاصطناعي، متصلة بالناس في كل سورية. |  |
| A shared future starts with shared knowledge. | يبدأ المستقبل المشترك بالمعرفة المشتركة. |  |
| Scroll to begin | مرّر للبدء |  |
| Scroll | مرّر |  |
| Latest news | آخر الأخبار |  |
| The work, as it happens. | العمل كما يحدث. |  |
| Training rooms, national broadcasts and public launches — the running record of what SAAE is building. | قاعات تدريب وبث وطني وإطلاقات عامة — سجل متجدد لما تبنيه الجمعية. |  |
| Broadcast | إعلام |  |
| Initiative | مبادرة |  |
| Training | تدريب |  |
| Applied work | عمل تطبيقي |  |
| The full record | السجل الكامل |  |
| Full story coming soon | القصة الكاملة قريباً |  |
| More updates coming soon | المزيد من التحديثات قريباً |  |
| The million-user initiative goes to national television | مبادرة المليون مستخدم تصل إلى التلفزيون الوطني | **BLOCKED — use the DB** |
| SAAE’s chairman set out the initiative’s progress on Syria TV, putting a national AI programme in front of a national audience. | عرض رئيس الجمعية تقدم المبادرة على التلفزيون السوري، واضعاً برنامجاً وطنياً للذكاء الاصطناعي أمام جمهور وطني. | **BLOCKED — use the DB** |
| Training one million Syrian AI users begins | انطلاق تدريب مليون مستخدم سوري للذكاء الاصطناعي | **BLOCKED — use the DB** |
| A national programme to advance digital transformation and build the country’s own capability, opened to the public. | برنامج وطني لتعزيز التحول الرقمي وبناء القدرات المحلية، ومتاح للجميع. | **BLOCKED — use the DB** |
| Syria's first AI trainers graduate | تخريج أول مدربي الذكاء الاصطناعي في سورية | **BLOCKED — use the DB** |
| The first cohort completed 100 hours of training and began carrying practical AI knowledge into rooms of their own. | أتمّت الدفعة الأولى 100 ساعة تدريب وبدأت بنقل المعرفة العملية بالذكاء الاصطناعي إلى بيئات عملها. | **BLOCKED — use the DB** |
| The Greater Aleppo plan shown at BUILDEX | عرض مخطط حلب الكبرى في معرض بيلدكس | **BLOCKED — use the DB** |
| SAAE joined Aleppo Governorate’s pavilion with a draft master plan that puts spatial survey, community consultation and open urban data on one map. | شاركت الجمعية في جناح محافظة حلب بمسودة مخطط رئيسي يجمع المسح المكاني والمشاورة المجتمعية والبيانات الحضرية المفتوحة في خريطة واحدة. | **BLOCKED — use the DB** |
| Everything SAAE has published. | كل ما نشرته الجمعية. |  |
| Every announcement will appear here in date order, with its Arabic original. | سيظهر كل إعلان هنا حسب التاريخ، مع نسخته العربية الأصلية. |  |
| Institutions carry it further. | المؤسسات تدفعها إلى الأمام. |  |
| Shared work | عمل مشترك |  |
| Universities, ministries, companies and community organisations already work with SAAE on training and applied projects. | تعمل الجامعات والوزارات والشركات ومنظمات المجتمع مع الجمعية في التدريب والمشاريع التطبيقية. |  |
| All twenty-three, in the order SAAE publishes them. | الشركاء الثلاثة والعشرون، بحسب ترتيب نشر الجمعية لهم. |  |
| Marks and names are presented here as part of the redesigned official website. | تُعرض الشعارات والأسماء هنا ضمن الموقع الرسمي المعاد تصميمه. |  |
| View all 23 partners | شاهد الشركاء الـ 23 |  |
| How SAAE works: train, apply, build | كيف تعمل الجمعية: درّب، طبّق، وابنِ |  |
| TRAIN | درّب |  |
| APPLY | طبّق |  |
| BUILD | ابنِ |  |
| 01 / TRAIN | 01 / درّب |  |
| 02 / APPLY | 02 / طبّق |  |
| 03 / BUILD | 03 / ابنِ |  |
| Put AI into working hands. | ضع الذكاء الاصطناعي بين أيدٍ منتجة. |  |
| Courses, workshops and trainer programmes turn AI from a headline into a skill that students, professionals and educators can use on Monday morning. | تحوّل الدورات وورش العمل وبرامج إعداد المدربين الذكاء الاصطناعي من عنوان إلى مهارة يستخدمها الطلاب والمهنيون والمعلّمون في عملهم. |  |
| Prove it on real problems. | أثبت فاعليته في مشكلات حقيقية. |  |
| Specialists put those methods to work on Syrian questions in health, data, media, software and the shape of its cities, and publish what holds. | يوظف المتخصصون هذه الأساليب في قضايا سورية ضمن الصحة والبيانات والإعلام والبرمجيات والمدن، وينشرون ما يثبت أثره. |  |
| Turn capability into enterprise. | حوّل القدرة إلى مشروع. |  |
| Entrepreneurship and institutional partnership carry proven work into companies, services and public capacity that outlast the programme that started them. | تنقل ريادة الأعمال والشراكات المؤسسية العمل المثبت إلى شركات وخدمات وقدرات عامة تستمر بعد انتهاء البرنامج. |  |
| Practical answers | إجابات عملية |  |
| A clear way in. | طريق واضح للبداية. |  |
| The questions people actually ask before they start. | الأسئلة التي يطرحها الناس فعلاً قبل البداية. |  |
| Who is SAAE for? | لمن تناسب الجمعية؟ |  |
| Students, educators, professionals, founders and institutions that want practical contact with AI — not only people who already work in technology. | للطلاب والمعلّمين والمهنيين ورواد الأعمال والمؤسسات الراغبة بتجربة عملية مع الذكاء الاصطناعي، لا للعاملين في التقنية فقط. |  |
| Do I need technical experience? | هل أحتاج إلى خبرة تقنية؟ |  |
| No. SAAE’s public programmes include starting points for people who are new to AI. Individual courses set their own requirements, which are listed with each course. | لا. تتضمن برامج الجمعية العامة نقاط بداية للمبتدئين في الذكاء الاصطناعي، وتوضح كل دورة متطلباتها الخاصة. |  |
| How do I take part? | كيف أشارك؟ |  |
| Programme dates and registration will be published on this website. Until then, use the contact form to ask about the current intake and what each track involves. | ستُنشر مواعيد البرامج والتسجيل على هذا الموقع. وحتى ذلك الحين، استخدم نموذج التواصل للاستفسار عن الدفعة الحالية ومحتوى كل مسار. |  |
| Can an organisation work with SAAE? | هل يمكن لمؤسسة أن تعمل مع الجمعية؟ |  |
| Yes. Universities, ministries, companies and community organisations already partner on training and applied work. Partnership questions go to | نعم. تتشارك الجامعات والوزارات والشركات ومنظمات المجتمع في التدريب والعمل التطبيقي. تُرسل استفسارات الشراكة إلى |  |
| Where will updates be published? | أين ستُنشر التحديثات؟ |  |
| This redesigned website is becoming SAAE’s official public home. Programmes, registration and announcements will be published here as each section launches. | سيصبح هذا الموقع المعاد تصميمه الواجهة العامة الرسمية للجمعية. وستُنشر البرامج والتسجيلات والإعلانات هنا مع إطلاق كل قسم. |  |
| On | عبر |  |
| , opens in a new tab | ، يفتح في علامة تبويب جديدة |  |
| . Programmes, registration and announcements are published there first, and this page follows it. | ، وتُنشر البرامج والتسجيلات والإعلانات هناك أولاً، وتتبعها هذه الصفحة. |  |
| Programmes, registration and announcements are published there first, and this page follows it. | تُنشر البرامج والتسجيلات والإعلانات هناك أولاً، وتتبعها هذه الصفحة. |  |
| Damascus, beside the Ministry of Higher Education and Scientific Research | دمشق، بجانب وزارة التعليم العالي والبحث العلمي |  |
| Syria’s first official organisation dedicated to artificial intelligence. | أول منظمة رسمية في سورية مكرّسة للذكاء الاصطناعي. |  |
| This page | هذه الصفحة |  |
| Official site | الموقع الرسمي |  |
| Reach SAAE | تواصل مع الجمعية |  |
| Latest news | آخر الأخبار |  |
| How SAAE works | كيف تعمل الجمعية |  |
| All 23 partners | كل الشركاء الـ 23 |  |
| About SAAE | عن الجمعية |  |
| The million-user initiative | مبادرة المليون مستخدم |  |
| Learning platform | منصة التعلّم |  |
| Contact | تواصل |  |
| Official information, programmes and registration will be published on this website. | ستُنشر المعلومات الرسمية والبرامج والتسجيل على هذا الموقع. |  |
| English landing page, August 2026. | الصفحة العربية، آب 2026. |  |
| Quick links | روابط سريعة |  |
| Communities | المجتمعات |  |
| Achievements | الإنجازات |  |
| AI tools | أدوات الذكاء الاصطناعي |  |
| Registration | التسجيل |  |
| Visit us | زورونا |  |
| Syria's first official AI organisation — empowering Syrian talent to rebuild and uplift our country. | أول منظمة رسمية في سورية مكرّسة للذكاء الاصطناعي والابتكار والتفكير الريادي — تمكّن المواهب السورية لإعادة بناء بلدنا والارتقاء به. |  |
| Damascus, beside the Ministry of Higher Education and Scientific Research | دمشق - بجانب وزارة التعليم العالي والبحث العلمي |  |
| © 2026 Syrian Association for AI & Entrepreneurship. All rights reserved. | جميع الحقوق محفوظة للجمعية السورية للذكاء الاصطناعي وريادة الأعمال 2026 © |  |
| Open SAAE location in Maps | افتح موقع الجمعية في الخرائط |  |
| Map showing the SAAE headquarters in Damascus | خريطة تُظهر مقر الجمعية السورية في دمشق |  |
| SAAE on social platforms | الجمعية على منصات التواصل |  |
| A non-profit built so that AI knowledge becomes a working skill, in Syria, taught in the open. | جمعية غير ربحية قامت لتصبح معرفة الذكاء الاصطناعي مهارة عملية، في سورية، تُدرَّس في العلن. |  |
| What we do | ما الذي نقوم به |  |
| From learning to public value. | من التعلّم إلى قيمة عامة. |  |
| SAAE connects education, research and entrepreneurship so useful knowledge can become capability, evidence and action. | تربط الجمعية بين التعليم والبحث وريادة الأعمال لتتحول المعرفة النافعة إلى قدرة وأدلة وعمل. |  |
| LEARN | تعلَّم |  |
| RESEARCH | ابحث |  |
| Programs and courses translate AI concepts into useful capabilities for students, professionals and educators. | تحوّل البرامج والدورات مفاهيم الذكاء الاصطناعي إلى قدرات نافعة للطلاب والمهنيين والمعلّمين. |  |
| Specialists and researchers connect disciplines, test ideas and strengthen the knowledge Syria can build on. | يربط المتخصصون والباحثون بين التخصصات، ويختبرون الأفكار، ويعززون المعرفة التي تبني عليها سورية. |  |
| Entrepreneurship and institutional partnerships help promising work become projects, services and shared capacity. | تساعد ريادة الأعمال والشراكات المؤسسية على تحويل العمل الواعد إلى مشاريع وخدمات وقدرات مشتركة. |  |
| Where the work stands | أين وصل العمل |  |
| Proof lives in public. | الدليل معلن للجميع. |  |
| Every figure below is published by SAAE and presented here as part of the redesigned official website. | تنشر الجمعية كل رقم أدناه وتعرضه هنا ضمن الموقع الرسمي المعاد تصميمه. |  |
| people have trained with SAAE | متدرباً مع الجمعية |  |
| courses turning AI into a working skill | دورة تحوّل الذكاء الاصطناعي إلى مهارة عملية |  |
| strategic partners across Syria | شريكاً استراتيجياً في أنحاء سورية |  |
| specialist communities | مجتمعات متخصصة |  |
| Figures published by SAAE, September 2026. | أرقام نشرتها الجمعية، أيلول 2026. |  |
| Nine fields, one shared method. | تسعة مجالات، ومنهج واحد مشترك. |  |
| Each community brings its own questions and its own practitioners. Shared methods let the answers travel between them. | لكل مجتمع أسئلته وممارسوه. والمنهج المشترك يجعل الأجوبة تنتقل بينها. |  |
| Works on | يعمل على |  |
| Data | البيانات |  |
| Turn information into insight. | تحويل المعلومات إلى رؤى. |  |
| Collection and cleaning, modelling, open public data. | الجمع والتنقية، والنمذجة، والبيانات العامة المفتوحة. |  |
| Smart Urban Development | التطوير العمراني الذكي |  |
| Design smarter, more responsive cities. | تصميم مدن أذكى وأكثر استجابة. |  |
| Spatial survey, mobility, the shape of public space. | المسح المكاني، والتنقل، وشكل الفضاء العام. |  |
| Healthcare | الرعاية الصحية |  |
| Apply AI where care matters. | تطبيق الذكاء الاصطناعي حيث تهم الرعاية. |  |
| Diagnostic support, records, reach into underserved areas. | دعم التشخيص، والسجلات، والوصول إلى المناطق الأقل خدمة. |  |
| Smart Research | البحث الذكي |  |
| Move ideas from questions to evidence. | نقل الأفكار من الأسئلة إلى الأدلة. |  |
| Method, peer review, publishing what holds up. | المنهج، ومراجعة الأقران، ونشر ما يصمد. |  |
| Software | البرمجيات |  |
| Build useful digital systems. | بناء أنظمة رقمية نافعة. |  |
| Tools, platforms, integration with what already runs. | الأدوات والمنصات والتكامل مع ما يعمل أصلاً. |  |
| Smart Economy | الاقتصاد الذكي |  |
| Turn innovation into opportunity. | تحويل الابتكار إلى فرصة. |  |
| Productivity, markets, access to finance. | الإنتاجية، والأسواق، والوصول إلى التمويل. |  |
| Trainers | المدربون |  |
| Equip the people who teach others. | تجهيز من يعلّمون غيرهم. |  |
| Curriculum, delivery, certification of trainers. | المناهج، والتقديم، واعتماد المدربين. |  |
| Media | الإعلام |  |
| Make knowledge clear and accessible. | جعل المعرفة واضحة ومتاحة. |  |
| Reporting, public literacy, Arabic language material. | التغطية، والوعي العام، والمواد باللغة العربية. |  |
| Entrepreneurial Quality | جودة ريادة الأعمال |  |
| Raise the standard for new ventures. | رفع معيار المشاريع الناشئة. |  |
| Standards, mentoring, honest review of early work. | المعايير، والإرشاد، والمراجعة الصادقة للعمل المبكر. |  |
| The record | السجل |  |
| Who we answer to. | أمام من نحن مسؤولون. |  |
| SAAE is Syria's first official body for AI, innovation and entrepreneurship, and it works in the open: the record is public, and so are the programmes. | الجمعية هي أول جهة رسمية في سورية للذكاء الاصطناعي والابتكار وريادة الأعمال، وتعمل في العلن: السجل عام، وكذلك البرامج. |  |
| Status | الصفة |  |
| Non-profit association | جمعية غير ربحية |  |
| Licensed by the Ministry of Social Affairs and Labour, decision No. 1862 of 2025. | مرخّصة من وزارة الشؤون الاجتماعية والعمل، القرار رقم 1862 لعام 2025. |  |
| Founded on | قامت على |  |
| A working premise | فرضية عملية |  |
| That Syria's future depends on keeping pace with AI, and on building that capacity at home rather than importing it. | أن مستقبل سورية يعتمد على مواكبة الذكاء الاصطناعي، وعلى بناء هذه القدرة في الداخل بدل استيرادها. |  |
| Who it is for | لمن هي |  |
| Anyone with a reason to start | لكل من لديه سبب للبدء |  |
| Students, educators, professionals, founders and institutions. Prior technical experience is not required. | الطلاب والمعلّمون والمهنيون ورواد الأعمال والمؤسسات. لا تُشترط خبرة تقنية سابقة. |  |
| Partnerships | الشراكات |  |
| The landing page | الصفحة الرئيسية |  |
| English about page, September 2026. | صفحة التعريف بالعربية، أيلول 2026. |  |
| The partner register. | سجل الشركاء. |  |
| The organisations SAAE lists publicly as partners: universities, ministries, companies and community bodies working with the association on training and applied projects. | الجهات التي تدرجها الجمعية علناً كشركاء: جامعات ووزارات وشركات وهيئات مجتمعية تعمل معها في التدريب والمشاريع التطبيقية. |  |
| Marks and names are published by SAAE and fitted to a common size. Nothing here has been redrawn. | تنشر الجمعية الشعارات والأسماء، وقد ضُبطت على قياس موحّد. لم يُعَد رسم أي منها. |  |
| The partner register | سجل الشركاء |  |
| English partner register, September 2026. | سجل الشركاء بالعربية، أيلول 2026. |  |
| Damascus University | جامعة دمشق |  |
| Yarmouk Private University | جامعة اليرموك الخاصة |  |
| Ministry of Social Affairs and Labor | وزارة الشؤون الاجتماعية والعمل |  |
| Aleppo Governorate | محافظة حلب |  |
| Engineers Syndicate | نقابة المهندسين |  |
| Syrian Telecom | السورية للاتصالات |  |
| Syrian Development Organization | المنظمة السورية للتنمية |  |
| Preparing Arabic | جارٍ تجهيز النسخة العربية |  |

---

## `initiative.html` uses a different mechanism

The initiative page does not key off English text. It keys off `data-i18n="..."`
attributes with a dictionary inside `assets/js/initiative.js`. Read that file for the
initiative page's Arabic (search for the `data-i18n` key names used in
`reference/prototype/initiative.html`).

Both mechanisms collapse into the same thing on migration: keys in `translations.ts`,
read through `useLang()`.

## `news-language.js` is per-article

`assets/js/news-language.js` carries the Arabic for the four hand-built article pages.
**Ignore it entirely.** Article text comes from `news.content_ar` / `news.content_en`
in Supabase.
