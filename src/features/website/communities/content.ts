// Copy for the community pages, moved unchanged out of the route.
import type { CommunityKey } from "@/lib/communityCategories";

type Bilingual = { ar: string; en: string };
export type Metric = { value: string; label: Bilingual };
export type DetailBlock = { label: Bilingual; text: Bilingual };

export const MISSION: Record<CommunityKey, { ar: string; en: string }> = {
  data: {
    ar: "نُوفِّر طبقة «الذكاء» الأساسية لجميع قطاعات الجمعية عبر علوم البيانات، ونبني كفاءاتٍ سورية قادرة على قراءة الواقع وصياغة قراراته.",
    en: "Providing the foundational 'Intelligence' layer for all other SAAE sectors through data science — and building Syrian talent that can read reality and shape its decisions.",
  },
  architecture: {
    ar: "ندمج الذكاء الاصطناعي وإنترنت الأشياء وتحليل البيانات في إعادة إعمار سوريا وتخطيطها العمراني لبناء مدنٍ أكثر ذكاءً واستدامة.",
    en: "Integrating AI, IoT and data analysis into Syrian reconstruction and urban planning to build smarter, more sustainable cities.",
  },
  medical: {
    ar: "نَصِل الخبرة الطبية بالذكاء الاصطناعي (MedInvoVision) لتحسين دقّة التشخيص وجودة الرعاية الصحية في سوريا.",
    en: "Bridging medical expertise and AI (MedInvoVision) to improve diagnostic accuracy and quality of care in Syria.",
  },
  research: {
    ar: "نبني جسراً علمياً بين الذكاء الاصطناعي النظري والتطبيقات السورية العملية عبر بحوثٍ رصينة ومنشورة.",
    en: "Building a scientific bridge between theoretical AI and practical Syrian applications through rigorous, published research.",
  },
  software: {
    ar: "نصنع برمجياتٍ من سوريا، للعالم — بمعايير حِرفية وجودة معرفية عالية.",
    en: "Building software from Syria, for the world — with craft and world-class quality.",
  },
  economy: {
    ar: "نُعيد تعريف الاقتصاد عبر البيانات والذكاء الاصطناعي وأدوات القرن الجديد.",
    en: "Redefining the economy through data, AI, and the tools of a new century.",
  },
  trainers: {
    ar: "نبني شبكةً من المدرّبين المعتمدين الذين يقودون تجارب التعلّم في الجمعية بمعايير جودةٍ موحَّدة.",
    en: "Building a network of certified trainers who lead the association's learning experiences with unified quality standards.",
  },
  media: {
    ar: "نُوصِل رسالة الجمعية ومجتمعاتها إلى الجمهور السوري والعربي عبر محتوىً إعلاميٍّ موثوق يواكب ثورة الذكاء الاصطناعي.",
    en: "Carrying SAAE's message and its communities to Syrian and Arab audiences through trusted media content that keeps pace with the AI revolution.",
  },
};

export const DETAILS: Record<CommunityKey, DetailBlock[]> = {
  research: [
    {
      label: { ar: "المحور", en: "Focus" },
      text: {
        ar: "دعم البحث العلمي ودمجه بالذكاء الاصطناعي والتطبيقات العملية وريادة الأعمال.",
        en: "Supports scientific research and integrates it with AI, practical applications and entrepreneurship.",
      },
    },
    {
      label: { ar: "المنصّة", en: "Platform" },
      text: {
        ar: "تربط الباحثين والأكاديميين والطلاب والمبرمجين لبناء بيئةٍ بحثيةٍ حديثة في سوريا.",
        en: "Connects researchers, academics, students and programmers to develop a modern research environment in Syria.",
      },
    },
    {
      label: { ar: "الأهداف", en: "Goals" },
      text: {
        ar: "تدريب الباحثين على الأدوات الحديثة وتطوير دراساتٍ تطبيقيةٍ تستثمر الذكاء الاصطناعي.",
        en: "Training researchers on modern tools and developing applied studies that leverage AI.",
      },
    },
  ],
  medical: [
    {
      label: { ar: "المحور", en: "Focus" },
      text: {
        ar: "يُمثَّل أساساً بفريق «MedInvoVision» التطوعي، ويركّز على استراتيجيات التحول الرقمي في القطاع الصحي السوري.",
        en: "Represented largely by the MedInvoVision volunteer team, focused on digital-transformation strategies in the Syrian health sector.",
      },
    },
    {
      label: { ar: "الرؤية", en: "Vision" },
      text: {
        ar: "ردم الفجوة التكنولوجية في الرعاية الصحية عبر تحالفٍ استراتيجي بين الكوادر الطبية والتقنية.",
        en: "Bridge the technological gap in healthcare through a strategic alliance between medical and technical cadres.",
      },
    },
    {
      label: { ar: "الرسالة", en: "Mission" },
      text: {
        ar: "تحويل الذكاء الاصطناعي من «ترفٍ معرفي» إلى أداةٍ عمليةٍ لمعالجة تحدّيات الرعاية الصحية المركّبة في سوريا.",
        en: "Turn AI from a 'cognitive luxury' into a practical tool for addressing complex healthcare challenges in Syria.",
      },
    },
  ],
  architecture: [
    {
      label: { ar: "المحور", en: "Focus" },
      text: {
        ar: "دمج التقنيات الحديثة في التخطيط والتطوير العمراني.",
        en: "Integrating modern technology into urban planning and development.",
      },
    },
    {
      label: { ar: "المنصّة", en: "Platform" },
      text: {
        ar: "تربط المعماريين والمهندسين والمبرمجين لتطوير حلولٍ ذكية بالذكاء الاصطناعي وتحليل البيانات وإنترنت الأشياء.",
        en: "Connects architects, engineers and programmers to develop smart solutions using AI, data analysis and IoT.",
      },
    },
    {
      label: { ar: "أنشطةٌ بارزة", en: "Key Activities" },
      text: {
        ar: "برامجُ مميَّزةٌ مثل «Archathon» المتخصِّص بتحليل البيانات والابتكار العمراني.",
        en: "Signature programs such as 'Archathon', focused on data analysis and urban innovation.",
      },
    },
  ],
  data: [
    {
      label: { ar: "المحور", en: "Focus" },
      text: {
        ar: "بناء بيئةٍ تعليميةٍ وتقنيةٍ لعلوم البيانات وتحليل المعلومات.",
        en: "Building an educational and technical environment for data science and information analysis.",
      },
    },
    {
      label: { ar: "المهارات", en: "Skills" },
      text: {
        ar: "تطوير مهارات تحليل البيانات وتعلّم الآلة واتّخاذ القرار المبنيّ على البيانات.",
        en: "Developing skills in data analysis, machine learning and data-driven decision-making.",
      },
    },
    {
      label: { ar: "الهدف", en: "Objective" },
      text: {
        ar: "ربط خبرات علم البيانات بسوق العمل واحتياجات ريادة الأعمال في سوريا.",
        en: "Linking data-science expertise with the labor market and entrepreneurial needs in Syria.",
      },
    },
  ],
  software: [
    {
      label: { ar: "المحور", en: "Focus" },
      text: {
        ar: "صناعة البرمجيات بمعاييرَ حِرفيةٍ عالميةٍ من قلب سوريا.",
        en: "Crafting software from Syria with world-class engineering standards.",
      },
    },
    {
      label: { ar: "المنصّة", en: "Platform" },
      text: {
        ar: "مجتمعٌ يجمع المهندسين والمصممين والمبرمجين حول ممارساتٍ هندسية ومنهجياتٍ حديثة.",
        en: "A community connecting engineers, designers and developers around modern engineering practices.",
      },
    },
    {
      label: { ar: "الهدف", en: "Objective" },
      text: {
        ar: "بناء منتجاتٍ برمجيةٍ سوريةٍ موجَّهةٍ للسوق المحلي والعالمي بجودةٍ عاليةٍ ومستدامة.",
        en: "Build Syrian software products serving local and global markets with high, sustainable quality.",
      },
    },
  ],
  economy: [
    {
      label: { ar: "المحور", en: "Focus" },
      text: {
        ar: "إعادة تعريف الاقتصاد عبر البيانات والذكاء الاصطناعي وأدوات القرن الجديد.",
        en: "Redefining the economy through data, AI and the tools of a new century.",
      },
    },
    {
      label: { ar: "المنصّة", en: "Platform" },
      text: {
        ar: "تجمع الاقتصاديين والمحلِّلين وصنّاع القرار لدراسة الاقتصاد الذكي والتحول الرقمي.",
        en: "Connects economists, analysts and decision-makers to study smart economy and digital transformation.",
      },
    },
    {
      label: { ar: "الهدف", en: "Objective" },
      text: {
        ar: "تطوير قراءاتٍ اقتصاديةٍ مبنيّةٍ على البيانات تدعم القرار العام والخاص في سوريا.",
        en: "Develop data-driven economic insights that support public and private decision-making in Syria.",
      },
    },
  ],
  trainers: [
    {
      label: { ar: "المحور", en: "Focus" },
      text: {
        ar: "بناء مجتمعٍ من المدرّبين المعتمدين الذين يقودون البرامج التدريبية للجمعية.",
        en: "Building a community of certified trainers who lead the association's training programs.",
      },
    },
    {
      label: { ar: "المنصّة", en: "Platform" },
      text: {
        ar: "تجمع المدرّبين والمختصّين لتبادل المنهجيات والممارسات وضمان جودة التدريب.",
        en: "Connects trainers and specialists to exchange methodologies and ensure training quality.",
      },
    },
    {
      label: { ar: "الهدف", en: "Objective" },
      text: {
        ar: "تأهيل جيلٍ من المدرّبين السوريين القادرين على نقل المعرفة بمعاييرَ احترافيةٍ عالية.",
        en: "Equip a generation of Syrian trainers capable of transferring knowledge with high professional standards.",
      },
    },
  ],
  media: [
    {
      label: { ar: "المحور", en: "Focus" },
      text: {
        ar: "إنتاج محتوىً إعلاميٍّ متخصّص يُعرِّف الجمهور بالذكاء الاصطناعي وتطبيقاته في الواقع السوري.",
        en: "Producing specialized media content that introduces audiences to AI and its applications in the Syrian context.",
      },
    },
    {
      label: { ar: "المنصّة", en: "Platform" },
      text: {
        ar: "تجمع الصحفيين وصنّاع المحتوى لتغطية أنشطة الجمعية ومجتمعاتها وإيصال قصصها.",
        en: "Brings journalists and content creators together to cover SAAE's activities and tell the stories of its communities.",
      },
    },
    {
      label: { ar: "الهدف", en: "Objective" },
      text: {
        ar: "بناء خطابٍ إعلاميٍّ سوريٍّ موثوقٍ حول الذكاء الاصطناعي وأثره في المجتمع والاقتصاد.",
        en: "Building a trusted Syrian media narrative around AI and its impact on society and the economy.",
      },
    },
  ],
};

export const DEFAULT_METRICS: Metric[] = [
  { value: "320+", label: { ar: "عضو نشط", en: "Active Members" } },
  { value: "18", label: { ar: "ورقة بحثية", en: "Research Papers" } },
  { value: "42", label: { ar: "ورشة وفعالية", en: "Workshops & Events" } },
  { value: "27", label: { ar: "مشروع تطبيقي", en: "Applied Projects" } },
];

export const METRICS_BY_KEY: Record<CommunityKey, Metric[]> = {
  research: [
    { value: "+20", label: { ar: "ورقة بحثية", en: "Research Papers" } },
    { value: "+100", label: { ar: "باحث متّصِل بالشبكة", en: "Researchers Connected" } },
  ],
  medical: [
    { value: "+5", label: { ar: "نموذجٌ طبيٌّ مبتكر", en: "Innovative Medical Prototypes" } },
    { value: "+300", label: { ar: "طالب طبٍّ مُستفيد", en: "Medical Students Impacted" } },
  ],
  architecture: [
    { value: "+12", label: { ar: "مشروع تصميمٍ ذكي", en: "Smart Design Projects" } },
    {
      value: "+50",
      label: { ar: "معماري متخصّص بالذكاء الاصطناعي", en: "Architects Specialized in AI" },
    },
  ],
  data: [
    { value: "+200", label: { ar: "مُحلِّل بيانات مُدرَّب", en: "Data Analysts Trained" } },
    { value: "+10", label: { ar: "مجموعة بيانات مفتوحة", en: "Open-Source Datasets Curated" } },
  ],
  software: DEFAULT_METRICS,
  economy: DEFAULT_METRICS,
  trainers: [
    { value: "+80", label: { ar: "مدرّب معتمد", en: "Certified Trainers" } },
    { value: "+150", label: { ar: "ورشة تدريبية", en: "Training Workshops" } },
  ],
  media: [
    { value: "+40", label: { ar: "صانع محتوى", en: "Content Creators" } },
    { value: "+200", label: { ar: "مادة إعلامية منشورة", en: "Published Media Pieces" } },
  ],
};

/* The homepage community card's names and one-line promises
   (public/cinematic/js/home-inline.js), so a page opens where its card left off. */
export const SHORT_NAME: Record<CommunityKey, Bilingual> = {
  data: { en: "Data", ar: "البيانات" },
  architecture: { en: "Smart Urban", ar: "العمراني الذكي" },
  medical: { en: "Healthcare", ar: "الرعاية الصحية" },
  research: { en: "Smart Research", ar: "البحث الذكي" },
  software: { en: "Software", ar: "البرمجيات" },
  economy: { en: "Smart Economy", ar: "الاقتصاد الذكي" },
  trainers: { en: "Trainers", ar: "المدربين" },
  media: { en: "Media", ar: "الإعلام" },
};

export const TAGLINE: Record<CommunityKey, Bilingual> = {
  data: { en: "Turn information into insight.", ar: "حوّل المعلومات إلى رؤى." },
  architecture: {
    en: "Design smarter, more responsive cities.",
    ar: "صمّم مدناً أذكى وأكثر استجابة.",
  },
  medical: {
    en: "Apply AI where care matters.",
    ar: "طبّق الذكاء الاصطناعي حيث تكون الرعاية مهمة.",
  },
  research: {
    en: "Move ideas from questions to evidence.",
    ar: "انقل الأفكار من الأسئلة إلى الأدلة.",
  },
  software: { en: "Build useful digital systems.", ar: "ابنِ أنظمة رقمية مفيدة." },
  economy: { en: "Turn innovation into opportunity.", ar: "حوّل الابتكار إلى فرص." },
  trainers: { en: "Equip the people who teach others.", ar: "تجهيز من يعلّمون غيرهم." },
  media: { en: "Make knowledge clear and accessible.", ar: "جعل المعرفة واضحة ومتاحة." },
};
