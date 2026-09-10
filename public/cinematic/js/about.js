(() => {
  "use strict";

  const root = document.documentElement;
  const header = document.getElementById("about-header");
  const languageSwitch = document.getElementById("language-switch");
  const languageLabel = document.getElementById("language-label");

  const pageCopy = {
    en: {
      title: "About SAAE | Syrian Association for AI & Entrepreneurship",
      description: "Learn about the vision, mission, goals and work of the Syrian Association for Artificial Intelligence and Entrepreneurship.",
      switchLabel: "العربية",
      switchAria: "Switch to Arabic"
    },
    ar: {
      title: "عن الجمعية | الجمعية السورية للذكاء الصنعي وريادة الأعمال",
      description: "تعرّف على رؤية الجمعية السورية للذكاء الصنعي وريادة الأعمال ورسالتها وأهدافها ومجالات عملها.",
      switchLabel: "English",
      switchAria: "Switch to English"
    }
  };

  const setLanguage = (language) => {
    const lang = language === "ar" ? "ar" : "en";
    const copy = pageCopy[lang];

    root.lang = lang;
    root.dir = lang === "ar" ? "rtl" : "ltr";
    document.title = copy.title;

    const description = document.querySelector('meta[name="description"]');
    if (description) description.content = copy.description;

    document.querySelectorAll("[data-en][data-ar]").forEach((element) => {
      element.textContent = element.dataset[lang];
    });

    languageLabel.textContent = copy.switchLabel;
    languageSwitch.setAttribute("aria-label", copy.switchAria);
    languageSwitch.setAttribute("aria-pressed", String(lang === "ar"));
    localStorage.setItem("saae-language", lang);
  };

  const updateHeader = () => {
    header.classList.toggle("is-scrolled", window.scrollY > 24);
  };

  languageSwitch.addEventListener("click", () => {
    setLanguage(root.lang === "ar" ? "en" : "ar");
  });

  window.addEventListener("scroll", updateHeader, { passive: true });
  updateHeader();
  setLanguage(localStorage.getItem("saae-language") === "ar" ? "ar" : "en");
})();
