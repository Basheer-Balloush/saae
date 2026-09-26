import { createFileRoute, notFound, redirect } from "@tanstack/react-router";
import { requireAdminBeforeLoad } from "@/lib/admin-route-guard";
import { supabase } from "@/integrations/supabase/client";
import { findAdminForm } from "@/lib/admin-forms-registry";
import { PageHeader, useT } from "@/components/console/ui";

/* The two built-in surveys render here. Any other slug is a custom form:
   forward to its page in /admin/forms. */
export const Route = createFileRoute("/admin/crm/forms/$formSlug")({
  ssr: false,
  beforeLoad: async (ctx) => {
    await requireAdminBeforeLoad();
    if (findAdminForm(ctx.params.formSlug)) return;
    const { data } = await supabase
      .from("dynamic_forms")
      .select("id")
      .eq("slug", ctx.params.formSlug)
      .maybeSingle();
    if (!data?.id) throw notFound();
    throw redirect({ to: "/admin/forms/$formId", params: { formId: data.id } });
  },
  head: () => ({
    meta: [{ title: "Survey — Admin — SAAE" }, { name: "robots", content: "noindex, nofollow" }],
  }),
  component: SurveyPage,
});

function SurveyPage() {
  const { formSlug } = Route.useParams();
  const { t, ar } = useT();
  const entry = findAdminForm(formSlug);
  if (!entry) return null;
  const { Component } = entry;
  return (
    <div>
      <PageHeader
        back={{ to: "/admin/forms", label: t("النماذج", "Forms") }}
        eyebrow={t("إدارة الموقع · استبيان", "Website · Survey")}
        title={ar ? entry.labelAr : entry.labelEn}
      />
      <Component />
    </div>
  );
}
