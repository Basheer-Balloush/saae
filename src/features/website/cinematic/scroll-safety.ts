type ScrollRuntimeWindow = Window & {
  saaeCheckpointsDestroy?: (() => void) | null;
  saaeScrollDestroy?: (() => void) | null;
};

/** Keep the HTML page usable even if an enhancement script never loads. */
export function installCinematicScrollSafety(scope: HTMLElement) {
  const root = document.documentElement;
  const loader = scope.querySelector<HTMLElement>("#site-loader");
  const unlock = () => {
    root.classList.remove("site-loading");
    root.classList.add("hero-opening-ready");
    loader?.classList.add("is-done", "is-hidden");
  };
  const destroyScroll = () => {
    const runtime = window as ScrollRuntimeWindow;
    for (const dispose of [runtime.saaeCheckpointsDestroy, runtime.saaeScrollDestroy]) {
      try {
        dispose?.();
      } catch (error) {
        console.error(error);
      }
    }
  };
  // This starts outside the script-ready shim, so a stalled download cannot postpone it.
  const timer = window.setTimeout(() => {
    if (!root.classList.contains("site-loading")) return;
    unlock();
    destroyScroll();
  }, 10000);

  return () => {
    window.clearTimeout(timer);
    unlock();
    destroyScroll();
  };
}
