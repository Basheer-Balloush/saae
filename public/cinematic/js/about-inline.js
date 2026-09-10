  /* One job: mark the document as scripted so the reveals may hide themselves,
     and bring each section in once. Nothing here is required for the page to
     be readable. */
  (() => {
    "use strict";
    if (!("IntersectionObserver" in window)) return;
    document.documentElement.classList.add("js");

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
  })();
