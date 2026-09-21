// @ts-nocheck
/* eslint-disable */
/* Ported from the SAAE cinematic design package. Behaviour preserved; wrapped
   so the app can start it on mount and tear it down on unmount. */

export function initSections(): () => void {
  const __cleanups: Array<() => void> = [];
  const __on = (target: any, type: string, handler: any, opts?: any) => {
    if (!target) return;
    target.addEventListener(type, handler, opts);
    __cleanups.push(() => target.removeEventListener(type, handler, opts));
  };
  const __timers: any[] = [];
  const __setTimeout = (fn: any, ms?: number, ...rest: any[]) => {
    const id = window.setTimeout(fn, ms, ...rest);
    __timers.push(id);
    return id;
  };
  const __setInterval = (fn: any, ms?: number, ...rest: any[]) => {
    const id = window.setInterval(fn, ms, ...rest);
    __timers.push(() => window.clearInterval(id));
    return id;
  };
  const __frames = new Set<number>();
  let __dead = false;
  const __raf = (fn: any) => {
    const id = window.requestAnimationFrame((time) => {
      __frames.delete(id);
      if (__dead) return;
      fn(time);
    });
    __frames.add(id);
    return id;
  };
  const __observers: any[] = [];
  class __MutationObserver extends MutationObserver {
    constructor(cb: any) {
      super(cb);
      __observers.push(this);
    }
  }
  class __IntersectionObserver extends IntersectionObserver {
    constructor(cb: any, o?: any) {
      super(cb, o);
      __observers.push(this);
    }
  }
  class __ResizeObserver extends ResizeObserver {
    constructor(cb: any) {
      super(cb);
      __observers.push(this);
    }
  }
  const __teardown = () => {
    __cleanups.forEach((fn) => {
      try {
        fn();
      } catch {}
    });
    __timers.forEach((t) => {
      typeof t === "function" ? t() : window.clearTimeout(t);
    });
    __dead = true;
    __frames.forEach((f) => window.cancelAnimationFrame(f));
    __frames.clear();
    __observers.forEach((o) => {
      try {
        o.disconnect();
      } catch {}
    });
  };
  const __run = () => {
    /* SAAE section behaviour.
     *
     * Separate from motion.js on purpose. motion.js is GSAP enhancement and is
     * allowed to do nothing at all; everything in this file is behaviour the page
     * genuinely offers, so it must run whether or not GSAP loaded and whether or
     * not the visitor prefers reduced motion. Reduced motion changes how these
     * components move, never whether they work.
     *
     * Two carousels live here, and on a wide screen neither of them advances on a
     * timer any more: the scroll is the motor. Each one sits on a reel — a tall
     * block with a single sticky screen inside it — and how far the reel has
     * travelled past the top of the window is the carousel's position. The first
     * card as the reel arrives, the last card by the time the reader reaches the
     * button underneath it. Nothing moves while the reader is still.
     *
     * Below 821px, and under reduced motion, the reel is not built at all and both
     * carousels stay what they were: whole-card steps that advance on their own and
     * answer to a swipe. That is the same line .mission-reel already draws, and it
     * is drawn in CSS, so the two cannot disagree about which mode is live.
     *
     * Both are gated on an IntersectionObserver. That is not a nicety: this page
     * seeks a video every frame through 750vh of hero, and a loop running for a
     * carousel a screen and a half below is competition the scrub cannot afford.
     */

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    /* The one place the two modes are decided. The stylesheet asks the same
     question in the same words, so the reel is tall exactly when this is true. */
    const scrubGate = window.matchMedia(
      "(min-width: 821px) and (prefers-reduced-motion: no-preference)",
    );

    const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
    const lerp = (from, to, t) => from + (to - from) * t;

    /* Calls onShow / onHide as the element enters and leaves the viewport. */
    function visibility(element, onShow, onHide) {
      if (!("IntersectionObserver" in window)) {
        onShow();
        return;
      }

      let visible = false;

      new __IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting === visible) return;
            visible = entry.isIntersecting;
            (visible ? onShow : onHide)();
          });
        },
        { rootMargin: "120px 0px" },
      ).observe(element);
    }

    /* A repeating job that only runs while its section is on screen, the tab is
     in front, its mode is the live one, and nothing is holding it. */
    function autoplay(section, delay, advance) {
      let timer = 0;
      let holds = 0;
      let onScreen = false;
      let enabled = false;

      const stopTimer = () => {
        window.clearInterval(timer);
        timer = 0;
      };

      function sync() {
        const run = onScreen && enabled && !holds && !document.hidden && !reducedMotion.matches;
        if (run && !timer) timer = __setInterval(advance, delay);
        else if (!run && timer) stopTimer();
      }

      const api = {
        hold() {
          holds += 1;
          sync();
        },
        release() {
          holds = Math.max(0, holds - 1);
          sync();
        },
        /* A deliberate interaction takes the wheel for a while and hands it
         back. Nothing here stops for good short of changing mode. */
        pause(ms) {
          api.hold();
          __setTimeout(api.release, ms);
        },
        /* Off whenever the scroll is driving instead. Two motors on one carousel
         fight each other, and the reader's scroll is the one that wins. */
        enable(state) {
          enabled = state;
          sync();
        },
        screen(state) {
          onScreen = state;
          sync();
        },
      };

      __on(section, "pointerenter", api.hold);
      __on(section, "pointerleave", api.release);
      __on(section, "focusin", api.hold);
      __on(section, "focusout", api.release);
      __on(document, "visibilitychange", sync);
      __on(reducedMotion, "change", sync);

      return api;
    }

    /* Drag and swipe, shared by both carousels, and only ever live in stepped
     mode. Travel is reported in card widths, so each carousel decides for
     itself what a throw means to it. */
    function draggable(element, pitchOf, onStart, onMove, onEnd) {
      let drag = null;

      __on(element, "pointerdown", (event) => {
        if (event.button) return;
        const pitch = pitchOf();
        if (!pitch) return;
        element.setPointerCapture(event.pointerId);
        element.classList.add("is-dragging");
        drag = { id: event.pointerId, x: event.clientX, pitch, travel: 0, moved: false };
        onStart();
      });

      __on(element, "pointermove", (event) => {
        if (!drag || drag.id !== event.pointerId) return;
        drag.travel = (event.clientX - drag.x) / drag.pitch;
        if (Math.abs(event.clientX - drag.x) > 6) drag.moved = true;
        onMove(drag.travel);
      });

      function finish(event) {
        if (!drag || drag.id !== event.pointerId) return;
        const travel = drag.travel;
        const moved = drag.moved;
        drag = null;
        element.classList.remove("is-dragging");
        // A drag that ends on a card would otherwise also read as a click on it.
        element.dataset.suppressClick = moved ? "1" : "0";
        onEnd(travel);
      }

      __on(element, "pointerup", finish);
      __on(element, "pointercancel", finish);

      __on(
        element,
        "click",
        (event) => {
          if (element.dataset.suppressClick !== "1") return;
          element.dataset.suppressClick = "0";
          event.preventDefault();
          event.stopPropagation();
        },
        true,
      );
    }

    /* ---- The reel ---------------------------------------------------------
     Travel through the reel, 0 to 1, reported back as a carousel position.

     A beat is held at each end. Without the head the first card is already
     leaving as it arrives; without the tail the last card and the button
     underneath it are glued together, and the reader never sees the register
     finish. */
    const HEAD = 0.06;
    const TAIL = 0.11;

    function reelScrub(reel, screen, onProgress) {
      let live = false;
      let onScreen = false;
      let frame = null;
      let stamp = 0;
      let value = 0; // what is painted; chases target
      let target = 0; // what the scroll position says

      // How far the reel travels while its screen is stuck to the top.
      const span = () => Math.max(1, reel.offsetHeight - screen.offsetHeight);

      function read() {
        const raw = clamp(-reel.getBoundingClientRect().top / span(), 0, 1);
        target = clamp((raw - HEAD) / (1 - HEAD - TAIL), 0, 1);
      }

      function step(now) {
        const delta = clamp(now - stamp, 1, 64);
        stamp = now;

        const remaining = target - value;
        if (Math.abs(remaining) < 0.0002) {
          value = target;
          onProgress(value);
          frame = null;
          return;
        }

        /* Frame-rate independent, which a bare per-frame fraction is not: the
         same wheel gesture has to land in the same place on a 60Hz panel and
         on a 144Hz one. The lag is what makes the arc glide rather than
         twitch on every wheel notch. */
        value += remaining * (1 - Math.pow(1 - 0.17, delta / 16.67));
        onProgress(value);
        frame = __raf(step);
      }

      function wake() {
        if (frame !== null || !live || !onScreen) return;
        stamp = performance.now();
        frame = __raf(step);
      }

      function stop() {
        if (frame === null) return;
        cancelAnimationFrame(frame);
        frame = null;
      }

      function land() {
        read();
        value = target;
        onProgress(value);
      }

      /* The listener is on the window because the reel has no scroller of its
       own, so it must cost nothing while the hero is on screen: a flag, and
       nothing else, until the reel is actually up. */
      const onScroll = () => {
        if (!live || !onScreen) return;
        read();
        wake();
      };

      __on(window, "scroll", onScroll, { passive: true });
      __on(window, "resize", onScroll, { passive: true });

      visibility(
        reel,
        () => {
          onScreen = true;
          if (!live) return;
          land(); // arrive already in the right place, never scrub into it
          wake();
        },
        () => {
          onScreen = false;
          stop();
        },
      );

      return {
        set(state) {
          live = state;
          if (!live) {
            stop();
            return;
          }
          land();
          wake();
        },
        /* Where the page has to be for position t (0 to 1) to sit at the centre.
         This is what an arrow, a dot or a click on a card now means. */
        offsetFor(t) {
          const top = reel.getBoundingClientRect().top + window.scrollY;
          return Math.round(top + (HEAD + clamp(t, 0, 1) * (1 - HEAD - TAIL)) * span());
        },
      };
    }

    /* ---- News -------------------------------------------------------------
     Five slides: four published stories and, as the fifth card in the ring,
     the route to the full feed. Only the centre card shows its copy, and the
     copy of every other card is inert, so a link that cannot be read also
     cannot be reached by tab. */
    const newsFlow = document.getElementById("news-flow");
    const newsTrack = document.getElementById("news-track");
    const newsReel = document.getElementById("news-reel");
    const newsScreen = document.getElementById("news-screen");

    if (newsFlow && newsTrack && newsTrack.children.length) {
      const slides = Array.from(newsTrack.children);
      const dots = Array.from(newsFlow.querySelectorAll(".flow-dot"));
      const total = slides.length;
      const last = total - 1;

      let live = false;
      let pos = 0; // fractional, and only in scrubbed mode
      let index = -1; // rounded; everything discrete keys off this

      /* The arc as a function of distance from the centre, rather than as five
       fixed stops. The numbers at 0, 1 and 2 are the ones the stylesheet used,
       so a card parked at a whole position looks exactly as it did — between
       them it now interpolates instead of jumping. */
      const KNOTS = [
        { x: 0, scale: 1, turn: 0, fade: 1, scrim: 0 },
        { x: 0.86, scale: 0.845, turn: 25, fade: 0.68, scrim: 0.5 },
        { x: 1.5, scale: 0.7, turn: 38, fade: 0.36, scrim: 0.64 },
        { x: 1.94, scale: 0.62, turn: 43, fade: 0.2, scrim: 0.7 },
      ];

      function shape(distance) {
        const d = Math.min(distance, KNOTS.length - 1);
        const i = Math.min(KNOTS.length - 2, Math.floor(d));
        const a = KNOTS[i];
        const b = KNOTS[i + 1];
        const t = d - i;
        return {
          x: lerp(a.x, b.x, t),
          scale: lerp(a.scale, b.scale, t),
          turn: lerp(a.turn, b.turn, t),
          fade: lerp(a.fade, b.fade, t),
          scrim: lerp(a.scrim, b.scrim, t),
        };
      }

      /* Inline transforms, written every frame. The stylesheet's own [data-pos]
       geometry still holds in stepped mode; here it is simply outranked. */
      function paint() {
        slides.forEach((slide, i) => {
          // Fold onto the shorter way round the ring, so the arc is symmetric
          // and the first and last cards are neighbours, not opposite ends.
          let offset = (((i - pos) % total) + total) % total;
          if (offset > total / 2) offset -= total;

          const distance = Math.abs(offset);
          const side = Math.sign(offset);
          const s = shape(distance);
          // A card is teleported across the ring at exactly half a turn out, so
          // it has to be gone by then. Held at full strength out to two, so a
          // card parked at the edge of the arc looks as it did before.
          const edge = clamp((total / 2 - distance) / 0.5, 0, 1);

          slide.style.transform =
            "translateX(calc(-50% + var(--card-w) * " +
            (side * s.x).toFixed(4) +
            ")) " +
            "scale(" +
            s.scale.toFixed(4) +
            ") " +
            "rotateY(" +
            (-side * s.turn).toFixed(2) +
            "deg)";
          slide.style.opacity = (s.fade * edge).toFixed(3);
          slide.style.zIndex = String(30 - Math.round(distance * 10));
          // Read by the scrim and the copy block, which are not this element.
          slide.style.setProperty("--scrim", s.scrim.toFixed(3));
          // The photograph lags its own card. Signed against the offset, so a
          // card swinging out to the right drifts its image left inside the
          // frame, and bounded to what the 1.13 overscale can actually cover.
          slide.style.setProperty("--shift", clamp(-offset * 10, -15, 15).toFixed(2));
          // The copy holds at full strength either side of the centre and is
          // gone well before the next card arrives. Ramping it straight off zero
          // reads as a flicker: a headline that is never quite settled.
          slide.style.setProperty("--copy", clamp((0.62 - distance) / 0.37, 0, 1).toFixed(3));
        });
      }

      function strip() {
        slides.forEach((slide) => {
          slide.style.transform = "";
          slide.style.opacity = "";
          slide.style.zIndex = "";
          slide.style.removeProperty("--scrim");
          slide.style.removeProperty("--shift");
          slide.style.removeProperty("--copy");
        });
      }

      /* Everything discrete: which card owns the copy, the tab order, the tint
       and the dots. Written only when the rounded position actually changes,
       because rewriting inert and tabIndex every frame thrashes focus. */
      function setIndex(next) {
        if (next === index) return;
        index = next;

        slides.forEach((slide, i) => {
          let offset = (((i - index) % total) + total) % total;
          if (offset > total / 2) offset -= total;
          slide.dataset.pos = String(offset);

          const copy = slide.querySelector(".news-copy");
          if (!copy) return;
          const active = offset === 0;
          if ("inert" in HTMLElement.prototype) copy.inert = !active;
          const link = copy.querySelector(".news-cta");
          if (link) link.tabIndex = active ? 0 : -1;
        });

        const tint = slides[index].dataset.tint;
        if (tint) newsFlow.style.setProperty("--flow-tint", tint);

        dots.forEach((dot, i) => {
          if (i === index) dot.setAttribute("aria-current", "true");
          else dot.removeAttribute("aria-current");
        });
      }

      // Stepped mode: whole cards, CSS geometry, wrapping at both ends.
      const go = (next) => setIndex(((next % total) + total) % total);

      const scrub =
        newsReel && newsScreen
          ? reelScrub(newsReel, newsScreen, (progress) => {
              pos = progress * last;
              paint();
              setIndex(Math.round(pos));
            })
          : null;

      const player = autoplay(newsFlow, 5600, () => go(index + 1));
      const took = () => player.pause(9000);

      /* One card along. Scrubbed, that is a scroll — the position is a function
       of where the page is, so moving the carousel means moving the page — and
       it clamps rather than wraps, because wrapping would throw the reader
       back to the top of the reel. */
      function goTo(next) {
        if (live && scrub) {
          window.scrollTo({
            top: scrub.offsetFor(clamp(next, 0, last) / last),
            behavior: "smooth",
          });
          return;
        }
        took();
        go(next);
      }

      const stepBy = (by) => goTo(live ? clamp(index + by, 0, last) : index + by);

      newsFlow.querySelectorAll(".flow-arrow").forEach((button) => {
        __on(button, "click", () => stepBy(Number(button.dataset.step)));
      });

      dots.forEach((dot) => {
        __on(dot, "click", () => goTo(Number(dot.dataset.go)));
      });

      // Click an off-centre card to bring it in. The centre card keeps its own
      // link, so this never steals the one click that matters.
      __on(newsTrack, "click", (event) => {
        const slide = event.target.closest(".news-slide");
        if (!slide || slide.dataset.pos === "0") return;
        goTo(slides.indexOf(slide));
      });

      // Scoped to the carousel, never to the window: everywhere else on this
      // page the arrow keys belong to the scroll, which runs a very long way.
      __on(newsFlow, "keydown", (event) => {
        if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
        event.preventDefault();
        stepBy(event.key === "ArrowRight" ? 1 : -1);
      });

      draggable(
        newsFlow,
        () => (live ? 0 : slides[0].offsetWidth),
        () => {},
        () => {},
        (travel) => {
          if (Math.abs(travel) < 0.18) return;
          took();
          go(index - Math.sign(travel));
        },
      );

      function setMode(scrubbed) {
        live = scrubbed && !!scrub;
        newsFlow.classList.toggle("is-scrubbed", live);
        player.enable(!live);
        if (scrub) scrub.set(live);
        if (!live) {
          strip();
          go(Math.max(0, index));
        }
      }

      setIndex(0);
      setMode(scrubGate.matches);
      __on(scrubGate, "change", (event) => setMode(event.matches));

      visibility(
        newsFlow,
        () => player.screen(true),
        () => player.screen(false),
      );
    }

    /* ---- Partners ---------------------------------------------------------
     The corridor has no clock of its own. Every mark holds one paused
     animation, and where it sits is decided entirely by --t, the reel's travel
     from 0 to 1, so all this does is hand the scroll position to CSS: one
     custom property per frame moves all twenty-three.

     The button is part of the same number. It comes up over the last stretch,
     by which point the marks are off past the frame edge, so the reader
     finishes the register and finds the way to the rest of it in the space the
     corridor just cleared.

     Everything degrades to a still: --t defaults to .5 in the stylesheet, so a
     phone, reduced motion or no script at all gets a full corridor standing
     still, with the note and the button under it in flow. */
    const partnerReel = document.getElementById("partner-reel");
    const partnerScreen = document.getElementById("partner-screen");
    const partnerOutro = document.getElementById("partner-outro");

    if (partnerReel && partnerScreen && partnerOutro) {
      /* Just before the fade starts. Until then the button is not merely
       transparent but hidden, because a link at opacity zero is still in the
       tab order. */
      const READY = 0.85;

      const scrub = reelScrub(partnerReel, partnerScreen, (progress) => {
        partnerScreen.style.setProperty("--t", progress.toFixed(4));
        partnerOutro.classList.toggle("is-ready", progress >= READY);
      });

      function setPartnerMode(scrubbed) {
        partnerScreen.classList.toggle("is-scrubbed", scrubbed);

        // Handing --t back to the stylesheet is what restores the still.
        if (!scrubbed) {
          partnerScreen.style.removeProperty("--t");
          partnerOutro.classList.remove("is-ready");
        }

        scrub.set(scrubbed);
      }

      setPartnerMode(scrubGate.matches);
      __on(scrubGate, "change", (event) => setPartnerMode(event.matches));
    }

    /* ---- FAQ --------------------------------------------------------------
     The markup already carries the open/closed truth: aria-expanded on each
     trigger and .is-open on each item, with the first answer open. That means
     the section is readable with scripting off, where every answer simply
     stays where the CSS put it. All this adds is the toggling. */
    const faqTriggers = Array.from(document.querySelectorAll(".faq-trigger")).filter(
      (trigger) => !trigger.closest(".hp-faq-scroll-card"),
    );

    if (faqTriggers.length) {
      const setFaqOpen = (activeTrigger, open) => {
        faqTriggers.forEach((trigger) => {
          const isOpen = trigger === activeTrigger && open;
          trigger.setAttribute("aria-expanded", String(isOpen));
          trigger.closest(".faq-item")?.classList.toggle("is-open", isOpen);
        });
      };

      faqTriggers.forEach((trigger) => {
        const item = trigger.closest(".faq-item");
        if (!item) return;

        __on(trigger, "click", () => {
          const open = trigger.getAttribute("aria-expanded") === "true";
          setFaqOpen(trigger, !open);
        });

        // On a desktop pointer, the answer previews as soon as the reader
        // reaches its row. Touch devices retain the intentional tap behaviour.
        __on(item, "pointerenter", (event) => {
          if (event.pointerType === "mouse") setFaqOpen(trigger, true);
        });
      });
    }

    /* Text gets a small entrance when its section arrives. Hero copy keeps its
     own cinematic timing; the existing .reveal blocks are intentionally
     included so the rest of the page does not silently skip this effect.

     The class is applied before observing. This lets CSS establish the hidden
     starting state first, instead of allowing the page-load fade to finish on
     text that is still several screens below the reader. */
    const scrollText = Array.from(
      document.querySelectorAll(
        "main :is(p, h1, h2, h3, h4, h5, h6, a, button, dt, dd, small, label, time), footer :is(p, h1, h2, h3, h4, h5, h6, a, button, dt, dd, small, label, time)",
      ),
    ).filter(
      (element) =>
        element.textContent.trim() &&
        !element.closest(".hero-section, .hero-static, .site-loader, .language-wash") &&
        !element.classList.contains("sr-only"),
    );

    scrollText.forEach((element) => element.classList.add("scroll-text-reveal"));

    if ("IntersectionObserver" in window) {
      const textObserver = new __IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            entry.target.classList.add("is-text-visible");
            textObserver.unobserve(entry.target);
          });
        },
        { threshold: 0.08, rootMargin: "0px 0px -8%" },
      );

      const syncTextMotion = () => {
        textObserver.disconnect();
        if (reducedMotion.matches) {
          scrollText.forEach((element) => element.classList.add("is-text-visible"));
          return;
        }
        scrollText.forEach((element) => {
          if (!element.classList.contains("is-text-visible")) textObserver.observe(element);
        });
      };

      syncTextMotion();
      __on(reducedMotion, "change", syncTextMotion);
    } else {
      scrollText.forEach((element) => element.classList.add("is-text-visible"));
    }
  };
  try {
    __run();
  } catch (error) {
    console.error("initSections failed", error);
  }
  return __teardown;
}
