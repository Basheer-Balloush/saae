// Legacy URL: redirects to /learning-management-system. Kept so old links keep working.
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/registration")({
  beforeLoad: () => {
    throw redirect({ to: "/learning-management-system" });
  },
});
