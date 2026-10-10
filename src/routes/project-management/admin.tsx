import { createFileRoute } from "@tanstack/react-router";
import { ProjectManagementRolePage } from "@/features/project-management/ProjectManagementRolePage";

export const Route = createFileRoute("/project-management/admin")({
  ssr: false,
  component: () => <ProjectManagementRolePage role="admin" />,
});
