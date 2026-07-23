import { createFileRoute } from "@tanstack/react-router";
import { requireAdminBeforeLoad } from "@/lib/admin-route-guard";
import { CrmContactDetail } from "@/components/admin/crm/CrmContactDetail";

export const Route = createFileRoute("/admin/crm/contacts/$contactId")({
  ssr: false,
  beforeLoad: requireAdminBeforeLoad,
  head: () => ({
    meta: [
      { title: "Contact — CRM" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: ContactDetailPage,
});

function ContactDetailPage() {
  const { contactId } = Route.useParams();
  return <CrmContactDetail contactId={contactId} />;
}
