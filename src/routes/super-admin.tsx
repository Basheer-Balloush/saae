import { createFileRoute, redirect } from "@tanstack/react-router";

/* The admin home at /admin holds the three systems now. */
export const Route = createFileRoute("/super-admin")({
  ssr: false,
  beforeLoad: () => {
    throw redirect({ to: "/admin" });
  },
});
