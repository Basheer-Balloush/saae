import { useCallback, useEffect, useRef, useState } from "react";
import {
  WatchTracker,
  emptyProgress,
  isFullyWatched,
  loadWatch,
  saveWatch,
  watchedFraction,
  type WatchProgress,
} from "@/lib/lesson-watch";

const SAVE_EVERY_MS = 5000;

/** Tracks how much of one lesson's video this student has watched, kept in
    this browser between visits. Re-renders only when the whole percentage,
    the length or the unlocked state changes, not on every player tick. */
export function useLessonWatch(userId: string | undefined, lessonId: string | undefined) {
  const trackerRef = useRef<WatchTracker | null>(null);
  const [progress, setProgress] = useState<WatchProgress>(emptyProgress);
  const shown = useRef({ pct: -1, duration: 0, done: false });
  const savedAt = useRef(0);

  const publish = useCallback((p: WatchProgress, force = false) => {
    const next = {
      pct: Math.floor(watchedFraction(p) * 100),
      duration: p.duration,
      done: isFullyWatched(p),
    };
    const prev = shown.current;
    if (
      force ||
      next.pct !== prev.pct ||
      next.duration !== prev.duration ||
      next.done !== prev.done
    ) {
      shown.current = next;
      setProgress(p);
    }
  }, []);

  useEffect(() => {
    if (!userId || !lessonId) {
      trackerRef.current = null;
      publish(emptyProgress(), true);
      return;
    }
    const tracker = new WatchTracker(loadWatch(userId, lessonId));
    trackerRef.current = tracker;
    publish(tracker.progress, true);
    const flush = () => saveWatch(userId, lessonId, tracker.progress);
    window.addEventListener("pagehide", flush);
    return () => {
      flush();
      window.removeEventListener("pagehide", flush);
      if (trackerRef.current === tracker) trackerRef.current = null;
    };
  }, [userId, lessonId, publish]);

  const report = useCallback(
    (seconds: number, duration: number | undefined) => {
      const tracker = trackerRef.current;
      if (!tracker || !tracker.report(seconds, duration, performance.now())) return;
      publish(tracker.progress);
      const now = Date.now();
      if (userId && lessonId && now - savedAt.current > SAVE_EVERY_MS) {
        savedAt.current = now;
        saveWatch(userId, lessonId, tracker.progress);
      }
    },
    [userId, lessonId, publish],
  );

  const interrupt = useCallback(() => trackerRef.current?.interrupt(), []);

  /** Reads the tracker directly, for decisions made inside player events. */
  const isWatchedNow = useCallback(() => {
    const tracker = trackerRef.current;
    return !!tracker && isFullyWatched(tracker.progress);
  }, []);

  return {
    progress,
    unlocked: isFullyWatched(progress),
    fraction: watchedFraction(progress),
    report,
    interrupt,
    isWatchedNow,
  };
}
