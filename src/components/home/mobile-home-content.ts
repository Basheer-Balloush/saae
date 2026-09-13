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

/** FAQ — existing answers, reviewed copy only. */
export const FAQS: FaqEntry[] = [
  {
    question: { ar: "لمن تناسب الجمعية؟", en: "Who is SAAE for?" },
    answer: {
      ar: "للطلاب والمعلّمين والمهنيين ورواد الأعمال والمؤسسات الراغبة بتجربة عملية مع الذكاء الاصطناعي، لا للعاملين في التقنية فقط.",
      en: "Students, educators, professionals, founders and institutions that want practical contact with AI — not only people who already work in technology.",
    },
  },
  {
    question: { ar: "هل أحتاج إلى خبرة تقنية؟", en: "Do I need technical experience?" },
    answer: {
      ar: "لا. تتضمن برامج الجمعية العامة نقاط بداية للمبتدئين في الذكاء الاصطناعي، وتوضح كل دورة متطلباتها الخاصة.",
      en: "No. SAAE's public programmes include starting points for people who are new to AI. Individual courses set their own requirements, which are listed with each course.",
    },
  },
  {
    question: { ar: "كيف أشارك؟", en: "How do I take part?" },
    answer: {
      ar: "ستُنشر مواعيد البرامج والتسجيل على هذا الموقع. وحتى ذلك الحين، استخدم نموذج التواصل للاستفسار عن الدفعة الحالية ومحتوى كل مسار.",
      en: "Programme dates and registration will be published on this website. Until then, use the contact form to ask about the current intake and what each track involves.",
    },
  },
  {
    question: {
      ar: "هل يمكن لمؤسسة أن تعمل مع الجمعية؟",
      en: "Can an organisation work with SAAE?",
    },
    answer: {
      ar: "نعم. تتشارك الجامعات والوزارات والشركات ومنظمات المجتمع في التدريب والعمل التطبيقي. تُرسل استفسارات الشراكة إلى",
      en: "Yes. Universities, ministries, companies and community organisations already partner on training and applied work. Partnership questions go to",
    },
    answerLink: {
      href: "mailto:info@aisyria.org",
      text: { ar: "info@aisyria.org", en: "info@aisyria.org" },
    },
  },
  {
    question: { ar: "أين ستُنشر التحديثات؟", en: "Where will updates be published?" },
    answer: {
      ar: "سيصبح هذا الموقع المعاد تصميمه الواجهة العامة الرسمية للجمعية. وستُنشر البرامج والتسجيلات والإعلانات هنا مع إطلاق كل قسم.",
      en: "This redesigned website is becoming SAAE's official public home. Programmes, registration and announcements will be published here as each section launches.",
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
  eyebrow: { ar: "الجمعية بالأرقام", en: "SAAE in numbers" } satisfies LocalText,
  title: {
    ar: "أكثر من 5,000 متعلم مع الجمعية.",
    en: "5,000+ people learning with SAAE.",
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
    ar: "مليون شخص. خطوة وطنية إلى الأمام.",
    en: "One million people. One national step forward.",
  } satisfies LocalText,
  body: {
    ar: "جهد وطني يجعل معرفة الذكاء الاصطناعي عملية وموثوقة ومتاحة.",
    en: "A national effort to make AI knowledge practical, trusted and reachable.",
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
    ar: "تسعة مجتمعات. جذور تجمعنا.",
    en: "Nine communities. One shared foundation.",
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
    ar: "المؤسسات تدفعها إلى الأمام",
    en: "Institutions carry it further",
  } satisfies LocalText,
  body: {
    ar: "تعمل الجامعات والوزارات والشركات ومنظمات المجتمع مع الجمعية في التدريب والمشاريع التطبيقية.",
    en: "Universities, ministries, companies and community organisations already work with SAAE on training and applied projects.",
  } satisfies LocalText,
  allPartners: { ar: "شاهد جميع الشركاء", en: "See all partners" } satisfies LocalText,
};

export const FAQ_COPY = {
  eyebrow: { ar: "إجابات عملية", en: "Practical answers" } satisfies LocalText,
  title: { ar: "طريق واضح للبداية.", en: "A clear way in." } satisfies LocalText,
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
    ar: "من جذورنا، إلى كل سورية.",
    en: "From our roots, to all of Syria.",
  } satisfies LocalText,
  body: {
    ar: "من مجتمعاتنا ينمو التعلّم وتُثمر الفرص. وتحمل مبادرة مليون مستخدم سوري للذكاء الاصطناعي هذا الطموح إلى أنحاء سورية.",
    en: "Our communities nurture learning and opportunity. The Million Syrian AI Users initiative carries that ambition across the country.",
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
