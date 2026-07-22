import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { requireAdminBeforeLoad } from "@/lib/admin-route-guard";
import { useLang } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { ADMIN_FORMS } from "@/lib/admin-forms-registry";

export const Route = createFileRoute("/admin/crm/forms")({
  ssr: false,
  beforeLoad: requireAdminBeforeLoad,
  head: () => ({
    meta: [
      { title: "Forms — CRM" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: FormsLayout,
});

function FormsLayout() {
  const { lang } = useLang();
  const ar = lang === "ar";
  const pathname = useRouterState({ select: (r) => r.location.pathname });

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-foreground">{ar ? "الاستبيانات" : "Forms"}</h2>
        <p className="text-sm text-muted-foreground">
          {ar ? "استجابات النماذج المتاحة" : "Responses for each available form"}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-1 rounded-full border border-border bg-card p-1 w-fit max-w-full">
        {ADMIN_FORMS.map((f) => {
          const to = `/admin/crm/forms/${f.slug}`;
          const active = pathname === to;
          return (
            <Link
              key={f.slug}
              to="/admin/crm/forms/$formSlug"
              params={{ formSlug: f.slug }}
              className={cn(
                "inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm transition-colors",
                active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {ar ? f.labelAr : f.labelEn}
            </Link>
          );
        })}
      </div>
      <Outlet />
    </div>
  );
}
