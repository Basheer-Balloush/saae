import { createFileRoute, Outlet } from "@tanstack/react-router";
import { ConsoleShell } from "@/components/console/ConsoleShell";
import { useShownPathname } from "@/hooks/useShownPathname";

export const Route = createFileRoute("/admin")({
  ssr: false,
  head: () => ({
    meta: [{ title: "Admin — SAAE" }, { name: "robots", content: "noindex, nofollow" }],
  }),
  component: AdminLayout,
});

function AdminLayout() {
  const pathname = useShownPathname();

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
