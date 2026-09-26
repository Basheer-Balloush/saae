import { createFileRoute, redirect } from "@tanstack/react-router";

/* Users & roles now live in People → Team & roles. */
export const Route = createFileRoute("/learning-management-system/admin/users")({
  beforeLoad: () => {
    throw redirect({ to: "/learning-management-system/admin/people", search: { tab: "roles" } });
  },
});
