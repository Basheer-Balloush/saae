import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { BookOpen, Check, Inbox, MonitorPlay, MapPin, Plus, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { CoursePrice } from "@/components/lms/CoursePrice";
import {
  CourseStatusPill,
  CourseThumb,
  EmptyState,
  ErrorNote,
  Loading,
  PageHeader,
  Panel,
  Pill,
  ReasonDialog,
  SearchInput,
  Seg,
  fmtDate,
  fmtNum,
  useT,
} from "@/components/console/ui";
import { useLmsAdminActions, type CourseStatus } from "@/features/lms-console/actions";
import { NewCourseDialog } from "@/features/lms-console/NewCourseDialog";

type StatusFilter = "all" | CourseStatus;

export const Route = createFileRoute("/learning-management-system/admin/courses/")({
  head: () => ({ meta: [{ title: "Courses — Learning platform — SAAE" }] }),
  validateSearch: (s: Record<string, unknown>): { status?: StatusFilter; new?: 1 } => ({
    status: ["pending", "published", "draft", "rejected"].includes(String(s.status))
      ? (s.status as StatusFilter)
      : undefined,
    new: s.new === 1 || s.new === "1" ? 1 : undefined,
  }),
  component: CoursesPage,
});

type Row = {
  id: string;
  title_ar: string;
  title_en: string | null;
  status: CourseStatus;
  cover_url: string | null;
  instructor_id: string;
  students_count: number;
  price: number;
  sale_price: number | null;
  is_free: boolean;
  delivery_mode: "onsite" | "online";
  updated_at: string;
  instructor: string;
  pendingRequests: number;
};

export const ADMIN_COURSES_KEY = ["lms-admin-courses"] as const;

function useCourses() {
  return useQuery({
    queryKey: ADMIN_COURSES_KEY,
    staleTime: 30_000,
    queryFn: async (): Promise<Row[]> => {
      const [{ data: cs, error }, { data: ins }, { data: reqs }] = await Promise.all([
        supabase
          .from("lms_courses")
          .select(
            "id,title_ar,title_en,status,cover_url,instructor_id,students_count,price,sale_price,is_free,delivery_mode,updated_at",
          )
          .order("updated_at", { ascending: false }),
        supabase.from("lms_instructors").select("user_id,full_name"),
        supabase.from("lms_enrollment_requests").select("course_id").eq("status", "pending"),
      ]);
      if (error) throw error;
      const names = Object.fromEntries(
        ((ins as { user_id: string; full_name: string }[]) ?? []).map((i) => [
          i.user_id,
          i.full_name,
        ]),
      );
      const pending: Record<string, number> = {};
      for (const r of (reqs as { course_id: string }[]) ?? [])
        pending[r.course_id] = (pending[r.course_id] ?? 0) + 1;
      return ((cs as Omit<Row, "instructor" | "pendingRequests">[]) ?? []).map((c) => ({
        ...c,
        instructor: names[c.instructor_id] ?? "",
        pendingRequests: pending[c.id] ?? 0,
      }));
    },
  });
}

function CoursesPage() {
  const { t, ar, lang } = useT();
  const search = Route.useSearch();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data, isLoading, isError, refetch } = useCourses();
  const actions = useLmsAdminActions(lang);
  const [q, setQ] = useState("");
  const [delivery, setDelivery] = useState<"all" | "online" | "onsite">("all");
  const [rejecting, setRejecting] = useState<Row | null>(null);
  const status: StatusFilter = search.status ?? "all";
  const setSearch = (next: { status?: StatusFilter; new?: 1 }) =>
    navigate({ to: "/learning-management-system/admin/courses", search: next, replace: true });
  const reload = () => qc.invalidateQueries({ queryKey: ADMIN_COURSES_KEY });

  const counts = useMemo(() => {
    const c = { all: 0, pending: 0, published: 0, draft: 0, rejected: 0 };
    for (const r of data ?? []) {
      c.all++;
      c[r.status]++;
    }
    return c;
  }, [data]);

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (data ?? []).filter(
      (r) =>
        (status === "all" || r.status === status) &&
        (delivery === "all" || r.delivery_mode === delivery) &&
        (!needle ||
          r.title_ar.toLowerCase().includes(needle) ||
          (r.title_en ?? "").toLowerCase().includes(needle) ||
          r.instructor.toLowerCase().includes(needle)),
    );
  }, [data, q, status, delivery]);

  const title = (r: Row) => (ar ? r.title_ar : r.title_en || r.title_ar);

  return (
    <div>
      <PageHeader
        eyebrow={t("منصّة التعلّم", "Learning platform")}
        title={t("الدورات", "Courses")}
        description={t(
          "كل الدورات في مكان واحد. افتح أي دورة لتعديلها أو لإدارة طلابها وحضورها.",
          "Every course in one place. Open one to edit it or manage its students and attendance.",
        )}
        actions={
          <Button onClick={() => setSearch({ status: search.status, new: 1 })}>
            <Plus className="h-4 w-4" />
            {t("دورة جديدة", "New course")}
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Seg
          value={status}
          onChange={(v) => setSearch({ status: v === "all" ? undefined : v })}
          options={[
            { value: "all", label: t("الكل", "All"), count: counts.all },
            { value: "pending", label: t("للمراجعة", "To review"), count: counts.pending },
            { value: "published", label: t("منشورة", "Published"), count: counts.published },
            { value: "draft", label: t("مسودّات", "Drafts"), count: counts.draft },
            { value: "rejected", label: t("مرفوضة", "Rejected"), count: counts.rejected },
          ]}
        />
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <select
            value={delivery}
            onChange={(e) => setDelivery(e.target.value as typeof delivery)}
            className="h-10 rounded-[10px] border border-[var(--cx-line)] bg-[var(--cx-field)] px-3 text-[14px]"
            aria-label={t("طريقة التقديم", "Delivery")}
          >
            <option value="all">{t("كل طرق التقديم", "Any delivery")}</option>
            <option value="online">{t("أونلاين", "Online")}</option>
            <option value="onsite">{t("حضوري", "In person")}</option>
          </select>
          <SearchInput
            value={q}
            onChange={setQ}
            placeholder={t("ابحث باسم الدورة أو المدرّب", "Search course or instructor")}
          />
        </div>
      </div>

      <Panel flush>
        {isLoading ? (
          <Loading />
        ) : isError ? (
          <div className="p-5">
            <ErrorNote onRetry={() => refetch()} />
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title={
              q || status !== "all"
                ? t("لا توجد نتائج", "No matching courses")
                : t("لا توجد دورات بعد", "No courses yet")
            }
            text={
              q || status !== "all"
                ? t("جرّب تغيير البحث أو الفلتر.", "Try another search or filter.")
                : undefined
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="cx-table min-w-[860px]">
              <thead>
                <tr>
                  <th>{t("الدورة", "Course")}</th>
                  <th>{t("الحالة", "Status")}</th>
                  <th>{t("التقديم", "Delivery")}</th>
                  <th>{t("الطلاب", "Students")}</th>
                  <th>{t("السعر", "Price")}</th>
                  <th>{t("آخر تعديل", "Updated")}</th>
                  <th className="text-end">{t("إجراء", "Action")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr
                    key={r.id}
                    data-link="true"
                    onClick={() =>
                      navigate({
                        to: "/learning-management-system/admin/courses/$id",
                        params: { id: r.id },
                      })
                    }
                  >
                    <td>
                      <div className="flex items-center gap-3">
                        <CourseThumb src={r.cover_url} size={38} />
                        <div className="min-w-0">
                          <Link
                            to="/learning-management-system/admin/courses/$id"
                            params={{ id: r.id }}
                            className="block max-w-[320px] truncate font-bold text-[var(--cx-ink)] hover:text-[var(--cx-teal)]"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {title(r)}
                          </Link>
                          <div className="text-[12.5px] text-[var(--cx-muted)]">
                            {r.instructor || "—"}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <CourseStatusPill status={r.status} />
                    </td>
                    <td>
                      <span className="inline-flex items-center gap-1.5 text-[13px] text-[var(--cx-ink-2)]">
                        {r.delivery_mode === "onsite" ? (
                          <MapPin className="h-4 w-4" />
                        ) : (
                          <MonitorPlay className="h-4 w-4" />
                        )}
                        {r.delivery_mode === "onsite"
                          ? t("حضوري", "In person")
                          : t("أونلاين", "Online")}
                      </span>
                    </td>
                    <td>
                      <span className="tabular-nums font-semibold">
                        {fmtNum(r.students_count, lang)}
                      </span>
                      {r.pendingRequests > 0 && (
                        <span className="ms-2">
                          <Pill tone="orange" icon={Inbox}>
                            {fmtNum(r.pendingRequests, lang)}
                          </Pill>
                        </span>
                      )}
                    </td>
                    <td className="text-[13px]">
                      <CoursePrice
                        price={Number(r.price ?? 0)}
                        salePrice={r.sale_price == null ? null : Number(r.sale_price)}
                        isFree={r.is_free}
                        lang={lang}
                        freeLabel={t("مجانية", "Free")}
                        size="sm"
                      />
                    </td>
                    <td className="text-[13px] text-[var(--cx-muted)]">
                      {fmtDate(r.updated_at, lang)}
                    </td>
                    <td className="text-end" onClick={(e) => e.stopPropagation()}>
                      {r.status === "pending" ? (
                        <div className="flex justify-end gap-1.5">
                          <Button
                            size="sm"
                            onClick={async () => {
                              if (await actions.setCourseStatus(r.id, "published")) reload();
                            }}
                          >
                            <Check className="h-4 w-4" />
                            {t("نشر", "Publish")}
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setRejecting(r)}>
                            <X className="h-4 w-4" />
                            {t("رفض", "Reject")}
                          </Button>
                        </div>
                      ) : (
                        <Button asChild size="sm" variant="outline">
                          <Link
                            to="/learning-management-system/admin/courses/$id"
                            params={{ id: r.id }}
                          >
                            {t("فتح", "Open")}
                          </Link>
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <NewCourseDialog
        open={search.new === 1}
        onOpenChange={(v) => !v && setSearch({ status: search.status })}
        mode="admin"
      />
      <ReasonDialog
        open={!!rejecting}
        onOpenChange={(v) => !v && setRejecting(null)}
        title={t("رفض الدورة", "Reject course")}
        description={t(
          "سيرى المدرّب هذا السبب ويمكنه التعديل وإعادة الإرسال.",
          "The instructor sees this reason and can edit and resubmit.",
        )}
        confirmLabel={t("رفض الدورة", "Reject course")}
        required
        destructive
        onConfirm={async (reason) => {
          if (rejecting && (await actions.setCourseStatus(rejecting.id, "rejected", reason)))
            reload();
        }}
      />
    </div>
  );
}
