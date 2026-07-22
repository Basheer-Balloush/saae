import { createFileRoute, redirect } from "@tanstack/react-router";
import { ADMIN_FORMS } from "@/lib/admin-forms-registry";

export const Route = createFileRoute("/admin/crm/forms/")({
  ssr: false,
  beforeLoad: () => {
    const first = ADMIN_FORMS[0];
    if (!first) return;
    throw redirect({
      to: "/admin/crm/forms/$formSlug",
      params: { formSlug: first.slug },
    });
  },
  component: () => null,
});
