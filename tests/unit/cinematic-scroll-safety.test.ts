import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { installCinematicScrollSafety } from "../../src/components/cinematic/scroll-safety";

describe("cinematic scroll safety", () => {
  let classes: Set<string>;
  let loaderClasses: Set<string>;
  let scope: HTMLElement;
  let checkpointsDestroy: ReturnType<typeof vi.fn>;
  let scrollDestroy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    classes = new Set(["site-loading"]);
    loaderClasses = new Set();
    const classList = (values: Set<string>) => ({
      add: (...names: string[]) => names.forEach(name => values.add(name)),
      remove: (...names: string[]) => names.forEach(name => values.delete(name)),
      contains: (name: string) => values.has(name),
    });
    scope = { querySelector: () => ({ classList: classList(loaderClasses) }) } as unknown as HTMLElement;
    checkpointsDestroy = vi.fn();
    scrollDestroy = vi.fn();
    vi.stubGlobal("document", { documentElement: { classList: classList(classes) } });
    vi.stubGlobal("window", {
      setTimeout, clearTimeout,
      saaeCheckpointsDestroy: checkpointsDestroy,
      saaeScrollDestroy: scrollDestroy,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("unlocks and hides the loader even if scripts never report ready", () => {
    installCinematicScrollSafety(scope);
    vi.advanceTimersByTime(9999);
    expect(classes.has("site-loading")).toBe(true);
    vi.advanceTimersByTime(1);
    expect(classes.has("site-loading")).toBe(false);
    expect(loaderClasses.has("is-hidden")).toBe(true);
    expect(classes.has("hero-opening-ready")).toBe(true);
    expect(scrollDestroy).toHaveBeenCalledOnce();
  });

  it("unlocks immediately and destroys page scroll owners on unmount", () => {
    const cleanup = installCinematicScrollSafety(scope);
    cleanup();
    expect(classes.has("site-loading")).toBe(false);
    expect(loaderClasses.has("is-hidden")).toBe(true);
    expect(checkpointsDestroy).toHaveBeenCalledOnce();
    expect(scrollDestroy).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("still tears down the scroll engine if checkpoint cleanup fails", () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    checkpointsDestroy.mockImplementation(() => { throw new Error("stale scene"); });
    const cleanup = installCinematicScrollSafety(scope);
    expect(cleanup).not.toThrow();
    expect(classes.has("site-loading")).toBe(false);
    expect(scrollDestroy).toHaveBeenCalledOnce();
    expect(log).toHaveBeenCalledOnce();
  });

  it("does not disable a healthy engine after normal loading completes", () => {
    installCinematicScrollSafety(scope);
    classes.delete("site-loading");
    vi.advanceTimersByTime(10000);
    expect(scrollDestroy).not.toHaveBeenCalled();
  });
});
