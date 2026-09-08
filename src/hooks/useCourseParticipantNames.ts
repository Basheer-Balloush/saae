import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useCourseParticipantNames(courseId: string, userId: string | undefined, authLoading: boolean) {
  const key = `${userId ?? "anonymous"}:${courseId}`;
  const [result, setResult] = useState<{ key: string; names: Record<string, string | null>; error: boolean } | null>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (authLoading || !userId) return;
    let cancelled = false;
    setResult(null);
    supabase.rpc("lms_get_course_participant_names", { _course_id: courseId })
      .then(({ data, error }) => {
        if (!cancelled) setResult({ key, names: Object.fromEntries((data ?? []).map(row => [row.user_id, row.full_name])), error: !!error });
      }, () => { if (!cancelled) setResult({ key, names: {}, error: true }); });
    return () => { cancelled = true; };
  }, [key, courseId, userId, authLoading, attempt]);
  const current = !authLoading && userId && result?.key === key ? result : null;
  return { names: current?.names ?? {}, loading: !current, error: current?.error ?? false,
    retry: () => { setResult(null); setAttempt(n => n + 1); } };
}
