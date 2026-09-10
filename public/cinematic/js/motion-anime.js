/* SAAE anime.js motion layer.
 *
 * A third motion file, and the split between the three is deliberate:
 *
 *   sections.js   behaviour the page genuinely offers (the two carousels).
 *                 Must run even with no animation library and under reduced
 *                 motion, because it decides what is on screen, not how it
 *                 arrives.
 *   motion.js     GSAP. Owns the landing page: hero band copy, button lift,
 *                 the community index, story images, the section heading rule.
 *   THIS FILE     anime.js. Owns the things nothing owned: the five pages
 *                 below the landing page, which shipped with no motion layer
 *                 at all, plus the shapes GSAP was never pointed at -- card
 *                 grids, SVG line work, counted figures.
 *
 * The one rule that keeps three engines from fighting: NOTHING here animates
 * an element another file already animates. Ownership is checked, not assumed
 * -- see `owned()` and the ASSIST list. Two libraries writing transform on the
 * same node is the bug this file is written to avoid, not to demonstrate.
 *
 * Text is not this file's business either. text-effect.js already splits copy
 * into per-word spans AND handles the two things that make that dangerous
 * here: Arabic is cursive, so character splitting is wrong, and the language
 * switch rewrites text nodes wholesale, which would throw injected spans away.
 * That was solved once. This file animates boxes, paths and numbers, and
 * leaves every word to the file that knows about them.
 *
 * Reduced motion is a hard exit, not a shorter duration: the composed state
 * the stylesheet gives each page is already correct, so the honest behaviour
 * is to leave it alone.
 */
(() => {
  "use strict";

  const A = window.anime;
  if (!A || !A.animate) return;

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");

  /* --------------------------------------------------------------- mode ---
     'assist' is the landing page: GSAP and text-effect.js are already live
     there, so this file restricts itself to what neither of them touches.
     'full' is every other page, which had nothing. The default is inferred
     from whether GSAP is present, and can be stated outright on <html>. */
  const mode = document.documentElement.dataset.animeMode
    || (window.gsap ? "assist" : "full");

  /* Selectors another file is known to drive. Anything matching, or sitting
     inside something matching, is off limits. */
  const OWNED = [
    ".hero-section",          // hero-instrument.js + motion.js band copy
    ".hero-static",
    ".button-link", ".ribbon-cta",   // motion.js quickTo lift
    ".community-list li",            // motion.js quickTo slide
    ".story img",                    // motion.js quickTo scale
    ".section-heading",              // motion.js scrubbed rule
    ".flow", ".flow-slide",          // sections.js carousels
    ".mission-reel", ".mission-card",
    ".te-w", ".band-w",              // split word spans
    ".sr-only", ".site-loader", ".language-wash"
  ].join(",");

  /* A second, narrower list. These elements ARE driven by another file, but
     only as containers -- about.html's inline observer fades whole sections
     in, and about-v2.js does the same through [data-reveal]. Their contents
     are nobody's, so this list is matched on the element itself and not on
     its ancestors, or every child of an animated section would be excluded
     and these two pages would keep the coarse whole-section fade they have. */
  const OWNED_SELF = ".reveal, [data-reveal]";

  const owned = el => !!el.closest(OWNED) || el.matches(OWNED_SELF);

  const list = sel => Array.from(document.querySelectorAll(sel))
    .filter(el => !owned(el));

  /* anime.js ships onScroll as its own observer. Used rather than an
     IntersectionObserver by hand because it gives enter/leave thresholds in
     the same vocabulary as the animations, and because it tears itself down. */
  const onScroll = A.onScroll;
  const stagger = A.stagger;

  /* The reference easing.

     out(3) starts at full speed and decays, which is snappy and reads as
     hurried: the eye gets the whole movement in the first third and then
     watches it creep. inOut(2.4) leads in and settles out, so an entrance has
     a beginning as well as an end, and it is what lets these durations be long
     without feeling slack.

     Durations are deliberately unhurried -- around a second, against the 600
     to 760ms that is the reflexive choice. Nothing on this site is a UI
     control giving feedback to a click; every one of these is a piece of a
     page arriving while somebody reads, and at that job a fast entrance just
     reads as a flinch. */
  const EASE = "inOut(2.4)";
  const RISE_MS = 1050;
  const SETTLE = A.createSpring ? A.createSpring({ stiffness: 74, damping: 16 }) : EASE;

  /* Everything registered here is torn down when reduced motion turns on and
     rebuilt when it turns off, so the preference can change without a reload
     the way motion.js's gsap.matchMedia() already allows. */
  let live = [];
  const keep = x => { if (x) live.push(x); return x; };

  /* The watchdog below has to fire AFTER the slowest entrance has finished, or
     it rescues elements that were simply waiting their turn and snaps them on
     mid-stagger. A fixed delay cannot know that, and it silently became wrong
     the moment the durations here were lengthened, so the deadline is recorded
     as the animations are built rather than guessed. */
  let slowestMs = 0;
  const takes = ms => { if (ms > slowestMs) slowestMs = ms; };

  function teardown() {
    live.forEach(x => {
      try { if (typeof x === "function") x(); else if (x.revert) x.revert(); else if (x.pause) x.pause(); }
      catch (e) { /* a torn-down observer is still torn down */ }
    });
    live = [];
    slowestMs = 0;
    /* Clear anything left mid-flight, or a visitor switching preference keeps
       a half-applied transform. */
    document.querySelectorAll("[data-anime-touched]").forEach(el => {
      el.style.removeProperty("transform");
      el.style.removeProperty("opacity");
      el.style.removeProperty("filter");
      el.removeAttribute("data-anime-touched");
    });
  }

  const mark = els => els.forEach(el => el.setAttribute("data-anime-touched", ""));

  /* ------------------------------------------------------------- reveals ---
     One entrance, applied to whatever a page nominates. The elements are hid-
     den by script rather than by stylesheet on purpose: if this file never
     runs -- blocked, failed, reduced motion -- the page is composed and
     readable, and nothing is stuck at opacity 0 waiting for a library. */
  function rise(els, opts) {
    if (!els.length) return;
    const o = opts || {};
    mark(els);
    A.set(els, { opacity: 0, translateY: o.y == null ? 26 : o.y });
    takes((o.duration || RISE_MS) + (o.stepDelay || 0) * (els.length - 1));
    els.forEach((el, i) => {
      keep(A.animate(el, {
        opacity: 1,
        translateY: 0,
        duration: o.duration || RISE_MS,
        delay: (o.stepDelay || 0) * i,
        ease: o.ease || EASE,
        autoplay: onScroll ? onScroll({ target: el, enter: "bottom-=60 top", leave: "top bottom" }) : true
      }));
    });
  }

  /* A grid arrives from its centre outward rather than in reading order: with
     twenty-three plates, a straight top-left stagger reads as a list loading,
     while a centre-out one reads as a set assembling. */
  function grid(els, cols, opts) {
    if (!els.length) return;
    const o = opts || {};
    mark(els);
    A.set(els, { opacity: 0, scale: 0.9, translateY: 22 });
    const rows = Math.ceil(els.length / cols);
    takes((o.duration || 1180) + (o.step || 42) * (cols + rows));
    keep(A.animate(els, {
      opacity: 1,
      scale: 1,
      translateY: 0,
      duration: o.duration || 1180,
      delay: stagger(o.step || 42, { grid: [cols, rows], from: o.from || "center" }),
      ease: SETTLE,
      autoplay: onScroll ? onScroll({
        container: undefined,
        target: els[0].parentElement || els[0],
        enter: "bottom-=40 top",
        leave: "top bottom"
      }) : true
    }));
  }

  /* --------------------------------------------------------------- lines ---
     SVG stroke work draws itself in. createDrawable is the reason anime.js is
     here rather than another GSAP block: it reads each path's own length and
     handles the dash maths, which is what makes a mark of ninety segments a
     two-line call instead of a loop with getTotalLength in it. */
  function draw(paths, opts) {
    if (!A.svg || !A.svg.createDrawable || !paths.length) return;
    const o = opts || {};
    let drawables;
    try { drawables = A.svg.createDrawable(paths); }
    catch (e) { return; }
    mark(paths);
    takes((o.duration || 2100) + (o.step || 16) * paths.length);
    keep(A.animate(drawables, {
      draw: "0 1",
      duration: o.duration || 2100,
      delay: stagger(o.step || 16),
      ease: "inOut(2)",
      autoplay: onScroll ? onScroll({
        target: paths[0].ownerSVGElement || paths[0],
        enter: "bottom-=80 top",
        leave: "top bottom"
      }) : true
    }));
  }

  /* -------------------------------------------------------------- numbers ---
     A published figure counts up to itself when it arrives. The text is read
     from the element, so nothing here invents or holds a number: whatever the
     page says is the target, and the final frame is exactly the original
     string, punctuation and suffix included. */
  function count(els) {
    els.forEach(el => {
      const original = el.textContent.trim();
      const m = original.match(/^([^\d]*)([\d][\d,\.\s]*)(.*)$/);
      if (!m) return;
      const digits = m[2].replace(/[,\s]/g, "");
      const target = Number(digits);
      if (!isFinite(target) || target <= 0) return;
      const grouped = m[2].indexOf(",") >= 0;
      const state = { v: 0 };
      mark([el]);
      keep(A.animate(state, {
        v: target,
        duration: Math.min(3000, 1000 + String(target).length * 240),
        ease: "out(3)",
        onUpdate: () => {
          const n = Math.round(state.v);
          el.textContent = m[1] + (grouped ? n.toLocaleString("en-US") : String(n)) + m[3];
        },
        onComplete: () => { el.textContent = original; },
        autoplay: onScroll ? onScroll({ target: el, enter: "bottom-=40 top" }) : true
      }));
    });
  }

  /* ---------------------------------------------------------------- hover ---
     The landing page has this through GSAP quickTo. The other pages had
     nothing, so a card was a rectangle that changed colour. createAnimatable
     keeps one interpolator per element instead of starting a tween per pointer
     event, which is what makes a fast traverse across a grid of twenty-three
     plates cost nothing. */
  function hover(els, lift) {
    if (!A.createAnimatable || !els.length) return;
    els.forEach(el => {
      const a = A.createAnimatable(el, { y: 460, scale: 480, ease: "out(2.5)" });
      mark([el]);
      keep(() => { try { a.revert(); } catch (e) {} });
      const on = () => { a.y(lift == null ? -6 : lift); a.scale(1.02); };
      const off = () => { a.y(0); a.scale(1); };
      el.addEventListener("pointerenter", on);
      el.addEventListener("pointerleave", off);
      /* Keyboard users get the same affordance, the way motion.js does it. */
      el.addEventListener("focusin", on);
      el.addEventListener("focusout", off);
      keep(() => {
        el.removeEventListener("pointerenter", on);
        el.removeEventListener("pointerleave", off);
        el.removeEventListener("focusin", on);
        el.removeEventListener("focusout", off);
      });
    });
  }

  /* -------------------------------------------------------------- parallax ---
     Scroll-linked rather than triggered: sync:true hands the animation the
     scroll position itself, so it scrubs both ways and lands back exactly
     where it started. That reversibility is the same property the hero's
     scrub is held to, and it is why this is a scroll SYNC and not a tween
     fired on enter. */
  function drift(els, distance) {
    if (!onScroll || !els.length) return;
    mark(els);
    els.forEach(el => {
      keep(A.animate(el, {
        translateY: [distance == null ? 34 : distance, 0],
        ease: "linear",
        autoplay: onScroll({ target: el, enter: "bottom top", leave: "top bottom", sync: true })
      }));
    });
  }

  /* ============================================================ per page === */

  function build() {
    const page = document.body.dataset.page
      || (location.pathname.split("/").pop() || "index.html").replace(/\.html$/, "")
      || "index";

    if (mode === "assist") {
      /* The landing page. GSAP has the copy, the buttons, the index and the
         heading rules; sections.js has both carousels. What was left without
         any entrance at all is the furniture: the FAQ rows, the footer
         columns and the map card. */
      /* The FAQ rows and most of the page already carry .reveal, which the
         inline controller drives, so they are owned and skipped. What is left
         with no entrance of its own is the footer: its three columns, the map
         card and the social row all appear fully formed. */
      rise(list(".footer-col, .footer-map, .footer-identity"), { y: 22, stepDelay: 135 });
      rise(list(".footer-social a"), { y: 14, stepDelay: 95, duration: 820 });
      hover(list(".footer-social a"), -3);
      count(list("[data-count]"));
      return;
    }

    /* ---- every other page ------------------------------------------------ */

    /* The shared furniture each of these pages carries. */
    rise(list("main > section > .head, main > section > header, .section-intro"), { y: 24, stepDelay: 130 });
    rise(list(".footer-col, .footer-logo"), { y: 20, stepDelay: 120 });
    count(list("[data-count]"));

    if (page === "partners") {
      /* Twenty-three plates that appeared all at once, fully formed. */
      grid(list(".partner-plate"), 5, { step: 58 });
      hover(list(".partner-plate"), -6);
    }

    if (page === "contact") {
      rise(list(".line-card"), { y: 26, stepDelay: 120 });
      rise(list(".aside-card"), { y: 22, stepDelay: 135 });
      hover(list(".line-card"), -5);
      drift(list(".markstage"), 42);
    }

    if (page === "initiative") {
      /* .reveal is initiative.js's own IntersectionObserver, so it is owned
         and left alone. These are the shapes it never covered. */
      grid(list(".impact"), 3, { step: 74 });
      rise(list(".path-visual"), { y: 28, stepDelay: 160 });
      hover(list(".action, .impact"), -5);
      draw(Array.from(document.querySelectorAll(".hero-tree path, .tree-visual path, svg.initiative-tree path"))
        .filter(el => !owned(el)), { duration: 2400, step: 20 });
    }

    if (page === "news") {
      rise(list(".featured"), { y: 30 });
      rise(list("li.story"), { y: 26, stepDelay: 130 });
      hover(list("li.story, .featured"), -6);
    }

    if (page === "about") {
      /* The live About page: every link on the site points here. Its own
         inline observer fades three whole sections in and stops there, so the
         nine communities, the three pillars and the four figures inside them
         arrived already composed. They arrive one at a time now. */
      rise(list(".pillar-word"), { y: 24, stepDelay: 130 });
      rise(list(".community"), { y: 18, stepDelay: 82 });
      count(list(".num"));
    }

    if (page === "about-v2") {
      rise(list(".chapter"), { y: 26, stepDelay: 105 });
      rise(list(".branch"), { y: 22, stepDelay: 120 });
      hover(list(".chapter"), -4);
    }
  }

  /* ------------------------------------------------------------ watchdog ---
     Everything above hides an element before promising to bring it back, and
     that promise is kept by a scroll observer inside a third-party library. If
     the promise is ever broken the failure is not a missing animation, it is
     MISSING CONTENT, which is the worst outcome on the page and the one thing
     this layer must not be able to cause.

     So it is checked rather than trusted. A second after the layer is built,
     and again after load, anything this file hid that is currently on screen
     and still fully transparent is simply shown. A visitor never pays for a
     library's bad day.

     This is not hypothetical: the first version of this file passed
     `sync: false` to onScroll, which silently disables playback altogether
     rather than erroring, and left every revealed element at opacity 0 on a
     page with no console error to show for it. */
  function unstick() {
    let rescued = 0;
    document.querySelectorAll("[data-anime-touched]").forEach(el => {
      const r = el.getBoundingClientRect();
      const onScreen = r.bottom > 0 && r.top < (window.innerHeight || 0) && r.width > 0;
      if (!onScreen) return;
      if (parseFloat(getComputedStyle(el).opacity) > 0.01) return;
      el.style.setProperty("opacity", "1");
      el.style.removeProperty("transform");
      rescued++;
    });
    return rescued;
  }

  function sync() {
    teardown();
    if (reduced.matches) return;
    try {
      build();
    } catch (e) {
      /* A throw halfway through build leaves some elements hidden and their
         animations never registered. Show everything this file touched and
         let the page be a page. */
      document.querySelectorAll("[data-anime-touched]").forEach(el => {
        el.style.setProperty("opacity", "1");
        el.style.removeProperty("transform");
      });
      return;
    }
    /* Slowest scheduled entrance, plus a second of margin for a busy frame. */
    const deadline = Math.max(1500, slowestMs + 1000);
    window.setTimeout(unstick, deadline);
    window.addEventListener("load", () => window.setTimeout(unstick, deadline), { once: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", sync, { once: true });
  } else {
    sync();
  }

  /* Same contract as motion.js: the preference can change without a reload. */
  if (reduced.addEventListener) reduced.addEventListener("change", sync);
  else if (reduced.addListener) reduced.addListener(sync);
})();
