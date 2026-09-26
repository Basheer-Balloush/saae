import { createFileRoute } from "@tanstack/react-router";
import { CourseEditor } from "@/features/course-editor/CourseEditor";
import { EDITOR_TABS, type EditorTab } from "@/features/course-editor/types";

export const Route = createFileRoute("/learning-management-system/admin/courses/$id")({
  head: () => ({ meta: [{ title: "Edit course — Learning platform — SAAE" }] }),
  validateSearch: (s: Record<string, unknown>): { tab?: EditorTab } => ({
    tab:
      EDITOR_TABS.includes(s.tab as EditorTab) && s.tab !== "details"
        ? (s.tab as EditorTab)
        : undefined,
  }),
  component: AdminCourseEditor,
});

function AdminCourseEditor() {
  const { id } = Route.useParams();
  const { tab } = Route.useSearch();
  const navigate = Route.useNavigate();
  return (
    <CourseEditor
      key={id}
      courseId={id}
      context="admin"
      tab={tab ?? "details"}
      onTabChange={(next) =>
        navigate({ search: { tab: next === "details" ? undefined : next }, replace: true })
      }
    />
  );
}
