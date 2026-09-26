import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ExternalLink,
  ImagePlus,
  Link2,
  Loader2,
  Plus,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLmsAuth } from "@/hooks/useLmsAuth";
import { useRecordDraft } from "@/hooks/useFormDraft";
import { formDraftKey } from "@/lib/form-draft";
import { confirmDialog } from "@/hooks/useConfirm";
import { DraftNotice } from "@/components/admin/DraftNotice";
import {
  COVER_MAX_BYTES,
  COVER_MIME_TYPES,
  LIFECYCLE,
  QUESTION_KINDS,
  REQUIRED_PROFILE_FIELDS,
  canTransition,
  type Lifecycle,
  type OpportunityInput,
  type QuestionInput,
} from "@/lib/lms-internships-admin";
import {
  adminDeleteInternship,
  adminGetCoverSignedUrl,
  adminGetInternship,
  adminUpsertInternship,
} from "@/lib/lms-internships-admin.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  ErrorNote,
  Field,
  LangSwitch,
  Loading,
  PageHeader,
  Panel,
  Pill,
  SaveBar,
  ToggleRow,
  fmtNum,
  useT,
} from "@/components/console/ui";
import {
  LIFECYCLE_UI,
  PROFILE_FIELD_UI,
  QUESTION_KIND_UI,
  internshipError,
} from "@/features/internships/shared";

export const Route = createFileRoute("/learning-management-system/admin/internships/$id/edit")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Internship — Admin — SAAE" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: InternshipEditor,
});

type V = OpportunityInput;
type L = "ar" | "en";

function InternshipEditor() {
  const { id } = Route.useParams();
  const { t, ar, lang } = useT();
  const navigate = useNavigate();
  const { user } = useLmsAuth();
  const getFn = useServerFn(adminGetInternship);
  const saveFn = useServerFn(adminUpsertInternship);
  const deleteFn = useServerFn(adminDeleteInternship);
  const [loaded, setLoaded] = useState<V | null>(null);
  const [v, setV] = useState<V | null>(null);
  const [apps, setApps] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [tl, setTl] = useState<L>(lang);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await getFn({ data: { id } });
      const o = res.opportunity;
      const next: V = {
        id: o.id,
        title_ar: o.title_ar,
        title_en: o.title_en,
        slug: o.slug,
        summary_ar: o.summary_ar,
        summary_en: o.summary_en,
        description_ar: o.description_ar,
        description_en: o.description_en,
        requirements_ar: o.requirements_ar,
        requirements_en: o.requirements_en,
        location_ar: o.location_ar,
        location_en: o.location_en,
        duration_ar: o.duration_ar,
        duration_en: o.duration_en,
        stipend_ar: o.stipend_ar,
        stipend_en: o.stipend_en,
        capacity: o.capacity,
        starts_at: o.starts_at,
        ends_at: o.ends_at,
        opens_at: o.opens_at,
        deadline_at: o.deadline_at,
        status: o.status,
        require_cv: o.require_cv,
        allow_reapply: o.allow_reapply,
        required_profile_fields: o.required_profile_fields ?? [],
        cover_image_bucket: o.cover_image_bucket,
        cover_image_path: o.cover_image_path,
        questions: (res.questions ?? []).map(
          (q: QuestionInput & { options: unknown }, i: number) => ({
            id: q.id,
            label_ar: q.label_ar,
            label_en: q.label_en,
            help_ar: q.help_ar,
            help_en: q.help_en,
            kind: q.kind,
            is_required: q.is_required,
            options: Array.isArray(q.options) ? (q.options as string[]) : [],
            sort_order: q.sort_order ?? i,
          }),
        ),
      };
      setApps(res.applications_count);
      setLoaded(next);
      setV(next);
    } catch (e) {
      setError(internshipError(e, ar));
    }
  }, [getFn, id, ar]);
  useEffect(() => {
    load();
  }, [load]);

  const draft = useRecordDraft({
    key: formDraftKey(user?.id, "lms-internship", id),
    loaded,
    current: v,
    apply: setV,
  });
  const dirty = useMemo(
    () => !!v && !!loaded && JSON.stringify(v) !== JSON.stringify(loaded),
    [v, loaded],
  );

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  if (error) return <ErrorNote text={error} onRetry={load} />;
  if (!v || !loaded) return <Loading />;

  const set = <K extends keyof V>(k: K, val: V[K]) => setV((p) => (p ? { ...p, [k]: val } : p));
  const txt = (
    base:
      "title" | "summary" | "description" | "requirements" | "location" | "duration" | "stipend",
  ) => `${base}_${tl}` as keyof V;
  const str = (k: keyof V) => (v[k] as string | null | undefined) ?? "";
  const setStr = (k: keyof V, s: string, nullable = true) =>
    set(k, (nullable && !s ? null : s) as never);
  const missing = {
    ar: !v.title_ar.trim() || v.questions.some((q) => !q.label_ar.trim()),
    en: !v.title_en.trim() || v.questions.some((q) => !q.label_en.trim()),
  };

  const save = async () => {
    if (missing.ar || missing.en) {
      setTl(missing.ar ? "ar" : "en");
      return void toast.error(
        t(
          "العنوان ونص كل سؤال مطلوبان باللغتين",
          "The title and every question are needed in both languages",
        ),
      );
    }
    if (
      (v.opens_at && v.deadline_at && v.opens_at > v.deadline_at) ||
      (v.starts_at && v.ends_at && v.starts_at > v.ends_at)
    ) {
      return void toast.error(
        t(
          "التواريخ غير متسقة: البداية بعد النهاية",
          "Dates don't add up: a start is after its end",
        ),
      );
    }
    setSaving(true);
    try {
      const payload: V = {
        ...v,
        id,
        questions: v.questions.map((q, i) => ({ ...q, sort_order: i })),
      };
      await saveFn({ data: payload });
      draft.clear();
      toast.success(t("حُفظت الفرصة", "Internship saved"));
      await load();
    } catch (e) {
      toast.error(internshipError(e, ar));
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    const ok = await confirmDialog({
      title: t("حذف هذه الفرصة نهائياً؟", "Delete this internship for good?"),
      description: apps
        ? t(
            "لها طلبات، لذلك لا يمكن حذفها. أرشفها بدلاً من ذلك.",
            "It has applications, so it can't be deleted. Archive it instead.",
          )
        : t("لا يمكن التراجع.", "This cannot be undone."),
      confirmLabel: t("حذف", "Delete"),
      destructive: true,
    });
    if (!ok) return;
    try {
      await deleteFn({ data: { id } });
      draft.clear();
      toast.success(t("حُذفت", "Deleted"));
      navigate({ to: "/learning-management-system/admin/internships" });
    } catch (e) {
      toast.error(internshipError(e, ar));
    }
  };

  const st = LIFECYCLE_UI[loaded.status];

  return (
    <div>
      <PageHeader
        back={{
          to: "/learning-management-system/admin/internships",
          label: t("فرص التدريب", "Internships"),
        }}
        eyebrow={t("منصّة التعلّم · فرصة تدريب", "Learning · Internship")}
        title={(ar ? v.title_ar : v.title_en) || t("بلا عنوان", "Untitled")}
        meta={
          <>
            <Pill tone={st.tone}>{ar ? st.ar : st.en}</Pill>
            <span className="font-mono text-[12.5px] text-[var(--cx-muted)]" dir="ltr">
              /internships/{loaded.slug}
            </span>
          </>
        }
        actions={
          <>
            <Button asChild variant="outline">
              <Link to="/learning-management-system/admin/internships/$id/signups" params={{ id }}>
                <Link2 className="h-4 w-4" />
                {t("رابط خارجي", "External link")}
              </Link>
            </Button>
            <Button asChild>
              <Link
                to="/learning-management-system/admin/internships/$id/applications"
                params={{ id }}
              >
                <Users className="h-4 w-4" />
                {t(`الطلبات (${fmtNum(apps, lang)})`, `Applications (${fmtNum(apps, lang)})`)}
              </Link>
            </Button>
          </>
        }
      />
      <DraftNotice show={draft.restored} onDiscard={draft.discard} />

      <div className="mt-2 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-[13.5px] text-[var(--cx-muted)]">
              {t(
                "النصوص بلغة واحدة في كل مرة. النقطة البرتقالية تعني نصاً ناقصاً.",
                "Text in one language at a time. An orange dot means something is missing.",
              )}
            </p>
            <LangSwitch value={tl} onChange={setTl} missing={missing} />
          </div>

          <Section n={1} title={t("ما هي الفرصة؟", "What is it?")}>
            <Field label={t("العنوان", "Title")}>
              <Input
                dir={tl === "ar" ? "rtl" : "ltr"}
                maxLength={200}
                value={str(txt("title"))}
                onChange={(e) => setStr(txt("title"), e.target.value, false)}
              />
            </Field>
            <Field
              label={t("ملخّص قصير", "Short summary")}
              hint={t("يظهر على بطاقة الفرصة.", "Shown on the internship card.")}
            >
              <Textarea
                rows={2}
                maxLength={400}
                dir={tl === "ar" ? "rtl" : "ltr"}
                value={str(txt("summary"))}
                onChange={(e) => setStr(txt("summary"), e.target.value)}
              />
            </Field>
            <Field label={t("الوصف", "Description")}>
              <Textarea
                rows={7}
                maxLength={10000}
                dir={tl === "ar" ? "rtl" : "ltr"}
                value={str(txt("description"))}
                onChange={(e) => setStr(txt("description"), e.target.value)}
              />
            </Field>
            <Field label={t("المتطلّبات", "Requirements")}>
              <Textarea
                rows={4}
                maxLength={4000}
                dir={tl === "ar" ? "rtl" : "ltr"}
                value={str(txt("requirements"))}
                onChange={(e) => setStr(txt("requirements"), e.target.value)}
              />
            </Field>
          </Section>

          <Section n={2} title={t("التفاصيل العملية", "Practical details")}>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label={t("المكان", "Location")}>
                <Input
                  dir={tl === "ar" ? "rtl" : "ltr"}
                  maxLength={200}
                  value={str(txt("location"))}
                  onChange={(e) => setStr(txt("location"), e.target.value)}
                />
              </Field>
              <Field label={t("المدّة", "Duration")}>
                <Input
                  dir={tl === "ar" ? "rtl" : "ltr"}
                  maxLength={200}
                  value={str(txt("duration"))}
                  onChange={(e) => setStr(txt("duration"), e.target.value)}
                />
              </Field>
              <Field label={t("المكافأة", "Stipend")}>
                <Input
                  dir={tl === "ar" ? "rtl" : "ltr"}
                  maxLength={200}
                  value={str(txt("stipend"))}
                  onChange={(e) => setStr(txt("stipend"), e.target.value)}
                />
              </Field>
            </div>
            <Field
              label={t("عدد المقاعد", "Places")}
              hint={t("اتركه فارغاً إن لم يكن محدوداً.", "Leave empty if there is no limit.")}
              className="max-w-[200px]"
            >
              <Input
                type="number"
                min={0}
                dir="ltr"
                value={v.capacity ?? ""}
                onChange={(e) =>
                  set("capacity", e.target.value === "" ? null : Number(e.target.value))
                }
              />
            </Field>
          </Section>

          <Section n={3} title={t("المواعيد", "Dates")}>
            <ol className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {(
                [
                  ["opens_at", t("يبدأ التقديم", "Applications open")],
                  ["deadline_at", t("آخر موعد للتقديم", "Deadline")],
                  ["starts_at", t("يبدأ التدريب", "Internship starts")],
                  ["ends_at", t("ينتهي التدريب", "Internship ends")],
                ] as const
              ).map(([k, label], i) => (
                <li
                  key={k}
                  className="relative rounded-2xl border border-[var(--cx-line)] bg-[var(--cx-raise)] p-3"
                >
                  <div className="mb-1.5 flex items-center gap-2 text-[12.5px] font-bold text-[var(--cx-ink-2)]">
                    <span className="grid h-5 w-5 place-items-center rounded-full bg-[var(--cx-teal-50)] text-[11px] text-[var(--cx-teal)]">
                      {i + 1}
                    </span>
                    {label}
                  </div>
                  <DateTimeInput value={v[k]} onChange={(x) => set(k, x)} />
                </li>
              ))}
            </ol>
          </Section>

          <Section n={4} title={t("كيف يتقدّمون", "How people apply")}>
            <ToggleRow
              id="i-cv"
              label={t("السيرة الذاتية مطلوبة", "CV required")}
              checked={v.require_cv}
              onChange={(x) => set("require_cv", x)}
            />
            <ToggleRow
              id="i-re"
              label={t("السماح بإعادة التقديم", "Allow applying again")}
              hint={t("بعد الرفض أو السحب.", "After a rejection or withdrawal.")}
              checked={v.allow_reapply}
              onChange={(x) => set("allow_reapply", x)}
            />
            <div>
              <div className="mb-2 text-[13px] font-bold text-[var(--cx-ink-2)]">
                {t(
                  "من الملف الشخصي، يجب أن يكون مكتملاً:",
                  "From their profile, these must be filled:",
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {REQUIRED_PROFILE_FIELDS.map((f) => {
                  const on = v.required_profile_fields.includes(f);
                  return (
                    <button
                      key={f}
                      type="button"
                      aria-pressed={on}
                      onClick={() =>
                        set(
                          "required_profile_fields",
                          on
                            ? v.required_profile_fields.filter((x) => x !== f)
                            : [...v.required_profile_fields, f],
                        )
                      }
                      className={`rounded-full border px-3.5 py-1.5 text-[13px] font-bold transition-colors ${on ? "border-[var(--cx-teal)] bg-[var(--cx-petrol)] text-white" : "border-[var(--cx-line)] text-[var(--cx-ink-2)] hover:border-[var(--cx-teal)]"}`}
                    >
                      {ar ? PROFILE_FIELD_UI[f].ar : PROFILE_FIELD_UI[f].en}
                    </button>
                  );
                })}
              </div>
            </div>
          </Section>

          <Section
            n={5}
            title={t("أسئلة إضافية", "Extra questions")}
            description={t(
              "تظهر في نموذج التقديم بعد بيانات الملف الشخصي.",
              "Shown on the application form after the profile details.",
            )}
          >
            <Questions list={v.questions} onChange={(qs) => set("questions", qs)} tl={tl} />
          </Section>
        </div>

        <aside className="space-y-6 lg:sticky lg:top-6 lg:self-start">
          <Panel
            title={t("الحالة", "Status")}
            description={t("تُطبَّق عند الحفظ.", "Applied when you save.")}
          >
            <div className="space-y-2">
              {LIFECYCLE.filter((s) => canTransition(loaded.status, s)).map((s) => (
                <button
                  key={s}
                  type="button"
                  className="cx-choice w-full"
                  data-active={v.status === s}
                  onClick={() => set("status", s as Lifecycle)}
                >
                  <span
                    className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${v.status === s ? "bg-[var(--cx-teal)]" : "bg-[var(--cx-track)]"}`}
                  />
                  <span>
                    <span className="block text-[14px] font-bold">
                      {ar ? LIFECYCLE_UI[s].ar : LIFECYCLE_UI[s].en}
                    </span>
                    <span className="block text-[12.5px] text-[var(--cx-muted)]">
                      {ar ? LIFECYCLE_UI[s].hint.ar : LIFECYCLE_UI[s].hint.en}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </Panel>

          <Panel title={t("صورة الغلاف", "Cover image")}>
            <Cover
              id={id}
              bucket={v.cover_image_bucket ?? null}
              path={v.cover_image_path ?? null}
              onChanged={(b, p) => {
                // Stored straight away, so it is not an unsaved change.
                setLoaded((x) => (x ? { ...x, cover_image_bucket: b, cover_image_path: p } : x));
                setV((x) => (x ? { ...x, cover_image_bucket: b, cover_image_path: p } : x));
              }}
            />
          </Panel>

          <Panel title={t("الرابط", "Link")}>
            <Field label={t("عنوان الصفحة على الموقع", "Page address on the site")}>
              <div
                className="flex items-center rounded-md border border-[var(--cx-line)] bg-[var(--cx-field)] ps-3"
                dir="ltr"
              >
                <span className="shrink-0 text-[12.5px] text-[var(--cx-muted)]">/internships/</span>
                <input
                  className="h-9 min-w-0 flex-1 bg-transparent px-1 text-[14px] outline-none"
                  value={v.slug}
                  maxLength={80}
                  onChange={(e) =>
                    set("slug", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))
                  }
                />
              </div>
            </Field>
            <a
              href={`/learning-management-system/internships/${loaded.slug}`}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex items-center gap-1.5 text-[13px] font-bold text-[var(--cx-teal)] hover:underline"
            >
              <ExternalLink className="h-4 w-4" />
              {t("معاينة على الموقع", "Preview on the site")}
            </a>
          </Panel>

          <button
            type="button"
            onClick={remove}
            className="inline-flex items-center gap-1.5 px-1 text-[13px] font-bold text-[var(--cx-muted)] hover:text-[var(--cx-red)]"
          >
            <Trash2 className="h-4 w-4" />
            {t("حذف الفرصة", "Delete internship")}
          </button>
        </aside>
      </div>

      <SaveBar show={dirty} saving={saving} onSave={save} onDiscard={() => setV(loaded)} />
    </div>
  );
}

function Section({
  n,
  title,
  description,
  children,
}: {
  n: number;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="cx-card p-5 sm:p-6">
      <div className="mb-4 flex items-start gap-3">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-[var(--cx-teal-100)] text-[13px] font-extrabold text-[var(--cx-teal)]">
          {n}
        </span>
        <div>
          <h2 className="text-[16.5px] font-extrabold">{title}</h2>
          {description && <p className="text-[13px] text-[var(--cx-muted)]">{description}</p>}
        </div>
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function DateTimeInput({
  value,
  onChange,
}: {
  value: string | null | undefined;
  onChange: (v: string | null) => void;
}) {
  const local = useMemo(() => {
    if (!value) return "";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "";
    const p = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
  }, [value]);
  return (
    <Input
      type="datetime-local"
      dir="ltr"
      className="h-9 text-[13px]"
      value={local}
      onChange={(e) => onChange(e.target.value ? new Date(e.target.value).toISOString() : null)}
    />
  );
}

function Questions({
  list,
  onChange,
  tl,
}: {
  list: QuestionInput[];
  onChange: (q: QuestionInput[]) => void;
  tl: L;
}) {
  const { t, ar } = useT();
  const [open, setOpen] = useState<number | null>(null);
  const update = (i: number, patch: Partial<QuestionInput>) =>
    onChange(list.map((q, j) => (j === i ? { ...q, ...patch } : q)));
  const move = (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= list.length) return;
    const next = list.slice();
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
    setOpen(j);
  };
  const add = (kind: QuestionInput["kind"]) => {
    onChange([
      ...list,
      {
        label_ar: "",
        label_en: "",
        help_ar: null,
        help_en: null,
        kind,
        is_required: false,
        options: [],
        sort_order: list.length,
      },
    ]);
    setOpen(list.length);
  };
  const remove = async (i: number) => {
    const q = list[i];
    if (q.id) {
      const ok = await confirmDialog({
        title: t("حذف هذا السؤال؟", "Remove this question?"),
        description: t(
          "إن كان أحد قد أجاب عليه فلن يُحذف عند الحفظ.",
          "If anyone has answered it, saving will refuse to delete it.",
        ),
        confirmLabel: t("حذف", "Remove"),
        destructive: true,
      });
      if (!ok) return;
    }
    onChange(list.filter((_, j) => j !== i));
    setOpen(null);
  };
  const label = (q: QuestionInput) => (tl === "ar" ? q.label_ar : q.label_en);

  return (
    <div className="space-y-2">
      {list.length === 0 && (
        <p className="text-[13.5px] text-[var(--cx-muted)]">
          {t(
            "لا أسئلة إضافية. أضف واحداً من الأسفل إن احتجت.",
            "No extra questions. Add one below if you need to.",
          )}
        </p>
      )}
      {list.map((q, i) => {
        const isOpen = open === i;
        const choice = q.kind === "single_choice" || q.kind === "multi_choice";
        return (
          <div
            key={q.id ?? `n${i}`}
            className={`rounded-xl border ${isOpen ? "border-[var(--cx-teal)]" : "border-[var(--cx-line)]"} bg-[var(--cx-field)]`}
          >
            <button
              type="button"
              onClick={() => setOpen(isOpen ? null : i)}
              className="flex w-full items-center gap-3 px-3.5 py-3 text-start"
            >
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-[var(--cx-raise-2)] text-[12.5px] font-extrabold">
                {i + 1}
              </span>
              <span className="min-w-0 flex-1">
                <span
                  className={`block truncate text-[14px] font-bold ${label(q) ? "" : "text-[var(--cx-orange-ink)]"}`}
                  dir="auto"
                >
                  {label(q) || t("بلا نص بعد", "No text yet")}
                </span>
                <span className="text-[12px] text-[var(--cx-muted)]">
                  {ar ? QUESTION_KIND_UI[q.kind].ar : QUESTION_KIND_UI[q.kind].en}
                  {q.is_required ? ` · ${t("مطلوب", "Required")}` : ""}
                </span>
              </span>
              <ChevronDown
                className={`h-4 w-4 text-[var(--cx-muted)] transition-transform ${isOpen ? "rotate-180" : ""}`}
              />
            </button>
            {isOpen && (
              <div className="space-y-3 border-t border-[var(--cx-line-2)] p-3.5">
                <Field label={t("نص السؤال", "Question")}>
                  <Input
                    dir={tl === "ar" ? "rtl" : "ltr"}
                    maxLength={300}
                    value={label(q)}
                    onChange={(e) =>
                      update(
                        i,
                        tl === "ar" ? { label_ar: e.target.value } : { label_en: e.target.value },
                      )
                    }
                  />
                </Field>
                <Field label={t("شرح صغير (اختياري)", "Help text (optional)")}>
                  <Input
                    dir={tl === "ar" ? "rtl" : "ltr"}
                    maxLength={600}
                    value={(tl === "ar" ? q.help_ar : q.help_en) ?? ""}
                    onChange={(e) =>
                      update(
                        i,
                        tl === "ar"
                          ? { help_ar: e.target.value || null }
                          : { help_en: e.target.value || null },
                      )
                    }
                  />
                </Field>
                <div className="flex flex-wrap items-end gap-3">
                  <Field label={t("نوع الإجابة", "Answer type")}>
                    <select
                      className="h-9 rounded-md border border-[var(--cx-line)] bg-[var(--cx-field)] px-2 text-[14px]"
                      value={q.kind}
                      onChange={(e) => update(i, { kind: e.target.value as QuestionInput["kind"] })}
                    >
                      {QUESTION_KINDS.map((k) => (
                        <option key={k} value={k}>
                          {ar ? QUESTION_KIND_UI[k].ar : QUESTION_KIND_UI[k].en}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <div className="min-w-[180px] flex-1">
                    <ToggleRow
                      id={`q-req-${i}`}
                      label={t("مطلوب", "Required")}
                      checked={q.is_required}
                      onChange={(x) => update(i, { is_required: x })}
                    />
                  </div>
                </div>
                {choice && (
                  <Options value={q.options ?? []} onChange={(o) => update(i, { options: o })} />
                )}
                <div className="flex items-center gap-1 border-t border-[var(--cx-line-2)] pt-3">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={i === 0}
                    onClick={() => move(i, -1)}
                  >
                    <ArrowUp className="h-4 w-4" />
                    {t("أعلى", "Up")}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={i === list.length - 1}
                    onClick={() => move(i, 1)}
                  >
                    <ArrowDown className="h-4 w-4" />
                    {t("أسفل", "Down")}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="ms-auto text-[var(--cx-red)]"
                    onClick={() => remove(i)}
                  >
                    <Trash2 className="h-4 w-4" />
                    {t("حذف", "Remove")}
                  </Button>
                </div>
              </div>
            )}
          </div>
        );
      })}
      <div className="flex flex-wrap items-center gap-2 pt-2">
        <span className="text-[13px] font-bold text-[var(--cx-muted)]">
          {t("أضف سؤالاً:", "Add a question:")}
        </span>
        {QUESTION_KINDS.map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => add(k)}
            className="inline-flex items-center gap-1 rounded-lg border border-[var(--cx-line)] px-2.5 py-1 text-[12.5px] font-bold hover:border-[var(--cx-teal)] hover:text-[var(--cx-teal)]"
          >
            <Plus className="h-3.5 w-3.5" />
            {ar ? QUESTION_KIND_UI[k].ar : QUESTION_KIND_UI[k].en}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Choices are the same in both languages (as before). */
function Options({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const { t } = useT();
  const [draft, setDraft] = useState("");
  const add = () => {
    const s = draft.trim();
    if (!s || value.includes(s) || value.length >= 30) return;
    onChange([...value, s]);
    setDraft("");
  };
  return (
    <Field label={t("الخيارات", "Choices")}>
      <div className="flex flex-wrap gap-1.5">
        {value.map((o) => (
          <span
            key={o}
            className="inline-flex items-center gap-1 rounded-full bg-[var(--cx-raise-2)] py-1 pe-1.5 ps-3 text-[13px]"
            dir="auto"
          >
            {o}
            <button
              type="button"
              onClick={() => onChange(value.filter((x) => x !== o))}
              aria-label={t("إزالة", "Remove")}
              className="rounded-full p-0.5 hover:bg-[var(--cx-hover)]"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </span>
        ))}
      </div>
      <div className="mt-2 flex gap-2">
        <Input
          value={draft}
          maxLength={200}
          dir="auto"
          placeholder={t("اكتب خياراً ثم Enter", "Type a choice, then Enter")}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
        />
        <Button type="button" variant="outline" onClick={add}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </Field>
  );
}

/** Cover: uploaded to internship-covers and stored on the row at once (as before). */
function Cover({
  id,
  bucket,
  path,
  onChanged,
}: {
  id: string;
  bucket: string | null;
  path: string | null;
  onChanged: (b: string | null, p: string | null) => void;
}) {
  const { t } = useT();
  const signFn = useServerFn(adminGetCoverSignedUrl);
  const ref = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setUrl(null);
    if (!path) return;
    let off = false;
    signFn({ data: { id } })
      .then((r) => !off && setUrl(r.signed_url))
      .catch(() => {});
    return () => {
      off = true;
    };
  }, [id, path, signFn]);

  const upload = async (file: File | null) => {
    if (!file) return;
    if (file.size > COVER_MAX_BYTES)
      return void toast.error(t("الحجم أكبر من 5 ميجابايت", "Larger than 5 MB"));
    if (!(COVER_MIME_TYPES as readonly string[]).includes(file.type))
      return void toast.error(t("JPEG أو PNG أو WebP فقط", "JPEG, PNG or WebP only"));
    setBusy(true);
    try {
      const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
      const newPath = `opps/${id}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from("internship-covers")
        .upload(newPath, file, { contentType: file.type, upsert: true });
      if (error) throw error;
      const { error: e2 } = await supabase
        .from("internship_opportunities")
        .update({ cover_image_bucket: "internship-covers", cover_image_path: newPath })
        .eq("id", id);
      if (e2) throw e2;
      onChanged("internship-covers", newPath);
      toast.success(t("رُفعت الصورة", "Image uploaded"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "error");
    } finally {
      setBusy(false);
      if (ref.current) ref.current.value = "";
    }
  };
  const clear = async () => {
    setBusy(true);
    try {
      if (path && bucket) await supabase.storage.from(bucket).remove([path]);
      const { error } = await supabase
        .from("internship_opportunities")
        .update({ cover_image_bucket: null, cover_image_path: null })
        .eq("id", id);
      if (error) throw error;
      onChanged(null, null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <input
        ref={ref}
        type="file"
        accept={COVER_MIME_TYPES.join(",")}
        className="hidden"
        onChange={(e) => upload(e.target.files?.[0] ?? null)}
      />
      <button
        type="button"
        onClick={() => ref.current?.click()}
        disabled={busy}
        className="group relative grid aspect-[16/9] w-full place-items-center overflow-hidden rounded-xl border-2 border-dashed border-[var(--cx-line)] bg-[var(--cx-raise)] hover:border-[var(--cx-teal)]"
      >
        {url ? (
          <img src={url} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : null}
        <span
          className={`relative flex flex-col items-center gap-1 text-[13px] font-bold ${url ? "rounded-lg bg-black/60 px-3 py-1.5 text-white opacity-0 group-hover:opacity-100" : "text-[var(--cx-muted)]"}`}
        >
          {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImagePlus className="h-5 w-5" />}
          {path ? t("تغيير الصورة", "Change image") : t("رفع صورة", "Upload image")}
        </span>
      </button>
      {path && (
        <button
          type="button"
          onClick={clear}
          disabled={busy}
          className="mt-2 text-[12.5px] font-bold text-[var(--cx-muted)] hover:text-[var(--cx-red)]"
        >
          {t("إزالة الصورة", "Remove image")}
        </button>
      )}
    </div>
  );
}
