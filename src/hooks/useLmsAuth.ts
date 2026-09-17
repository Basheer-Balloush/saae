import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { resolveLmsRole, type LmsRole } from "@/lib/lms-roles";
export type { LmsRole } from "@/lib/lms-roles";

type LmsAuthState = { session: Session | null; user: User | null; role: LmsRole; loading: boolean };

export function useLmsAuth() {
  const [state, setState] = useState<LmsAuthState>({ session: null, user: null, role: null, loading: true });
  useEffect(() => {
    let disposed = false;
    let revision = 0;
    // Account whose role is already loaded. Supabase re-announces the same account
    // when a hidden tab comes back and on every token refresh; treating that as a
    // new sign-in flipped `loading` on, and gated layouts unmounted their pages,
    // wiping whatever an admin was typing.
    let resolvedUserId: string | null = null;
    const resolve = async (session: Session | null) => {
      const current = ++revision;
      if (disposed) return;
      resolvedUserId = null;
      setState({ session, user: session?.user ?? null, role: null, loading: !!session });
      if (!session) return;
      try {
        const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", session.user.id);
        if (!disposed && current === revision) {
          resolvedUserId = error ? null : session.user.id;
          setState({ session, user: session.user, role: error ? null : resolveLmsRole((data ?? []).map(r => r.role)), loading: false });
        }
      } catch {
        if (!disposed && current === revision) setState({ session, user: session.user, role: null, loading: false });
      }
    };
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && resolvedUserId === session.user.id) {
        // Same account: take the fresh tokens, but keep the `user` object (pages key
        // their data loads on it) unless the account details actually changed.
        setState((prev) => ({ ...prev, session, user: event === "USER_UPDATED" ? session.user : prev.user }));
        return;
      }
      // Supabase auth callbacks must finish before making further authenticated queries.
      const ticket = ++revision;
      if (!disposed) setState({ session, user: session?.user ?? null, role: null, loading: !!session });
      setTimeout(() => { if (!disposed && ticket === revision) void resolve(session); }, 0);
    });
    const initialRevision = revision;
    supabase.auth.getSession().then(({ data }) => {
      if (!disposed && revision === initialRevision) void resolve(data.session);
    }, () => { if (!disposed && revision === initialRevision) setState({ session: null, user: null, role: null, loading: false }); });
    return () => { disposed = true; ++revision; sub.subscription.unsubscribe(); };
  }, []);
  return state;
}
