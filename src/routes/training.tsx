// Short URL: redirects to /learning-management-system. Kept so typed and shared links work.
import { createFileRoute, redirect } from "@tanstack/react-router";

/* aisyria.org/training is a guessed address for the training platform. */
export const Route = createFileRoute("/training")({
  beforeLoad: () => {
    throw redirect({ to: "/learning-management-system", statusCode: 301 });
  },
});
