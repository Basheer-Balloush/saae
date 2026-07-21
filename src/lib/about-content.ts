export type AboutContent = {
  hero: {
    title: string;
    p1: string;
    p2: string;
    backHome: string;
  };
  vision: { eyebrow: string; body: string };
  mission: { eyebrow: string; body: string };
  goals: { heading: string; intro: string; items: string[] };
  fields: { heading: string; intro: string; items: string[] };
  values: { heading: string; intro: string; items: string[] };
  members: {
    boardTitle: string;
    boardSubtitle: string;
    executiveTitle: string;
    executiveSubtitle: string;
  };
};

const ar: AboutContent = {
  hero: {
    title: "من نحن",
    p1: "الجمعية السورية للذكاء الصنعي وريادة الأعمال هي منظمة شبابية ومجتمعية تُعنى بنشر ثقافة الذكاء الصنعي وريادة الأعمال في المجتمع السوري، وتمكين الشباب والطلاب ورواد الأعمال من اكتساب المهارات التقنية والريادية التي تساعدهم على الابتكار وصناعة المستقبل.",
    p2: "نسعى إلى بناء بيئة معرفية تجمع بين التكنولوجيا الحديثة وروح المبادرة، من خلال التدريب، وورشات العمل، والفعاليات العلمية، والمشاريع التطبيقية التي تساهم في تطوير القدرات الفردية ودعم الأفكار الريادية.",
    backHome: "العودة إلى الرئيسية",
  },
  vision: {
    eyebrow: "رؤيتنا",
    body: "أن نكون منصة رائدة في تمكين الشباب السوري في مجالات الذكاء الصنعي والتقنيات الحديثة وريادة الأعمال، والمساهمة في بناء مجتمع معرفي قادر على المنافسة والابتكار.",
  },
  mission: {
    eyebrow: "رسالتنا",
    body: "توفير فرص تعليمية وتدريبية نوعية تساعد الأفراد على تطوير مهاراتهم التقنية والريادية، وربط المعرفة الأكاديمية بالتطبيق العملي، بما يخلق أثراً إيجابياً ومستداماً في المجتمع.",
  },
  goals: {
    heading: "أهدافنا",
    intro:
      "نعمل على ترجمة رؤيتنا إلى خطوات ملموسة تُحدث فرقاً حقيقياً في حياة الشباب السوري ومستقبل التكنولوجيا في بلدنا.",
    items: [
      "نشر الوعي بأهمية الذكاء الصنعي والتحول الرقمي.",
      "دعم وتمكين رواد الأعمال وأصحاب المشاريع الناشئة.",
      "تنظيم الدورات التدريبية والورشات التقنية والريادية.",
      "بناء مجتمع تعاوني يجمع المهتمين بالتكنولوجيا والابتكار.",
      "تشجيع البحث والتطوير والمبادرات الشبابية.",
    ],
  },
  fields: {
    heading: "مجالات عملنا",
    intro: "خمسة محاور أساسية نتحرك فيها لبناء جيل قادر على المنافسة والابتكار.",
    items: [
      "الذكاء الصنعي وتعلم الآلة",
      "البرمجة والتقنيات الحديثة",
      "ريادة الأعمال وإدارة المشاريع",
      "التحول الرقمي والابتكار",
      "التدريب والتطوير المهني",
    ],
  },
  values: {
    heading: "قيمنا",
    intro: "خمس قيم جوهرية تقود كل ما نفعله، من الفصل التدريبي إلى مشاريع الشراكة الكبرى.",
    items: [
      "الابتكار والإبداع",
      "العمل الجماعي",
      "مشاركة المعرفة",
      "التطوير المستمر",
      "المسؤولية المجتمعية",
    ],
  },
  members: {
    boardTitle: "مجلس الإدارة",
    boardSubtitle: "القيادة الاستراتيجية التي ترسم رؤية الجمعية واتجاهها.",
    executiveTitle: "الفريق التنفيذي",
    executiveSubtitle: "الفريق الذي يقود العمل اليومي ويُترجم الرؤية إلى أثر ملموس.",
  },
};

const en: AboutContent = {
  hero: {
    title: "About SAAE",
    p1: "The Syrian Association for Artificial Intelligence and Entrepreneurship is a youth-led, community-driven organization dedicated to spreading the culture of AI and entrepreneurship across Syria, and to equipping students, young professionals, and founders with the technical and entrepreneurial skills they need to innovate and shape the future.",
    p2: "We are building a knowledge ecosystem that pairs modern technology with the spirit of initiative — through training, workshops, scientific events, and applied projects that grow individual capabilities and support entrepreneurial ideas.",
    backHome: "Back to Home",
  },
  vision: {
    eyebrow: "Our Vision",
    body: "To be a leading platform that empowers Syrian youth in artificial intelligence, modern technologies, and entrepreneurship, and to help build a knowledge-based society that can compete and innovate.",
  },
  mission: {
    eyebrow: "Our Mission",
    body: "To provide high-quality learning and training opportunities that help people grow their technical and entrepreneurial skills, and to connect academic knowledge with real-world practice — creating lasting, positive impact in the community.",
  },
  goals: {
    heading: "Our Goals",
    intro:
      "We translate our vision into concrete steps that make a real difference in the lives of Syrian youth and in the future of technology in our country.",
    items: [
      "Raise awareness of the importance of artificial intelligence and digital transformation.",
      "Support and empower entrepreneurs and early-stage founders.",
      "Organize training courses and technical and entrepreneurial workshops.",
      "Build a collaborative community for people passionate about technology and innovation.",
      "Encourage research, development, and youth-led initiatives.",
    ],
  },
  fields: {
    heading: "Our Focus Areas",
    intro: "Five core areas we work across to build a generation ready to compete and innovate.",
    items: [
      "Artificial Intelligence & Machine Learning",
      "Programming & Modern Technologies",
      "Entrepreneurship & Project Management",
      "Digital Transformation & Innovation",
      "Training & Professional Development",
    ],
  },
  values: {
    heading: "Our Values",
    intro: "Five core values that guide everything we do — from the training room to major partnerships.",
    items: [
      "Innovation & Creativity",
      "Teamwork",
      "Knowledge Sharing",
      "Continuous Improvement",
      "Social Responsibility",
    ],
  },
  members: {
    boardTitle: "Board of Directors",
    boardSubtitle: "The strategic leadership shaping the association's vision and direction.",
    executiveTitle: "Executive Team",
    executiveSubtitle: "The team driving daily operations and turning vision into measurable impact.",
  },
};

export const aboutContent = { ar, en } as const;
