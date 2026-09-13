import { memo, useEffect, useMemo, useRef } from "react";
import { useRouterState } from "@tanstack/react-router";
import { withSiteChrome } from "./radial-nav";
import type { CinematicRuntime, CinematicRuntimeContext } from "./runtime";

export type CinematicScript = { src: string; module?: boolean };

type Props = {
  html: string;
  scripts: CinematicScript[];
  htmlClass?: string;
  bodyClass?: string;
  htmlAttrs?: Record<string, string>;
};

/**
 * The prototype scripts wait for DOMContentLoaded / load, which have already
 * fired by the time we inject them. Registrations for those two events are
 * queued while the scripts load and replayed, in order, once every script has
 * executed, matching the prototype where deferred scripts all run before
 * DOMContentLoaded.
 */
function installReadyShim() {
  const docAdd = document.addEventListener;
  const winAdd = window.addEventListener;
  type Queued = { target: EventTarget; type: string; listener: EventListenerOrEventListenerObject };
  const queue: Queued[] = [];
  const shouldQueue = (type: string) => type === "DOMContentLoaded" || type === "load";
  document.addEventListener = function (
    this: Document,
    type: string,
    listener: any,
    options?: any,
  ) {
    if (shouldQueue(type) && listener) {
      queue.push({ target: document, type, listener });
      return;
    }
    return docAdd.call(this, type, listener, options);
  } as typeof document.addEventListener;
  window.addEventListener = function (this: Window, type: string, listener: any, options?: any) {
    if (shouldQueue(type) && listener) {
      queue.push({ target: window, type, listener });
      return;
    }
    return winAdd.call(this, type, listener, options);
  } as typeof window.addEventListener;
  const restore = () => {
    document.addEventListener = docAdd;
    window.addEventListener = winAdd;
  };
  const flush = () => {
    restore();
    const ordered = [
      ...queue.filter((q) => q.type === "DOMContentLoaded"),
      ...queue.filter((q) => q.type === "load"),
    ];
    queue.length = 0;
    for (const q of ordered) {
      const event = new Event(q.type);
      try {
        if (typeof q.listener === "function") q.listener.call(q.target, event);
        else q.listener.handleEvent(event);
      } catch (error) {
        console.error(error);
      }
    }
  };
  return { flush, restore };
}

/**
 * Appends prototype scripts in order, skipping any already on the page, and
 * replays the ready events they wait for once all of them have run. The
 * caller removes `added` when its page goes away, so a later visit runs the
 * scripts afresh against the new markup; `cancel` puts the real listeners
 * back if that happens before the scripts finish loading.
 */
export function appendCinematicScripts(scripts: CinematicScript[], onEachSettled?: () => void) {
  const added: HTMLScriptElement[] = [];
  const pending = scripts.filter(
    (s) => !document.querySelector(`script[data-cinematic][src="${s.src}"]`),
  );
  if (pending.length === 0) return { added, cancel: () => {} };
  const shim = installReadyShim();
  let remaining = pending.length;
  let finished = false;
  const settle = () => {
    onEachSettled?.();
    remaining -= 1;
    if (remaining <= 0 && !finished) {
      finished = true;
      shim.flush();
    }
  };
  for (const s of pending) {
    const el = document.createElement("script");
    el.src = s.src;
    el.async = false;
    el.dataset.cinematic = "true";
    if (s.module) el.type = "module";
    el.addEventListener("load", settle, { once: true });
    el.addEventListener("error", settle, { once: true });
    added.push(el);
    document.body.appendChild(el);
  }
  const cancel = () => {
    if (finished) return;
    finished = true;
    shim.restore();
  };
  return { added, cancel };
}

/** Renders a prototype page's static markup and boots its vanilla scripts in order. */
function CinematicPageImpl({ html, scripts, htmlClass, bodyClass, htmlAttrs }: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  /* React writes dangerouslySetInnerHTML again whenever it receives a new
     object, even one holding the same string. That rewrite throws away
     everything the page scripts did to the markup (revealed sections, split
     text, bound listeners), so the object is kept stable and only a real
     change of markup reaches the DOM. */
  const inner = useMemo(() => ({ __html: withSiteChrome(html, pathname) }), [html, pathname]);

  useEffect(() => {
    const root = document.documentElement;
    if (htmlClass) root.classList.add(htmlClass);
    if (bodyClass) document.body.classList.add(bodyClass);
    if (htmlAttrs) for (const [k, v] of Object.entries(htmlAttrs)) root.setAttribute(k, v);
    const disposers: Array<() => void> = [];
    const ctx: CinematicRuntimeContext = {
      locale: root.lang === "en" ? "en" : "ar",
      direction: root.getAttribute("dir") === "ltr" ? "ltr" : "rtl",
      reducedMotion:
        typeof window.matchMedia === "function" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    };
    /* A script may expose window.__cinematic.init to scope itself to this
       page and hand back its own cleanup. */
    const tryInitFromGlobals = () => {
      const scope: HTMLElement = mountRef.current ?? document.body;
      const exposed = (window as unknown as { __cinematic?: CinematicRuntime }).__cinematic;
      if (exposed && typeof exposed.init === "function") {
        try {
          const cleanup = exposed.init(scope, ctx);
          if (typeof cleanup === "function") disposers.push(cleanup);
        } catch (error) {
          console.error(error);
        }
      }
    };
    const { added, cancel } = appendCinematicScripts(scripts, tryInitFromGlobals);
    return () => {
      cancel();
      for (const dispose of disposers) {
        try {
          dispose();
        } catch (error) {
          console.error(error);
        }
      }
      disposers.length = 0;
      for (const el of added) el.remove();
      if (htmlClass) root.classList.remove(htmlClass);
      if (bodyClass) document.body.classList.remove(bodyClass);
      if (htmlAttrs) for (const k of Object.keys(htmlAttrs)) root.removeAttribute(k);
    };
  }, [html, scripts, htmlClass, bodyClass, htmlAttrs]);

  return <div ref={mountRef} className="cinematic" dangerouslySetInnerHTML={inner} />;
}

/* A page that re-renders for its own reasons (a dialog opening, say) must not
   re-render the prototype markup underneath it. */
export const CinematicPage = memo(CinematicPageImpl);
