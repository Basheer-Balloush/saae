import { useEffect, useState } from "react";

/**
 * Finds an element that React does not own -- markup injected as an HTML
 * string, such as the desktop cinematic homepage -- so a component can be
 * portalled into it. It keeps looking until the element appears (the markup
 * mounts after a lazy chunk loads) and looks again whenever the element it
 * found is detached (the markup is rewritten when its source string changes).
 */
export function usePortalTarget(selector: string): HTMLElement | null {
  const [target, setTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    let current: HTMLElement | null = null;
    const sync = () => {
      if (current?.isConnected) return;
      current = document.querySelector<HTMLElement>(selector);
      setTarget(current);
    };
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [selector]);

  return target;
}
