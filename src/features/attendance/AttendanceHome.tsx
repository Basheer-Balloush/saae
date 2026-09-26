import { useCallback, useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { CalendarCheck, GraduationCap, Loader2, Plus, Trash2, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toUserMessage } from "@/lib/safe-error";
import { confirmDialog } from "@/hooks/useConfirm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  EmptyState,
  ErrorNote,
  Field,
  Loading,
  PageHeader,
  Panel,
  Pill,
  SearchInput,
  Seg,
  fmtDate,
  fmtNum,
  useT,
} from "@/components/console/ui";
import { Register } from "./Register";

type Course = {
  id: string;
  name_ar: string;
  name_en: string | null;
  created_at: string;
  lms_course_id: string | null;
};
type Stat = { people: number; sessions: number; last: string | null };

/* The attendance system: every course that takes attendance, and inside
   each one the register. Used by the admin console and the phone app. */
export function AttendanceHome({
  courseId,
  onCourseChange,
  isAdmin,
  canManage = isAdmin,
}: {
  courseId?: string;
  onCourseChange: (id: string | undefined) => void;
  /** Links into the admin side of the learning platform. */
  isAdmin: boolean;
  /** Create and delete courses, people and sessions (the phone app keeps its old rights). */
  canManage?: boolean;
}) {
  const { t, ar, lang } = useT();
  const [courses, setCourses] = useState<Course[] | null>(null);
  const [stats, setStats] = useState<Record<string, Stat>>({});
  const [error, setError] = useState(false);
  const [q, setQ] = useState("");
  const [kind, setKind] = useState<"all" | "linked" | "own">("all");
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    setError(false);
    const { data, error: e } = await supabase
      .from("ams_courses")
      .select("*")
      .order("created_at", { ascending: false });
    if (e) return void setError(true);
    const list = (data as Course[]) ?? [];
    setCourses(list);
    const ids = list.map((c) => c.id);
    if (!ids.length) return;
    const [{ data: rs }, { data: ss }] = await Promise.all([
      supabase.from("ams_registrants").select("course_id").in("course_id", ids),
      supabase.from("ams_sessions").select("course_id,session_date").in("course_id", ids),
    ]);
    const out: Record<string, Stat> = {};
    for (const id of ids) out[id] = { people: 0, sessions: 0, last: null };
    for (const r of (rs as { course_id: string }[]) ?? []) out[r.course_id].people++;
    for (const s of (ss as { course_id: string; session_date: string }[]) ?? []) {
      const o = out[s.course_id];
      o.sessions++;
      if (!o.last || s.session_date > o.last) o.last = s.session_date;
    }
    setStats(out);
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const name = (c: Course) => (ar ? c.name_ar : c.name_en || c.name_ar);
  const current = courseId ? (courses ?? []).find((c) => c.id === courseId) : undefined;

  if (error) return <ErrorNote onRetry={load} />;
  if (courses === null) return <Loading />;

  if (courseId && current) {
    const remove = async () => {
      const ok = await confirmDialog({
        title: t(
          `حذف «${name(current)}» من نظام الحضور؟`,
          `Delete “${name(current)}” from attendance?`,
        ),
        description: current.lms_course_id
          ? t(
              "الدورة على منصّة التعلّم تبقى. يُحذف سجل الحضور فقط.",
              "The learning-platform course stays. Only the attendance record goes.",
            )
          : t(
              "تُحذف الجلسات والأشخاص والحضور. لا يمكن التراجع.",
              "Sessions, people and attendance all go. This cannot be undone.",
            ),
        confirmLabel: t("حذف", "Delete"),
        destructive: true,
      });
      if (!ok) return;
      const { error: e } = await supabase.from("ams_courses").delete().eq("id", current.id);
      if (e) return void toast.error(toUserMessage(e));
      toast.success(t("حُذفت", "Deleted"));
      onCourseChange(undefined);
      load();
    };
    return (
      <div>
        <PageHeader
          back={{
            label: t("كل دورات الحضور", "All attendance courses"),
            onClick: () => onCourseChange(undefined),
          }}
          eyebrow={t("نظام الحضور", "Attendance")}
          title={name(current)}
          meta={
            current.lms_course_id ? (
              <Pill tone="teal">
                <GraduationCap />
                {t("مربوطة بمنصّة التعلّم", "Linked to the learning platform")}
              </Pill>
            ) : (
              <Pill tone="gray">{t("دورة حضور مستقلة", "Stand-alone attendance course")}</Pill>
            )
          }
          actions={
            current.lms_course_id && isAdmin ? (
              <Button asChild variant="outline">
                <Link
                  to="/learning-management-system/admin/courses/$id"
                  params={{ id: current.lms_course_id }}
                  search={{ tab: "attendance" }}
                >
                  <GraduationCap className="h-4 w-4" />
                  {t("فتح الدورة", "Open the course")}
                </Link>
              </Button>
            ) : undefined
          }
        />
        <Register amsId={current.id} lmsCourseId={current.lms_course_id} canDelete={canManage} />
        {canManage && (
          <button
            type="button"
            onClick={remove}
            className="mt-6 inline-flex items-center gap-1.5 text-[13px] font-bold text-[var(--cx-muted)] hover:text-[var(--cx-red)]"
          >
            <Trash2 className="h-4 w-4" />
            {t("حذف دورة الحضور", "Delete this attendance course")}
          </button>
        )}
      </div>
    );
  }

  const s = q.trim().toLowerCase();
  const shown = courses.filter(
    (c) =>
      (kind === "all" || (kind === "linked" ? !!c.lms_course_id : !c.lms_course_id)) &&
      (!s || `${c.name_ar} ${c.name_en ?? ""}`.toLowerCase().includes(s)),
  );

  return (
    <div>
      <PageHeader
        eyebrow={t("نظام الحضور", "Attendance")}
        title={t("دورات الحضور", "Attendance courses")}
        description={t(
          "كل دورة تُسجَّل فيها الحضور. الدورات الحضورية على منصّة التعلّم تظهر هنا تلقائياً عند نشرها.",
          "Every course that takes attendance. In-person courses on the learning platform appear here on their own once published.",
        )}
        actions={
          canManage ? (
            <Button onClick={() => setAdding(true)}>
              <Plus className="h-4 w-4" />
              {t("دورة حضور مستقلة", "Stand-alone course")}
            </Button>
          ) : undefined
        }
      />
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Seg
          value={kind}
          onChange={setKind}
          options={[
            { value: "all", label: t("الكل", "All"), count: courses.length },
            {
              value: "linked",
              label: t("من منصّة التعلّم", "From the platform"),
              count: courses.filter((c) => c.lms_course_id).length,
            },
            {
              value: "own",
              label: t("مستقلة", "Stand-alone"),
              count: courses.filter((c) => !c.lms_course_id).length,
            },
          ]}
        />
        <SearchInput
          value={q}
          onChange={setQ}
          placeholder={t("ابحث باسم الدورة", "Search by course name")}
        />
      </div>
      {shown.length === 0 ? (
        <Panel>
          <EmptyState icon={CalendarCheck} title={t("لا توجد دورات هنا", "No courses here")} />
        </Panel>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {shown.map((c) => {
            const st = stats[c.id];
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => onCourseChange(c.id)}
                className="cx-card flex flex-col p-5 text-start transition-colors hover:border-[var(--cx-teal-100)]"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[var(--cx-orange-50)] text-[var(--cx-orange-ink)]">
                    <CalendarCheck className="h-5 w-5" />
                  </span>
                  {c.lms_course_id ? (
                    <Pill tone="teal">{t("منصّة التعلّم", "Platform")}</Pill>
                  ) : (
                    <Pill tone="gray">{t("مستقلة", "Stand-alone")}</Pill>
                  )}
                </div>
                <div className="mt-3 line-clamp-2 text-[16px] font-extrabold">{name(c)}</div>
                <div className="flex-1" />
                <div className="mt-4 grid grid-cols-3 gap-2 border-t border-[var(--cx-line-2)] pt-3 text-[12.5px]">
                  <span>
                    <b className="block text-[18px] tabular-nums">
                      {st ? fmtNum(st.people, lang) : "…"}
                    </b>
                    <span className="text-[var(--cx-muted)]">
                      <Users className="me-1 inline h-3 w-3" />
                      {t("أشخاص", "people")}
                    </span>
                  </span>
                  <span>
                    <b className="block text-[18px] tabular-nums">
                      {st ? fmtNum(st.sessions, lang) : "…"}
                    </b>
                    <span className="text-[var(--cx-muted)]">{t("جلسات", "sessions")}</span>
                  </span>
                  <span>
                    <b className="block text-[13px]">{st?.last ? fmtDate(st.last, lang) : "—"}</b>
                    <span className="text-[var(--cx-muted)]">{t("آخر جلسة", "last session")}</span>
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}
      <NewCourse open={adding} onClose={() => setAdding(false)} onCreated={load} />
    </div>
  );
}

function NewCourse({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const { t, ar } = useT();
  const [nameAr, setNameAr] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [saving, setSaving] = useState(false);
  const create = async () => {
    if (!nameAr.trim())
      return void toast.error(t("الاسم بالعربية مطلوب", "The Arabic name is required"));
    setSaving(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return void setSaving(false);
    const { error } = await supabase
      .from("ams_courses")
      .insert({
        name_ar: nameAr.trim().slice(0, 200),
        name_en: nameEn.trim().slice(0, 200) || null,
        created_by: u.user.id,
      });
    setSaving(false);
    if (error) return void toast.error(toUserMessage(error));
    toast.success(t("أُنشئت الدورة", "Course created"));
    setNameAr("");
    setNameEn("");
    onClose();
    onCreated();
  };
  return (
    <Dialog open={open} onOpenChange={(v) => !v && !saving && onClose()}>
      <DialogContent className="max-w-md" dir={ar ? "rtl" : "ltr"}>
        <DialogHeader>
          <DialogTitle>{t("دورة حضور مستقلة", "Stand-alone attendance course")}</DialogTitle>
          <DialogDescription>
            {t(
              "لفعالية أو ورشة ليست على منصّة التعلّم. الدورات الحضورية على المنصّة تُضاف هنا تلقائياً، فلا تنشئها مرتين.",
              "For an event or workshop that isn't on the learning platform. In-person platform courses are added here on their own, so don't create them twice.",
            )}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Field label={t("الاسم بالعربية", "Name in Arabic")}>
            <Input autoFocus dir="rtl" value={nameAr} onChange={(e) => setNameAr(e.target.value)} />
          </Field>
          <Field label={t("الاسم بالإنجليزية (اختياري)", "Name in English (optional)")}>
            <Input dir="ltr" value={nameEn} onChange={(e) => setNameEn(e.target.value)} />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            {t("إلغاء", "Cancel")}
          </Button>
          <Button onClick={create} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {t("إنشاء", "Create")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
