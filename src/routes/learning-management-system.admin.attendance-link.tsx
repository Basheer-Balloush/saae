import { createFileRoute, redirect } from "@tanstack/react-router";

/* Attendance is part of each in-person course now (course → Attendance tab),
   and turns on by itself when the course is delivered in person. */
export const Route = createFileRoute("/learning-management-system/admin/attendance-link")({
  beforeLoad: () => {
    throw redirect({ to: "/learning-management-system/admin/courses" });
  },
});
