import { createFileRoute, Outlet, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { useLang } from "@/lib/i18n";

const SIDEBAR_STORAGE_KEY = "admin-sidebar-open";

export const Route = createFileRoute("/admin")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Admin — SAAE" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminLayout,
});

function AdminLayout() {
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const { dir } = useLang();

  // /admin/login renders bare (no sidebar/header)
  if (pathname === "/admin/login") {
    return <Outlet />;
  }

  return <AdminShell dir={dir}><Outlet /></AdminShell>;
}

function AdminShell({ dir, children }: { dir: "rtl" | "ltr"; children: React.ReactNode }) {
  const [open, setOpen] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    const stored = window.localStorage.getItem(SIDEBAR_STORAGE_KEY);
    return stored === null ? true : stored === "1";
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(SIDEBAR_STORAGE_KEY, open ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, [open]);

  return (
    <div dir={dir} className="min-h-screen bg-background">
      <SidebarProvider
        open={open}
        onOpenChange={setOpen}
        style={
          {
            "--sidebar-width": "16rem",
            "--sidebar-width-icon": "4.5rem",
          } as React.CSSProperties
        }
      >
        <AdminSidebar />
        <SidebarInset className="min-w-0">
          <AdminHeader />
          <main className="min-w-0 flex-1 overflow-x-hidden p-4 sm:p-6">
            {children}
          </main>
        </SidebarInset>
      </SidebarProvider>
    </div>
  );
}
