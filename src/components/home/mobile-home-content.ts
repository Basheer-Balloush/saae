/**
 * Shared content + destination definitions for the complete mobile homepage.
 *
 * Shared destinations and public association content for the phone layout.
 * The opening headline is user-approved; supporting copy draws on the
 * existing cinematic and community pages, with concise mobile labels.
 *
 * No invented metrics, testimonials, routes, or video footage live here.
 * Pure data only — safe for the Vitest node setup (no DOM imports).
 */

export type Locale = "ar" | "en";

export interface LocalText {
  ar: string;
  en: string;
}

export interface CommunityEntry {
  key: string;
  name: LocalText;
  tagline: LocalText;
  /** Local community page (real route: src/routes/communities.$key.tsx). */
  href: string;
}

/** A homepage story, built from a news row by mobileNewsEntries. */
export interface NewsEntry {
  id: string;
  tag: LocalText;
  date: LocalText;
  dateTime: string;
  headline: LocalText;
  excerpt: LocalText;
  image: string;
  imageAlt: LocalText;
  href: string;
}

export interface MissionStep {
  index: LocalText;
  title: LocalText;
  body: LocalText;
}

export interface FaqEntry {
  question: LocalText;
  answer: LocalText;
  answerLink?: { href: string; text: LocalText };
}

export interface PartnerEntry {
  name: LocalText;
  logo: string;
}

export interface HomeLink {
  label: LocalText;
  href: string;
  external?: boolean;
}

/** Exact approved opening headline — do not rephrase. */
export const OPENING_HEADLINE: LocalText = {
  ar: "ذكاء وريادة لوطن ينهض",
  en: "Intelligence and entrepreneurship for a nation on the rise.",
};

export const OPENING = {
  eyebrow: {
    ar: "الجمعية السورية للذكاء الاصطناعي وريادة الأعمال",
    en: "Syrian Association for AI & Entrepreneurship",
  } satisfies LocalText,
  support: {
    ar: "تعلّم وبحث وريادة أعمال عملية في الذكاء الاصطناعي، متصلة بالناس في كل سورية.",
    en: "Practical AI learning, research and entrepreneurship, connected for people across Syria.",
  } satisfies LocalText,
  /** Primary learning CTA → local learning platform route (same tab). */
  primary: {
    label: { ar: "ابدأ التعلّم", en: "Start learning" } satisfies LocalText,
    href: "/learning-management-system",
  },
  /** Initiative secondary action → local initiative page. */
  secondary: {
    label: { ar: "اكتشف المبادرة", en: "Discover the initiative" } satisfies LocalText,
    href: "/initiative",
  },
  heroImage: {
    src: "/cinematic/mobile/hero-tree-poster.webp",
    alt: {
      ar: "جمهور يحضر إطلاق المبادرة الوطنية للذكاء الاصطناعي",
      en: "Audience attending the launch of SAAE's national AI initiative",
    } satisfies LocalText,
    caption: {
      ar: "من إطلاق المبادرة الوطنية للذكاء الاصطناعي.",
      en: "At the launch of the national AI initiative.",
    } satisfies LocalText,
  },
  /** Hero tree loop (client-assigned src only, never SSR). */
  video: {
    src: "/cinematic/mobile/hero-tree-loop.mp4",
    poster: "/cinematic/mobile/hero-tree-poster.webp",
    trigger: { ar: "شاهد شجرة الجمعية", en: "Watch the SAAE tree" } satisfies LocalText,
    title: { ar: "شجرة الجمعية", en: "The SAAE tree" } satisfies LocalText,
    description: {
      ar: "شاهد الفيديو.",
      en: "Watch the video.",
    } satisfies LocalText,
    fallback: {
      ar: "تعذّر تشغيل الفيديو. يمكنك استكشاف المبادرة بدلاً من ذلك.",
      en: "The video could not play. You can explore the initiative instead.",
    } satisfies LocalText,
  },
};

/** All nine communities, in the association's own order. */
export const COMMUNITIES: CommunityEntry[] = [
  {
    key: "data",
    name: { ar: "مجتمع البيانات", en: "Data Community" },
    tagline: { ar: "تحويل المعلومات إلى رؤى.", en: "Turn information into insight." },
    href: "/communities/data",
  },
  {
    key: "architecture",
    name: { ar: "المجتمع العمراني الذكي", en: "Smart Urban Community" },
    tagline: { ar: "تصميم مدن أذكى وأكثر استجابة.", en: "Design smarter, more responsive cities." },
    href: "/communities/architecture",
  },
  {
    key: "medical",
    name: { ar: "مجتمع الرعاية الصحية", en: "Healthcare Community" },
    tagline: { ar: "تطبيق الذكاء الاصطناعي حيث تهم الرعاية.", en: "Apply AI where care matters." },
    href: "/communities/medical",
  },
  {
    key: "research",
    name: { ar: "المجتمع البحثي الذكي", en: "Smart Research Community" },
    tagline: {
      ar: "نقل الأفكار من الأسئلة إلى الأدلة.",
      en: "Move ideas from questions to evidence.",
    },
    href: "/communities/research",
  },
  {
    key: "software",
    name: { ar: "مجتمع البرمجيات", en: "Software Community" },
    tagline: { ar: "بناء أنظمة رقمية نافعة.", en: "Build useful digital systems." },
    href: "/communities/software",
  },
  {
    key: "economy",
    name: { ar: "مجتمع الاقتصاد الذكي", en: "Smart Economy Community" },
    tagline: { ar: "تحويل الابتكار إلى فرصة.", en: "Turn innovation into opportunity." },
    href: "/communities/economy",
  },
  {
    key: "trainers",
    name: { ar: "مجتمع المدربين", en: "Trainers Community" },
    tagline: { ar: "تجهيز من يعلّمون غيرهم.", en: "Equip the people who teach others." },
    href: "/communities/trainers",
  },
  {
    key: "media",
    name: { ar: "المجتمع الإعلامي", en: "Media Community" },
    tagline: { ar: "جعل المعرفة واضحة ومتاحة.", en: "Make knowledge clear and accessible." },
    href: "/communities/media",
  },
  {
    key: "quality",
    name: { ar: "مجتمع الجودة الريادي", en: "Quality Entrepreneurship Community" },
    tagline: { ar: "رفع معيار المشاريع الناشئة.", en: "Raise the standard for new ventures." },
    href: "/communities/quality",
  },
];

/** Mission: train, apply, build. No numerical claims live here. */
export const MISSION_STEPS: MissionStep[] = [
  {
    index: { ar: "01 / درّب", en: "01 / TRAIN" },
    title: { ar: "ضع الذكاء الاصطناعي بين أيدٍ منتجة.", en: "Put AI into working hands." },
    body: {
      ar: "تحوّل الدورات وورش العمل وبرامج إعداد المدربين الذكاء الاصطناعي من عنوان إلى مهارة يستخدمها الطلاب والمهنيون والمعلّمون في عملهم.",
      en: "Courses, workshops and trainer programmes turn AI from a headline into a skill that students, professionals and educators can use on Monday morning.",
    },
  },
  {
    index: { ar: "02 / طبّق", en: "02 / APPLY" },
    title: { ar: "أثبت فاعليته في مشكلات حقيقية.", en: "Prove it on real problems." },
    body: {
      ar: "يوظف المتخصصون هذه الأساليب في قضايا سورية ضمن الصحة والبيانات والإعلام والبرمجيات والمدن، وينشرون ما يثبت أثره.",
      en: "Specialists put those methods to work on Syrian questions in health, data, media, software and the shape of its cities, and publish what holds.",
    },
  },
  {
    index: { ar: "03 / ابنِ", en: "03 / BUILD" },
    title: { ar: "حوّل القدرة إلى مشروع.", en: "Turn capability into enterprise." },
    body: {
      ar: "تنقل ريادة الأعمال والشراكات المؤسسية العمل المثبت إلى شركات وخدمات وقدرات عامة تستمر بعد انتهاء البرنامج.",
      en: "Entrepreneurship and institutional partnership carry proven work into companies, services and public capacity that outlast the programme that started them.",
    },
  },
];

/** Homepage FAQs reflect the site's learning, community and contact flows. */
export const FAQS: FaqEntry[] = [
  {
    question: { ar: "كيف أسجّل في إحدى دورات الجمعية؟", en: "How do I register for a course?" },
    answer: {
      ar: "تصفّح الدورات، وافتح الدورة المناسبة للاطلاع على تفاصيلها وحالة التسجيل. عند فتح التسجيل، اتبع الخطوات الموضّحة في صفحتها. ابدأ من",
      en: "Browse the courses and open one to check its details and enrollment status. When enrollment is open, follow the steps on its page. Start with the",
    },
    answerLink: {
      href: "/learning-management-system/catalog",
      text: { ar: "كتالوج الدورات", en: "course catalog" },
    },
  },
  {
    question: {
      ar: "هل أحتاج إلى خبرة سابقة في الذكاء الاصطناعي؟",
      en: "Do I need previous AI experience?",
    },
    answer: {
      ar: "يعتمد ذلك على مستوى الدورة. يمكنك تصفية الدورات حسب المستوى، ثم مراجعة وصف الدورة ومتطلباتها قبل التسجيل. إذا لم تكن متأكّدًا من المسار المناسب، تواصل معنا.",
      en: "It depends on the course level. Filter the catalog by level, then review the course description and requirements before registering. Contact us if you need help choosing a suitable path.",
    },
  },
  {
    question: { ar: "هل جميع الدورات مجانية؟", en: "Are all courses free?" },
    answer: {
      ar: "تختلف الرسوم من دورة إلى أخرى. تحقّق من السعر وحالة الدورة في صفحتها. للدورات المدفوعة، اتبع خطوات طلب التسجيل؛ وبعد القبول يتم التواصل معك لترتيب الدفع.",
      en: "Fees vary by course. Check the price and availability on the course page. For paid courses, follow the enrollment request steps; after acceptance, the team contacts you to arrange payment.",
    },
  },
  {
    question: {
      ar: "كيف أنضم إلى أحد مجتمعات الجمعية؟",
      en: "How can I join a SAAE community?",
    },
    answer: {
      ar: "اختر المجتمع الأقرب إلى اهتمامك من قسم المجتمعات، وافتح صفحته للتعرّف إلى نشاطاته. اضغط «انضم إلى المجتمع» لبدء الاستفسار عن التسجيل والمشاركة مع مساعد الجمعية.",
      en: "Choose a community that matches your interests and open its page to explore its activities. Select Join Community to ask the association's assistant about signing up and participating.",
    },
  },
  {
    question: {
      ar: "كيف أتواصل بشأن تدريب أو شراكة؟",
      en: "How do I ask about training or a partnership?",
    },
    answer: {
      ar: "أرسل رسالة عبر نموذج التواصل، واختر نوع الاستفسار: تدريب أو شراكة. اذكر احتياجك واسم المؤسسة إن وُجد، مع بيانات تواصل صحيحة. يمكنك البدء من",
      en: "Use the contact form and select Training or Partnership as the inquiry type. Describe what you need, include your organization if applicable, and provide accurate contact details. Open the",
    },
    answerLink: {
      href: "/contact#write",
      text: { ar: "نموذج التواصل", en: "contact form" },
    },
  },
];

/**
 * All 23 partners in SAAE's published order. Brand names are never translated;
 * institutions with official Arabic names use them. Logos are existing
 * repository assets, fitted to a common size — nothing redrawn.
 */
export const PARTNERS: PartnerEntry[] = [
  {
    name: { ar: "جامعة دمشق", en: "Damascus University" },
    logo: "/cinematic/images/partners/partner-damascus-ink.webp",
  },
  {
    name: { ar: "جامعة اليرموك الخاصة", en: "Yarmouk Private University" },
    logo: "/cinematic/images/partners/partner-yarmouk-ink.webp",
  },
  {
    name: { ar: "وزارة الشؤون الاجتماعية والعمل", en: "Ministry of Social Affairs and Labor" },
    logo: "/cinematic/images/partners/partner-social-affairs.webp",
  },
  {
    name: { ar: "محافظة حلب", en: "Aleppo Governorate" },
    logo: "/cinematic/images/partners/partner-aleppo.webp",
  },
  {
    name: { ar: "نقابة المهندسين", en: "Engineers Syndicate" },
    logo: "/cinematic/images/partners/partner-engineers-ink.webp",
  },
  {
    name: { ar: "السورية للاتصالات", en: "Syrian Telecom" },
    logo: "/cinematic/images/partners/partner-syrian-telecom.webp",
  },
  {
    name: { ar: "المنظمة السورية للتنمية", en: "Syrian Development Organization" },
    logo: "/cinematic/images/partners/partner-sdo.webp",
  },
  {
    name: { ar: "Al-Ihsan Medical", en: "Al-Ihsan Medical" },
    logo: "/cinematic/images/partners/partner-al-ihsan.webp",
  },
  {
    name: { ar: "Med Axis", en: "Med Axis" },
    logo: "/cinematic/images/partners/partner-med-axis.webp",
  },
  {
    name: { ar: "sharafAI", en: "sharafAI" },
    logo: "/cinematic/images/partners/partner-sharafai.webp",
  },
  {
    name: { ar: "Sarrdeh Tech", en: "Sarrdeh Tech" },
    logo: "/cinematic/images/partners/partner-sarrdeh.webp",
  },
  {
    name: { ar: "Devista Consulting", en: "Devista Consulting" },
    logo: "/cinematic/images/partners/partner-devista.webp",
  },
  {
    name: { ar: "ILM Hub", en: "ILM Hub" },
    logo: "/cinematic/images/partners/partner-ilmhub.webp",
  },
  {
    name: { ar: "Step Up", en: "Step Up" },
    logo: "/cinematic/images/partners/partner-stepup.webp",
  },
  {
    name: { ar: "Kawkab Abqar", en: "Kawkab Abqar" },
    logo: "/cinematic/images/partners/partner-abqar.webp",
  },
  { name: { ar: "LMIP", en: "LMIP" }, logo: "/cinematic/images/partners/partner-lmip.webp" },
  {
    name: { ar: "JobLink", en: "JobLink" },
    logo: "/cinematic/images/partners/partner-joblink.webp",
  },
  {
    name: { ar: "A-Z Books", en: "A-Z Books" },
    logo: "/cinematic/images/partners/partner-azbooks.webp",
  },
  {
    name: { ar: "Circles", en: "Circles" },
    logo: "/cinematic/images/partners/partner-circles.webp",
  },
  { name: { ar: "Cubes", en: "Cubes" }, logo: "/cinematic/images/partners/partner-cubes.webp" },
  {
    name: { ar: "Baukant", en: "Baukant" },
    logo: "/cinematic/images/partners/partner-baukant.webp",
  },
  { name: { ar: "BACCA", en: "BACCA" }, logo: "/cinematic/images/partners/partner-bacca.webp" },
  { name: { ar: "People", en: "People" }, logo: "/cinematic/images/partners/partner-people.webp" },
];

/**
 * Desktop links whose phone equivalent is a section of this page. Every other
 * non-fragment desktop href from home.html is rendered verbatim.
 */
export const DESKTOP_HREF_EQUIVALENTS: Readonly<Record<string, string>> = {
  "/about#communities-h": "#communities",
  "/about#standing-h": "#achievements",
};

/** Header menu groups. */
export const MENU_ASSOCIATION: HomeLink[] = [
  { label: { ar: "عن الجمعية", en: "About SAAE" }, href: "/about" },
  { label: { ar: "الأخبار", en: "News" }, href: "/news" },
  { label: { ar: "الشركاء", en: "Partners" }, href: "/partners" },
  { label: { ar: "المجتمعات", en: "Communities" }, href: "#communities" },
  { label: { ar: "الإنجازات", en: "Achievements" }, href: "#achievements" },
];

export const MENU_PARTICIPATE: HomeLink[] = [
  { label: { ar: "المبادرة", en: "Initiative" }, href: "/initiative" },
  { label: { ar: "التسجيل", en: "Registration" }, href: "/registration" },
  { label: { ar: "منصة التعلّم", en: "Learning platform" }, href: "/learning-management-system" },
  { label: { ar: "أدوات الذكاء الاصطناعي", en: "AI tools" }, href: "/resources/ai-tools" },
  { label: { ar: "تواصل معنا", en: "Contact" }, href: "/contact" },
  { label: { ar: "راسلنا", en: "Write to us" }, href: "/contact#write" },
];

/** Footer link groups. */
export const FOOTER_EXPLORE: HomeLink[] = [
  { label: { ar: "الرئيسية", en: "Home" }, href: "/" },
  { label: { ar: "عن الجمعية", en: "About SAAE" }, href: "/about" },
  { label: { ar: "الأخبار", en: "News" }, href: "/news" },
  { label: { ar: "الشركاء", en: "Partners" }, href: "/partners" },
  { label: { ar: "المبادرة", en: "Initiative" }, href: "/initiative" },
  { label: { ar: "تواصل معنا", en: "Contact" }, href: "/contact" },
];

export const FOOTER_OFFICIAL: HomeLink[] = [
  {
    label: { ar: "مبادرة المليون مستخدم", en: "The million-user initiative" },
    href: "/one-million-initiative-home",
  },
  { label: { ar: "التسجيل", en: "Registration" }, href: "/registration" },
  { label: { ar: "منصة التعلّم", en: "Learning platform" }, href: "/learning-management-system" },
  { label: { ar: "أدوات الذكاء الاصطناعي", en: "AI tools" }, href: "/resources/ai-tools" },
];

/** Footer "Explore" anchor group (in-page + local). */
export const FOOTER_DISCOVER: HomeLink[] = [
  { label: { ar: "المجتمعات", en: "Communities" }, href: "#communities" },
  { label: { ar: "الإنجازات", en: "Achievements" }, href: "#achievements" },
  { label: { ar: "الأخبار", en: "News" }, href: "#news" },
  { label: { ar: "الشركاء", en: "Partners" }, href: "#partners" },
  { label: { ar: "إجابات", en: "Answers" }, href: "#faq" },
];

export const SOCIAL_LINKS: (HomeLink & { labelEn: string })[] = [
  {
    label: { ar: "الجمعية على إنستغرام", en: "SAAE on Instagram" },
    labelEn: "Instagram",
    href: "https://www.instagram.com/saae_sy/",
    external: true,
  },
  {
    label: { ar: "الجمعية على فيسبوك", en: "SAAE on Facebook" },
    labelEn: "Facebook",
    href: "https://www.facebook.com/share/18SQ11hcct/",
    external: true,
  },
  {
    label: { ar: "الجمعية على لينكدإن", en: "SAAE on LinkedIn" },
    labelEn: "LinkedIn",
    href: "https://www.linkedin.com/company/syrian-association-for-ai-entrepreneurship/",
    external: true,
  },
];

export const CONTACT = {
  address: {
    ar: "دمشق - بجانب وزارة التعليم العالي والبحث العلمي",
    en: "Damascus, beside the Ministry of Higher Education and Scientific Research",
  } satisfies LocalText,
  mapsHref: "https://maps.app.goo.gl/bKMSHXkmkr5U3tZh6",
  mapImage: "/cinematic/images/saae-map.png",
  mapAlt: {
    ar: "خريطة تُظهر مقر الجمعية السورية في دمشق",
    en: "Map showing the SAAE headquarters in Damascus",
  } satisfies LocalText,
  email: "mailto:info@aisyria.org",
  phone: "tel:+963930763547",
  phoneDisplay: "+963 930 763 547",
  attributionHref: "https://www.openstreetmap.org/copyright",
};

export const FOOTER_CLAIM: LocalText = {
  ar: "أول منظمة رسمية في سورية مكرّسة للذكاء الاصطناعي والابتكار والتفكير الريادي — تمكّن المواهب السورية لإعادة بناء بلدنا والارتقاء به.",
  en: "Syria's first official AI organisation — empowering Syrian talent to rebuild and uplift our country.",
};

export const FOOTER_RIGHTS: LocalText = {
  ar: "جميع الحقوق محفوظة للجمعية السورية للذكاء الاصطناعي وريادة الأعمال 2026 ©",
  en: "© 2026 Syrian Association for AI & Entrepreneurship. All rights reserved.",
};

/* ------------------------------------------------------------------ */
/* v3 ("The living tree") additions. Copy below is either verbatim     */
/* from home.html / language.js or the microcopy listed in the brief.  */
/* ------------------------------------------------------------------ */

export interface AchievementEntry {
  value: string;
  count: number;
  label: LocalText;
}

/** SAAE in numbers — values match the desktop hero-stats band verbatim. */
export const ACHIEVEMENTS: AchievementEntry[] = [
  { value: "5,000+", count: 5000, label: { ar: "متدربون", en: "trainees" } },
  { value: "120+", count: 120, label: { ar: "دورات", en: "courses" } },
  { value: "30+", count: 30, label: { ar: "شركاء استراتيجيون", en: "strategic partners" } },
  { value: "9", count: 9, label: { ar: "مجتمعات", en: "communities" } },
];

export const NUMBERS_COPY = {
  eyebrow: { ar: "انجازات الجمعية", en: "SAAE achievements" } satisfies LocalText,
  title: {
    ar: "مجتمع يتجاوز 5,000 متعلم",
    en: "A community of 5,000+ learners",
  } satisfies LocalText,
};

export interface RailEntry {
  label: LocalText;
  href: string;
}

export const RAIL_COPY = {
  label: { ar: "أقسام الصفحة", en: "Page sections" } satisfies LocalText,
  items: [
    { label: { ar: "المبادرة", en: "Initiative" }, href: "#initiative" },
    { label: { ar: "المجتمعات", en: "Communities" }, href: "#communities" },
    { label: { ar: "الأخبار", en: "News" }, href: "#news" },
    { label: { ar: "كيف نعمل", en: "How we work" }, href: "#mission" },
    { label: { ar: "الشركاء", en: "Partners" }, href: "#partners" },
    { label: { ar: "إجابات", en: "Answers" }, href: "#faq" },
  ] satisfies RailEntry[],
};

export interface WayEntry {
  title: LocalText;
  body: LocalText;
  cta: LocalText;
  href: string;
  icon: "learning" | "communities" | "participation";
}

export const START_COPY = {
  eyebrow: { ar: "اعرف طريقك", en: "Find your way in" } satisfies LocalText,
  title: { ar: "من أين تبدأ؟", en: "Where to start?" } satisfies LocalText,
  linksLabel: { ar: "طرق البدء", en: "Ways to start" } satisfies LocalText,
};

export const WAYS: WayEntry[] = [
  {
    title: { ar: "منصة التعلّم", en: "Learning platform" },
    body: {
      ar: "مسارات تدريب معتمدة تبني مهارات مهنية وتقنية، ومتاحة للجميع في سورية.",
      en: "Certified training tracks that build professional and technical skill, open to anyone in Syria.",
    },
    cta: { ar: "ابدأ التعلّم", en: "Start learning" },
    href: "/learning-management-system",
    icon: "learning",
  },
  {
    title: { ar: "المجتمعات", en: "Communities" },
    body: {
      ar: "تسعة مجتمعات. جذور تجمعنا.",
      en: "Nine communities. One shared foundation.",
    },
    cta: { ar: "استكشف المجتمعات", en: "Explore communities" },
    href: "#communities",
    icon: "communities",
  },
  {
    title: { ar: "المشاركة والتسجيل", en: "Participation & registration" },
    body: {
      ar: "ستُنشر مواعيد البرامج والتسجيل على هذا الموقع.",
      en: "Programme dates and registration will be published on this website.",
    },
    cta: { ar: "سجّل الآن", en: "Register now" },
    href: "/registration",
    icon: "participation",
  },
];

export const INITIATIVE_COPY = {
  eyebrow: {
    ar: "مبادرة مليون مستخدم سوري للذكاء الاصطناعي",
    en: "The Million Syrian AI Users initiative",
  } satisfies LocalText,
  title: {
    ar: "مليون شخص خطوة وطنية إلى الأمام",
    en: "One million people One national step forward",
  } satisfies LocalText,
  body: {
    ar: "مبادرة وطنية تمكّن مليون سوري من استخدام الذكاء الاصطناعي بثقة في العمل والدراسة والحياة اليومية.",
    en: "A national initiative enabling one million Syrians to use AI confidently at work, in study, and in everyday life.",
  } satisfies LocalText,
  primary: { ar: "استكشف المبادرة", en: "Explore the initiative" } satisfies LocalText,
  official: { ar: "البرنامج الرسمي", en: "Official programme" } satisfies LocalText,
  target: { ar: "هدف المبادرة", en: "The initiative's goal" } satisfies LocalText,
  reach: {
    ar: "معرفة تصل إلى كل سورية",
    en: "Knowledge within reach across Syria",
  } satisfies LocalText,
  image: "/cinematic/mobile/initiative-syria.svg",
};

export const COMMUNITIES_COPY = {
  eyebrow: { ar: "مجتمعات الجمعية", en: "SAAE communities" } satisfies LocalText,
  title: {
    ar: "تسعة مجتمعات جذور تجمعنا",
    en: "Nine communities One shared foundation",
  } satisfies LocalText,
  body: {
    ar: "لكل مجتمع أسئلته وممارسوه. والمنهج المشترك يجعل الأجوبة تنتقل بينها.",
    en: "Each community brings its own questions and its own practitioners. Shared methods let the answers travel between them.",
  } satisfies LocalText,
};

export const NEWS_COPY = {
  eyebrow: { ar: "آخر الأخبار", en: "Latest news" } satisfies LocalText,
  title: { ar: "العمل كما يحدث", en: "The work, as it happens" } satisfies LocalText,
  body: {
    ar: "قاعات تدريب وبث وطني وإطلاقات عامة — سجل متجدد لما تبنيه الجمعية.",
    en: "Training rooms, national broadcasts and public launches — the running record of what SAAE is building.",
  } satisfies LocalText,
  readStory: { ar: "اقرأ القصة", en: "Read the story" } satisfies LocalText,
  allNews: { ar: "جميع الأخبار", en: "All news" } satisfies LocalText,
  carouselLabel: { ar: "آخر الأخبار", en: "Latest news" } satisfies LocalText,
  empty: { ar: "لا توجد أخبار حالياً.", en: "No news yet." } satisfies LocalText,
  failed: {
    ar: "تعذّر تحميل الأخبار. يرجى المحاولة مرة أخرى.",
    en: "News could not be loaded. Please try again.",
  } satisfies LocalText,
};

export const MISSION_COPY = {
  eyebrow: { ar: "كيف نعمل", en: "How we work" } satisfies LocalText,
  title: {
    ar: "كيف تعمل الجمعية: درّب، طبّق، وابنِ",
    en: "How SAAE works: train, apply, build",
  } satisfies LocalText,
  aboutLink: { ar: "عن الجمعية", en: "About SAAE" } satisfies LocalText,
};

export const PARTNERS_COPY = {
  eyebrow: { ar: "عمل مشترك", en: "Shared work" } satisfies LocalText,
  title: {
    ar: "شركاء النجاح",
    en: "Partners in Success",
  } satisfies LocalText,
  body: {
    ar: "تعمل الجامعات والوزارات والشركات ومنظمات المجتمع مع الجمعية في التدريب والمشاريع التطبيقية.",
    en: "Universities, ministries, companies and community organisations already work with SAAE on training and applied projects.",
  } satisfies LocalText,
  allPartners: { ar: "اكتشف جميع الشركاء", en: "Discover All Partners" } satisfies LocalText,
};

export const FAQ_COPY = {
  title: { ar: "أسئلة شائعة", en: "Frequently Asked Questions" } satisfies LocalText,
  body: {
    ar: "الأسئلة التي يطرحها الناس فعلاً قبل البداية.",
    en: "The questions people actually ask before they start.",
  } satisfies LocalText,
  writeToUs: { ar: "راسلنا", en: "Write to us" } satisfies LocalText,
};

export const CLOSING_COPY = {
  eyebrow: {
    ar: "يبدأ المستقبل المشترك بالمعرفة المشتركة.",
    en: "A shared future starts with shared knowledge.",
  } satisfies LocalText,
  title: {
    ar: "ننمو معاً في كل سورية",
    en: "Growing together across Syria",
  } satisfies LocalText,
  body: {
    ar: "من مجتمعاتنا التسعة تنمو المعرفة، ومع مبادرة المليون نحملها من دمشق إلى كل سورية.",
    en: "From our nine communities knowledge grows, and with the Million initiative we carry it from Damascus to all of Syria.",
  } satisfies LocalText,
  primary: { ar: "ابدأ التعلّم", en: "Start learning" } satisfies LocalText,
  secondary: { ar: "سجّل الآن", en: "Register now" } satisfies LocalText,
  videoSrc: "/cinematic/mobile/roots-tree-loop.mp4",
  videoPoster: "/cinematic/mobile/roots-tree-poster.webp",
};

export const HERO_MEDIA = {
  videoSrc: "/cinematic/mobile/hero-tree-loop.mp4",
  videoPoster: "/cinematic/mobile/hero-tree-poster.webp",
};

export const MICRO_COPY = {
  skip: { ar: "انتقل إلى المحتوى الرئيسي", en: "Skip to main content" } satisfies LocalText,
  menu: { ar: "القائمة", en: "Menu" } satisfies LocalText,
  closeMenu: { ar: "أغلق القائمة", en: "Close menu" } satisfies LocalText,
  association: { ar: "الجمعية", en: "Association" } satisfies LocalText,
  participate: { ar: "شارك", en: "Participate" } satisfies LocalText,
  switchTo: { ar: "English", en: "العربية" } satisfies LocalText,
  switchLabel: { ar: "التبديل إلى الإنجليزية", en: "Switch to Arabic" } satisfies LocalText,
  newTab: { ar: "، يفتح في علامة تبويب جديدة", en: ", opens in a new tab" } satisfies LocalText,
  brandName: { ar: "SAAE", en: "SAAE" } satisfies LocalText,
  menuDesc: {
    ar: "روابط أقسام الموقع والمشاركة.",
    en: "Links to site sections and participation.",
  } satisfies LocalText,
  pauseVideo: { ar: "إيقاف الفيديو مؤقتاً", en: "Pause video" } satisfies LocalText,
  playVideo: { ar: "تشغيل الفيديو", en: "Play video" } satisfies LocalText,
  pauseLogos: { ar: "إيقاف حركة الشعارات", en: "Pause logos" } satisfies LocalText,
  playLogos: { ar: "تشغيل حركة الشعارات", en: "Play logos" } satisfies LocalText,
  scrollCue: { ar: "مرّر", en: "Scroll" } satisfies LocalText,
  prev: { ar: "السابق", en: "Previous" } satisfies LocalText,
  next: { ar: "التالي", en: "Next" } satisfies LocalText,
  footerAssociation: { ar: "الجمعية", en: "Association" } satisfies LocalText,
  footerTakePart: { ar: "شارك", en: "Take part" } satisfies LocalText,
  footerExplore: { ar: "استكشف", en: "Explore" } satisfies LocalText,
  followUs: { ar: "تابعنا", en: "Follow SAAE" } satisfies LocalText,
  backToTop: { ar: "العودة إلى الأعلى", en: "Back to top" } satisfies LocalText,
  footerEyebrow: {
    ar: "الخطوة التالية تبدأ من هنا",
    en: "The next step starts here",
  } satisfies LocalText,
  footerInvite: {
    ar: "ساهم في تشكيل ما يمكن لسورية أن تفعله بالذكاء الاصطناعي.",
    en: "Help shape what Syria can do with AI.",
  } satisfies LocalText,
  contactTitle: { ar: "تواصل مع الجمعية", en: "Reach SAAE" } satisfies LocalText,
  visitUs: { ar: "زورونا", en: "Visit us" } satisfies LocalText,
  openMaps: {
    ar: "افتح موقع الجمعية في الخرائط",
    en: "Open SAAE location in Maps",
  } satisfies LocalText,
};
