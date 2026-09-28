// Legacy URL: redirects to /admin. Kept so old links keep working.
import { createFileRoute, redirect } from "@tanstack/react-router";

/* The old card page; the admin home at /admin replaces it. */
export const Route = createFileRoute("/admin/dashboard")({
  ssr: false,
  beforeLoad: () => {
    throw redirect({ to: "/admin" });
  },
});
