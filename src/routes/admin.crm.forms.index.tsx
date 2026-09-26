import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/crm/forms/")({
  ssr: false,
  beforeLoad: () => {
    throw redirect({ to: "/admin/forms" });
  },
});
