import { createFileRoute, Outlet } from "@tanstack/react-router";
import { requireAdminBeforeLoad } from "@/lib/admin-route-guard";

export const Route = createFileRoute("/admin/crm")({
  ssr: false,
  beforeLoad: requireAdminBeforeLoad,
  head: () => ({
    meta: [
      { title: "CRM — Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: () => <Outlet />,
});
