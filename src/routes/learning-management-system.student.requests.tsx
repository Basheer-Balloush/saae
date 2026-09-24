import { createFileRoute } from "@tanstack/react-router";
import { StudentDashboard } from "@/components/lms-skin/StudentDashboard";
import { LMS_SKIN_LINKS } from "@/components/lms-skin/skin";

export const Route = createFileRoute("/learning-management-system/student/requests")({
  head: () => ({ meta: [{ title: "My requests — SAAE Training and Learning Platform" }], links: LMS_SKIN_LINKS }),
  component: () => <StudentDashboard initialTab="requests" />,
});
