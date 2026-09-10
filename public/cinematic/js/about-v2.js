/* =============================================================================
   SAAE — About
   -----------------------------------------------------------------------------
   Four things, and nothing that only decorates:

     1. A tree that is grown rather than placed. It draws on load and leans
        toward the pointer, which is what the caption beside it promises.
     2. The spine: chapter progress read off scroll, so the trunk fills and the
        current node lights as the reader descends.
     3. The seeds: a real tablist. Arrow keys move, the panel answers, and the
        selection survives a language switch.
     4. The language switch, which has to move `dir` as well as the words.

   No library. Every loop is either rAF-driven and short-lived, or an observer.
   ========================================================================== */
(() => {
  "use strict";

  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const coarse = matchMedia("(pointer: coarse)");
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  /* ---- language --------------------------------------------------------- */
  /* The seed panel's copy is not in the DOM as a pair of attributes -- it is
     swapped by index -- so the switch has to tell it to repaint rather than
     just rewriting text nodes. */
  const GOAL_ACTIONS = [
    ["Spread awareness of artificial intelligence and digital transformation.",
     "نشر الوعي بأهمية الذكاء الصنعي والتحول الرقمي."],
    ["Support entrepreneurs and empower people building emerging ventures.",
     "دعم رواد الأعمال وتمكين أصحاب المشاريع الناشئة."],
    ["Organise technical and entrepreneurial courses and workshops.",
     "تنظيم الدورات وورشات العمل التقنية والريادية."],
    ["Build a collaborative network around technology and innovation.",
     "بناء مجتمع تعاوني يجمع المهتمين بالتكنولوجيا والابتكار."],
    ["Encourage research, development and youth-led initiatives.",
     "تشجيع البحث والتطوير والمبادرات الشبابية."]
  ];

  let lang = "en";
  const langButton = document.getElementById("lang-button");
  const langLabel = document.getElementById("lang-label");

  function setLanguage(next) {
    lang = next;
    const ar = next === "ar";
    document.documentElement.lang = ar ? "ar" : "en";
    document.documentElement.dir = ar ? "rtl" : "ltr";
    /* Announced BEFORE the rewrite below, which is the contract contact.js
       already follows: anything that has split this page's text into spans
       gets its chance to put the original text nodes back, because the
       rewrite is a textContent assignment and would otherwise throw the
       spans away. */
    window.dispatchEvent(new CustomEvent("saae:languagechange", { detail: { lang: next } }));

    document.querySelectorAll("[data-en][data-ar]").forEach(el => {
      const value = ar ? el.dataset.ar : el.dataset.en;
      if (value != null) el.textContent = value;
    });

    if (langLabel) langLabel.textContent = ar ? "English" : "العربية";
    if (langButton) {
      langButton.setAttribute("aria-pressed", String(ar));
      langButton.setAttribute("aria-label", ar ? "Switch to English" : "التبديل إلى العربية");
    }
    paintSeed(seedIndex);
    try { localStorage.setItem("saae-lang", next); } catch (_) { /* private mode */ }
  }

  langButton?.addEventListener("click", () => setLanguage(lang === "en" ? "ar" : "en"));

  /* ---- seeds ------------------------------------------------------------ */
  const seedRow = document.getElementById("seed-row");
  const seedButtons = seedRow ? [...seedRow.querySelectorAll('[role="tab"]')] : [];
  const seedAction = document.getElementById("seed-action");
  const seedNum = document.getElementById("seed-num");
  const seedPanel = document.getElementById("seed-panel");
  let seedIndex = 0;

  function paintSeed(index) {
    if (!seedButtons.length) return;
    seedIndex = clamp(index, 0, seedButtons.length - 1);
    seedButtons.forEach((b, i) => {
      const on = i === seedIndex;
      b.setAttribute("aria-selected", String(on));
      b.tabIndex = on ? 0 : -1;
    });
    if (seedNum) seedNum.textContent = String(seedIndex + 1).padStart(2, "0");
    if (seedAction) seedAction.textContent = GOAL_ACTIONS[seedIndex][lang === "ar" ? 1 : 0];
    if (seedPanel) seedPanel.setAttribute("aria-labelledby", "seed-" + seedIndex);
  }

  seedButtons.forEach((button, i) => {
    button.addEventListener("click", () => paintSeed(i));
    button.addEventListener("keydown", event => {
      /* In RTL the arrow that points at the next tab is the other one. */
      const rtl = document.documentElement.dir === "rtl";
      const forward = rtl ? "ArrowLeft" : "ArrowRight";
      const back = rtl ? "ArrowRight" : "ArrowLeft";
      let next = null;
      if (event.key === forward || event.key === "ArrowDown") next = (i + 1) % seedButtons.length;
      else if (event.key === back || event.key === "ArrowUp") next = (i - 1 + seedButtons.length) % seedButtons.length;
      else if (event.key === "Home") next = 0;
      else if (event.key === "End") next = seedButtons.length - 1;
      if (next == null) return;
      event.preventDefault();
      paintSeed(next);
      seedButtons[next].focus();
    });
  });

  /* ---- fields ----------------------------------------------------------- */
  const fields = [...document.querySelectorAll("#fields-list li")];
  fields.forEach(item => {
    const on = () => { fields.forEach(f => f.classList.remove("is-active")); item.classList.add("is-active"); };
    item.addEventListener("pointerenter", on);
    item.addEventListener("focusin", on);
  });

  /* ---- reveals ---------------------------------------------------------- */
  const revealables = document.querySelectorAll("[data-reveal]");
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-in");
        io.unobserve(entry.target);
      });
    }, { rootMargin: "0px 0px -12% 0px", threshold: .1 });
    revealables.forEach(el => io.observe(el));
  } else {
    revealables.forEach(el => el.classList.add("is-in"));
  }

  /* ---- spine + masthead ------------------------------------------------- */
  const masthead = document.getElementById("masthead");
  const spineFill = document.getElementById("spine-fill");
  const progressLine = document.getElementById("progress-line");
  const spineNodes = [...document.querySelectorAll("#spine-nodes li")];
  const navLinks = [...document.querySelectorAll(".mast-nav a")];
  let ticking = false;

  function syncScroll() {
    ticking = false;
    const y = window.scrollY;
    const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    const progress = clamp(y / max, 0, 1);

    masthead?.classList.toggle("is-stuck", y > 8);
    if (spineFill) spineFill.style.height = (progress * 100).toFixed(2) + "%";
    if (progressLine) progressLine.style.width = (progress * 100).toFixed(2) + "%";

    /* Current chapter = the last one whose top has crossed the middle of the
       viewport. Read from layout each time rather than cached, because the
       Arabic switch changes every heading's height. */
    const line = y + window.innerHeight * .45;
    let current = -1;
    spineNodes.forEach((node, i) => {
      const section = document.getElementById(node.dataset.target);
      if (section && section.offsetTop <= line) current = i;
    });
    spineNodes.forEach((node, i) => {
      node.classList.toggle("is-passed", i < current);
      node.classList.toggle("is-current", i === current);
    });

    const id = current >= 0 ? spineNodes[current].dataset.target : null;
    navLinks.forEach(a => a.classList.toggle("is-current", a.getAttribute("href") === "#" + id));
  }

  addEventListener("scroll", () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(syncScroll);
  }, { passive: true });
  addEventListener("resize", syncScroll, { passive: true });

  /* ---- the tree --------------------------------------------------------- */
  /* Drawn rather than shipped as artwork: the branch angles carry a lean that
     follows the pointer, which no static asset could do. The geometry is fixed
     per depth so the silhouette is stable -- only the lean changes. */
  const canvas = document.getElementById("tree-canvas");
  if (canvas && canvas.getContext) {
    const ctx = canvas.getContext("2d");
    const W = canvas.width, H = canvas.height;
    const css = getComputedStyle(document.documentElement);
    const olive = css.getPropertyValue("--olive").trim() || "#5f8a2a";
    const turq = css.getPropertyValue("--turq").trim() || "#0a7f86";

    let lean = 0, leanTarget = 0, grown = 0, raf = 0;

    function drawBranch(x, y, len, angle, width, depth, budget) {
      if (depth === 0 || len < 3 || budget <= 0) return;
      const reach = Math.min(1, budget);
      const x2 = x + Math.cos(angle) * len * reach;
      const y2 = y + Math.sin(angle) * len * reach;

      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x2, y2);
      ctx.lineWidth = width;
      ctx.strokeStyle = depth > 2 ? olive : turq;
      ctx.globalAlpha = depth > 2 ? .9 : .75;
      ctx.stroke();

      if (depth <= 2 && reach >= 1) {
        ctx.beginPath();
        ctx.arc(x2, y2, Math.max(2, width * .9), 0, Math.PI * 2);
        ctx.fillStyle = turq;
        ctx.globalAlpha = .9;
        ctx.fill();
      }
      if (reach < 1) return;

      /* The lean is strongest at the tips, which is how a real canopy answers
         a breeze -- a uniform rotation reads as the whole image tilting. */
      const sway = lean * (1 - depth / 8) * .5;
      const spread = .38 + depth * .022;
      drawBranch(x2, y2, len * .755, angle - spread + sway, width * .69, depth - 1, budget - 1);
      drawBranch(x2, y2, len * .755, angle + spread + sway, width * .69, depth - 1, budget - 1);
    }

    function render() {
      ctx.clearRect(0, 0, W, H);
      ctx.lineCap = "round";
      const budget = reduced.matches ? 8 : grown;
      drawBranch(W / 2, H - 92, 150, -Math.PI / 2, 21, 8, budget);
      ctx.globalAlpha = .34;
      drawBranch(W / 2, H - 92, 62, Math.PI / 2 - .62, 9, 4, budget);
      drawBranch(W / 2, H - 92, 62, Math.PI / 2 + .62, 9, 4, budget);
      ctx.globalAlpha = 1;
    }

    function tick() {
      lean += (leanTarget - lean) * .07;
      if (grown < 8) grown += .085;
      render();
      const settled = Math.abs(leanTarget - lean) < .0015 && grown >= 8;
      raf = settled ? 0 : requestAnimationFrame(tick);
    }

    function wake() { if (!raf) raf = requestAnimationFrame(tick); }

    /* The growth is an animation, but the tree is the identity -- it has to be
       on screen either way. A tab opened in the background never runs a
       rendering frame, so an rAF-driven `grown` stays at zero there and the
       mark is a stub when the reader finally looks at it. Draw it complete
       whenever we cannot animate, and only animate when we can. */
    if (reduced.matches || document.hidden) { grown = 8; render(); }
    else wake();

    if (!coarse.matches) {
      addEventListener("pointermove", event => {
        const rect = canvas.getBoundingClientRect();
        if (!rect.width) return;
        const dx = (event.clientX - (rect.left + rect.width / 2)) / rect.width;
        leanTarget = clamp(dx, -1, 1) * .5;
        wake();
      }, { passive: true });
      addEventListener("pointerleave", () => { leanTarget = 0; wake(); }, { passive: true });
    }

    /* A hidden tab should not be paying for an animation nobody is watching --
       but it must not be left holding a half-drawn mark either. */
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) return;
      if (grown < 8) { grown = 8; render(); }
      wake();
    });
  }

  /* ---- boot ------------------------------------------------------------- */
  let saved = null;
  try { saved = localStorage.getItem("saae-lang"); } catch (_) { /* private mode */ }
  setLanguage(saved === "ar" ? "ar" : "en");
  paintSeed(0);
  syncScroll();
})();
