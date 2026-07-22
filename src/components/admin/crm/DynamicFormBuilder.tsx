import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, ArrowUp, ArrowDown, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { useLang } from "@/lib/i18n";
import { toUserMessage } from "@/lib/safe-error";
import {
  FIELD_TYPES,
  FIELD_TYPES_WITH_OPTIONS,
  RESERVED_SLUGS,
  formInputSchema,
  isValidSlug,
  newFieldId,
  normalizeSlug,
  type DynamicForm,
  type FieldType,
  type FormField,
} from "@/lib/dynamic-forms";
import { createDynamicForm, updateDynamicForm } from "@/lib/dynamic-forms.functions";

const T = {
  ar: {
    nameAr: "الاسم بالعربية", nameEn: "الاسم بالإنكليزية",
    descAr: "الوصف بالعربية (اختياري)", descEn: "الوصف بالإنكليزية (اختياري)",
    submitAr: "زر الإرسال بالعربية", submitEn: "زر الإرسال بالإنكليزية",
    slug: "الرابط (Slug)", slugHint: "أحرف صغيرة وأرقام وشرطات فقط",
    status: "الحالة", draft: "مسودة", published: "منشور",
    fields: "الحقول", addField: "إضافة حقل", noFields: "لا توجد حقول بعد",
    labelAr: "التسمية بالعربية", labelEn: "التسمية بالإنكليزية",
    required: "إلزامي", type: "النوع",
    options: "الخيارات", addOption: "إضافة خيار",
    optValue: "القيمة", optLabelAr: "التسمية عربي", optLabelEn: "التسمية إنكليزي",
    placeholderAr: "نص افتراضي عربي", placeholderEn: "نص افتراضي إنكليزي",
    save: "حفظ", cancel: "إلغاء",
    slugWarnTitle: "تغيير رابط نموذج منشور",
    slugWarnBody: "قد تتوقف الروابط القديمة عن العمل. هل تريد المتابعة؟",
    confirm: "متابعة",
    slugTaken: "الرابط مستخدم مسبقاً",
    slugInvalid: "رابط غير صالح أو محجوز",
    saved: "تم الحفظ",
    remove: "حذف",
  },
  en: {
    nameAr: "Name (Arabic)", nameEn: "Name (English)",
    descAr: "Description (Arabic, optional)", descEn: "Description (English, optional)",
    submitAr: "Submit label (Arabic)", submitEn: "Submit label (English)",
    slug: "Slug", slugHint: "Lowercase letters, digits, and hyphens only",
    status: "Status", draft: "Draft", published: "Published",
    fields: "Fields", addField: "Add field", noFields: "No fields yet",
    labelAr: "Label (Arabic)", labelEn: "Label (English)",
    required: "Required", type: "Type",
    options: "Options", addOption: "Add option",
    optValue: "Value", optLabelAr: "Label (AR)", optLabelEn: "Label (EN)",
    placeholderAr: "Placeholder (AR)", placeholderEn: "Placeholder (EN)",
    save: "Save", cancel: "Cancel",
    slugWarnTitle: "Change slug of a published form",
    slugWarnBody: "Existing links may stop working. Continue?",
    confirm: "Continue",
    slugTaken: "Slug already in use",
    slugInvalid: "Invalid or reserved slug",
    saved: "Saved",
    remove: "Remove",
  },
};

const TYPE_LABELS_AR: Record<FieldType, string> = {
  short_text: "نص قصير", long_text: "نص طويل", email: "بريد إلكتروني", number: "رقم",
  select: "قائمة منسدلة", radio: "اختيار واحد", checkbox_group: "اختيار متعدد",
  single_checkbox: "مربع موافقة", date: "تاريخ",
};
const TYPE_LABELS_EN: Record<FieldType, string> = {
  short_text: "Short text", long_text: "Long text", email: "Email", number: "Number",
  select: "Dropdown", radio: "Radio", checkbox_group: "Checkboxes",
  single_checkbox: "Single checkbox", date: "Date",
};

export function DynamicFormBuilder({ initial }: { initial?: DynamicForm }) {
  const { lang } = useLang();
  const tr = T[lang];
  const navigate = useNavigate();
  const create = useServerFn(createDynamicForm);
  const update = useServerFn(updateDynamicForm);

  const [nameAr, setNameAr] = useState(initial?.name_ar ?? "");
  const [nameEn, setNameEn] = useState(initial?.name_en ?? "");
  const [descAr, setDescAr] = useState(initial?.description_ar ?? "");
  const [descEn, setDescEn] = useState(initial?.description_en ?? "");
  const [submitAr, setSubmitAr] = useState(initial?.submit_label_ar ?? "إرسال");
  const [submitEn, setSubmitEn] = useState(initial?.submit_label_en ?? "Submit");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(!!initial);
  const [status, setStatus] = useState<FormStatus>(initial?.status ?? "draft");
  const [fields, setFields] = useState<FormField[]>(initial?.fields ?? []);
  const [saving, setSaving] = useState(false);
  const [slugConfirm, setSlugConfirm] = useState(false);

  const wasPublished = initial?.status === "published";
  const originalSlug = initial?.slug;
  const slugChanged = !!originalSlug && originalSlug !== slug;

  // Auto-suggest slug from English name until user edits it
  useEffect(() => {
    if (!slugTouched && nameEn) setSlug(normalizeSlug(nameEn));
  }, [nameEn, slugTouched]);

  const slugError = useMemo(() => {
    if (!slug) return null;
    if (!isValidSlug(slug)) return tr.slugInvalid;
    if (RESERVED_SLUGS.has(slug)) return tr.slugInvalid;
    return null;
  }, [slug, tr]);

  const updateField = (id: string, patch: Partial<FormField>) =>
    setFields((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)));

  const moveField = (i: number, dir: -1 | 1) => {
    setFields((prev) => {
      const next = [...prev];
      const j = i + dir;
      if (j < 0 || j >= next.length) return prev;
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  };

  const addField = () => {
    setFields((prev) => [
      ...prev,
      { id: newFieldId(), type: "short_text", label_ar: "", label_en: "", required: false },
    ]);
  };

  const removeField = (id: string) => setFields((prev) => prev.filter((f) => f.id !== id));

  const changeType = (id: string, type: FieldType) => {
    updateField(id, {
      type,
      options: FIELD_TYPES_WITH_OPTIONS.includes(type)
        ? [{ value: "opt1", label_ar: "خيار 1", label_en: "Option 1" }]
        : undefined,
    });
  };

  const addOption = (fieldId: string) => {
    const f = fields.find((x) => x.id === fieldId);
    if (!f) return;
    const opts = f.options ?? [];
    const n = opts.length + 1;
    updateField(fieldId, {
      options: [...opts, { value: `opt${n}`, label_ar: `خيار ${n}`, label_en: `Option ${n}` }],
    });
  };

  const removeOption = (fieldId: string, idx: number) => {
    const f = fields.find((x) => x.id === fieldId);
    if (!f?.options) return;
    updateField(fieldId, { options: f.options.filter((_, i) => i !== idx) });
  };

  const submit = async () => {
    if (slugError) {
      toast.error(slugError);
      return;
    }
    if (wasPublished && slugChanged && !slugConfirm) {
      // open confirmation dialog
      document.getElementById("slug-warn-open")?.click();
      return;
    }
    const payload = {
      slug,
      name_ar: nameAr,
      name_en: nameEn,
      description_ar: descAr || null,
      description_en: descEn || null,
      submit_label_ar: submitAr,
      submit_label_en: submitEn,
      status,
      fields,
    };
    const parsed = formInputSchema.safeParse(payload);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "invalid");
      return;
    }
    setSaving(true);
    try {
      const saved = initial
        ? await update({ data: { ...parsed.data, id: initial.id } })
        : await create({ data: parsed.data });
      toast.success(tr.saved);
      navigate({ to: "/admin/crm/forms/$formSlug", params: { formSlug: saved.slug } });
    } catch (e) {
      const msg = toUserMessage(e);
      if (msg.includes("slug_taken")) toast.error(tr.slugTaken);
      else if (msg.includes("invalid_slug") || msg.includes("reserved_slug")) toast.error(tr.slugInvalid);
      else toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Meta */}
      <div className="grid gap-4 rounded-xl border border-border bg-card p-4 sm:grid-cols-2">
        <div className="space-y-1">
          <Label>{tr.nameAr}</Label>
          <Input dir="rtl" value={nameAr} onChange={(e) => setNameAr(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label>{tr.nameEn}</Label>
          <Input dir="ltr" value={nameEn} onChange={(e) => setNameEn(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label>{tr.descAr}</Label>
          <Textarea dir="rtl" value={descAr ?? ""} onChange={(e) => setDescAr(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label>{tr.descEn}</Label>
          <Textarea dir="ltr" value={descEn ?? ""} onChange={(e) => setDescEn(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label>{tr.submitAr}</Label>
          <Input dir="rtl" value={submitAr} onChange={(e) => setSubmitAr(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label>{tr.submitEn}</Label>
          <Input dir="ltr" value={submitEn} onChange={(e) => setSubmitEn(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label>{tr.slug}</Label>
          <Input
            dir="ltr"
            value={slug}
            onChange={(e) => {
              setSlugTouched(true);
              setSlug(normalizeSlug(e.target.value));
            }}
            aria-invalid={!!slugError}
          />
          <p className={`text-xs ${slugError ? "text-destructive" : "text-muted-foreground"}`}>
            {slugError ?? `${tr.slugHint} · /forms/${slug || "…"}`}
          </p>
        </div>
        <div className="space-y-1">
          <Label>{tr.status}</Label>
          <Select value={status} onValueChange={(v) => setStatus(v as "draft" | "published")}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">{tr.draft}</SelectItem>
              <SelectItem value="published">{tr.published}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Fields */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground">{tr.fields}</h3>
          <Button type="button" size="sm" onClick={addField}>
            <Plus className="h-4 w-4" /> {tr.addField}
          </Button>
        </div>

        {fields.length === 0 && (
          <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            {tr.noFields}
          </p>
        )}

        {fields.map((f, i) => (
          <div key={f.id} className="rounded-xl border border-border bg-card p-4 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted-foreground">#{i + 1}</span>
              <div className="flex-1" />
              <Button type="button" size="icon" variant="ghost" onClick={() => moveField(i, -1)} aria-label="Move up">
                <ArrowUp className="h-4 w-4" />
              </Button>
              <Button type="button" size="icon" variant="ghost" onClick={() => moveField(i, 1)} aria-label="Move down">
                <ArrowDown className="h-4 w-4" />
              </Button>
              <Button type="button" size="icon" variant="ghost" onClick={() => removeField(f.id)} aria-label={tr.remove}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>{tr.labelAr}</Label>
                <Input dir="rtl" value={f.label_ar} onChange={(e) => updateField(f.id, { label_ar: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>{tr.labelEn}</Label>
                <Input dir="ltr" value={f.label_en} onChange={(e) => updateField(f.id, { label_en: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>{tr.type}</Label>
                <Select value={f.type} onValueChange={(v) => changeType(f.id, v as FieldType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {FIELD_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {lang === "ar" ? TYPE_LABELS_AR[t] : TYPE_LABELS_EN[t]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2 pt-6">
                <Switch checked={f.required} onCheckedChange={(v) => updateField(f.id, { required: v })} id={`req-${f.id}`} />
                <Label htmlFor={`req-${f.id}`}>{tr.required}</Label>
              </div>
              {(f.type === "short_text" || f.type === "long_text" || f.type === "email" || f.type === "number") && (
                <>
                  <div className="space-y-1">
                    <Label>{tr.placeholderAr}</Label>
                    <Input dir="rtl" value={f.placeholder_ar ?? ""} onChange={(e) => updateField(f.id, { placeholder_ar: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label>{tr.placeholderEn}</Label>
                    <Input dir="ltr" value={f.placeholder_en ?? ""} onChange={(e) => updateField(f.id, { placeholder_en: e.target.value })} />
                  </div>
                </>
              )}
            </div>

            {FIELD_TYPES_WITH_OPTIONS.includes(f.type) && (
              <div className="space-y-2 rounded-lg border border-border bg-muted/40 p-3">
                <div className="flex items-center justify-between">
                  <Label>{tr.options}</Label>
                  <Button type="button" size="sm" variant="outline" onClick={() => addOption(f.id)}>
                    <Plus className="h-3 w-3" /> {tr.addOption}
                  </Button>
                </div>
                {(f.options ?? []).map((o, idx) => (
                  <div key={idx} className="grid gap-2 sm:grid-cols-[1fr,1fr,1fr,auto]">
                    <Input placeholder={tr.optValue} value={o.value} dir="ltr" onChange={(e) => {
                      const opts = [...(f.options ?? [])];
                      opts[idx] = { ...o, value: e.target.value };
                      updateField(f.id, { options: opts });
                    }} />
                    <Input placeholder={tr.optLabelAr} dir="rtl" value={o.label_ar} onChange={(e) => {
                      const opts = [...(f.options ?? [])];
                      opts[idx] = { ...o, label_ar: e.target.value };
                      updateField(f.id, { options: opts });
                    }} />
                    <Input placeholder={tr.optLabelEn} dir="ltr" value={o.label_en} onChange={(e) => {
                      const opts = [...(f.options ?? [])];
                      opts[idx] = { ...o, label_en: e.target.value };
                      updateField(f.id, { options: opts });
                    }} />
                    <Button type="button" size="icon" variant="ghost" onClick={() => removeOption(f.id, idx)} aria-label={tr.remove}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => navigate({ to: "/admin/crm/forms" })}>
          {tr.cancel}
        </Button>
        <Button type="button" onClick={submit} disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 animate-spin" />} {tr.save}
        </Button>
      </div>

      {/* Slug change warning */}
      <Dialog open={slugConfirm} onOpenChange={setSlugConfirm}>
        <button id="slug-warn-open" type="button" className="hidden" onClick={() => setSlugConfirm(true)} />
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" /> {tr.slugWarnTitle}
            </DialogTitle>
            <DialogDescription>{tr.slugWarnBody}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSlugConfirm(false)}>{tr.cancel}</Button>
            <Button
              variant="destructive"
              onClick={() => {
                setSlugConfirm(false);
                // proceed by re-invoking submit with confirm=true effect: temporarily unset wasPublished check
                setTimeout(() => {
                  (async () => {
                    const payload = {
                      slug, name_ar: nameAr, name_en: nameEn,
                      description_ar: descAr || null, description_en: descEn || null,
                      submit_label_ar: submitAr, submit_label_en: submitEn,
                      status, fields,
                    };
                    const parsed = formInputSchema.safeParse(payload);
                    if (!parsed.success) { toast.error(parsed.error.issues[0]?.message ?? "invalid"); return; }
                    setSaving(true);
                    try {
                      const saved = initial
                        ? await update({ data: { ...parsed.data, id: initial.id } })
                        : await create({ data: parsed.data });
                      toast.success(tr.saved);
                      navigate({ to: "/admin/crm/forms/$formSlug", params: { formSlug: saved.slug } });
                    } catch (e) {
                      toast.error(toUserMessage(e));
                    } finally {
                      setSaving(false);
                    }
                  })();
                }, 0);
              }}
            >
              {tr.confirm}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
