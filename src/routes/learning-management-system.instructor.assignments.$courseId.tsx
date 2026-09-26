import { createFileRoute, redirect } from "@tanstack/react-router";

/* Grading lives in the course page now (Grading tab). */
export const Route = createFileRoute(
  "/learning-management-system/instructor/assignments/$courseId",
)({
  ssr: false,
  beforeLoad: ({ params }) => {
    throw redirect({
      to: "/learning-management-system/instructor/courses/$id",
      params: { id: params.courseId },
      search: { tab: "grading" },
    });
  },
});
