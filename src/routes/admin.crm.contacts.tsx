import { createFileRoute } from "@tanstack/react-router";
import { requireAdminBeforeLoad } from "@/lib/admin-route-guard";
import { CrmContactsList } from "@/components/admin/crm/CrmContactsList";

export const Route = createFileRoute("/admin/crm/contacts")({
  ssr: false,
  beforeLoad: requireAdminBeforeLoad,
  head: () => ({
    meta: [
      { title: "Contacts — CRM" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: CrmContactsList,
});
