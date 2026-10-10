// Short URL: redirects to /learning-management-system/catalog. Kept so typed and shared links work.
import { createFileRoute, redirect } from "@tanstack/react-router";

/* The courses folder has no page of its own (the chat assistant has linked to
   it); the list of courses is the catalog. */
export const Route = createFileRoute("/learning-management-system/courses/")({
  beforeLoad: () => {
    throw redirect({ to: "/learning-management-system/catalog", statusCode: 301 });
  },
});
