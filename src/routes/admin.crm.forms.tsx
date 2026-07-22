import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Plus, Loader2 } from "lucide-react";
import { requireAdminBeforeLoad } from "@/lib/admin-route-guard";
import { useLang } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ADMIN_FORMS } from "@/lib/admin-forms-registry";
import { listDynamicForms } from "@/lib/dynamic-forms.functions";

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

type DynEntry = { id: string; slug: string; name_ar: string; name_en: string; status: string };

function FormsLayout() {
  const { lang } = useLang();
  const ar = lang === "ar";
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const fetchForms = useServerFn(listDynamicForms);
  const [dyn, setDyn] = useState<DynEntry[] | null>(null);

  useEffect(() => {
    fetchForms().then((rows) => setDyn(rows as DynEntry[])).catch(() => setDyn([]));
  }, [fetchForms]);

  const isCreate = pathname === "/admin/crm/forms/new";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-foreground">{ar ? "الاستبيانات" : "Forms"}</h2>
          <p className="text-sm text-muted-foreground">
            {ar ? "استجابات النماذج المتاحة" : "Responses for each available form"}
          </p>
        </div>
        <Button asChild size="sm">
          <Link to="/admin/crm/forms/new">
            <Plus className="h-4 w-4" /> {ar ? "إنشاء نموذج" : "Create form"}
          </Link>
        </Button>
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
        {dyn === null && !isCreate && <Loader2 className="mx-2 h-4 w-4 animate-spin text-muted-foreground" />}
        {dyn?.map((f) => {
          const to = `/admin/crm/forms/${f.slug}`;
          const active = pathname === to || pathname.startsWith(to + "/");
          return (
            <Link
              key={f.id}
              to="/admin/crm/forms/$formSlug"
              params={{ formSlug: f.slug }}
              className={cn(
                "inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm transition-colors",
                active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {ar ? f.name_ar : f.name_en}
              {f.status === "draft" && (
                <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] uppercase text-muted-foreground">
                  {ar ? "مسودة" : "draft"}
                </span>
              )}
            </Link>
          );
        })}
      </div>
      <Outlet />
    </div>
  );
}
