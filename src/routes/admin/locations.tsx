import { createFileRoute, redirect } from "@tanstack/react-router";
import { requireAdminBeforeLoad } from "@/lib/auth/admin-route-guard";
import { supabase } from "@/integrations/supabase/client";
import { LocationStatsAdmin } from "@/features/user-location/LocationStatsAdmin";

export const Route = createFileRoute("/admin/locations")({
  ssr: false,
  beforeLoad: async () => {
    const { userId } = await requireAdminBeforeLoad();
    // Where people live is restricted to the full "admin" role.
    const { data } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (!data) throw redirect({ to: "/admin" });
  },
  head: () => ({
    meta: [
      { title: "User locations — Admin — SAAE" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: LocationStatsAdmin,
});
