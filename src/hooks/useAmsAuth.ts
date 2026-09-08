import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLmsAuth } from "@/hooks/useLmsAuth";

export function useAmsAuth() {
  const { user, session, role, loading: authLoading } = useLmsAuth();
  const key = `${user?.id ?? ""}:${role ?? ""}`;
  const [result, setResult] = useState<{ key: string; allowed: boolean } | null>(null);
  useEffect(() => {
    if (authLoading || !user || role !== "lms_instructor") return;
    let cancelled = false;
    supabase.rpc("has_ams_portal_access").then(({ data, error }) => {
      if (!cancelled) setResult({ key, allowed: !error && !!data });
    }, () => { if (!cancelled) setResult({ key, allowed: false }); });
    return () => { cancelled = true; };
  }, [key, user?.id, role, authLoading]);
  const pending = role === "lms_instructor" && result?.key !== key;
  return { user, session, loading: authLoading || pending,
    hasAccess: !authLoading && (role === "admin" || (role === "lms_instructor" && result?.key === key && result.allowed)) };
}
