import { afterEach, describe, expect, it, vi } from "vitest";
import {
  WatchTracker,
  addSpan,
  isFullyWatched,
  loadWatch,
  requiredSeconds,
  saveWatch,
  watchedFraction,
  watchedSeconds,
} from "@/lib/lesson-watch";

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

  it("asks for the whole video less a small allowance", () => {
    expect(requiredSeconds(60)).toBe(58);
    expect(requiredSeconds(35 * 60)).toBe(35 * 60 - 15);
    expect(requiredSeconds(0)).toBe(Infinity);
  });
});

describe("watch tracker", () => {
  it("unlocks after the video is played through", () => {
    const t = new WatchTracker();
    const clock = { now: 0 };
    play(t, clock, 0, 600);
    expect(isFullyWatched(t.progress)).toBe(true);
    expect(watchedFraction(t.progress)).toBe(1);
  });

  it("does not count dragging straight to the end", () => {
    const t = new WatchTracker();
    const clock = { now: 0 };
    play(t, clock, 0, 20);
    t.report(599, 600, clock.now + 300);
    t.report(600, 600, clock.now + 550);
    expect(watchedSeconds(t.progress.spans)).toBeCloseTo(21, 5);
    expect(isFullyWatched(t.progress)).toBe(false);
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

  it("counts playback at 2x speed", () => {
    const t = new WatchTracker();
    const clock = { now: 0 };
    play(t, clock, 0, 600, 2);
    expect(isFullyWatched(t.progress)).toBe(true);
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
