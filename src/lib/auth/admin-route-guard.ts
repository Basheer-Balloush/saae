import { redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

/**
 * Client-side router-level guard for admin pages.
 * Runs in `beforeLoad` BEFORE the route component renders, so the admin shell
 * never paints for unauthenticated or non-admin visitors. Pair with `ssr: false`
 * on the route so this can read the Supabase session from localStorage.
 */
export async function requireAdminBeforeLoad() {
  const { data: userRes, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userRes.user) {
    throw redirect({ to: "/admin/login" });
  }
  const userId = userRes.user.id;
  const [{ data: isAdmin }, { data: isLmsAdmin }] = await Promise.all([
    supabase.rpc("has_role", { _user_id: userId, _role: "admin" }),
    supabase.rpc("has_role", { _user_id: userId, _role: "lms_admin" }),
  ]);
  if (!isAdmin && !isLmsAdmin) {
    throw redirect({ to: "/" });
  }
  return { userId };
}
