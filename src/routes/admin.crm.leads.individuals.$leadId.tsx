import { createFileRoute } from "@tanstack/react-router";
import { requireAdminBeforeLoad } from "@/lib/admin-route-guard";
import { LeadDetail } from "@/components/admin/crm/LeadDetail";

export const Route = createFileRoute("/admin/crm/leads/individuals/$leadId")({
  ssr: false,
  beforeLoad: requireAdminBeforeLoad,
  head: () => ({
    meta: [
      { title: "Individual Lead — CRM" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: LeadPage,
});

function LeadPage() {
  const { leadId } = Route.useParams();
  return <LeadDetail variant="individual" leadId={leadId} />;
}
