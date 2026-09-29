// Legacy URL: redirects to /admin/leads. Kept so old links keep working.
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/crm/")({
  ssr: false,
  beforeLoad: () => {
    throw redirect({ to: "/admin/leads" });
  },
});
