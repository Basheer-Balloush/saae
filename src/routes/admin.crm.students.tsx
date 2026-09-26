import { createFileRoute, redirect } from "@tanstack/react-router";

/* Students are managed in Learning → People. */
export const Route = createFileRoute("/admin/crm/students")({
  ssr: false,
  beforeLoad: () => {
    throw redirect({ to: "/learning-management-system/admin/people", search: { tab: "students" } });
  },
});
