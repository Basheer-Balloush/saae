/* SAAE motion layer.
 *
 * Loaded deferred, after the inline hero script has already started the video
 * download, so nothing here delays the opening. Everything in this file is
 * enhancement: if GSAP fails to load, or the visitor prefers reduced motion,
 * the page keeps the composed states the stylesheet already gives it.
 *
 * Deliberately does NOT touch the hero scrub loop or the .reveal observer. Both
 * are tuned and verified, and re-implementing them on ScrollTrigger would risk
 * the frame-rate-independent easing and the coalesced seeking for no visible
 * gain. This adds motion where there was none.
 */
(() => {
  "use strict";

  if (typeof window.gsap === "undefined") return;

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const gsap = window.gsap;

  if (window.ScrollTrigger) gsap.registerPlugin(window.ScrollTrigger);

  /* Every animation below is registered inside a matchMedia context, so turning
     reduced motion on reverts all of it and turning it back off rebuilds it,
     without a reload. gsap.matchMedia() handles that teardown for us. */
  const mm = gsap.matchMedia();

  mm.add("(prefers-reduced-motion: no-preference)", () => {

    /* ---- Ambient ground ---------------------------------------------------
       The background field animates on transform only, but offscreen
       animations still tick, and the hero is the one stretch of this page that
       cannot spare the frames. Park the field until the reader is actually
       past the hero. */
    const journeyContent = document.querySelector(".journey-content");
    if (journeyContent && "IntersectionObserver" in window) {
      const ambientObserver = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          document.body.classList.toggle("is-past-hero", entry.isIntersecting);
        });
      }, { rootMargin: "20% 0px 20% 0px" });
      ambientObserver.observe(journeyContent);
    } else {
      document.body.classList.add("is-past-hero");
    }

    /* ---- Hero bands -------------------------------------------------------
       The card already slides in as a unit. This staggers the lines inside it
       so the eyebrow, the statement and the supporting line arrive in reading
       order rather than all at once, which is what makes a caption feel timed
       to the footage rather than stamped onto it. */
    const heroSection = document.getElementById("hero-sec");
    if (heroSection) {
      heroSection.addEventListener("saae:band", event => {
        const band = event.detail && event.detail.band;
        if (!band) return;
        const lines = band.querySelectorAll(".eyebrow, h2, p, .button-link");
        if (!lines.length) return;
        gsap.killTweensOf(lines);
        gsap.fromTo(
          lines,
          { y: 20, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: .72,
            stagger: .08,
            ease: "power3.out",
            overwrite: "auto"
          }
        );
      });
    }

    /* ---- Buttons ----------------------------------------------------------
       quickTo keeps a single interpolator alive per property instead of
       spawning a tween per pointer event, so this stays cheap during a fast
       traverse across several buttons. */
    document.querySelectorAll(".button-link, .ribbon-cta").forEach(button => {
      const arrow = button.querySelector("svg");
      const liftTo = gsap.quickTo(button, "y", { duration: .32, ease: "power3.out" });
      const arrowX = arrow ? gsap.quickTo(arrow, "x", { duration: .34, ease: "power3.out" }) : null;
      const arrowY = arrow ? gsap.quickTo(arrow, "y", { duration: .34, ease: "power3.out" }) : null;

      const enter = () => { liftTo(-3); if (arrowX) { arrowX(3); arrowY(-3); } };
      const leave = () => { liftTo(0); if (arrowX) { arrowX(0); arrowY(0); } };

      button.addEventListener("pointerenter", enter);
      button.addEventListener("pointerleave", leave);
      // Keyboard users get the same affordance as pointer users.
      button.addEventListener("focus", enter);
      button.addEventListener("blur", leave);
    });

    /* ---- Community index --------------------------------------------------
       Nine oversized labels. On hover the row commits: the label leans into the
       reading direction and its number lifts, so the list feels like an index
       you are moving through rather than a static column. */
    document.querySelectorAll(".community-list li").forEach(item => {
      const slideTo = gsap.quickTo(item, "x", { duration: .42, ease: "power3.out" });
      item.addEventListener("pointerenter", () => slideTo(14));
      item.addEventListener("pointerleave", () => slideTo(0));
    });

    /* ---- Story cards ------------------------------------------------------ */
    document.querySelectorAll(".story").forEach(story => {
      const image = story.querySelector("img");
      if (!image) return;
      const scaleTo = gsap.quickTo(image, "scale", { duration: .6, ease: "power3.out" });
      story.addEventListener("pointerenter", () => scaleTo(1.04));
      story.addEventListener("pointerleave", () => scaleTo(1));
    });

    /* ---- Section headings -------------------------------------------------
       A hairline that draws itself under each section heading as the section
       arrives, tying the sections together without adding another element to
       read. */
    if (window.ScrollTrigger) {
      document.querySelectorAll(".section-heading").forEach(heading => {
        gsap.fromTo(
          heading,
          { "--heading-rule": 0 },
          {
            "--heading-rule": 1,
            ease: "none",
            scrollTrigger: {
              trigger: heading,
              start: "top 82%",
              end: "top 42%",
              scrub: .6
            }
          }
        );
      });
    }

    return () => {
      // matchMedia teardown: quickTo leaves inline transforms behind, so clear
      // them or a visitor switching to reduced motion keeps a stale offset.
      gsap.set(".button-link, .ribbon-cta, .community-list li, .story img", { clearProps: "transform" });
    };
  });

  /* Keep ScrollTrigger honest about positions once the webfonts have swapped
     in and the hero media has settled, both of which change layout height. */
  if (window.ScrollTrigger) {
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => window.ScrollTrigger.refresh());
    }
    window.addEventListener("load", () => window.ScrollTrigger.refresh());
  }

  void reducedMotion;
})();
