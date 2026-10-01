import { useCallback, useEffect, useRef, useState } from "react";
import {
  WatchTracker,
  emptyProgress,
  hasWatchedEnough,
  loadWatch,
  saveWatch,
  watchedShare,
  type WatchProgress,
} from "@/features/lms/lib/lesson-watch";

const SAVE_EVERY_MS = 5000;
const EMPTY = emptyProgress();

type Shown = { lessonId: string | undefined; progress: WatchProgress };

/** Tracks how much of one lesson's video this student has watched, kept in
    this browser between visits. Re-renders only when the whole percentage,
    the length or the completed state changes, not on every player tick. */
export function useLessonWatch(userId: string | undefined, lessonId: string | undefined) {
  const trackerRef = useRef<WatchTracker | null>(null);
  const [shown, setShown] = useState<Shown>({ lessonId: undefined, progress: EMPTY });
  const last = useRef({
    lessonId: undefined as string | undefined,
    pct: -1,
    duration: 0,
    enough: false,
  });
  const savedAt = useRef(0);

  const publish = useCallback((forLesson: string | undefined, p: WatchProgress, force = false) => {
    const next = {
      lessonId: forLesson,
      pct: Math.floor(watchedShare(p) * 100),
      duration: p.duration,
      enough: hasWatchedEnough(p),
    };
    const prev = last.current;
    if (
      force ||
      next.lessonId !== prev.lessonId ||
      next.pct !== prev.pct ||
      next.duration !== prev.duration ||
      next.enough !== prev.enough
    ) {
      last.current = next;
      setShown({ lessonId: forLesson, progress: p });
    }
  }, []);

  useEffect(() => {
    if (!userId || !lessonId) {
      trackerRef.current = null;
      publish(lessonId, EMPTY, true);
      return;
    }
    const tracker = new WatchTracker(loadWatch(userId, lessonId));
    trackerRef.current = tracker;
    publish(lessonId, tracker.progress, true);
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
      publish(lessonId, tracker.progress);
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
    return !!tracker && hasWatchedEnough(tracker.progress);
  }, []);

  // Until the effect above has loaded this lesson, report nothing watched,
  // so the previous lesson's progress never shows against the new one.
  const progress = shown.lessonId === lessonId ? shown.progress : EMPTY;

  return {
    progress,
    /** Enough of the video has been watched to complete the lesson. */
    enough: hasWatchedEnough(progress),
    /** Share of the whole video watched, 0 to 1. */
    share: watchedShare(progress),
    report,
    interrupt,
    isWatchedNow,
  };
}
