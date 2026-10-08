import { createFileRoute } from "@tanstack/react-router";
import { ProjectManagementApp } from "@/features/project-management/ProjectManagementApp";

export const Route = createFileRoute("/project-management")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Project Management — SAAE" },
      {
        name: "description",
        content:
          "SAAE project management workspace for internship administrators, mentors, and interns.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: ProjectManagementApp,
});
