/* =============================================================================
   SAAE — Contact
   -----------------------------------------------------------------------------
   The Claude Design canvas drove this page through a DCLogic component: state,
   a ROUTES table, and {{ bindings }} interpolated into inline styles. None of
   that survives outside the canvas, so this is the same behaviour in plain JS —
   the selected-route colours are now CSS (`[aria-selected]`), and only the copy
   that genuinely varies is written from here.

   Four things:
     1. The route picker, as a real tablist. It retitles the form, renames the
        team, and relabels the fourth field, so choosing a route changes the
        form rather than only a caption.
     2. The language switch, which moves `dir` as well as the words — and has to
        repaint the route copy, which lives in this table rather than in
        data-en/data-ar attributes.
     3. The character counter.
     4. Submission. There is no backend on this site, so the form composes a
        prefilled mail to info@aisyria.org and hands it to the visitor's mail
        client. Swap `submitEnquiry` for a fetch() when an endpoint exists —
        nothing else needs to change.
   ========================================================================== */
(() => {
  "use strict";

  const ROUTES = [
    { name: "Learning & training", nameAr: "التعلّم والتدريب",
      team: "Learning team", teamAr: "فريق التعلّم",
      third: "Field of study", thirdAr: "مجال الدراسة",
      form: "Tell us what you want to learn", formAr: "أخبرنا بما تريد تعلّمه" },
    { name: "Partnership", nameAr: "الشراكة",
      team: "Partnerships desk", teamAr: "مكتب الشراكات",
      third: "Organisation / company", thirdAr: "الجهة / الشركة",
      form: "Tell us about your organisation", formAr: "أخبرنا عن جهتك" },
    { name: "Media enquiry", nameAr: "استفسار إعلامي",
      team: "Communications", teamAr: "فريق الاتصال",
      third: "Outlet", thirdAr: "الجهة الإعلامية",
      form: "Tell us your outlet and deadline", formAr: "أخبرنا بجهتك والموعد النهائي" },
    { name: "General enquiry", nameAr: "استفسار عام",
      team: "SAAE office", teamAr: "مكتب الجمعية",
      third: "Organisation / company", thirdAr: "الجهة / الشركة",
      form: "Tell us what you need", formAr: "أخبرنا بما تحتاجه" }
  ];

  const COPY = {
    incomplete: ["Please complete the required fields.", "يرجى إكمال الحقول المطلوبة."],
    badEmail:   ["That email address does not look right.", "يبدو أن البريد الإلكتروني غير صحيح."],
    opening:    ["Opening your email app — send the message to finish.",
                 "يتم فتح تطبيق البريد لديك — أرسل الرسالة لإتمام العملية."],
    sending:    ["Sending your message…", "جارٍ إرسال رسالتك…"],
    sent:       ["Thank you. Your message has been received and we will reply soon.",
                 "شكراً لك. وصلتنا رسالتك وسنرد عليك قريباً."],
    failed:     ["Your message could not be sent. Please try again.",
                 "تعذّر إرسال رسالتك. يرجى المحاولة مرة أخرى."]
  };
  /* Same order as ROUTES, mapped to the contact_messages inquiry_type enum. */
  const INQUIRY_TYPES = ["training", "partnership", "media", "general"];

  const $ = id => document.getElementById(id);
  const routeButtons = [...document.querySelectorAll("#routes [role='tab']")];
  const formTitle = $("form-title");
  const routeName = $("route-name");
  const routeTeam = $("route-team");
  const thirdLabel = $("third-label");
  const status = $("form-status");
  const message = $("f-message");
  const count = $("f-count");
  const form = $("write");
  const langButton = $("lang-button");

  let route = 3;
  let lang = "en";
  const ar = () => lang === "ar";

  /* ---- route ------------------------------------------------------------ */
  function paintRoute() {
    const r = ROUTES[route];
    if (routeButtons.length) {
      if (formTitle) formTitle.textContent = ar() ? r.formAr : r.form;
      if (routeName) routeName.textContent = ar() ? r.nameAr : r.name;
      if (routeTeam) routeTeam.textContent = ar() ? r.teamAr : r.team;
      if (thirdLabel) thirdLabel.textContent = ar() ? r.thirdAr : r.third;
    }
    routeButtons.forEach((b, i) => {
      const on = i === route;
      b.setAttribute("aria-selected", String(on));
      b.tabIndex = on ? 0 : -1;
    });
  }

  routeButtons.forEach((button, i) => {
    button.addEventListener("click", () => { route = i; paintRoute(); });
    button.addEventListener("keydown", event => {
      /* Arrow keys follow the reading direction, so in Arabic they swap. */
      const rtl = document.documentElement.dir === "rtl";
      const fwd = rtl ? "ArrowLeft" : "ArrowRight";
      const back = rtl ? "ArrowRight" : "ArrowLeft";
      let next = null;
      if (event.key === fwd || event.key === "ArrowDown") next = (i + 1) % routeButtons.length;
      else if (event.key === back || event.key === "ArrowUp") next = (i - 1 + routeButtons.length) % routeButtons.length;
      else if (event.key === "Home") next = 0;
      else if (event.key === "End") next = routeButtons.length - 1;
      if (next == null) return;
      event.preventDefault();
      route = next;
      paintRoute();
      routeButtons[next].focus();
    });
  });

  /* ---- language --------------------------------------------------------- */
  function setLanguage(next) {
    lang = next;
    const isAr = next === "ar";
    document.documentElement.lang = isAr ? "ar" : "en";
    document.documentElement.dir = isAr ? "rtl" : "ltr";
    window.dispatchEvent(new CustomEvent("saae:languagechange", { detail: { lang: next } }));

    document.querySelectorAll("[data-en][data-ar]").forEach(el => {
      const value = isAr ? el.dataset.ar : el.dataset.en;
      if (value != null) el.textContent = value;
    });

    if (langButton) {
      langButton.setAttribute("aria-pressed", String(isAr));
      langButton.setAttribute("aria-label", isAr ? "Switch to English" : "التبديل إلى العربية");
    }
    paintRoute();
    if (status) status.textContent = "";
    try { localStorage.setItem("saae-lang", next); } catch (_) { /* private mode */ }
  }

  langButton?.addEventListener("click", () => setLanguage(ar() ? "en" : "ar"));

  /* ---- counter ---------------------------------------------------------- */
  message?.addEventListener("input", () => {
    if (count) count.textContent = String(message.value.length);
  });

  /* ---- submit ----------------------------------------------------------- */
  /* Replace this one function with a fetch() to a real endpoint and the rest of
     the page is unchanged. Until then a prefilled mail is the honest option:
     it actually reaches info@aisyria.org, rather than pretending to send. */
  function submitEnquiry(data) {
    const r = ROUTES[route];
    const body = [
      `${ar() ? "المسار" : "Route"}: ${ar() ? r.nameAr : r.name}`,
      `${ar() ? "الاسم" : "Name"}: ${data.name}`,
      `${ar() ? "البريد" : "Email"}: ${data.email}`,
      data.phone ? `${ar() ? "الهاتف" : "Phone"}: ${data.phone}` : null,
      data.context ? `${ar() ? r.thirdAr : r.third}: ${data.context}` : null,
      "",
      data.message
    ].filter(Boolean).join("\n");

    const href = "mailto:info@aisyria.org"
      + "?subject=" + encodeURIComponent(`[${ar() ? r.nameAr : r.name}] ${data.subject}`)
      + "&body=" + encodeURIComponent(body);
    window.location.href = href;
  }

  function say(text, isError) {
    if (!status) return;
    status.textContent = text;
    status.classList.toggle("is-error", Boolean(isError));
  }

  form?.addEventListener("submit", event => {
    event.preventDefault();
    const data = {
      name: $("f-name").value.trim(),
      email: $("f-email").value.trim(),
      phone: $("f-phone").value.trim(),
      context: $("f-context").value.trim(),
      subject: $("f-subject").value.trim(),
      message: message.value.trim()
    };

    if (!data.name || !data.email || !data.subject || !data.message) {
      say(COPY.incomplete[ar() ? 1 : 0], true);
      (!data.name ? $("f-name") : !data.email ? $("f-email") : !data.subject ? $("f-subject") : message).focus();
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      say(COPY.badEmail[ar() ? 1 : 0], true);
      $("f-email").focus();
      return;
    }

    /* The page saves to the database when the application provides a handler.
       The prefilled mail below stays as the fallback for the static preview. */
    if (typeof window.saaeContactSubmit === "function") {
      say(COPY.sending[ar() ? 1 : 0], false);
      window
        .saaeContactSubmit({
          full_name: data.name,
          email: data.email,
          phone: data.phone || null,
          organization: data.context || null,
          inquiry_type: INQUIRY_TYPES[route] || "general",
          subject: data.subject,
          message: data.message,
        })
        .then(() => {
          say(COPY.sent[ar() ? 1 : 0], false);
          form.reset();
          if (count) count.textContent = "0";
        })
        .catch(() => say(COPY.failed[ar() ? 1 : 0], true));
      return;
    }
    say(COPY.opening[ar() ? 1 : 0], false);
    submitEnquiry(data);
  });

  /* ---- boot ------------------------------------------------------------- */
  let saved = null;
  try { saved = localStorage.getItem("saae-lang") || localStorage.getItem("saae-lang"); } catch (_) { /* private mode */ }
  setLanguage(saved === "ar" ? "ar" : "en");
})();
