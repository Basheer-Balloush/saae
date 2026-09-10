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
       to the footage rather than stamped onto it.
       Headlines enter by words, never by letters: each band headline is split
       once into word spans (the opening gradient headline is left untouched),
       and the words settle with a short stagger. Transform/opacity only. */
    const heroSection = document.getElementById("hero-sec");
    const splitBandWords = band => {
      band.querySelectorAll("h2").forEach(head => {
        if (head.querySelector(".hero-opening-line")) return;
        if (head.dataset.words === "1" && head.querySelector(".band-w")) return;
        const text = head.textContent.trim().split(/\s+/).filter(Boolean);
        if (!text.length) return;
        /* Keep the ORIGINAL child nodes, not a copy of their text. language.js
           hangs a __saaeLanguageSource expando on the text node it translates
           and reads it back to return to English; build a fresh node from the
           string and that expando is gone, so Arabic becomes a one-way trip. */
        head.__bandOriginal = Array.prototype.slice.call(head.childNodes);
        head.innerHTML = text.map(word => "<span class=\"band-word\" style=\"display:inline\">" +
          "<span class=\"band-w\" style=\"display:inline-block;will-change:transform,opacity\">" +
          word + "</span></span>").join(" ");
        head.dataset.words = "1";
      });
    };
    /* Splitting a heading into spans hides it from the translator.
       language.js rewrites TEXT NODES and keys on the whole trimmed string, so
       once a headline is eleven <span>s there is nothing left for it to match
       and the band headings simply stayed in English for the whole of the
       Arabic journey. text-effect.js solved this for the rest of the page and
       this file never did.

       Same contract as there: the event fires BEFORE the translation pass, so
       flatten the headings back to plain text nodes on the way in and re-split
       once the new copy has landed. */
    /* The hero's film timeline animates these spans, and it cannot hold targets
       that do not exist yet. Which file runs first is not something either of
       them should be guessing at -- this one owns the spans, so it says when
       they are there, both on first split and after every language pass. */
    const announceSplit = () => {
      window.dispatchEvent(new CustomEvent("saae:bandsplit"));
    };

    const unsplitBands = () => {
      if (!heroSection) return;
      heroSection.querySelectorAll("h2[data-words='1']").forEach(head => {
        const original = head.__bandOriginal;
        if (!original || !original.length) return;
        head.replaceChildren.apply(head, original);
        head.__bandOriginal = null;
        delete head.dataset.words;
      });
    };
    const onLanguage = () => {
      unsplitBands();
      /* After language.js has rewritten the nodes, not during. */
      window.setTimeout(() => {
        heroSection.querySelectorAll(".hero-band").forEach(splitBandWords);
        announceSplit();
        /* No gsap.set on the new spans: the film is rebuilt right after this
           and seeks itself to the current scroll position, which puts every
           word at exactly the value that position calls for. Setting them here
           would be a second engine writing the same nodes. */
      }, 0);
    };
    window.addEventListener("saae:languagechange", onLanguage);

    if (heroSection) {
      heroSection.querySelectorAll(".hero-band").forEach(splitBandWords);
      announceSplit();
      /* The band entrance used to live here: a 600ms word stagger and a 720ms
         line stagger, fired by the saae:band event -- that is, by a threshold
         being crossed. It was the third clock over a scrubbing picture, and the
         most visible one, because it moved the words themselves.

         It is not gone, it moved onto the playhead. The hero's film timeline in
         index.html animates these same spans, staggered across the camera move
         instead of across six tenths of a second, seeked from scroll position
         in the render loop. This file keeps what it is actually the expert in:
         SPLITTING the headings, which has to know that Arabic is cursive and
         must not be split by character, and re-splitting them when the language
         pass replaces the text nodes.

         Ownership, per this file's own rule at the top: motion.js splits the
         words, the film animates them, and nothing animates them twice. */
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
      window.removeEventListener("saae:languagechange", onLanguage);
      // matchMedia teardown: quickTo leaves inline transforms behind, so clear
      // them or a visitor switching to reduced motion keeps a stale offset.
      gsap.set(".button-link, .ribbon-cta, .community-list li, .story img", { clearProps: "transform" });
    };
  });

  /* The band counter has ONE writer, and it is the inline controller in
     index.html. A block here used to be a second: it drove a five-band grid
     scene through window.saaeHero.setBand() and stamped "0N / 05" into
     #ribbon-count on its own ScrollTrigger. That scene is gone -- setBand is a
     no-op stub on the current hero -- but the counter write outlived it, so
     the two writers took turns and the ribbon read "01 / 05" at one beat and
     "02 / 06" at the next on the same scroll. The journey has six bands now
     and the controller already reports them, so this file no longer touches
     the counter at all. */

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
