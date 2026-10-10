import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/project-management")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Project Management — SAAE" },
      {
        name: "description",
        content: "SAAE project management workspace for administrators, mentors and interns.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: Outlet,
});
