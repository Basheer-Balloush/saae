/* Abu Al-Joud's page-guide copy, shared by the desktop guide
   (DesktopSectionGuide) and the phone one (MobileSectionGuide). */

export type Locale = "ar" | "en";
export type GuideContext = "hero" | "news" | "partners" | "mission" | "faq";

export type GuideCopy = {
  section: string;
  greeting: string;
  title: string;
  body: string;
  close: string;
  label: string;
  speech: string;
  status: string;
  prefill: string;
};

export const SHARED = {
  ar: {
    close: "إخفاء الدليل",
    label: "تحدّث مع أبو الجود",
    status: "دليلك في الصفحة",
  },
  en: {
    close: "Hide guide",
    label: "Talk to Abu Al-Joud",
    status: "Your page guide",
  },
} as const;

const NEWS_COPY: Record<Locale, GuideCopy> = {
  ar: {
    ...SHARED.ar,
    section: "آخر الأخبار",
    greeting: "والآن، دعني أعرّفك على آخر ما يحدث.",
    title: "العمل كما يحدث",
    body: "هنا تتابع أحدث أخبار الجمعية ومبادراتها وفعالياتها، من الفكرة الأولى حتى الأثر الذي نصنعه معاً.",
    speech: "أهلاً بك في آخر الأخبار",
    prefill: "أخبرني أكثر عن أخبار الجمعية ومبادراتها",
  },
  en: {
    ...SHARED.en,
    section: "Latest news",
    greeting: "Now let me show you what is happening.",
    title: "The work, as it happens",
    body: "Follow SAAE's latest news, initiatives and events here, from the first idea to the impact we create together.",
    speech: "Welcome to our latest news",
    prefill: "Tell me more about SAAE's news and initiatives",
  },
};

export const SECTION_COPY: Record<Exclude<GuideContext, "hero">, Record<Locale, GuideCopy>> = {
  news: NEWS_COPY,
  partners: {
    ar: {
      ...SHARED.ar,
      section: "شركاء النجاح",
      greeting: "هنا يكبر الأثر بالتعاون.",
      title: "شراكات تحمل المعرفة أبعد",
      body: "تلتقي الجامعات والوزارات والشركات ومنظمات المجتمع مع الجمعية لتوسيع التدريب والمشاريع التطبيقية.",
      speech: "هذه شبكة شركائنا",
      prefill: "أخبرني عن شركاء الجمعية ودورهم",
    },
    en: {
      ...SHARED.en,
      section: "Success partners",
      greeting: "Here, impact grows through collaboration.",
      title: "Partnerships carry knowledge further",
      body: "Universities, ministries, companies and civil society groups work with SAAE to expand training and applied projects.",
      speech: "Meet our partner network",
      prefill: "Tell me about SAAE partners and their role",
    },
  },
  mission: {
    ar: {
      ...SHARED.ar,
      section: "كيف نعمل",
      greeting: "هنا تتحول المعرفة إلى فعل.",
      title: "درّب، طبّق، وابنِ",
      body: "تعرض هذه المرحلة طريقة عمل الجمعية: تدريب عملي، تطبيق معرفي، وبناء قدرات يمكن استخدامها مباشرة.",
      speech: "هذه طريقة عملنا",
      prefill: "اشرح لي كيف تعمل الجمعية من التدريب إلى التطبيق",
    },
    en: {
      ...SHARED.en,
      section: "How we work",
      greeting: "Here, knowledge turns into action.",
      title: "Train, apply, and build",
      body: "This section shows how SAAE works: practical training, applied knowledge and capability people can use immediately.",
      speech: "This is how we work",
      prefill: "Explain how SAAE works from training to application",
    },
  },
  faq: {
    ar: {
      ...SHARED.ar,
      section: "الأسئلة الشائعة",
      greeting: "إذا خطر لك سؤال، فهذه نقطة البداية.",
      title: "إجابات واضحة قبل البداية",
      body: "هنا تجد أهم الأسئلة حول التسجيل والدورات والمجتمعات والشراكات، بإجابات مباشرة تساعدك على اختيار خطوتك التالية.",
      speech: "اسألني أي سؤال",
      prefill: "ما أهم الأسئلة الشائعة عن الجمعية؟",
    },
    en: {
      ...SHARED.en,
      section: "FAQ",
      greeting: "If a question comes to mind, start here.",
      title: "Clear answers before you begin",
      body: "Find direct answers about registration, courses, communities and partnerships so you can choose your next step.",
      speech: "Ask me anything",
      prefill: "What are the most common questions about SAAE?",
    },
  },
};

export const SECTION_COMIC_IMAGES: Record<Exclude<GuideContext, "hero">, string> = {
  news: "/cinematic/images/abu-al-joud-comic-welcome.webp",
  partners: "/cinematic/images/abu-al-joud-comic-celebrate.webp",
  mission: "/cinematic/images/abu-al-joud-comic-curious.webp",
  faq: "/cinematic/images/abu-al-joud-comic-vision.webp",
};
