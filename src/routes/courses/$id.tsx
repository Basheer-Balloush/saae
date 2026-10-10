// Short URL: redirects to /learning-management-system/courses/$id. Kept so typed and shared links work.
import { createFileRoute, redirect } from "@tanstack/react-router";

/* A shortened course link goes to the same course on the learning platform. */
export const Route = createFileRoute("/courses/$id")({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: "/learning-management-system/courses/$id",
      params: { id: params.id },
      statusCode: 301,
    });
  },
});
