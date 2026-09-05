/* Bilingual news pages: one shared engine, per-page dictionaries.
   Pages carry data-i18n / data-i18n-aria / data-i18n-alt keys; the engine
   swaps text, flips lang/dir, persists saae-language and notifies the
   radial nav through saae:languagechange (same contract as the rest). */
(() => {
  "use strict";
  /* The dictionaries are declared below this block, so nothing here may read
     window.NEWS_I18N while the file is still being evaluated -- doing that is
     what left every news page with a dead language button. Everything is held
     in start(), which runs once the document is ready and the whole file,
     dictionaries included, has been evaluated. */
  const start = () => {
  /* The dictionary key is the page's own name, and the URL is only a guess at
     it: it is right when the file is served under its own filename and wrong
     under anything else -- a clean URL, a directory index, or a host that
     serves the page from an opaque path. A page may therefore state its key
     outright, and the filename stays the fallback. */
  const page = (document.documentElement.dataset.i18nPage
    || location.pathname.split("/").pop()
    || "index.html").toLowerCase();
  const dict = (window.NEWS_I18N && window.NEWS_I18N[page]) || null;
  if (!dict) return;
  const base = document.documentElement.lang === "ar" ? "ar" : "en";
  const pick = (key, lang) => (dict[lang] && dict[lang][key] != null ? dict[lang][key] : null);
  const textEls = Array.from(document.querySelectorAll("[data-i18n]"));
  const ariaEls = Array.from(document.querySelectorAll("[data-i18n-aria]"));
  const altEls = Array.from(document.querySelectorAll("[data-i18n-alt]"));
  const textSrc = new Map();
  const ariaSrc = new Map();
  const altSrc = new Map();
  textEls.forEach(el => textSrc.set(el, el.textContent));
  ariaEls.forEach(el => ariaSrc.set(el, el.getAttribute("aria-label") || ""));
  altEls.forEach(el => altSrc.set(el, el.getAttribute("alt") || ""));
  const titleSrc = document.title;
  const descEl = document.querySelector('meta[name="description"]');
  const descSrc = descEl ? descEl.getAttribute("content") : "";
  const dotBtns = Array.from(document.querySelectorAll("[data-dot]"));
  const button = document.getElementById("language-switch");
  const setDots = lang => dotBtns.forEach(b => {
    const i = b.dataset.dot, n = b.dataset.total;
    b.setAttribute("aria-label", lang === "ar" ? `\u0627\u0644\u0634\u0631\u064a\u062d\u0629 ${i} \u0645\u0646 ${n}` : `Slide ${i} of ${n}`);
  });
  const updateButton = lang => {
    if (!button) return;
    const arabic = lang === "ar";
    const label = button.querySelector(".language-switch-label");
    if (label) label.textContent = arabic ? "English" : "\u0627\u0644\u0639\u0631\u0628\u064a\u0629";
    button.setAttribute("aria-label", arabic ? "Switch to English" : "\u0627\u0644\u062a\u0628\u062f\u064a\u0644 \u0625\u0644\u0649 \u0627\u0644\u0625\u0646\u062c\u0644\u064a\u0632\u064a\u0629");
    button.setAttribute("aria-pressed", String(arabic));
  };
  const apply = lang => {
    const arabic = lang === "ar";
    document.documentElement.lang = lang;
    document.documentElement.dir = arabic ? "rtl" : "ltr";
    textEls.forEach(el => {
      const v = pick(el.dataset.i18n, lang);
      el.textContent = v != null ? v : textSrc.get(el);
    });
    ariaEls.forEach(el => {
      const v = pick(el.dataset.i18nAria, lang);
      el.setAttribute("aria-label", v != null ? v : ariaSrc.get(el));
    });
    altEls.forEach(el => {
      const v = pick(el.dataset.i18nAlt, lang);
      el.setAttribute("alt", v != null ? v : altSrc.get(el));
    });
    const t = pick("__title", lang);
    document.title = t != null ? t : titleSrc;
    const d = pick("__desc", lang);
    if (descEl) descEl.setAttribute("content", d != null ? d : descSrc);
    setDots(lang);
    updateButton(lang);
    try { localStorage.setItem("saae-language", lang); } catch (_) { /* optional */ }
    window.dispatchEvent(new CustomEvent("saae:languagechange", { detail: { lang } }));
  };
  let initial = base;
  try { initial = localStorage.getItem("saae-language") || base; } catch (_) { /* optional */ }
  if (initial !== "ar" && initial !== "en") initial = base;
  if (initial !== base) apply(initial);
  else { updateButton(base); setDots(base); }
  if (button) button.addEventListener("click", () => {
    apply(document.documentElement.lang === "ar" ? "en" : "ar");
  });
  };

  /* The microtask is what makes this correct rather than lucky: these pages
     load the file with defer, so at this point readyState is already
     "interactive" and a direct call would run start() before the dictionaries
     below exist. A microtask waits for the whole file to finish evaluating,
     and only then decides whether the DOM still needs waiting for. */
  queueMicrotask(() => {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
    else start();
  });
})();

window.NEWS_I18N = window.NEWS_I18N || {};
window.NEWS_I18N["news.html"] = {
  ar: {
    fClaim: "أول منظمة رسمية في سورية مكرّسة للذكاء الاصطناعي والابتكار والتفكير الريادي — تمكّن المواهب السورية لإعادة بناء بلدنا والارتقاء به.",
    fExplore: "استكشف",
    fHome: "الرئيسية",
    fAbout: "عن الجمعية",
    fNews: "الأخبار",
    fPartners: "الشركاء",
    fInitiative: "المبادرة",
    fContact: "تواصل معنا",
    fOfficial: "الموقع الرسمي",
    fCommunities: "المجتمعات",
    fAchievements: "الإنجازات",
    fLearning: "منصة التعلّم",
    fTools: "أدوات الذكاء الاصطناعي",
    fMillion: "مبادرة المليون مستخدم",
    fRegistration: "التسجيل",
    fAddress: "دمشق - بجانب وزارة التعليم العالي والبحث العلمي",
    fVisit: "زورونا",
    fRights: "جميع الحقوق محفوظة للجمعية السورية للذكاء الاصطناعي وريادة الأعمال 2026 ©",
    __title: "الأخبار | SAAE",
    __desc: "سجل متجدد لما تبنيه الجمعية السورية للذكاء الاصطناعي وريادة الأعمال: قاعات تدريب وبث وطني وإطلاقات عامة.",
    eyebrow: "آخر الأخبار",
    h1: "العمل كما يحدث.",
    intro: "قاعات التدريب والبث الوطني والإطلاقات العامة — سجل متجدد لما تبنيه الجمعية، الأحدث أولاً.",
    tagF: "بث",
    dateF: "١٩ تموز ٢٠٢٦",
    headF: "مبادرة المليون مستخدم تصل إلى التلفزيون الوطني",
    exF: "عرض رئيس الجمعية تقدم المبادرة على تلفزيون سوريا، واضعاً برنامجاً وطنياً للذكاء الاصطناعي أمام جمهور وطني.",
    cta: "اقرأ الخبر",
    tag1: "المبادرة",
    date1: "٢٥ حزيران ٢٠٢٦",
    head1: "إطلاق مبادرة \u201cتدريب مليون مستخدم ذكاء اصطناعي سوري\u201d لتعزيز التحول الرقمي وبناء القدرات الوطنية",
    ex1: "أُطلقت مبادرة \u201cتدريب مليون مستخدم ذكاء اصطناعي سوري\u201d بهدف نشر ثقافة الذكاء الاصطناعي وتمكين مختلف فئات المجتمع من اكتساب المهارات الرقمية اللازمة لمواكبة التحول الرقمي.",
    tag2: "التدريب",
    date2: "٢٥ حزيران ٢٠٢٦",
    head2: "الجمعية السورية للذكاء الاصطناعي وريادة الأعمال تحتفل بتخريج أول مدربي الذكاء الاصطناعي في سوريا",
    ex2: "أتمت الدفعة الأولى 100 ساعة تدريبية وبدأت بنقل المعرفة العملية بالذكاء الاصطناعي إلى قاعاتها.",
    tag3: "عمل تطبيقي",
    date3: "١٠ حزيران ٢٠٢٦",
    head3: "بيلدكس | جناح محافظة حلب | مشروع حلب الكبرى",
    ex3: "سجلت الجمعية مشاركة متميزة ضمن جناح محافظة حلب في معرض بيلدكس، حيث تم استعراض مسودة المخطط التوجيهي لمشروع \u201cرؤية حلب الكبرى\u201d.",
    idName: "الجمعية السورية للذكاء الاصطناعي وريادة الأعمال",
    idLoc: "دمشق، بجانب وزارة التعليم العالي والبحث العلمي",
    idClaim: "أول منظمة رسمية في سورية مكرّسة للذكاء الاصطناعي والابتكار والتفكير الريادي.",
    colExplore: "استكشف",
    lAbout: "عن الجمعية",
    lPartners: "الشركاء",
    lInit: "المبادرة",
    lContact: "تواصل معنا",
    colReach: "تواصل مع الجمعية",
    socIg: "الجمعية على إنستغرام",
    socFb: "الجمعية على فيسبوك",
    socLi: "الجمعية على لينكدإن",
    socAria: "الجمعية على منصات التواصل",
    opensTab: "، يفتح في تبويب جديد",
    bot1: "المعلومات الرسمية والبرامج والتسجيل منشورة على aisyria.org.",
    bot2: "صفحة الأخبار بالعربية، أيلول ٢٠٢٦.",
    logoEnAlt: "الجمعية السورية للذكاء الاصطناعي وريادة الأعمال",
    navAria: "التنقل الرئيسي",
    togAria: "فتح التنقل",
    togSr: "فتح التنقل"
  }
};
window.NEWS_I18N["tv-interview.html"] = {
  en: {
    fClaim: "Syria's first official AI organisation — empowering Syrian talent to rebuild and uplift our country.",
    fExplore: "Explore",
    fHome: "Home",
    fAbout: "About SAAE",
    fNews: "News",
    fPartners: "Partners",
    fInitiative: "Initiative",
    fContact: "Contact",
    fOfficial: "Official site",
    fCommunities: "Communities",
    fAchievements: "Achievements",
    fLearning: "Learning platform",
    fTools: "AI tools",
    fMillion: "The million-user initiative",
    fRegistration: "Registration",
    fAddress: "Damascus, beside the Ministry of Higher Education and Scientific Research",
    fVisit: "Visit us",
    fRights: "© 2026 Syrian Association for AI & Entrepreneurship. All rights reserved.",
    __title: "Chairman of the Board of Directors of the Syrian Association for Artificial Intelligence and Entrepreneurship Reviews Developments of the \u201cOne Million Syrian Users\u201d Initiative on Syrian TV — SAAE",
    __desc: "SAAE's chairman presented the million-user initiative's progress on Syria TV, putting a national AI programme before a national audience.",
    chip: "Trainers community",
    h1: "Chairman of the Board of Directors of the Syrian Association for Artificial Intelligence and Entrepreneurship Reviews Developments of the \u201cOne Million Syrian Users\u201d Initiative on Syrian TV",
    date: "19 July 2026",
    coverAlt: "SAAE chairman discusses the million-user initiative on Syria TV",
    g1Alt: "Syria TV interview, slide 1",
    g2Alt: "Syria TV interview, slide 2",
    g3Alt: "Syria TV interview, slide 3",
    r1Alt: "Launch of the one-million Syrian AI users initiative",
    r2Alt: "Syria's first AI trainers graduate",
    r3Alt: "SAAE at BUILDEX in the Aleppo Governorate pavilion",
    p1: "Syria TV hosted the chairman of the Syrian Association for AI & Entrepreneurship, Mr. Ahmad Ghassan Al-Munajjid, on its Ishraqat Al-Sabah morning segment.",
    p2: "The interview focused on the million Syrian AI users initiative, as Mr. Al-Munajjid gave a detailed account of the initiative and its progress.",
    hb1: "Key topics discussed:",
    s1t: "Work mechanism and goals:",
    s1x: "Explaining the initiative's organizational structure and its national goals to spread AI culture in Syria.",
    s2t: "Achievements and current stages:",
    s2x: "Reviewing the key milestones the initiative has reached so far.",
    s3t: "Next steps:",
    s3x: "Highlighting upcoming plans to equip all segments of Syrian society with AI skills.",
    s4t: "Digital transformation vision:",
    s4x: "Affirming the initiative's role in a comprehensive strategy to accelerate digital transformation and build national capabilities.",
    p3: "This participation underscores the association's commitment to keeping Syrian society informed of technological developments and empowering it to take an active part in the digital future.",
    galLabel: "Photos from the TV interview",
    prevDot: "Previous slide",
    nextDot: "Next slide",
    relH: "Related news",
    rDate1: "25 June 2026",
    rDate2: "25 June 2026",
    rDate3: "10 June 2026",
    rHead1: "Launch of the \u201cTrain One Million Syrian AI Users\u201d Initiative to Accelerate Digital Transformation and Build National AI Capabilities",
    rHead2: "Syrian Association for Artificial Intelligence and Entrepreneurship Graduates Syria's First Cohort of AI Trainers",
    rHead3: "BUILDEX | Aleppo Governorate Pavilion | Greater Aleppo Project",
    back: "Back to news",
    logoArAlt: "Syrian Association for AI & Entrepreneurship",
    navAria: "Main navigation",
    togAria: "Open navigation",
    togSr: "Open navigation",
    opensTab: ", opens in a new tab"
  }
};
window.NEWS_I18N["initiative-launch.html"] = {
  en: {
    fClaim: "Syria's first official AI organisation — empowering Syrian talent to rebuild and uplift our country.",
    fExplore: "Explore",
    fHome: "Home",
    fAbout: "About SAAE",
    fNews: "News",
    fPartners: "Partners",
    fInitiative: "Initiative",
    fContact: "Contact",
    fOfficial: "Official site",
    fCommunities: "Communities",
    fAchievements: "Achievements",
    fLearning: "Learning platform",
    fTools: "AI tools",
    fMillion: "The million-user initiative",
    fRegistration: "Registration",
    fAddress: "Damascus, beside the Ministry of Higher Education and Scientific Research",
    fVisit: "Visit us",
    fRights: "© 2026 Syrian Association for AI & Entrepreneurship. All rights reserved.",
    __title: "Launch of the \u201cTrain One Million Syrian AI Users\u201d Initiative to Accelerate Digital Transformation and Build National AI Capabilities — SAAE",
    __desc: "The Train One Million Syrian AI Users initiative was launched to expand AI literacy and equip Syrians with future-ready digital skills.",
    chip: "Trainers community",
    h1: "Launch of the \u201cTrain One Million Syrian AI Users\u201d Initiative to Accelerate Digital Transformation and Build National AI Capabilities",
    date: "25 June 2026",
    coverAlt: "Launch of the one-million Syrian AI users initiative",
    r1Alt: "SAAE chairman on Syria TV",
    r2Alt: "Syria's first AI trainers graduate",
    r3Alt: "SAAE at BUILDEX in the Aleppo Governorate pavilion",
    p1: "In a national step to accelerate digital transformation, the \u201cTrain One Million Syrian AI Users\u201d initiative was launched as one of the largest educational and technical initiatives to spread AI culture in Syria and enable society to benefit from its applications across life and work.",
    p2: "The initiative was announced at the First Syrian AI Symposium, within a national vision to build a digital society equipped for modern technologies and ready for the digital economy.",
    p3: "It targets all segments of society \u2014 students, researchers, teachers, employees, entrepreneurs and project owners \u2014 with essential knowledge and skills in practical AI tools.",
    p4: "The initiative offers varied training programmes for all levels and builds a national network of qualified trainers, starting with Syria's first graduating cohort of AI trainers to sustain implementation across all governorates.",
    p5: "It also supports innovation and productivity, enabling institutions to use AI in better services and decision-making, in line with national digital transformation and a knowledge-based economy.",
    p6: "The initiative embodies a strategy of investing in people as the key to a sustainable digital future and Syria's place in regional technological progress.",
    bandEyebrow: "One Million Syrian AI Users Initiative",
    bandH: "One million people. One national step forward.",
    bandCta: "Join the initiative",
    relH: "Related news",
    rDate1: "19 July 2026",
    rDate2: "25 June 2026",
    rDate3: "10 June 2026",
    rHead1: "SAAE chairman reviews the million-user initiative on Syria TV.",
    rHead2: "Syrian Association for Artificial Intelligence and Entrepreneurship Graduates Syria's First Cohort of AI Trainers",
    rHead3: "BUILDEX | Aleppo Governorate Pavilion | Greater Aleppo Project",
    back: "Back to news",
    logoArAlt: "Syrian Association for AI & Entrepreneurship",
    navAria: "Main navigation",
    togAria: "Open navigation",
    togSr: "Open navigation",
    opensTab: ", opens in a new tab"
  }
};
window.NEWS_I18N["trainers-graduation.html"] = {
  en: {
    fClaim: "Syria's first official AI organisation — empowering Syrian talent to rebuild and uplift our country.",
    fExplore: "Explore",
    fHome: "Home",
    fAbout: "About SAAE",
    fNews: "News",
    fPartners: "Partners",
    fInitiative: "Initiative",
    fContact: "Contact",
    fOfficial: "Official site",
    fCommunities: "Communities",
    fAchievements: "Achievements",
    fLearning: "Learning platform",
    fTools: "AI tools",
    fMillion: "The million-user initiative",
    fRegistration: "Registration",
    fAddress: "Damascus, beside the Ministry of Higher Education and Scientific Research",
    fVisit: "Visit us",
    fRights: "© 2026 Syrian Association for AI & Entrepreneurship. All rights reserved.",
    __title: "Syrian Association for Artificial Intelligence and Entrepreneurship Graduates Syria's First Cohort of AI Trainers — SAAE",
    __desc: "SAAE graduated Syria's first cohort of AI trainers, marking a milestone for national digital capacity.",
    chip: "Trainers community",
    h1: "Syrian Association for Artificial Intelligence and Entrepreneurship Graduates Syria's First Cohort of AI Trainers",
    date: "25 June 2026",
    coverAlt: "Syria's first AI trainers graduate",
    g1Alt: "Trainers graduation ceremony, slide 1 of 5",
    g2Alt: "Trainers graduation ceremony, slide 2 of 5",
    g3Alt: "Trainers graduation ceremony, slide 3 of 5",
    g4Alt: "Trainers graduation ceremony, slide 4 of 5",
    g5Alt: "Trainers graduation ceremony, slide 5 of 5",
    r1Alt: "SAAE chairman on Syria TV",
    r2Alt: "Launch of the one-million Syrian AI users initiative",
    r3Alt: "SAAE at BUILDEX in the Aleppo Governorate pavilion",
    p1: "In a national milestone for digital transformation, the association graduated Syria's first cohort of AI trainers during the First Syrian AI Symposium, held with the Ministry of Communications and Information Technology at the National Library in Damascus.",
    p2: "The first cohort brought together eleven trainers from diverse scientific backgrounds, completing an intensive programme of more than 100 training hours to prepare national cadres for spreading knowledge and qualifying individuals and institutions in professional AI use.",
    p3: "The symposium also saw the launch of the \u201cTrain One Million Syrian AI Users\u201d initiative to spread digital culture and enable Syrian society to apply AI across education, health, industry, agriculture, administration and entrepreneurship.",
    p4: "An equivalency and standards framework for AI trainers was also announced, unifying qualification and accreditation standards and building a sustainable national system for digital skills.",
    p5: "Participants affirmed that this step opens a new phase of national capacity-building, investing in human capital as the foundation of digital transformation and innovation, keeping pace with global developments and preparing Syria for the digital economy.",
    galLabel: "Photos from the graduation ceremony",
    prevDot: "Previous slide",
    nextDot: "Next slide",
    galLabel: "Photos from the graduation ceremony",
    bandEyebrow: "One Million Syrian AI Users Initiative",
    bandH: "One million people. One national step forward.",
    bandCta: "Join the initiative",
    relH: "Related news",
    rDate1: "19 July 2026",
    rDate2: "25 June 2026",
    rDate3: "10 June 2026",
    rHead1: "SAAE chairman reviews the million-user initiative on Syria TV.",
    rHead2: "Launch of the \u201cTrain One Million Syrian AI Users\u201d Initiative to Accelerate Digital Transformation and Build National AI Capabilities",
    rHead3: "BUILDEX | Aleppo Governorate Pavilion | Greater Aleppo Project",
    back: "Back to news",
    logoArAlt: "Syrian Association for AI & Entrepreneurship",
    navAria: "Main navigation",
    togAria: "Open navigation",
    togSr: "Open navigation",
    opensTab: ", opens in a new tab"
  }
};
window.NEWS_I18N["buildex-aleppo.html"] = {
  en: {
    fClaim: "Syria's first official AI organisation — empowering Syrian talent to rebuild and uplift our country.",
    fExplore: "Explore",
    fHome: "Home",
    fAbout: "About SAAE",
    fNews: "News",
    fPartners: "Partners",
    fInitiative: "Initiative",
    fContact: "Contact",
    fOfficial: "Official site",
    fCommunities: "Communities",
    fAchievements: "Achievements",
    fLearning: "Learning platform",
    fTools: "AI tools",
    fMillion: "The million-user initiative",
    fRegistration: "Registration",
    fAddress: "Damascus, beside the Ministry of Higher Education and Scientific Research",
    fVisit: "Visit us",
    fRights: "© 2026 Syrian Association for AI & Entrepreneurship. All rights reserved.",
    __title: "BUILDEX | Aleppo Governorate Pavilion | Greater Aleppo Project — SAAE",
    __desc: "SAAE joined the Aleppo Governorate pavilion at BUILDEX to present the draft master plan for the Greater Aleppo Vision and its technology track.",
    chip: "Smart urban community",
    h1: "BUILDEX | Aleppo Governorate Pavilion | Greater Aleppo Project",
    date: "10 June 2026",
    coverAlt: "SAAE taking part in BUILDEX within the Aleppo Governorate pavilion",
    hb1: "The Greater Aleppo Vision: Aleppo first in its economy, balanced in its urban form",
    p1: "The Greater Aleppo Vision is an integrated strategic framework for managing urban transformation, connecting spatial planning, community participation and digital data in one efficient system. Through it we aim to support reconstruction, achieve sustainable development, and enable decision-makers to act on precise evidence and data.",
    p2: "The project rests on replanning the city of Aleppo with a forward-looking vision that integrates the countryside with the city to secure balanced, inclusive growth.",
    p3: "The Greater Aleppo Vision comprises nine core projects and programmes running in parallel to deliver its goals:",
    s1t: "Emergency urban response project:",
    s1x: " for fast, effective handling of urgent urban needs.",
    s2t: "Adaptive governance system:",
    s2x: " to develop institutional management capable of adapting to change.",
    s3t: "Sustainable community participation system:",
    s3x: " to involve the local community in urban decision-making.",
    s4t: "Real-estate ownership project:",
    s4x: " to preserve and organise property rights and ownership, and secure their stability.",
    s5t: "Spatial survey project:",
    s5x: " to document and analyse the geographic and urban reality with precision.",
    s6t: "Social survey project:",
    s6x: " to understand residents' needs and demographic characteristics.",
    s7t: "Greater Aleppo urban observatory:",
    s7x: " to gather urban indicators and monitor and guide the city's growth.",
    s8t: "Interactive urban map:",
    s8x: " an advanced digital platform for exploring planning data interactively.",
    s9t: "Planning-alternatives generation system:",
    s9x: " a smart tool for weighing planning scenarios and selecting the most suitable.",
    hb2: "Our strategic goals",
    p4: "We work to a clear vision aimed at lasting, positive impact:",
    s10t: "Improving quality of life:",
    s10x: " creating an urban environment that is healthy, safe and equal to residents' aspirations.",
    s11t: "Supporting equitable investment:",
    s11x: " providing an environment that attracts investment and distributes it in a balanced way that serves everyone.",
    s12t: "Protecting the urban and social fabric:",
    s12x: " preserving Aleppo's long-standing identity and strengthening community cohesion.",
    s13t: "Raising the quality of urban decisions:",
    s13x: " relying on modern technology and data to keep planning decisions accurate and effective.",
    hb3: "The technology track: towards a smart digital transformation for Aleppo Governorate",
    p5: "As part of the continuing pursuit of sustainable development and institutional growth, and in line with the Greater Aleppo Vision, we launched the technology track as a strategic step towards adopting the latest digital technologies and developing the governorate's infrastructure.",
    p6: "Our strategic goals:",
    s14t: "Digital twinning:",
    s14x: " achieving a comprehensive, integrated digital twin of Aleppo Governorate.",
    s15t: "Exchange of expertise:",
    s15x: " drawing fully on comparable local and international experience and applying best practice.",
    p7: "Our steps and achievements so far — to turn this vision into something tangible, we have carried out a set of practical steps and initiatives:",
    s16t: "Developing the methodology:",
    s16x: " holding a series of specialist workshops to build and map a clear, flexible working methodology for the technology track.",
    s17t: "Active participation:",
    s17x: " a notable presence and participation at Syria Hitech, the country's foremost technology exhibition.",
    s18t: "Field visits:",
    s18x: " field and exploratory visits to a number of Syria's main data centres to survey the available infrastructure.",
    s19t: "Attracting talent:",
    s19x: " opening channels of continuous contact and coordination with a select group of experts and specialists, in preparation for forming the technology track's expert team, which will develop and update future working methodologies.",
    p8: "Our vision continues: we believe that building a smart future for Aleppo begins with enabling technology and joining national and international expertise together.",
    hb4: "SAAE at Syria Hitech: a promising step towards a digital twin of Aleppo",
    p9: "As part of strengthening strategic partnerships and digital transformation, the Syrian Association for AI recorded a notable presence at the Syria Hitech technology and communications exhibition, in close cooperation with the Greater Aleppo Vision team and within the work of the technology track.",
    p10: "Extended partnerships for an advanced methodology — this participation came in cooperation and coordination with several leading organisations and institutions in the technology sector, with the focus on:",
    p11: "Presenting the methodology for building the technology track and reviewing the plans for developing digital infrastructure.",
    p12: "Opening prospects for cooperation with active parties to support innovation and smart solutions built on AI technologies.",
    p13: "The purpose and the wider goal — these joint efforts feed directly into the governorate's strategic vision, which aims at a comprehensive, integrated digital twin across Aleppo Governorate, raising the quality of services and supporting smart urban decision-making.",
    hb5: "SAAE at BUILDEX: presenting the draft master plan for the Greater Aleppo Vision",
    p14: "In a notable strategic step towards shaping a sustainable urban future built on smart technology, the most recent edition of the BUILDEX international construction exhibition saw active and distinguished participation by the Syrian Association for AI within the Aleppo Governorate pavilion. The draft master plan for the Greater Aleppo Vision was presented during the event.",
    p15: "This joint participation reflects the commitment of the association and the governorate to sharing future plans and digital solutions with specialists, investors and the local community, so that modern technology helps build a city that is balanced in its urban form, leading in its economy and sustainable in its technology.",
    galLabel: "Photos from BUILDEX",
    g1Alt: "BUILDEX, slide 1 of 4",
    g2Alt: "BUILDEX, slide 2 of 4",
    g3Alt: "BUILDEX, slide 3 of 4",
    g4Alt: "BUILDEX, slide 4 of 4",
    prevDot: "Previous slide",
    nextDot: "Next slide",
    bandEyebrow: "One Million Syrian AI Users Initiative",
    bandH: "One million people. One national step forward.",
    bandCta: "Join the initiative",
    relH: "Related news",
    r1Alt: "SAAE chairman reviews the million-user initiative on Syria TV",
    r2Alt: "Launch of the one-million Syrian AI users initiative",
    r3Alt: "Syria's first AI trainers graduate",
    rDate1: "19 July 2026",
    rDate2: "25 June 2026",
    rDate3: "25 June 2026",
    rHead1: "SAAE chairman reviews the “One Million Syrian Users” initiative on Syria TV.",
    rHead2: "Launch of the “Train One Million Syrian AI Users” Initiative to Accelerate Digital Transformation and Build National Capabilities.",
    rHead3: "Syrian Association for Artificial Intelligence and Entrepreneurship Graduates Syria's First Cohort of AI Trainers.",
    back: "Back to news",
    logoArAlt: "Syrian Association for AI & Entrepreneurship",
    navAria: "Main navigation",
    togAria: "Open navigation",
    togSr: "Open navigation",
    opensTab: ", opens in a new tab"
  }
};
