import { createFileRoute, redirect } from "@tanstack/react-router";

/* The platform numbers moved onto the LMS Overview. */
export const Route = createFileRoute("/learning-management-system/admin/analytics")({
  beforeLoad: () => {
    throw redirect({ to: "/learning-management-system/admin" });
  },
});
