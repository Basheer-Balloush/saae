import { createFileRoute, Outlet, useRouterState } from "@tanstack/react-router";
import { ConsoleShell } from "@/components/console/ConsoleShell";

export const Route = createFileRoute("/admin")({
  ssr: false,
  head: () => ({
    meta: [{ title: "Admin — SAAE" }, { name: "robots", content: "noindex, nofollow" }],
  }),
  component: AdminLayout,
});

function AdminLayout() {
  const pathname = useRouterState({ select: (r) => r.location.pathname });

  // /admin/login renders bare (no console frame)
  if (pathname === "/admin/login") {
    return <Outlet />;
  }

  return (
    <ConsoleShell>
      <Outlet />
    </ConsoleShell>
  );
}
