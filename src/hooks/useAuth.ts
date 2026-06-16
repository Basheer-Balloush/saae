import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

// Tab-scoped cache of the admin flag per user id. Prevents re-hitting
// user_roles on every TOKEN_REFRESHED (hourly + on tab focus) and on
// every mount of a component that uses this hook.
const adminCache = new Map<string, boolean>();

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAdmin = async (uid: string) => {
      if (adminCache.has(uid)) {
        setIsAdmin(adminCache.get(uid)!);
        return;
      }
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", uid)
        .eq("role", "admin")
        .maybeSingle();
      const value = !!data;
      adminCache.set(uid, value);
      setIsAdmin(value);
    };

    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      // Skip noisy events (TOKEN_REFRESHED, INITIAL_SESSION).
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      setSession(s);
      setUser(s?.user ?? null);
      if (event === "SIGNED_OUT") {
        adminCache.clear();
        setIsAdmin(false);
      } else if (s?.user) {
        setTimeout(() => checkAdmin(s.user.id), 0);
      }
    });

    supabase.auth.getSession().then(async ({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        await checkAdmin(s.user.id);
      }
      setLoading(false);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  return { session, user, isAdmin, loading };
}
