import { createFileRoute, redirect } from "@tanstack/react-router";

/* Enrollment decisions live in Requests → Enrollments. Old links (emails,
   bookmarks) with ?course= keep working. */
export const Route = createFileRoute("/learning-management-system/admin/enrollment-requests")({
  validateSearch: (s: Record<string, unknown>): { course?: string } => ({
    course: typeof s.course === "string" ? s.course : undefined,
  }),
  beforeLoad: ({ search }) => {
    throw redirect({
      to: "/learning-management-system/admin/requests",
      search: { tab: "enrollments", course: search.course },
    });
  },
});
