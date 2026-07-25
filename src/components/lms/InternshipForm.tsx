import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowLeft,
  Camera,
  ExternalLink,
  GripVertical,
  ImagePlus,
  Loader2,
  Plus,
  Save,
  Trash2,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { useLang } from "@/lib/i18n";
import { lmsInternshipsT } from "@/lib/lms-internships-i18n";
import {
  LIFECYCLE,
  QUESTION_KINDS,
  REQUIRED_PROFILE_FIELDS,
  type Lifecycle,
  type OpportunityInput,
  type QuestionInput,
  type RequiredProfileField,
  COVER_MAX_BYTES,
  COVER_MIME_TYPES,
} from "@/lib/lms-internships-admin";
import { adminGetCoverSignedUrl } from "@/lib/lms-internships-admin.functions";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { lifecycleLabel } from "@/routes/learning-management-system.admin.internships.index";

export type InternshipFormValues = OpportunityInput;

type Props = {
  mode: "create" | "edit";
  initial?: InternshipFormValues;
  applicationsCount?: number;
  onSubmit: (values: InternshipFormValues) => Promise<void>;
};

const EMPTY_QUESTION = (): QuestionInput => ({
  label_ar: "",
  label_en: "",
  help_ar: null,
  help_en: null,
  kind: "short_text",
  is_required: false,
  options: [],
  sort_order: 0,
});

const DEFAULT_VALUES: InternshipFormValues = {
  title_ar: "",
  title_en: "",
  slug: "",
  summary_ar: null,
  summary_en: null,
  description_ar: null,
  description_en: null,
  requirements_ar: null,
  requirements_en: null,
  location_ar: null,
  location_en: null,
  duration_ar: null,
  duration_en: null,
  stipend_ar: null,
  stipend_en: null,
  capacity: null,
  starts_at: null,
  ends_at: null,
  opens_at: null,
  deadline_at: null,
  status: "draft",
  require_cv: false,
  allow_reapply: false,
  required_profile_fields: [],
  cover_image_bucket: null,
  cover_image_path: null,
  questions: [],
};

export function InternshipForm({ mode, initial, applicationsCount = 0, onSubmit }: Props) {
  const { lang, dir } = useLang();
  const t = lmsInternshipsT[lang];
  const [values, setValues] = useState<InternshipFormValues>(initial ?? DEFAULT_VALUES);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (initial) setValues(initial);
  }, [initial]);

  const set = <K extends keyof InternshipFormValues>(key: K, v: InternshipFormValues[K]) =>
    setValues((prev) => ({ ...prev, [key]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!values.title_ar.trim() || !values.title_en.trim() || !values.slug.trim()) {
      toast.error(t.errorValidation);
      return;
    }
    setSaving(true);
    try {
      // Normalize sort_order to array index
      const normalized: InternshipFormValues = {
        ...values,
        questions: values.questions.map((q, i) => ({ ...q, sort_order: i })),
      };
      await onSubmit(normalized);
    } catch {
      // handled upstream
    } finally {
      setSaving(false);
    }
  };

  const slugAutofill = () => {
    if (values.slug || !values.title_en) return;
    const s = values.title_en
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 80);
    if (s) set("slug", s);
  };

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-5xl px-4 sm:px-6 py-8 space-y-6" dir={dir}>
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            to="/learning-management-system/admin/internships"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className={`h-4 w-4 ${dir === "rtl" ? "rotate-180" : ""}`} />
            {t.adminInternshipsTitle}
          </Link>
          <h1 className="mt-1 text-2xl sm:text-3xl font-bold text-foreground">
            {mode === "create"
              ? t.adminInternshipsNew
              : lang === "ar"
                ? "تحرير الفرصة"
                : "Edit opportunity"}
          </h1>
          {mode === "edit" && (
            <p className="mt-1 text-xs text-muted-foreground inline-flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              {t.adminInternshipsApplicationsCount}: {applicationsCount}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {mode === "edit" && values.slug && (
            <Link
              to="/learning-management-system/internships/$slug"
              params={{ slug: values.slug }}
              className="text-sm text-primary inline-flex items-center gap-1 hover:underline"
              target="_blank"
            >
              {t.adminInternshipsPreview} <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          )}
          <Button type="submit" disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mx-1" /> : <Save className="h-4 w-4 mx-1" />}
            {t.profileSave}
          </Button>
        </div>
      </header>

      {/* Identity */}
      <Section title={lang === "ar" ? "الهوية" : "Identity"}>
        <Grid2>
          <Field label={lang === "ar" ? "العنوان (عربي)" : "Title (Arabic)"} required>
            <Input
              value={values.title_ar}
              onChange={(e) => set("title_ar", e.target.value)}
              maxLength={200}
              dir="rtl"
              required
            />
          </Field>
          <Field label={lang === "ar" ? "العنوان (English)" : "Title (English)"} required>
            <Input
              value={values.title_en}
              onChange={(e) => set("title_en", e.target.value)}
              onBlur={slugAutofill}
              maxLength={200}
              dir="ltr"
              required
            />
          </Field>
        </Grid2>
        <Grid2>
          <Field label={t.adminInternshipsSlug} required hint="a-z, 0-9, dashes">
            <Input
              value={values.slug}
              onChange={(e) =>
                set(
                  "slug",
                  e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""),
                )
              }
              maxLength={80}
              dir="ltr"
              required
            />
          </Field>
          <Field label={t.adminInternshipsStatus}>
            <Select value={values.status} onValueChange={(v) => set("status", v as Lifecycle)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {LIFECYCLE.map((s) => (
                  <SelectItem key={s} value={s}>{lifecycleLabel(s, lang)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </Grid2>
        <Grid2>
          <Field label={lang === "ar" ? "ملخّص (عربي)" : "Summary (Arabic)"}>
            <Textarea
              value={values.summary_ar ?? ""}
              onChange={(e) => set("summary_ar", e.target.value)}
              maxLength={400}
              dir="rtl"
              rows={2}
            />
          </Field>
          <Field label={lang === "ar" ? "ملخّص (English)" : "Summary (English)"}>
            <Textarea
              value={values.summary_en ?? ""}
              onChange={(e) => set("summary_en", e.target.value)}
              maxLength={400}
              dir="ltr"
              rows={2}
            />
          </Field>
        </Grid2>
      </Section>

      {/* Content */}
      <Section title={lang === "ar" ? "المحتوى" : "Content"}>
        <Grid2>
          <Field label={lang === "ar" ? "الوصف (عربي)" : "Description (Arabic)"}>
            <Textarea
              value={values.description_ar ?? ""}
              onChange={(e) => set("description_ar", e.target.value)}
              maxLength={10000}
              dir="rtl"
              rows={6}
            />
          </Field>
          <Field label={lang === "ar" ? "الوصف (English)" : "Description (English)"}>
            <Textarea
              value={values.description_en ?? ""}
              onChange={(e) => set("description_en", e.target.value)}
              maxLength={10000}
              dir="ltr"
              rows={6}
            />
          </Field>
        </Grid2>
        <Grid2>
          <Field label={lang === "ar" ? "المتطلّبات (عربي)" : "Requirements (Arabic)"}>
            <Textarea
              value={values.requirements_ar ?? ""}
              onChange={(e) => set("requirements_ar", e.target.value)}
              maxLength={4000}
              dir="rtl"
              rows={4}
            />
          </Field>
          <Field label={lang === "ar" ? "المتطلّبات (English)" : "Requirements (English)"}>
            <Textarea
              value={values.requirements_en ?? ""}
              onChange={(e) => set("requirements_en", e.target.value)}
              maxLength={4000}
              dir="ltr"
              rows={4}
            />
          </Field>
        </Grid2>
      </Section>

      {/* Logistics */}
      <Section title={lang === "ar" ? "التفاصيل اللوجستية" : "Logistics"}>
        <Grid2>
          <TranslatedPair
            labelAr={lang === "ar" ? "الموقع (عربي)" : "Location (Arabic)"}
            labelEn={lang === "ar" ? "الموقع (English)" : "Location (English)"}
            ar={values.location_ar}
            en={values.location_en}
            onAr={(v) => set("location_ar", v)}
            onEn={(v) => set("location_en", v)}
          />
        </Grid2>
        <Grid2>
          <TranslatedPair
            labelAr={lang === "ar" ? "المدّة (عربي)" : "Duration (Arabic)"}
            labelEn={lang === "ar" ? "المدّة (English)" : "Duration (English)"}
            ar={values.duration_ar}
            en={values.duration_en}
            onAr={(v) => set("duration_ar", v)}
            onEn={(v) => set("duration_en", v)}
          />
        </Grid2>
        <Grid2>
          <TranslatedPair
            labelAr={lang === "ar" ? "المكافأة (عربي)" : "Stipend (Arabic)"}
            labelEn={lang === "ar" ? "المكافأة (English)" : "Stipend (English)"}
            ar={values.stipend_ar}
            en={values.stipend_en}
            onAr={(v) => set("stipend_ar", v)}
            onEn={(v) => set("stipend_en", v)}
          />
        </Grid2>
        <Grid2>
          <Field label={lang === "ar" ? "السّعة" : "Capacity"}>
            <Input
              type="number"
              min={0}
              value={values.capacity ?? ""}
              onChange={(e) =>
                set("capacity", e.target.value === "" ? null : Number(e.target.value))
              }
              dir="ltr"
            />
          </Field>
          <div />
        </Grid2>
        <Grid2>
          <Field label={lang === "ar" ? "بداية التقديم" : "Applications open"}>
            <DateTimeInput
              value={values.opens_at}
              onChange={(v) => set("opens_at", v)}
            />
          </Field>
          <Field label={t.adminInternshipsDeadline}>
            <DateTimeInput
              value={values.deadline_at}
              onChange={(v) => set("deadline_at", v)}
            />
          </Field>
        </Grid2>
        <Grid2>
          <Field label={lang === "ar" ? "بداية التدريب" : "Internship starts"}>
            <DateTimeInput
              value={values.starts_at}
              onChange={(v) => set("starts_at", v)}
            />
          </Field>
          <Field label={lang === "ar" ? "نهاية التدريب" : "Internship ends"}>
            <DateTimeInput
              value={values.ends_at}
              onChange={(v) => set("ends_at", v)}
            />
          </Field>
        </Grid2>
      </Section>

      {/* Requirements & options */}
      <Section title={lang === "ar" ? "خيارات التقديم" : "Application settings"}>
        <div className="flex flex-wrap items-center gap-6">
          <label className="flex items-center gap-2 text-sm">
            <Switch
              checked={values.require_cv}
              onCheckedChange={(v) => set("require_cv", v)}
            />
            {lang === "ar" ? "السيرة الذاتية مطلوبة" : "CV required"}
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Switch
              checked={values.allow_reapply}
              onCheckedChange={(v) => set("allow_reapply", v)}
            />
            {t.adminInternshipsAllowReapply}
          </label>
        </div>
        <div className="mt-4">
          <Label className="text-sm">{t.adminInternshipsRequiredProfileFields}</Label>
          <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-2">
            {REQUIRED_PROFILE_FIELDS.map((f) => {
              const checked = values.required_profile_fields.includes(f);
              return (
                <label key={f} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={checked}
                    onCheckedChange={(v) => {
                      const next = new Set(values.required_profile_fields);
                      if (v) next.add(f);
                      else next.delete(f);
                      set(
                        "required_profile_fields",
                        Array.from(next) as RequiredProfileField[],
                      );
                    }}
                  />
                  {profileFieldLabel(f, lang)}
                </label>
              );
            })}
          </div>
        </div>
      </Section>

      {/* Cover image */}
      <Section title={t.adminInternshipsCoverImage}>
        <CoverUploader
          opportunityId={values.id ?? null}
          bucket={values.cover_image_bucket}
          path={values.cover_image_path}
          onChanged={(b, p) => {
            set("cover_image_bucket", b);
            set("cover_image_path", p);
          }}
        />
        {mode === "create" && (
          <p className="mt-2 text-xs text-muted-foreground">
            {lang === "ar"
              ? "احفظ الفرصة أولًا لتتمكّن من رفع صورة الغلاف."
              : "Save the opportunity first, then upload a cover image."}
          </p>
        )}
      </Section>

      {/* Additional questions */}
      <Section title={t.adminInternshipsAdditionalQuestions}>
        <QuestionsEditor
          questions={values.questions}
          onChange={(qs) => set("questions", qs)}
        />
      </Section>

      <div className="flex justify-end">
        <Button type="submit" disabled={saving} size="lg">
          {saving ? <Loader2 className="h-4 w-4 animate-spin mx-1" /> : <Save className="h-4 w-4 mx-1" />}
          {t.profileSave}
        </Button>
      </div>
    </form>
  );
}

// ---------- helpers ----------

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="p-6 space-y-4">
      <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      {children}
    </Card>
  );
}

function Grid2({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{children}</div>;
}

function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <Label className="text-sm">
        {label}
        {required && <span className="text-destructive mx-1">*</span>}
      </Label>
      <div className="mt-1">{children}</div>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function TranslatedPair({
  labelAr,
  labelEn,
  ar,
  en,
  onAr,
  onEn,
}: {
  labelAr: string;
  labelEn: string;
  ar: string | null | undefined;
  en: string | null | undefined;
  onAr: (v: string | null) => void;
  onEn: (v: string | null) => void;
}) {
  return (
    <>
      <Field label={labelAr}>
        <Input
          value={ar ?? ""}
          onChange={(e) => onAr(e.target.value || null)}
          maxLength={200}
          dir="rtl"
        />
      </Field>
      <Field label={labelEn}>
        <Input
          value={en ?? ""}
          onChange={(e) => onEn(e.target.value || null)}
          maxLength={200}
          dir="ltr"
        />
      </Field>
    </>
  );
}

function DateTimeInput({
  value,
  onChange,
}: {
  value: string | null | undefined;
  onChange: (v: string | null) => void;
}) {
  // Convert stored ISO to <input type="datetime-local"> value
  const local = useMemo(() => {
    if (!value) return "";
    const d = new Date(value);
    if (isNaN(d.getTime())) return "";
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }, [value]);
  return (
    <Input
      type="datetime-local"
      value={local}
      onChange={(e) => {
        const raw = e.target.value;
        if (!raw) onChange(null);
        else onChange(new Date(raw).toISOString());
      }}
      dir="ltr"
    />
  );
}

function profileFieldLabel(f: RequiredProfileField, lang: "ar" | "en"): string {
  const AR = lang === "ar";
  switch (f) {
    case "full_name": return AR ? "الاسم الكامل" : "Full name";
    case "phone": return AR ? "الهاتف" : "Phone";
    case "biography": return AR ? "نبذة تعريفية" : "Biography";
    case "organization": return AR ? "الجهة" : "Organization";
    case "avatar": return AR ? "الصورة الشخصية" : "Profile photo";
  }
}

// ---------- cover uploader ----------

function CoverUploader({
  opportunityId,
  bucket,
  path,
  onChanged,
}: {
  opportunityId: string | null;
  bucket: string | null | undefined;
  path: string | null | undefined;
  onChanged: (bucket: string | null, path: string | null) => void;
}) {
  const { lang } = useLang();
  const t = lmsInternshipsT[lang];
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const signFn = useServerFn(adminGetCoverSignedUrl);

  useEffect(() => {
    setPreviewUrl(null);
    if (!opportunityId || !path) return;
    let cancelled = false;
    signFn({ data: { id: opportunityId } })
      .then((res) => {
        if (!cancelled) setPreviewUrl(res.signed_url);
      })
      .catch(() => {
        if (!cancelled) setPreviewUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, [opportunityId, path, signFn]);

  const onFile = async (file: File | null) => {
    if (!file || !opportunityId) return;
    if (file.size > COVER_MAX_BYTES) {
      toast.error(lang === "ar" ? "الحجم يتجاوز 5 ميغابايت" : "File exceeds 5 MB");
      return;
    }
    if (!(COVER_MIME_TYPES as readonly string[]).includes(file.type)) {
      toast.error(lang === "ar" ? "JPEG / PNG / WebP فقط" : "Only JPEG / PNG / WebP");
      return;
    }
    setBusy(true);
    try {
      const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
      const newPath = `opps/${opportunityId}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from("internship-covers")
        .upload(newPath, file, { contentType: file.type, upsert: true });
      if (error) throw error;
      const { error: uErr } = await supabase
        .from("internship_opportunities")
        .update({
          cover_image_bucket: "internship-covers",
          cover_image_path: newPath,
        })
        .eq("id", opportunityId);
      if (uErr) throw uErr;
      onChanged("internship-covers", newPath);
      toast.success(t.profileSaved);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t.errorValidation);
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const onRemove = async () => {
    if (!opportunityId) return;
    setBusy(true);
    try {
      if (path && bucket) {
        await supabase.storage.from(bucket).remove([path]);
      }
      const { error } = await supabase
        .from("internship_opportunities")
        .update({ cover_image_bucket: null, cover_image_path: null })
        .eq("id", opportunityId);
      if (error) throw error;
      onChanged(null, null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t.errorValidation);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-4">
      <div className="h-32 w-52 rounded-lg overflow-hidden bg-muted ring-1 ring-border flex items-center justify-center">
        {previewUrl ? (
          <img src={previewUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <Camera className="h-8 w-8 text-muted-foreground" />
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={COVER_MIME_TYPES.join(",")}
        className="hidden"
        onChange={(e) => onFile(e.target.files?.[0] ?? null)}
      />
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
          disabled={busy || !opportunityId}
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin mx-1" /> : <ImagePlus className="h-4 w-4 mx-1" />}
          {path
            ? lang === "ar" ? "استبدال الصورة" : "Replace"
            : lang === "ar" ? "رفع صورة" : "Upload"}
        </Button>
        {path && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onRemove}
            disabled={busy}
            className="text-destructive"
          >
            <Trash2 className="h-4 w-4 mx-1" />
            {lang === "ar" ? "إزالة" : "Remove"}
          </Button>
        )}
      </div>
    </div>
  );
}

// ---------- questions editor ----------

function QuestionsEditor({
  questions,
  onChange,
}: {
  questions: QuestionInput[];
  onChange: (qs: QuestionInput[]) => void;
}) {
  const { lang } = useLang();

  const update = (i: number, patch: Partial<QuestionInput>) => {
    onChange(questions.map((q, idx) => (idx === i ? { ...q, ...patch } : q)));
  };

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= questions.length) return;
    const next = questions.slice();
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };

  const remove = (i: number) => {
    onChange(questions.filter((_, idx) => idx !== i));
  };

  const add = () => {
    onChange([...questions, { ...EMPTY_QUESTION(), sort_order: questions.length }]);
  };

  return (
    <div className="space-y-3">
      {questions.length === 0 && (
        <p className="text-sm text-muted-foreground">
          {lang === "ar" ? "لا توجد أسئلة إضافية." : "No additional questions."}
        </p>
      )}
      {questions.map((q, i) => {
        const needsOptions = q.kind === "single_choice" || q.kind === "multi_choice";
        return (
          <div key={q.id ?? i} className="rounded-lg border border-border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <GripVertical className="h-4 w-4" />
                {(lang === "ar" ? "سؤال " : "Question ") + (i + 1)}
              </div>
              <div className="flex items-center gap-1">
                <Button type="button" variant="ghost" size="icon" onClick={() => move(i, -1)} disabled={i === 0}>↑</Button>
                <Button type="button" variant="ghost" size="icon" onClick={() => move(i, 1)} disabled={i === questions.length - 1}>↓</Button>
                <Button type="button" variant="ghost" size="icon" className="text-destructive" onClick={() => remove(i)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <Grid2>
              <Field label={lang === "ar" ? "النص (عربي)" : "Label (Arabic)"} required>
                <Input value={q.label_ar} onChange={(e) => update(i, { label_ar: e.target.value })} dir="rtl" maxLength={300} />
              </Field>
              <Field label={lang === "ar" ? "النص (English)" : "Label (English)"} required>
                <Input value={q.label_en} onChange={(e) => update(i, { label_en: e.target.value })} dir="ltr" maxLength={300} />
              </Field>
            </Grid2>
            <Grid2>
              <Field label={lang === "ar" ? "النوع" : "Type"}>
                <Select value={q.kind} onValueChange={(v) => update(i, { kind: v as QuestionInput["kind"] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {QUESTION_KINDS.map((k) => (
                      <SelectItem key={k} value={k}>{questionKindLabel(k, lang)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <label className="flex items-end pb-2 gap-2 text-sm">
                <Checkbox checked={q.is_required} onCheckedChange={(v) => update(i, { is_required: !!v })} />
                {lang === "ar" ? "مطلوب" : "Required"}
              </label>
            </Grid2>
            {needsOptions && (
              <Field label={lang === "ar" ? "الخيارات (سطر لكل خيار)" : "Options (one per line)"}>
                <Textarea
                  value={(q.options ?? []).join("\n")}
                  onChange={(e) =>
                    update(i, {
                      options: e.target.value
                        .split("\n")
                        .map((s) => s.trim())
                        .filter(Boolean)
                        .slice(0, 30),
                    })
                  }
                  rows={4}
                  dir="auto"
                />
              </Field>
            )}
          </div>
        );
      })}
      <Button type="button" variant="outline" onClick={add}>
        <Plus className="h-4 w-4 mx-1" />
        {lang === "ar" ? "إضافة سؤال" : "Add question"}
      </Button>
    </div>
  );
}

function questionKindLabel(k: QuestionInput["kind"], lang: "ar" | "en"): string {
  const AR = lang === "ar";
  switch (k) {
    case "short_text": return AR ? "نص قصير" : "Short text";
    case "long_text": return AR ? "نص طويل" : "Long text";
    case "single_choice": return AR ? "خيار واحد" : "Single choice";
    case "multi_choice": return AR ? "خيارات متعدّدة" : "Multi choice";
    case "number": return AR ? "رقم" : "Number";
    case "boolean": return AR ? "نعم / لا" : "Yes / No";
    case "date": return AR ? "تاريخ" : "Date";
    case "url": return AR ? "رابط" : "URL";
  }
}
