import { createFileRoute, redirect } from "@tanstack/react-router";

/* A new internship starts from a short dialog on the list. */
export const Route = createFileRoute("/learning-management-system/admin/internships/new")({
  ssr: false,
  beforeLoad: () => {
    throw redirect({ to: "/learning-management-system/admin/internships", search: { new: 1 } });
  },
});
