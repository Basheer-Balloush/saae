// Short URL: redirects to /learning-management-system/internships. Kept so typed and shared links work.
import { createFileRoute, redirect } from "@tanstack/react-router";

/* aisyria.org/internships is the address people guess or type from a poster;
   the internship list lives on the learning platform. */
export const Route = createFileRoute("/internships/")({
  beforeLoad: () => {
    throw redirect({ to: "/learning-management-system/internships", statusCode: 301 });
  },
});
