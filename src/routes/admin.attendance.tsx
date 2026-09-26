import { createFileRoute } from "@tanstack/react-router";
import { requireAdminBeforeLoad } from "@/lib/admin-route-guard";
import { AttendanceHome } from "@/features/attendance/AttendanceHome";

/* The attendance system inside the admin console. The phone app at
   /attendance-management-system shows the same screens for use in class. */
export const Route = createFileRoute("/admin/attendance")({
  ssr: false,
  beforeLoad: requireAdminBeforeLoad,
  head: () => ({
    meta: [
      { title: "Attendance — Admin — SAAE" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  validateSearch: (s: Record<string, unknown>): { course?: string } => ({
    course: typeof s.course === "string" ? s.course : undefined,
  }),
  component: AttendanceConsole,
});

function AttendanceConsole() {
  const { course } = Route.useSearch();
  const navigate = Route.useNavigate();
  return (
    <AttendanceHome
      isAdmin
      courseId={course}
      onCourseChange={(id) => navigate({ search: id ? { course: id } : {} })}
    />
  );
}
