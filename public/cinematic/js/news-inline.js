  (() => {
    "use strict";
    // Echo the animated traces from the Contact form inside each news card.
    const circuit = `<svg class="news-card-circuit" viewBox="0 0 960 620" preserveAspectRatio="none" aria-hidden="true" focusable="false">
      <g class="news-card-circuit-traces">
        <path d="M-20 106 H170 V46 H372 V126 H610 V32 H980"/>
        <path d="M-20 332 H126 V244 H298 V374 H542 V270 H784 V350 H980"/>
        <path d="M-20 548 H208 V468 H412 V566 H672 V446 H850 V536 H980"/>
        <path d="M70 -20 V174 H236 V282 H64 V418 H-20"/>
        <path d="M868 -20 V166 H718 V306 H900 V448 H980"/>
      </g>
      <g class="news-card-circuit-nodes">
        <circle cx="170" cy="46" r="5"/><circle cx="610" cy="32" r="5"/>
        <circle cx="298" cy="374" r="5"/><circle cx="784" cy="350" r="5"/>
        <circle cx="208" cy="468" r="5"/><circle cx="672" cy="446" r="5"/>
        <circle cx="236" cy="282" r="5"/><circle cx="718" cy="306" r="5"/>
      </g>
      <g class="news-card-circuit-pulses">
        <path pathLength="100" d="M-20 106 H170 V46 H372 V126 H610 V32 H980"/>
        <path pathLength="100" d="M-20 332 H126 V244 H298 V374 H542 V270 H784 V350 H980"/>
        <path pathLength="100" d="M-20 548 H208 V468 H412 V566 H672 V446 H850 V536 H980"/>
      </g>
    </svg>`;
    document.querySelectorAll(".featured, .story-media").forEach((card, index) => {
      if (!card.querySelector(":scope > .news-card-circuit")) {
        card.insertAdjacentHTML("afterbegin", circuit);
        card.style.setProperty("--circuit-offset", `${index * -1.7}s`);
      }
    });

    const els = Array.from(document.querySelectorAll(".reveal"));
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window) || els.length === 0) {
      els.forEach(el => el.classList.add("is-in"));
      return;
    }
    const io = new IntersectionObserver(entries => {
      entries.filter(entry => entry.isIntersecting)
        .sort((a, b) => els.indexOf(a.target) - els.indexOf(b.target))
        .forEach((entry, index) => {
          entry.target.style.transitionDelay = `${Math.min(index, 4) * 180}ms`;
          entry.target.classList.add("is-in");
          io.unobserve(entry.target);
        });
    }, { threshold: .14, rootMargin: "0px 0px -6% 0px" });
    els.forEach(el => io.observe(el));
  })();
