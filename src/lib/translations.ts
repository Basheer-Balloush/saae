export type Lang = "en" | "ar";

type Dict = {
  nav: {
    home: string;
    news: string;
    communities: string;
    achievements: string;
    partners: string;
    about: string;
    contact: string;
    cta: string;
    langToggle: string;
  };
  news: {
    eyebrow: string;
    title: string;
    subtitle: string;
    readMore: string;
    viewAll: string;
    categories: {
      workshop: string;
      partnership: string;
      research: string;
      education: string;
      community: string;
      event: string;
    };
    items: {
      featured: { title: string; excerpt: string; date: string };
      a: { title: string; date: string };
      b: { title: string; date: string };
      c: { title: string; date: string };
      d: { title: string; date: string };
      e: { title: string; date: string };
      f: { title: string; date: string };
      g: { title: string; date: string };
    };
  };
  communities: {
    eyebrow: string;
    title: string;
    subtitle: string;
    cta: string;
    discover: string;
    cards: Record<
      | "data"
      | "architecture"
      | "medical"
      | "research"
      | "software"
      | "economy"
      | "trainers"
      | "media"
      | "quality",
      { title: string; desc: string }
    >;
  };
  achievements: {
    eyebrow: string;
    title: string;
    body: string;
    stats: { value: string; label: string }[];
  };
  partners: { eyebrow: string; title: string };
  assistant: {
    eyebrow: string;
    title: string;
    subtitle: string;
    cta: string;
    soon: string;
    features: {
      inquiries: { title: string; desc: string };
      lead: { title: string; desc: string };
      suggestions: { title: string; desc: string };
    };
    chat: { name: string; status: string; user: string; bot: string; typing: string };
    greeting: string;
  };
  footer: {
    mission: string;
    quickLinks: string;
    contact: string;
    form: { name: string; email: string; message: string; send: string; sent: string };
    hq: string;
    address: string;
    visit: string;
    rights: string;
    madeIn: string;
  };
  /** New chrome for the v2 design layer (radial nav, journey ribbon, footer). */
  v2: {
    skipToContent: string;
    nav: { ariaLabel: string; open: string; close: string };
    partners: {
      eyebrow: string;
      title: string;
      intro: string;
      note: string;
      empty: string;
    };
    ribbon: {
      ariaLabel: string;
      sectionsLabel: string;
      pagesLabel: string;
      explore: string;
      opening: string;
    };
    footer: {
      ctaEyebrow: string;
      ctaLine: string;
      ctaButton: string;
      claim: string;
      socialLabel: string;
      exploreTitle: string;
      officialTitle: string;
      links: {
        home: string;
        about: string;
        news: string;
        partners: string;
        initiative: string;
        contact: string;
        communities: string;
        achievements: string;
        learning: string;
        aiTools: string;
        million: string;
        registration: string;
      };
      mapAria: string;
      mapAlt: string;
      address: string;
      visit: string;
      osmContributors: string;
      orgName: string;
      rights: string;
    };
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
      readMore: "Read full article",
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
      discover: "Discover community",
      cards: {
        data: {
          title: "Data Community",
          desc: "A community dedicated to data and its role in shaping decisions and building knowledge.",
        },
        architecture: {
          title: "Smart Urban Community",
          desc: "A community concerned with urban planning and development in the modern era.",
        },
        medical: {
          title: "Healthcare Community",
          desc: "A community working on the development of the healthcare sector.",
        },
        research: {
          title: "Smart Research Community",
          desc: "A community supporting scientific research and connecting researchers.",
        },
        software: {
          title: "Software Community",
          desc: "A community bringing together developers and engineers around software craftsmanship.",
        },
        economy: {
          title: "Smart Economy Community",
          desc: "A community interested in the economy and its tools in a changing world.",
        },
        trainers: {
          title: "Trainers Community",
          desc: "A community bringing trainers together to develop training practices.",
        },
        media: {
          title: "Media Community",
          desc: "A community of journalists and content creators covering AI and SAAE's stories.",
        },
        quality: {
          title: "Quality Entrepreneurship Community",
          desc: "A community dedicated to quality standards and entrepreneurial excellence in building sustainable ventures.",
        },
      },
    },
    achievements: {
      eyebrow: "Our impact",
      title: "Building Syria's future, line by line.",
      body: "Through education, open research, and entrepreneurship, we are rebuilding technological capacity across Syria — empowering a generation of students, researchers, and founders with the tools, mentorship, and confidence to shape what comes next.",
      stats: [
        { value: "5,000+", label: "Learners" },
        { value: "120+", label: "Training courses" },
        { value: "30+", label: "Strategic partners" },
        { value: "7+", label: "Beneficiary students" },
      ],
    },
    partners: {
      eyebrow: "Partners",
      title: "Trusted by institutions driving innovation",
    },
    assistant: {
      eyebrow: "Abu Al-Joud — SAAE Assistant",
      title: "Meet Abu Al-Joud, your AI guide to the association",
      subtitle:
        "An intelligent assistant that answers your questions, captures your details, and recommends the right path — whether you are an individual learner or a company looking to partner.",
      cta: "Chat with Abu Al-Joud",
      soon: "Launching soon",
      features: {
        inquiries: {
          title: "Answers your questions",
          desc: "Programs, communities, events, partnerships, training — instant, accurate responses around the clock.",
        },
        lead: {
          title: "Connects you with us",
          desc: "Captures your contact details and interests, then routes the right team to follow up personally.",
        },
        suggestions: {
          title: "Tailored recommendations",
          desc: "Suggests communities, courses, or partnership tracks based on your profile and goals.",
        },
      },
      chat: {
        name: "Abu Al-Joud",
        status: "Online — ready to help",
        user: "How can my company partner with the association?",
        bot: "Great question! I can connect you with our partnerships team. Could I get your company name and email?",
        typing: "Abu Al-Joud is typing…",
      },
      greeting: "Need help? Chat with Abu Al-Joud 👋",
    },
    footer: {
      mission:
        "The first official organization in Syria dedicated to artificial intelligence, innovation, and entrepreneurial thinking — empowering Syrian talent to rebuild and uplift our country.",
      quickLinks: "Quick links",
      contact: "Get in touch",
      form: {
        name: "Your name",
        email: "Email",
        message: "Message",
        send: "Send message",
        sent: "Message sent — thank you.",
      },
      hq: "Damascus headquarters",
      address: "Damascus — near the Ministry of Higher Education & Scientific Research",
      visit: "Visit us",
      rights: "All rights reserved.",
      madeIn: "Made in Damascus",
    },
    v2: {
      skipToContent: "Skip to main content",
      nav: { ariaLabel: "Main navigation", open: "Open navigation", close: "Close navigation" },
      ribbon: {
        ariaLabel: "Journey navigation",
        sectionsLabel: "Page sections",
        pagesLabel: "Site pages",
        explore: "Explore",
        opening: "Opening",
      },
      footer: {
        ctaEyebrow: "The next step starts here",
        ctaLine: "Help shape what Syria can do with AI.",
        ctaButton: "Explore the initiative",
        claim:
          "Syria's first official AI organisation — empowering Syrian talent to rebuild and uplift our country.",
        socialLabel: "SAAE on social platforms",
        exploreTitle: "Explore",
        officialTitle: "Official site",
        links: {
          home: "Home",
          about: "About SAAE",
          news: "News",
          partners: "Partners",
          initiative: "Initiative",
          contact: "Contact",
          communities: "Communities",
          achievements: "Achievements",
          learning: "Learning platform",
          aiTools: "AI tools",
          million: "The million-user initiative",
          registration: "Registration",
        },
        mapAria: "Open SAAE location in Maps",
        mapAlt: "Map showing the SAAE headquarters in Damascus",
        address: "Damascus, beside the Ministry of Higher Education and Scientific Research",
        visit: "Visit us",
        osmContributors: "contributors",
        orgName: "Syrian Association for AI & Entrepreneurship",
        rights: "All rights reserved.",
      },
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
      subtitle: "قصص وأبحاث ومحطات مهمة من الجمعية السورية للذكاء الاصطناعي وريادة الأعمال.",
      readMore: "اقرأ المقال كاملاً",
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
      discover: "اكتشف المجتمع",
      cards: {
        data: {
          title: "مجتمع البيانات",
          desc: "مجتمعٌ مهتمٌّ بالبيانات ودورها في صياغة القرار وبناء المعرفة.",
        },
        architecture: {
          title: "المجتمع العمراني الذكي",
          desc: "مجتمعٌ يُعنى بالتخطيط والتطوير العمراني في العصر الحديث.",
        },
        medical: {
          title: "مجتمع الرعاية الصحية",
          desc: "مجتمعٌ يعمل على تطوير قطاع الرعاية الصحية.",
        },
        research: {
          title: "المجتمع البحثي الذكي",
          desc: "مجتمعٌ يدعم البحث العلمي ويربط الباحثين.",
        },
        software: {
          title: "مجتمع البرمجيات",
          desc: "مجتمعٌ يجمع المطوّرين والمهندسين حول صناعة البرمجيات.",
        },
        economy: {
          title: "مجتمع الاقتصاد الذكي",
          desc: "مجتمعٌ يهتمّ بالاقتصاد وأدواته في عالمٍ متغيّر.",
        },
        trainers: {
          title: "مجتمع المدربين",
          desc: "مجتمعٌ يجمع المدرّبين لتطوير الممارسات التدريبية.",
        },
        media: {
          title: "المجتمع الإعلامي",
          desc: "مجتمعٌ يجمع الصحفيين وصنّاع المحتوى لتغطية الذكاء الاصطناعي وقصص الجمعية.",
        },
        quality: {
          title: "مجتمع الجودة الريادي",
          desc: "مجتمعٌ مهتمٌّ بمعايير الجودة والتميز الريادي في بناء مشاريع مستدامة.",
        },
      },
    },
    achievements: {
      eyebrow: "أثرنا",
      title: "نبني مستقبل سورية سطراً بسطر.",
      body: "من خلال التعليم والبحث المفتوح وريادة الأعمال، نعيد بناء القدرة التكنولوجية في سورية، ونمكّن جيلاً من الطلاب والباحثين والمؤسسين بالأدوات والإرشاد والثقة لصياغة ما هو قادم.",
      stats: [
        { value: "+5,000", label: "متدرب" },
        { value: "+120", label: "دورة تدريبية" },
        { value: "+30", label: "شريك استراتيجي" },
        { value: "+7", label: "مجتمع" },
      ],
    },
    partners: {
      eyebrow: "الشركاء",
      title: "مؤسسات تقود الابتكار تثق بنا",
    },
    assistant: {
      eyebrow: "أبو الجود — مساعد الجمعية الذكي",
      title: "تعرّف على أبو الجود، دليلك الذكي للجمعية",
      subtitle:
        "مساعد ذكي يجيب عن استفساراتك، ويأخذ بياناتك للتواصل معك، ويقدّم لك اقتراحات مناسبة — سواء كنت فرداً يبحث عن التعلّم أو شركة تبحث عن شراكة.",
      cta: "تحدث مع أبو الجود",
      soon: "قريباً",
      features: {
        inquiries: {
          title: "يجيب عن استفساراتك",
          desc: "البرامج، المجتمعات، الفعاليات، الشراكات، التدريب — إجابات فورية ودقيقة على مدار الساعة.",
        },
        lead: {
          title: "يوصلك بالجمعية",
          desc: "يأخذ بيانات تواصلك واهتماماتك ويحوّلك إلى الفريق المختص لمتابعتك شخصياً.",
        },
        suggestions: {
          title: "اقتراحات مخصصة لك",
          desc: "يقترح المجتمعات أو الدورات أو مسارات الشراكة المناسبة حسب ملفك وأهدافك.",
        },
      },
      chat: {
        name: "أبو الجود",
        status: "متصل — جاهز لمساعدتك",
        user: "كيف يمكن لشركتي أن تصبح شريكاً للجمعية؟",
        bot: "سؤال ممتاز! يسعدني توصيلك بفريق الشراكات. هل يمكنني أخذ اسم شركتك وبريدك الإلكتروني؟",
        typing: "أبو الجود يكتب…",
      },
      greeting: "بحاجة لمساعدة؟ تحدّث مع أبو الجود 👋",
    },
    footer: {
      mission:
        "أول منظمة رسمية في سورية مكرّسة للذكاء الاصطناعي والابتكار والتفكير الريادي — تمكّن المواهب السورية لإعادة بناء بلدنا والارتقاء به.",
      quickLinks: "روابط سريعة",
      contact: "تواصل معنا",
      form: {
        name: "الاسم",
        email: "البريد الإلكتروني",
        message: "رسالتك",
        send: "إرسال الرسالة",
        sent: "تم إرسال رسالتك، شكراً لك.",
      },
      hq: "المقر الرئيسي - دمشق",
      address: "دمشق - بجانب وزارة التعليم العالي والبحث العلمي",
      visit: "زورونا",
      rights: "جميع الحقوق محفوظة.",
      madeIn: "صُنع في دمشق",
    },
    v2: {
      skipToContent: "انتقل إلى المحتوى الرئيسي",
      nav: { ariaLabel: "التنقل الرئيسي", open: "فتح القائمة", close: "إغلاق القائمة" },
      ribbon: {
        ariaLabel: "التنقل بين أقسام الصفحة",
        sectionsLabel: "أقسام الصفحة",
        pagesLabel: "صفحات الموقع",
        explore: "استكشف",
        opening: "البداية",
      },
      footer: {
        ctaEyebrow: "الخطوة التالية تبدأ من هنا",
        ctaLine: "ساهم في صياغة ما يمكن لسورية تحقيقه بالذكاء الاصطناعي.",
        ctaButton: "استكشف المبادرة",
        claim:
          "أول منظمة رسمية في سورية للذكاء الاصطناعي — تمكّن المواهب السورية لإعادة بناء بلدنا والارتقاء به.",
        socialLabel: "الجمعية على منصات التواصل",
        exploreTitle: "استكشف",
        officialTitle: "الموقع الرسمي",
        links: {
          home: "الرئيسية",
          about: "عن الجمعية",
          news: "الأخبار",
          partners: "الشركاء",
          initiative: "المبادرة",
          contact: "تواصل معنا",
          communities: "المجتمعات",
          achievements: "الإنجازات",
          learning: "منصة التعلّم",
          aiTools: "أدوات الذكاء الاصطناعي",
          million: "مبادرة المليون مستخدم",
          registration: "التسجيل",
        },
        mapAria: "افتح موقع الجمعية على الخرائط",
        mapAlt: "خريطة تُظهر مقر الجمعية في دمشق",
        address: "دمشق، بجانب وزارة التعليم العالي والبحث العلمي",
        visit: "زورونا",
        osmContributors: "المساهمون",
        orgName: "الجمعية السورية للذكاء الاصطناعي وريادة الأعمال",
        rights: "جميع الحقوق محفوظة.",
      },
    },
  },
};

export type Translations = Dict;
