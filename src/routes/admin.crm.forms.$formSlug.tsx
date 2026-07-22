import { createFileRoute, notFound } from "@tanstack/react-router";
import { requireAdminBeforeLoad } from "@/lib/admin-route-guard";
import { findAdminForm } from "@/lib/admin-forms-registry";
import { useLang } from "@/lib/i18n";

export const Route = createFileRoute("/admin/crm/forms/$formSlug")({
  ssr: false,
  beforeLoad: requireAdminBeforeLoad,
  head: () => ({
    meta: [
      { title: "Form — CRM" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: FormPage,
  notFoundComponent: () => (
    <div className="rounded-xl border border-border bg-card p-8 text-center text-muted-foreground">
      Form not found
    </div>
  ),
  errorComponent: ({ error }) => (
    <div role="alert" className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
      {error.message}
    </div>
  ),
});

function FormPage() {
  const { formSlug } = Route.useParams();
  const { lang } = useLang();
  const entry = findAdminForm(formSlug);
  if (!entry) throw notFound();
  const { Component } = entry;
  const ar = lang === "ar";
  return (
    <section className="space-y-4">
      <h3 className="text-lg font-semibold text-foreground">
        {ar ? entry.labelAr : entry.labelEn}
      </h3>
      <Component />
    </section>
  );
}
