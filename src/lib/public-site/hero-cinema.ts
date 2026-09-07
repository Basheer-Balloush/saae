// @ts-nocheck
/* eslint-disable */
/* Ported from the SAAE cinematic design package. Behaviour preserved; wrapped
   so the app can start it on mount and tear it down on unmount. */

export function initHeroCinema(): () => void {
  const __cleanups: Array<() => void> = [];
  const __on = (target: any, type: string, handler: any, opts?: any) => {
    if (!target) return;
    target.addEventListener(type, handler, opts);
    __cleanups.push(() => target.removeEventListener(type, handler, opts));
  };
  const __timers: any[] = [];
  const __setTimeout = (fn: any, ms?: number, ...rest: any[]) => { const id = window.setTimeout(fn, ms, ...rest); __timers.push(id); return id; };
  const __setInterval = (fn: any, ms?: number, ...rest: any[]) => { const id = window.setInterval(fn, ms, ...rest); __timers.push(() => window.clearInterval(id)); return id; };
  const __frames = new Set<number>();
  let __dead = false;
  const __raf = (fn: any) => {
    const id = window.requestAnimationFrame((time) => { __frames.delete(id); if (__dead) return; fn(time); });
    __frames.add(id);
    return id;
  };
  const __observers: any[] = [];
  class __MutationObserver extends MutationObserver { constructor(cb: any) { super(cb); __observers.push(this); } }
  class __IntersectionObserver extends IntersectionObserver { constructor(cb: any, o?: any) { super(cb, o); __observers.push(this); } }
  class __ResizeObserver extends ResizeObserver { constructor(cb: any) { super(cb); __observers.push(this); } }
  const __teardown = () => {
    __cleanups.forEach((fn) => { try { fn(); } catch {} });
    __timers.forEach((t) => { typeof t === "function" ? t() : window.clearTimeout(t); });
    __dead = true;
    __frames.forEach((f) => window.cancelAnimationFrame(f));
    __frames.clear();
    __observers.forEach((o) => { try { o.disconnect(); } catch {} });
  };
  const __run = () => {
const staticGateStrings = [
        "(max-width: 720px)",
        "(orientation: portrait) and (max-width: 1024px)",
        "(orientation: portrait) and (pointer: coarse)",
        "(orientation: landscape) and (pointer: coarse) and (max-height: 560px)",
        "(prefers-reduced-motion: reduce)"
      ];

      const gates = staticGateStrings.map(query => window.matchMedia(query));
      const reducedMotion = gates[gates.length - 1];
      const heroSection = document.getElementById("hero-sec");
      const stage = document.getElementById("stage");
      const poster = document.getElementById("poster");
      const video = document.getElementById("hero-video");
      const staticFrame = document.getElementById("static-frame");
      const status = document.getElementById("ring");
      const statusCopy = document.getElementById("video-status-copy");
      const ribbon = document.getElementById("journey-ribbon");
      const ribbonToggle = document.getElementById("ribbon-toggle");
      const ribbonPanel = document.getElementById("ribbon-panel");
      const ribbonCurrent = document.getElementById("ribbon-current");
      const ribbonCount = document.getElementById("ribbon-count");
      const bands = Array.from(document.querySelectorAll(".hero-band"));
      const communityCards = Array.from(document.querySelectorAll(".hero-community-button"));
      const communityFlipTrack = document.getElementById("community-flip-track");
      const communityCardIcon = document.getElementById("community-card-icon");
      const communityCardName = document.getElementById("community-card-name");
      const communityCardCopy = document.getElementById("community-card-copy");
      const communityCardNextIcon = document.getElementById("community-card-next-icon");
      const communityCardNextName = document.getElementById("community-card-next-name");
      const communityCardNextCopy = document.getElementById("community-card-next-copy");
      const communityCardCount = document.getElementById("community-card-count");
      const communityCardNextCount = document.getElementById("community-card-next-count");
      const communityCardPrevious = document.getElementById("community-card-prev");
      const communityCardNext = document.getElementById("community-card-next");
      const statNumbers = Array.from(document.querySelectorAll(".hero-stats dd[data-count]"));
      const journeyContent = document.querySelector(".journey-content");
      const missionSection = document.getElementById("mission");
      const missionWords = Array.from(document.querySelectorAll(".mission-words span"));
      const missionItems = Array.from(document.querySelectorAll(".mission-item"));
      const missionWordCaptions = {
        en: [
          "Learn it. Teach it. Pass it on.",
          "Test it. Measure it. Make it useful.",
          "Launch it. Grow it. Make it last."
        ],
        ar: [
          "تعلّمه. علّمه. وانقل أثره.",
          "اختبره. قِس أثره. واجعله نافعاً.",
          "أطلقه. نمّه. واجعله يدوم."
        ]
      };
      /* The reel, not the section. The sticky screen travels through the reel;
         the section is ~190px taller than that, so measuring the section put
         the last twelve per cent of the run -- the back half of BUILD -- after
         the frame had already released and scrolled away. */
      const missionReel = document.getElementById("mission-reel");
      /* Page order after the hero. The per-frame loop measures every entry, so
         a stale id here is not a dead link, it is a null dereference inside
         requestAnimationFrame that stops the hero scrub with it. Filter, so
         adding or removing a section can never do that. */
      const journeySections = [
        [document.getElementById("news"), "News"],
        [document.getElementById("partners"), "Partners"],
        [document.getElementById("mission"), "How we work"],
        [document.getElementById("faq"), "Answers"],
      ].filter(([section]) => section);
      const journeySectionRosettes = new Map(
        journeySections.map(([section]) => [section, Array.from(section.querySelectorAll(".section-rosette"))])
      );
      /* The hero footage is unchanged. It is re-encoded to 960x540 and upscaled on
         display, which the full-bleed presentation and the colour wash absorb: measured
         against the 1600x900 original, mean SSIM is 0.974 for AV1 and 0.965 for H.264,
         at roughly half the bytes.

         The scrub needs a keyframe every 8 frames to seek cleanly, and that short GOP,
         not the codec, is what sets the file size.

         H.264 only, deliberately. An AV1 encode was trialled and measured slightly
         better per byte (SSIM 0.974 against 0.967), but it was dropped for three
         reasons that do not depend on codec support: at this CRF the H.264 file is
         actually the smaller of the two (3.63 MB against 3.87 MB), a second encode
         would need codec selection in JS because blob streaming bypasses <source>
         negotiation, and canPlayType is a weak signal to hang that selection on.
         One encode that decodes everywhere beats two that need a runtime guess.

         Worth knowing if anyone revisits this: AV1 appeared to fail outright during
         testing, but that turned out to be decoder exhaustion in a browser tab that
         had accumulated several unreleased multi-megabyte video blobs. Both codecs
         decoded fine in a clean tab. Test video decode in a fresh tab or the result
         will mislead you. */
      const heroPosterUrl = "/site/images/hero-start.png";
      const heroVideoUrl = "/site/hero-scrub.mp4";
      const heroStaticUrl = "/site/images/hero-static.jpg";
      let journeyLabels = ["Rise", "Learn", "Initiative", "Reach", "Communities"];
      const heroBeatThresholds = [.2, .4, .6, .8];
      const RIBBON_REVEAL_AT = .2;

      let blobUrl = "";
      let fetchController = null;
      let watchdog = 0;
      let heroFrame = 0;
      let heroActive = false;
      let targetProgress = 0;
      let easedProgress = 0;
      let lastPaintedProgress = -1;
      let lastBandProgress = -1;
      let activeBand = 0;
      let lastTime = performance.now();
      let videoDuration = 8;
      /* LMS holds on this 24 fps source frame; the Initiative copy begins on the following frame. */
      const heroLmsPauseFrame = 115;
      const heroVideoFrameRate = 24;

      const heroPlaybackRate = 1;
      const heroArrivalPlaybackRate = .75;
      let seekQueued = false;
      /* Latched once the finished film has been asked to let go. The wheel
         handler removes hero-snap-active, but the scroll that follows runs
         syncHeroSnap, whose hold condition (rect.bottom >= innerHeight) is
         still exactly true on the last beat -- so the class went straight back
         on and mandatory snapping pulled the page to the beat it had just
         left, over and over, with the whole site below unreachable. */
       let heroSnapReleased = false;
       /* ---- Exit wall --------------------------------------------------
          The snap detents above can be jumped clean over: a scrollbar drag
          never "ends" mid-drag so no snap grabs it, and a second End press
          in the snap-free final stretch travels the whole film without
          stopping. So the exit itself is guarded in JS: while the film is
          uncompleted, document scroll is clamped to the hero's end on every
          scroll event -- synchronously, so a drag stops dead at the wall
          instead of flashing past it. Completion latches for the visit once
          the visitor has reached the final beat with the film finished (the
          poster fallback counts as finished, so a failed video never traps
          anyone). A load that restores past the hero -- an explicit hash --
          counts as already through, the way the scrollRestoration comment
          at the bottom of this script reads it. */
       let filmCompleted = false;
       let heroExitY = 0;
       function measureHeroExit() {
         heroExitY = Math.max(0, heroSection.offsetTop + heroSection.offsetHeight - window.innerHeight);
       }
       function videoFinishedForExit() {
         return !video.classList.contains("is-ready") || easedProgress >= .999;
       }
       function enforceHeroExitWall() {
         if (filmCompleted || !heroActive || isStaticExperience()) return;
         if (heroIsAtFinalBeat() && videoFinishedForExit()) {
           filmCompleted = true;
           setFilmLocked(false);
           return;
         }
         /* behavior:"instant" is load-bearing: the page runs
            scroll-behavior:smooth, which would turn this clamp-back into a
            slow animation that the outward smooth scroll can outrun. */
         if (window.scrollY > heroExitY + 2) window.scrollTo({ top: heroExitY, behavior: "instant" });
       }
       function setFilmLocked(locked) {
         document.documentElement.classList.toggle("film-locked", locked);
       }
      let pendingSeekTime = 0;
      let pageFrame = 0;
      let ribbonOpen = false;
      let ribbonCloseTimer = 0;
      let videoFailureReported = false;
      let statsAnimationFrame = 0;
      let statsAnimationTimer = 0;
      let statsTiedToVideo = false;
      let statsFromProgress = 0;
      let statsGoalProgress = 0;
      let statsShownRatio = 0;
      let communityFlipIndex = 0;
      let communityFlipTimer = 0;
      let communityFlipResetTimer = 0;
      const COMMUNITY_FLIP_FIRST_DELAY_MS = 650;
      const COMMUNITY_FLIP_INTERVAL_MS = 2400;
      const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
      const isStaticExperience = () => gates.some(gate => gate.matches);
      const paintedStyleProperties = new WeakMap();

      /* Writing the same inherited custom property on every scroll frame makes
         the browser restyle the element's whole subtree. Keep the exact same
         rendered values, but only mutate the narrowly-scoped owner when the
         serialized value has actually changed. */
      function setStylePropertyIfChanged(element, property, value) {
        if (!element) return;
        let properties = paintedStyleProperties.get(element);
        if (!properties) {
          properties = new Map();
          paintedStyleProperties.set(element, properties);
        }
        if (properties.get(property) === value) return;
        properties.set(property, value);
        element.style.setProperty(property, value);
      }

      function paintStats(ratio) {
        const eased = 1 - Math.pow(1 - clamp(ratio, 0, 1), 1.35);
        statNumbers.forEach(number => {
          const target = Number(number.dataset.count);
          const value = Math.round(target * eased);
          number.textContent = `${value.toLocaleString("en-US")}${value > 0 ? "+" : ""}`;
        });
      }

      function stopStatsAnimation() {
        cancelAnimationFrame(statsAnimationFrame);
        clearTimeout(statsAnimationTimer);
        statsAnimationFrame = 0;
        statsAnimationTimer = 0;
        statsTiedToVideo = false;
      }

      /* Fallback for the still experience: the video never travels, so run the clock. */
      function animateStatsOnClock(duration = 1500) {
        const startedAt = performance.now();
        const tick = now => {
          const progress = clamp((now - startedAt) / duration, 0, 1);
          paintStats(progress);
          if (progress < 1) statsAnimationFrame = __raf(tick);
        };
        statsAnimationFrame = __raf(tick);
      }

      /* The digits ride the hero video: they land the moment it settles on this beat. */
      function animateStatsFromZero() {
        stopStatsAnimation();
        statsShownRatio = 0;
        paintStats(0);

        if (!heroActive || !video.classList.contains("is-ready")) {
          statsAnimationTimer = __setTimeout(() => animateStatsOnClock(), 120);
          return;
        }

        statsFromProgress = easedProgress;
        statsGoalProgress = requestedVideoProgress();
        /* Already parked on the beat — nothing left to ride, so time it instead. */
        if (Math.abs(statsGoalProgress - statsFromProgress) < .02) {
          statsAnimationTimer = __setTimeout(() => animateStatsOnClock(1100), 120);
          return;
        }
        statsTiedToVideo = true;
      }

      function syncStatsToVideo() {
        if (!statsTiedToVideo) return;
        /* The snap is still settling while the video plays, so the goal keeps moving out. */
        const requested = requestedVideoProgress();
        if (Math.abs(requested - statsFromProgress) > Math.abs(statsGoalProgress - statsFromProgress)) {
          statsGoalProgress = requested;
        }
        const span = statsGoalProgress - statsFromProgress;
        const ratio = clamp((easedProgress - statsFromProgress) / span, 0, 1);
        if (ratio <= statsShownRatio) return;
        statsShownRatio = ratio;
        paintStats(ratio);
        if (ratio >= 1) statsTiedToVideo = false;
      }

      const communityIcons = {
        data: '<svg viewBox="0 0 24 24"><ellipse cx="12" cy="5" rx="7" ry="3"/><path d="M5 5v7c0 1.7 3.1 3 7 3s7-1.3 7-3V5M5 12v7c0 1.7 3.1 3 7 3s7-1.3 7-3v-7"/></svg>',
        city: '<svg viewBox="0 0 24 24"><path d="M3 21h18M5 21V9h5v12M10 21V4h5v17M15 21v-9h4v9M7 12h1M7 16h1M12 8h1M12 12h1M12 16h1M17 15h1"/></svg>',
        healthcare: '<svg viewBox="0 0 24 24"><path d="M12 21s-7-4.4-7-10.5C5 7.5 7 5.5 9.5 5.5c1.4 0 2.1.6 2.5 1.4.4-.8 1.1-1.4 2.5-1.4C17 5.5 19 7.5 19 10.5 19 16.6 12 21 12 21Z"/><path d="M8 12h2l1-2 2 4 1-2h2"/></svg>',
        research: '<svg viewBox="0 0 24 24"><circle cx="10.5" cy="10.5" r="5.5"/><path d="m15 15 5 5M8 10h5M10.5 7.5v5"/></svg>',
        software: '<svg viewBox="0 0 24 24"><path d="m8 8-4 4 4 4M16 8l4 4-4 4M14 5l-4 14"/></svg>',
        economy: '<svg viewBox="0 0 24 24"><path d="M4 19V9M10 19V5M16 19v-7M22 19V3M2 19h21"/><path d="m4 7 6-3 6 5 6-7"/></svg>',
        trainers: '<svg viewBox="0 0 24 24"><circle cx="12" cy="6" r="3"/><path d="M5 21v-2.5C5 15.5 8.1 14 12 14s7 1.5 7 4.5V21M12 14v7M8 18h8"/></svg>',
        media: '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m10 9 5 3-5 3V9"/></svg>',
        quality: '<svg viewBox="0 0 24 24"><path d="m12 3 2 4 4.5.7-3.2 3.2.8 4.6-4.1-2.1-4.1 2.1.8-4.6L5.5 7.7 10 7l2-4Z"/><path d="M7 16v5l5-2 5 2v-5"/></svg>'
      };

      const communityFlipItems = [
        { number: "01", name: "Data", copy: "Turn information into insight.", icon: "data" },
        { number: "02", name: "Smart Urban Development", copy: "Design smarter, more responsive cities.", icon: "city" },
        { number: "03", name: "Healthcare", copy: "Apply AI where care matters.", icon: "healthcare" },
        { number: "04", name: "Smart Research", copy: "Move ideas from questions to evidence.", icon: "research" },
        { number: "05", name: "Software", copy: "Build useful digital systems.", icon: "software" },
        { number: "06", name: "Smart Economy", copy: "Turn innovation into opportunity.", icon: "economy" },
        { number: "07", name: "Trainers", copy: "Equip the people who teach others.", icon: "trainers" },
        { number: "08", name: "Media", copy: "Make knowledge clear and accessible.", icon: "media" },
        { number: "09", name: "Entrepreneurial Quality", copy: "Raise the standard for new ventures.", icon: "quality" }
      ];

      const arabicCommunityFlipItems = [
        { number: "01", name: "البيانات", copy: "حوّل المعلومات إلى رؤى.", icon: "data" },
        { number: "02", name: "التنمية الحضرية الذكية", copy: "صمّم مدناً أذكى وأكثر استجابة.", icon: "city" },
        { number: "03", name: "الرعاية الصحية", copy: "طبّق الذكاء الاصطناعي حيث تكون الرعاية مهمة.", icon: "healthcare" },
        { number: "04", name: "البحث الذكي", copy: "انقل الأفكار من الأسئلة إلى الأدلة.", icon: "research" },
        { number: "05", name: "البرمجيات", copy: "ابنِ أنظمة رقمية مفيدة.", icon: "software" },
        { number: "06", name: "الاقتصاد الذكي", copy: "حوّل الابتكار إلى فرص.", icon: "economy" },
        { number: "07", name: "المدربون", copy: "جهّز من يعلّم الآخرين.", icon: "trainers" },
        { number: "08", name: "الإعلام", copy: "اجعل المعرفة واضحة ومتاحة.", icon: "media" },
        { number: "09", name: "الجودة الريادية", copy: "ارفع معيار المشاريع الجديدة.", icon: "quality" }
      ];

      function paintCommunityFace(side, item) {
        const fields = side === "front"
          ? [communityCardIcon, communityCardName, communityCardCopy, communityCardCount]
          : [communityCardNextIcon, communityCardNextName, communityCardNextCopy, communityCardNextCount];
        fields[0].innerHTML = communityIcons[item.icon];
        fields[1].textContent = item.name;
        fields[2].textContent = item.copy;
        fields[3].textContent = String(Number(item.number));
      }

      function paintCommunityNavigation(index) {
        const previous = communityFlipItems[(index - 1 + communityFlipItems.length) % communityFlipItems.length];
        const next = communityFlipItems[(index + 1) % communityFlipItems.length];
        if (communityCardPrevious) communityCardPrevious.setAttribute("aria-label", `Show ${previous.name} community`);
        if (communityCardNext) communityCardNext.setAttribute("aria-label", `Show ${next.name} community`);
      }

      function showCommunityCard(index) {
        communityFlipIndex = (index + communityFlipItems.length) % communityFlipItems.length;
        paintCommunityFace("front", communityFlipItems[communityFlipIndex]);
        paintCommunityFace("back", communityFlipItems[(communityFlipIndex + 1) % communityFlipItems.length]);
        paintCommunityNavigation(communityFlipIndex);
      }

      __on(window, "saae:languagechange", event => {
        const arabicMode = event.detail?.lang === "ar";
        journeyLabels = arabicMode
          ? ["البداية", "التعلّم", "المبادرة", "الأثر", "المجتمعات"]
          : ["Rise", "Learn", "Initiative", "Reach", "Communities"];
        const source = arabicMode ? arabicCommunityFlipItems : communityFlipItems;
        if (arabicMode) {
          communityFlipItems.splice(0, communityFlipItems.length, ...source);
        } else {
          communityFlipItems.splice(0, communityFlipItems.length,
            { number: "01", name: "Data", copy: "Turn information into insight.", icon: "data" },
            { number: "02", name: "Smart Urban Development", copy: "Design smarter, more responsive cities.", icon: "city" },
            { number: "03", name: "Healthcare", copy: "Apply AI where care matters.", icon: "healthcare" },
            { number: "04", name: "Smart Research", copy: "Move ideas from questions to evidence.", icon: "research" },
            { number: "05", name: "Software", copy: "Build useful digital systems.", icon: "software" },
            { number: "06", name: "Smart Economy", copy: "Turn innovation into opportunity.", icon: "economy" },
            { number: "07", name: "Trainers", copy: "Equip the people who teach others.", icon: "trainers" },
            { number: "08", name: "Media", copy: "Make knowledge clear and accessible.", icon: "media" },
            { number: "09", name: "Entrepreneurial Quality", copy: "Raise the standard for new ventures.", icon: "quality" }
          );
        }
        const captions = missionWordCaptions[arabicMode ? "ar" : "en"];
        missionWords.forEach((word, index) => { word.dataset.caption = captions[index]; });
        showCommunityCard(communityFlipIndex);
      });

      function stopCommunityFlip() {
        clearInterval(communityFlipTimer);
        clearTimeout(communityFlipTimer);
        clearTimeout(communityFlipResetTimer);
        communityFlipTimer = 0;
        communityFlipResetTimer = 0;
        resetCommunityFlipTransform();
      }

      function resetCommunityFlipTransform() {
        if (!communityFlipTrack) return;
        communityFlipTrack.classList.add("is-resetting");
        communityFlipTrack.classList.remove("is-flipped", "is-flipped-reverse");
        /* Commit the snapped front face while transitions are disabled. Without
           this read, the next frame can interpolate the last few degrees and
           leave the second card visually compressed or offset. */
        void communityFlipTrack.offsetWidth;
        __raf(() => communityFlipTrack.classList.remove("is-resetting"));
      }

      function advanceCommunityFlip() {
        if (!communityFlipTrack) return;
        const nextIndex = (communityFlipIndex + 1) % communityFlipItems.length;
        transitionCommunityCard(nextIndex);
      }

      function transitionCommunityCard(index, direction = 1) {
        if (!communityFlipTrack) return;
        const nextIndex = (index + communityFlipItems.length) % communityFlipItems.length;
        clearTimeout(communityFlipResetTimer);
        communityFlipResetTimer = 0;
        if (nextIndex === communityFlipIndex) {
          showCommunityCard(nextIndex);
          return;
        }
        paintCommunityFace("back", communityFlipItems[nextIndex]);
        if (direction < 0) communityFlipTrack.classList.add("is-flipped-reverse");
        else communityFlipTrack.classList.add("is-flipped");
        communityFlipResetTimer = __setTimeout(() => {
          communityFlipIndex = nextIndex;
          showCommunityCard(communityFlipIndex);
          resetCommunityFlipTransform();
          communityFlipResetTimer = 0;
        }, 750);
      }

      function startCommunityFlip() {
        stopCommunityFlip();
        showCommunityCard(communityFlipIndex);
        if (!reducedMotion.matches) {
          communityFlipTimer = __setTimeout(() => {
            advanceCommunityFlip();
            communityFlipTimer = __setInterval(advanceCommunityFlip, COMMUNITY_FLIP_INTERVAL_MS);
          }, COMMUNITY_FLIP_FIRST_DELAY_MS);
        }
      }

      function selectCommunity(index, direction) {
          clearInterval(communityFlipTimer);
          clearTimeout(communityFlipTimer);
          communityFlipTimer = 0;
          transitionCommunityCard(index, direction);
          if (!reducedMotion.matches) communityFlipTimer = __setInterval(advanceCommunityFlip, COMMUNITY_FLIP_INTERVAL_MS);
      }

      __on(communityCardPrevious, "click", () => selectCommunity(communityFlipIndex - 1, -1));
      __on(communityCardNext, "click", () => selectCommunity(communityFlipIndex + 1, 1));

      function setActiveBand(index) {
        if (index === activeBand && bands[index].classList.contains("is-active")) return;
        activeBand = index;
        bands.forEach((band, bandIndex) => {
          const active = bandIndex === index;
          band.classList.toggle("is-active", active);
          band.setAttribute("aria-hidden", String(!active));
        });
        heroSection.dispatchEvent(new CustomEvent("saae:band", {
          detail: { band: bands[index], index }
        }));
        window.dispatchEvent(new CustomEvent("saae:herobandchange", { detail: { index } }));
        if (index === 3) animateStatsFromZero();
        else if (index > 3) { stopStatsAnimation(); paintStats(1); }
        if (index === 4) startCommunityFlip();
        else stopCommunityFlip();
        if (heroSection.getBoundingClientRect().bottom > window.innerHeight * .55) {
          ribbonCurrent.textContent = journeyLabels[index];
          ribbonCount.textContent = `${String(index + 1).padStart(2, "0")} / 05`;
        }
      }

      communityCards.forEach(card => {
        const setFlipped = flipped => {
          card.classList.toggle("is-flipped", flipped);
          card.setAttribute("aria-pressed", String(flipped));
          card.setAttribute("aria-label", `${card.dataset.community}: ${flipped ? "show name" : "show details"}`);
        };

        __on(card, "click", () => setFlipped(!card.classList.contains("is-flipped")));
        __on(card, "keydown", event => {
          if (event.key === "Escape" && card.classList.contains("is-flipped")) {
            event.preventDefault();
            setFlipped(false);
          }
        });
      });

      function displayedHeroProgress(fallbackProgress) {
        if (!video.classList.contains("is-ready") || !Number.isFinite(video.duration) || video.duration <= 0) {
          return fallbackProgress;
        }
        return clamp(video.currentTime / video.duration, 0, 1);
      }

      function paintHero(progress, syncVideo = true) {
        const bandProgress = displayedHeroProgress(progress);
        if (Math.abs(progress - lastPaintedProgress) < .001 && Math.abs(bandProgress - lastBandProgress) < .001) return;
        lastPaintedProgress = progress;
        lastBandProgress = bandProgress;
        stage.style.setProperty("--hero-progress", progress.toFixed(4));
        const blueMix = clamp(progress / .82, 0, 1);
        const warmMix = clamp((progress - .82) / .18, 0, 1);
        const startTone = [7, 25, 48];
        const blueTone = [8, 40, 72];
        const rootTone = [18, 34, 66];
        const tone = startTone.map((channel, index) => {
          const towardBlue = channel + (blueTone[index] - channel) * blueMix;
          return Math.round(towardBlue + (rootTone[index] - towardBlue) * warmMix);
        });
        stage.style.setProperty("--wash-r", tone[0]);
        stage.style.setProperty("--wash-g", tone[1]);
        stage.style.setProperty("--wash-b", tone[2]);
        const nextBand = heroBeatThresholds.findIndex(threshold => bandProgress < threshold);
        let visibleBand = nextBand === -1 ? 4 : nextBand;
        const lmsPauseProgress = (heroLmsPauseFrame / heroVideoFrameRate) / videoDuration;
        /* The LMS message owns its pause frame; Initiative takes over once the video advances past it. */
        if (visibleBand === 1 && progress > lmsPauseProgress) visibleBand = 2;
        setActiveBand(visibleBand);

        if (syncVideo && video.classList.contains("is-ready")) {
          pendingSeekTime = progress * videoDuration;
          queueSeek();
        }
      }

      function queueSeek() {
        if (seekQueued || video.seeking || !Number.isFinite(pendingSeekTime)) return;
        const threshold = Math.max(1 / 30, videoDuration / 600);
        if (Math.abs(video.currentTime - pendingSeekTime) < threshold) return;
        seekQueued = true;
        __raf(() => {
          seekQueued = false;
          if (!video.classList.contains("is-ready")) return;
          try { video.currentTime = clamp(pendingSeekTime, 0, Math.max(0, videoDuration - .001)); }
          catch (_) { /* The poster remains a complete fallback. */ }
        });
      }

      __on(video, "seeked", queueSeek);

      function readHeroProgress() {
        const rect = heroSection.getBoundingClientRect();
        const distance = Math.max(1, heroSection.offsetHeight - window.innerHeight);
        targetProgress = clamp(-rect.top / distance, 0, 1);
        ribbon.classList.toggle("is-visible", targetProgress >= .2 || rect.bottom < window.innerHeight * .8);
        syncHeroSnap(rect);
      }

      function pauseVideoPlayback() {
        if (!video.paused) video.pause();
        video.playbackRate = 1;
      }

      function requestedVideoProgress() {
        const initiativeStart = heroBeatThresholds[1];
        const initiativePause = heroBeatThresholds[2];
        return targetProgress >= initiativeStart && targetProgress < initiativePause
          ? initiativePause
          : targetProgress;
      }

      function settledVideoProgress(progress) {
        const settleBeat = Math.min(4, Math.max(0, Math.round(progress * 4)));
        const finalVideoTime = Math.max(0, videoDuration - .001);
        const targetTime = settleBeat === 1
          ? heroLmsPauseFrame / heroVideoFrameRate
          : progress * videoDuration;
        return clamp(targetTime / videoDuration, 0, finalVideoTime / videoDuration);
      }

      function advanceForwardVideo() {
        const requestedProgress = requestedVideoProgress();
        const visualTargetProgress = settledVideoProgress(requestedProgress);
        if (!video.classList.contains("is-ready") || visualTargetProgress <= easedProgress + .001) return false;
        const targetTime = visualTargetProgress * videoDuration;
        if (video.currentTime >= targetTime - .012) {
          pauseVideoPlayback();
          easedProgress = visualTargetProgress;
          return false;
        }
        const remainingVideoTime = targetTime - video.currentTime;
        const arrivalWindow = .9;
        const settleWindow = .14;
        if (remainingVideoTime >= arrivalWindow) {
          video.playbackRate = heroPlaybackRate;
        } else if (remainingVideoTime >= settleWindow) {
          const arrivalProgress = (remainingVideoTime - settleWindow) / (arrivalWindow - settleWindow);
          video.playbackRate = heroArrivalPlaybackRate + (heroPlaybackRate - heroArrivalPlaybackRate) * arrivalProgress;
        } else {
          video.playbackRate = .12 + (heroArrivalPlaybackRate - .12) * (remainingVideoTime / settleWindow);
        }
        if (video.paused) video.play().catch(() => {
          pendingSeekTime = targetTime;
          queueSeek();
        });
        easedProgress = Math.min(visualTargetProgress, video.currentTime / videoDuration);
        return true;
      }

      function heroIsAtFinalBeat(rect = heroSection.getBoundingClientRect()) {
        return rect.top <= -(heroSection.offsetHeight - window.innerHeight) + 2;
      }

      function syncHeroSnap(rect = heroSection.getBoundingClientRect()) {
        /* Stay released while the visitor is on or past the last beat. Scrolling
           back up into the film clears the latch, so the hold re-arms itself and
           the beats behave exactly as they did on the way down. */
        if (heroSnapReleased) {
          if (heroIsAtFinalBeat(rect)) {
            document.documentElement.classList.remove("hero-snap-active");
            return;
          }
          heroSnapReleased = false;
        }
        const finalVideoIsCompleting = video.classList.contains("is-ready") && targetProgress >= .999 && easedProgress < .999;
        const shouldHoldHero = heroActive && rect.top <= 0 && (rect.bottom >= window.innerHeight || finalVideoIsCompleting);
        document.documentElement.classList.toggle("hero-snap-active", shouldHoldHero);
      }

      function releaseHeroSnapForExit() {
        const videoFinished = !video.classList.contains("is-ready") || easedProgress >= .999;
        if (heroIsAtFinalBeat() && videoFinished) {
          heroSnapReleased = true;
          document.documentElement.classList.remove("hero-snap-active");
        }
      }

      function heroLoop(now) {
        if (!heroActive) return;
        const delta = Math.min(80, Math.max(1, now - lastTime));
        lastTime = now;
        const isPlayingForward = advanceForwardVideo();
        if (isPlayingForward) {
          paintHero(easedProgress, false);
        } else {
          pauseVideoPlayback();
          const requestedProgress = requestedVideoProgress();
          const visualTargetProgress = settledVideoProgress(requestedProgress);
          const alpha = 1 - Math.pow(1 - .055, delta / (1000 / 60));
          easedProgress += (visualTargetProgress - easedProgress) * alpha;
          if (Math.abs(visualTargetProgress - easedProgress) < .00015) easedProgress = visualTargetProgress;
          paintHero(easedProgress, true);
        }
        syncStatsToVideo();
        heroFrame = __raf(heroLoop);
      }

      /* ---- Opening curtain ------------------------------------------------
         Release rules, in order of precedence:
           1. Static-gate or reduced-motion visitors never see it. They do not
              fetch the video, so there is nothing to wait for.
           2. It stays up until the video reports canplay, or until a hard
              ceiling, whichever lands first. The ceiling matters because the
              poster and the full HTML story are a complete experience on their
              own, so a slow connection should never be held hostage by it.
           3. Once revealed it holds for a short floor so a warm cache shows a
              deliberate beat rather than a flash of tree.                     */
      const LOADER_CEILING = 7000;
      const LOADER_FLOOR = 900;
      /* How long decoding gets after the last byte lands before the curtain
         gives up waiting for canplay and hands over to the poster. */
      const DECODE_GRACE = 2200;
      let loaderShownAt = 0;
      let loaderCeiling = 0;
      let decodeGrace = 0;
      let loaderDone = false;

      function setLoaderProgress(fraction, label) {
        const value = clamp(fraction, 0, 1);
        loader.style.setProperty("--grow", value.toFixed(4));
        if (label && loaderStatus.textContent !== label) loaderStatus.textContent = label;
      }

      function revealLoader() {
        if (loaderDone || !loader.hidden) return;
        loader.hidden = false;
        loaderShownAt = performance.now();
        setLoaderProgress(0, "Preparing the journey");
        loaderCeiling = __setTimeout(() => dismissLoader(), LOADER_CEILING);
      }

      function dismissLoader() {
        if (loaderDone) return;
        loaderDone = true;
        clearTimeout(loaderCeiling);
        clearTimeout(decodeGrace);
        if (loader.hidden) return;
        setLoaderProgress(1);
        const held = performance.now() - loaderShownAt;
        const wait = Math.max(0, LOADER_FLOOR - held);
        __setTimeout(() => {
          loader.classList.add("is-dismissed");
          // Take it out of the accessibility tree and the paint path once the
          // fade has finished, so it can never trap a pointer or a screen reader.
          __setTimeout(() => { loader.hidden = true; }, 700);
        }, wait);
      }

      function showVideoReady() {
        if (isStaticExperience()) return;
        clearTimeout(watchdog);
        video.pause();
        setSiteLoaderProgress(94);
        confirmSiteLoaderFirstFrame();
      }

      function failVideo(message, error = null) {
        if (videoFailureReported) return;
        videoFailureReported = true;
        clearTimeout(watchdog);
        video.classList.remove("is-ready");
        status.hidden = false;
        status.querySelector(".loading-ring").hidden = true;
        statusCopy.textContent = message;
        console.warn(`[SAAE hero] ${message}; using the poster fallback.`, error || "");
        markSiteLoaderFallbackReady();
        __setTimeout(() => { status.hidden = true; }, 3600);
      }

      async function loadDesktopVideo() {
        if (isStaticExperience() || fetchController) return;
        poster.style.backgroundImage = `url("${heroPosterUrl}")`;
        status.hidden = false;
        status.querySelector(".loading-ring").hidden = false;
        statusCopy.textContent = "Loading cinematic scene";
        video.pause();
        video.preload = "auto";
        setSiteLoaderProgress(8);
        /* Hold the controller locally as well. Two downloads can overlap when a
           media query flaps, and a shared handle let the first one's cleanup
           cancel the bookkeeping for the second. */
        const controller = new AbortController();
        fetchController = controller;
        watchdog = __setTimeout(() => {
          if (fetchController !== controller) return;
          controller.abort();
          failVideo("Still scene active");
        }, 20000);

        try {
          const response = await fetch(heroVideoUrl, { signal: controller.signal, cache: "force-cache" });
          if (!response.ok) throw new Error(`Video unavailable: ${response.status}`);
          const contentLength = Number(response.headers.get("content-length")) || 0;
          let blob;
          if (response.body && contentLength > 0) {
            const reader = response.body.getReader();
            const chunks = [];
            let receivedBytes = 0;
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              chunks.push(value);
              receivedBytes += value.byteLength;
              setSiteLoaderProgress(10 + (receivedBytes / contentLength) * 56);
            }
            blob = new Blob(chunks, { type: response.headers.get("content-type") || "video/mp4" });
          } else {
            setSiteLoaderProgress(18);
            blob = await response.blob();
            setSiteLoaderProgress(66);
          }
          if (isStaticExperience()) return;
          blobUrl = URL.createObjectURL(blob);
          video.src = blobUrl;
          video.load();
        } catch (error) {
          /* stopDesktopHero aborts this download on purpose whenever a gate
             flips. A media-query flap can land here with the gate already
             flipped back, and reporting that as a failure latched the poster
             fallback for the rest of the visit -- so the film the scroll lock
             is waiting on never arrived. An abort we asked for is not a
             failure; the watchdog above reports the one that is. */
          if (error && error.name === "AbortError") return;
          if (!isStaticExperience()) failVideo("Still scene active", error);
        } finally {
          if (fetchController === controller) fetchController = null;
        }
      }

      __on(video, "loadedmetadata", () => {
        if (Number.isFinite(video.duration) && video.duration > 0) videoDuration = video.duration;
      });
      __on(video, "canplay", showVideoReady);
      __on(video, "error", () => failVideo("Still scene active"));

      function stopDesktopHero() {
        heroActive = false;
        heroSnapReleased = false;
        setFilmLocked(false);
        document.documentElement.classList.remove("hero-snap-active");
        cancelAnimationFrame(heroFrame);
        clearTimeout(watchdog);
        if (fetchController) fetchController.abort();
        fetchController = null;
        video.pause();
        video.removeAttribute("src");
        video.load();
        video.classList.remove("is-ready");
        poster.style.backgroundImage = "none";
        status.hidden = true;
        // A visitor can turn reduced motion on mid-download, or rotate into a
        // static gate. The download is aborted above, so nothing will ever fire
        // canplay: take the curtain down here or it would sit there forever.
        dismissLoader();
        if (blobUrl) URL.revokeObjectURL(blobUrl);
        blobUrl = "";
      }

      function startDesktopHero() {
        if (heroActive) return;
        staticFrame.removeAttribute("src");
        heroActive = true;
        setFilmLocked(!filmCompleted);
        lastTime = performance.now();
        readHeroProgress();
        easedProgress = targetProgress;
        paintHero(easedProgress);
        heroFrame = __raf(heroLoop);
        loadDesktopVideo();
      }

      function syncHeroMode() {
        if (isStaticExperience()) {
          stopDesktopHero();
          if (!staticFrame.getAttribute("src")) staticFrame.src = heroStaticUrl;
        } else {
          startDesktopHero();
          readHeroProgress();
        }
        syncMotionMode();
      }

      function schedulePagePaint() {
        if (pageFrame) return;
        pageFrame = __raf(() => {
          pageFrame = 0;
          if (heroActive) readHeroProgress();
          updatePageJourney();
        });
      }

      __on(window, "scroll", () => {
        enforceHeroExitWall();
        schedulePagePaint();
        if (ribbonOpen && !ribbon.matches(":focus-within")) {
          clearTimeout(ribbonCloseTimer);
          ribbonCloseTimer = __setTimeout(() => setRibbonOpen(false), 180);
        }
      }, { passive: true });
      __on(window, "wheel", event => {
        if (event.deltaY > 0) releaseHeroSnapForExit();
      }, { passive: true });
      __on(window, "keydown", event => {
        if (["ArrowDown", "PageDown", " ", "Spacebar", "End"].includes(event.key)) {
          releaseHeroSnapForExit();
        }
      });
      __on(window, "resize", () => { measureHeroExit(); schedulePagePaint(); }, { passive: true });
      gates.forEach(gate => __on(gate, "change", syncHeroMode));

      function sectionProgress(rect) {
        return clamp((window.innerHeight * .86 - rect.top) / (rect.height + window.innerHeight * .58), 0, 1);
      }

      function stickyProgress(rect) {
        return clamp(-rect.top / Math.max(1, rect.height - window.innerHeight), 0, 1);
      }

      function setJourneySurface(progress) {
        /* Sampled from the footage itself: the hero opens on #04222a, passes
           through #2b786a and lands on #1a3a1c. The page picks that ending up
           and settles into deep petrol, so leaving the hero is a continuation
           of the grade rather than a cut to a different site. */
        const stops = [
          [18, 51, 43],
          [10, 42, 49],
          [6, 35, 42],
          [9, 45, 48],
          [13, 54, 45]
        ];
        const scaled = clamp(progress, 0, .9999) * (stops.length - 1);
        const index = Math.floor(scaled);
        const mix = scaled - index;
        const tone = stops[index].map((channel, channelIndex) => Math.round(channel + (stops[index + 1][channelIndex] - channel) * mix));
        /* The former three inherited channel variables invalidated every
           descendant in journey-content. A direct colour is pixel-equivalent
           and keeps the existing background-color transition. */
        setStylePropertyIfChanged(journeyContent, "background-color", `rgb(${tone[0]}, ${tone[1]}, ${tone[2]})`);
      }

      function updatePageJourney() {
        /* Read all geometry before the first style write. Interleaving these
           reads with custom-property updates forced synchronous layouts while
           the wheel was still producing events. */
        const rect = journeyContent.getBoundingClientRect();
        const missionRect = (missionReel || missionSection).getBoundingClientRect();
        const sectionRects = journeySections.map(([section]) => section.getBoundingClientRect());
        const heroRect = heroSection.getBoundingClientRect();
        const viewportLead = window.innerHeight * .74;
        const distance = rect.height + window.innerHeight * .4;
        const progress = clamp((viewportLead - rect.top) / distance, 0, 1);
        setJourneySurface(progress);

        const missionProgress = reducedMotion.matches ? 1 : stickyProgress(missionRect);

        const missionSteps = missionItems.length;
        const missionScaled = clamp(missionProgress, 0, .9999) * missionSteps;
        const missionIndex = Math.min(missionSteps - 1, Math.floor(missionScaled));
        /* How far into the step the reader is. Draws the rule beside the copy. */
        setStylePropertyIfChanged(missionItems[missionIndex], "--mission-local", (missionScaled - missionIndex).toFixed(4));

        /* The words are aria-hidden graphics, so they can sit at any partial
           strength: each rolls up through the frame as the reader passes it,
           rather than switching at the boundary. Signed against the word's own
           centre, so one is always on its way out as the next comes up. */
        /* Held half a step in from each end, so the first word is at full
           strength as the section opens and the last one still is when it
           closes, instead of arriving and leaving mid-fade. */
        const wordPos = clamp(missionScaled, .5, missionSteps - .5);
        missionWords.forEach((word, index) => {
          const offset = (index + .5) - wordPos;
          const strength = reducedMotion.matches ? 1 : clamp((.78 - Math.abs(offset)) / .56, 0, 1);
          setStylePropertyIfChanged(word, "--word-t", strength.toFixed(3));
          /* Far enough apart to be two words. At 128px a 216px glyph simply
             sat on top of its neighbour and the pair read as one smudge. */
          setStylePropertyIfChanged(word, "--word-y", (clamp(offset, -1, 1) * 250).toFixed(1));
        });

        /* The copy cannot do that. Three panels share one box, so two of them
           legible at once is two headlines superimposed: it stays a hand-off,
           with a direction. */
        missionItems.forEach((item, index) => {
          item.classList.toggle("is-current", reducedMotion.matches || index === missionIndex);
          item.classList.toggle("is-past", !reducedMotion.matches && index < missionIndex);
        });

        journeySections.forEach(([section], index) => {
          const progressValue = reducedMotion.matches ? .5 : sectionProgress(sectionRects[index]);
          const turn = `${(progressValue * 8).toFixed(2)}deg`;
          journeySectionRosettes.get(section).forEach(rosette => {
            setStylePropertyIfChanged(rosette, "--section-turn", turn);
          });
        });

        const checkpoint = window.innerHeight * .42;
        let currentIndex = 0;
        sectionRects.forEach((sectionRect, index) => {
          if (sectionRect.top <= checkpoint && sectionRect.bottom > checkpoint) currentIndex = index;
        });

        /* Navigation appears only after the cinematic hero has made way. */
        const revealRibbon = heroRect.bottom < window.innerHeight * .9;
        ribbon.classList.toggle("is-visible", revealRibbon);
        if (heroRect.bottom <= window.innerHeight * .55) {
          const currentLabel = journeySections[currentIndex][1];
          const currentCount = `${String(currentIndex + 1).padStart(2, "0")} / ${String(journeySections.length).padStart(2, "0")}`;
          if (ribbonCurrent.textContent !== currentLabel) ribbonCurrent.textContent = currentLabel;
          if (ribbonCount.textContent !== currentCount) ribbonCount.textContent = currentCount;
        }
      }

      function setRibbonOpen(open, restoreFocus = false) {
        ribbonOpen = open;
        ribbon.classList.toggle("is-open", open);
        ribbonToggle.setAttribute("aria-expanded", String(open));
        ribbonPanel.setAttribute("aria-hidden", String(!open));
        ribbonPanel.toggleAttribute("inert", !open);
        if (open) {
          const firstLink = ribbonPanel.querySelector("a");
          __setTimeout(() => firstLink.focus({ preventScroll: true }), 80);
        } else if (restoreFocus) {
          ribbonToggle.focus({ preventScroll: true });
        }
      }

      __on(ribbonToggle, "click", () => setRibbonOpen(!ribbonOpen));
      __on(ribbonPanel, "click", event => {
        if (event.target.closest("a")) setRibbonOpen(false);
      });
      __on(document, "pointerdown", event => {
        if (ribbonOpen && !ribbon.contains(event.target)) setRibbonOpen(false);
      });
      __on(document, "keydown", event => {
        if (event.key === "Escape" && ribbonOpen) setRibbonOpen(false, true);
      });

      const revealItems = Array.from(document.querySelectorAll(".reveal"));
      let revealObserver = null;
      let motionWasReduced = reducedMotion.matches;

      function syncMotionMode() {
        if (revealObserver) revealObserver.disconnect();
        if (reducedMotion.matches) {
          revealItems.forEach(item => item.classList.add("is-visible"));
          setNetworkProgress(1);
          motionWasReduced = true;
          schedulePagePaint();
          return;
        }
        if (motionWasReduced) setNetworkProgress(0);
        motionWasReduced = false;
        revealObserver = new __IntersectionObserver(entries => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              entry.target.classList.add("is-visible");
              revealObserver.unobserve(entry.target);
            }
          });
        }, { threshold: .12, rootMargin: "0px 0px -7%" });
        revealItems.forEach(item => {
          if (!item.classList.contains("is-visible")) revealObserver.observe(item);
        });
        schedulePagePaint();
      }

      const networkField = document.getElementById("hold");
      const networkState = document.getElementById("network-state");
      let networkProgress = 0;
      let networkHolding = false;
      let networkFrame = 0;
      let networkLastTime = performance.now();

      function setNetworkProgress(progress) {
        if (!networkField || !networkState) return;
        networkProgress = clamp(progress, 0, 1);
        networkField.style.setProperty("--growth", networkProgress.toFixed(4));
        networkField.setAttribute("aria-pressed", String(networkProgress >= .995));
        const nextState = networkProgress >= .995 ? "The network is connected" : networkProgress >= .36 ? "Keep connecting" : "Press and hold";
        if (networkState.textContent !== nextState) networkState.textContent = nextState;
      }

      function networkLoop(now) {
        const delta = Math.min(64, Math.max(1, now - networkLastTime));
        networkLastTime = now;
        const direction = networkHolding ? 1 : -1;
        const speed = networkHolding ? .00029 : .00042;
        setNetworkProgress(networkProgress + direction * speed * delta);
        if (networkHolding || networkProgress > 0) networkFrame = __raf(networkLoop);
      }

      function beginNetwork(event) {
        if (reducedMotion.matches) return;
        if (event.type === "keydown" && event.repeat) return;
        networkHolding = true;
        document.body.classList.add("network-active");
        if (event.pointerId !== undefined) networkField.setPointerCapture(event.pointerId);
        cancelAnimationFrame(networkFrame);
        networkLastTime = performance.now();
        networkFrame = __raf(networkLoop);
      }

      function endNetwork() {
        if (!networkHolding || reducedMotion.matches) return;
        networkHolding = false;
        document.body.classList.remove("network-active");
        cancelAnimationFrame(networkFrame);
        networkLastTime = performance.now();
        networkFrame = __raf(networkLoop);
      }

      if (networkField) {
        __on(networkField, "pointerdown", beginNetwork);
        __on(networkField, "pointerup", endNetwork);
        __on(networkField, "pointercancel", endNetwork);
        __on(networkField, "lostpointercapture", endNetwork);
        __on(networkField, "keydown", event => {
          if (event.key === " " || event.key === "Enter") {
            event.preventDefault();
            beginNetwork(event);
          }
        });
        __on(networkField, "keyup", event => {
          if (event.key === " " || event.key === "Enter") {
            event.preventDefault();
            endNetwork();
          }
        });
        __on(networkField, "blur", endNetwork);
      }

      setNetworkProgress(reducedMotion.matches ? 1 : 0);

      const siteLoader = document.getElementById("site-loader");
      const siteLoaderProgress = document.getElementById("site-loader-progress");
      const siteLoaderMinimumMs = reducedMotion.matches ? 1000 : 1100;
      const siteLoaderScrollKeys = new Set(["ArrowDown", "ArrowUp", "PageDown", "PageUp", "Home", "End", " "]);
      let siteLoaderProgressValue = 0;
      let siteLoaderDismissed = false;
      let siteLoaderCompleting = false;
      let siteLoaderMinimumComplete = false;
      let siteLoaderVideoReady = isStaticExperience();
      let siteLoaderUsingFallback = false;
      let siteLoaderFramePending = false;
      let siteLoaderMinimumTimer = 0;
      let siteLoaderCompletionTimer = 0;
      let siteLoaderSafetyTimer = 0;
      let siteLoaderFrameTimer = 0;
      let siteLoaderFrameRequest = 0;

      const preventSiteLoaderScroll = event => event.preventDefault();
      const preventSiteLoaderKeyScroll = event => {
        if (siteLoaderScrollKeys.has(event.key)) event.preventDefault();
      };
      const setSiteLoaderProgress = value => {
        if (!siteLoader || !siteLoaderProgress || siteLoaderDismissed) return;
        siteLoaderProgressValue = Math.max(siteLoaderProgressValue, clamp(value, 0, 100));
        siteLoader.style.setProperty("--site-loader-progress", siteLoaderProgressValue.toFixed(2));
        siteLoaderProgress.setAttribute("aria-valuenow", String(Math.round(siteLoaderProgressValue)));
      };
      const updateSiteLoaderBufferedProgress = () => {
        if (!Number.isFinite(video.duration) || video.duration <= 0 || video.buffered.length === 0) return;
        setSiteLoaderProgress(25 + clamp(video.buffered.end(video.buffered.length - 1) / video.duration, 0, 1) * 45);
      };
      const onSiteLoaderLoadStart = () => setSiteLoaderProgress(10);
      const onSiteLoaderMetadata = () => setSiteLoaderProgress(72);
      const onSiteLoaderProgress = () => updateSiteLoaderBufferedProgress();
      const onSiteLoaderData = () => setSiteLoaderProgress(86);
      const onSiteLoaderCanPlayThrough = () => setSiteLoaderProgress(97);

      const releaseSiteLoaderInputLock = () => {
        window.removeEventListener("wheel", preventSiteLoaderScroll);
        window.removeEventListener("touchmove", preventSiteLoaderScroll);
        window.removeEventListener("keydown", preventSiteLoaderKeyScroll);
      };

      const cleanupSiteLoader = () => {
        window.clearTimeout(siteLoaderMinimumTimer);
        window.clearTimeout(siteLoaderCompletionTimer);
        window.clearTimeout(siteLoaderSafetyTimer);
        window.clearTimeout(siteLoaderFrameTimer);
        video.removeEventListener("loadstart", onSiteLoaderLoadStart);
        video.removeEventListener("loadedmetadata", onSiteLoaderMetadata);
        video.removeEventListener("progress", onSiteLoaderProgress);
        video.removeEventListener("loadeddata", onSiteLoaderData);
        video.removeEventListener("canplaythrough", onSiteLoaderCanPlayThrough);
        if (siteLoaderFrameRequest && "cancelVideoFrameCallback" in video) video.cancelVideoFrameCallback(siteLoaderFrameRequest);
      };
      const activateHeroVideo = () => {
        if (siteLoaderUsingFallback || isStaticExperience()) return;
        video.pause();
        try { video.currentTime = 0; } catch (_) { /* The decoded first frame remains visible. */ }
        video.classList.add("is-ready");
        status.hidden = true;
        lastPaintedProgress = -1;
        paintHero(easedProgress, true);
      };
      const dismissSiteLoader = () => {
        if (siteLoaderDismissed || !siteLoader) return;
        siteLoaderDismissed = true;
        cleanupSiteLoader();
        activateHeroVideo();
        // Start the copy on the same frame as the curtain fade. It remains in
        // motion when the page first becomes visible, rather than waiting.
        document.documentElement.classList.add("hero-opening-ready");
        siteLoader.classList.add("is-done");
        const fadeDuration = reducedMotion.matches ? 260 : 480;
        __setTimeout(() => {
          siteLoader.classList.add("is-hidden");
          document.documentElement.classList.remove("site-loading");
          releaseSiteLoaderInputLock();
          schedulePagePaint();
        }, fadeDuration);
      };
      const completeSiteLoader = () => {
        if (!siteLoader || siteLoaderDismissed || siteLoaderCompleting || !siteLoaderMinimumComplete || !siteLoaderVideoReady) return;
        siteLoaderCompleting = true;
        setSiteLoaderProgress(100);
        siteLoader.classList.add("is-complete");
        siteLoaderCompletionTimer = __setTimeout(dismissSiteLoader, reducedMotion.matches ? 90 : 210);
      };
      const markSiteLoaderVideoReady = () => {
        siteLoaderVideoReady = true;
        setSiteLoaderProgress(99);
        completeSiteLoader();
      };
      const markSiteLoaderFallbackReady = () => {
        siteLoaderUsingFallback = true;
        siteLoaderVideoReady = true;
        setSiteLoaderProgress(95);
        completeSiteLoader();
      };
      const confirmSiteLoaderFirstFrame = () => {
        if (siteLoaderFramePending || siteLoaderVideoReady || isStaticExperience()) return;
        siteLoaderFramePending = true;
        const confirmFrame = () => {
          if (siteLoaderVideoReady || video.readyState < 3) return;
          siteLoaderFramePending = false;
          window.clearTimeout(siteLoaderFrameTimer);
          siteLoaderFrameRequest = 0;
          markSiteLoaderVideoReady();
        };
        if ("requestVideoFrameCallback" in video) siteLoaderFrameRequest = video.requestVideoFrameCallback(confirmFrame);
        siteLoaderFrameTimer = __setTimeout(confirmFrame, 520);
      };

      if (siteLoader) {
        __on(window, "wheel", preventSiteLoaderScroll, { passive: false });
        __on(window, "touchmove", preventSiteLoaderScroll, { passive: false });
        __on(window, "keydown", preventSiteLoaderKeyScroll);
        __on(video, "loadstart", onSiteLoaderLoadStart);
        __on(video, "loadedmetadata", onSiteLoaderMetadata);
        __on(video, "progress", onSiteLoaderProgress);
        __on(video, "loadeddata", onSiteLoaderData);
        __on(video, "canplaythrough", onSiteLoaderCanPlayThrough);
        setSiteLoaderProgress(isStaticExperience() ? 92 : 4);
        siteLoaderMinimumTimer = __setTimeout(() => {
          siteLoaderMinimumComplete = true;
          completeSiteLoader();
        }, siteLoaderMinimumMs);
        siteLoaderSafetyTimer = __setTimeout(() => {
          if (!siteLoaderVideoReady) failVideo("Still scene active");
        }, 22000);
      }

      /* A refresh part-way down the page used to restore that offset, which put
         the visitor past the film with nothing left to hold them: the lock only
         exists once playback starts. Deep links still work, because an explicit
         hash is a destination the visitor asked for. */
      if ("scrollRestoration" in history) history.scrollRestoration = "manual";
      if (!location.hash) window.scrollTo(0, 0);

      __raf(() => __raf(() => {
        syncHeroMode();
        updatePageJourney();
        measureHeroExit();
        /* Restored past the hero (an explicit hash) counts as already
           through the film; everyone else starts at the top, locked. */
        if (window.scrollY > heroExitY + 2) filmCompleted = true;
        setFilmLocked(heroActive && !filmCompleted && !isStaticExperience());
        if (isStaticExperience()) completeSiteLoader();
      }));
    })();
  </script>

  <!-- Self-hosted, so the page still makes no third-party request and the
       privacy note in the README stays true. Deferred, so the inline script
       above has already started the hero download before any of this parses:
  };
  try { __run(); } catch (error) { console.error("initHeroCinema failed", error); }
  return __teardown;
}
