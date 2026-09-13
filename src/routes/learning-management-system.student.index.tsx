import { createFileRoute } from "@tanstack/react-router";
import { StudentDashboard } from "@/components/lms-skin/StudentDashboard";
import { LMS_SKIN_LINKS } from "@/components/lms-skin/skin";

export const Route = createFileRoute("/learning-management-system/student/")({
  head: () => ({ meta: [{ title: "LMS · My Courses" }], links: LMS_SKIN_LINKS }),
  component: () => <StudentDashboard initialTab="courses" />,
});
