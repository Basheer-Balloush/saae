// Legacy URL: redirects to /admin/leads. Kept so old links keep working.
import { createFileRoute } from "@tanstack/react-router";

/* Old address: /admin/crm/leads redirects every path under it to /admin/leads. */
export const Route = createFileRoute("/admin/crm/leads/companies")({
  ssr: false,
  component: () => null,
});
