  (() => {
    "use strict";
    const els = Array.from(document.querySelectorAll(".reveal"));
    if (!("IntersectionObserver" in window) || els.length === 0) {
      els.forEach(el => el.classList.add("is-in"));
      return;
    }
    const io = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-in");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: .14, rootMargin: "0px 0px -6% 0px" });
    els.forEach((el, i) => {
      el.style.transitionDelay = (Math.min(i, 5) * 70) + "ms";
      io.observe(el);
    });
  })();

  (() => {
    "use strict";
    const slides = Array.from(document.querySelectorAll(".gallery-slide"));
    const dots = Array.from(document.querySelectorAll(".gallery-dot"));
    const previous = document.getElementById("gallery-prev");
    const next = document.getElementById("gallery-next");
    if (slides.length < 2 || !previous || !next) return;

    let current = 0;
    const go = index => {
      current = (index + slides.length) % slides.length;
      slides.forEach((slide, i) => slide.classList.toggle("is-active", i === current));
      dots.forEach((dot, i) => {
        dot.classList.toggle("is-active", i === current);
        if (i === current) dot.setAttribute("aria-current", "true");
        else dot.removeAttribute("aria-current");
      });
    };

    previous.addEventListener("click", () => go(current - 1));
    next.addEventListener("click", () => go(current + 1));
    dots.forEach(dot => dot.addEventListener("click", () => go(Number(dot.dataset.go))));
  })();
