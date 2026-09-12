/* SAAE checkpoints.
 *
 * Thirty-three screens is a long way to the part a visitor came for. The film
 * alone is twenty-one of them, and it is the best thing on the page: the answer
 * is not to shorten it, it is to let someone who already knows what they want
 * arrive at it without scrolling past everything else first.
 *
 * This is the only file on the landing page that moves the scroll position on
 * purpose, and it stays inside the rule the rest of the page is built on
 * (home-inline.js:1083):
 *
 *   The engine reads where the document already is; it never decides where it
 *   should be.
 *
 * So a checkpoint moves the DOCUMENT and touches no animation. Everything below
 * the hero is a pure function of scroll -- updatePageJourney recomputes the
 * surface colour, the mission words, the active copy panel and the ribbon label
 * from getBoundingClientRect on every scroll event -- and the hero is a spring
 * chasing a progress value re-read from scroll every frame. Put the page at an
 * offset and all of it paints itself, exactly as if the reader had wheeled
 * there. Nothing here writes a transform, an opacity or a custom property.
 *
 * What it must not do, measured rather than assumed:
 *
 *   The ribbon's four section links were plain in-page anchors, and on desktop
 *   they did not work. Lenis is constructed with anchors:false
 *   (scroll-engine.js:139), so the browser's own jump moves window.scrollY
 *   behind its back; on the next frame Lenis writes its own position back and
 *   the reader is dragged to the top of the hero with #mission still in the
 *   URL. Measured: 0 -> 19519 on click, 19519 -> 277 one frame later. Every
 *   move here goes THROUGH the engine for that reason. Lenis writes real
 *   scroll positions, which fire real scroll events, which is what keeps every
 *   painter and ScrollTrigger honest.
 */
(() => {
  "use strict";

  const hero = document.getElementById("hero-sec");
  if (!hero) return;

  const reel = document.getElementById("mission-reel");
  const ribbonNav = document.querySelector(".ribbon-nav");
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const topOf = element => Math.round(element.getBoundingClientRect().top + window.scrollY);
  const limit = () => Math.max(0, document.documentElement.scrollHeight - window.innerHeight);

  /* ---- Geometry ---------------------------------------------------------
     Each of these is a painter's own reading of the page, solved for the
     scroll position instead of the progress. readHeroProgress derives its
     value as -rect.top / (offsetHeight - innerHeight) (home-inline.js:812) and
     the mission reel is read the same way by stickyProgress; inverted, they
     answer the only question a checkpoint asks -- where does the document have
     to be for this frame to be the one on screen.

     Derived rather than stored as pixels, which is what makes this survive a
     resize, a language change and an edit to the markup: every number below is
     a fraction of something the DOM measures for itself. */
  const heroAt = p =>
    topOf(hero) + Math.round(clamp(p, 0, 1) * Math.max(1, hero.offsetHeight - window.innerHeight));

  const missionAt = index => {
    const steps = document.querySelectorAll(".mission-item").length || 1;
    const span = Math.max(1, reel.offsetHeight - window.innerHeight);
    return topOf(reel) + Math.round(((index + .5) / steps) * span);
  };

  /* Mid-dwell, not the moment of arrival. CAPTION_CUES (home-inline.js:567)
     gives each caption an enter window and an exit window; the stretch between
     them is where that band is the only thing being said. These are the
     midpoints of those stretches, so a checkpoint lands on a composed frame
     with the caption fully up, rather than on the first frame it becomes
     legible with the camera still moving under it.

     Copied rather than imported, because home-inline.js is not a module and
     exports nothing. They are the only numbers in this file that cannot be
     derived from the DOM: if the cue table moves, these move with it. */
  const BEATS = [0, .2275, .432, .604, .776, .937];

  /* And the stretches between them, which are the same cue table read the other
     way round: every exit window in CAPTION_CUES is a crossing, where one
     caption is leaving and the next has not arrived. Stopping inside one of
     these is the whole problem -- it is the only place on the film where a
     reader can come to rest and find a half-faded line over a moving picture,
     or nothing at all. Everywhere else is a dwell, and a dwell is composed at
     any point in it, which is why the magnet below leaves those completely
     alone. */
  const CROSSINGS = [[.055, .135], [.320, .372], [.492, .544], [.664, .716], [.836, .874]];

  /* ---- The registry -----------------------------------------------------
     Two kinds, and the difference is not cosmetic.

     A rail point is a destination: a real section with a heading, so it carries
     a hash and takes focus when the reader arrives, the way any skip link does.
     A beat is only a position -- a frame of the film, a word in the mission
     reel. Those are aria-hidden graphics with nothing to announce and nothing
     to focus, so they appear in the stepping order and nowhere else. Handing
     focus to a decorative frame would be announcing scenery. */
  const points = [];
  const rail = (id, element) => {
    if (element) points.push({ id, element, hash: id, rail: true, at: () => topOf(element) });
  };

  BEATS.forEach((p, index) => points.push({ id: "beat-" + index, at: () => heroAt(p) }));
  rail("news", document.getElementById("news"));
  rail("partners", document.getElementById("partners"));

  if (reel) {
    /* The mission section's own top is 72px above the reel, and landing there
       shows an empty screen: the sticky frame has not engaged and every word is
       still at zero strength. The section's checkpoint is its first WORD at
       full strength instead, which is the first thing about it worth seeing.
       The steps after it are beats. */
    points.push({
      id: "mission",
      element: document.getElementById("mission"),
      hash: "mission",
      rail: true,
      at: () => missionAt(0)
    });
    const steps = document.querySelectorAll(".mission-item").length;
    for (let index = 1; index < steps; index += 1) {
      points.push({ id: "mission-" + index, at: () => missionAt(index) });
    }
  } else {
    rail("mission", document.getElementById("mission"));
  }

  rail("faq", document.getElementById("faq"));

  /* ---- Measurement ------------------------------------------------------
     Cached, and deliberately so. Resolving a point reads layout, and the two
     paths that need an offset -- marking the current chapter on scroll, and
     stepping on a keypress -- are both paths this page keeps clear of forced
     layout on principle. So offsets are resolved on the events that can
     actually change them, and read from memory everywhere else. The body
     observer is the one that earns its place: this document grows by thousands
     of pixels as the hero video and the fonts settle, and no resize event is
     fired when it does. */
  function measure() {
    const ceiling = limit();
    points.forEach(point => { point.offset = clamp(point.at(), 0, ceiling); });
    points.sort((a, b) => a.offset - b.offset);
    mark();
  }

  /* ---- Travel -----------------------------------------------------------
     Two ways to cross the page, chosen by distance, and the long one is the
     interesting half.

     A short hop is scrubbed: Lenis animates through every intermediate
     position, the film and the reel move under it, and the reader watches
     themselves travel. That is right between neighbouring beats.

     A long hop is not. Twenty screens of footage at ten thousand pixels a
     second is not the scroll experience preserved, it is the scroll experience
     smeared -- and it is a seek storm besides, because the hero scrubs a video
     by currentTime through a coalesced seek (home-inline.js:789) that a
     traverse asks to land twenty screens of keyframes in about a second. So a
     long move CUTS to one screen short of the destination and then plays that
     last screen at reading pace. The reader sees the destination arrive with
     its own entrance intact, which is the part worth keeping, and a site built
     as a film gets a cut rather than a fast-forward.

     CUT_SCREENS is the one number to turn. Raise it and more moves are
     scrubbed; set it to Infinity and every move is a full traverse, which is
     worth watching once to see why it is not the default. */
  /* ---- Tuning -----------------------------------------------------------
     Every number that decides how this FEELS, in one place and live at
     runtime, because feel is not a thing that can be settled by reading the
     code or by checking that a landing is pixel-exact. It has to be sat with,
     at speed, by someone who knows what the film is supposed to do -- and a
     rebuild between every adjustment is how a knob ends up left at whatever
     the first guess was. saaeCheckpoints.tune({ ... }) writes these live.

       wait    seconds of stillness before the magnet acts at all. Lower is
               more eager, and too low starts fighting a reader who is only
               pausing to read.
       glide   how long the magnet takes to close the distance.
       magnet  "crossings" only acts in the fade between two captions, which
               is the conservative reading. "nearest" is the full magnet: it
               settles to the closest moment whenever one is within reach,
               which is what makes the film feel like stations rather than a
               road. "off" disables it entirely.
       reach   for "nearest", how far it will reach, in screens. A moment
               further away than this is left alone, on the grounds that
               stopping there was deliberate.
       cut     a move longer than this many screens cuts rather than scrubs.
       settle  how long the last screen of a cut takes.
       hop     how long a short move takes. */
  const DEFAULTS = {
    wait: .22,
    glide: .75,
    magnet: "crossings",
    reach: 1.2,
    cut: 2.5,
    settle: .9,
    hop: 1.1
  };
  const tuning = Object.assign({}, DEFAULTS);

  function travel(point) {
    /* Measured here rather than trusted from the cache, and the difference is
       not theoretical: this page settles about 145px internally after load --
       a font swap above the reel -- without changing the box of document.body,
       so neither the resize event nor the body observer fires and the cached
       offset stays 145px stale. Landing 145px out is landing an eighth of a
       step out, which in the mission reel is the difference between one word
       at full strength and two words at half. A gesture can afford one layout
       read; the scroll path, which is the reason the cache exists at all, still
       never takes one. */
    measure();
    const engine = window.saaeScroll;
    const from = window.scrollY;
    const to = point.offset;
    if (Math.abs(to - from) < 2) { land(point); return; }
    /* A deliberate move to a named place outranks the magnet, which must not
       be allowed to reach for a crossing the travel is only passing through. */
    gliding = true;

    /* Touch and reduced motion never start an engine (scroll-engine.js), and
       both are right not to: one has native momentum better than anything a
       library synthesises, the other has asked for less motion and a scripted
       glide is more of it. With nothing owning the scroll position there is
       nothing to desync, so the platform call is the correct one here -- and
       it is the only path on which the old plain anchors ever worked. */
    if (!engine) {
      window.scrollTo({ top: to, behavior: reduced.matches ? "auto" : "smooth" });
      land(point);
      return;
    }

    if (Math.abs(to - from) > tuning.cut * window.innerHeight) {
      const approach = to + (to > from ? -1 : 1) * window.innerHeight;
      engine.scrollTo(approach, { immediate: true, force: true });
      /* Announced between the cut and the settle, never after. The two things
         on this page that are not pure functions of scroll -- the hero spring
         and the one-shot reveals -- have to be reconciled at the approach point
         before the last screen plays, or the settle plays over a page still
         catching up with itself. home-inline.js listens for this. */
      window.dispatchEvent(new CustomEvent("saae:jump", { detail: { from, to } }));
      /* And again, because the cut is itself a layout event: sticky frames
         engage, images below the fold enter their range, and the reveals the
         jump handler just settled put their transforms back. The settle is
         aimed at where the destination is now, not where it was one screen and
         twenty thousand pixels ago. */
      measure();
      engine.scrollTo(point.offset, { duration: tuning.settle, force: true, onComplete: () => land(point) });
      return;
    }

    engine.scrollTo(to, { duration: tuning.hop, force: true, onComplete: () => land(point) });
  }

  /* Arrival. The hash is written with replaceState and never by assigning
     location.hash, because assigning it is precisely what fires the browser's
     own jump -- the behaviour this file exists to replace. */
  function land(point) {
    gliding = false;
    if (point.hash && location.hash !== "#" + point.hash) {
      history.replaceState(null, "", "#" + point.hash);
    }
    if (!point.element) return;
    if (!point.element.hasAttribute("tabindex")) point.element.setAttribute("tabindex", "-1");
    point.element.focus({ preventScroll: true });
  }

  function step(direction) {
    measure();
    const y = window.scrollY;
    const ahead = points.filter(point => (direction > 0 ? point.offset > y + 8 : point.offset < y - 8));
    const next = direction > 0 ? ahead[0] : ahead[ahead.length - 1];
    if (next) travel(next);
  }

  /* ---- Where the reader is standing -------------------------------------
     A rail is a list of places, and without this it is a list that does not say
     which one you are in. The line is the viewport's 42% mark, the same line
     updatePageJourney already uses to decide what the ribbon says
     (home-inline.js:1219): one page should not hold two opinions about which
     chapter is the current one. */
  function mark() {
    if (!ribbonNav) return;
    const line = window.scrollY + window.innerHeight * .42;
    let current = null;
    points.forEach(point => { if (point.rail && point.offset <= line) current = point; });
    ribbonNav.querySelectorAll("[data-checkpoint]").forEach(link => {
      const on = Boolean(current) && link.dataset.checkpoint === current.id;
      link.classList.toggle("is-current", on);
      if (on) link.setAttribute("aria-current", "true");
      else link.removeAttribute("aria-current");
    });
  }

  /* ---- The magnet -------------------------------------------------------
     One rule, and everything else here follows from it:

       While a hand is on the wheel the page never argues. The moment it lets
       go, the page finishes the sentence.

     Nothing is snapped, stepped or intercepted while the reader is moving.
     Scrolling stays exactly as free as it has always been. Only after the page
     has been still for SETTLE_WAIT does this look at where that left them, and
     only if it left them mid-crossing does it move at all.

     Three constraints, and the first of them is the important one.

     It only ever goes the way the reader was already going. Not to the nearest
     dwell -- to the next one in their direction of travel. This page has had a
     magnet before and that is exactly how it failed: it pulled people back to
     the beat they had just left, over and over, until the whole page below was
     unreachable. A magnet that cannot reverse you cannot do that. Scroll down
     and it finishes downward; scroll up and it finishes upward.

     It finishes movements rather than starting them. A crossing is at most
     eight percent of the film, so the move is short by construction. Stop in
     the middle of a long dwell -- a deliberate place to stop -- and nothing
     happens at all.

     And it lets go the instant it is touched. Any input during the glide ends
     it where it stands. It gets one attempt, and the reader always wins. */
  let heading = 1;
  let lastY = window.scrollY;
  let stillTimer = 0;
  let gliding = false;

  function settle() {
    const engine = window.saaeScroll;
    if (!engine || gliding || reduced.matches || tuning.magnet === "off") return;

    const span = Math.max(1, hero.offsetHeight - window.innerHeight);
    const progress = (window.scrollY - topOf(hero)) / span;
    if (progress < 0) return;

    let target = null;
    if (progress <= 1) {
      if (tuning.magnet === "nearest") {
        /* The full magnet. Every rest inside the film ends on a moment, not
           only the rests that land in a fade, which makes the film read as a
           set of stations rather than a road with some sticky patches. It can
           drift backwards, and that is the difference between this and
           "crossings" -- the nearest moment is sometimes the one just passed.

           What keeps that from becoming the old failure is that it is one
           short move, once, after the reader has already stopped, abandoned
           the moment they touch anything. The failure was a magnet that pulled
           during the gesture and pulled again every time it was escaped.

           Out of reach means it was deliberate. Stop in the middle of a long
           dwell, far from either end, and nothing happens. */
        const reach = tuning.reach * window.innerHeight;
        let best = null;
        BEATS.forEach(beat => {
          const offset = topOf(hero) + Math.round(beat * span);
          const distance = Math.abs(offset - window.scrollY);
          if (distance <= reach && (!best || distance < best.distance)) best = { offset, distance };
        });
        if (!best) return;
        target = best.offset;
      } else {
        const index = CROSSINGS.findIndex(([from, to]) => progress > from && progress < to);
        /* Standing on a composed frame already. This is the common case and the
           reason the magnet is quiet: most of the film is dwell. */
        if (index < 0) return;
        target = topOf(hero) + Math.round(BEATS[heading > 0 ? index + 1 : index] * span);
      }
    } else {
      /* The exit is a crossing too -- the film has stopped saying anything and
         the page below has not started. Someone who runs off the end of the
         last dwell is delivered onto the first section rather than left in the
         handover. Downward only: a reader coming back up into the film is
         going somewhere in the film. */
      const news = document.getElementById("news");
      if (!news || heading < 0) return;
      target = topOf(news);
      /* The handover is a stretch, not everything past the film, and without
         this line it was everything past the film: a reader parked in the FAQ
         and still heading down matched this branch and got hauled six thousand
         pixels back up to the news section. Once the page below has started,
         the magnet has no business here at all -- those sections are text, and
         a reader stops in text wherever they are reading. */
      if (window.scrollY >= target - 4) return;
    }

    if (Math.abs(target - window.scrollY) < 8) return;
    gliding = true;
    engine.scrollTo(target, {
      duration: tuning.glide,
      force: true,
      onComplete: () => { gliding = false; }
    });
  }

  function release() {
    if (!gliding) return;
    gliding = false;
    /* Ends the glide where it stands rather than cancelling it back: the
       reader has taken over, and the page should be wherever their input says
       it is from this frame on. */
    const engine = window.saaeScroll;
    if (engine) engine.scrollTo(window.scrollY, { immediate: true, force: true });
  }

  /* ---- Wiring -----------------------------------------------------------
     Delegated, so the panel can be rebuilt or translated underneath it. The
     href stays on every link and is still the fallback if this file never
     runs: on touch it is a working anchor, and with no JS at all it is the
     only navigation there is. */
  document.addEventListener("click", event => {
    const link = event.target.closest("[data-checkpoint]");
    if (!link) return;
    const point = points.find(candidate => candidate.id === link.dataset.checkpoint);
    if (!point) return;
    event.preventDefault();
    travel(point);
  });

  /* Alt-qualified on purpose. "No wheel or key interception" is a rule this
     page keeps, and PageDown belongs to the reader: taking a scroll key
     everyone already knows in order to give back a shortcut nobody asked for
     is a bad trade. Alt+Down and Alt+Up are unbound in the browsers this
     targets, so this adds a way through without removing one. */
  window.addEventListener("keydown", event => {
    if (!event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    /* Alt+Arrow moves the caret by word on macOS, and the page carries a chat
       widget. Inside anything that takes typing, the keys belong to the field. */
    const target = event.target;
    if (target && target.closest && target.closest("input, textarea, select, [contenteditable]")) return;
    if (event.key === "ArrowDown") { event.preventDefault(); step(1); }
    else if (event.key === "ArrowUp") { event.preventDefault(); step(-1); }
  });

  let measureFrame = 0;
  function remeasure() {
    if (measureFrame) return;
    measureFrame = requestAnimationFrame(() => { measureFrame = 0; measure(); });
  }

  /* Direction is read from the document rather than from the wheel, so a
     keyboard scroll, a drag on the scrollbar and a wheel all say the same
     thing: which way the page actually went.

     Rearmed on every move, including the ones the glide itself produces, so
     the timer can only fire once everything -- the engine included -- has come
     to rest. */
  function onMoved() {
    const y = window.scrollY;
    if (y !== lastY) {
      heading = y > lastY ? 1 : -1;
      lastY = y;
    }
    clearTimeout(stillTimer);
    stillTimer = window.setTimeout(settle, tuning.wait * 1000);
  }

  /* Both sources, because neither is complete on its own. The native event is
     the only one there is on touch and under reduced motion, where no engine
     is ever started. And the engine is the only reliable one when it IS
     running: scroll-engine.js records that Lenis "moves it every frame without
     firing a native scroll event on some paths", which is why ScrollTrigger is
     fed from the engine there rather than from the window. Measured here: a
     programmatic move of 1400px produced exactly zero native scroll events.
     Listening only to the window would have left the magnet armed by luck. */
  let hooked = false;
  function hookEngine() {
    const engine = window.saaeScroll;
    if (hooked || !engine || typeof engine.on !== "function") return;
    hooked = true;
    engine.on("scroll", onMoved);
  }

  let markFrame = 0;
  window.addEventListener("scroll", () => {
    hookEngine();
    onMoved();
    if (markFrame) return;
    markFrame = requestAnimationFrame(() => { markFrame = 0; mark(); });
  }, { passive: true });

  /* The hand going back on the wheel, in every form it takes. */
  window.addEventListener("wheel", release, { passive: true });
  window.addEventListener("touchstart", release, { passive: true });
  window.addEventListener("pointerdown", release, { passive: true });
  window.addEventListener("keydown", event => { if (!event.altKey) release(); });

  window.addEventListener("resize", remeasure, { passive: true });
  window.addEventListener("load", remeasure);
  /* The hero and the reel are sized in viewport units and the Arabic face sets
     type at a different size, so a language change moves every offset on the
     page. */
  window.addEventListener("saae:languagechange", remeasure);
  if ("ResizeObserver" in window) new ResizeObserver(remeasure).observe(document.body);

  measure();
  hookEngine();
  /* The engine starts on its own schedule and may not exist yet on this line;
     it is also torn down and rebuilt whenever reduced motion is toggled
     mid-visit. Both are covered by trying again on the events that follow. */
  window.addEventListener("load", hookEngine);

  window.saaeCheckpoints = {
    list: () => points.map(({ id, offset, rail: isRail }) => ({ id, offset, rail: Boolean(isRail) })),
    go: id => { const point = points.find(candidate => candidate.id === id); if (point) travel(point); },
    next: () => step(1),
    previous: () => step(-1),
    /* Live, and returns the whole set so the console shows what is in force
       after every adjustment. tune() with nothing reads it; tune({}) is the
       same. reset() puts the defaults back. */
    tune: next => {
      if (next) Object.keys(next).forEach(key => {
        if (key in tuning) tuning[key] = next[key];
      });
      return Object.assign({}, tuning);
    },
    reset: () => Object.assign(tuning, DEFAULTS)
  };
})();
