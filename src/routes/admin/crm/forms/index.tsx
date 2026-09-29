// Legacy URL: redirects to /admin/forms. Kept so old links keep working.
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/crm/forms/")({
  ssr: false,
  beforeLoad: () => {
    throw redirect({ to: "/admin/forms" });
  },
});
