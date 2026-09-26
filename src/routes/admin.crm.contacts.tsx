import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

/* The contact list is the Leads page. Single contacts still open here. */
export const Route = createFileRoute("/admin/crm/contacts")({
  ssr: false,
  beforeLoad: ({ location }) => {
    if (/^\/admin\/crm\/contacts\/?$/.test(location.pathname))
      throw redirect({ to: "/admin/leads" });
  },
  component: Outlet,
});
