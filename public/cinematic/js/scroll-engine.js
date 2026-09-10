/* SAAE scroll engine.
 *
 * One feel for the whole document.
 *
 * Before this file there were two. The hero ran a critically damped spring in
 * its own rAF loop -- good, and measured: it converges, it never rings, and it
 * carries velocity, so a flick and a drag do not look the same. Everything
 * BELOW the hero ran on raw native scroll with ScrollTrigger reading it. So the
 * page changed character at the hero's exit: fourteen screens of glide, then a
 * hard cut to whatever the wheel does natively. That handoff is the part that
 * actually reads as "not smooth", and no amount of tuning inside the hero could
 * reach it, because the problem was on the other side of the boundary.
 *
 * Lenis (MIT, vendored at /cinematic/js/lenis.min.js) now owns the scroll position
 * for the whole document, and ScrollTrigger is told about every frame of it. The
 * hero spring stays -- it is doing a different job now. Lenis smooths the INPUT,
 * turning wheel notches into a continuous position; the spring smooths the
 * SCENE's approach to that position, which is what keeps a dropped frame from
 * stepping the film. Two stages, each with one job, rather than one stage trying
 * to do both.
 *
 * What it deliberately does not do:
 *
 *   touch      Lenis is left off touch entirely (syncTouch defaults false).
 *              Native momentum on a phone is better than anything a library
 *              can synthesise, and the phone gets the static hero anyway.
 *   reduced    A visitor who has asked for less motion is asking for exactly
 *              motion   the native scroll, so the engine never starts.
 *   anchors    autoRaf is off and the ticker drives it, so GSAP and Lenis
 *              share one clock instead of running two.
 */
(function () {
  "use strict";

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  const coarse = window.matchMedia("(pointer: coarse)");

  let lenis = null;

  /* ---- Pace ------------------------------------------------------------
   *
   * Two different numbers decide how a wheel notch feels, and it matters which
   * one you reach for:
   *
   *   wheelMultiplier   how far the page travels per notch. This is PACE.
   *                     Lower means the film plays slower for the same
   *                     gesture, and it costs nothing but wheel.
   *   duration          how long Lenis takes to deliver that travel. This is
   *                     LATENCY, not pace. Lengthening it does not slow the
   *                     film down -- the notch still buys the same travel --
   *                     it only makes the film later.
   *
   * They were confused here once. A hero duration of 1.55 was tried against
   * 1.35 on the theory that a longer glide would read as more cinematic; it
   * measured worse on every axis that was not noise (worst frame-to-frame
   * jerk on a flick 2.05 against 1.69, and 1257ms to settle against 952),
   * and it bought no extra dwell at all, because dwell is the multiplier's
   * job. So the whole of the slowdown lives in the multiplier and the
   * duration is one value for the whole document.
   *
   * The hero is slower than the rest of the page on purpose. It is fourteen
   * screens of one continuous shot and it wants to be walked through; the
   * sections below it are text, and text wants the pace the visitor already
   * has in their hands. Rather than switch between the two at the hero's edge
   * -- which would put a gear change exactly at the boundary this file exists
   * to smooth -- the hero hands back a 0..1 blend and the two paces are
   * interpolated across it.
   *
   * HERO_WHEEL is the one number to turn to make the film slower or faster.
   * Lower is slower. It is a multiplier on the browser's own notch, so .55 is
   * a little over half speed, and the hero's 1700vh is unchanged: this buys
   * dwell without making the page below any further away in pixels.
   */
  const HERO_WHEEL = .55;
  const PAGE_WHEEL = .72;
  const DURATION = 1.35;
  let paceAt = -1;

  function setPace(blend) {
    if (!lenis) return;
    const t = blend < 0 ? 0 : blend > 1 ? 1 : blend;
    /* Called every frame from the hero's own loop, so it must be cheap when
       nothing has moved. A hundredth of the blend is far below the point
       where a wheel notch would land differently. */
    if (paceAt >= 0 && Math.abs(t - paceAt) < .01) return;
    paceAt = t;
    const wheel = HERO_WHEEL + (PAGE_WHEEL - HERO_WHEEL) * t;
    /* The virtual scroll is constructed with a fresh options object rather
       than the instance's, so it keeps its own copy of the multiplier and
       that copy is the one the wheel handler reads. Both are written: neither
       is a documented setter, and if a future Lenis stops reading one of them
       the pace simply stays wherever the constructor put it. */
    if (lenis.virtualScroll && lenis.virtualScroll.options) {
      lenis.virtualScroll.options.wheelMultiplier = wheel;
    }
    lenis.options.wheelMultiplier = wheel;
  }

  /* Always defined, and a no-op while the engine is off, so the hero can call
     it every frame without asking whether there is an engine to call. */
  window.saaeScrollPace = setPace;

  function stop() {
    if (!lenis) return;
    if (window.gsap) window.gsap.ticker.remove(tick);
    lenis.destroy();
    lenis = null;
    paceAt = -1;
    window.saaeScroll = null;
    document.documentElement.classList.remove("has-smooth-scroll");
  }

  function tick(time) {
    /* gsap.ticker reports seconds; Lenis wants milliseconds. */
    if (lenis) lenis.raf(time * 1000);
  }

  function start() {
    if (lenis || !window.Lenis || !window.gsap) return;
    if (reduced.matches || coarse.matches) return;

    lenis = new window.Lenis({
      /* Duration-based easing rather than a raw lerp, so the distance a flick
         travels does not change how long it takes to arrive. The hero's own
         spring softens the last of it. */
      duration: DURATION,
      easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      /* The starting value only. The page opens in the hero, so it opens at
         the hero's pace, and setPace above owns it from the hero's first
         frame onward. */
      wheelMultiplier: HERO_WHEEL,
      /* Touch untouched, for the reason in the header. */
      syncTouch: false,
      /* The rail's own tween and any in-page anchor both go through Lenis
         rather than around it, so nothing else writes the scroll position. */
      autoRaf: false,
      anchors: false
    });

    /* ScrollTrigger reads window.scrollY, and Lenis moves it every frame
       without firing a native scroll event on some paths. This is the line
       that keeps every reveal on the page below the hero honest. */
    if (window.ScrollTrigger) {
      lenis.on("scroll", window.ScrollTrigger.update);
      /* Lenis translates nothing -- it writes real scroll positions -- so no
         scrollerProxy is needed and pins stay on the native path. */
      window.ScrollTrigger.refresh();
    }

    window.gsap.ticker.add(tick);
    /* GSAP's own lag smoothing fights a scroll engine: it silently stretches a
       slow frame, which is exactly the frame the hero needs reported honestly. */
    window.gsap.ticker.lagSmoothing(0);

    window.saaeScroll = lenis;
    document.documentElement.classList.add("has-smooth-scroll");
  }

  function sync() {
    if (reduced.matches || coarse.matches) stop();
    else start();
  }

  /* Both are live: a visitor can turn reduced motion on mid-visit, and the hero
     already tears itself down and back up when they do. */
  reduced.addEventListener("change", sync);
  coarse.addEventListener("change", sync);

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", sync, { once: true });
  } else {
    sync();
  }
})();
