import { createFileRoute, notFound } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { requireAdminBeforeLoad } from "@/lib/admin-route-guard";
import { supabase } from "@/integrations/supabase/client";
import { DynamicFormBuilder } from "@/components/admin/crm/DynamicFormBuilder";
import { useLang } from "@/lib/i18n";
import type { DynamicForm, FormField } from "@/lib/dynamic-forms";

export const Route = createFileRoute("/admin/crm/forms/$formSlug/edit")({
  ssr: false,
  beforeLoad: requireAdminBeforeLoad,
  head: () => ({
    meta: [
      { title: "Edit form — CRM" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: EditFormPage,
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

function EditFormPage() {
  const { formSlug } = Route.useParams();
  const { lang } = useLang();
  const ar = lang === "ar";
  const [form, setForm] = useState<DynamicForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    let cancel = false;
    (async () => {
      const { data, error } = await supabase
        .from("dynamic_forms")
        .select("*")
        .eq("slug", formSlug)
        .maybeSingle();
      if (cancel) return;
      if (error || !data) {
        setMissing(true);
      } else {
        setForm({
          id: data.id, slug: data.slug,
          name_ar: data.name_ar, name_en: data.name_en,
          description_ar: data.description_ar, description_en: data.description_en,
          submit_label_ar: data.submit_label_ar, submit_label_en: data.submit_label_en,
          status: data.status,
          fields: Array.isArray(data.fields) ? (data.fields as FormField[]) : [],
          created_at: data.created_at, updated_at: data.updated_at,
        });
      }
      setLoading(false);
    })();
    return () => { cancel = true; };
  }, [formSlug]);

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  if (missing) throw notFound();
  if (!form) return null;

  return (
    <section className="space-y-4">
      <h3 className="text-lg font-semibold text-foreground">
        {ar ? "تعديل النموذج" : "Edit form"}: {ar ? form.name_ar : form.name_en}
      </h3>
      <DynamicFormBuilder initial={form} />
    </section>
  );
}
