import { createFileRoute, notFound } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2 } from "lucide-react";
import { requireAdminBeforeLoad } from "@/lib/admin-route-guard";
import { DynamicFormBuilder } from "@/components/admin/crm/DynamicFormBuilder";
import { useLang } from "@/lib/i18n";
import { getDynamicFormById } from "@/lib/dynamic-forms.functions";
import type { DynamicForm } from "@/lib/dynamic-forms";

export const Route = createFileRoute("/admin/forms/$formId/edit")({
  ssr: false,
  beforeLoad: requireAdminBeforeLoad,
  head: () => ({
    meta: [
      { title: "Edit form — Admin" },
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
  const { formId } = Route.useParams();
  const { lang } = useLang();
  const ar = lang === "ar";
  const fetchForm = useServerFn(getDynamicFormById);
  const [form, setForm] = useState<DynamicForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const data = await fetchForm({ data: { id: formId } });
        if (cancel) return;
        setForm(data as DynamicForm);
      } catch {
        if (!cancel) setMissing(true);
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => {
      cancel = true;
    };
  }, [formId, fetchForm]);

  if (loading)
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
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
