import { createFileRoute } from "@tanstack/react-router";

/* Old address: /admin/crm/leads redirects every path under it to /admin/leads. */
export const Route = createFileRoute("/admin/crm/leads/individuals")({
  ssr: false,
  component: () => null,
});
