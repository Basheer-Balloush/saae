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

/** Exact approved opening headline — do not rephrase. */
export const OPENING_HEADLINE: LocalText = {
  ar: "ذكاء وريادة لوطن ينهض",
  en: "Intelligence and entrepreneurship for a nation on the rise",
};

export const OPENING = {
  eyebrow: {
    ar: "الجمعية السورية للذكاء الاصطناعي وريادة الأعمال",
    en: "Syrian Association for AI & Entrepreneurship",
  } satisfies LocalText,
  /** Primary learning CTA → local learning platform route (same tab). */
  primary: {
    label: { ar: "ابدأ التعلّم", en: "Start learning" } satisfies LocalText,
    href: "/learning-management-system",
  },
  /** Initiative secondary action → local initiative page. */
  secondary: {
    href: "/initiative",
  },
};

/** All eight homepage communities, software first. */
export const COMMUNITIES: CommunityEntry[] = [
  {
    key: "software",
    name: { ar: "مجتمع البرمجيات", en: "Software Community" },
    tagline: { ar: "بناء أنظمة رقمية نافعة.", en: "Build useful digital systems." },
    href: "/communities/software",
  },
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
];

/** Mission: train, apply, build. No numerical claims live here. */
export const MISSION_STEPS: MissionStep[] = [
  {
    index: { ar: "درّب", en: "TRAIN" },
    title: { ar: "ضع الذكاء الاصطناعي بين أيدٍ منتجة", en: "Put AI into working hands" },
    body: {
      ar: "تحوّل الدورات وورش العمل وبرامج إعداد المدربين الذكاء الاصطناعي من عنوان إلى مهارة يستخدمها الطلاب والمهنيون والمعلّمون في عملهم.",
      en: "Courses, workshops and trainer programmes turn AI from a headline into a skill that students, professionals and educators can use on Monday morning.",
    },
  },
  {
    index: { ar: "طبّق", en: "APPLY" },
    title: { ar: "أثبت فاعليته في مشكلات حقيقية", en: "Prove it on real problems" },
    body: {
      ar: "يوظف المتخصصون هذه الأساليب في قضايا سورية ضمن الصحة والبيانات والإعلام والبرمجيات والمدن، وينشرون ما يثبت أثره.",
      en: "Specialists put those methods to work on Syrian questions in health, data, media, software and the shape of its cities, and publish what holds.",
    },
  },
  {
    index: { ar: "ابنِ", en: "BUILD" },
    title: { ar: "حوّل القدرة إلى مشروع", en: "Turn capability into enterprise" },
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
  "/about#communities-h": "#hero-sec",
  "/about#standing-h": "#hero-sec",
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
  title: {
    ar: "كيف تعمل الجمعية: درّب، طبّق، وابنِ",
    en: "How SAAE works: train, apply, build",
  } satisfies LocalText,
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
  title: { ar: "أسئلة شائعة", en: "FAQ'S" } satisfies LocalText,
  body: {
    ar: "الأسئلة التي يطرحها الناس فعلاً قبل البداية.",
    en: "The questions people actually ask before they start.",
  } satisfies LocalText,
  writeToUs: { ar: "راسلنا", en: "Write to us" } satisfies LocalText,
};

export const MICRO_COPY = {
  skip: { ar: "انتقل إلى المحتوى الرئيسي", en: "Skip to main content" } satisfies LocalText,
};
