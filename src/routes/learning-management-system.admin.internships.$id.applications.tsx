import { Outlet, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute(
  "/learning-management-system/admin/internships/$id/applications",
)({
  component: ApplicationsLayout,
});

function ApplicationsLayout() {
  return <Outlet />;
}
