/* How much of a lesson video a student has really watched.

   The player reports its position several times a second. Two reports in a
   row count as watched only when they look like normal playback: forward,
   close together, and no faster than MAX_RATE times the time that passed.
   A seek, a keyboard skip or a pause-then-drag breaks the chain, so jumping
   to the end never counts. What was watched is kept as merged [start, end]
   spans, so rewatching a part never counts twice. */

export type Span = [number, number];

export type WatchProgress = {
  /** Video length in seconds; 0 until the player reports it. */
  duration: number;
  spans: Span[];
};

/** Fastest playback speed that still counts as watching (the player's 2x). */
export const MAX_RATE = 2;
/** Longest gap between two reports that still counts as continuous. */
const MAX_STEP = 8;
/** Allowance for report timing jitter, in seconds. */
const SLACK = 0.75;

export const emptyProgress = (): WatchProgress => ({ duration: 0, spans: [] });

/** Adds [from, to] to sorted, merged spans. */
export function addSpan(spans: Span[], from: number, to: number): Span[] {
  if (!(to > from)) return spans;
  const out: Span[] = [];
  let start = from;
  let end = to;
  let placed = false;
  for (const [a, b] of spans) {
    if (b < start) out.push([a, b]);
    else if (a > end) {
      if (!placed) {
        out.push([start, end]);
        placed = true;
      }
      out.push([a, b]);
    } else {
      start = Math.min(start, a);
      end = Math.max(end, b);
    }
  }
  if (!placed) out.push([start, end]);
  return out;
}

export const watchedSeconds = (spans: Span[]) => spans.reduce((sum, [a, b]) => sum + (b - a), 0);

/** The whole video, less a little for the first and last moments a player
    may not report: 1% of it, at least 2 and at most 15 seconds. */
export function requiredSeconds(duration: number): number {
  if (!(duration > 0)) return Infinity;
  return Math.max(0, duration - Math.min(15, Math.max(2, duration * 0.01)));
}

export const isFullyWatched = (p: WatchProgress) =>
  p.duration > 0 && watchedSeconds(p.spans) >= requiredSeconds(p.duration);

/** 0 to 1, for progress bars. */
export const watchedFraction = (p: WatchProgress) =>
  p.duration > 0 ? Math.min(1, watchedSeconds(p.spans) / requiredSeconds(p.duration)) : 0;

type Anchor = { pos: number; at: number };

/** Feeds player reports into a WatchProgress. `at` is a millisecond clock. */
export class WatchTracker {
  progress: WatchProgress;
  private anchor: Anchor | null = null;

  constructor(initial: WatchProgress = emptyProgress()) {
    this.progress = initial;
  }

  /** A position report. Returns true when the watched total changed. */
  report(seconds: number, duration: number | undefined, at: number): boolean {
    if (!Number.isFinite(seconds) || seconds < 0) return false;
    let changed = false;
    if (
      duration &&
      Number.isFinite(duration) &&
      duration > 0 &&
      duration !== this.progress.duration
    ) {
      this.progress = { ...this.progress, duration };
      changed = true;
    }
    const cap = this.progress.duration || Infinity;
    const pos = Math.min(seconds, cap);
    const prev = this.anchor;
    this.anchor = { pos, at };
    if (!prev) return changed;
    const step = pos - prev.pos;
    const elapsed = Math.max(0, (at - prev.at) / 1000);
    if (step > 0 && step <= MAX_STEP && step <= elapsed * MAX_RATE + SLACK) {
      this.progress = { ...this.progress, spans: addSpan(this.progress.spans, prev.pos, pos) };
      return true;
    }
    return changed;
  }

  /** Pause, seek or buffering: the next report starts a new chain. */
  interrupt() {
    this.anchor = null;
  }
}

/* Saved per student and lesson in this browser, so a reload or a second
   sitting keeps what was already watched. */
const storageKey = (userId: string, lessonId: string) =>
  `saae:lesson-watch:v1:${userId}:${lessonId}`;

export function loadWatch(userId: string, lessonId: string): WatchProgress {
  try {
    const raw = window.localStorage.getItem(storageKey(userId, lessonId));
    if (!raw) return emptyProgress();
    const data = JSON.parse(raw) as { d?: unknown; s?: unknown };
    const duration = typeof data.d === "number" && data.d > 0 ? data.d : 0;
    let spans: Span[] = [];
    if (Array.isArray(data.s)) {
      for (const pair of data.s) {
        if (Array.isArray(pair) && typeof pair[0] === "number" && typeof pair[1] === "number") {
          spans = addSpan(
            spans,
            Math.max(0, pair[0]),
            duration ? Math.min(pair[1], duration) : pair[1],
          );
        }
      }
    }
    return { duration, spans };
  } catch {
    return emptyProgress();
  }
}

export function saveWatch(userId: string, lessonId: string, p: WatchProgress) {
  try {
    const s = p.spans.map(([a, b]) => [Math.round(a * 10) / 10, Math.round(b * 10) / 10]);
    window.localStorage.setItem(storageKey(userId, lessonId), JSON.stringify({ d: p.duration, s }));
  } catch {
    /* Private mode or full storage: progress still counts for this visit. */
  }
}
