(() => {
  "use strict";

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const translations = {
    skip: "تخطَّ إلى المبادرة", home: "الرئيسية", about: "عن الجمعية", partners: "الشركاء", initiative: "المبادرة", contact: "تواصل",
    heroEyebrow: "مبادرة وطنية لمحو الأمية في الذكاء الاصطناعي", oneMillion: "مليون", heroTitleRest: "مستخدم ذكاء اصطناعي سوري.",
    heroLede: "مهارات عملية في الذكاء الاصطناعي للعمل والتعليم والحياة اليومية — متاحة لكل سوري مستعد للبدء.", payOneStart: "ادفع دولاراً وابدأ", joinWaitlist: "انضم إلى قائمة الانتظار",
    nationalGoal: "الهدف الوطني", movesLine: "كل متعلّم جديد يحرّك المؤشر.", exploreInitiative: "استكشف المبادرة", progressEyebrow: "بدأ المؤشر بالتحرك",
    progressTitle: "المليون يبدأ بالشخص التالي.", progressCopy: "اختر المسار المناسب لك: ابدأ بدولار واحد، انتظر مقعداً ممولاً، أو افتح الباب لشخص آخر.",
    seatsMotion: "مقعداً قيد التفعيل", waitlist: "قائمة الانتظار", sponsoredSeats: "مقاعد ممولة", goalRemaining: "المتبقي إلى الهدف", shareOfDial: "من الدائرة", shareOfGoal: "من الهدف",
    blueprintEyebrow: "مخطط المبادرة", blueprintTitle: "صُممت لتحوّل الوصول إلى قدرة.", blueprintIntro: "هذه أكثر من دورة. إنها مسار عملي من أول لقاء مع الذكاء الاصطناعي إلى استخدامه بثقة ومسؤولية.", blueprintLabel: "مخطط المبادرة",
    aboutShort: "نقطة انطلاق وطنية", mission: "رسالتنا", missionShort: "ردم الفجوة الرقمية", values: "قيمنا", valuesShort: "كيف ينمو المليون معاً",
    aboutPanelTitle: "معرفة بالذكاء الاصطناعي تنتمي إلى الحياة الحقيقية.", aboutPanelCopy: "تزوّد مبادرة مليون مستخدم ذكاء اصطناعي سوري شريحة واسعة من السوريين بمهارات عملية يستخدمونها في عملهم ودراستهم وقراراتهم اليومية.",
    audienceLabel: "الفئات التي تخدمها المبادرة", students: "الطلاب", professionals: "المهنيون", educators: "المعلّمون", founders: "رواد الأعمال",
    missionPanelTitle: "امنح مليون سوري الثقة لاستخدام الذكاء الاصطناعي.", missionPanelCopy: "رسالتنا ردم الفجوة الرقمية، وتعزيز التنافسية في سوق العمل، وبناء مجتمع مبتكر قادر على صياغة مستقبل سورية التقني.",
    valuesPanelTitle: "خمس قيم تبقي المليون متصلاً.", empowerment: "التمكين", inclusivity: "الشمول", innovation: "الابتكار", collaboration: "التعاون", adaptability: "القدرة على التكيّف",
    sponsorsEyebrow: "من يفتحون الأبواب", sponsorsTitle: "كل مقعد ممول هو بداية.", seatsCovered: "مقعداً تمت تغطيته", leaderboardLabel: "الشركات الأكثر دعماً",
    rank: "الترتيب", sponsor: "الداعم", impact: "المقاعد المفتوحة", snapshotNote: "لقطة من صفحة المبادرة الرسمية · 2 أيلول 2026", viewAllSponsors: "شاهد جميع الداعمين ↗",
    participateEyebrow: "اختر كيف تحرّك المؤشر", participateTitle: "تعلّم. انتظر. أو افتح مقعداً.", payStart: "ادفع وابدأ", payStartCopy: "ابدأ الدورة فوراً مقابل دولار أمريكي واحد.", startNow: "ابدأ الآن ↗",
    joinWaitlistCopy: "احجز مكانك وانتظر داعماً يغطي تكلفته.", reservePlace: "احجز مكاناً ↗", sponsorSeats: "موّل مقاعد", sponsorSeatsCopy: "حوّل الدعم المؤسسي أو الفردي إلى وصول فوري للمتعلمين على قائمة الانتظار.", openSeats: "افتح مقاعد ↗",
    closingEyebrow: "قد تكون أنت الشخص التالي", beginsOne: "يبدأ بواحد.", closingCopy: "اتخذ خطوة عملية نحو الذكاء الاصطناعي — أو اجعل هذه الخطوة ممكنة لشخص آخر.", joinInitiative: "انضم إلى المبادرة ↗",
    footerClaim: "أول منظمة رسمية في سورية مكرّسة للذكاء الاصطناعي والابتكار والتفكير الريادي.", footerNavigation: "تنقل التذييل", explore: "استكشف", reachSaae: "تواصل مع الجمعية",
    damascus: "دمشق، بجانب وزارة التعليم العالي والبحث العلمي", rights: "جميع الحقوق محفوظة · الجمعية 2026", backTop: "العودة إلى الأعلى ↑",
    pageStamp: "صفحة المبادرة بالعربية، أيلول 2026.",
    payModalTitle: "ادفع وابدأ", payModalCopy: "ادفع $1 لمقعدك وابدأ الكورس فوراً. سنُرسل بوابة الدفع قريباً.",
    fullName: "الاسم الكامل", email: "البريد الإلكتروني", phone: "الهاتف", continueToPay: "متابعة إلى الدفع",
    closeDialog: "إغلاق النافذة", paySuccessTitle: "تم حجز مقعدك.",
    paySuccessCopy: "سنرسل رابط الدفع إلى بريدك فور افتتاح البوابة.", doneClose: "تم"
  };

  const english = new Map();
  document.querySelectorAll("[data-i18n]").forEach(element => english.set(element, element.textContent));
  const englishAria = new Map();
  document.querySelectorAll("[data-i18n-aria]").forEach(element => englishAria.set(element, element.getAttribute("aria-label") || ""));

  const applyTranslations = lang => {
    const arabic = lang === "ar";
    document.querySelectorAll("[data-i18n]").forEach(element => {
      const key = element.dataset.i18n;
      element.textContent = arabic ? (translations[key] || english.get(element)) : english.get(element);
    });
    document.querySelectorAll("[data-i18n-aria]").forEach(element => {
      const key = element.dataset.i18nAria;
      element.setAttribute("aria-label", arabic ? (translations[key] || englishAria.get(element)) : englishAria.get(element));
    });
  };

  window.addEventListener("saae:languagechange", event => queueMicrotask(() => applyTranslations(event.detail.lang)));

  const tabs = Array.from(document.querySelectorAll("[data-blueprint-tab]"));
  const panels = Array.from(document.querySelectorAll("[data-blueprint-panel]"));
  const selectTab = (tab, moveFocus = false) => {
    tabs.forEach(item => {
      const selected = item === tab;
      item.setAttribute("aria-selected", String(selected));
      item.tabIndex = selected ? 0 : -1;
    });
    panels.forEach(panel => {
      const selected = panel.dataset.blueprintPanel === tab.dataset.blueprintTab;
      panel.hidden = !selected;
      panel.classList.toggle("is-active", selected);
    });
    if (moveFocus) tab.focus();
  };

  tabs.forEach((tab, index) => {
    tab.addEventListener("click", () => selectTab(tab));
    tab.addEventListener("mouseenter", () => selectTab(tab));
    tab.addEventListener("focus", () => selectTab(tab));
    tab.addEventListener("keydown", event => {
      if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)) return;
      event.preventDefault();
      let next = index;
      if (event.key === "Home") next = 0;
      else if (event.key === "End") next = tabs.length - 1;
      else if (event.key === "ArrowRight" || event.key === "ArrowDown") next = (index + 1) % tabs.length;
      else next = (index - 1 + tabs.length) % tabs.length;
      selectTab(tabs[next], true);
    });
  });

  const revealItems = document.querySelectorAll(".reveal");
  if (reduced || !("IntersectionObserver" in window)) {
    revealItems.forEach(item => item.classList.add("is-visible"));
  } else {
    const revealObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        revealObserver.unobserve(entry.target);
      });
    }, { threshold: .16 });
    revealItems.forEach(item => revealObserver.observe(item));
  }

  const progress = document.querySelector(".progress-preview");
  const numbers = Array.from(document.querySelectorAll("[data-count]"));
  let counted = false;
  const runCounters = () => {
    if (counted) return;
    counted = true;
    if (reduced) return;
    const duration = 1400;
    const start = performance.now();
    const format = new Intl.NumberFormat("en-US");
    const tick = now => {
      const elapsed = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - elapsed, 4);
      numbers.forEach(node => { node.textContent = format.format(Math.round(Number(node.dataset.count) * eased)); });
      if (elapsed < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };

  if (progress && "IntersectionObserver" in window) {
    const progressObserver = new IntersectionObserver(entries => {
      if (!entries.some(entry => entry.isIntersecting)) return;
      runCounters();
      progressObserver.disconnect();
    }, { threshold: .22 });
    progressObserver.observe(progress);
  } else runCounters();

  /* Composition dial: figures spotlight their own arc. Hover previews,
     click pins, Esc or re-click releases. */
  const dialEl = document.querySelector(".progress-dial");
  const segNum = document.querySelector(".dial-center strong");
  const segLabel = document.querySelector('.dial-center [data-i18n="seatsMotion"]');
  const segFigures = Array.from(document.querySelectorAll(".metric-strip article[data-seg]"));
  const segText = {
    sponsored: ["Sponsored seats", "sponsoredSeats"],
    waitlist: ["Waitlist", "waitlist"],
    remaining: ["Goal remaining", "goalRemaining"]
  };
  let segPinned = null;
  const segLabelFor = key => {
    if (!key) return document.documentElement.lang === "ar" ? translations.seatsMotion : (english.get(segLabel) || "seats in motion");
    return document.documentElement.lang === "ar" ? translations[segText[key][1]] : segText[key][0];
  };
  const segNumFor = key => key ? { sponsored: "1,200", waitlist: "24", remaining: "998,776" }[key] : "1,224";
  const paintFocus = key => {
    if (dialEl) { if (key) dialEl.dataset.focus = key; else delete dialEl.dataset.focus; }
    if (segNum) segNum.textContent = segNumFor(key);
    if (segLabel) segLabel.textContent = segLabelFor(key);
  };
  segFigures.forEach(fig => {
    const key = fig.dataset.seg;
    fig.addEventListener("mouseenter", () => paintFocus(key));
    fig.addEventListener("focus", () => paintFocus(key));
    fig.addEventListener("mouseleave", () => paintFocus(segPinned));
    fig.addEventListener("blur", () => paintFocus(segPinned));
    fig.addEventListener("click", () => {
      segPinned = segPinned === key ? null : key;
      segFigures.forEach(f => f.setAttribute("aria-pressed", String(f === fig && segPinned !== null)));
      paintFocus(segPinned);
    });
    fig.addEventListener("keydown", event => {
      if (event.key === "Enter" || event.key === " ") { event.preventDefault(); fig.click(); }
    });
  });
  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && segPinned) {
      segPinned = null;
      segFigures.forEach(f => f.setAttribute("aria-pressed", "false"));
      paintFocus(null);
    }
  });

  /* Spotlight paths: 3D tilt on pointer, live line preview read from the
     card itself (so both languages work with zero new strings). */
  const pathCards = Array.from(document.querySelectorAll(".participation-paths .path-card"));
  pathCards.forEach(card => {
    card.addEventListener("pointermove", event => {
      if (event.pointerType !== "mouse" || reduced) return;
      const rect = card.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - .5;
      const y = (event.clientY - rect.top) / rect.height - .5;
      card.style.setProperty("--ry", (x * 10).toFixed(2) + "deg");
      card.style.setProperty("--rx", (-y * 10).toFixed(2) + "deg");
      card.style.setProperty("--mx", (event.clientX - rect.left).toFixed(0) + "px");
      card.style.setProperty("--my", (event.clientY - rect.top).toFixed(0) + "px");
      card.classList.add("tilting");
    });
    card.addEventListener("pointerleave", () => {
      card.classList.remove("tilting");
      card.style.removeProperty("--rx");
      card.style.removeProperty("--ry");
    });
  });

  /* Hero tree: every click plants a seat — the tree pulses, leaves fly,
     the visitors' counter ticks. Parallax rides the hero's own vars. */
  const treeBtn = document.getElementById("hero-tree");
  /* Particle birth: dust gathers into 1,000,000, morphs into the tree,
     then hands over to the artwork in one synchronized crossfade. */
  const treeCanvas = document.getElementById("tree-canvas");
  const treeStage = document.querySelector(".hero-tree-stage");
  const easeInOut = k => k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
  const mixChannel = (a, b, k) => Math.round(a + (b - a) * k);
  const mixColor = (k, r1, g1, b1, r2, g2, b2) =>
    "rgb(" + mixChannel(r1, r2, k) + "," + mixChannel(g1, g2, k) + "," + mixChannel(b1, b2, k) + ")";
  const showGrownTree = () => {
    if (treeBtn) { treeBtn.classList.remove("pre-grown"); treeBtn.classList.add("is-grown"); }
    if (treeCanvas) {
      const c = treeCanvas.getContext("2d");
      if (c) c.clearRect(0, 0, treeCanvas.width, treeCanvas.height);
    }
  };
  const growTreeSequence = () => {
    if (!treeBtn || !treeCanvas || !treeStage || reduced) return;
    const box = treeStage.getBoundingClientRect();
    const W = box.width, H = box.height;
    if (W < 60 || H < 60) { showGrownTree(); return; }
    const art = treeBtn.querySelector(".tree-art");
    const artBox = art ? art.getBoundingClientRect() : null;
    const DPR = Math.min(window.devicePixelRatio || 1, 1.75);
    treeCanvas.width = Math.round(W * DPR);
    treeCanvas.height = Math.round(H * DPR);
    const ctx = treeCanvas.getContext("2d");
    if (!ctx) { showGrownTree(); return; }
    ctx.scale(DPR, DPR);
    treeBtn.classList.add("pre-grown");
    /* --- sample the million --- */
    const sampler = document.createElement("canvas");
    sampler.width = Math.max(2, Math.round(W));
    sampler.height = Math.max(2, Math.round(H));
    const sctx = sampler.getContext("2d", { willReadFrequently: true });
    if (!sctx) { showGrownTree(); return; }
    let fs = Math.min(W * .2, H * .22);
    sctx.textAlign = "center";
    sctx.textBaseline = "middle";
    const label = "1,000,000";
    do {
      sctx.font = "900 " + fs + "px Cairo, Arial, sans-serif";
      fs -= 2;
    } while (sctx.measureText(label).width > W * .92 && fs > 8);
    fs += 2;
    sctx.font = "900 " + fs + "px Cairo, Arial, sans-serif";
    sctx.fillStyle = "#fff";
    sctx.fillText(label, W / 2, H * .4);
    let sdata;
    try {
      sdata = sctx.getImageData(0, 0, sampler.width, sampler.height).data;
    } catch (_) { showGrownTree(); return; }
    const textPts = [];
    for (let y = 0; y < H; y += 6) for (let x = 0; x < W; x += 6) {
      if (sdata[(y * sampler.width + x) * 4 + 3] > 128) textPts.push([x, y]);
    }
    /* --- sample the tree artwork, exactly where it will appear --- */
    const img = new Image();
    let settled = false;
    const giveUp = () => { if (!settled) { settled = true; showGrownTree(); } };
    const failTimer = window.setTimeout(giveUp, 1600);
    img.onload = () => {
      window.clearTimeout(failTimer);
      if (settled) return;
      const r = artBox || { left: box.left, top: box.top, width: W * .8, height: H * .7 };
      const ox = r.left - box.left, oy = r.top - box.top;
      const tmp = document.createElement("canvas");
      tmp.width = Math.max(2, Math.round(W));
      tmp.height = Math.max(2, Math.round(H));
      const tctx = tmp.getContext("2d", { willReadFrequently: true });
      if (!tctx) { giveUp(); return; }
      tctx.drawImage(img, ox, oy, r.width, r.height);
      let tdata;
      try {
        tdata = tctx.getImageData(0, 0, tmp.width, tmp.height).data;
      } catch (_) { giveUp(); return; }
      const treePts = [];
      for (let y = 0; y < H; y += 5) for (let x = 0; x < W; x += 5) {
        if (tdata[(y * tmp.width + x) * 4 + 3] > 128) treePts.push([x, y]);
      }
      runMorph(textPts, treePts);
    };
    img.onerror = giveUp;
    img.src = "assets/images/initiative-tree.svg";
  };
  const runMorph = (textPts, treePts) => {
    const box = treeStage.getBoundingClientRect();
    const W = box.width, H = box.height;
    const MAXP = W < 520 ? 850 : 1400;
    const shuffle = arr => {
      for (let i = arr.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        const tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
      }
      return arr;
    };
    shuffle(textPts);
    shuffle(treePts);
    const N = Math.min(textPts.length, treePts.length, MAXP);
    if (N < 350 || !treeCanvas) { showGrownTree(); return; }
    const ctx = treeCanvas.getContext("2d");
    if (!ctx) { showGrownTree(); return; }
    const P = [];
    for (let i = 0; i < N; i += 1) {
      P.push({
        sx: Math.random() < .5 ? -20 - Math.random() * 60 : W + 20 + Math.random() * 60,
        sy: Math.random() * H,
        tx: textPts[i][0], ty: textPts[i][1],
        ex: treePts[i][0], ey: treePts[i][1],
        r: 1.1 + Math.random() * 1.5,
        d1: Math.random() * .35, d2: Math.random() * .3
      });
    }
    const A1 = 1.0, HOLD = 1.8, M1 = 3.5, CROSS = 3.35, END = 4.35;
    let t = 0, last = performance.now(), raf = 0, crossed = false, stopped = false;
    const cancel = () => { stopped = true; if (raf) cancelAnimationFrame(raf); };
    const finishNow = () => { if (!stopped) { cancel(); showGrownTree(); } };
    window.addEventListener("resize", finishNow, { once: true });
    const frame = now => {
      if (stopped) return;
      t += Math.min((now - last) / 1000, .034);
      last = now;
      const W2 = treeCanvas.clientWidth || W, H2 = treeCanvas.clientHeight || H;
      ctx.clearRect(0, 0, W2, H2);
      const fade = 1 - Math.min(Math.max((t - CROSS) / .7, 0), 1);
      for (let i = 0; i < N; i += 1) {
        const q = P[i];
        const ka = Math.min(Math.max((t - q.d1) / A1, 0), 1);
        const ea = easeInOut(ka);
        let x = q.sx + (q.tx - q.sx) * ea;
        let y = q.sy + (q.ty - q.sy) * ea;
        let a = Math.min(ka / .25, 1);
        let morph = 0;
        if (t > HOLD) {
          const km = Math.min(Math.max((t - HOLD - q.d2) / (M1 - HOLD), 0), 1);
          morph = easeInOut(km);
          x = q.tx + (q.ex - q.tx) * morph;
          y = q.ty + (q.ey - q.ty) * morph;
        }
        a *= fade;
        if (a <= 0) continue;
        ctx.globalAlpha = a;
        ctx.fillStyle = mixColor(morph, 184, 232, 240, 0, 139, 157);
        const r = q.r * (1 + morph * .3);
        ctx.fillRect(x - r / 2, y - r / 2, r, r);
      }
      ctx.globalAlpha = 1;
      if (!crossed && t >= CROSS) { crossed = true; showGrownTree(); }
      if (t >= END) { cancel(); return; }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
  };
  const bootTree = () => growTreeSequence();
  if (document.fonts && document.fonts.ready) {
    let booted = false;
    const go = () => { if (!booted) { booted = true; bootTree(); } };
    document.fonts.ready.then(go);
    window.setTimeout(go, 1200);
  } else bootTree();

  /* Pay modal: the $1 buttons open the form in-site instead of leaving
     for the official website. Esc, overlay click and close buttons exit;
     submit swaps to the reserved state. Focus enters and returns cleanly. */
  const payOverlay = document.getElementById("pay-modal");
  const payForm = document.getElementById("pay-form");
  const payViewForm = document.getElementById("pay-view-form");
  const payViewSuccess = document.getElementById("pay-view-success");
  let payTrigger = null;
  const openPay = trigger => {
    if (!payOverlay) return;
    payTrigger = trigger || null;
    if (payViewForm) payViewForm.hidden = false;
    if (payViewSuccess) payViewSuccess.hidden = true;
    payOverlay.classList.add("is-open");
    payOverlay.setAttribute("aria-hidden", "false");
    payOverlay.inert = false;
    document.documentElement.classList.add("modal-open");
    const first = payForm ? payForm.querySelector("input") : null;
    window.setTimeout(() => ((first || payOverlay.querySelector(".pay-close")) || document.body).focus({ preventScroll: true }), 60);
  };
  const closePay = () => {
    if (!payOverlay) return;
    payOverlay.classList.remove("is-open");
    payOverlay.setAttribute("aria-hidden", "true");
    payOverlay.inert = true;
    document.documentElement.classList.remove("modal-open");
    if (payTrigger) payTrigger.focus({ preventScroll: true });
  };
  document.querySelectorAll("[data-pay-open]").forEach(el => el.addEventListener("click", event => {
    event.preventDefault();
    openPay(el);
  }));
  document.querySelectorAll("[data-pay-close]").forEach(el => el.addEventListener("click", closePay));
  if (payOverlay) payOverlay.addEventListener("click", event => { if (event.target === payOverlay) closePay(); });
  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && payOverlay && payOverlay.classList.contains("is-open")) closePay();
  });
  if (payForm) payForm.addEventListener("submit", event => {
    event.preventDefault();
    if (!payForm.checkValidity()) { payForm.reportValidity(); return; }
    if (payViewForm) payViewForm.hidden = true;
    if (payViewSuccess) payViewSuccess.hidden = false;
    const done = payViewSuccess ? payViewSuccess.querySelector("[data-pay-close]") : null;
    if (done) done.focus({ preventScroll: true });
  });

const hero = document.querySelector(".initiative-hero");
  if (hero && !reduced && window.matchMedia("(pointer: fine)").matches) {
    hero.addEventListener("pointermove", event => {
      const rect = hero.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width - .5) * 12;
      const y = ((event.clientY - rect.top) / rect.height - .5) * 12;
      hero.style.setProperty("--shift-x", `${x}px`);
      hero.style.setProperty("--shift-y", `${y}px`);
      hero.style.setProperty("--grid-x", `${x * -.8}px`);
      hero.style.setProperty("--grid-y", `${y * -.8}px`);
    });
    hero.addEventListener("pointerleave", () => {
      hero.style.setProperty("--shift-x", "0px");
      hero.style.setProperty("--shift-y", "0px");
    });
  }
})();
