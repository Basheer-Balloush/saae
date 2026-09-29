/* Shared question catalogue for the digital-experience feedback survey.
   Used by the public form, the server validator, the admin dashboard and exports. */

export type Lang = "ar" | "en";
export type Choice = { value: string; ar: string; en: string };
export type RatingQuestion = { key: string; ar: string; en: string };
export type SectionKey =
  | "website"
  | "content"
  | "platform"
  | "chatbot"
  | "registration"
  | "accessibility"
  | "overall";
export type RatingSection = {
  key: SectionKey;
  ar: string;
  en: string;
  allowNA: boolean;
  /** Show only when one of these services was selected (undefined = always). */
  showIf?: string[];
  questions: RatingQuestion[];
};

export const SURVEY_VERSION = "v1";

export const RATING_LABELS: Record<Lang, string[]> = {
  ar: ["", "ضعيف جداً", "ضعيف", "جيد", "جيد جداً", "ممتاز"],
  en: ["", "Very poor", "Poor", "Good", "Very good", "Excellent"],
};
export const NA_LABEL = { ar: "لا ينطبق", en: "Not applicable" };

const c = (value: string, ar: string, en: string): Choice => ({ value, ar, en });

export const USER_TYPES: Choice[] = [
  c("student", "طالب/ـة", "Student"),
  c("trainee", "متدرب/ـة", "Trainee"),
  c("trainer", "مدرب/ـة", "Trainer"),
  c("researcher", "باحث/ـة", "Researcher"),
  c("entrepreneur", "رائد/ـة أعمال", "Entrepreneur"),
  c("employee", "موظف/ـة", "Employee"),
  c("partner", "شريك/جهة متعاونة", "Partner / collaborating body"),
  c("visitor", "زائر/ـة", "Visitor"),
  c("other", "أخرى", "Other"),
];
export const AGE_RANGES: Choice[] = [
  c("under18", "أقل من 18", "Under 18"),
  c("18-24", "18 – 24", "18 – 24"),
  c("25-34", "25 – 34", "25 – 34"),
  c("35-44", "35 – 44", "35 – 44"),
  c("45-54", "45 – 54", "45 – 54"),
  c("55plus", "55 فأكثر", "55+"),
];
export const GOVERNORATES: Choice[] = [
  c("damascus", "دمشق", "Damascus"),
  c("rif-dimashq", "ريف دمشق", "Rif Dimashq"),
  c("aleppo", "حلب", "Aleppo"),
  c("homs", "حمص", "Homs"),
  c("hama", "حماة", "Hama"),
  c("latakia", "اللاذقية", "Latakia"),
  c("tartus", "طرطوس", "Tartus"),
  c("idlib", "إدلب", "Idlib"),
  c("deir-ez-zor", "دير الزور", "Deir ez-Zor"),
  c("raqqa", "الرقة", "Raqqa"),
  c("hasakah", "الحسكة", "Al-Hasakah"),
  c("daraa", "درعا", "Daraa"),
  c("suwayda", "السويداء", "As-Suwayda"),
  c("quneitra", "القنيطرة", "Quneitra"),
  c("abroad", "خارج سوريا", "Outside Syria"),
];
export const FREQUENCIES: Choice[] = [
  c("first", "هذه أول زيارة", "This is my first visit"),
  c("rarely", "نادراً", "Rarely"),
  c("monthly", "شهرياً", "Monthly"),
  c("weekly", "أسبوعياً", "Weekly"),
  c("daily", "يومياً", "Daily"),
];
export const DEVICES: Choice[] = [
  c("mobile", "هاتف محمول", "Mobile phone"),
  c("tablet", "جهاز لوحي", "Tablet"),
  c("laptop", "حاسوب محمول", "Laptop"),
  c("desktop", "حاسوب مكتبي", "Desktop"),
];
export const SERVICES: Choice[] = [
  c("website", "الموقع الرئيسي", "Main website"),
  c("platform", "المنصة التعليمية", "Learning platform"),
  c("courses", "الدورات التدريبية", "Training courses"),
  c("chatbot", 'المساعد الذكي "أبو الجود"', 'Abu Al-Joud assistant'),
  c("registration", "التسجيل أو إنشاء حساب", "Registration / account"),
  c("initiative", "مبادرة المليون مستخدم", "One Million Users initiative"),
  c("communities", "مجتمعات الجمعية", "SAAE communities"),
  c("news", "الأخبار والنشاطات", "News & activities"),
  c("contact", "التواصل مع الجمعية", "Contacting SAAE"),
  c("none", "لم أستخدم أي خدمة بعد", "I haven't used any service yet"),
];
export const CONTACT_METHODS: Choice[] = [
  c("email", "البريد الإلكتروني", "Email"),
  c("phone", "اتصال هاتفي", "Phone call"),
  c("whatsapp", "واتساب", "WhatsApp"),
];
export const REVIEW_STATUSES: Choice[] = [
  c("new", "جديد", "New"),
  c("in_review", "قيد المراجعة", "In review"),
  c("contacted", "تم التواصل", "Contacted"),
  c("closed", "مغلق", "Closed"),
];

const q = (key: string, ar: string, en: string): RatingQuestion => ({ key, ar, en });

export const SECTIONS: RatingSection[] = [
  {
    key: "website",
    ar: "التجربة العامة للموقع",
    en: "General website experience",
    allowNA: false,
    questions: [
      q("w_purpose", "ما مدى وضوح الهدف من الموقع منذ زيارتك الأولى؟", "How clear was the site's purpose from your first visit?"),
      q("w_navigation", "ما مدى سهولة التنقل بين صفحات الموقع؟", "How easy is it to move between pages?"),
      q("w_find_info", "ما مدى سهولة العثور على المعلومات التي تبحث عنها؟", "How easy is it to find the information you need?"),
      q("w_menus", "كيف تقيّم تنظيم القوائم والأقسام؟", "How do you rate the organisation of menus and sections?"),
      q("w_visual", "كيف تقيّم التصميم البصري للموقع؟", "How do you rate the visual design?"),
      q("w_text", "كيف تقيّم وضوح النصوص وحجم الخطوط؟", "How do you rate text clarity and font size?"),
      q("w_consistency", "كيف تقيّم تناسق الألوان والصور والأيقونات؟", "How consistent are colours, images and icons?"),
      q("w_speed", "كيف تقيّم سرعة تحميل الصفحات؟", "How do you rate page loading speed?"),
      q("w_mobile", "كيف تقيّم تجربة الموقع على الهاتف المحمول؟", "How do you rate the experience on mobile?"),
      q("w_actions", "كيف تقيّم وضوح الأزرار والروابط والإجراءات المطلوبة؟", "How clear are buttons, links and required actions?"),
      q("w_accuracy", "كيف تقيّم دقة المعلومات وحداثتها؟", "How accurate and up to date is the information?"),
      q("w_language", "كيف تقيّم سهولة التبديل بين العربية والإنجليزية؟", "How easy is switching between Arabic and English?"),
      q("w_trust", "كيف تقيّم شعورك بالأمان والثقة أثناء استخدام الموقع؟", "How safe and confident do you feel using the site?"),
      q("w_overall", "ما تقييمك العام للموقع؟", "Your overall rating of the website?"),
    ],
  },
  {
    key: "content",
    ar: "محتوى الموقع وأقسامه",
    en: "Website content & sections",
    allowNA: true,
    questions: [
      q("c_about", 'كيف تقيّم صفحة "عن الجمعية" ووضوح الرؤية والرسالة؟', 'How do you rate the "About" page and the clarity of vision and mission?'),
      q("c_communities", "كيف تقيّم عرض مجتمعات الجمعية والتعريف بها؟", "How well are SAAE communities presented?"),
      q("c_initiatives", "كيف تقيّم عرض مبادرات الجمعية، ومنها مبادرة المليون مستخدم؟", "How well are initiatives presented, including One Million Users?"),
      q("c_news", "كيف تقيّم قسم الأخبار والنشاطات؟", "How do you rate the news & activities section?"),
      q("c_partners", "كيف تقيّم عرض الشركاء والجهات المتعاونة؟", "How well are partners presented?"),
      q("c_stats", "كيف تقيّم وضوح الإنجازات والأرقام المنشورة؟", "How clear are the published achievements and figures?"),
      q("c_contact_info", "كيف تقيّم سهولة الوصول إلى معلومات التواصل؟", "How easy is it to find contact information?"),
      q("c_join_steps", "كيف تقيّم وضوح خطوات التسجيل أو الانضمام؟", "How clear are the steps to register or join?"),
      q("c_faq", "كيف تقيّم الأسئلة الشائعة وإجاباتها؟", "How do you rate the FAQ?"),
      q("c_usefulness", "ما مدى فائدة محتوى الموقع بالنسبة إليك؟", "How useful is the content to you?"),
    ],
  },
  {
    key: "platform",
    ar: "المنصة التعليمية",
    en: "Learning platform",
    allowNA: true,
    showIf: ["platform", "courses"],
    questions: [
      q("p_account", "كيف تقيّم سهولة إنشاء حساب أو تسجيل الدخول؟", "How easy is creating an account or signing in?"),
      q("p_search", "كيف تقيّم سهولة البحث عن دورة مناسبة؟", "How easy is finding a suitable course?"),
      q("p_filters", "كيف تقيّم تصنيف الدورات واستخدام عوامل التصفية؟", "How do you rate course categories and filters?"),
      q("p_course_info", "كيف تقيّم وضوح معلومات الدورة قبل التسجيل؟", "How clear is course information before enrolling?"),
      q("p_course_meta", "كيف تقيّم وضوح مستوى الدورة ومدتها وتكلفتها وطريقة تقديمها؟", "How clear are level, duration, cost and delivery mode?"),
      q("p_enroll", "كيف تقيّم سهولة التسجيل في الدورة؟", "How easy is enrolling in a course?"),
      q("p_content", "كيف تقيّم جودة المحتوى التعليمي؟", "How do you rate the quality of learning content?"),
      q("p_trainers", "كيف تقيّم خبرة المدربين وطريقة الشرح؟", "How do you rate trainers' expertise and teaching?"),
      q("p_structure", "كيف تقيّم تنظيم الدروس والمواد التدريبية؟", "How well organised are lessons and materials?"),
      q("p_activities", "كيف تقيّم الأنشطة والاختبارات والواجبات، إن وُجدت؟", "How do you rate activities, quizzes and assignments?"),
      q("p_progress", "كيف تقيّم متابعة تقدمك داخل الدورة؟", "How well can you track your progress?"),
      q("p_profile", "كيف تقيّم سهولة الوصول إلى دوراتك وملفك الشخصي؟", "How easy is reaching your courses and profile?"),
      q("p_certificate", "كيف تقيّم عملية الحصول على الشهادة والتحقق منها؟", "How do you rate getting and verifying certificates?"),
      q("p_support", "كيف تقيّم الدعم المقدم عند مواجهة مشكلة؟", "How do you rate support when you had a problem?"),
      q("p_relevance", "ما مدى توافق الدورات مع احتياجاتك المهنية أو التعليمية؟", "How well do courses match your needs?"),
      q("p_again", "ما مدى احتمال أن تسجل في دورة أخرى؟", "How likely are you to enrol in another course?"),
      q("p_overall", "ما تقييمك العام للمنصة التعليمية؟", "Your overall rating of the learning platform?"),
    ],
  },
  {
    key: "chatbot",
    ar: 'المساعد الذكي "أبو الجود"',
    en: "Abu Al-Joud assistant",
    allowNA: true,
    showIf: ["chatbot"],
    questions: [
      q("b_start", "كيف تقيّم سهولة العثور على المساعد وبدء المحادثة؟", "How easy is finding the assistant and starting a chat?"),
      q("b_speed", "كيف تقيّم سرعة الرد؟", "How do you rate response speed?"),
      q("b_understanding", "كيف تقيّم قدرة المساعد على فهم سؤالك؟", "How well does it understand your question?"),
      q("b_accuracy", "كيف تقيّم دقة الإجابات؟", "How accurate are the answers?"),
      q("b_relevance", "كيف تقيّم ارتباط الإجابات بسؤالك؟", "How relevant are the answers to your question?"),
      q("b_arabic", "كيف تقيّم وضوح اللغة العربية المستخدمة؟", "How clear is the Arabic it uses?"),
      q("b_suggestions", "كيف تقيّم اقتراحاته للدورات أو الخدمات المناسبة؟", "How good are its course and service suggestions?"),
      q("b_guidance", "كيف تقيّم مساعدته لك في الوصول إلى القسم أو المعلومة المطلوبة؟", "How well does it guide you to the right section?"),
      q("b_tone", "كيف تقيّم أسلوبه الودود والمهني؟", "How do you rate its friendly, professional tone?"),
      q("b_trust", "ما مدى ثقتك بالمعلومات التي يقدمها؟", "How much do you trust its information?"),
      q("b_task", "هل ساعدك المساعد على إكمال المهمة التي أردتها؟", "Did it help you complete your task?"),
      q("b_overall", "ما تقييمك العام للمساعد الذكي؟", "Your overall rating of the assistant?"),
    ],
  },
  {
    key: "registration",
    ar: "التسجيل والتواصل",
    en: "Registration & communication",
    allowNA: true,
    showIf: ["registration", "contact", "initiative"],
    questions: [
      q("r_form", "كيف تقيّم وضوح نموذج التسجيل؟", "How clear is the registration form?"),
      q("r_fields", "كيف تقيّم سهولة تعبئة الحقول؟", "How easy is filling in the fields?"),
      q("r_messages", "كيف تقيّم وضوح رسائل النجاح والخطأ؟", "How clear are success and error messages?"),
      q("r_speed", "كيف تقيّم سرعة إتمام التسجيل؟", "How quick is completing registration?"),
      q("r_contact", "كيف تقيّم سهولة التواصل مع الجمعية؟", "How easy is contacting SAAE?"),
      q("r_response", "كيف تقيّم سرعة استجابة فريق الجمعية؟", "How fast does the SAAE team respond?"),
      q("r_usefulness", "كيف تقيّم فائدة الرد الذي تلقيته؟", "How useful was the reply you received?"),
      q("r_overall", "ما تقييمك العام لخدمة التسجيل والتواصل؟", "Your overall rating of registration & communication?"),
    ],
  },
  {
    key: "accessibility",
    ar: "سهولة الوصول والتجربة التقنية",
    en: "Accessibility & technical experience",
    allowNA: true,
    questions: [
      q("a_no_expertise", "كيف تقيّم سهولة استخدام الموقع من دون خبرة تقنية؟", "How easy is the site without technical experience?"),
      q("a_contrast", "كيف تقيّم وضوح تباين الألوان؟", "How clear is the colour contrast?"),
      q("a_keyboard", "كيف تقيّم سهولة استخدام الموقع باستخدام لوحة المفاتيح؟", "How easy is using the site with a keyboard?"),
      q("a_errors", "كيف تقيّم وضوح رسائل الأخطاء والتعليمات؟", "How clear are error messages and instructions?"),
      q("a_stability", "كيف تقيّم استقرار الموقع وعدم ظهور أعطال؟", "How stable is the site?"),
      q("a_responsiveness", "كيف تقيّم سرعة الاستجابة عند الضغط على الأزرار؟", "How responsive are buttons when pressed?"),
      q("a_slow_net", "كيف تقيّم الموقع عند استخدام اتصال إنترنت بطيء؟", "How does the site perform on slow internet?"),
    ],
  },
  {
    key: "overall",
    ar: "التقييم العام",
    en: "Overall evaluation",
    allowNA: false,
    questions: [
      q("o_satisfaction", "ما مدى رضاك العام عن تجربة الجمعية الرقمية؟", "Overall, how satisfied are you with SAAE's digital experience?"),
      q("o_return", "ما مدى احتمال أن تزور الموقع مرة أخرى؟", "How likely are you to visit again?"),
      q("o_recommend", "ما مدى احتمال أن توصي بالموقع أو المنصة لشخص آخر؟", "How likely are you to recommend the site or platform?"),
      q("o_trust", "ما مدى ثقتك بالجمعية بعد استخدام خدماتها الرقمية؟", "How much do you trust SAAE after using its services?"),
      q("o_needs", "ما مدى شعورك بأن الموقع يلبي احتياجاتك؟", "How well does the site meet your needs?"),
      q("o_all_services", "ما التقييم العام الذي تمنحه لجميع الخدمات التي استخدمتها؟", "Your overall rating for all services you used?"),
    ],
  },
];

export const NOTE_FIELDS = [
  { key: "positive_notes", group: "praise", ar: "ما أكثر شيء أعجبك في الموقع أو المنصة؟", en: "What did you like most?" },
  { key: "improvement_notes", group: "suggestion", ar: "ما أكثر شيء يحتاج إلى تحسين؟", en: "What needs the most improvement?" },
  { key: "problem_notes", group: "problem", ar: "هل واجهت مشكلة أو خطأ؟ اشرح لنا ما حدث.", en: "Did you face a problem or error? Tell us what happened." },
  { key: "requested_feature", group: "feature", ar: "ما الميزة أو الخدمة التي ترغب في إضافتها؟", en: "Which feature or service would you like added?" },
  { key: "general_notes", group: "general", ar: "ملاحظات أو اقتراحات أخرى", en: "Other notes or suggestions" },
] as const;
export type NoteKey = (typeof NOTE_FIELDS)[number]["key"];

export const COMMENT_GROUPS: Choice[] = [
  c("praise", "إعجاب", "Praise"),
  c("problem", "مشكلة", "Problem"),
  c("suggestion", "اقتراح", "Suggestion"),
  c("feature", "ميزة مطلوبة", "Requested feature"),
  c("general", "ملاحظة عامة", "General note"),
];

export const ALL_QUESTIONS = SECTIONS.flatMap((s) =>
  s.questions.map((qq) => ({ ...qq, section: s.key, allowNA: s.allowNA })),
);
export const QUESTION_BY_KEY = new Map(ALL_QUESTIONS.map((x) => [x.key, x]));
export const SECTION_BY_KEY = new Map(SECTIONS.map((s) => [s.key, s]));

export function isSectionVisible(section: RatingSection, services: string[]): boolean {
  if (!section.showIf) return true;
  return section.showIf.some((s) => services.includes(s));
}

export function choiceLabel(list: Choice[], value: string | null | undefined, lang: Lang): string {
  if (!value) return "";
  const f = list.find((x) => x.value === value);
  return f ? f[lang] : value;
}

/** Answer value stored per question: 1-5, or "na". */
export type AnswerValue = number | "na";
