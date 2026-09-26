import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  AlignLeft,
  ArrowDown,
  ArrowUp,
  AtSign,
  Calendar,
  CheckSquare,
  ChevronDown,
  CircleDot,
  Hash,
  ListChecks,
  ListFilter,
  Loader2,
  Plus,
  Trash2,
  Type,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useRecordDraft } from "@/hooks/useFormDraft";
import { formDraftKey } from "@/lib/form-draft";
import { confirmDialog } from "@/hooks/useConfirm";
import { toUserMessage } from "@/lib/safe-error";
import {
  FIELD_TYPES_WITH_OPTIONS,
  RESERVED_SLUGS,
  formInputSchema,
  isValidSlug,
  newFieldId,
  normalizeSlug,
  type DynamicForm,
  type FieldType,
  type FormField,
  type FormStatus,
} from "@/lib/dynamic-forms";
import { createDynamicForm, updateDynamicForm } from "@/lib/dynamic-forms.functions";
import { DraftNotice } from "@/components/admin/DraftNotice";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  EmptyState,
  Field,
  LangSwitch,
  Panel,
  SaveBar,
  ToggleRow,
  useT,
} from "@/components/console/ui";

const TYPES: { type: FieldType; icon: LucideIcon; ar: string; en: string }[] = [
  { type: "short_text", icon: Type, ar: "نص قصير", en: "Short text" },
  { type: "long_text", icon: AlignLeft, ar: "نص طويل", en: "Long text" },
  { type: "email", icon: AtSign, ar: "بريد إلكتروني", en: "Email" },
  { type: "number", icon: Hash, ar: "رقم", en: "Number" },
  { type: "date", icon: Calendar, ar: "تاريخ", en: "Date" },
  { type: "select", icon: ListFilter, ar: "قائمة منسدلة", en: "Dropdown" },
  { type: "radio", icon: CircleDot, ar: "اختيار واحد", en: "One choice" },
  { type: "checkbox_group", icon: ListChecks, ar: "اختيار متعدد", en: "Several choices" },
  { type: "single_checkbox", icon: CheckSquare, ar: "مربع موافقة", en: "Checkbox" },
];
const typeInfo = (t: FieldType) => TYPES.find((x) => x.type === t) ?? TYPES[0];

type Values = {
  nameAr: string;
  nameEn: string;
  descAr: string;
  descEn: string;
  submitAr: string;
  submitEn: string;
  slug: string;
  slugTouched: boolean;
  fields: FormField[];
};

/* Build a form: its public text on one side, its questions on the other.
   Publishing, hiding and archiving live on the form page, not here. */
export function FormBuilder({
  initial,
  onSaved,
}: {
  initial?: DynamicForm;
  onSaved?: (form: DynamicForm) => void;
}) {
  const { t, ar, lang } = useT();
  const navigate = useNavigate();
  const { user } = useAuth();
  const create = useServerFn(createDynamicForm);
  const update = useServerFn(updateDynamicForm);
  const start = useMemo<Values>(
    () => ({
      nameAr: initial?.name_ar ?? "",
      nameEn: initial?.name_en ?? "",
      descAr: initial?.description_ar ?? "",
      descEn: initial?.description_en ?? "",
      submitAr: initial?.submit_label_ar ?? "إرسال",
      submitEn: initial?.submit_label_en ?? "Submit",
      slug: initial?.slug ?? "",
      slugTouched: !!initial,
      fields: initial?.fields ?? [],
    }),
    [initial],
  );
  const [v, setV] = useState<Values>(start);
  const [saved, setSaved] = useState<Values>(start);
  const [edit, setEdit] = useState<"ar" | "en">(lang);
  const [open, setOpen] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const draft = useRecordDraft<Values>({
    key: formDraftKey(user?.id, "dynamic-form", initial?.id ?? "new"),
    loaded: saved,
    current: v,
    apply: setV,
  });
  const set = (p: Partial<Values>) => setV((cur) => ({ ...cur, ...p }));
  const L = edit === "ar";

  // Suggest the link from the English name until the link is edited by hand.
  useEffect(() => {
    if (!v.slugTouched && v.nameEn) setV((cur) => ({ ...cur, slug: normalizeSlug(cur.nameEn) }));
  }, [v.nameEn, v.slugTouched]);

  const slugError =
    v.slug && (!isValidSlug(v.slug) || RESERVED_SLUGS.has(v.slug))
      ? t("رابط غير صالح أو محجوز", "Invalid or reserved link")
      : null;
  const dirty = JSON.stringify(v) !== JSON.stringify(saved);

  const setField = (id: string, patch: Partial<FormField>) =>
    setV((cur) => ({
      ...cur,
      fields: cur.fields.map((f) => (f.id === id ? { ...f, ...patch } : f)),
    }));
  const addField = (type: FieldType) => {
    const id = newFieldId();
    setV((cur) => ({
      ...cur,
      fields: [
        ...cur.fields,
        {
          id,
          type,
          label_ar: "",
          label_en: "",
          required: false,
          ...(FIELD_TYPES_WITH_OPTIONS.includes(type)
            ? { options: [{ value: "opt1", label_ar: "خيار 1", label_en: "Option 1" }] }
            : {}),
        },
      ],
    }));
    setOpen(id);
  };
  const moveField = (i: number, dir: -1 | 1) =>
    setV((cur) => {
      const next = [...cur.fields];
      const j = i + dir;
      if (j < 0 || j >= next.length) return cur;
      [next[i], next[j]] = [next[j], next[i]];
      return { ...cur, fields: next };
    });
  const changeType = (f: FormField, type: FieldType) =>
    setField(f.id, {
      type,
      options: FIELD_TYPES_WITH_OPTIONS.includes(type)
        ? f.options?.length
          ? f.options
          : [{ value: "opt1", label_ar: "خيار 1", label_en: "Option 1" }]
        : undefined,
    });

  const save = async () => {
    if (slugError) {
      toast.error(slugError);
      return;
    }
    const slugChanged = !!initial && initial.slug !== v.slug;
    if (initial?.status === "published" && slugChanged) {
      const ok = await confirmDialog({
        title: t("تغيير رابط نموذج منشور؟", "Change the link of a published form?"),
        description: t("قد تتوقف الروابط القديمة عن العمل.", "Old links may stop working."),
        destructive: true,
      });
      if (!ok) return;
    }
    const status: FormStatus = initial?.status ?? "draft";
    const payload = {
      slug: v.slug,
      name_ar: v.nameAr,
      name_en: v.nameEn,
      description_ar: v.descAr || null,
      description_en: v.descEn || null,
      submit_label_ar: v.submitAr,
      submit_label_en: v.submitEn,
      status,
      fields: v.fields,
    };
    const parsed = formInputSchema.safeParse(payload);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? t("بيانات ناقصة", "Something is missing"));
      return;
    }
    setSaving(true);
    try {
      const result = initial
        ? await update({ data: { ...parsed.data, id: initial.id } })
        : await create({ data: parsed.data });
      draft.clear();
      setSaved(v);
      toast.success(t("تم الحفظ", "Saved"));
      if (!initial)
        navigate({
          to: "/admin/forms/$formId",
          params: { formId: result.id },
          search: { tab: "build" },
        });
      else onSaved?.(result as DynamicForm);
    } catch (e) {
      const msg = toUserMessage(e);
      if (msg.includes("slug_taken"))
        toast.error(t("الرابط مستخدم مسبقاً", "This link is already used"));
      else if (msg.includes("invalid_slug") || msg.includes("reserved_slug"))
        toast.error(t("رابط غير صالح أو محجوز", "Invalid or reserved link"));
      else toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <DraftNotice show={draft.restored} onDiscard={draft.discard} />
      <div className="grid gap-5 xl:grid-cols-[380px_1fr]">
        <Panel
          title={t("النموذج", "The form")}
          actions={
            <LangSwitch
              value={edit}
              onChange={setEdit}
              missing={{ ar: !v.nameAr.trim(), en: !v.nameEn.trim() }}
            />
          }
        >
          <div className="space-y-3" dir={L ? "rtl" : "ltr"}>
            <Field label={L ? "اسم النموذج" : "Form name"}>
              <Input
                value={L ? v.nameAr : v.nameEn}
                onChange={(e) => set(L ? { nameAr: e.target.value } : { nameEn: e.target.value })}
              />
            </Field>
            <Field
              label={
                L
                  ? "وصف يظهر أعلى النموذج (اختياري)"
                  : "Description shown above the form (optional)"
              }
            >
              <Textarea
                rows={3}
                value={L ? v.descAr : v.descEn}
                onChange={(e) => set(L ? { descAr: e.target.value } : { descEn: e.target.value })}
              />
            </Field>
            <Field label={L ? "نص زر الإرسال" : "Submit button text"}>
              <Input
                value={L ? v.submitAr : v.submitEn}
                onChange={(e) =>
                  set(L ? { submitAr: e.target.value } : { submitEn: e.target.value })
                }
              />
            </Field>
          </div>
          <div className="mt-3 border-t border-[var(--cx-line-2)] pt-3">
            <Field
              label={t("الرابط", "Link")}
              error={slugError ?? undefined}
              hint={`aisyria.org/forms/${v.slug || "…"}`}
            >
              <Input
                dir="ltr"
                className="font-mono"
                value={v.slug}
                onChange={(e) => set({ slugTouched: true, slug: normalizeSlug(e.target.value) })}
              />
            </Field>
          </div>
        </Panel>

        <Panel
          title={t("الأسئلة", "Questions")}
          description={t(
            `${v.fields.length} سؤال. اضغط أي سؤال لتعديله.`,
            `${v.fields.length} questions. Click one to edit it.`,
          )}
        >
          {v.fields.length === 0 ? (
            <EmptyState
              compact
              icon={ListChecks}
              title={t("لا توجد أسئلة بعد", "No questions yet")}
              text={t("اختر نوع السؤال من الأسفل.", "Pick a question type below.")}
            />
          ) : (
            <ol className="space-y-2">
              {v.fields.map((f, i) => {
                const info = typeInfo(f.type);
                const Icon = info.icon;
                const isOpen = open === f.id;
                const label = (L ? f.label_ar : f.label_en) || (L ? f.label_en : f.label_ar);
                return (
                  <li
                    key={f.id}
                    className={`rounded-xl border ${isOpen ? "border-[var(--cx-teal)]" : "border-[var(--cx-line)]"} bg-[var(--cx-field)]`}
                  >
                    <div className="flex items-center gap-2 px-3 py-2.5">
                      <button
                        type="button"
                        className="flex min-w-0 flex-1 items-center gap-2.5 text-start"
                        onClick={() => setOpen(isOpen ? null : f.id)}
                      >
                        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[var(--cx-teal-50)] text-[var(--cx-teal)]">
                          <Icon className="h-4 w-4" />
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-[14px] font-bold">
                            {label || (
                              <span className="text-[var(--cx-muted)]">
                                {t("سؤال بلا عنوان", "Untitled question")}
                              </span>
                            )}
                            {f.required && <span className="ms-1 text-[var(--cx-red)]">*</span>}
                          </span>
                          <span className="text-[12px] text-[var(--cx-muted)]">
                            {ar ? info.ar : info.en}
                          </span>
                        </span>
                        <ChevronDown
                          className={`ms-auto h-4 w-4 shrink-0 text-[var(--cx-muted)] transition-transform ${isOpen ? "rotate-180" : ""}`}
                        />
                      </button>
                      <button
                        type="button"
                        disabled={i === 0}
                        onClick={() => moveField(i, -1)}
                        className="rounded p-1 text-[var(--cx-muted)] hover:bg-[var(--cx-line-2)] disabled:opacity-30"
                        aria-label={t("إلى الأعلى", "Move up")}
                      >
                        <ArrowUp className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        disabled={i === v.fields.length - 1}
                        onClick={() => moveField(i, 1)}
                        className="rounded p-1 text-[var(--cx-muted)] hover:bg-[var(--cx-line-2)] disabled:opacity-30"
                        aria-label={t("إلى الأسفل", "Move down")}
                      >
                        <ArrowDown className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setV((cur) => ({
                            ...cur,
                            fields: cur.fields.filter((x) => x.id !== f.id),
                          }))
                        }
                        className="rounded p-1 text-[var(--cx-muted)] hover:bg-[var(--cx-line-2)] hover:text-[var(--cx-red)]"
                        aria-label={t("حذف", "Delete")}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    {isOpen && (
                      <div className="space-y-3 border-t border-[var(--cx-line-2)] p-3">
                        <div className="grid gap-3 sm:grid-cols-2">
                          <Field label="السؤال بالعربية">
                            <Input
                              dir="rtl"
                              value={f.label_ar}
                              onChange={(e) => setField(f.id, { label_ar: e.target.value })}
                            />
                          </Field>
                          <Field label="Question in English">
                            <Input
                              dir="ltr"
                              value={f.label_en}
                              onChange={(e) => setField(f.id, { label_en: e.target.value })}
                            />
                          </Field>
                        </div>
                        <Field label={t("نوع الإجابة", "Answer type")}>
                          <select
                            value={f.type}
                            onChange={(e) => changeType(f, e.target.value as FieldType)}
                            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm sm:w-64"
                          >
                            {TYPES.map((x) => (
                              <option key={x.type} value={x.type}>
                                {ar ? x.ar : x.en}
                              </option>
                            ))}
                          </select>
                        </Field>
                        {(f.type === "short_text" ||
                          f.type === "long_text" ||
                          f.type === "email" ||
                          f.type === "number") && (
                          <div className="grid gap-3 sm:grid-cols-2">
                            <Field label="نص إرشادي بالعربية">
                              <Input
                                dir="rtl"
                                value={f.placeholder_ar ?? ""}
                                onChange={(e) => setField(f.id, { placeholder_ar: e.target.value })}
                              />
                            </Field>
                            <Field label="Placeholder in English">
                              <Input
                                dir="ltr"
                                value={f.placeholder_en ?? ""}
                                onChange={(e) => setField(f.id, { placeholder_en: e.target.value })}
                              />
                            </Field>
                          </div>
                        )}
                        {FIELD_TYPES_WITH_OPTIONS.includes(f.type) && (
                          <div className="rounded-lg bg-[var(--cx-raise)] p-3">
                            <div className="mb-2 text-[13px] font-bold">
                              {t("الخيارات", "Choices")}
                            </div>
                            <div className="space-y-2">
                              {(f.options ?? []).map((o, idx) => (
                                <div
                                  key={idx}
                                  className="grid gap-2 sm:grid-cols-[1fr_1fr_120px_auto]"
                                >
                                  <Input
                                    dir="rtl"
                                    placeholder="عربي"
                                    value={o.label_ar}
                                    onChange={(e) =>
                                      setField(f.id, {
                                        options: (f.options ?? []).map((x, k) =>
                                          k === idx ? { ...x, label_ar: e.target.value } : x,
                                        ),
                                      })
                                    }
                                  />
                                  <Input
                                    dir="ltr"
                                    placeholder="English"
                                    value={o.label_en}
                                    onChange={(e) =>
                                      setField(f.id, {
                                        options: (f.options ?? []).map((x, k) =>
                                          k === idx ? { ...x, label_en: e.target.value } : x,
                                        ),
                                      })
                                    }
                                  />
                                  <Input
                                    dir="ltr"
                                    className="font-mono text-[12.5px]"
                                    placeholder={t("القيمة", "Value")}
                                    title={t(
                                      "القيمة المخزّنة (للتصدير)",
                                      "Stored value (for exports)",
                                    )}
                                    value={o.value}
                                    onChange={(e) =>
                                      setField(f.id, {
                                        options: (f.options ?? []).map((x, k) =>
                                          k === idx ? { ...x, value: e.target.value } : x,
                                        ),
                                      })
                                    }
                                  />
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={() =>
                                      setField(f.id, {
                                        options: (f.options ?? []).filter((_, k) => k !== idx),
                                      })
                                    }
                                    aria-label={t("حذف الخيار", "Remove choice")}
                                  >
                                    <Trash2 className="h-4 w-4 text-[var(--cx-red)]" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              className="mt-2"
                              onClick={() => {
                                const n = (f.options?.length ?? 0) + 1;
                                setField(f.id, {
                                  options: [
                                    ...(f.options ?? []),
                                    {
                                      value: `opt${n}`,
                                      label_ar: `خيار ${n}`,
                                      label_en: `Option ${n}`,
                                    },
                                  ],
                                });
                              }}
                            >
                              <Plus className="h-4 w-4" />
                              {t("خيار", "Choice")}
                            </Button>
                          </div>
                        )}
                        <ToggleRow
                          id={`req-${f.id}`}
                          label={t("إجابة إلزامية", "Required")}
                          checked={f.required}
                          onChange={(x) => setField(f.id, { required: x })}
                        />
                      </div>
                    )}
                  </li>
                );
              })}
            </ol>
          )}
          <div className="mt-4 border-t border-[var(--cx-line-2)] pt-4">
            <div className="mb-2 text-[13px] font-bold text-[var(--cx-ink-2)]">
              {t("أضف سؤالاً", "Add a question")}
            </div>
            <div className="flex flex-wrap gap-2">
              {TYPES.map((x) => {
                const Icon = x.icon;
                return (
                  <button
                    key={x.type}
                    type="button"
                    onClick={() => addField(x.type)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--cx-line)] bg-[var(--cx-field)] px-3 py-1.5 text-[13px] font-bold hover:border-[var(--cx-teal)] hover:text-[var(--cx-teal)]"
                  >
                    <Icon className="h-4 w-4" />
                    {ar ? x.ar : x.en}
                  </button>
                );
              })}
            </div>
          </div>
        </Panel>
      </div>

      {initial ? (
        <SaveBar show={dirty} saving={saving} onSave={save} onDiscard={() => setV(saved)} />
      ) : (
        <div className="mt-5 flex justify-end">
          <Button onClick={save} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {t("إنشاء النموذج", "Create form")}
          </Button>
        </div>
      )}
    </div>
  );
}
