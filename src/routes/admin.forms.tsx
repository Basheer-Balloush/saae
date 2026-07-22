import { createFileRoute, Outlet } from "@tanstack/react-router";
import { requireAdminBeforeLoad } from "@/lib/admin-route-guard";

export const Route = createFileRoute("/admin/forms")({
  ssr: false,
  beforeLoad: requireAdminBeforeLoad,
  head: () => ({
    meta: [
      { title: "Forms — Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: () => <Outlet />,
});
