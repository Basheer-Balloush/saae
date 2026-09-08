import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { resolveLmsRole, type LmsRole } from "@/lib/lms-roles";
export type { LmsRole } from "@/lib/lms-roles";

export function useLmsAuth() {
  const [state, setState] = useState<{ session: Session | null; role: LmsRole; loading: boolean }>({ session: null, role: null, loading: true });
  useEffect(() => {
    let disposed = false;
    let revision = 0;
    const resolve = async (session: Session | null) => {
      const current = ++revision;
      if (disposed) return;
      setState({ session, role: null, loading: !!session });
      if (!session) return;
      try {
        const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", session.user.id);
        if (!disposed && current === revision) setState({ session, role: error ? null : resolveLmsRole((data ?? []).map(r => r.role)), loading: false });
      } catch {
        if (!disposed && current === revision) setState({ session, role: null, loading: false });
      }
    };
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      // Supabase auth callbacks must finish before making further authenticated queries.
      const ticket = ++revision;
      if (!disposed) setState({ session, role: null, loading: !!session });
      setTimeout(() => { if (!disposed && ticket === revision) void resolve(session); }, 0);
    });
    const initialRevision = revision;
    supabase.auth.getSession().then(({ data }) => {
      if (!disposed && revision === initialRevision) void resolve(data.session);
    }, () => { if (!disposed && revision === initialRevision) setState({ session: null, role: null, loading: false }); });
    return () => { disposed = true; ++revision; sub.subscription.unsubscribe(); };
  }, []);
  return { ...state, user: state.session?.user ?? null };
}
