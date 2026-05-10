export type Lang = "en" | "ar";

type Dict = {
  nav: { home: string; news: string; communities: string; achievements: string; partners: string; about: string; contact: string; cta: string; langToggle: string };
  news: {
    eyebrow: string; title: string; subtitle: string; readMore: string; viewAll: string;
    categories: { workshop: string; partnership: string; research: string; education: string; community: string; event: string };
    items: {
      featured: { title: string; excerpt: string; date: string };
      a: { title: string; date: string }; b: { title: string; date: string }; c: { title: string; date: string };
      d: { title: string; date: string }; e: { title: string; date: string }; f: { title: string; date: string }; g: { title: string; date: string };
    };
  };
  communities: {
    eyebrow: string; title: string; subtitle: string; cta: string;
    cards: Record<"women" | "health" | "education" | "research" | "entrepreneurship" | "robotics", { title: string; desc: string }>;
  };
  achievements: { eyebrow: string; title: string; body: string; stats: { value: string; label: string }[] };
  partners: { eyebrow: string; title: string };
  footer: {
    mission: string; quickLinks: string; contact: string;
    form: { name: string; email: string; message: string; send: string; sent: string };
    hq: string; address: string; visit: string; rights: string; madeIn: string;
  };
};

export const translations: Record<Lang, Dict> = {
  en: {
    nav: {
      home: "Home",
      news: "News",
      communities: "Communities",
      achievements: "Achievements",
      partners: "Partners",
      about: "About",
      contact: "Contact",
      cta: "Join the Movement",
      langToggle: "العربية",
    },
    news: {
      eyebrow: "Newsroom",
      title: "Featured news & recent activities",
      subtitle:
        "Stories, research, and milestones from across the Syrian Association for AI & Entrepreneurship.",
      readMore: "Read story",
      viewAll: "View all news & activities",
      categories: {
        workshop: "Workshop",
        partnership: "Partnership",
        research: "Research",
        education: "Education",
        community: "Community",
        event: "Event",
      },
      items: {
        featured: {
          title: "Damascus University launches the first national AI curriculum",
          excerpt:
            "A landmark partnership brings hands-on AI and entrepreneurship modules into engineering and science programs nationwide.",
          date: "May 6, 2026",
        },
        a: {
          title: "Women in AI cohort graduates 240 engineers across four cities",
          date: "Apr 28, 2026",
        },
        b: {
          title: "SAAE joins UNESCO global education innovation alliance",
          date: "Apr 14, 2026",
        },
        c: {
          title: "HealthTech challenge: 12 student teams pitch real solutions",
          date: "Apr 02, 2026",
        },
        d: {
          title: "Open-source Arabic NLP toolkit reaches 10k downloads",
          date: "Mar 22, 2026",
        },
        e: {
          title: "Mentorship program pairs 300 founders with industry leaders",
          date: "Mar 11, 2026",
        },
        f: {
          title: "Aleppo robotics lab opens its doors to high-school students",
          date: "Feb 28, 2026",
        },
        g: {
          title: "Annual research symposium gathers 40 institutions in Damascus",
          date: "Feb 09, 2026",
        },
      },
    },
    communities: {
      eyebrow: "Communities",
      title: "Communities building Syria's digital future",
      subtitle:
        "Collaborative ecosystems connecting students, developers, researchers, educators, and entrepreneurs across the country.",
      cta: "Discover communities",
      cards: {
        women: {
          title: "Women in AI",
          desc: "Mentorship, scholarships, and research circles championing women in artificial intelligence.",
        },
        health: {
          title: "HealthTech",
          desc: "Bringing clinicians and engineers together to design healthcare for everyone.",
        },
        education: {
          title: "Digital Education",
          desc: "Modernizing classrooms with open curricula, training, and accessible tools.",
        },
        research: {
          title: "AI Research",
          desc: "An open research network advancing Arabic-language and applied AI work.",
        },
        entrepreneurship: {
          title: "Entrepreneurship",
          desc: "Founder programs, mentorship, and pathways from idea to early traction.",
        },
        robotics: {
          title: "Robotics",
          desc: "Labs and competitions that introduce students to building, not just using, technology.",
        },
      },
    },
    achievements: {
      eyebrow: "Our impact",
      title: "Building Syria's AI future, line by line.",
      body: "Through education, open research, and entrepreneurship, we are rebuilding technological capacity across Syria — empowering a generation of students, researchers, and founders with the tools, mentorship, and confidence to shape what comes next.",
      stats: [
        { value: "5,000+", label: "Learners" },
        { value: "120+", label: "Courses" },
        { value: "30+", label: "Strategic partners" },
        { value: "15+", label: "Communities" },
        { value: "50+", label: "Workshops" },
      ],
    },
    partners: {
      eyebrow: "Partners",
      title: "Trusted by institutions driving innovation",
    },
    footer: {
      mission:
        "The first official organization in Syria dedicated to artificial intelligence, innovation, and entrepreneurial thinking — empowering Syrian talent to rebuild and uplift our country.",
      quickLinks: "Quick links",
      contact: "Get in touch",
      form: { name: "Your name", email: "Email", message: "Message", send: "Send message", sent: "Message sent — thank you." },
      hq: "Damascus headquarters",
      address: "Damascus — near the Ministry of Higher Education & Scientific Research",
      visit: "Visit us",
      rights: "All rights reserved.",
      madeIn: "Made in Damascus",
    },
  },
  ar: {
    nav: {
      home: "الرئيسية",
      news: "الأخبار",
      communities: "المجتمعات",
      achievements: "الإنجازات",
      partners: "الشركاء",
      about: "عن الجمعية",
      contact: "تواصل معنا",
      cta: "انضم إلى الحركة",
      langToggle: "English",
    },
    news: {
      eyebrow: "غرفة الأخبار",
      title: "الأخبار البارزة والنشاطات الأخيرة",
      subtitle:
        "قصص وأبحاث ومحطات مهمة من الجمعية السورية للذكاء الاصطناعي وريادة الأعمال.",
      readMore: "اقرأ القصة",
      viewAll: "عرض جميع الأخبار والنشاطات",
      categories: {
        workshop: "ورشة عمل",
        partnership: "شراكة",
        research: "بحث",
        education: "تعليم",
        community: "مجتمع",
        event: "فعالية",
      },
      items: {
        featured: {
          title: "جامعة دمشق تطلق أول منهاج وطني للذكاء الاصطناعي",
          excerpt:
            "شراكة مفصلية تُدخل وحدات تعليمية تطبيقية في الذكاء الاصطناعي وريادة الأعمال ضمن برامج الهندسة والعلوم في عموم البلاد.",
          date: "6 أيار 2026",
        },
        a: {
          title: "تخريج 240 مهندسة ضمن مسار «المرأة في الذكاء الاصطناعي» في أربع مدن",
          date: "28 نيسان 2026",
        },
        b: {
          title: "الجمعية تنضم إلى تحالف اليونسكو العالمي لابتكار التعليم",
          date: "14 نيسان 2026",
        },
        c: {
          title: "تحدي التكنولوجيا الصحية: 12 فريقاً طلابياً يقدم حلولاً واقعية",
          date: "2 نيسان 2026",
        },
        d: {
          title: "مجموعة أدوات معالجة اللغة العربية مفتوحة المصدر تتجاوز 10 آلاف تنزيل",
          date: "22 آذار 2026",
        },
        e: {
          title: "برنامج إرشاد يربط 300 رائد أعمال بقادة الصناعة",
          date: "11 آذار 2026",
        },
        f: {
          title: "مختبر الروبوتات في حلب يفتح أبوابه لطلاب الثانوية",
          date: "28 شباط 2026",
        },
        g: {
          title: "ندوة بحثية سنوية تجمع 40 مؤسسة في دمشق",
          date: "9 شباط 2026",
        },
      },
    },
    communities: {
      eyebrow: "المجتمعات",
      title: "مجتمعات تبني مستقبل سورية الرقمي",
      subtitle:
        "أنظمة تعاونية تربط الطلاب والمطورين والباحثين والمعلمين ورواد الأعمال في كل أنحاء البلاد.",
      cta: "استكشف المجتمعات",
      cards: {
        women: {
          title: "المرأة في الذكاء الاصطناعي",
          desc: "إرشاد ومنح وحلقات بحثية تدعم حضور المرأة في مجال الذكاء الاصطناعي.",
        },
        health: {
          title: "التكنولوجيا الصحية",
          desc: "تجمع بين الأطباء والمهندسين لتصميم رعاية صحية في متناول الجميع.",
        },
        education: {
          title: "التعليم الرقمي",
          desc: "تحديث الصفوف الدراسية بمناهج مفتوحة وتدريب وأدوات ميسّرة.",
        },
        research: {
          title: "أبحاث الذكاء الاصطناعي",
          desc: "شبكة بحثية مفتوحة تطوّر العمل في معالجة اللغة العربية والذكاء التطبيقي.",
        },
        entrepreneurship: {
          title: "ريادة الأعمال",
          desc: "برامج للمؤسسين وإرشاد ومسارات تنقل الفكرة إلى أول نقطة نجاح.",
        },
        robotics: {
          title: "الروبوتات",
          desc: "مختبرات ومسابقات تُعرّف الطلاب على بناء التكنولوجيا لا مجرد استخدامها.",
        },
      },
    },
    achievements: {
      eyebrow: "أثرنا",
      title: "نبني مستقبل سورية في الذكاء الاصطناعي سطراً بسطر.",
      body: "من خلال التعليم والبحث المفتوح وريادة الأعمال، نعيد بناء القدرة التكنولوجية في سورية، ونمكّن جيلاً من الطلاب والباحثين والمؤسسين بالأدوات والإرشاد والثقة لصياغة ما هو قادم.",
      stats: [
        { value: "+5,000", label: "متعلّم" },
        { value: "+120", label: "دورة" },
        { value: "+30", label: "شريك استراتيجي" },
        { value: "+15", label: "مجتمع" },
        { value: "+50", label: "ورشة عمل" },
      ],
    },
    partners: {
      eyebrow: "الشركاء",
      title: "مؤسسات تقود الابتكار تثق بنا",
    },
    footer: {
      mission:
        "أول منظمة رسمية في سورية مكرّسة للذكاء الاصطناعي والابتكار والتفكير الريادي — تمكّن المواهب السورية لإعادة بناء بلدنا والارتقاء به.",
      quickLinks: "روابط سريعة",
      contact: "تواصل معنا",
      form: { name: "الاسم", email: "البريد الإلكتروني", message: "رسالتك", send: "إرسال الرسالة", sent: "تم إرسال رسالتك، شكراً لك." },
      hq: "المقر الرئيسي - دمشق",
      address: "دمشق - بجانب وزارة التعليم العالي والبحث العلمي",
      visit: "زورونا",
      rights: "جميع الحقوق محفوظة.",
      madeIn: "صُنع في دمشق",
    },
  },
} as const;

export type Translations = typeof translations.en;
