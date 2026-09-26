import { createFileRoute, redirect } from "@tanstack/react-router";

/* Review moderation lives in Requests → Reviews. */
export const Route = createFileRoute("/learning-management-system/admin/reviews")({
  beforeLoad: () => {
    throw redirect({
      to: "/learning-management-system/admin/requests",
      search: { tab: "reviews" },
    });
  },
});
