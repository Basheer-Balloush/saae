import { createFileRoute } from "@tanstack/react-router";
import { ProjectManagementLogin } from "@/features/project-management/ProjectManagementLogin";

export const Route = createFileRoute("/project-management/login")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Sign in — SAAE Project Management" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: ProjectManagementLogin,
});
