import { createFileRoute } from "@tanstack/react-router";
import { useLmsAuth } from "@/hooks/useLmsAuth";
import { CourseEditor } from "@/features/course-editor/CourseEditor";
import { EDITOR_TABS, type EditorTab } from "@/features/course-editor/types";

export const Route = createFileRoute("/learning-management-system/instructor/courses/$id")({
  head: () => ({ meta: [{ title: "Edit course — SAAE Training and Learning Platform" }] }),
  validateSearch: (s: Record<string, unknown>): { tab?: EditorTab } => ({
    tab:
      EDITOR_TABS.includes(s.tab as EditorTab) && s.tab !== "details"
        ? (s.tab as EditorTab)
        : undefined,
  }),
  component: InstructorCourseEditor,
});

function InstructorCourseEditor() {
  const { id } = Route.useParams();
  const { tab } = Route.useSearch();
  const navigate = Route.useNavigate();
  const { role } = useLmsAuth();
  return (
    <CourseEditor
      key={id}
      courseId={id}
      context={role === "admin" ? "admin" : "instructor"}
      tab={tab ?? "details"}
      onTabChange={(next) =>
        navigate({ search: { tab: next === "details" ? undefined : next }, replace: true })
      }
    />
  );
}
