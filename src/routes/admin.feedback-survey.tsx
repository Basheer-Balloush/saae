// Legacy URL: redirects to /admin. Kept so old links keep working.
import { createFileRoute, redirect } from "@tanstack/react-router";
import { requireAdminBeforeLoad } from "@/lib/admin-route-guard";
import { supabase } from "@/integrations/supabase/client";
import { FeedbackSurveyAdmin } from "@/features/feedback-survey/FeedbackSurveyAdmin";

export const Route = createFileRoute("/admin/feedback-survey")({
  ssr: false,
  beforeLoad: async () => {
    const { userId } = await requireAdminBeforeLoad();
    // Survey data is restricted to the full "admin" role.
    const { data } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (!data) throw redirect({ to: "/admin" });
  },
  head: () => ({
    meta: [
      { title: "استبيان التجربة الرقمية — Admin — SAAE" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: FeedbackSurveyAdmin,
});
