import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/initiative-survey")({
  ssr: false,
  beforeLoad: () => {
    throw redirect({
      to: "/admin/crm/forms/$formSlug",
      params: { formSlug: "initiative-survey" },
    });
  },
});
