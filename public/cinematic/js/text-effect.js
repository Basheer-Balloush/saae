/* SAAE per-word text effect.
 *
 * A vanilla port of the motion-primitives TextEffect pattern: readable text is
 * split into word (or character) spans, each given its own delay, so a line
 * assembles in reading order as it arrives and takes itself apart as it leaves.
 *
 * Why this rather than extending the existing block-level .scroll-text-reveal:
 * that reveal sets opacity and transform on the source element, and the page's
 * own component rules -- carousel slides, mission cards, flow panels -- set the
 * same properties on the same elements from CSS and from script. The reveal
 * kept losing those fights, which is why most of the page never visibly
 * animated. The injected spans are ours alone, so nothing overrides them.
 *
 * Two constraints shaped the implementation:
 *
 *   1. Arabic is cursive. Splitting an Arabic word per character breaks the
 *      joining forms and renders it as disconnected letters, so character mode
 *      silently falls back to word mode on any Arabic segment.
 *
  *   2. language.js translates by walking text nodes and rewriting nodeValue,
  *      keyed on the whole trimmed string. Split text would never match those
  *      keys. So this listens for saae:languagechange -- dispatched just before
  *      the translation pass -- puts the original text nodes back (the same node
  *      objects, so language.js's __saaeLanguageSource expando survives), and
  *      re-splits once the new copy is in place.
  *
  *   3. Every injected word span carries dir=auto. In Arabic mode a leftover
  *      Latin word (brand name, date, untranslated remnant) would otherwise
  *      inherit RTL and shed its trailing punctuation to the front
  *      (",announcement"); auto lets the word's own script decide.
  */
(() => {
  "use strict";

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const ARABIC = /[؀-ۿݐ-ݿﭐ-﷿ﹰ-﻿]/;

  /* Leaf text containers only. An element holding another candidate is a
     layout wrapper, and splitting both would nest the spans. */
  const CANDIDATES = "h1, h2, h3, h4, h5, h6, p, li, dt, dd, blockquote, figcaption, .eyebrow, .mission-index";
  const SCOPES = ["main", "footer"];
  const BLOCKED = ".hero-section, .hero-static, .site-loader, .language-wash, .mission-words, .sr-only, [aria-hidden='true']";
  /* Headings filled with the SAAE photo (background-clip:text) must stay
     whole. Splitting wraps every word in an inline-block .te-w that keeps a
     translate3d(0,0,0) even at rest, and a clipped background behind
     transformed descendants renders smeared/duplicated in Chromium -- it
     never heals, so these keep their block-level reveal instead. Any heading
     carrying .photo-head joins the two older photo-fill heads (.mark-photo
     on about.html and .closing-copy h2 on initiative.html) here. Every
     other heading is solid ink and splits safely. */
  const PHOTO_FILL_HEADS = ".mark-photo, .closing-copy h2, .photo-head";

  let observer = null;
  let tracked = [];
  let started = false;
  let fallbackActive = false;
  let fallbackTeardown = null;
  const noop = () => {};
  let stopVerifying = noop;

  const collect = () => {
    const found = [];
    SCOPES.forEach(scope => {
      document.querySelectorAll(`${scope} :is(${CANDIDATES})`).forEach(element => {
        if (found.includes(element)) return;
        if (!element.textContent.trim()) return;
        if (element.closest(BLOCKED)) return;
        if (element.matches(PHOTO_FILL_HEADS)) return;
        if (element.querySelector(CANDIDATES)) return;
        found.push(element);
      });
    });
    return found;
  };

  /* Splitting happens per text node, in place, so inline children -- links,
     <strong>, <br> -- keep their position and their behaviour. */
  const split = element => {
    const requested = element.closest("[data-text-effect-per]")?.dataset.textEffectPer || "word";

    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (!node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });

    const sources = [];
    while (walker.nextNode()) sources.push(walker.currentNode);
    if (!sources.length) return null;

    const records = [];
    const units = [];

    sources.forEach(node => {
      const holder = document.createElement("span");
      holder.className = "te-seg";
      // Character mode is only safe on non-cursive scripts.
      const perCharacter = requested === "char" && !ARABIC.test(node.nodeValue);

      // The capturing split keeps the runs of whitespace as their own chunks,
      // so they stay plain text between the spans and line wrapping is
      // unaffected by the inline-block words.
      node.nodeValue.split(/(\s+)/).forEach(chunk => {
        if (!chunk) return;

        if (!chunk.trim()) {
          holder.appendChild(document.createTextNode(chunk));
          return;
        }

        if (perCharacter) {
          const word = document.createElement("span");
          word.className = "te-word";
          /* Bidi guard: the page may be RTL while this word is Latin (an
             untranslated remnant, a brand name, a date). dir=auto lets the
             word's own first strong character decide, so trailing punctuation
             (",announcement") no longer jumps to the front. */
          word.setAttribute("dir", "auto");
          Array.from(chunk).forEach(character => {
            const unit = document.createElement("span");
            unit.className = "te-w";
            unit.textContent = character;
            word.appendChild(unit);
            units.push(unit);
          });
          holder.appendChild(word);
          return;
        }

        const unit = document.createElement("span");
        unit.className = "te-w";
        unit.setAttribute("dir", "auto");
        unit.textContent = chunk;
        holder.appendChild(unit);
        units.push(unit);
      });

      node.replaceWith(holder);
      records.push({ holder, original: node });
    });

    if (!units.length) {
      records.forEach(({ holder, original }) => holder.replaceWith(original));
      return null;
    }

    /* Long passages get a tighter step, or the last word of a paragraph would
       arrive seconds after the first. */
    const step = units.length > 40 ? 9 : units.length > 18 ? 16 : 28;
    units.forEach((unit, index) => {
      unit.style.setProperty("--te-delay", `${index * step}ms`);
      unit.style.setProperty("--te-delay-out", `${index * Math.min(step, 8)}ms`);
    });

    element.__teRecords = records;
    element.classList.add("te-ready");

    /* Hand this element over from the older block-level reveal, so the two
       systems do not fade the same text twice. */
    element.classList.remove("scroll-text-reveal");
    element.classList.add("is-text-visible");

    return element;
  };

  const restore = element => {
    const records = element.__teRecords;
    if (!records) return;
    records.forEach(({ holder, original }) => {
      if (holder.parentNode) holder.replaceWith(original);
    });
    element.__teRecords = null;
    element.__teSeen = false;
    element.classList.remove("te-ready", "is-te-in", "is-te-out", "te-out-up");
  };

  const teardown = () => {
    if (observer) observer.disconnect();
    observer = null;
    if (fallbackTeardown) fallbackTeardown();
    stopVerifying();
    tracked.forEach(restore);
    tracked = [];
  };

  const enter = element => {
    element.__teSeen = true;
    element.classList.remove("is-te-out", "te-out-up");
    element.classList.add("is-te-in");
  };

  const leave = (element, above) => {
    /* Nothing exits before it has entered: on the first pass every offscreen
       element reports as outside, and animating those out would start them
       from the wrong side. */
    if (!element.__teSeen) return;
    element.classList.toggle("te-out-up", above);
    element.classList.remove("is-te-in");
    element.classList.add("is-te-out");
  };

  /* Reveals every tracked element currently inside the viewport and reports
     whether any of them still needed it. Deliberately measures geometry rather
     than trusting a callback, so it serves as both the opening pass and a
     standing check that the observer is actually doing its job. */
  const revealVisible = () => {
    const height = window.innerHeight || document.documentElement.clientHeight;
    let stranded = false;
    tracked.forEach(element => {
      if (element.classList.contains("is-te-in")) return;
      const rect = element.getBoundingClientRect();
      if (rect.top >= height * .88 || rect.bottom <= 0) return;
      stranded = true;
      enter(element);
    });
    return stranded;
  };

  /* Fallback for the case where IntersectionObserver exists but never reports
     -- a page that is throttled or never composited, for instance. Split text
     starts at opacity 0, so a silent observer would leave the document blank;
     measuring rectangles on scroll is more expensive but cannot fail quietly. */
  const startRectFallback = () => {
    if (fallbackActive) return;
    fallbackActive = true;
    stopVerifying();
    if (observer) { observer.disconnect(); observer = null; }

    let frame = 0;
    const measure = () => {
      frame = 0;
      const height = window.innerHeight || document.documentElement.clientHeight;
      const bottom = height * .88;
      tracked.forEach(element => {
        const rect = element.getBoundingClientRect();
        if (rect.top < bottom && rect.bottom > 0) enter(element);
        else leave(element, rect.top < 0);
      });
    };
    const queue = () => { if (!frame) frame = window.requestAnimationFrame(measure); };

    /* Scroll drives the responsive path; the interval is insurance. If this
       fallback is running at all then something about the page's normal
       signals is already unreliable, and a stalled fallback would leave text
       hidden for good. */
    const tick = window.setInterval(measure, 300);

    fallbackTeardown = () => {
      window.removeEventListener("scroll", queue);
      window.removeEventListener("resize", queue);
      window.clearInterval(tick);
      if (frame) window.cancelAnimationFrame(frame);
      fallbackTeardown = null;
      fallbackActive = false;
    };

    window.addEventListener("scroll", queue, { passive: true });
    window.addEventListener("resize", queue, { passive: true });
    measure();
  };

  const build = () => {
    teardown();

    // Under reduced motion the page keeps its plain, fully composed text.
    if (reducedMotion.matches) return;

    tracked = collect().map(split).filter(Boolean);
    if (!tracked.length) return;

    /* Reveal whatever is already on screen right now, synchronously, before
       any observer gets a say. Split text starts at opacity 0, so if the
       reveal machinery ever failed the reader would be looking at a blank
       page. Nothing already in front of them depends on a callback. */
    revealVisible();

    if (!("IntersectionObserver" in window)) {
      startRectFallback();
      return;
    }

    let proved = false;
    observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) {
          leave(entry.target, entry.boundingClientRect.top < 0);
          return;
        }
        // One real intersection is enough to show the observer is reporting.
        proved = true;
        stopVerifying();
        enter(entry.target);
      });
    }, { threshold: 0, rootMargin: "0px 0px -12% 0px" });

    tracked.forEach(element => observer.observe(element));

    /* Trust, then verify. An observer that reports its opening batch and then
       goes quiet would leave the whole document blank, since split text starts
       at opacity 0. So until the observer has reported a single real
       intersection, keep checking against actual geometry that text sitting in
       the viewport has been revealed, and hand over to the rectangle pass if it
       has not.

       This has to keep checking rather than sample once: the hero dispatches
       scroll events of its own while it still fills the viewport, and at that
       point there is legitimately nothing on screen to reveal. */
    /* A timer, not a scroll listener. The hero suppresses document scrolling
       during playback, so scroll events are not a reliable heartbeat here --
       an earlier version hung its verification on them and never ran. */
    const verifyTimer = window.setInterval(() => {
      if (proved || fallbackActive) { stopVerifying(); return; }
      // Text sitting in the viewport and still hidden means nobody revealed it.
      if (revealVisible()) startRectFallback();
    }, 700);

    stopVerifying = () => {
      window.clearInterval(verifyTimer);
      stopVerifying = noop;
    };
  };

  /* The opening curtain owns the first seconds of the page. Starting before it
     lifts would spend the whole entrance behind the loader. */
  const start = () => {
    if (started) return;
    started = true;
    build();
  };

  const waitForOpening = () => {
    if (document.documentElement.classList.contains("hero-opening-ready")) {
      start();
      return;
    }
    const classWatcher = new MutationObserver(() => {
      if (!document.documentElement.classList.contains("hero-opening-ready")) return;
      classWatcher.disconnect();
      start();
    });
    classWatcher.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    // A page that never runs the loader (direct anchor, static fallback) still
    // gets its text.
    window.setTimeout(start, 6000);
  };

  /* language.js swaps text node values under us. Give it the original nodes
     back, let it translate, then split the new copy. */
  window.addEventListener("saae:languagechange", () => {
    if (!started) return;
    teardown();
    window.setTimeout(build, 0);
  });

  reducedMotion.addEventListener("change", () => {
    if (started) build();
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", waitForOpening);
  } else {
    waitForOpening();
  }
})();
