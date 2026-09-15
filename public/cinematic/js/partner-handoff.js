(() => {
  "use strict";
  const initialized = new WeakSet();
  window.__cinematic = {
    init(root) {
      const handoff = root.querySelector("#partner-handoff");
      if (!handoff || initialized.has(handoff) || !window.gsap || !window.ScrollTrigger) return;
      initialized.add(handoff);
      const partners = handoff.querySelector("#partners");
      const surface = handoff.querySelector(".hp-partner-surface");
      const mission = handoff.querySelector("#mission");
      if (!partners || !surface || !mission) return;
      const gsap = window.gsap;
      const media = gsap.matchMedia();
      media.add(
        "(min-width: 768px) and (pointer: fine) and (prefers-reduced-motion: no-preference)",
        () => {
          handoff.classList.add("is-horizontal");
          const distance = () => window.innerHeight * 1.1;
          const timeline = gsap.timeline({
            scrollTrigger: {
              id: "partner-handoff",
              trigger: partners,
              start: "top top",
              end: () => `+=${distance()}`,
              pin: partners,
              pinSpacing: true,
              scrub: true,
              anticipatePin: 1,
              invalidateOnRefresh: true,
            },
          });
          timeline.to(surface, { xPercent: 100, ease: "none", duration: 1 }, 0);
          // Cancel the incoming section's vertical travel while it enters from the left.
          timeline.fromTo(
            mission,
            { xPercent: -100, y: () => -distance() },
            { xPercent: 0, y: 0, ease: "none", duration: 1 },
            0,
          );
          return () => {
            handoff.classList.remove("is-horizontal");
          };
        },
      );
      return () => {
        media.revert();
        initialized.delete(handoff);
      };
    },
  };
})();
