import { createFileRoute, notFound } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { requireAdminBeforeLoad } from "@/lib/admin-route-guard";
import { findAdminForm } from "@/lib/admin-forms-registry";
import { supabase } from "@/integrations/supabase/client";
import { DynamicFormSubmissions } from "@/components/admin/crm/DynamicFormSubmissions";
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
  const ar = lang === "ar";
  const entry = findAdminForm(formSlug);
  const [dynId, setDynId] = useState<string | null | "loading">(entry ? null : "loading");

  useEffect(() => {
    if (entry) return;
    let cancel = false;
    supabase
      .from("dynamic_forms")
      .select("id")
      .eq("slug", formSlug)
      .maybeSingle()
      .then(({ data }) => {
        if (cancel) return;
        setDynId(data?.id ?? null);
      });
    return () => { cancel = true; };
  }, [formSlug, entry]);

  if (entry) {
    const { Component } = entry;
    return (
      <section className="space-y-4">
        <h3 className="text-lg font-semibold text-foreground">
          {ar ? entry.labelAr : entry.labelEn}
        </h3>
        <Component />
      </section>
    );
  }

  if (dynId === "loading") {
    return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }
  if (!dynId) throw notFound();
  return <DynamicFormSubmissions formId={dynId} />;
}
