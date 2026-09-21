  /* Progressive enhancement for the existing About page. Every section stays
     readable without scripting; interactions and motion are layered on top. */
  (() => {
    "use strict";
    document.documentElement.classList.add("js");
    const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

    const pillars = [...document.querySelectorAll(".pillar")];
    const activatePillar = (next) => {
      pillars.forEach((pillar) => {
        const active = pillar === next;
        pillar.classList.toggle("is-active", active);
        const trigger = pillar.querySelector(".pillar-trigger");
        const panel = pillar.querySelector(".pillar-copy");
        trigger?.setAttribute("aria-pressed", String(active));
        panel?.setAttribute("aria-hidden", String(!active));
      });
    };

    pillars.forEach((pillar, index) => {
      const trigger = pillar.querySelector(".pillar-trigger");
      trigger?.addEventListener("click", () => activatePillar(pillar));
      trigger?.addEventListener("keydown", (event) => {
        if (!["ArrowDown", "ArrowRight", "ArrowUp", "ArrowLeft", "Home", "End"].includes(event.key)) return;
        event.preventDefault();
        const backwards = event.key === "ArrowUp" || event.key === "ArrowLeft";
        const targetIndex = event.key === "Home" ? 0 : event.key === "End" ? pillars.length - 1 : (index + (backwards ? -1 : 1) + pillars.length) % pillars.length;
        const target = pillars[targetIndex];
        activatePillar(target);
        target.querySelector(".pillar-trigger")?.focus();
      });
    });
    const updateLocalizedAttributes = (lang) => {
      document.querySelectorAll("[data-label-en][data-label-ar]").forEach((element) => {
        element.setAttribute("aria-label", element.dataset[lang === "ar" ? "labelAr" : "labelEn"] || "");
      });
    };
    updateLocalizedAttributes(document.documentElement.lang);
    window.addEventListener("saae:languagechange", (event) => updateLocalizedAttributes(event.detail?.lang));

    const figures = [...document.querySelectorAll(".figure")];
    const finishFigures = () => {
      figures.forEach((figure) => {
        figure.classList.add("is-in");
        const number = figure.querySelector("[data-count]");
        if (number) number.textContent = `${number.dataset.prefix || ""}${Number(number.dataset.count).toLocaleString("en-US")}${number.dataset.suffix || ""}`;
      });
    };

    const animateFigures = () => {
      figures.forEach((figure, index) => {
        window.setTimeout(() => figure.classList.add("is-in"), index * 90);
        const number = figure.querySelector("[data-count]");
        if (!number) return;
        const target = Number(number.dataset.count);
        const prefix = number.dataset.prefix || "";
        const suffix = number.dataset.suffix || "";
        const start = performance.now() + index * 90;
        const tick = (now) => {
          const progress = Math.max(0, Math.min((now - start) / 1200, 1));
          const eased = 1 - Math.pow(1 - progress, 3);
          number.textContent = `${prefix}${Math.round(target * eased).toLocaleString("en-US")}${suffix}`;
          if (progress < 1) window.requestAnimationFrame(tick);
        };
        window.requestAnimationFrame(tick);
      });
    };

    const communities = [...document.querySelectorAll(".community")];
    const showCommunities = () => communities.forEach((card) => card.classList.add("is-in"));

    if (!("IntersectionObserver" in window) || reducedMotion) {
      document.querySelectorAll(".reveal").forEach((node) => node.classList.add("is-in"));
      finishFigures();
      showCommunities();
      return;
    }

    const observer = new IntersectionObserver((entries, self) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-in");
        self.unobserve(entry.target);
      });
    /* threshold 0: any sliver of a section counts. A ratio threshold reads
       fine on a slow human scroll and then misses sections entirely on a fast
       one, which would leave real content invisible. */
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0 });

    document.querySelectorAll(".reveal").forEach(node => observer.observe(node));

    const figuresElement = document.querySelector(".figures");
    if (figuresElement) {
      const figuresObserver = new IntersectionObserver((entries, self) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        animateFigures();
        self.disconnect();
      }, { threshold: .25 });
      figuresObserver.observe(figuresElement);
    }

    const communitiesElement = document.querySelector(".community-grid");
    if (communitiesElement) {
      const communitiesObserver = new IntersectionObserver((entries, self) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        communities.forEach((card, index) => window.setTimeout(() => card.classList.add("is-in"), index * 75));
        self.disconnect();
      }, { rootMargin: "0px 0px -8% 0px", threshold: .08 });
      communitiesObserver.observe(communitiesElement);
    }
  })();
