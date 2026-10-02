import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { resolveLmsRole, type LmsRole } from "@/features/lms/lib/roles";
export type { LmsRole } from "@/features/lms/lib/roles";

type LmsAuthState = { session: Session | null; user: User | null; role: LmsRole; loading: boolean };

export function useLmsAuth() {
  const [state, setState] = useState<LmsAuthState>({
    session: null,
    user: null,
    role: null,
    loading: true,
  });
  useEffect(() => {
    let disposed = false;
    let revision = 0;
    // Account whose role is already loaded. Supabase re-announces the same account
    // when a hidden tab comes back and on every token refresh; treating that as a
    // new sign-in flipped `loading` on, and gated layouts unmounted their pages,
    // wiping whatever an admin was typing.
    let resolvedUserId: string | null = null;
    // Account currently shown to pages, whether or not its role has loaded yet.
    let shownUserId: string | null = null;
    // `quiet`: the same account is already on screen and only its role is being
    // fetched again, so pages stay mounted instead of flashing a loading state.
    const resolve = async (session: Session | null, quiet = false) => {
      const current = ++revision;
      if (disposed) return;
      resolvedUserId = null;
      shownUserId = session?.user.id ?? null;
      if (!quiet)
        setState({ session, user: session?.user ?? null, role: null, loading: !!session });
      if (!session) return;
      try {
        const { data, error } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", session.user.id);
        if (!disposed && current === revision) {
          resolvedUserId = error ? null : session.user.id;
          setState((prev) => ({
            session,
            user: quiet ? prev.user : session.user,
            role: error ? prev.role : resolveLmsRole((data ?? []).map((r) => r.role)),
            loading: false,
          }));
        }
      } catch {
        if (!disposed && current === revision)
          setState((prev) => ({
            session,
            user: quiet ? prev.user : session.user,
            role: prev.role,
            loading: false,
          }));
      }
    };
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && shownUserId === session.user.id) {
        // Same account: take the fresh tokens, but keep the `user` object (pages key
        // their data loads on it) unless the account details actually changed.
        setState((prev) => ({
          ...prev,
          session,
          user: event === "USER_UPDATED" ? session.user : prev.user,
        }));
        // An earlier role lookup failed (say, a dropped connection): try again
        // without unmounting anything. Treating this as a new sign-in used to swap
        // the student's quiz for a loading screen and throw their answers away.
        if (resolvedUserId !== session.user.id) {
          const ticket = ++revision;
          setTimeout(() => {
            if (!disposed && ticket === revision) void resolve(session, true);
          }, 0);
        }
        return;
      }
      // Supabase auth callbacks must finish before making further authenticated queries.
      const ticket = ++revision;
      if (!disposed)
        setState({ session, user: session?.user ?? null, role: null, loading: !!session });
      setTimeout(() => {
        if (!disposed && ticket === revision) void resolve(session);
      }, 0);
    });
    const initialRevision = revision;
    supabase.auth.getSession().then(
      ({ data }) => {
        if (!disposed && revision === initialRevision) void resolve(data.session);
      },
      () => {
        if (!disposed && revision === initialRevision)
          setState({ session: null, user: null, role: null, loading: false });
      },
    );
    return () => {
      disposed = true;
      ++revision;
      sub.subscription.unsubscribe();
    };
  }, []);
  // A guest is signed in with no email or password yet (see lib/guest.ts).
  return { ...state, isGuest: !!state.user?.is_anonymous };
}
