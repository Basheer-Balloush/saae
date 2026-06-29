import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/lms")({
  beforeLoad: () => {
    throw redirect({ to: "/learning-management-system" });
  },
});
