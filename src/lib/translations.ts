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
    news: {
      eyebrow: string;
      title: string;
      intro: string;
      readStory: string;
      related: string;
      videos: string;
      empty: string;
      noContent: string;
      notFound: string;
      back: string;
    };
    about: {
      eyebrow: string;
      lede: string;
      scrollCue: string;
      markHint: string;
      chapters: {
        story: string;
        direction: string;
        goals: string;
        fields: string;
        values: string;
        communities: string;
        team: string;
        future: string;
      };
      storyTitle: string;
      directionTitle: string;
      goalsTitle: string;
      goalsHint: string;
      fieldsTitle: string;
      fieldsSub: string;
      valuesTitle: string;
      valuesNote: string;
      communitiesEyebrow: string;
      communitiesTitle: string;
      communitiesIntro: string;
      teamEyebrow: string;
      futureTitle: string;
      futureCta: string;
    };
    initiative: {
      heroEyebrow: string;
      oneMillion: string;
      heroTitleRest: string;
      heroLede: string;
      payOneStart: string;
      joinWaitlist: string;
      progressEyebrow: string;
      progressTitle: string;
      progressCopy: string;
      seatsMotion: string;
      trained: string;
      waitlist: string;
      sponsoredSeats: string;
      goalRemaining: string;
      shareOfDial: string;
      shareOfGoal: string;
      goalLabel: string;
      blueprintEyebrow: string;
      blueprintTitle: string;
      blueprintIntro: string;
      about: string;
      aboutShort: string;
      mission: string;
      missionShort: string;
      values: string;
      valuesShort: string;
      loading: string;
      sponsorsEyebrow: string;
      sponsorsTitle: string;
      seatsCovered: string;
      companies: string;
      individuals: string;
      rank: string;
      sponsor: string;
      seatsOpened: string;
      amount: string;
      viewAllSponsors: string;
      emptyCompanies: string;
      emptyIndividuals: string;
      participateEyebrow: string;
      participateTitle: string;
      payStart: string;
      payStartCopy: string;
      startNow: string;
      joinWaitlistCopy: string;
      reservePlace: string;
      sponsorSeats: string;
      sponsorSeatsCopy: string;
      openSeats: string;
      closingEyebrow: string;
      beginsOne: string;
      closingCopy: string;
      joinInitiative: string;
    };
    contact: {
      pill: string;
      eyebrow: string;
      titleA: string;
      titleB: string;
      intro: string;
      writeCta: string;
      callCta: string;
      city: string;
      signalKicker: string;
      signalTitle: string;
      signalBody: string;
      linesEyebrow: string;
      linesTitle: string;
      email: string;
      phone: string;
      visit: string;
      responseTime: string;
      responseValue: string;
      formTitle: string;
      formIntro: string;
      fullName: string;
      emailField: string;
      phoneField: string;
      organization: string;
      inquiryType: string;
      subject: string;
      messageField: string;
      send: string;
      sending: string;
      hqTitle: string;
      hqBody: string;
      openMaps: string;
      assistantTitle: string;
      assistantBody: string;
      assistantCta: string;
      followTitle: string;
      sentTitle: string;
      sentBody: string;
      sendAnother: string;
      backHome: string;
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
      partners: {
        eyebrow: "Shared work",
        title: "The partner register.",
        intro:
          "The organisations SAAE lists publicly as partners: universities, ministries, companies and community bodies working with the association on training and applied projects.",
        note: "Marks and names are published by SAAE and fitted to a common size. Nothing here has been redrawn.",
        empty: "Partners will be listed here.",
      },
      news: {
        eyebrow: "Latest news",
        title: "The work, as it happens.",
        intro:
          "Training rooms, national broadcasts and public launches — the running record of what SAAE is building, newest first.",
        readStory: "Read the story",
        related: "Related news",
        videos: "Videos",
        empty: "News will be published here.",
        noContent: "No content available yet.",
        notFound: "Article not found",
        back: "Back to news",
      },
      about: {
        eyebrow: "About the association",
        lede: "SAAE is a youth-led community turning artificial intelligence and entrepreneurship into practical capability for people across Syria.",
        scrollCue: "Follow the story",
        markHint: "Move your cursor — grow a branch",
        chapters: {
          story: "Who we are",
          direction: "Our direction",
          goals: "Our goals",
          fields: "Fields of work",
          values: "Our values",
          communities: "Communities",
          team: "The team",
          future: "The next growth",
        },
        storyTitle: "A community built around possibility.",
        directionTitle: "One root. Two branches.",
        goalsTitle: "Five ways the work takes root.",
        goalsHint: "Choose a seed to see the action behind it.",
        fieldsTitle: "A living system of skills.",
        fieldsSub: "Each field is a branch. Together, they form the capability to build.",
        valuesTitle: "The canopy above everything we do.",
        valuesNote:
          "From a training room to a national partnership, these values guide every choice.",
        communitiesEyebrow: "SAAE communities",
        communitiesTitle: "Nine fields, one shared method.",
        communitiesIntro:
          "Each community brings its own questions and its own practitioners. Shared methods let the answers travel between them.",
        teamEyebrow: "Who leads the work",
        futureTitle: "Syrian talent can rebuild, elevate and imagine what comes next.",
        futureCta: "Grow with SAAE",
      },
      initiative: {
        heroEyebrow: "A national AI-literacy initiative",
        oneMillion: "One million",
        heroTitleRest: "Syrian AI users.",
        heroLede: "Practical AI skills for careers, classrooms and daily life — open to every Syrian ready to begin.",
        payOneStart: "Pay $1 & start",
        joinWaitlist: "Join the waitlist",
        progressEyebrow: "The dial has started moving",
        progressTitle: "A million begins with the next person.",
        progressCopy: "Choose the path that fits you: start for one dollar, wait for a funded seat, or open the door for someone else.",
        seatsMotion: "seats in motion",
        trained: "Learners started",
        waitlist: "Waitlist",
        sponsoredSeats: "Funded seats waiting",
        goalRemaining: "Goal remaining",
        shareOfDial: "of the dial",
        shareOfGoal: "of the goal",
        goalLabel: "National goal",
        blueprintEyebrow: "Initiative blueprint",
        blueprintTitle: "Built to turn access into agency.",
        blueprintIntro: "This is more than a course. It is a practical path from first contact with AI to confident, responsible use.",
        about: "About",
        aboutShort: "A national starting point",
        mission: "Mission",
        missionShort: "Bridge the digital divide",
        values: "Values",
        valuesShort: "How one million grow together",
        loading: "Loading…",
        sponsorsEyebrow: "Who opens the doors",
        sponsorsTitle: "Every sponsored seat is a start.",
        seatsCovered: "seats funded",
        companies: "Top sponsoring companies",
        individuals: "Top individual sponsors",
        rank: "Rank",
        sponsor: "Sponsor",
        seatsOpened: "Seats opened",
        amount: "Contribution",
        viewAllSponsors: "View all sponsors",
        emptyCompanies: "No sponsoring companies yet — your organisation could be the first.",
        emptyIndividuals: "No individual sponsors yet — you could be the first.",
        participateEyebrow: "Choose how you move the dial",
        participateTitle: "Learn. Wait. Or open a seat.",
        payStart: "Pay & start",
        payStartCopy: "Begin the course immediately for one US dollar.",
        startNow: "Start now",
        joinWaitlistCopy: "Reserve your place and wait for a sponsor to cover it.",
        reservePlace: "Reserve a place",
        sponsorSeats: "Sponsor seats",
        sponsorSeatsCopy: "Turn corporate or personal support into immediate access for waitlisted learners.",
        openSeats: "Open seats",
        closingEyebrow: "The next person can be you",
        beginsOne: "begins with one.",
        closingCopy: "Take one practical step into AI — or make that step possible for someone else.",
        joinInitiative: "Join the initiative",
      },
      contact: {
        pill: "Reply within 48 hours",
        eyebrow: "Contact SAAE",
        titleA: "Start a conversation",
        titleB: "that goes somewhere.",
        intro:
          "Learners, institutions and journalists all reach the same place — a person on the SAAE team who answers. Choose your route and we take it from there.",
        writeCta: "Write to us",
        callCta: "Call the office",
        city: "Damascus, Syria",
        signalKicker: "An open line to SAAE",
        signalTitle: "Your message starts here.",
        signalBody: "Every message reaches a real person on our team.",
        linesEyebrow: "Direct lines",
        linesTitle: "Reach us the way you prefer.",
        email: "Email",
        phone: "Phone",
        visit: "Visit",
        responseTime: "Response time",
        responseValue: "Within 48 hours",
        formTitle: "Tell us what's on your mind",
        formIntro: "Fill in the form and the right person on our team will reply.",
        fullName: "Full name *",
        emailField: "Email address *",
        phoneField: "Phone number",
        organization: "Organisation / company",
        inquiryType: "Type of enquiry *",
        subject: "Subject *",
        messageField: "Your message *",
        send: "Send message",
        sending: "Sending…",
        hqTitle: "Headquarters",
        hqBody: "Damascus — beside the Ministry of Higher Education and Scientific Research",
        openMaps: "Open in Google Maps",
        assistantTitle: "Need an immediate answer?",
        assistantBody: "Chat with Abu Al-Joud — our AI assistant, available around the clock.",
        assistantCta: "Chat with Abu Al-Joud",
        followTitle: "Follow SAAE",
        sentTitle: "Your message reached us.",
        sentBody:
          "Thank you for writing. Our team will review your message and reply within 48 hours by email.",
        sendAnother: "Send another message",
        backHome: "Back to home",
      },
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
      partners: {
        eyebrow: "عمل مشترك",
        title: "سجل الشركاء.",
        intro:
          "الجهات التي تدرجها الجمعية علناً كشركاء: جامعات ووزارات وشركات وهيئات مجتمعية تعمل معها في التدريب والمشاريع التطبيقية.",
        note: "تنشر الجمعية الشعارات والأسماء، وقد ضُبطت على قياس موحّد. لم يُعَد رسم أي منها.",
        empty: "سيتم إدراج الشركاء هنا قريباً.",
      },
      news: {
        eyebrow: "آخر الأخبار",
        title: "العمل كما يحدث.",
        intro: "قاعات تدريب وبث وطني وإطلاقات عامة — سجل متجدد لما تبنيه الجمعية، الأحدث أولاً.",
        readStory: "اقرأ الخبر",
        related: "أخبار ذات صلة",
        videos: "فيديوهات",
        empty: "ستُنشر الأخبار هنا.",
        noContent: "لا يوجد محتوى بعد.",
        notFound: "المقال غير موجود",
        back: "العودة إلى الأخبار",
      },
      about: {
        eyebrow: "عن الجمعية",
        lede: "الجمعية مجتمع شبابي يحوّل الذكاء الصنعي وريادة الأعمال إلى قدرات عملية للناس في مختلف أنحاء سورية.",
        scrollCue: "تابع القصة",
        markHint: "حرّك المؤشر — أنمِ غصناً",
        chapters: {
          story: "من نحن",
          direction: "وجهتنا",
          goals: "أهدافنا",
          fields: "مجالات عملنا",
          values: "قيمنا",
          communities: "المجتمعات",
          team: "الفريق",
          future: "النمو القادم",
        },
        storyTitle: "مجتمع يُبنى حول الإمكانات.",
        directionTitle: "جذر واحد. غصنان.",
        goalsTitle: "خمس طرق يترسّخ بها عملنا.",
        goalsHint: "اختر بذرة لتكتشف العمل الذي ينمو منها.",
        fieldsTitle: "منظومة حيّة من المهارات.",
        fieldsSub: "كل مجال هو غصن. ومعاً تشكّل هذه المجالات القدرة على البناء.",
        valuesTitle: "المظلّة التي تحمي كل ما نفعله.",
        valuesNote: "من قاعة التدريب إلى الشراكة الوطنية، تقود هذه القيم كل اختيار.",
        communitiesEyebrow: "مجتمعات الجمعية",
        communitiesTitle: "تسعة مجالات، ومنهج واحد مشترك.",
        communitiesIntro: "لكل مجتمع أسئلته وممارسوه. والمنهج المشترك يجعل الأجوبة تنتقل بينها.",
        teamEyebrow: "من يقود العمل",
        futureTitle: "المواهب السورية قادرة على إعادة البناء والارتقاء وتخيّل ما يأتي.",
        futureCta: "انمُ مع الجمعية",
      },
      initiative: {
        heroEyebrow: "مبادرة وطنية لمحو الأمية في الذكاء الاصطناعي",
        oneMillion: "مليون",
        heroTitleRest: "مستخدم ذكاء اصطناعي سوري.",
        heroLede: "مهارات عملية في الذكاء الاصطناعي للعمل والتعليم والحياة اليومية — متاحة لكل سوري مستعد للبدء.",
        payOneStart: "ادفع دولاراً وابدأ",
        joinWaitlist: "انضم إلى قائمة الانتظار",
        progressEyebrow: "بدأ المؤشر بالتحرك",
        progressTitle: "المليون يبدأ بالشخص التالي.",
        progressCopy: "اختر المسار المناسب لك: ابدأ بدولار واحد، انتظر مقعداً ممولاً، أو افتح الباب لشخص آخر.",
        seatsMotion: "مقعداً قيد التفعيل",
        trained: "متعلّمون بدؤوا",
        waitlist: "قائمة الانتظار",
        sponsoredSeats: "مقاعد ممولة بانتظار التخصيص",
        goalRemaining: "المتبقي إلى الهدف",
        shareOfDial: "من الدائرة",
        shareOfGoal: "من الهدف",
        goalLabel: "الهدف الوطني",
        blueprintEyebrow: "مخطط المبادرة",
        blueprintTitle: "صُممت لتحوّل الوصول إلى قدرة.",
        blueprintIntro: "هذه أكثر من دورة. إنها مسار عملي من أول لقاء مع الذكاء الاصطناعي إلى استخدامه بثقة ومسؤولية.",
        about: "عن المبادرة",
        aboutShort: "نقطة انطلاق وطنية",
        mission: "رسالتنا",
        missionShort: "ردم الفجوة الرقمية",
        values: "قيمنا",
        valuesShort: "كيف ينمو المليون معاً",
        loading: "جارٍ التحميل…",
        sponsorsEyebrow: "من يفتحون الأبواب",
        sponsorsTitle: "كل مقعد ممول هو بداية.",
        seatsCovered: "مقعداً تمت تغطيته",
        companies: "أبرز الشركات الراعية",
        individuals: "أبرز الأفراد الداعمين",
        rank: "الترتيب",
        sponsor: "الداعم",
        seatsOpened: "المقاعد المفتوحة",
        amount: "المساهمة",
        viewAllSponsors: "شاهد جميع الداعمين",
        emptyCompanies: "لا توجد شركات راعية بعد — يمكن أن تكون شركتك الأولى.",
        emptyIndividuals: "لا يوجد أفراد داعمون بعد — يمكن أن تكون أنت الأول.",
        participateEyebrow: "اختر كيف تحرّك المؤشر",
        participateTitle: "تعلّم. انتظر. أو افتح مقعداً.",
        payStart: "ادفع وابدأ",
        payStartCopy: "ابدأ الدورة فوراً مقابل دولار أمريكي واحد.",
        startNow: "ابدأ الآن",
        joinWaitlistCopy: "احجز مكانك وانتظر داعماً يغطي تكلفته.",
        reservePlace: "احجز مكاناً",
        sponsorSeats: "موّل مقاعد",
        sponsorSeatsCopy: "حوّل الدعم المؤسسي أو الفردي إلى وصول فوري للمتعلمين على قائمة الانتظار.",
        openSeats: "افتح مقاعد",
        closingEyebrow: "قد تكون أنت الشخص التالي",
        beginsOne: "يبدأ بواحد.",
        closingCopy: "اتخذ خطوة عملية نحو الذكاء الاصطناعي — أو اجعل هذه الخطوة ممكنة لشخص آخر.",
        joinInitiative: "انضم إلى المبادرة",
      },
      contact: {
        pill: "رد خلال ٤٨ ساعة",
        eyebrow: "تواصل مع الجمعية",
        titleA: "ابدأ محادثة",
        titleB: "تؤدي إلى نتيجة.",
        intro:
          "المتعلمون والمؤسسات والصحفيون يصلون إلى المكان نفسه — شخص في فريق الجمعية يجيبك. اختر مسارك وسنكمل الطريق.",
        writeCta: "اكتب لنا",
        callCta: "اتصل بالمكتب",
        city: "دمشق، سورية",
        signalKicker: "خط مفتوح مع الجمعية",
        signalTitle: "رسالتك تبدأ من هنا.",
        signalBody: "كل رسالة تصل إلى شخص حقيقي في فريقنا.",
        linesEyebrow: "خطوط مباشرة",
        linesTitle: "تواصل معنا بالطريقة التي تناسبك.",
        email: "البريد الإلكتروني",
        phone: "الهاتف",
        visit: "زورونا",
        responseTime: "وقت الاستجابة",
        responseValue: "خلال 48 ساعة",
        formTitle: "أخبرنا بما يدور في ذهنك",
        formIntro: "املأ النموذج وسيردّ عليك الشخص المناسب في فريقنا.",
        fullName: "الاسم الكامل *",
        emailField: "البريد الإلكتروني *",
        phoneField: "رقم الهاتف",
        organization: "الجهة / الشركة",
        inquiryType: "نوع الاستفسار *",
        subject: "الموضوع *",
        messageField: "رسالتك *",
        send: "أرسل الرسالة",
        sending: "جارٍ الإرسال…",
        hqTitle: "المقر الرئيسي",
        hqBody: "دمشق — بجانب وزارة التعليم العالي والبحث العلمي",
        openMaps: "افتح في خرائط جوجل",
        assistantTitle: "بحاجة لإجابة فورية؟",
        assistantBody: "تحدث مع «أبو الجود» — مساعدنا الذكي على مدار الساعة.",
        assistantCta: "تحدث مع أبو الجود",
        followTitle: "تابع الجمعية",
        sentTitle: "وصلتنا رسالتك.",
        sentBody:
          "شكراً لتواصلك معنا. سيراجع فريقنا رسالتك ويرد عليك خلال 48 ساعة على بريدك الإلكتروني.",
        sendAnother: "إرسال رسالة أخرى",
        backHome: "العودة إلى الرئيسية",
      },
      home: {
        heroEyebrow: "الجمعية السورية للذكاء الاصطناعي",
        heroTitle: "نبني الجيل السوري القادم في الذكاء الاصطناعي",
        heroLede:
          "تدريب منظّم، ومجتمعات فاعلة، ومبادرات وطنية تفتح الباب أمام كل سوري ليتعلم الذكاء الاصطناعي ويستخدمه.",
        scroll: "تابع التمرير",
        summary:
          "تعرض هذه الصفحة منصة التعلّم، ومبادرة المليون مستخدم سوري للذكاء الاصطناعي، وأرقام الجمعية، ومجتمعاتها التسعة.",
        learnEyebrow: "منصة التعلّم",
        learnTitle: "مسارات منظّمة، لا دروس متفرقة",
        learnCopy:
          "دورات متسلسلة يقودها مدربون معتمدون، مع تمارين وشهادات، تبدأ من الأساسيات وتصل إلى التطبيق العملي.",
        learnCta: "ادخل إلى منصة التعلّم",
        initiativeEyebrow: "مبادرة وطنية",
        initiativeTitle: "مليون مستخدم سوري للذكاء الاصطناعي",
        initiativeCopy:
          "هدفنا تمكين مليون سوري من استخدام أدوات الذكاء الاصطناعي في عملهم ودراستهم وحياتهم اليومية.",
        initiativeCta: "تعرّف على المبادرة",
        statsEyebrow: "الأثر",
        statsTitle: "الجمعية بالأرقام",
        communitiesEyebrow: "المجتمعات",
        communitiesTitle: "مجتمعات الجمعية",
        communitiesCopy: "مساحات متخصصة يلتقي فيها المهتمون بكل مجال من مجالات الذكاء الاصطناعي.",
        communityPrev: "المجتمع السابق",
        communityNext: "المجتمع التالي",
        newsEyebrow: "الأخبار",
        newsTitle: "العمل كما يحدث",
        newsCopy: "آخر ما نشرته الجمعية من فعاليات وإعلانات وشراكات.",
        newsAllTitle: "كل ما نشرته الجمعية",
        newsAllCopy: "تصفّح أرشيف الأخبار كاملاً.",
        newsAllCta: "كل الأخبار",
        partnersEyebrow: "الشركاء",
        partnersTitle: "مؤسسات تمضي بالعمل أبعد",
        partnersCopy: "نعمل مع جهات حكومية وأكاديمية وخاصة لتوسيع أثر البرامج.",
        partnersCta: "عرض كل الشركاء",
        missionEyebrow: "طريقة العمل",
        missionTitle: "كيف تعمل الجمعية: ندرّب، نطبّق، نبني",
        missionCopy: "ثلاث خطوات متتابعة تنقل المتدرب من التعلّم إلى الإنتاج.",
        missionSteps: [
          {
            index: "01",
            title: "ندرّب",
            copy: "مسارات تدريبية معتمدة تبني الأساس المعرفي والمهاري.",
          },
          {
            index: "02",
            title: "نطبّق",
            copy: "مشاريع وتمارين عملية تحوّل المعرفة إلى خبرة حقيقية.",
          },
          {
            index: "03",
            title: "نبني",
            copy: "مجتمعات ومبادرات تصنع أثراً مستداماً على مستوى البلد.",
          },
        ],
        faqEyebrow: "أسئلة",
        faqTitle: "طريق واضح للبداية",
        faqCopy: "أكثر ما يُسأل عن الجمعية وبرامجها.",
        faqItems: [
          {
            q: "من يستطيع الانضمام إلى برامج الجمعية؟",
            a: "البرامج مفتوحة لكل مهتم بالذكاء الاصطناعي، من المبتدئين إلى المحترفين.",
          },
          {
            q: "هل الدورات مجانية؟",
            a: "يتوفر عدد من الدورات المجانية إلى جانب برامج مدفوعة، ويظهر السعر على صفحة كل دورة.",
          },
          {
            q: "هل أحصل على شهادة؟",
            a: "نعم، تُمنح شهادة عند إتمام متطلبات الدورة بنجاح.",
          },
          {
            q: "كيف أنضم إلى إحدى المجتمعات؟",
            a: "اختر المجتمع المناسب من صفحة المجتمعات واتبع خطوات الانضمام.",
          },
          {
            q: "كيف يمكن للمؤسسات التعاون معكم؟",
            a: "تواصل معنا عبر صفحة الاتصال وسيرد فريق الشراكات خلال 48 ساعة.",
          },
        ],
      },
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
