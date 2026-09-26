import { createFileRoute, Outlet } from "@tanstack/react-router";
import { requireAdminBeforeLoad } from "@/lib/admin-route-guard";

/* Form answers moved to /admin/forms; this path keeps the built-in surveys
   and forwards old links. */
export const Route = createFileRoute("/admin/crm/forms")({
  ssr: false,
  beforeLoad: requireAdminBeforeLoad,
  component: () => <Outlet />,
});
