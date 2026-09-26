import { createFileRoute } from "@tanstack/react-router";
import { useLmsAuth } from "@/hooks/useLmsAuth";
import { AttendanceHome } from "@/features/attendance/AttendanceHome";
import { useConsoleRoot } from "@/components/console/ConsoleShell";

export const Route = createFileRoute("/attendance-management-system/")({
  head: () => ({
    meta: [
      { title: "Attendance Management System — SAAE" },
      {
        name: "description",
        content:
          "Private SAAE attendance management dashboard for instructors to track courses, sessions, and student attendance.",
      },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Attendance Management System — SAAE" },
      { property: "og:description", content: "Private SAAE attendance dashboard for instructors." },
      { property: "og:url", content: "https://aisyria.org/attendance-management-system" },
    ],
  }),
  validateSearch: (search: Record<string, unknown>): { course?: string } => ({
    course: typeof search.course === "string" ? search.course : undefined,
  }),
  component: AmsHome,
});

/* The phone app: the same attendance screens as the console, in the site's colours. */
function AmsHome() {
  useConsoleRoot();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const { role } = useLmsAuth();
  return (
    <div
      className="mx-auto w-full max-w-6xl px-4 py-6 text-[var(--cx-ink)]"
      style={{ fontFamily: '"Cairo", "Noto Sans Arabic", system-ui, sans-serif' }}
    >
      <AttendanceHome
        isAdmin={role === "admin"}
        canManage
        courseId={search.course}
        onCourseChange={(id) => navigate({ search: id ? { course: id } : {} })}
      />
    </div>
  );
}
