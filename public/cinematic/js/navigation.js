(() => {
  "use strict";
  const nav = document.querySelector("[data-radial-nav]");
  if (!nav) return;

  const toggle = nav.querySelector("[data-radial-toggle]");
  const close = nav.querySelector("[data-radial-close]");
  const items = nav.querySelector("[data-radial-items]");
  const orbitItems = [...nav.querySelectorAll(".radial-nav-item")];
  const labels = document.querySelectorAll("[data-nav-en][data-nav-ar]");
  let open = false;
  let orbitFrame = 0;
  const arabic = () => document.documentElement.lang === "ar" || document.documentElement.dir === "rtl";
  const syncLanguage = () => {
    const isArabic = arabic();
    labels.forEach(label => { label.textContent = label.dataset[isArabic ? "navAr" : "navEn"]; });
    const toggleLabel = open ? (isArabic ? "إغلاق التنقل" : "Close navigation") : (isArabic ? "فتح التنقل" : "Open navigation");
    toggle?.setAttribute("aria-label", toggleLabel);
    /* The toggle redundantly carries the same label as visible screen-reader
       text; without this it would stay English inside an Arabic page. */
    const toggleText = toggle?.querySelector(".sr-only");
    if (toggleText) toggleText.textContent = toggleLabel;
    const closeLabel = isArabic ? "إغلاق التنقل" : "Close navigation";
    close?.setAttribute("aria-label", closeLabel);
    const closeText = close?.querySelector(".sr-only");
    if (closeText) closeText.textContent = closeLabel;
    items?.setAttribute("aria-label", isArabic ? "التنقل الرئيسي" : "Main navigation");
  };
  const setOpen = (next, returnFocus = false) => {
    open = Boolean(next);
    if (open && !orbitFrame) orbitFrame = requestAnimationFrame(animateOrbit);
    nav.classList.toggle("is-open", open);
    document.documentElement.classList.toggle("radial-nav-open", open);
    toggle?.setAttribute("aria-expanded", String(open));
    items?.setAttribute("aria-hidden", String(!open));
    items?.toggleAttribute("inert", !open);
    if (!open) orbitItems.forEach(item => { item.style.transform = ""; });
    syncLanguage();
    if (open) window.setTimeout(() => items?.querySelector("a")?.focus({ preventScroll: true }), 90);
    if (!open && returnFocus) toggle?.focus({ preventScroll: true });
  };
  /* The scrim behind the hub and the language button (navigation.css) shows
     once the page has left its top, where it would sit over the headline. */
  const syncScrolled = () => {
    document.documentElement.classList.toggle("nav-scrolled", window.scrollY > 24);
  };
  window.addEventListener("scroll", syncScrolled, { passive: true });
  syncScrolled();
  /* The orbit runs only while the menu is open: a frame loop left running on
     every page kept the phone drawing 60 times a second for nothing. */
  const animateOrbit = time => {
    if (!open) { orbitFrame = 0; return; }
    {
      const radius = window.matchMedia("(max-width: 680px), (max-height: 620px)").matches ? 112 : 140;
      const angleOffset = time * 0.00012;
      orbitItems.forEach((item, index) => {
        const angle = (index / orbitItems.length) * Math.PI * 2 + angleOffset;
        const x = radius * Math.cos(angle);
        const y = radius * Math.sin(angle);
        item.style.transform = `translate(-50%, -50%) translate(${x}px, ${y}px)`;
      });
    }
    orbitFrame = requestAnimationFrame(animateOrbit);
  };
  toggle?.addEventListener("click", () => setOpen(!open));
  close?.addEventListener("click", () => setOpen(false, true));
  items?.addEventListener("click", event => { if (event.target.closest("a")) setOpen(false); });
  document.addEventListener("pointerdown", event => { if (open && !nav.contains(event.target)) setOpen(false); });
  document.addEventListener("keydown", event => { if (event.key === "Escape" && open) setOpen(false, true); });
  window.addEventListener("saae:languagechange", syncLanguage);
  new MutationObserver(syncLanguage).observe(document.documentElement, { attributes:true, attributeFilter:["lang","dir"] });
  setOpen(false);
  window.addEventListener("pagehide", () => cancelAnimationFrame(orbitFrame), { once:true });
})();
