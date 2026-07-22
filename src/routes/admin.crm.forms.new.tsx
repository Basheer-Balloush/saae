import { createFileRoute } from "@tanstack/react-router";
import { requireAdminBeforeLoad } from "@/lib/admin-route-guard";
import { DynamicFormBuilder } from "@/components/admin/crm/DynamicFormBuilder";
import { useLang } from "@/lib/i18n";

export const Route = createFileRoute("/admin/crm/forms/new")({
  ssr: false,
  beforeLoad: requireAdminBeforeLoad,
  head: () => ({
    meta: [
      { title: "New form — CRM" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: NewFormPage,
});

function NewFormPage() {
  const { lang } = useLang();
  const ar = lang === "ar";
  return (
    <section className="space-y-4">
      <h3 className="text-lg font-semibold text-foreground">
        {ar ? "إنشاء نموذج جديد" : "Create new form"}
      </h3>
      <DynamicFormBuilder />
    </section>
  );
}
