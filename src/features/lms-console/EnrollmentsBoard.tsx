import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ArrowLeft, ExternalLink, Inbox } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  CourseThumb,
  EmptyState,
  Loading,
  Panel,
  SearchInput,
  fmtNum,
  useT,
} from "@/components/console/ui";
import { EnrollmentRequestsPanel } from "@/features/lms-console/EnrollmentRequestsPanel";

type CourseSummary = {
  id: string;
  title_ar: string;
  title_en: string | null;
  cover_url: string | null;
  created_at: string;
  pending: number;
  total: number;
};

export const ENROLLMENT_COURSES_KEY = ["lms-admin-enrollment-courses"] as const;
const KEY = ENROLLMENT_COURSES_KEY;

function useCourseSummaries() {
  return useQuery({
    queryKey: KEY,
    staleTime: 30_000,
    queryFn: async (): Promise<CourseSummary[]> => {
      const { data: reqs } = await supabase
        .from("lms_enrollment_requests")
        .select("course_id,status");
      const list = (reqs as { course_id: string; status: string }[]) ?? [];
      const ids = [...new Set(list.map((r) => r.course_id))];
      if (!ids.length) return [];
      const { data: cs } = await supabase
        .from("lms_courses")
        .select("id,title_ar,title_en,cover_url,created_at")
        .in("id", ids);
      const byId = new Map(
        ((cs as Omit<CourseSummary, "pending" | "total">[]) ?? []).map((c) => [c.id, c]),
      );
      return ids
        .map((id) => {
          const c = byId.get(id);
          const mine = list.filter((r) => r.course_id === id);
          return {
            id,
            title_ar: c?.title_ar ?? id,
            title_en: c?.title_en ?? null,
            cover_url: c?.cover_url ?? null,
            created_at: c?.created_at ?? "",
            pending: mine.filter((r) => r.status === "pending").length,
            total: mine.length,
          };
        })
        .sort((a, b) => b.pending - a.pending || b.created_at.localeCompare(a.created_at));
    },
  });
}

/* Enrollment decisions: courses with requests on one side (most waiting
   first), the chosen course's requests on the other. */
export function EnrollmentsBoard({
  course,
  onSelect,
}: {
  course?: string;
  onSelect: (id?: string) => void;
}) {
  const { t, ar, lang } = useT();
  const qc = useQueryClient();
  const { data, isLoading } = useCourseSummaries();
  const [q, setQ] = useState("");
  const select = onSelect;

  const title = (c: { title_ar: string; title_en: string | null }) =>
    ar ? c.title_ar : c.title_en || c.title_ar;
  const selected = data?.find((c) => c.id === course) ?? null;
  const shown = useMemo(() => {
    const n = q.trim().toLowerCase();
    return (data ?? []).filter(
      (c) =>
        !n || c.title_ar.toLowerCase().includes(n) || (c.title_en ?? "").toLowerCase().includes(n),
    );
  }, [data, q]);

  return (
    <div>
      <div className="grid gap-5 xl:grid-cols-[340px_1fr]">
        <div className={course ? "hidden xl:block" : ""}>
          <div className="mb-3">
            <SearchInput
              value={q}
              onChange={setQ}
              placeholder={t("ابحث عن دورة", "Find a course")}
            />
          </div>
          <Panel flush>
            {isLoading ? (
              <Loading />
            ) : shown.length === 0 ? (
              <EmptyState compact icon={Inbox} title={t("لا توجد طلبات", "No requests")} />
            ) : (
              <ul className="max-h-[70vh] overflow-y-auto">
                {shown.map((c) => (
                  <li key={c.id} className="border-b border-[var(--cx-line-2)] last:border-0">
                    <button
                      type="button"
                      onClick={() => select(c.id)}
                      className={`flex w-full items-center gap-3 px-4 py-3 text-start transition-colors hover:bg-[var(--cx-hover)] ${course === c.id ? "bg-[var(--cx-teal-50)]" : ""}`}
                    >
                      <CourseThumb src={c.cover_url} size={32} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[14px] font-bold">{title(c)}</span>
                        <span className="text-[12px] text-[var(--cx-muted)]">
                          {t(`${fmtNum(c.total, lang)} طلب`, `${fmtNum(c.total, lang)} requests`)}
                        </span>
                      </span>
                      {c.pending > 0 && (
                        <span className="rounded-full bg-[var(--cx-badge)] px-2 py-0.5 text-[12px] font-extrabold text-[var(--cx-badge-ink)]">
                          {fmtNum(c.pending, lang)}
                        </span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>

        <div className={course ? "" : "hidden xl:block"}>
          {!course ? (
            <Panel>
              <EmptyState
                icon={Inbox}
                title={t("اختر دورة", "Pick a course")}
                text={t(
                  "اختر دورة من القائمة لعرض طلباتها واتخاذ القرار.",
                  "Pick a course from the list to see its requests and decide.",
                )}
              />
            </Panel>
          ) : (
            <Panel
              title={
                <span className="flex items-center gap-2">
                  <button
                    type="button"
                    className="xl:hidden"
                    onClick={() => select()}
                    aria-label={t("رجوع", "Back")}
                  >
                    <ArrowLeft className="h-5 w-5 rtl:-scale-x-100" />
                  </button>
                  {selected ? title(selected) : "…"}
                </span>
              }
              actions={
                <Button asChild size="sm" variant="ghost">
                  <Link
                    to="/learning-management-system/admin/courses/$id"
                    params={{ id: course }}
                    search={{ tab: "students" }}
                  >
                    <ExternalLink className="h-4 w-4" />
                    {t("فتح الدورة", "Open course")}
                  </Link>
                </Button>
              }
            >
              <EnrollmentRequestsPanel
                key={course}
                courseId={course}
                canDecide
                onChanged={() => qc.invalidateQueries({ queryKey: KEY })}
              />
            </Panel>
          )}
        </div>
      </div>
    </div>
  );
}
