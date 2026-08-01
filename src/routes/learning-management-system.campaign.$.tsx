import { createFileRoute, redirect } from "@tanstack/react-router";

// Retired campaign sub-pages (choice / story) redirect to the LMS home.
export const Route = createFileRoute("/learning-management-system/campaign/$")({
  beforeLoad: () => {
    throw redirect({ to: "/learning-management-system", replace: true });
  },
  component: () => null,
});
