import { createFileRoute, redirect } from "@tanstack/react-router";

/* Leads live at /admin/leads now. Old links (individuals, companies, one
   lead) land on the same view, with the lead open. */
export const Route = createFileRoute("/admin/crm/leads")({
  ssr: false,
  beforeLoad: ({ location }) => {
    const m = location.pathname.match(
      /^\/admin\/crm\/leads\/(individuals|companies)(?:\/([^/]+))?/,
    );
    const kind = m?.[1] === "companies" ? "companies" : undefined;
    throw redirect({ to: "/admin/leads", search: { kind, id: m?.[2] } });
  },
});
