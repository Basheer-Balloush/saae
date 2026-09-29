import { createFileRoute } from "@tanstack/react-router";
import { StudentDashboard } from "@/features/lms/skin/StudentDashboard";
import { LMS_SKIN_LINKS } from "@/features/lms/skin/skin";

export const Route = createFileRoute("/learning-management-system/student/")({
  head: () => ({ meta: [{ title: "My Courses — SAAE Training and Learning Platform" }], links: LMS_SKIN_LINKS }),
  component: () => <StudentDashboard initialTab="courses" />,
});
