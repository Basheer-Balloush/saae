import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type Status = "loading" | "yes" | "no" | "error";
export function useCourseTeachingStatus(courseId: string, userId: string | undefined, authLoading: boolean) {
  const key = `${userId ?? "anonymous"}:${courseId}`;
  const [result, setResult] = useState<{ key: string; status: Status } | null>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (authLoading || !userId) return;
    let cancelled = false;
    setResult(null);
    supabase.rpc("is_course_instructor", { _user_id: userId, _course_id: courseId })
      .then(({ data, error }) => {
        if (!cancelled) setResult({ key, status: error || data == null ? "error" : data ? "yes" : "no" });
      }, () => { if (!cancelled) setResult({ key, status: "error" }); });
    return () => { cancelled = true; };
  }, [key, courseId, userId, authLoading, attempt]);
  const status: Status = authLoading ? "loading" : !userId ? "no" : result?.key === key ? result.status : "loading";
  return { status, retry: () => { setResult(null); setAttempt(n => n + 1); } };
}
