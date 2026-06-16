import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type LmsRole = "lms_student" | "lms_instructor" | "lms_admin" | null;

// In-memory cache of resolved roles per user id, scoped to the tab.
// Avoids hammering the DB with the same SELECT on every TOKEN_REFRESHED
// (which fires hourly + on tab focus) and on every component remount.
const roleCache = new Map<string, LmsRole>();

function resolveRole(roles: string[]): LmsRole {
  if (roles.includes("lms_admin") || roles.includes("admin")) return "lms_admin";
  if (roles.includes("lms_instructor")) return "lms_instructor";
  if (roles.includes("lms_student")) return "lms_student";
  return null;
}

export function useLmsAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<LmsRole>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRole = async (uid: string) => {
      if (roleCache.has(uid)) {
        setRole(roleCache.get(uid) ?? null);
        return;
      }
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", uid);
      const resolved = resolveRole((data ?? []).map((r) => r.role as string));
      roleCache.set(uid, resolved);
      setRole(resolved);
    };

    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      // Ignore noisy events (TOKEN_REFRESHED, INITIAL_SESSION) — only react
      // to actual identity transitions.
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      setSession(s);
      setUser(s?.user ?? null);
      if (event === "SIGNED_OUT") {
        roleCache.clear();
        setRole(null);
      } else if (s?.user) {
        setTimeout(() => fetchRole(s.user.id), 0);
      }
    });

    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        fetchRole(s.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  return { session, user, role, loading };
}
