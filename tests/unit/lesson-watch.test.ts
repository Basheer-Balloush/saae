import { afterEach, describe, expect, it, vi } from "vitest";
import {
  WatchTracker,
  addSpan,
  hasWatchedEnough,
  loadWatch,
  requiredSeconds,
  saveWatch,
  watchedSeconds,
  watchedShare,
} from "@/features/lms/lib/lesson-watch";

/** Plays from `from` to `to` at `rate`, reporting every 250 ms of wall time. */
function play(t: WatchTracker, clock: { now: number }, from: number, to: number, rate = 1) {
  for (let pos = from; pos <= to + 1e-9; pos += 0.25 * rate) {
    t.report(Math.min(pos, to), 600, clock.now);
    clock.now += 250;
  }
}

describe("watched spans", () => {
  it("merges overlapping and touching spans and ignores empty ones", () => {
    let s = addSpan([], 10, 20);
    s = addSpan(s, 30, 40);
    s = addSpan(s, 18, 31);
    s = addSpan(s, 50, 50);
    expect(s).toEqual([[10, 40]]);
    expect(
      addSpan(
        [
          [0, 5],
          [10, 15],
        ],
        6,
        8,
      ),
    ).toEqual([
      [0, 5],
      [6, 8],
      [10, 15],
    ]);
    expect(
      watchedSeconds([
        [0, 5],
        [10, 15],
      ]),
    ).toBe(10);
  });

  it("asks for 90% of the video", () => {
    expect(requiredSeconds(600)).toBe(540);
    expect(requiredSeconds(78 * 60 + 53)).toBeCloseTo(4259.7, 5);
    expect(requiredSeconds(0)).toBe(Infinity);
  });
});

describe("watch tracker", () => {
  it("completes after the video is played through", () => {
    const t = new WatchTracker();
    const clock = { now: 0 };
    play(t, clock, 0, 600);
    expect(hasWatchedEnough(t.progress)).toBe(true);
    expect(watchedShare(t.progress)).toBe(1);
  });

  it("completes at 90% of the video, not before", () => {
    const t = new WatchTracker();
    const clock = { now: 0 };
    play(t, clock, 0, 530);
    expect(hasWatchedEnough(t.progress)).toBe(false);
    expect(watchedShare(t.progress)).toBeCloseTo(530 / 600, 5);
    play(t, clock, 530.25, 541);
    expect(hasWatchedEnough(t.progress)).toBe(true);
  });

  it("adds up separate sittings and progress saved from an earlier visit", () => {
    const t = new WatchTracker({ duration: 600, spans: [[0, 300]] });
    const clock = { now: 0 };
    play(t, clock, 300, 450);
    t.interrupt();
    expect(hasWatchedEnough(t.progress)).toBe(false);
    play(t, clock, 450, 545);
    expect(hasWatchedEnough(t.progress)).toBe(true);
  });

  it("does not count dragging straight to the end", () => {
    const t = new WatchTracker();
    const clock = { now: 0 };
    play(t, clock, 0, 20);
    t.report(599, 600, clock.now + 300);
    t.report(600, 600, clock.now + 550);
    expect(watchedSeconds(t.progress.spans)).toBeCloseTo(21, 5);
    expect(hasWatchedEnough(t.progress)).toBe(false);
  });

  it("does not count 5-second keyboard skips", () => {
    const t = new WatchTracker();
    let now = 0;
    for (let pos = 0; pos <= 600; pos += 5) {
      t.report(pos, 600, now);
      now += 200;
    }
    expect(watchedSeconds(t.progress.spans)).toBe(0);
  });

  it("does not count a pause followed by a drag forward", () => {
    const t = new WatchTracker();
    const clock = { now: 0 };
    play(t, clock, 0, 10);
    t.interrupt();
    clock.now += 60_000;
    t.report(300, 600, clock.now);
    expect(watchedSeconds(t.progress.spans)).toBeCloseTo(10, 5);
  });

  it.each([0.5, 1.25, 1.5, 2, 4])("counts playback at %sx speed the same", (rate) => {
    const t = new WatchTracker();
    const clock = { now: 0 };
    play(t, clock, 0, 541, rate);
    expect(hasWatchedEnough(t.progress)).toBe(true);
    expect(watchedSeconds(t.progress.spans)).toBeGreaterThan(540);
  });

  it("does not count rewatched parts twice", () => {
    const t = new WatchTracker();
    const clock = { now: 0 };
    play(t, clock, 0, 100);
    t.interrupt();
    play(t, clock, 50, 100);
    expect(watchedSeconds(t.progress.spans)).toBeCloseTo(100, 5);
  });
});

describe("saved progress", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("round-trips through storage and ignores damaged entries", () => {
    const store = new Map<string, string>();
    vi.stubGlobal("window", {
      localStorage: {
        getItem: (k: string) => store.get(k) ?? null,
        setItem: (k: string, v: string) => void store.set(k, v),
      },
    });
    saveWatch("u1", "l1", {
      duration: 600,
      spans: [
        [0, 120.04],
        [300, 360],
      ],
    });
    expect(loadWatch("u1", "l1")).toEqual({
      duration: 600,
      spans: [
        [0, 120],
        [300, 360],
      ],
    });
    expect(loadWatch("u2", "l1")).toEqual({ duration: 0, spans: [] });
    store.set("saae:lesson-watch:v1:u1:bad", "{not json");
    expect(loadWatch("u1", "bad")).toEqual({ duration: 0, spans: [] });
  });

  it("still works when storage is blocked", () => {
    vi.stubGlobal("window", {
      localStorage: {
        getItem: () => {
          throw new Error("blocked");
        },
        setItem: () => {
          throw new Error("blocked");
        },
      },
    });
    expect(loadWatch("u", "l")).toEqual({ duration: 0, spans: [] });
    expect(() => saveWatch("u", "l", { duration: 1, spans: [] })).not.toThrow();
  });
});
