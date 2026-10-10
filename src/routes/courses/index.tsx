// Short URL: redirects to /learning-management-system/catalog. Kept so typed and shared links work.
import { createFileRoute, redirect } from "@tanstack/react-router";

/* aisyria.org/courses is a guessed address for the course catalog. */
export const Route = createFileRoute("/courses/")({
  beforeLoad: () => {
    throw redirect({ to: "/learning-management-system/catalog", statusCode: 301 });
  },
});
