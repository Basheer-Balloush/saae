// Short URL: redirects to /learning-management-system. Kept so typed and shared links work.
import { createFileRoute, redirect } from "@tanstack/react-router";

/* aisyria.org/lms is a guessed address for the learning platform. Only the bare
   path: /lms/css, /lms/js and /lms/img are the platform's static files. */
export const Route = createFileRoute("/lms")({
  beforeLoad: () => {
    throw redirect({ to: "/learning-management-system", statusCode: 301 });
  },
});
