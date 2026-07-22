import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/event-survey")({
  ssr: false,
  beforeLoad: () => {
    throw redirect({
      to: "/admin/crm/forms/$formSlug",
      params: { formSlug: "event-survey" },
    });
  },
});
