import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  ArrowDown,
  ArrowUp,
  Check,
  ClipboardList,
  FileUp,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toUserMessage } from "@/lib/safe-error";
import { confirmDialog } from "@/hooks/useConfirm";
import { QuizBulkImportDialog } from "@/components/lms/QuizBulkImportDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { EmptyState, Field, Panel, Pill, fmtNum, useT } from "@/components/console/ui";

type Quiz = {
  id: string;
  title: string;
  pass_score: number;
  version: number;
  max_attempts: number;
  cooldown_minutes: number;
  ams_session_id: string | null;
  lms_section_id: string | null;
};
type Question = {
  id: string;
  question: string;
  choices: unknown;
  correct_index: number;
  display_order: number;
};
type Section = { id: string; title: string; title_ar: string | null; title_en: string | null };
type Session = { id: string; lms_section_id: string | null };

const QUIZ_COLS =
  "id,title,pass_score,version,max_attempts,cooldown_minutes,ams_session_id,lms_section_id";
const LETTERS = "ABCDEF";

/* A course's quizzes as a short list. "New quiz" asks three things, then the
   quiz opens in a side panel where questions are written one card at a time.
   Nothing is saved unless it changed: every save makes a new quiz version. */
export function QuizzesPanel({ courseId, onChange }: { courseId: string; onChange?: () => void }) {
  const { t, ar, lang } = useT();
  const [quizzes, setQuizzes] = useState<Quiz[] | null>(null);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [sections, setSections] = useState<Section[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    const [{ data: qz }, { data: secs }, { data: ams }] = await Promise.all([
      supabase.from("lms_quizzes").select(QUIZ_COLS).eq("course_id", courseId).order("created_at"),
      supabase
        .from("lms_sections")
        .select("id,title,title_ar,title_en")
        .eq("course_id", courseId)
        .order("display_order"),
      supabase.from("ams_courses").select("id").eq("lms_course_id", courseId).maybeSingle(),
    ]);
    const list = (qz as Quiz[]) ?? [];
    setSections((secs as Section[]) ?? []);
    if (ams) {
      const { data: ss } = await supabase
        .from("ams_sessions")
        .select("id,lms_section_id")
        .eq("course_id", (ams as { id: string }).id);
      setSessions((ss as Session[]) ?? []);
    }
    if (list.length) {
      const { data: qs } = await supabase
        .from("lms_quiz_questions")
        .select("quiz_id")
        .in(
          "quiz_id",
          list.map((q) => q.id),
        );
      const c: Record<string, number> = {};
      for (const r of (qs as { quiz_id: string }[]) ?? []) c[r.quiz_id] = (c[r.quiz_id] ?? 0) + 1;
      setCounts(c);
    }
    setQuizzes(list);
    onChange?.();
  }, [courseId, onChange]);
  useEffect(() => {
    load();
  }, [load]);

  const sectionName = (id: string | null) => {
    if (!id) return t("الدورة كلها", "Whole course");
    const s = sections.find((x) => x.id === id);
    return s
      ? ar
        ? s.title_ar || s.title
        : s.title_en || s.title
      : t("قسم محذوف", "Deleted section");
  };
  const sessionFor = (sectionId: string | null) =>
    sectionId ? (sessions.find((s) => s.lms_section_id === sectionId)?.id ?? null) : null;

  const remove = async (q: Quiz) => {
    const ok = await confirmDialog({
      title: t(`حذف «${q.title}»؟`, `Delete “${q.title}”?`),
      description: t(
        "تُحذف أسئلته ومحاولات الطلاب عليه. لا يمكن التراجع.",
        "Its questions and the students' attempts go too. This cannot be undone.",
      ),
      confirmLabel: t("حذف", "Delete"),
      destructive: true,
    });
    if (!ok) return;
    const { error } = await supabase.from("lms_quizzes").delete().eq("id", q.id);
    if (error) return void toast.error(toUserMessage(error));
    toast.success(t("حُذف الاختبار", "Quiz deleted"));
    if (open === q.id) setOpen(null);
    load();
  };

  const current = quizzes?.find((q) => q.id === open) ?? null;

  return (
    <Panel
      title={t("الاختبارات", "Quizzes")}
      description={t(
        "اختبارات اختيار من متعدد. يمكن ربط كل اختبار بقسم من الدورة.",
        "Multiple-choice quizzes. Each one can belong to a section of the course.",
      )}
      actions={
        <Button size="sm" onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4" />
          {t("اختبار جديد", "New quiz")}
        </Button>
      }
      flush
    >
      {quizzes === null ? null : quizzes.length === 0 ? (
        <EmptyState compact icon={ClipboardList} title={t("لا اختبارات بعد", "No quizzes yet")} />
      ) : (
        <ul className="divide-y divide-[var(--cx-line-2)]">
          {quizzes.map((q) => {
            const n = counts[q.id] ?? 0;
            return (
              <li key={q.id} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
                <button
                  type="button"
                  onClick={() => setOpen(q.id)}
                  className="flex min-w-0 flex-1 items-center gap-3 text-start"
                >
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--cx-teal-50)] text-[var(--cx-teal)]">
                    <ClipboardList className="h-5 w-5" />
                  </span>
                  <span className="min-w-0">
                    <span
                      className="block truncate font-extrabold hover:text-[var(--cx-teal)]"
                      dir="auto"
                    >
                      {q.title || t("اختبار", "Quiz")}
                    </span>
                    <span className="block truncate text-[12.5px] text-[var(--cx-muted)]">
                      {sectionName(q.lms_section_id)} ·{" "}
                      {t(`النجاح ${q.pass_score}%`, `pass ${q.pass_score}%`)} ·{" "}
                      {t(`${q.max_attempts} محاولات`, `${q.max_attempts} attempts`)}
                    </span>
                  </span>
                </button>
                {n === 0 ? (
                  <Pill tone="orange">{t("بلا أسئلة", "No questions")}</Pill>
                ) : (
                  <Pill tone="teal">
                    {t(`${fmtNum(n, lang)} سؤال`, `${fmtNum(n, lang)} questions`)}
                  </Pill>
                )}
                <Button size="sm" variant="outline" onClick={() => setOpen(q.id)}>
                  <Pencil className="h-4 w-4" />
                  {t("فتح", "Open")}
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-[var(--cx-muted)] hover:text-[var(--cx-red)]"
                  onClick={() => remove(q)}
                  aria-label={t("حذف", "Delete")}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </li>
            );
          })}
        </ul>
      )}

      <NewQuiz
        open={creating}
        onClose={() => setCreating(false)}
        courseId={courseId}
        sections={sections}
        sectionName={sectionName}
        sessionFor={sessionFor}
        defaultTitle={t(
          `اختبار ${(quizzes?.length ?? 0) + 1}`,
          `Quiz ${(quizzes?.length ?? 0) + 1}`,
        )}
        onCreated={async (id) => {
          setCreating(false);
          await load();
          setOpen(id);
        }}
      />

      <Sheet
        open={!!current}
        onOpenChange={(v) => {
          if (!v) {
            setOpen(null);
            load();
          }
        }}
      >
        <SheetContent
          side={ar ? "left" : "right"}
          className="w-full overflow-y-auto sm:max-w-3xl"
          dir={ar ? "rtl" : "ltr"}
        >
          {current && (
            <QuizEditor
              key={current.id}
              quiz={current}
              sections={sections}
              sectionName={sectionName}
              sessionFor={sessionFor}
              onChanged={(q) => setQuizzes((l) => (l ?? []).map((x) => (x.id === q.id ? q : x)))}
            />
          )}
        </SheetContent>
      </Sheet>
    </Panel>
  );
}

function SectionSelect({
  value,
  onChange,
  sections,
  sectionName,
}: {
  value: string | null;
  onChange: (v: string | null) => void;
  sections: Section[];
  sectionName: (id: string | null) => string;
}) {
  const { t } = useT();
  return (
    <select
      className="h-10 w-full rounded-[10px] border border-[var(--cx-line)] bg-[var(--cx-field)] px-3 text-[14px]"
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value || null)}
    >
      <option value="">{t("الدورة كلها (بلا قسم)", "Whole course (no section)")}</option>
      {sections.map((s) => (
        <option key={s.id} value={s.id}>
          {sectionName(s.id)}
        </option>
      ))}
    </select>
  );
}

function NewQuiz({
  open,
  onClose,
  courseId,
  sections,
  sectionName,
  sessionFor,
  defaultTitle,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  courseId: string;
  sections: Section[];
  sectionName: (id: string | null) => string;
  sessionFor: (id: string | null) => string | null;
  defaultTitle: string;
  onCreated: (id: string) => void;
}) {
  const { t, ar } = useT();
  const [title, setTitle] = useState("");
  const [section, setSection] = useState<string | null>(null);
  const [pass, setPass] = useState(60);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setTitle("");
      setSection(null);
      setPass(60);
    }
  }, [open]);

  const create = async () => {
    setSaving(true);
    const { data, error } = await supabase
      .from("lms_quizzes")
      .insert({
        course_id: courseId,
        title: title.trim() || (section ? sectionName(section) : defaultTitle),
        pass_score: Math.min(100, Math.max(0, pass)),
        lms_section_id: section,
        ams_session_id: sessionFor(section),
      })
      .select("id")
      .maybeSingle();
    setSaving(false);
    if (error || !data) return void toast.error(toUserMessage(error));
    toast.success(t("أُنشئ الاختبار. أضف الأسئلة الآن.", "Quiz created. Now add the questions."));
    onCreated((data as { id: string }).id);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && !saving && onClose()}>
      <DialogContent className="max-w-md" dir={ar ? "rtl" : "ltr"}>
        <DialogHeader>
          <DialogTitle>{t("اختبار جديد", "New quiz")}</DialogTitle>
          <DialogDescription>
            {t(
              "ثلاثة أشياء فقط، ثم تكتب الأسئلة.",
              "Just three things, then you write the questions.",
            )}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Field label={t("لأي قسم؟", "For which section?")}>
            <SectionSelect
              value={section}
              onChange={setSection}
              sections={sections}
              sectionName={sectionName}
            />
          </Field>
          <Field
            label={t("اسم الاختبار", "Quiz name")}
            hint={t("اتركه فارغاً ليأخذ اسم القسم.", "Leave empty to use the section's name.")}
          >
            <Input
              autoFocus
              value={title}
              maxLength={200}
              dir="auto"
              placeholder={section ? sectionName(section) : defaultTitle}
              onChange={(e) => setTitle(e.target.value)}
            />
          </Field>
          <Field label={t("درجة النجاح", "Pass mark")}>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={0}
                max={100}
                className="w-24"
                value={pass}
                onChange={(e) => setPass(Number(e.target.value) || 0)}
              />
              <span className="text-[13px] text-[var(--cx-muted)]">%</span>
            </div>
          </Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            {t("إلغاء", "Cancel")}
          </Button>
          <Button onClick={create} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {t("إنشاء وكتابة الأسئلة", "Create and write questions")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function QuizEditor({
  quiz,
  sections,
  sectionName,
  sessionFor,
  onChanged,
}: {
  quiz: Quiz;
  sections: Section[];
  sectionName: (id: string | null) => string;
  sessionFor: (id: string | null) => string | null;
  onChanged: (q: Quiz) => void;
}) {
  const { t, ar } = useT();
  const [q, setQ] = useState(quiz);
  const [questions, setQuestions] = useState<Question[] | null>(null);
  const [importing, setImporting] = useState(false);
  const [focusId, setFocusId] = useState<string | null>(null);

  const loadQuestions = useCallback(async () => {
    const { data } = await supabase
      .from("lms_quiz_questions")
      .select("id,question,choices,correct_index,display_order")
      .eq("quiz_id", quiz.id)
      .order("display_order");
    setQuestions((data as Question[]) ?? []);
  }, [quiz.id]);
  useEffect(() => {
    loadQuestions();
  }, [loadQuestions]);

  const saved = useRef(quiz);
  /** Saves quiz settings only when they really changed. */
  const saveQuiz = async (patch: Partial<Quiz>) => {
    const changed = Object.fromEntries(
      Object.entries(patch).filter(([k, v]) => saved.current[k as keyof Quiz] !== v),
    );
    const next = { ...q, ...patch };
    setQ(next);
    if (!Object.keys(changed).length) return;
    const { error } = await supabase
      .from("lms_quizzes")
      .update(changed as never)
      .eq("id", quiz.id);
    if (error) return void toast.error(toUserMessage(error));
    saved.current = { ...saved.current, ...changed };
    onChanged(next);
  };

  const addQuestion = async () => {
    if (!questions) return;
    const { data, error } = await supabase
      .from("lms_quiz_questions")
      .insert({
        quiz_id: quiz.id,
        question: "",
        choices: ["", "", "", ""],
        correct_index: 0,
        display_order: questions.length,
      })
      .select("id,question,choices,correct_index,display_order")
      .maybeSingle();
    if (error || !data) return void toast.error(toUserMessage(error));
    setQuestions([...questions, data as Question]);
    setFocusId((data as Question).id);
  };

  const saveQuestion = async (
    id: string,
    patch: Partial<Pick<Question, "question" | "choices" | "correct_index" | "display_order">>,
  ) => {
    const { error } = await supabase
      .from("lms_quiz_questions")
      .update(patch as never)
      .eq("id", id);
    if (error) toast.error(toUserMessage(error));
  };

  const removeQuestion = async (id: string) => {
    const ok = await confirmDialog({
      title: t("حذف هذا السؤال؟", "Delete this question?"),
      confirmLabel: t("حذف", "Delete"),
      destructive: true,
    });
    if (!ok) return;
    const { error } = await supabase.from("lms_quiz_questions").delete().eq("id", id);
    if (error) return void toast.error(toUserMessage(error));
    setQuestions((l) => (l ?? []).filter((x) => x.id !== id));
  };

  const move = async (i: number, d: -1 | 1) => {
    if (!questions) return;
    const j = i + d;
    if (j < 0 || j >= questions.length) return;
    const next = questions.slice();
    [next[i], next[j]] = [next[j], next[i]];
    setQuestions(next);
    await Promise.all([
      saveQuestion(next[i].id, { display_order: i }),
      saveQuestion(next[j].id, { display_order: j }),
    ]);
  };

  const incomplete = (questions ?? []).filter((x) => {
    const c = Array.isArray(x.choices) ? (x.choices as string[]) : [];
    return (
      !x.question.trim() || c.filter((s) => s.trim()).length < 2 || !c[x.correct_index]?.trim()
    );
  }).length;

  return (
    <div className="space-y-5 pb-10">
      <SheetHeader className="text-start">
        <SheetTitle>
          <input
            className="w-full bg-transparent text-[20px] font-extrabold outline-none focus:border-b focus:border-[var(--cx-teal)]"
            value={q.title}
            maxLength={200}
            dir="auto"
            onChange={(e) => setQ({ ...q, title: e.target.value })}
            onBlur={() => q.title.trim() && saveQuiz({ title: q.title.trim() })}
            aria-label={t("اسم الاختبار", "Quiz name")}
          />
        </SheetTitle>
        <p className="text-[12.5px] text-[var(--cx-muted)]">
          {t(
            "كل تعديل يُحفظ فوراً. محاولات الطلاب السابقة تبقى مصحّحة على النسخة التي أدّوها.",
            "Every change saves at once. Students' earlier attempts stay graded on the version they took.",
          )}
        </p>
      </SheetHeader>

      <div className="grid gap-3 rounded-2xl border border-[var(--cx-line)] bg-[var(--cx-raise)] p-4 sm:grid-cols-4">
        <Field label={t("القسم", "Section")} className="sm:col-span-4">
          <SectionSelect
            value={q.lms_section_id}
            onChange={(v) => saveQuiz({ lms_section_id: v, ams_session_id: sessionFor(v) })}
            sections={sections}
            sectionName={sectionName}
          />
        </Field>
        <Field label={t("النجاح %", "Pass %")}>
          <Input
            type="number"
            min={0}
            max={100}
            value={q.pass_score}
            onChange={(e) => setQ({ ...q, pass_score: Number(e.target.value) || 0 })}
            onBlur={() => saveQuiz({ pass_score: Math.min(100, Math.max(0, q.pass_score)) })}
          />
        </Field>
        <Field label={t("المحاولات", "Attempts")}>
          <Input
            type="number"
            min={1}
            max={20}
            value={q.max_attempts}
            onChange={(e) => setQ({ ...q, max_attempts: Number(e.target.value) || 1 })}
            onBlur={() => saveQuiz({ max_attempts: Math.min(20, Math.max(1, q.max_attempts)) })}
          />
        </Field>
        <Field
          label={t("انتظار بين المحاولات (دقيقة)", "Wait between attempts (min)")}
          className="sm:col-span-2"
        >
          <Input
            type="number"
            min={0}
            max={43200}
            value={q.cooldown_minutes}
            onChange={(e) => setQ({ ...q, cooldown_minutes: Number(e.target.value) || 0 })}
            onBlur={() =>
              saveQuiz({ cooldown_minutes: Math.min(43200, Math.max(0, q.cooldown_minutes)) })
            }
          />
        </Field>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-[16px] font-extrabold">
          {t("الأسئلة", "Questions")}{" "}
          <span className="text-[var(--cx-muted)]">({questions?.length ?? "…"})</span>
        </h3>
        {incomplete > 0 && (
          <Pill tone="orange">{t(`${incomplete} ناقص`, `${incomplete} incomplete`)}</Pill>
        )}
      </div>

      {questions === null ? null : questions.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--cx-line)] p-6 text-center text-[14px] text-[var(--cx-muted)]">
          {t(
            "لا أسئلة بعد. اكتب أول سؤال أو استورد ملفاً.",
            "No questions yet. Write the first one or import a file.",
          )}
        </div>
      ) : (
        <ol className="space-y-3">
          {questions.map((x, i) => (
            <QuestionCard
              key={x.id}
              n={i + 1}
              q={x}
              first={i === 0}
              last={i === questions.length - 1}
              autoFocus={focusId === x.id}
              onSave={(patch) => {
                setQuestions((l) => (l ?? []).map((y) => (y.id === x.id ? { ...y, ...patch } : y)));
                saveQuestion(x.id, patch);
              }}
              onMove={(d) => move(i, d)}
              onDelete={() => removeQuestion(x.id)}
            />
          ))}
        </ol>
      )}

      <div className="flex flex-wrap gap-2">
        <Button onClick={addQuestion}>
          <Plus className="h-4 w-4" />
          {t("سؤال جديد", "New question")}
        </Button>
        <Button variant="outline" onClick={() => setImporting(true)}>
          <FileUp className="h-4 w-4" />
          {t("استيراد أسئلة من ملف", "Import questions from a file")}
        </Button>
      </div>

      <QuizBulkImportDialog
        open={importing}
        onOpenChange={setImporting}
        quizId={quiz.id}
        startOrder={questions?.length ?? 0}
        ar={ar}
        onImported={loadQuestions}
      />
    </div>
  );
}

/** One question: its text, its choices, and a tap on a choice to mark it correct. */
function QuestionCard({
  n,
  q,
  first,
  last,
  autoFocus,
  onSave,
  onMove,
  onDelete,
}: {
  n: number;
  q: Question;
  first: boolean;
  last: boolean;
  autoFocus: boolean;
  onSave: (patch: Partial<Pick<Question, "question" | "choices" | "correct_index">>) => void;
  onMove: (d: -1 | 1) => void;
  onDelete: () => void;
}) {
  const { t } = useT();
  const saved = useRef({
    question: q.question,
    choices: Array.isArray(q.choices) ? (q.choices as string[]) : [],
  });
  const [text, setText] = useState(q.question);
  const [choices, setChoices] = useState<string[]>(saved.current.choices);
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (autoFocus) ref.current?.focus();
  }, [autoFocus]);

  const commitText = () => {
    if (text === saved.current.question) return;
    saved.current.question = text;
    onSave({ question: text });
  };
  const commitChoices = (next = choices, correct?: number) => {
    const same = JSON.stringify(next) === JSON.stringify(saved.current.choices);
    if (same && correct === undefined) return;
    saved.current.choices = next;
    onSave(correct === undefined ? { choices: next } : { choices: next, correct_index: correct });
  };
  const removeChoice = (idx: number) => {
    const next = choices.filter((_, i) => i !== idx);
    const correct =
      q.correct_index === idx ? 0 : q.correct_index > idx ? q.correct_index - 1 : q.correct_index;
    setChoices(next);
    commitChoices(next, correct);
  };
  const addChoice = () => {
    const next = [...choices, ""];
    setChoices(next);
    commitChoices(next);
  };

  return (
    <li className="cx-card p-4">
      <div className="flex items-start gap-3">
        <span className="mt-2 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-[var(--cx-raise-2)] text-[13px] font-extrabold">
          {n}
        </span>
        <Textarea
          ref={ref}
          rows={2}
          dir="auto"
          value={text}
          placeholder={t("اكتب السؤال…", "Write the question…")}
          onChange={(e) => setText(e.target.value)}
          onBlur={commitText}
          className="min-h-[60px] flex-1 text-[15px] font-semibold"
        />
        <div className="flex shrink-0 flex-col gap-1">
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            disabled={first}
            onClick={() => onMove(-1)}
            aria-label={t("أعلى", "Up")}
          >
            <ArrowUp className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            disabled={last}
            onClick={() => onMove(1)}
            aria-label={t("أسفل", "Down")}
          >
            <ArrowDown className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-7 w-7 text-[var(--cx-muted)] hover:text-[var(--cx-red)]"
            onClick={onDelete}
            aria-label={t("حذف", "Delete")}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <ul className="mt-3 space-y-2 ps-10">
        {choices.map((c, idx) => {
          const correct = q.correct_index === idx;
          return (
            <li
              key={idx}
              className={`flex items-center gap-2 rounded-xl border px-2 py-1.5 transition-colors ${correct ? "border-[var(--cx-green)] bg-[var(--cx-green-50)]" : "border-[var(--cx-line)]"}`}
            >
              <button
                type="button"
                onClick={() => !correct && commitChoices(choices, idx)}
                className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-[12px] font-extrabold ${correct ? "bg-[var(--cx-olive)] text-white" : "bg-[var(--cx-raise-2)] text-[var(--cx-muted)] hover:text-[var(--cx-ink)]"}`}
                aria-label={t("اجعلها الإجابة الصحيحة", "Make this the correct answer")}
                title={t("اجعلها الإجابة الصحيحة", "Make this the correct answer")}
              >
                {correct ? <Check className="h-4 w-4" /> : LETTERS[idx]}
              </button>
              <input
                className="h-8 min-w-0 flex-1 bg-transparent text-[14px] outline-none"
                dir="auto"
                value={c}
                placeholder={t(`الخيار ${LETTERS[idx]}`, `Choice ${LETTERS[idx]}`)}
                onChange={(e) =>
                  setChoices(choices.map((x, i) => (i === idx ? e.target.value : x)))
                }
                onBlur={() => commitChoices()}
              />
              {correct && (
                <span className="hidden text-[12px] font-bold text-[var(--cx-green)] sm:inline">
                  {t("الصحيحة", "Correct")}
                </span>
              )}
              {choices.length > 2 && (
                <button
                  type="button"
                  onClick={() => removeChoice(idx)}
                  className="rounded p-1 text-[var(--cx-faint)] hover:text-[var(--cx-red)]"
                  aria-label={t("حذف الخيار", "Remove choice")}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </li>
          );
        })}
      </ul>
      {choices.length < 6 && (
        <button
          type="button"
          onClick={addChoice}
          className="ms-10 mt-2 inline-flex items-center gap-1 text-[12.5px] font-bold text-[var(--cx-teal)] hover:underline"
        >
          <Plus className="h-3.5 w-3.5" />
          {t("خيار آخر", "Another choice")}
        </button>
      )}
    </li>
  );
}
