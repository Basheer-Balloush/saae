import { createFileRoute } from "@tanstack/react-router";
import { requireAdminBeforeLoad } from "@/lib/admin-route-guard";
import { LeadDetail } from "@/components/admin/crm/LeadDetail";

export const Route = createFileRoute("/admin/crm/leads/companies/$leadId")({
  ssr: false,
  beforeLoad: requireAdminBeforeLoad,
  head: () => ({
    meta: [
      { title: "Company Lead — CRM" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: LeadPage,
});

function LeadPage() {
  const { leadId } = Route.useParams();
  return <LeadDetail variant="company" leadId={leadId} />;
}
