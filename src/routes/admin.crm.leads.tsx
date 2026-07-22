import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { requireAdminBeforeLoad } from "@/lib/admin-route-guard";
import { Users, Building2 } from "lucide-react";
import { useLang } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/crm/leads")({
  ssr: false,
  beforeLoad: requireAdminBeforeLoad,
  head: () => ({
    meta: [
      { title: "Leads — CRM" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: LeadsLayout,
});

function LeadsLayout() {
  const { lang } = useLang();
  const ar = lang === "ar";
  const pathname = useRouterState({ select: (r) => r.location.pathname });

  const tabs = [
    { to: "/admin/crm/leads/individuals", label: ar ? "أفراد" : "Individuals", icon: Users },
    { to: "/admin/crm/leads/companies", label: ar ? "شركات" : "Companies", icon: Building2 },
  ] as const;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-foreground">{ar ? "الـ Leads" : "Leads"}</h2>
        <p className="text-sm text-muted-foreground">
          {ar ? "إدارة العملاء المحتملين من الأفراد والشركات" : "Manage individual and company leads"}
        </p>
      </div>
      <div className="inline-flex items-center gap-1 rounded-full border border-border bg-card p-1">
        {tabs.map((t) => {
          const active = pathname === t.to;
          const Icon = t.icon;
          return (
            <Link
              key={t.to}
              to={t.to}
              className={cn(
                "inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm transition-colors",
                active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4" /> {t.label}
            </Link>
          );
        })}
      </div>
      <Outlet />
    </div>
  );
}
