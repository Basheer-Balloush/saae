/* home-mobile.js — phone-portrait behaviour for the home page.
 *
 * WHY THIS FILE EXISTS: two things CSS cannot express.
 *  1. Counters that count up: on desktop the four figures are painted from
 *     the film's scroll position; on a phone the film never runs, so the
 *     static totals would otherwise just sit there. An IntersectionObserver
 *     counts each .hero-stats dd from 0 to its data-count once, then stops.
 *  2. Scroll-linked landing motion: the static hero photograph drifts a few
 *     dozen pixels under the scroll (transform only, compositor-owned).
 *
 * HARD RULES (project architecture — never broken here):
 * - No wheel/touch interception, no preventDefault on scroll input, no
 *   scrollTo/scrollTop writes, no location.hash writes, no second smoother.
 *   Scroll position is READ; visuals are driven from it. That is all.
 * - Classic script (no imports/exports). Every query result is guarded.
 * - No-op unless the phone gate matches: portrait + coarse pointer. Leaving
 *   the gate (rotation, desktop resize) stops the parallax and restores the
 *   photograph; a count already in flight is allowed to finish so text never
 *   strands mid-number.
 * - Reduced motion: neither effect runs; the markup already holds the final
 *   totals, which is the correct resting state.
 */
(function () {
  "use strict";

  /* MatchMedia can be absent in very old browsers; guarded like everything. */
  var phoneGate = window.matchMedia
    ? window.matchMedia("(orientation: portrait) and (pointer: coarse)")
    : null;
  var motionGate = window.matchMedia
    ? window.matchMedia("(prefers-reduced-motion: reduce)")
    : null;

  function isPhone() {
    return !!phoneGate && phoneGate.matches;
  }

  function isReduced() {
    return !!motionGate && motionGate.matches;
  }

  /* ---- 1. Counters -------------------------------------------------------- */
  var statsSeen = false;
  var statsObserver = null;

  function formatCount(value, target, exact) {
    /* Same rendering as the desktop film: en-US grouping, "+" only on the
     * published total (mid-count "4,741+" would invent a number SAAE never
     * published), never on the exact communities figure. */
    var text = Math.round(value).toLocaleString("en-US");
    if (value >= target && !exact) text += "+";
    return text;
  }

  function countUp(dd) {
    var target = Number(dd.getAttribute("data-count"));
    if (!isFinite(target) || target <= 0) return;
    var exact = dd.hasAttribute("data-exact");
    var duration = 1300;
    var startedAt = 0;

    function frame(now) {
      if (!startedAt) startedAt = now;
      var t = (now - startedAt) / duration;
      if (t > 1) t = 1;
      /* Ease-out cubic: fast arrival, soft landing. Pure arithmetic — no
       * layout, no style reads, nothing the compositor must wait for. */
      var eased = 1 - Math.pow(1 - t, 3);
      dd.textContent = formatCount(target * eased, target, exact);
      if (t < 1) {
        window.requestAnimationFrame(frame);
      } else {
        dd.textContent = formatCount(target, target, exact);
      }
    }

    if (window.requestAnimationFrame) {
      window.requestAnimationFrame(frame);
    }
  }

  function armCounters() {
    if (statsSeen || statsObserver) return;
    if (!("IntersectionObserver" in window)) return;
    var stats = document.querySelector(".hero-stats");
    if (!stats) return;
    statsObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        /* A count started on desktop would fight the film's own scroll-driven
         * digits; wait for the phone gate instead of firing here. */
        if (!isPhone() || !entry.isIntersecting || statsSeen) return;
        statsSeen = true;
        var numbers = stats.querySelectorAll("dd[data-count]");
        Array.prototype.forEach.call(numbers, countUp);
        if (statsObserver) {
          statsObserver.disconnect();
          statsObserver = null;
        }
      });
    }, { threshold: 0.4 });
    statsObserver.observe(stats);
  }

  /* ---- 2. Landing parallax ------------------------------------------------ */
  var frameEl = null;
  var heroEl = null;
  var parallaxOn = false;
  var parallaxQueued = false;
  var scrollBound = false;

  function updateParallax() {
    parallaxQueued = false;
    if (!parallaxOn || !frameEl || !heroEl) return;
    /* Clamped to the hero's own reach so a long page cannot accumulate a
     * large offset; 12% of scroll keeps the drift to tens of pixels. The
     * 1.08 scale (applied together with the shift, never alone) keeps the
     * cover image edge-to-edge while it moves. Transform only. */
    var y = window.scrollY || window.pageYOffset || 0;
    if (y < 0) y = 0;
    var limit = heroEl.offsetHeight + window.innerHeight;
    if (y > limit) y = limit;
    frameEl.style.transform =
      "translate3d(0," + (y * 0.12).toFixed(1) + "px,0) scale(1.08)";
  }

  function requestParallax() {
    if (parallaxQueued || !parallaxOn) return;
    parallaxQueued = true;
    window.requestAnimationFrame(updateParallax);
  }

  function onScrollResize() {
    requestParallax();
  }

  function syncMode() {
    var active = isPhone() && !isReduced();
    parallaxOn = active;
    if (!active) {
      /* Leaving the gate restores the photograph exactly: no inline style,
       * no leftover offset on rotation back to the film. */
      if (frameEl) frameEl.style.transform = "";
      parallaxQueued = false;
      return;
    }
    if (!scrollBound) {
      scrollBound = true;
      window.addEventListener("scroll", onScrollResize, { passive: true });
      window.addEventListener("resize", onScrollResize, { passive: true });
    }
    armCounters();
    requestParallax();
  }

  /* ---- Boot ---------------------------------------------------------------- */
  if (!phoneGate) return;
  frameEl = document.getElementById("static-frame");
  heroEl = document.querySelector(".hero-static");
  if (!frameEl || !heroEl) return;

  if (typeof phoneGate.addEventListener === "function") {
    phoneGate.addEventListener("change", syncMode);
  } else if (typeof phoneGate.addListener === "function") {
    phoneGate.addListener(syncMode);
  }
  if (motionGate) {
    if (typeof motionGate.addEventListener === "function") {
      motionGate.addEventListener("change", syncMode);
    } else if (typeof motionGate.addListener === "function") {
      motionGate.addListener(syncMode);
    }
  }
  syncMode();
})();
