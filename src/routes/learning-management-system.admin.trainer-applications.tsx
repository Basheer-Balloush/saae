import { createFileRoute, redirect } from "@tanstack/react-router";

/* Accreditation applications live in Requests → Instructors. */
export const Route = createFileRoute("/learning-management-system/admin/trainer-applications")({
  beforeLoad: () => {
    throw redirect({
      to: "/learning-management-system/admin/requests",
      search: { tab: "instructors" },
    });
  },
});
