import { createFileRoute, redirect } from "@tanstack/react-router";

/* A link's sign-ups open in a panel on the links page. */
export const Route = createFileRoute("/admin/crm/registration-links/$id")({
  ssr: false,
  beforeLoad: ({ params }) => {
    throw redirect({ to: "/admin/crm/registration-links", search: { id: params.id } });
  },
});
