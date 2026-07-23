import { createFileRoute } from "@tanstack/react-router";
import { requireAdminBeforeLoad } from "@/lib/admin-route-guard";
import { LmsStudentsView } from "@/components/admin/crm/LmsStudentsView";

export const Route = createFileRoute("/admin/crm/students")({
  ssr: false,
  beforeLoad: requireAdminBeforeLoad,
  head: () => ({
    meta: [
      { title: "LMS Students — CRM" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: LmsStudentsView,
});
