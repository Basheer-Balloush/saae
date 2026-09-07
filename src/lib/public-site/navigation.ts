// @ts-nocheck
/* eslint-disable */
/* Ported from the SAAE cinematic design package. Behaviour preserved; wrapped
   so the app can start it on mount and tear it down on unmount. */

export function initRadialNav(): () => void {
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
    nav.classList.toggle("is-open", open);
    document.documentElement.classList.toggle("radial-nav-open", open);
    toggle?.setAttribute("aria-expanded", String(open));
    items?.setAttribute("aria-hidden", String(!open));
    items?.toggleAttribute("inert", !open);
    if (!open) orbitItems.forEach(item => { item.style.transform = ""; });
    syncLanguage();
    if (open) __setTimeout(() => items?.querySelector("a")?.focus({ preventScroll: true }), 90);
    if (!open && returnFocus) toggle?.focus({ preventScroll: true });
  };
  const animateOrbit = time => {
    if (open) {
      const radius = window.matchMedia("(max-width: 680px), (max-height: 620px)").matches ? 112 : 140;
      const angleOffset = time * 0.00012;
      orbitItems.forEach((item, index) => {
        const angle = (index / orbitItems.length) * Math.PI * 2 + angleOffset;
        const x = radius * Math.cos(angle);
        const y = radius * Math.sin(angle);
        item.style.transform = `translate(-50%, -50%) translate(${x}px, ${y}px)`;
      });
    }
    orbitFrame = __raf(animateOrbit);
  };
  __on(toggle, "click", () => setOpen(!open));
  __on(close, "click", () => setOpen(false, true));
  __on(items, "click", event => { if (event.target.closest("a")) setOpen(false); });
  __on(document, "pointerdown", event => { if (open && !nav.contains(event.target)) setOpen(false); });
  __on(document, "keydown", event => { if (event.key === "Escape" && open) setOpen(false, true); });
  __on(window, "saae:languagechange", syncLanguage);
  new __MutationObserver(syncLanguage).observe(document.documentElement, { attributes:true, attributeFilter:["lang","dir"] });
  setOpen(false);
  orbitFrame = __raf(animateOrbit);
  __on(window, "pagehide", () => cancelAnimationFrame(orbitFrame), { once:true });

  };
  try { __run(); } catch (error) { console.error("initRadialNav failed", error); }
  return __teardown;
}
