import { useEffect, useMemo } from "react";
import { useRouterState } from "@tanstack/react-router";
import { withSiteChrome } from "./radial-nav";

export type CinematicScript = { src: string; module?: boolean };

type Props = {
  html: string;
  scripts: CinematicScript[];
  htmlClass?: string;
  bodyClass?: string;
  htmlAttrs?: Record<string, string>;
};

type AddListener = typeof document.addEventListener;

/**
 * The prototype scripts wait for DOMContentLoaded / load, which have already
 * fired by the time we inject them. Registrations for those two events are
 * queued while the scripts load and replayed, in order, once every script has
 * executed, matching the prototype where deferred scripts all run before
 * DOMContentLoaded.
 */
const injected = new Set<string>();
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

/** Renders a prototype page's static markup and boots its vanilla scripts in order. */
export function CinematicPage({ html, scripts, htmlClass, bodyClass, htmlAttrs }: Props) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const page = useMemo(() => withSiteChrome(html, pathname), [html, pathname]);

  useEffect(() => {
    const root = document.documentElement;
    if (htmlClass) root.classList.add(htmlClass);
    if (bodyClass) document.body.classList.add(bodyClass);
    if (htmlAttrs) for (const [k, v] of Object.entries(htmlAttrs)) root.setAttribute(k, v);
    const pendingScripts = scripts.filter((s) => !injected.has(s.src));
    if (pendingScripts.length > 0) {
      const shim = installReadyShim();
      let pending = pendingScripts.length;
      const settle = () => {
        pending -= 1;
        if (pending <= 0) shim.flush();
      };
      for (const s of pendingScripts) {
        injected.add(s.src);
        const el = document.createElement("script");
        el.src = s.src;
        el.async = false;
        el.dataset.cinematic = "true";
        if (s.module) el.type = "module";
        el.addEventListener("load", settle);
        el.addEventListener("error", settle);
        document.body.appendChild(el);
      }
    }
    return () => {
      if (htmlClass) root.classList.remove(htmlClass);
      if (bodyClass) document.body.classList.remove(bodyClass);
      if (htmlAttrs) for (const k of Object.keys(htmlAttrs)) root.removeAttribute(k);
    };
  }, [html, scripts, htmlClass, bodyClass, htmlAttrs]);

  return <div className="cinematic" dangerouslySetInnerHTML={{ __html: page }} />;
}
