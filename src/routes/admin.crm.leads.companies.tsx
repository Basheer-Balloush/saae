import { createFileRoute } from "@tanstack/react-router";
import { requireAdminBeforeLoad } from "@/lib/admin-route-guard";
import { LeadsView } from "@/components/admin/crm/LeadsView";

export const Route = createFileRoute("/admin/crm/leads/companies")({
  ssr: false,
  beforeLoad: requireAdminBeforeLoad,
  head: () => ({
    meta: [
      { title: "Company Leads — CRM" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: () => <LeadsView variant="companies" />,
});
