    (() => {
      "use strict";

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
      /* There is no video any more. The hero is drawn, not decoded.
         The lock, the snap latch and the stats sync all branch on
         video.classList.contains("is-ready"), and all of them do the right
         thing when it is false: a plain eased scrub with no playback engine.
         This stand-in keeps that single branch live rather than rewriting three
         interlocking mechanisms to remove a condition that is already correct.
         Nothing here ever becomes ready; the canvas is the picture. */
      const video = {
        classList: { contains: () => false, remove() {}, add() {} },
        duration: NaN, currentTime: 0, paused: true, seeking: false, playbackRate: 1,
        readyState: 0, error: null, src: "",
        buffered: { length: 0 },
        play: () => Promise.resolve(), pause() {}, load() {},
        setAttribute() {}, getAttribute: () => null, removeAttribute() {},
        addEventListener() {}, removeEventListener() {}
        /* requestVideoFrameCallback and cancelVideoFrameCallback are absent on
           purpose. The loader tests for them with `in`, which is true for a key
           holding undefined, so declaring them would send it down the decoder
           path and call undefined. Leaving them off takes the rAF fallback,
           which is the path that works without a decoder. */
      };
      const staticFrame = document.getElementById("static-frame");
      /* The loading ring and its copy are gone with the download. */
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
      const communityPips = document.getElementById("community-pips");
      let communityPipButtons = [];
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
      const heroPosterUrl = "/cinematic/images/hero-start.png";
      const heroVideoUrl = "/cinematic/hero-scrub.mp4";
      const heroStaticUrl = "/cinematic/images/hero-static.jpg";
      let journeyLabels = ["Opening", "Roots", "Learning", "Achievements", "Initiative", "Syria"];
      /* Where the READING order changes hands -- which band is inert, which one
         owns the pointer, what the ribbon says. Each is the midpoint of the
         dissolve it sits in, so the semantic switch happens at the frame the
         two captions are equally faded.

         These used to be composition thresholds picked independently of the
         scene: .125, .395, .56, .72, .89. The scene's own schedule is in
         tree-story.js and does not have edges there, so the captions changed at
         moments when nothing on screen was changing, and the picture changed at
         moments when the caption did not. They are the same schedule now. */
      const heroBeatThresholds = [.095, .346, .518, .690, .855];
      let lastRootStep = -1;
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
      let pendingSeekTime = 0;
      /* Set by the "saae:hero-ready" handshake from /cinematic/js/hero-instrument.js.
         Null until then, and null again if the GL context is lost, in which
         case the poster is simply still there under the faded-out canvas. */
      let instrument = null;
      let pageFrame = 0;
      let ribbonOpen = false;
      let ribbonCloseTimer = 0;
      let videoFailureReported = false;
      let lastStatsRatio = -1;
      let communityFlipIndex = 0;
      let communityFlipTimer = 0;
      let communityFlipResetTimer = 0;
      /* Where a flip that is still turning is going. Every control reads its
         next target from here rather than from communityFlipIndex, so a press
         that arrives mid-turn counts from where the card is GOING, not from
         where it set off. Three quick presses used to land on the second card
         instead of the fourth, because all three were measured against a
         communityFlipIndex that had not been committed yet. */
      let communityFlipPending = -1;
      let communityBrowsed = false;
      const communityFlipGroup = document.querySelector(".community-flip");
      const communityTarget = () => (communityFlipPending >= 0 ? communityFlipPending : communityFlipIndex);
      /* How long a card holds before the next one turns in by itself, while
         the reader stays on the communities beat. */
      const COMMUNITY_FLIP_INTERVAL_MS = 5000;
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
        const t = clamp(ratio, 0, 1);
        const eased = 1 - Math.pow(1 - t, 1.35);
        statNumbers.forEach(number => {
          const target = Number(number.dataset.count);
          const value = Math.round(target * eased);
          /* The "+" is a claim about the real total, so it only appears on the
             real total. Mid-count it read as "4,741+ trainees", which is a
             number the association has never published. */
          const plus = t >= 1 && !number.dataset.exact ? "+" : "";
          number.textContent = `${value.toLocaleString("en-US")}${plus}`;
        });
      }

      /* ---- the digits ------------------------------------------------------
         Every other element in this hero is a pure function of scroll position,
         which is what makes the whole thing scrub cleanly in both directions.
         The digits were the exception. They rode a ratio that was guarded
         `if (ratio <= statsShownRatio) return;` -- monotonic, so scrubbing back
         left the numbers standing at their totals -- and when the reader was
         already parked on the beat it fell back to a wall clock instead. Worse:
         the branch it chose keyed off `video.classList.contains("is-ready")`,
         and the video is a stub that never becomes ready, so in practice the
         numbers ALWAYS ran on the clock and never touched the scroll at all.

         They are a function of progress now, like the rest. They count across
         the first half of their own band and hold the total for the rest of it,
         so the same scroll position always shows the same number, going up or
         going down, and the reader who scrolls back to check a figure sees it
         count back down rather than sitting there. */
      /* The window is the ASSEMBLY of the block behind them, not the band.

         The dot art for this beat spells the same four figures the tiles do, so
         while the tiles count the two disagree in the open: the art reading
         5,000+ next to a tile reading 3,684. Making the digits scroll-driven is
         what exposed it -- on the old wall clock the count was over in a second
         and a half and rarely overlapped anything.

         So the count runs exactly as long as the dots take to arrive (the
         reveal window of the second fruit visit, .552 to .578 in tree-story.js)
         and lands with them. The block assembles and the digits spin up
         together, and for the whole hold after it -- about nine hundred pixels
         of scroll -- every number on screen says the same thing. */
      const STATS_COUNT_FROM = .560;
      const STATS_COUNT_TO = .580;

      function paintStatsForProgress(progress) {
        if (!statNumbers.length) return;
        const ratio = clamp((progress - STATS_COUNT_FROM) / (STATS_COUNT_TO - STATS_COUNT_FROM), 0, 1);
        /* One decimal place finer than the paint gate, so the digits keep
           stepping for as long as the scene does and stop when it stops. */
        if (Math.abs(ratio - lastStatsRatio) < .0008) return;
        lastStatsRatio = ratio;
        paintStats(ratio);
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
        { number: "02", name: "Smart Urban", copy: "Design smarter, more responsive cities.", icon: "city" },
        { number: "03", name: "Healthcare", copy: "Apply AI where care matters.", icon: "healthcare" },
        { number: "04", name: "Smart Research", copy: "Move ideas from questions to evidence.", icon: "research" },
        { number: "05", name: "Software", copy: "Build useful digital systems.", icon: "software" },
        { number: "06", name: "Smart Economy", copy: "Turn innovation into opportunity.", icon: "economy" },
        { number: "07", name: "Trainers", copy: "Equip the people who teach others.", icon: "trainers" },
        { number: "08", name: "Media", copy: "Make knowledge clear and accessible.", icon: "media" },
        { number: "09", name: "Quality Entrepreneurship", copy: "Raise the standard for new ventures.", icon: "quality" }
      ];

      const arabicCommunityFlipItems = [
        { number: "01", name: "البيانات", copy: "حوّل المعلومات إلى رؤى.", icon: "data" },
        { number: "02", name: "العمراني الذكي", copy: "صمّم مدناً أذكى وأكثر استجابة.", icon: "city" },
        { number: "03", name: "الرعاية الصحية", copy: "طبّق الذكاء الاصطناعي حيث تكون الرعاية مهمة.", icon: "healthcare" },
        { number: "04", name: "البحث الذكي", copy: "انقل الأفكار من الأسئلة إلى الأدلة.", icon: "research" },
        { number: "05", name: "البرمجيات", copy: "ابنِ أنظمة رقمية مفيدة.", icon: "software" },
        { number: "06", name: "الاقتصاد الذكي", copy: "حوّل الابتكار إلى فرص.", icon: "economy" },
        { number: "07", name: "المدربون", copy: "تجهيز من يعلّمون غيرهم.", icon: "trainers" },
        { number: "08", name: "الإعلام", copy: "جعل المعرفة واضحة ومتاحة.", icon: "media" },
        { number: "09", name: "الجودة الريادية", copy: "رفع معيار المشاريع الناشئة.", icon: "quality" }
      ];

      function paintCommunityFace(side, item) {
        const fields = side === "front"
          ? [communityCardIcon, communityCardName, communityCardCopy, communityCardCount]
          : [communityCardNextIcon, communityCardNextName, communityCardNextCopy, communityCardNextCount];
        fields[0].innerHTML = communityIcons[item.icon];
        fields[1].textContent = item.name;
        fields[2].textContent = item.copy;
        fields[3].textContent = `${Number(item.number)} / ${communityFlipItems.length}`;
      }

      function paintCommunityNavigation(index) {
        const previous = communityFlipItems[(index - 1 + communityFlipItems.length) % communityFlipItems.length];
        const next = communityFlipItems[(index + 1) % communityFlipItems.length];
        if (communityCardPrevious) communityCardPrevious.setAttribute("aria-label", `Show ${previous.name} community`);
        if (communityCardNext) communityCardNext.setAttribute("aria-label", `Show ${next.name} community`);
      }

      function buildCommunityPips() {
        if (!communityPips) return;
        communityPips.textContent = "";
        communityPipButtons = communityFlipItems.map((item, index) => {
          const pip = document.createElement("button");
          pip.type = "button";
          pip.className = "community-pip";
          pip.dataset.community = String(index);
          /* The dot is a ::before, so the button holds no text of its own and
             the community's name has to be its accessible name. */
          pip.setAttribute("aria-label", item.name);
          /* Read by .community-pip::after, so the dot can name itself on hover
             and on focus without a screen reader hearing the name twice. */
          pip.dataset.name = item.name;
          pip.addEventListener("click", () => selectCommunity(index, index > communityTarget() ? 1 : -1));
          communityPips.append(pip);
          return pip;
        });
        paintCommunityPips(communityFlipIndex);
      }

      function paintCommunityPips(index) {
        communityPipButtons.forEach((pip, pipIndex) => {
          pip.setAttribute("aria-current", pipIndex === index ? "true" : "false");
          pip.setAttribute("aria-label", communityFlipItems[pipIndex].name);
          pip.dataset.name = communityFlipItems[pipIndex].name;
        });
      }

      function showCommunityCard(index) {
        communityFlipIndex = (index + communityFlipItems.length) % communityFlipItems.length;
        paintCommunityFace("front", communityFlipItems[communityFlipIndex]);
        paintCommunityFace("back", communityFlipItems[(communityFlipIndex + 1) % communityFlipItems.length]);
        paintCommunityNavigation(communityFlipIndex);
        paintCommunityPips(communityFlipIndex);
        instrument?.setCommunity?.(communityFlipIndex);
      }

      window.addEventListener("saae:languagechange", event => {
        const arabicMode = event.detail?.lang === "ar";
        journeyLabels = arabicMode
          ? ["البداية", "الجذور", "التعلّم", "الأثر", "المبادرة", "سورية"]
          : ["Opening", "Roots", "Learning", "Achievements", "Initiative", "Syria"];
        const source = arabicMode ? arabicCommunityFlipItems : communityFlipItems;
        if (arabicMode) {
          communityFlipItems.splice(0, communityFlipItems.length, ...source);
        } else {
          communityFlipItems.splice(0, communityFlipItems.length,
            { number: "01", name: "Data", copy: "Turn information into insight.", icon: "data" },
            { number: "02", name: "Smart Urban", copy: "Design smarter, more responsive cities.", icon: "city" },
            { number: "03", name: "Healthcare", copy: "Apply AI where care matters.", icon: "healthcare" },
            { number: "04", name: "Smart Research", copy: "Move ideas from questions to evidence.", icon: "research" },
            { number: "05", name: "Software", copy: "Build useful digital systems.", icon: "software" },
            { number: "06", name: "Smart Economy", copy: "Turn innovation into opportunity.", icon: "economy" },
            { number: "07", name: "Trainers", copy: "Equip the people who teach others.", icon: "trainers" },
            { number: "08", name: "Media", copy: "Make knowledge clear and accessible.", icon: "media" },
            { number: "09", name: "Quality Entrepreneurship", copy: "Raise the standard for new ventures.", icon: "quality" }
          );
        }
        const captions = missionWordCaptions[arabicMode ? "ar" : "en"];
        /* The pips carry the community names, so they are rebuilt with them. */
        buildCommunityPips();
        /* The film rebuild is not queued here: motion.js fires saae:bandsplit
           once it has re-split the translated headings, and that is what the
           timeline listens to. */
        missionWords.forEach((word, index) => { word.dataset.caption = captions[index]; });
        showCommunityCard(communityFlipIndex);
      });

      function stopCommunityFlip() {
        clearInterval(communityFlipTimer);
        clearTimeout(communityFlipTimer);
        clearTimeout(communityFlipResetTimer);
        communityFlipTimer = 0;
        communityFlipResetTimer = 0;
        /* A flip caught in the air by a scroll away from the beat still lands.
           Dropping it instead would rewind a press the reader had already made,
           and leave the pips pointing at a card the front face never became. */
        if (communityFlipPending >= 0) {
          communityFlipIndex = communityFlipPending;
          communityFlipPending = -1;
          showCommunityCard(communityFlipIndex);
        }
        communityFlipGroup?.classList.remove("is-inviting");
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
        requestAnimationFrame(() => communityFlipTrack.classList.remove("is-resetting"));
      }

      /* Read the rotation's length back out of the stylesheet, so the moment the
         new front face is committed cannot drift away from the moment the card
         actually finishes turning. */
      function communityFlipDurationMs() {
        if (!communityFlipTrack) return 540;
        const raw = getComputedStyle(communityFlipTrack).getPropertyValue("--community-flip-ms").trim();
        const value = parseFloat(raw);
        if (!Number.isFinite(value)) return 540;
        return raw.endsWith("ms") ? value : value * 1000;
      }

      /* Land a flip that is still turning, at once and without animating the
         rest of it: adopt its target as the front face, then drop the rotation
         with transitions off. A press arriving mid-turn starts from a square
         card, rather than waiting out the milliseconds still owed to the press
         before it. */
      function settleCommunityFlip() {
        if (communityFlipPending < 0 || !communityFlipTrack) return false;
        clearTimeout(communityFlipResetTimer);
        communityFlipResetTimer = 0;
        communityFlipIndex = communityFlipPending;
        communityFlipPending = -1;
        showCommunityCard(communityFlipIndex);
        communityFlipTrack.classList.add("is-resetting");
        communityFlipTrack.classList.remove("is-flipped", "is-flipped-reverse");
        void communityFlipTrack.offsetWidth;
        return true;
      }

      function advanceCommunityFlip() {
        if (!communityFlipTrack) return;
        transitionCommunityCard(communityTarget() + 1);
      }

      function transitionCommunityCard(index, direction = 1) {
        if (!communityFlipTrack) return;
        const nextIndex = (index + communityFlipItems.length) % communityFlipItems.length;
        const interrupted = settleCommunityFlip();
        if (nextIndex === communityFlipIndex) {
          if (interrupted) requestAnimationFrame(() => communityFlipTrack.classList.remove("is-resetting"));
          showCommunityCard(nextIndex);
          return;
        }
        paintCommunityFace("back", communityFlipItems[nextIndex]);
        /* The pips lead the flip rather than trailing it. They are the control,
           and a control that answers half a second after it is pressed reads as
           a control that did not register the press. */
        paintCommunityPips(nextIndex);
        communityFlipPending = nextIndex;
        const spin = () => {
          communityFlipTrack.classList.remove("is-resetting");
          void communityFlipTrack.offsetWidth;
          communityFlipTrack.classList.add(direction < 0 ? "is-flipped-reverse" : "is-flipped");
        };
        /* After an interrupt the square card has to hold for one frame before
           the new rotation is attached. Attach it in the same style pass and the
           browser folds the reset and the rotation into one, so the card arrives
           at the far side without ever appearing to turn. */
        if (interrupted) requestAnimationFrame(spin);
        else spin();
        communityFlipResetTimer = window.setTimeout(() => {
          communityFlipPending = -1;
          communityFlipIndex = nextIndex;
          showCommunityCard(communityFlipIndex);
          resetCommunityFlipTransform();
          communityFlipResetTimer = 0;
        }, communityFlipDurationMs() + (interrupted ? 40 : 20));
      }

      /* ---- the auto-flip ---------------------------------------------------
         While the reader stays on the communities beat, the card turns to the
         next community every five seconds. It holds still while the reader is
         working with it: a pointer over the card or the pips, or keyboard
         focus inside the navigator. A card that turns away mid-sentence, or out
         from under a cursor on its way to the next arrow, is worse than a card
         that never moved. Mouse clicks leave focus on the button they pressed,
         so only keyboard focus (:focus-visible) counts, otherwise one click
         would stop the cycle until the reader clicked somewhere else. */
      let communityHovered = false;
      let communityKeyboardFocus = false;
      const communityCardFront = document.querySelector(".community-card-front");
      const communityAutoFlipAllowed = () => !reducedMotion.matches;

      /* The front face is a polite live region so a press is read out. A timer
         is not a press: announcing every five seconds would talk over whatever
         the screen reader was doing, so automatic turns go by silently. */
      function setCommunityAnnouncements(on) {
        communityCardFront?.setAttribute("aria-live", on ? "polite" : "off");
      }

      /* (Re)start the countdown to the next automatic flip, always from a full
         five seconds. Never under reduced motion, where a card that turns on
         its own is exactly the movement the reader asked not to get. */
      function scheduleCommunityAutoFlip() {
        clearInterval(communityFlipTimer);
        clearTimeout(communityFlipTimer);
        communityFlipTimer = 0;
        if (activeBand !== 1 || !communityAutoFlipAllowed()) return;
        if (communityHovered || communityKeyboardFocus) return;
        communityFlipTimer = window.setInterval(() => {
          /* A background tab owes nobody a flip. */
          if (document.hidden) return;
          setCommunityAnnouncements(false);
          advanceCommunityFlip();
        }, COMMUNITY_FLIP_INTERVAL_MS);
      }

      function pauseCommunityAutoFlip() {
        clearInterval(communityFlipTimer);
        clearTimeout(communityFlipTimer);
        communityFlipTimer = 0;
      }

      communityFlipGroup?.addEventListener("pointerenter", event => {
        if (event.pointerType === "touch") return;
        communityHovered = true;
        pauseCommunityAutoFlip();
      });
      communityFlipGroup?.addEventListener("pointerleave", event => {
        if (event.pointerType === "touch") return;
        communityHovered = false;
        scheduleCommunityAutoFlip();
      });
      /* Cursor spotlight for the desktop card lift. Writes the pointer's
         position into --card-spot-x/--card-spot-y on the flip track, where the
         faces' ::before radial light reads it. One rect read per frame, touch
         pointers ignored, and nothing written under reduced motion; the track
         rect is used because the card may be rotated mid-flip. */
      let communitySpotFrame = 0;
      communityFlipGroup?.addEventListener("pointermove", event => {
        if (event.pointerType === "touch") return;
        if (communitySpotFrame) return;
        const spotX = event.clientX;
        const spotY = event.clientY;
        communitySpotFrame = requestAnimationFrame(() => {
          communitySpotFrame = 0;
          if (reducedMotion.matches || !communityFlipTrack) return;
          const rect = communityFlipTrack.getBoundingClientRect();
          if (rect.width <= 0 || rect.height <= 0) return;
          const x = clamp((spotX - rect.left) / rect.width, 0, 1) * 100;
          const y = clamp((spotY - rect.top) / rect.height, 0, 1) * 100;
          communityFlipTrack.style.setProperty("--card-spot-x", `${x.toFixed(2)}%`);
          communityFlipTrack.style.setProperty("--card-spot-y", `${y.toFixed(2)}%`);
        });
      });
      communityFlipGroup?.addEventListener("focusin", event => {
        let keyboard = false;
        try { keyboard = event.target.matches(":focus-visible"); } catch { keyboard = true; }
        if (!keyboard) return;
        communityKeyboardFocus = true;
        pauseCommunityAutoFlip();
      });
      communityFlipGroup?.addEventListener("focusout", event => {
        if (communityFlipGroup.contains(event.relatedTarget)) return;
        if (!communityKeyboardFocus) return;
        communityKeyboardFocus = false;
        scheduleCommunityAutoFlip();
      });

      function startCommunityFlip() {
        stopCommunityFlip();
        showCommunityCard(communityFlipIndex);
        /* The pulsing next arrow was the only sign there were nine. When the
           cards cycle by themselves they say so already, and the pulse would
           just be a second thing moving; it stays for reduced motion, where
           nothing cycles. */
        if (!communityBrowsed && !communityAutoFlipAllowed()) communityFlipGroup?.classList.add("is-inviting");
        scheduleCommunityAutoFlip();
      }

      function selectCommunity(index, direction) {
        /* The invitation has done its work the moment the navigator is used. */
        communityBrowsed = true;
        communityFlipGroup?.classList.remove("is-inviting");
        setCommunityAnnouncements(true);
        transitionCommunityCard(index, direction);
        /* A manual press keeps the auto-flip going but gives the card the reader
           just chose a full five seconds, rather than turning it away early. */
        scheduleCommunityAutoFlip();
      }

      communityCardPrevious?.addEventListener("click", () => selectCommunity(communityTarget() - 1, -1));
      communityCardNext?.addEventListener("click", () => selectCommunity(communityTarget() + 1, 1));

      /* Arrow keys across the whole navigator, so once anything in it has focus
         the nine are one control rather than eleven separate ones. Mirrored in
         Arabic: an arrow key points at a direction on screen, and in RTL the
         next community is to the LEFT. */
      communityFlipGroup?.addEventListener("keydown", event => {
        if (event.altKey || event.ctrlKey || event.metaKey) return;
        const rtl = document.documentElement.dir === "rtl";
        let target = null;
        const from = communityTarget();
        if (event.key === "ArrowRight") target = from + (rtl ? -1 : 1);
        else if (event.key === "ArrowLeft") target = from + (rtl ? 1 : -1);
        else if (event.key === "Home") target = 0;
        else if (event.key === "End") target = communityFlipItems.length - 1;
        if (target === null) return;
        event.preventDefault();
        const wrapped = (target + communityFlipItems.length) % communityFlipItems.length;
        if (wrapped === from) return;
        selectCommunity(wrapped, target > from ? 1 : -1);
        /* Keep focus on the pip that is now current, so the reader can keep
           arrowing and hears each community named as they arrive. */
        communityPipButtons[wrapped]?.focus();
      });

      /* ---- the film -------------------------------------------------------
         One playhead for the whole hero.

         The scene was always a pure function of scroll. The captions were not:
         a step function over `heroBeatThresholds` picked one of six, CSS faded
         it on a 440ms timer, and motion.js ran a 600ms GSAP stagger on its
         words. Three clocks, none of which knew where the reader's hand was,
         layered over a picture that tracked it exactly. That is what made a
         film read as a slide deck -- not the length, and not the smoothing.

         Now there is one timeline, it holds every caption in the hero, and it
         is seeked from the same eased progress that renders the scene, in the
         same frame. Nothing here has a duration in seconds.

         The cues are the SCENE's schedule, taken from tree-story.js rather
         than invented: a caption leaves while the camera is travelling to the
         next thing and the next caption arrives on the same move. So the text
         never changes over a still picture, and the picture never changes
         under still text -- the two are the same event, which is the whole
         difference between a cut and a dissolve.

           .055-.135   the camera drops from the whole mark into the roots
           .320-.372   travel to the first fruit
           .492-.544   travel to the second
           .664-.716   travel to the third
           .836-.874   the tree collapses into the country

         Each caption is solid for the whole hold between its own two moves,
         which is the part anybody actually reads. */
      const FILM_UNITS = 1000;
      /* A caption is not a picture, and this is where the film analogy has to be
         applied rather than copied.

         Two shots cross-dissolved both fill the frame, so at the midpoint you
         read one image through another. Two CAPTIONS do not fill the frame --
         they sit at different heights, in different layouts -- so dissolving
         them at fifty percent each puts two headlines and a button on top of
         one another and you can read none of them. Tried it; it is worse than
         the cut it replaced.

         What a film actually does when the camera leaves one subject for
         another is drop the title, move, and bring the next title up on
         arrival. The move carries the transition. So the outgoing caption has
         the front of the camera move and the incoming one has the back, with a
         breath between them where the picture is alone and travelling -- which
         is the one moment in the whole hero where nothing needs saying.

         .46 each, so the gap is eight percent of the move: at a 52-thousandth
         window that is about sixty pixels of scroll. Long enough to separate
         them, far too short to read as a stall. */
      const HANDOFF_SHARE = .46;
      const CAPTION_CUES = [
        { band: 0, enter: null,          exit: [.055, .135] },
        { band: 1, enter: [.055, .135],  exit: [.320, .372] },
        { band: 2, enter: [.320, .372],  exit: [.492, .544] },
        { band: 3, enter: [.492, .544],  exit: [.664, .716] },
        { band: 4, enter: [.664, .716],  exit: [.836, .874] },
        { band: 5, enter: [.836, .874],  exit: null }
      ];

      let film = null;

      function buildFilm() {
        const A = window.anime;
        if (!A || !A.createTimeline || !bands.length) return;
        /* On a phone there is no film to caption. The six bands are the page
           there -- stacked sections a reader scrolls through -- and a timeline
           that writes opacity and y to them inline would hold five of the six
           at zero for ever, because nothing is ever going to move the playhead.
           Reverted rather than merely skipped, so a desktop visitor who rotates
           into portrait does not keep the inline styles the film left behind. */
        if (isStaticExperience()) {
          if (film && film.revert) film.revert();
          film = null;
          return;
        }

        /* Rebuilt on a language change, because the translation pass replaces
           the text nodes the word spans live in. Killing the old timeline first
           matters: its targets are gone, and a timeline still holding them
           would keep writing to detached nodes. */
        if (film && film.revert) film.revert();
        film = A.createTimeline({ autoplay: false, defaults: { ease: "linear" } });

        const at = p => p * FILM_UNITS;

        CAPTION_CUES.forEach(cue => {
          const band = bands[cue.band];
          if (!band) return;
          /* Split by motion.js, which still owns the splitting -- it is the
             file that knows Arabic is cursive and must not be split by
             character. It no longer ANIMATES them; this does. */
          const words = band.querySelectorAll(".band-w");
          /* .community-flip is NOT in this list, and must not be: it centres
             itself with `transform: translateY(-50%)`, and animating `y` on it
             writes a plain translateY that throws that centring away -- the
             card dropped half its own height and ran off the bottom of short
             screens. Anything with a layout transform of its own rides the
             band's opacity instead of carrying a tween. */
          const lines = band.querySelectorAll(".eyebrow, p:not(.eyebrow), .button-link, .hero-stats > div, .community-flip-heading, .community-pips");

          /* The opening band has no entrance to play: it is already on screen
             when the page loads, revealed by the hero-opening-ready keyframes,
             which are a page-load animation and legitimately on a clock. But
             the stylesheet starts every band at opacity 0, and a timeline only
             writes a property once a tween for it begins -- so without this the
             opening caption stayed invisible until its own exit started moving
             it, at five and a half percent in. Holding it at 1 from the first
             frame is what the missing entrance would have left behind. */
          if (!cue.enter) {
            const until = cue.exit ? at(cue.exit[0]) : FILM_UNITS;
            film.add(band, { opacity: [1, 1], duration: until }, 0);
          }

          if (cue.enter) {
            const [a0, b0] = cue.enter;
            const full = at(b0) - at(a0);
            /* The back of the camera move: the caption arrives as the camera
               settles on what it is describing. */
            const a = at(b0) - full * HANDOFF_SHARE;
            const span = full * HANDOFF_SHARE;
            film.add(band, { opacity: [0, 1], duration: span, ease: "inOut(2)" }, a);
            /* The stagger is across the camera move, not across half a second.
               Scroll slowly and the words arrive one at a time as the camera
               travels; scroll fast and they arrive together, because the camera
               got there fast. A staggered entrance that ignores how the reader
               is moving is the tell of a canned animation. */
            if (words.length) {
              film.add(words, {
                opacity: [0, 1], y: [14, 0],
                duration: span * .62, ease: "out(2)",
                delay: A.stagger(span * .38 / Math.max(1, words.length))
              }, a);
            }
            if (lines.length) {
              film.add(lines, {
                opacity: [0, 1], y: [18, 0],
                duration: span * .58, ease: "out(2)",
                delay: A.stagger(span * .42 / Math.max(1, lines.length), { start: span * .12 })
              }, a);
            }
          }

          if (cue.exit) {
            const [a0, b0] = cue.exit;
            const a = at(a0);
            /* The front of the camera move: the caption leaves as the camera
               does, before there is anything new to say. */
            const span = (at(b0) - a) * HANDOFF_SHARE;
            /* The caption leaves upward and slightly back, the direction the
               camera is pulling away in. It is the same move the shape under it
               is making. */
            film.add(band, { opacity: [1, 0], duration: span, ease: "inOut(2)" }, a);
            film.add(band, { y: [0, -22], duration: span, ease: "in(2)" }, a);
          }
        });

        /* Park the playhead where the page already is, so a rebuild mid-scroll
           does not flash the opening frame. */
        seekFilm(easedProgress);
      }

      function seekFilm(progress) {
        if (!film || isStaticExperience()) return;
        film.seek(clamp(progress, 0, 1) * FILM_UNITS);
      }

      function setActiveBand(index) {
        if (index === activeBand && bands[index].classList.contains("is-active")) return;
        activeBand = index;
        /* One band at a time is a rule about the film, not about the content.
           On a phone all six are on the page at once, so inerting five of them
           would leave the communities card, both learning links and the
           initiative button unreachable -- present on screen and dead to touch
           and to a screen reader alike. */
        const single = !isStaticExperience();
        bands.forEach((band, bandIndex) => {
          const active = !single || bandIndex === index;
          band.classList.toggle("is-active", active);
          band.setAttribute("aria-hidden", String(!active));
          band.inert = !active;
        });
        heroSection.dispatchEvent(new CustomEvent("saae:band", {
          detail: { band: bands[index], index }
        }));
        window.dispatchEvent(new CustomEvent("saae:herobandchange", { detail: { index } }));
        /* Nothing to start or stop: the digits read the scroll directly. */
        if (index === 1) startCommunityFlip();
        else stopCommunityFlip();
        if (heroSection.getBoundingClientRect().bottom > window.innerHeight * .55) {
          ribbonCurrent.textContent = journeyLabels[index];
          ribbonCount.textContent = `${String(index + 1).padStart(2, "0")} / 06`;
        }
      }

      communityCards.forEach(card => {
        const setFlipped = flipped => {
          card.classList.toggle("is-flipped", flipped);
          card.setAttribute("aria-pressed", String(flipped));
          card.setAttribute("aria-label", `${card.dataset.community}: ${flipped ? "show name" : "show details"}`);
        };

        card.addEventListener("click", () => setFlipped(!card.classList.contains("is-flipped")));
        card.addEventListener("keydown", event => {
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

      /* The gate that skips redundant repaints. It was .001, which is a
         thousandth of the hero -- eight pixels of scroll at 900vh, and enough
         to visibly stall the scene: a decelerating spring drops below that step
         size while it is still short of its target, so painting stopped before
         the motion did. Tight enough now to follow the spring all the way in,
         and still coarse enough to skip the frames where nothing moved. */
      const HERO_PAINT_EPSILON = .0002;

      function paintHero(progress, syncVideo = true) {
        const bandProgress = displayedHeroProgress(progress);
        if (Math.abs(progress - lastPaintedProgress) < HERO_PAINT_EPSILON
         && Math.abs(bandProgress - lastBandProgress) < HERO_PAINT_EPSILON) return;
        lastPaintedProgress = progress;
        lastBandProgress = bandProgress;
        stage.style.setProperty("--hero-progress", progress.toFixed(4));
        /* Keep the ground dark and neutral so it does not tint the scene. */
        const heroTones = [
          [8, 16, 24],
          [9, 18, 27],
          [8, 16, 24],
          [9, 18, 27],
          [8, 16, 24]
        ];
        const tonePos = clamp(progress, 0, 1) * (heroTones.length - 1);
        const toneLow = Math.min(heroTones.length - 2, Math.floor(tonePos));
        const toneMix = tonePos - toneLow;
        const tone = heroTones[toneLow].map((channel, index) =>
          Math.round(channel + (heroTones[toneLow + 1][index] - channel) * toneMix));
        stage.style.setProperty("--wash-r", tone[0]);
        stage.style.setProperty("--wash-g", tone[1]);
        stage.style.setProperty("--wash-b", tone[2]);
        const nextBand = heroBeatThresholds.findIndex(threshold => bandProgress < threshold);
        const visibleBand = nextBand === -1 ? 5 : nextBand;
        setActiveBand(visibleBand);
        /* The scroll used to pick the community: a step function over progress
           chose one of six and forced the card to it on every tick. That made
           the next/back buttons ornamental -- any choice the reader made was
           overwritten by their next wheel movement -- and it gave each
           community whatever slice of a second the scroll happened to allow.

           Scroll brings the reader to the beat. Which of the nine they look
           at, and for how long, is theirs. */
        void lastRootStep;

        /* The one line that used to be a video seek. Seeking a decoder sixty
           times a second was never rendering, which is why the old hero could
           be neither smooth nor cleanly reversible.

           Guarded, because paintHero runs inside the rAF loop: an exception
           here would propagate past the loop's own requestAnimationFrame and
           freeze the hero mid-scroll on whichever frame happened to be last.
           A renderer that faults drops back to the poster instead. */
        if (instrument) {
          try {
            instrument.render(bandProgress);
          } catch (error) {
            console.warn("SAAE hero instrument stopped rendering:", error);
            instrument = null;
            document.documentElement.removeAttribute("data-hero");
          }
        }
      }

      function queueSeek() {
        if (seekQueued || video.seeking || !Number.isFinite(pendingSeekTime)) return;
        const threshold = Math.max(1 / 30, videoDuration / 600);
        if (Math.abs(video.currentTime - pendingSeekTime) < threshold) return;
        seekQueued = true;
        requestAnimationFrame(() => {
          seekQueued = false;
          if (!video.classList.contains("is-ready")) return;
          try { video.currentTime = clamp(pendingSeekTime, 0, Math.max(0, videoDuration - .001)); }
          catch (_) { /* The poster remains a complete fallback. */ }
        });
      }

      video.addEventListener("seeked", queueSeek);

      /* Where the film's pace starts being handed back to the page. The last
         tenth of the hero is the land settling and the closing card arriving;
         nothing new is drawn in it, so it is the right place to let the wheel
         open back up. By the time the hero's edge passes the viewport the
         visitor already has the page's own pace in their hands, and there is
         no gear change at the boundary. */
      const HERO_PACE_HANDOFF = .90;

      function readHeroProgress() {
        const rect = heroSection.getBoundingClientRect();
        const distance = Math.max(1, heroSection.offsetHeight - window.innerHeight);
        targetProgress = clamp(-rect.top / distance, 0, 1);
        ribbon.classList.toggle("is-visible", targetProgress >= .2 || rect.bottom < window.innerHeight * .8);
        /* scroll-engine.js defines this whether or not it started an engine --
           under reduced motion and on touch there is nothing to pace and the
           call does nothing -- so the guard here is only for the case where
           that file is absent altogether. */
        if (window.saaeScrollPace) {
          window.saaeScrollPace((targetProgress - HERO_PACE_HANDOFF) / (1 - HERO_PACE_HANDOFF));
        }
      }

      /* ---- The scroll engine ---------------------------------------------
         One owner for the hero's progress.

         There used to be five, all writing to the same value or to the scroll
         position itself: CSS mandatory snapping, scroll-snap-stop: always, an
         exit wall that called scrollTo synchronously on every scroll event, a
         quantiser that rounded progress to the nearest beat, and an exponential
         ease in this loop. A sixth, the release latch, existed only to referee
         the first against the third, and its own comment recorded how that
         went: the class went straight back on and the page was pulled to the
         beat it had just left, "over and over, with the whole site below
         unreachable".

         Smoothness is not something you add on top of that. It is what is left
         when one thing owns the value. The document scrolls natively, nothing
         moves the scroll position programmatically, and a single spring carries
         the rendered progress toward where the document actually is.

         Critically damped and semi-implicit rather than an exponential lerp,
         for two reasons. It is unconditionally stable at any timestep, so a
         dropped frame cannot make it overshoot or ring. And it carries
         velocity, so a fast flick arrives with momentum and a slow drag glides;
         a lerp has no memory and treats the two the same. */
      /* The spring stands between the wheel and the scene, and a single
         frequency cannot do both jobs it is being asked to do.

         Stiff (1.9) tracked the wheel honestly but handed every notch straight
         through, so the scene stepped. Soft (1.25) settled beautifully and lagged
         behind the wheel while you were actually scrolling, which reads as the
         page being slow to answer -- the worst of the two, because it happens
         during the part you are doing rather than after it.

         So the frequency is not constant: it is a function of how far the scene
         is from where the page says it should be. Mid-scroll, that gap is large
         and the spring stiffens to CHASE, arriving at the wheel with no
         perceptible lag. As the gap closes -- you stop, the page stops -- the
         spring softens to SETTLE, and the last of the movement eases out
         instead of stopping dead.

         It is critically damped at every frequency, so it still never
         overshoots and never rings, and because the frequency depends only on
         the gap it converges on exactly the same value from either direction.
         Reversibility is unchanged and the paint gate below is still .0002. */
      /* Retuned when the document gained a scroll engine.

         1.30 / 2.85 was correct for a spring that had to do BOTH jobs: turn raw
         wheel notches into continuous movement, and keep the scene from
         stepping on a dropped frame. Lenis does the first job now, so the
         softness that used to buy continuity buys nothing but lag -- it was
         smoothing an already-smooth signal, and paying for it twice.

         Measured on the same firm flick (eighteen notches in about 290ms),
         same machine, same build:

           1.30 / 2.85   313px lag   1005ms to settle
           1.60 / 4.20   262px        903ms
           2.20 / 6.00   207px        905ms   <- here
           2.60 / 7.00   205px        779ms
           3.40 / 9.00   172px        never settled

         Past about three the spring stops parking: it chases so hard that it
         is still trading places with its target when the measurement window
         closes, which is the shape of a spring that has stopped being a filter.
         2.20 sits well inside the stable range and still takes a third off the
         lag. Critically damped at every frequency, as before, so it neither
         overshoots nor rings, and it converges from either direction -- the
         engine audit still measures 0.0000 worst convergence error. */
      /* And then the ramp turned out never to have run.

         Every number in the table above was measured with `gap` at .045, and
         .045 is not a lag -- it is 648px of scroll, about two thirds of a
         screen. But the value the ramp is fed is the INSTANTANEOUS distance
         between the scene and the page, which even mid-flick is only 90 to
         130px. So the ramp sat at 11 to 19 percent for every gesture a
         visitor can actually make, the spring ran at 2.2 to 2.9Hz whatever
         CHASE said, and CHASE itself had never once been reached. The table
         above is really a table of SETTLE values, which is also why 3.40
         "never settled": that was 3.40 the resting frequency, not 9.00 the
         chase.

         The fix is one number. `gap` is now .006 -- 86px, the scale the lag
         actually lives at -- so an ordinary reading scroll reaches the top of
         the ramp and the chase does the work it was written to do. Measured
         by swapping these two files under one browser session, so both sides
         see the same machine under the same load, on a firm flick:

                            lag avg/max   settle
           .045 (as shipped)  102/136px   1044ms
           .006 chase live      53/103px    848ms

         The lag column is the one to read. It is a ratio of two quantities
         sampled in the same frame, so it does not care how many frames there
         are; the scene now sits about half as far behind the page as it did.

         There is a third number, and it is the one the complaint was really
         about: how long after the wheel the film first moves at all. The
         document starts moving about 23ms after the wheel either way -- that
         is Lenis, and it was never the problem. On an idle machine the film
         followed in 111ms before and 43ms after, six frames down to under
         three. But that measurement detects the first paint past a threshold,
         so it degrades badly when frames are scarce: the same baseline read
         100ms and 383ms in two consecutive passes on a loaded machine. Treat
         it as the right direction rather than a figure to quote.

         2.90/7.00 rather than 2.20/6.00 because with the ramp live the
         resting frequency is what you feel when you stop, and 2.90 parks
         sooner without entering the range above three where it hunts. */
      const heroSpring = { settle: 2.90, chase: 7.00, gap: 0.006 };
      /* Lowered with the pace, not independently of it. This is meant to be
         "a hard flick", and a hard flick buys 24 percent less progress per
         second now that a wheel notch does -- measured 0.135 progress/s
         before, 0.112 after. Left at .30 the field would have bloomed
         perceptibly less than it used to for the same gesture, which is a
         change to how the scene looks smuggled in on the back of a change to
         how it scrolls. .25 keeps a slam at the 0.45 it always read. */
      const HERO_VELOCITY_FULL = 0.25;
      let progressVelocity = 0;

      function springStep(value, velocity, target, hz, dt) {
        const omega = 2 * Math.PI * hz;
        const f = 1 + 2 * dt * omega;
        const oo = omega * omega;
        const dtoo = dt * oo;
        const dtdtoo = dt * dtoo;
        const inv = 1 / (f + dtdtoo);
        return {
          value: (f * value + dt * velocity + dtdtoo * target) * inv,
          velocity: (velocity + dtoo * (target - value)) * inv
        };
      }

      function heroLoop(now) {
        if (!heroActive) return;
        /* Clamped so a tab returning from the background does not integrate one
           enormous step. */
        const delta = Math.min(64, Math.max(1, now - lastTime));
        lastTime = now;

        /* Read the document in the frame that is about to paint it.

           This used to arrive by a different road: a scroll listener scheduled
           a rAF, and that rAF read the position, so the target the spring
           chased was always at least a frame old and the spring then lagged
           that. One rAF is 7ms here and 17ms on a 60Hz display, and it bought
           nothing -- getBoundingClientRect is one forced layout in a loop that
           is already about to hand a frame to WebGL.

           Worth a straight answer about size: on its own this was the smaller
           half. Isolated, it moved the tracking lag from 69px to about 65px;
           the spring's dead ramp above was the rest. It stays because a frame
           of latency that buys nothing should not be there. */
        readHeroProgress();

        const gap = Math.abs(targetProgress - easedProgress);
        const springHz = heroSpring.settle
          + (heroSpring.chase - heroSpring.settle) * Math.min(1, gap / heroSpring.gap);
        const step = springStep(easedProgress, progressVelocity, targetProgress, springHz, delta / 1000);
        easedProgress = step.value;
        progressVelocity = step.velocity;

        /* Park exactly rather than approaching forever. An asymptote means the
           same scroll position never renders quite the same frame twice, which
           is wasted work and unprovable besides. */
        if (Math.abs(targetProgress - easedProgress) < .0002 && Math.abs(progressVelocity) < .0015) {
          easedProgress = targetProgress;
          progressVelocity = 0;
        }

        /* The spring has always carried a velocity -- that is the whole reason
           it is a spring rather than a lerp -- and until now nothing downstream
           was told about it. The scene reads it as speed: the field blooms and
           dims while you are moving and snaps back to points when you stop, so
           a hard flick and a slow drag no longer look the same.

           Normalised here rather than in the scene, because only the page knows
           how long its own hero is. HERO_VELOCITY_FULL is a shade under a third
           of the journey per second, which is a hard flick on a trackpad; an
           ordinary reading scroll sits around a fifth of that. */
        if (instrument) instrument.setVelocity(progressVelocity / HERO_VELOCITY_FULL);

        paintHero(easedProgress, true);
        /* The captions and the scene are seeked in the same frame from the same
           value. This line and instrument.render() inside paintHero are the two
           halves of one playhead. */
        seekFilm(easedProgress);
        paintStatsForProgress(easedProgress);
        heroFrame = requestAnimationFrame(heroLoop);
      }

      /* The opening curtain that used to live here is gone. It was already
         dead on main: its markup had been removed, `loader` and `loaderStatus`
         were never defined, and dismissLoader therefore threw a ReferenceError
         every time a gate flipped -- which took stopDesktopHero down with it,
         so switching reduced motion on left the hero half torn down. The site
         loader (.site-loader) is the real one and is untouched. */

      /* The film is drawn now, so there is nothing to download, nothing to
         stall, and no watchdog to arm. showVideoReady, failVideo and
         loadDesktopVideo went with the fetch; the site loader is released by
         the instrument's own ready event instead, and by a ceiling if that
         never arrives. */


      function stopDesktopHero() {
        heroActive = false;
        cancelAnimationFrame(heroFrame);
        clearTimeout(watchdog);
        if (fetchController) fetchController.abort();
        fetchController = null;
        video.pause();
        video.removeAttribute("src");
        video.load();
        video.classList.remove("is-ready");
        poster.style.backgroundImage = "none";
        if (blobUrl) URL.revokeObjectURL(blobUrl);
        blobUrl = "";
      }

      function startDesktopHero() {
        if (heroActive) return;
        staticFrame.removeAttribute("src");
        heroActive = true;
        lastTime = performance.now();
        readHeroProgress();
        easedProgress = targetProgress;
        progressVelocity = 0;
        paintHero(easedProgress);
        heroFrame = requestAnimationFrame(heroLoop);
      }

      function syncHeroMode() {
        if (isStaticExperience()) {
          stopDesktopHero();
          buildFilm();
          if (!staticFrame.getAttribute("src")) staticFrame.src = heroStaticUrl;
        } else {
          startDesktopHero();
          readHeroProgress();
        }
        syncMotionMode();
        syncBandArrival();
      }

      function schedulePagePaint() {
        if (pageFrame) return;
        pageFrame = requestAnimationFrame(() => {
          pageFrame = 0;
          if (!heroActive) readHeroProgress();
          updatePageJourney();
        });
      }

      window.addEventListener("scroll", () => {
        schedulePagePaint();
        if (ribbonOpen && !ribbon.matches(":focus-within")) {
          clearTimeout(ribbonCloseTimer);
          ribbonCloseTimer = window.setTimeout(() => setRibbonOpen(false), 180);
        }
      }, { passive: true });
      /* No wheel or key interception. The engine reads where the document
         already is; it never decides where it should be. */
      window.addEventListener("resize", schedulePagePaint, { passive: true });
      gates.forEach(gate => gate.addEventListener("change", syncHeroMode));

      /* ---- The instrument --------------------------------------------------
         /cinematic/js/hero-instrument.js is a module and this script is not, so the
         two meet on an event rather than an import. Until it fires, and if it
         never fires, the poster holds the stage with the cards, the colour
         march and the ribbon working over it. That is the floor. */
      heroSection.addEventListener("saae:hero-ready", event => {
        instrument = event.detail;
        instrument.resize();
        /* The scene is the film the opening curtain was waiting for. */
        siteLoaderVideoReady = true;
        setSiteLoaderProgress(96);
        completeSiteLoader();
        /* The entrance plays once, from here, so it lands with the curtain
           lifting rather than somewhere in the middle of the first scroll. */
        instrument.startEntrance();
        lastPaintedProgress = -1;
        paintHero(easedProgress, false);
      });

      const heroCanvas = document.getElementById("hero-canvas");
      if (heroCanvas) {
        heroCanvas.addEventListener("webglcontextlost", () => { instrument = null; }, { passive: true });
      }
      window.addEventListener("resize", () => { if (instrument) instrument.resize(); }, { passive: true });

      /* A paused, off-screen video cost nothing. A render loop does, so stop it
         when the hero is not on screen and when the tab is hidden. */
      document.addEventListener("visibilitychange", () => {
        if (document.hidden) stopDesktopHero();
        else syncHeroMode();
      });

      /* The visitor can push the field: points near the pointer warm. Pointer
         only, because on a touch device this would fire on every scroll. */
      if (window.matchMedia("(pointer: fine)").matches) {
        let pointerFade = 0;
        stage.addEventListener("pointermove", pointerEvent => {
          if (!instrument || pointerEvent.pointerType !== "mouse") return;
          const rect = stage.getBoundingClientRect();
          const nx = ((pointerEvent.clientX - rect.left) / rect.width) * 2 - 1;
          const ny = -(((pointerEvent.clientY - rect.top) / rect.height) * 2 - 1);
          instrument.setPointer(nx * 14, ny * 8, 0.9);
          clearTimeout(pointerFade);
          pointerFade = window.setTimeout(() => { if (instrument) instrument.setPointer(0, 0, 0); }, 900);
        }, { passive: true });
        stage.addEventListener("pointerleave", () => { if (instrument) instrument.setPointer(0, 0, 0); }, { passive: true });
      }

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
          window.setTimeout(() => firstLink.focus({ preventScroll: true }), 80);
        } else if (restoreFocus) {
          ribbonToggle.focus({ preventScroll: true });
        }
      }

      ribbonToggle.addEventListener("click", () => setRibbonOpen(!ribbonOpen));
      ribbonPanel.addEventListener("click", event => {
        if (event.target.closest("a")) setRibbonOpen(false);
      });
      document.addEventListener("pointerdown", event => {
        if (ribbonOpen && !ribbon.contains(event.target)) setRibbonOpen(false);
      });
      document.addEventListener("keydown", event => {
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
        revealObserver = new IntersectionObserver(entries => {
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

      /* ---- Arrival from a checkpoint --------------------------------------
         checkpoints.js moves the document and nothing else, which it can do
         because everything below the hero is a pure function of scroll and
         repaints itself from the scroll event. Two things on this page are not
         pure, and they are the two this handles.

         The spring is one. easedProgress chases targetProgress at a rate set by
         the gap between them, so a cut of twenty screens would be followed by
         the film scrubbing the whole way at speed: twenty screens of footage
         nobody asked to see, and queueSeek trying to land every keyframe in
         between while it happens. Parked on arrival, exactly as
         startDesktopHero parks it when the hero starts.

         The reveals are the other. They are one-shot and unobserved once fired,
         so a block that was cut past is not broken -- it simply never fired,
         and it still will if the reader scrolls back to it. What is wrong is
         landing beside eight of them and watching eight entrances begin at
         once. Everything above the landing point is marked seen with its
         transition suppressed for a frame, so the page behind the reader looks
         read rather than mid-fade. Two frames, because one is not enough: the
         class has to survive the frame the style change is computed in. */
      window.addEventListener("saae:jump", () => {
        readHeroProgress();
        easedProgress = targetProgress;
        progressVelocity = 0;
        if (revealObserver) {
          const landed = window.scrollY + window.innerHeight;
          revealItems.forEach(item => {
            if (item.classList.contains("is-visible")) return;
            if (item.getBoundingClientRect().top + window.scrollY > landed) return;
            revealObserver.unobserve(item);
            item.classList.add("is-settled", "is-visible");
          });
          requestAnimationFrame(() => requestAnimationFrame(() => {
            revealItems.forEach(item => item.classList.remove("is-settled"));
          }));
        }
        schedulePagePaint();
      });

      /* ---- The bands arriving, on a phone ---------------------------------
         The film gave each caption its entrance from the scroll position. With
         the film off, the same six bands are a column of sections, and this is
         what makes them arrive instead of simply being there when you get to
         them. Deliberately the same shape as the reveal observer above: fire
         once, unobserve, never run again -- a section that has been read does
         not need to animate a second time if the reader scrolls back up.

         Only ever armed in the static experience, and torn down if the visitor
         rotates back to a landscape where the film itself takes over again. */
      let bandObserver = null;

      function syncBandArrival() {
        if (bandObserver) { bandObserver.disconnect(); bandObserver = null; }
        if (!isStaticExperience()) {
          bands.forEach(band => band.classList.remove("band-in", "is-here"));
          return;
        }
        /* The markup ships bands 1-5 as aria-hidden="true", which is correct for
           the film -- five of the six captions are not on screen. Nothing was
           clearing it here, and setActiveBand cannot: it early-returns on the
           first call because band 0 already carries is-active from the HTML. So
           the bands rendered, and a screen reader was still told to skip five of
           them. Cleared explicitly, along with inert, since on a phone all six
           are genuinely present.

           The stagger index is written here too, rather than hard-coded per band
           in the stylesheet: the pieces inside a band differ from band to band,
           and CSS cannot count them. */
        bands.forEach(band => {
          band.removeAttribute("aria-hidden");
          band.inert = false;
          band.classList.add("is-active", "band-in");
          band.querySelectorAll(".hero-stats > div, .button-link, .community-flip")
            .forEach((piece, index) => piece.style.setProperty("--i", index));
        });
        if (reducedMotion.matches || !("IntersectionObserver" in window)) {
          bands.forEach(band => band.classList.add("is-here"));
          return;
        }
        bandObserver = new IntersectionObserver(entries => {
          entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            entry.target.classList.add("is-here");
            bandObserver.unobserve(entry.target);
          });
        }, { threshold: .18, rootMargin: "0px 0px -8%" });
        bands.forEach(band => {
          if (band.classList.contains("is-here")) return;
          bandObserver.observe(band);
        });
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
        if (networkHolding || networkProgress > 0) networkFrame = requestAnimationFrame(networkLoop);
      }

      function beginNetwork(event) {
        if (reducedMotion.matches) return;
        if (event.type === "keydown" && event.repeat) return;
        networkHolding = true;
        document.body.classList.add("network-active");
        if (event.pointerId !== undefined) networkField.setPointerCapture(event.pointerId);
        cancelAnimationFrame(networkFrame);
        networkLastTime = performance.now();
        networkFrame = requestAnimationFrame(networkLoop);
      }

      function endNetwork() {
        if (!networkHolding || reducedMotion.matches) return;
        networkHolding = false;
        document.body.classList.remove("network-active");
        cancelAnimationFrame(networkFrame);
        networkLastTime = performance.now();
        networkFrame = requestAnimationFrame(networkLoop);
      }

      if (networkField) {
        networkField.addEventListener("pointerdown", beginNetwork);
        networkField.addEventListener("pointerup", endNetwork);
        networkField.addEventListener("pointercancel", endNetwork);
        networkField.addEventListener("lostpointercapture", endNetwork);
        networkField.addEventListener("keydown", event => {
          if (event.key === " " || event.key === "Enter") {
            event.preventDefault();
            beginNetwork(event);
          }
        });
        networkField.addEventListener("keyup", event => {
          if (event.key === " " || event.key === "Enter") {
            event.preventDefault();
            endNetwork();
          }
        });
        networkField.addEventListener("blur", endNetwork);
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
      /* Was: hand over to the decoded first frame. Now: hand over to the first
         rendered frame. The instrument announces itself and this repaints the
         hero at the current scroll position, which paintHero would otherwise
         skip because the progress has not changed. */
      const activateHeroVideo = () => {
        if (siteLoaderUsingFallback || isStaticExperience()) return;
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
        window.setTimeout(() => {
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
        siteLoaderCompletionTimer = window.setTimeout(dismissSiteLoader, reducedMotion.matches ? 90 : 210);
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
        siteLoaderFrameTimer = window.setTimeout(confirmFrame, 520);
      };

      if (siteLoader) {
        window.addEventListener("wheel", preventSiteLoaderScroll, { passive: false });
        window.addEventListener("touchmove", preventSiteLoaderScroll, { passive: false });
        window.addEventListener("keydown", preventSiteLoaderKeyScroll);
        video.addEventListener("loadstart", onSiteLoaderLoadStart);
        video.addEventListener("loadedmetadata", onSiteLoaderMetadata);
        video.addEventListener("progress", onSiteLoaderProgress);
        video.addEventListener("loadeddata", onSiteLoaderData);
        video.addEventListener("canplaythrough", onSiteLoaderCanPlayThrough);
        setSiteLoaderProgress(isStaticExperience() ? 92 : 4);
        siteLoaderMinimumTimer = window.setTimeout(() => {
          siteLoaderMinimumComplete = true;
          completeSiteLoader();
        }, siteLoaderMinimumMs);
        /* Nothing is downloading, so the only way the curtain can outstay its
           welcome now is a scene that never reports ready. Release it anyway:
           the poster and the whole HTML story underneath are a complete
           experience, and a loading screen that fails to dismiss is worse than
           no loading screen. */
        siteLoaderSafetyTimer = window.setTimeout(() => {
          if (!siteLoaderVideoReady) { siteLoaderVideoReady = true; completeSiteLoader(); }
        }, 9000);
      }

      /* A reload part-way down should still open on the hero, because the hero
         is the opening and a restored offset drops the visitor into the middle
         of a sentence. Deep links still work: an explicit hash is a destination
         the visitor asked for. */
      if ("scrollRestoration" in history) history.scrollRestoration = "manual";
      if (!location.hash) window.scrollTo(0, 0);

      buildCommunityPips();

      /* motion.js owns the word spans and says when they exist -- on first
         split and after every language pass. Guessing at the order instead was
         wrong: the double animation frame below fires BEFORE motion.js has
         split anything, so the timeline was built against five bands and zero
         words, and the word stagger silently never ran. */
      window.addEventListener("saae:bandsplit", buildFilm);

      requestAnimationFrame(() => requestAnimationFrame(() => {
        /* And a build here regardless, for the case where GSAP never loads: no
           word spans then, but the band-level dissolves still carry the film. */
        buildFilm();
        syncHeroMode();
        updatePageJourney();
        if (isStaticExperience()) completeSiteLoader();
      }));
    })();
