import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { describe, expect, it, vi } from "vitest";

const script = readFileSync("public/cinematic/js/partner-handoff.js", "utf8");

function fixture() {
  const partners = {};
  const surface = {};
  const mission = {};
  const handoff = {
    classList: { add: vi.fn(), remove: vi.fn() },
    querySelector: (selector: string) =>
      new Map<string, unknown>([
        ["#partners", partners],
        [".hp-partner-surface", surface],
        ["#mission", mission],
      ]).get(selector),
  };
  const timeline = {
    to: vi.fn((_target: unknown, _properties: { xPercent: number }, _at: number) => {}),
    fromTo: vi.fn(
      (
        _target: unknown,
        _from: { xPercent: number; y: () => number },
        _to: { xPercent: number; y: number },
        _at: number,
      ) => {},
    ),
  };
  let mediaCleanup: (() => void) | undefined;
  const media = {
    add: vi.fn((_query: string, setup: () => () => void) => {
      mediaCleanup = setup();
    }),
    revert: vi.fn(() => mediaCleanup?.()),
  };
  const observer = { observe: vi.fn(), disconnect: vi.fn() };
  const window = {
    innerHeight: 900,
    gsap: {
      matchMedia: () => media,
      timeline: vi.fn(
        (_config: { scrollTrigger: { pin: unknown; scrub: boolean; end: () => string } }) =>
          timeline,
      ),
    },
    ScrollTrigger: { refresh: vi.fn() },
    __cinematic: undefined as undefined | { init: (root: unknown) => undefined | (() => void) },
  };
  runInNewContext(script, {
    window,
    ResizeObserver: function () {
      return observer;
    },
  });
  const root = { querySelector: () => handoff };
  return { window, root, handoff, partners, surface, mission, timeline, media, observer };
}

describe("partner section horizontal transition", () => {
  it("uses a responsive, reduced-motion-aware enhancement with native scroll", () => {
    const f = fixture();
    f.window.__cinematic!.init(f.root);
    expect(f.media.add.mock.calls[0][0]).toContain("(prefers-reduced-motion: no-preference)");
    expect(f.media.add.mock.calls[0][0]).toContain("(pointer: fine)");
    const config = f.window.gsap.timeline.mock.calls[0][0].scrollTrigger;
    expect(config.pin).toBe(f.partners);
    expect(config.scrub).toBe(true);
    expect(Number(config.end().slice(2))).toBeCloseTo(990);
    const [incoming, from, to] = f.timeline.fromTo.mock.calls[0];
    expect(incoming).toBe(f.mission);
    expect(from.xPercent).toBe(-100);
    expect(from.y()).toBeCloseTo(-990);
    expect(to.xPercent).toBe(0);
    expect(to.y).toBe(0);
    expect(f.timeline.to.mock.calls[0][1].xPercent).toBe(100);
  });

  it("does not duplicate pins and releases observers on navigation", () => {
    const f = fixture();
    const cleanup = f.window.__cinematic!.init(f.root);
    expect(f.window.__cinematic!.init(f.root)).toBeUndefined();
    expect(f.window.gsap.timeline).toHaveBeenCalledTimes(1);
    cleanup!();
    expect(f.media.revert).toHaveBeenCalledOnce();
    expect(f.handoff.classList.remove).toHaveBeenCalledWith("is-horizontal");
    f.window.__cinematic!.init(f.root);
    expect(f.window.gsap.timeline).toHaveBeenCalledTimes(2);
  });

  it("leaves pages without a transition untouched", () => {
    const f = fixture();
    expect(f.window.__cinematic!.init({ querySelector: () => null })).toBeUndefined();
    expect(f.media.add).not.toHaveBeenCalled();
  });
});
