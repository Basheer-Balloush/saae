import { createFileRoute } from "@tanstack/react-router";
import { requireAdminBeforeLoad } from "@/lib/admin-route-guard";
import { PageHeader, useT } from "@/components/console/ui";
import { FormBuilder } from "@/features/website/FormBuilder";

export const Route = createFileRoute("/admin/forms/new")({
  ssr: false,
  beforeLoad: requireAdminBeforeLoad,
  head: () => ({
    meta: [{ title: "New form — Admin — SAAE" }, { name: "robots", content: "noindex, nofollow" }],
  }),
  component: NewFormPage,
});

function NewFormPage() {
  const { t } = useT();
  return (
    <div>
      <PageHeader
        back={{ to: "/admin/forms", label: t("كل النماذج", "All forms") }}
        eyebrow={t("إدارة الموقع · النماذج", "Website · Forms")}
        title={t("نموذج جديد", "New form")}
        description={t(
          "يُحفظ كمسودة. انشره من صفحة النموذج عندما يصبح جاهزاً.",
          "It is saved as a draft. Publish it from the form page when it is ready.",
        )}
      />
      <FormBuilder />
    </div>
  );
}
