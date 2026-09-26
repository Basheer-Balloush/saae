import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  BarChart3,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  ClipboardCheck,
  Download,
  Loader2,
  Plus,
  Trash2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toUserMessage } from "@/lib/safe-error";
import { confirmDialog } from "@/hooks/useConfirm";
import { FileUploader } from "@/components/lms/FileUploader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  EmptyState,
  Field,
  Loading,
  Panel,
  Pill,
  Seg,
  fmtDate,
  fmtNum,
} from "@/components/console/ui";
import type { EditorCtx, Lesson, Section } from "./types";

type Assignment = {
  id: string;
  lesson_id: string | null;
  title_ar: string;
  title_en: string | null;
  description_ar: string | null;
  description_en: string | null;
  brief_file_path: string | null;
  max_grade: number;
  due_date: string | null;
  created_at: string;
};
type Submission = {
  id: string;
  assignment_id: string;
  student_id: string;
  file_path: string;
  submitted_at: string;
  grade: number | null;
  feedback: string | null;
  graded_at: string | null;
};
type Quiz = { id: string; title: string; pass_score: number };
type Attempt = {
  id: string;
  quiz_id: string;
  student_id: string;
  score: number;
  passed: boolean;
  attempt_number: number;
  submitted_at: string;
};

const EMPTY = {
  lesson_id: "",
  title_ar: "",
  title_en: "",
  description_ar: "",
  description_en: "",
  max_grade: "100",
  due_date: "",
};

/* Everything that gets a mark: assignments with their hand-ins, and quiz
   attempts. What still needs grading comes first. */
export function GradingTab({
  ctx,
  sections,
  lessons,
}: {
  ctx: EditorCtx;
  sections: Section[];
  lessons: Lesson[];
}) {
  const { course, t, ar, lang, user } = ctx;
  const [assignments, setAssignments] = useState<Assignment[] | null>(null);
  const [subs, setSubs] = useState<Submission[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [open, setOpen] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    const [{ data: as }, { data: qs }] = await Promise.all([
      supabase.from("lms_assignments").select("*").eq("course_id", course.id).order("created_at"),
      supabase
        .from("lms_quizzes")
        .select("id,title,pass_score")
        .eq("course_id", course.id)
        .order("created_at"),
    ]);
    const aList = (as as Assignment[]) ?? [];
    const qList = (qs as Quiz[]) ?? [];
    const [{ data: ss }, { data: at }] = await Promise.all([
      aList.length
        ? supabase
            .from("lms_submissions")
            .select("*")
            .in(
              "assignment_id",
              aList.map((a) => a.id),
            )
            .order("submitted_at", { ascending: false })
        : Promise.resolve({ data: [] }),
      qList.length
        ? supabase
            .from("lms_quiz_attempts")
            .select("id,quiz_id,student_id,score,passed,attempt_number,submitted_at")
            .in(
              "quiz_id",
              qList.map((q) => q.id),
            )
            .order("submitted_at", { ascending: false })
        : Promise.resolve({ data: [] }),
    ]);
    const sList = (ss as Submission[]) ?? [];
    const tList = (at as Attempt[]) ?? [];
    const ids = Array.from(
      new Set([...sList.map((s) => s.student_id), ...tList.map((a) => a.student_id)]),
    );
    if (ids.length) {
      const { data: profs } = await supabase
        .from("lms_user_profiles")
        .select("user_id,full_name")
        .in("user_id", ids);
      const map: Record<string, string> = {};
      for (const p of (profs as { user_id: string; full_name: string | null }[]) ?? [])
        if (p.full_name) map[p.user_id] = p.full_name;
      setNames(map);
    }
    setAssignments(aList);
    setQuizzes(qList);
    setSubs(sList);
    setAttempts(tList);
  }, [course.id]);
  useEffect(() => {
    load();
  }, [load]);

  const ungraded = subs.filter((s) => s.grade === null).length;
  const name = (id: string) => names[id] || `${t("طالب", "Student")} ${id.slice(0, 6)}`;
  const pick = (a: string | null | undefined, e: string | null | undefined) =>
    (ar ? a || e : e || a) || "";

  const remove = async (a: Assignment) => {
    const n = subs.filter((s) => s.assignment_id === a.id).length;
    const ok = await confirmDialog({
      title: t("حذف هذا الواجب؟", "Delete this assignment?"),
      description: n
        ? t(
            `ومعه ${n} تسليم من الطلاب. لا يمكن التراجع.`,
            `Along with ${n} student hand-ins. This cannot be undone.`,
          )
        : t("لا يمكن التراجع.", "This cannot be undone."),
      confirmLabel: t("حذف", "Delete"),
      destructive: true,
    });
    if (!ok) return;
    const { error } = await supabase.from("lms_assignments").delete().eq("id", a.id);
    if (error) return void toast.error(toUserMessage(error));
    toast.success(t("حُذف الواجب", "Assignment deleted"));
    load();
  };
  const setBrief = async (id: string, path: string | null) => {
    const { error } = await supabase
      .from("lms_assignments")
      .update({ brief_file_path: path })
      .eq("id", id);
    if (error) return void toast.error(toUserMessage(error));
    load();
  };

  if (assignments === null) return <Loading />;

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-3">
        <Tile
          icon={ClipboardCheck}
          tone={ungraded ? "orange" : "green"}
          value={fmtNum(ungraded, lang)}
          label={t("تسليم ينتظر العلامة", "hand-ins to grade")}
        />
        <Tile
          icon={ClipboardCheck}
          tone="teal"
          value={fmtNum(subs.length, lang)}
          label={t("كل التسليمات", "hand-ins in total")}
        />
        <Tile
          icon={BarChart3}
          tone="teal"
          value={
            attempts.length
              ? `${Math.round((attempts.filter((a) => a.passed).length / attempts.length) * 100)}%`
              : "—"
          }
          label={t("نسبة النجاح في الاختبارات", "quiz pass rate")}
        />
      </div>

      <Panel
        title={t("الواجبات", "Assignments")}
        description={t(
          "أنشئ واجباً، ثم افتحه لتصحيح ما سلّمه الطلاب.",
          "Create an assignment, then open it to grade what students handed in.",
        )}
        actions={
          <Button onClick={() => setAdding(true)}>
            <Plus className="h-4 w-4" />
            {t("واجب جديد", "New assignment")}
          </Button>
        }
        flush
      >
        {assignments.length === 0 ? (
          <EmptyState icon={ClipboardCheck} title={t("لا واجبات بعد", "No assignments yet")} />
        ) : (
          <ul className="divide-y divide-[var(--cx-line-2)]">
            {assignments.map((a) => {
              const mine = subs.filter((s) => s.assignment_id === a.id);
              const waiting = mine.filter((s) => s.grade === null).length;
              const isOpen = open === a.id;
              const lesson = lessons.find((l) => l.id === a.lesson_id);
              return (
                <li key={a.id}>
                  <button
                    type="button"
                    onClick={() => setOpen(isOpen ? null : a.id)}
                    className="flex w-full flex-wrap items-center gap-3 px-5 py-4 text-start hover:bg-[var(--cx-hover)]"
                  >
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--cx-teal-50)] text-[var(--cx-teal)]">
                      <ClipboardCheck className="h-5 w-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-extrabold" dir="auto">
                        {pick(a.title_ar, a.title_en) || t("واجب", "Assignment")}
                      </span>
                      <span className="block text-[12.5px] text-[var(--cx-muted)]">
                        {t(`من ${a.max_grade}`, `out of ${a.max_grade}`)}
                        {lesson && ` · ${pick(lesson.title_ar, lesson.title_en)}`}
                        {a.due_date &&
                          ` · ${t("التسليم", "due")} ${fmtDate(a.due_date, lang, true)}`}
                      </span>
                    </span>
                    {waiting > 0 ? (
                      <Pill tone="orange">{t(`${waiting} للتصحيح`, `${waiting} to grade`)}</Pill>
                    ) : (
                      <Pill tone={mine.length ? "green" : "gray"}>
                        {t(`${mine.length} تسليم`, `${mine.length} hand-ins`)}
                      </Pill>
                    )}
                    <ChevronDown
                      className={`h-4 w-4 text-[var(--cx-muted)] transition-transform ${isOpen ? "rotate-180" : ""}`}
                    />
                  </button>
                  {isOpen && (
                    <div className="space-y-4 border-t border-[var(--cx-line-2)] bg-[var(--cx-raise)] px-5 py-4">
                      {pick(a.description_ar, a.description_en) && (
                        <p
                          className="whitespace-pre-wrap text-[14px] text-[var(--cx-ink-2)]"
                          dir="auto"
                        >
                          {pick(a.description_ar, a.description_en)}
                        </p>
                      )}
                      <div className="flex flex-wrap items-center gap-2 text-[13px]">
                        <span className="font-bold text-[var(--cx-ink-2)]">
                          {t("ملف الواجب:", "Brief file:")}
                        </span>
                        <FileUploader
                          bucket="lms-assignments"
                          pathPrefix={`brief/${a.id}`}
                          currentPath={a.brief_file_path}
                          onUploaded={(p) => setBrief(a.id, p)}
                          onRemoved={() => setBrief(a.id, null)}
                          label={a.brief_file_path ? t("استبدال", "Replace") : t("رفع", "Upload")}
                        />
                        <Button
                          size="sm"
                          variant="ghost"
                          className="ms-auto text-[var(--cx-red)]"
                          onClick={() => remove(a)}
                        >
                          <Trash2 className="h-4 w-4" />
                          {t("حذف الواجب", "Delete assignment")}
                        </Button>
                      </div>
                      {mine.length === 0 ? (
                        <p className="text-[13.5px] text-[var(--cx-muted)]">
                          {t("لم يسلّم أحد بعد.", "Nobody has handed in yet.")}
                        </p>
                      ) : (
                        <ul className="space-y-2">
                          {[
                            ...mine.filter((s) => s.grade === null),
                            ...mine.filter((s) => s.grade !== null),
                          ].map((s) => (
                            <GradeRow
                              key={s.id}
                              s={s}
                              max={a.max_grade}
                              who={name(s.student_id)}
                              ctx={ctx}
                              onSaved={load}
                            />
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Panel>

      <QuizResults quizzes={quizzes} attempts={attempts} name={name} ctx={ctx} />

      <Sheet open={adding} onOpenChange={setAdding}>
        <SheetContent
          side={ar ? "left" : "right"}
          className="w-full overflow-y-auto sm:max-w-lg"
          dir={ar ? "rtl" : "ltr"}
        >
          <NewAssignment
            ctx={ctx}
            sections={sections}
            lessons={lessons}
            userId={user?.id}
            onDone={() => {
              setAdding(false);
              load();
            }}
          />
        </SheetContent>
      </Sheet>
    </div>
  );
}

function Tile({
  icon: Icon,
  value,
  label,
  tone,
}: {
  icon: typeof BarChart3;
  value: string;
  label: string;
  tone: "teal" | "orange" | "green";
}) {
  const c =
    tone === "orange"
      ? "text-[var(--cx-orange-ink)] bg-[var(--cx-orange-50)]"
      : tone === "green"
        ? "text-[var(--cx-green)] bg-[var(--cx-green-50)]"
        : "text-[var(--cx-teal)] bg-[var(--cx-teal-50)]";
  return (
    <div className="cx-card flex items-center gap-3 p-4">
      <span className={`grid h-10 w-10 place-items-center rounded-xl ${c}`}>
        <Icon className="h-5 w-5" />
      </span>
      <span>
        <span className="block text-[22px] font-extrabold leading-none tabular-nums">{value}</span>
        <span className="text-[12.5px] text-[var(--cx-muted)]">{label}</span>
      </span>
    </div>
  );
}

function GradeRow({
  s,
  max,
  who,
  ctx,
  onSaved,
}: {
  s: Submission;
  max: number;
  who: string;
  ctx: EditorCtx;
  onSaved: () => void;
}) {
  const { t, lang } = ctx;
  const [grade, setGrade] = useState(s.grade?.toString() ?? "");
  const [feedback, setFeedback] = useState(s.feedback ?? "");
  const [saving, setSaving] = useState(false);
  const [opening, setOpening] = useState(false);
  const changed = grade !== (s.grade?.toString() ?? "") || feedback !== (s.feedback ?? "");

  const download = async () => {
    setOpening(true);
    const { data, error } = await supabase.storage
      .from("lms-assignments")
      .createSignedUrl(s.file_path, 600);
    setOpening(false);
    if (error) return void toast.error(toUserMessage(error));
    if (data?.signedUrl) window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  };
  const save = async () => {
    const g = grade.trim() === "" ? null : Number(grade);
    if (g !== null && (Number.isNaN(g) || g < 0 || g > max))
      return void toast.error(
        t(`العلامة بين 0 و ${max}`, `The grade must be between 0 and ${max}`),
      );
    setSaving(true);
    const fb = feedback.trim();
    const { error } = await supabase.rpc("grade_lms_submission", {
      _submission_id: s.id,
      ...(g !== null ? { _grade: g } : {}),
      ...(fb ? { _feedback: fb } : {}),
    });
    setSaving(false);
    if (error) return void toast.error(toUserMessage(error));
    toast.success(t("حُفظت العلامة", "Grade saved"));
    onSaved();
  };

  return (
    <li className="rounded-xl border border-[var(--cx-line)] bg-[var(--cx-card-solid)] p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-bold">{who}</span>
        {s.grade === null ? (
          <Pill tone="orange">{t("بلا علامة", "Not graded")}</Pill>
        ) : (
          <Pill tone="green">{`${s.grade}/${max}`}</Pill>
        )}
        <span className="text-[12px] text-[var(--cx-muted)]">
          {fmtDate(s.submitted_at, lang, true)}
        </span>
        <Button
          size="sm"
          variant="outline"
          className="ms-auto"
          onClick={download}
          disabled={opening}
        >
          {opening ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          {t("الملف", "File")}
        </Button>
      </div>
      <div className="mt-3 grid items-end gap-2 sm:grid-cols-[110px_1fr_auto]">
        <Field label={t(`العلامة /${max}`, `Grade /${max}`)}>
          <Input
            type="number"
            min={0}
            max={max}
            value={grade}
            onChange={(e) => setGrade(e.target.value)}
            className="h-9"
          />
        </Field>
        <Field label={t("ملاحظة للطالب", "Feedback")}>
          <Textarea
            rows={1}
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            maxLength={2000}
            dir="auto"
            className="min-h-9"
          />
        </Field>
        <Button size="sm" onClick={save} disabled={saving || !changed}>
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <CheckCircle2 className="h-4 w-4" />
          )}
          {t("حفظ", "Save")}
        </Button>
      </div>
    </li>
  );
}

function QuizResults({
  quizzes,
  attempts,
  name,
  ctx,
}: {
  quizzes: Quiz[];
  attempts: Attempt[];
  name: (id: string) => string;
  ctx: EditorCtx;
}) {
  const { t, lang } = ctx;
  const [quiz, setQuiz] = useState<string>("all");
  const shown = useMemo(
    () => (quiz === "all" ? attempts : attempts.filter((a) => a.quiz_id === quiz)),
    [attempts, quiz],
  );
  const title = (id: string) => quizzes.find((q) => q.id === id)?.title ?? "—";

  return (
    <Panel
      title={t("نتائج الاختبارات", "Quiz results")}
      description={t("كل محاولة لكل طالب.", "Every attempt by every student.")}
      actions={
        quizzes.length > 1 ? (
          <Seg
            value={quiz}
            onChange={setQuiz}
            options={[
              { value: "all", label: t("الكل", "All") },
              ...quizzes.map((q) => ({ value: q.id, label: q.title })),
            ]}
          />
        ) : undefined
      }
      flush
    >
      {quizzes.length === 0 ? (
        <EmptyState
          compact
          icon={BarChart3}
          title={t(
            "لا اختبار لهذه الدورة. أضفه من تبويب المحتوى.",
            "No quiz for this course. Add one in the Content tab.",
          )}
        />
      ) : shown.length === 0 ? (
        <EmptyState compact icon={BarChart3} title={t("لا محاولات بعد", "No attempts yet")} />
      ) : (
        <div className="overflow-x-auto">
          <table className="cx-table min-w-[560px]">
            <thead>
              <tr>
                <th>{t("الطالب", "Student")}</th>
                {quizzes.length > 1 && <th>{t("الاختبار", "Quiz")}</th>}
                <th className="text-center">{t("المحاولة", "Attempt")}</th>
                <th className="text-center">{t("النتيجة", "Score")}</th>
                <th>{t("التاريخ", "Date")}</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((a) => (
                <tr key={a.id}>
                  <td className="font-semibold">{name(a.student_id)}</td>
                  {quizzes.length > 1 && <td>{title(a.quiz_id)}</td>}
                  <td className="text-center tabular-nums">{fmtNum(a.attempt_number, lang)}</td>
                  <td className="text-center">
                    <Pill tone={a.passed ? "green" : "red"}>
                      {Number(a.score).toFixed(0)}% ·{" "}
                      {a.passed ? t("ناجح", "Passed") : t("راسب", "Failed")}
                    </Pill>
                  </td>
                  <td className="text-[13px] text-[var(--cx-muted)]">
                    {fmtDate(a.submitted_at, lang, true)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}

function NewAssignment({
  ctx,
  sections,
  lessons,
  userId,
  onDone,
}: {
  ctx: EditorCtx;
  sections: Section[];
  lessons: Lesson[];
  userId?: string;
  onDone: () => void;
}) {
  const { course, t, ar } = ctx;
  const [f, setF] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const pick = (a: string | null | undefined, e: string | null | undefined) =>
    (ar ? a || e : e || a) || "";

  const create = async () => {
    if (!userId) return;
    if (!f.title_ar.trim() && !f.title_en.trim())
      return void toast.error(t("العنوان مطلوب", "A title is required"));
    setSaving(true);
    const { error } = await supabase.from("lms_assignments").insert({
      course_id: course.id,
      lesson_id: f.lesson_id || null,
      title_ar: f.title_ar.trim() || f.title_en.trim(),
      title_en: f.title_en.trim() || null,
      description_ar: f.description_ar.trim() || null,
      description_en: f.description_en.trim() || null,
      max_grade: parseInt(f.max_grade, 10) || 100,
      due_date: f.due_date ? new Date(f.due_date).toISOString() : null,
      created_by: userId,
    });
    setSaving(false);
    if (error) return void toast.error(toUserMessage(error));
    toast.success(t("أُنشئ الواجب", "Assignment created"));
    setF(EMPTY);
    onDone();
  };

  return (
    <div className="space-y-4 pb-8">
      <SheetHeader className="text-start">
        <SheetTitle>{t("واجب جديد", "New assignment")}</SheetTitle>
        <p className="text-[13px] text-[var(--cx-muted)]">
          {t("يمكن رفع ملف الواجب بعد إنشائه.", "You can attach the brief file once it's created.")}
        </p>
      </SheetHeader>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={t("العنوان بالعربية", "Title in Arabic")}>
          <Input
            dir="rtl"
            maxLength={200}
            value={f.title_ar}
            onChange={(e) => setF({ ...f, title_ar: e.target.value })}
          />
        </Field>
        <Field label={t("العنوان بالإنجليزية", "Title in English")}>
          <Input
            dir="ltr"
            maxLength={200}
            value={f.title_en}
            onChange={(e) => setF({ ...f, title_en: e.target.value })}
          />
        </Field>
      </div>
      <Field label={t("مرتبط بدرس (اختياري)", "Linked to a lesson (optional)")}>
        <select
          className="h-10 w-full rounded-[10px] border border-[var(--cx-line)] bg-[var(--cx-field)] px-3 text-[14px]"
          value={f.lesson_id}
          onChange={(e) => setF({ ...f, lesson_id: e.target.value })}
        >
          <option value="">{t("بلا درس محدد", "No specific lesson")}</option>
          {sections.map((s, si) => {
            const ls = lessons.filter((l) => l.section_id === s.id);
            if (!ls.length) return null;
            return (
              <optgroup
                key={s.id}
                label={pick(s.title_ar, s.title_en) || t(`القسم ${si + 1}`, `Section ${si + 1}`)}
              >
                {ls.map((l, li) => (
                  <option key={l.id} value={l.id}>
                    {pick(l.title_ar, l.title_en) || t(`الدرس ${li + 1}`, `Lesson ${li + 1}`)}
                  </option>
                ))}
              </optgroup>
            );
          })}
        </select>
      </Field>
      <Field label={t("الوصف بالعربية", "Description in Arabic")}>
        <Textarea
          rows={3}
          dir="rtl"
          maxLength={2000}
          value={f.description_ar}
          onChange={(e) => setF({ ...f, description_ar: e.target.value })}
        />
      </Field>
      <Field label={t("الوصف بالإنجليزية", "Description in English")}>
        <Textarea
          rows={3}
          dir="ltr"
          maxLength={2000}
          value={f.description_en}
          onChange={(e) => setF({ ...f, description_en: e.target.value })}
        />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={t("العلامة العظمى", "Max grade")}>
          <Input
            type="number"
            min={1}
            max={1000}
            value={f.max_grade}
            onChange={(e) => setF({ ...f, max_grade: e.target.value })}
          />
        </Field>
        <Field label={t("موعد التسليم (اختياري)", "Due (optional)")}>
          <div className="relative">
            <CalendarClock className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--cx-muted)]" />
            <Input
              type="datetime-local"
              dir="ltr"
              className="ps-9"
              value={f.due_date}
              onChange={(e) => setF({ ...f, due_date: e.target.value })}
            />
          </div>
        </Field>
      </div>
      <Button className="w-full" size="lg" onClick={create} disabled={saving}>
        {saving && <Loader2 className="h-4 w-4 animate-spin" />}
        {t("إنشاء الواجب", "Create assignment")}
      </Button>
    </div>
  );
}
