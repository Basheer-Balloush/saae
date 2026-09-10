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
