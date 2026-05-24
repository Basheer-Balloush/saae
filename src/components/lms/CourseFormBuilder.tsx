import { useEffect, useState } from "react";
import { Plus, Trash2, Loader2, GripVertical, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLmsAuth } from "@/hooks/useLmsAuth";
import { useLang } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { toUserMessage } from "@/lib/safe-error";

type FieldType =
  | "short_text" | "long_text" | "number" | "single_choice"
  | "multi_choice" | "yes_no" | "date" | "file" | "dropdown";

type Field = {
  id: string;
  form_id: string;
  display_order: number;
  field_type: FieldType;
  label_ar: string;
  label_en: string | null;
  help_text: string | null;
  options: string[];
  validation: Record<string, unknown>;
};

type Form = { id: string; course_id: string; is_active: boolean };

const NEW_PREFIX = "new-";

export function CourseFormBuilder({ courseId }: { courseId: string }) {
  const { user } = useLmsAuth();
  const { lang } = useLang();
  const ar = lang === "ar";
  const [form, setForm] = useState<Form | null>(null);
  const [fields, setFields] = useState<Field[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data: f } = await supabase
      .from("lms_course_forms")
      .select("id,course_id,is_active")
      .eq("course_id", courseId)
      .maybeSingle();
    if (f) {
      setForm(f as Form);
      const { data: ff } = await supabase
        .from("lms_course_form_fields")
        .select("*")
        .eq("form_id", f.id)
        .order("display_order");
      setFields(
        ((ff as Array<{
          id: string; form_id: string; display_order: number; field_type: string;
          label_ar: string; label_en: string | null; help_text: string | null;
          options: unknown; validation: unknown;
        }>) ?? []).map((x) => ({
          ...x,
          field_type: x.field_type as FieldType,
          options: Array.isArray(x.options) ? (x.options as string[]) : [],
          validation: (x.validation as Record<string, unknown>) ?? {},
        }))
      );
    } else {
      setForm(null);
      setFields([]);
    }
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [courseId]);

  const enableForm = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("lms_course_forms")
      .insert({ course_id: courseId, created_by: user.id, is_active: true })
      .select("id,course_id,is_active")
      .maybeSingle();
    if (error) { toast.error(toUserMessage(error)); return; }
    setForm(data as Form);
  };

  const toggleActive = async (val: boolean) => {
    if (!form) return;
    const { error } = await supabase.from("lms_course_forms").update({ is_active: val }).eq("id", form.id);
    if (error) { toast.error(toUserMessage(error)); return; }
    setForm({ ...form, is_active: val });
  };

  const addField = () => {
    if (!form) return;
    setFields([...fields, {
      id: `${NEW_PREFIX}${Date.now()}`,
      form_id: form.id,
      display_order: fields.length,
      field_type: "short_text",
      label_ar: "",
      label_en: "",
      help_text: "",
      options: [],
      validation: {},
    }]);
  };

  const updateField = (id: string, patch: Partial<Field>) => {
    setFields(fields.map((f) => f.id === id ? { ...f, ...patch } : f));
  };

  const removeField = (id: string) => {
    setFields(fields.filter((f) => f.id !== id));
  };

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= fields.length) return;
    const next = [...fields];
    [next[i], next[j]] = [next[j], next[i]];
    setFields(next.map((f, idx) => ({ ...f, display_order: idx })));
  };

  const saveAll = async () => {
    if (!form) return;
    // basic validation
    for (const f of fields) {
      if (!f.label_ar.trim()) {
        toast.error(ar ? "كل حقل يجب أن يحوي عنواناً بالعربية" : "Every field needs an Arabic label");
        return;
      }
      if (["single_choice", "multi_choice", "dropdown"].includes(f.field_type) && f.options.length < 2) {
        toast.error(ar ? `الحقل "${f.label_ar}" يحتاج خيارين على الأقل` : `Field "${f.label_ar}" needs at least 2 options`);
        return;
      }
    }
    setSaving(true);
    try {
      // Delete fields that no longer exist
      const existingIds = fields.filter((f) => !f.id.startsWith(NEW_PREFIX)).map((f) => f.id);
      const { data: current } = await supabase
        .from("lms_course_form_fields").select("id").eq("form_id", form.id);
      const toDelete = ((current as Array<{ id: string }>) ?? [])
        .filter((c) => !existingIds.includes(c.id)).map((c) => c.id);
      if (toDelete.length) {
        await supabase.from("lms_course_form_fields").delete().in("id", toDelete);
      }
      // Upsert
      for (let i = 0; i < fields.length; i++) {
        const f = fields[i];
        const payload: {
          form_id: string;
          display_order: number;
          field_type: string;
          label_ar: string;
          label_en: string | null;
          help_text: string | null;
          options: string[];
          validation: Record<string, unknown>;
        } = {
          form_id: form.id,
          display_order: i,
          field_type: f.field_type,
          label_ar: f.label_ar,
          label_en: f.label_en || null,
          help_text: f.help_text || null,
          options: f.options,
          validation: f.validation,
        };
        if (f.id.startsWith(NEW_PREFIX)) {
          await supabase.from("lms_course_form_fields").insert(payload as never);
        } else {
          await supabase.from("lms_course_form_fields").update(payload as never).eq("id", f.id);
        }
      }
      await supabase.from("lms_course_forms").update({ updated_at: new Date().toISOString() }).eq("id", form.id);
      toast.success(ar ? "تم حفظ النموذج" : "Form saved");
      await load();
    } catch (e) {
      toast.error(toUserMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const fieldTypeLabel = (t: FieldType) => {
    const ARM = {
      short_text: "نص قصير", long_text: "نص طويل", number: "رقم",
      single_choice: "اختيار واحد", multi_choice: "اختيار متعدد",
      yes_no: "نعم / لا", date: "تاريخ", file: "ملف", dropdown: "قائمة منسدلة",
    };
    const EN = {
      short_text: "Short text", long_text: "Long text", number: "Number",
      single_choice: "Single choice", multi_choice: "Multiple choice",
      yes_no: "Yes / No", date: "Date", file: "File", dropdown: "Dropdown",
    };
    return ar ? ARM[t] : EN[t];
  };

  if (loading) {
    return (
      <section className="rounded-2xl border border-border bg-card p-5">
        <p className="text-sm text-muted-foreground">{ar ? "جاري التحميل..." : "Loading..."}</p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-5 space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="font-bold text-foreground">{ar ? "نموذج تسجيل مخصص" : "Custom enrollment form"}</h2>
          <p className="text-xs text-muted-foreground mt-1">
            {ar ? "اطلب من الطلاب تعبئة هذا النموذج قبل قبول طلب التسجيل." : "Require students to fill this form before submitting their enrollment request."}
          </p>
        </div>
        {!form ? (
          <Button size="sm" onClick={enableForm}>
            <Plus className="h-4 w-4 mx-1" />{ar ? "إنشاء نموذج" : "Create form"}
          </Button>
        ) : (
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.is_active} onChange={(e) => toggleActive(e.target.checked)} />
            {ar ? "النموذج مفعّل" : "Form active"}
          </label>
        )}
      </div>

      {form && (
        <div className="space-y-3">
          {fields.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4 border border-dashed border-border rounded-lg">
              {ar ? "لا توجد حقول بعد. أضف أول حقل." : "No fields yet. Add your first field."}
            </p>
          )}

          {fields.map((f, i) => {
            const needsOptions = ["single_choice", "multi_choice", "dropdown"].includes(f.field_type);
            return (
              <div key={f.id} className="rounded-xl border border-border p-3 space-y-3 bg-background">
                <div className="flex items-center gap-2">
                  <div className="flex flex-col">
                    <button type="button" onClick={() => move(i, -1)} className="text-muted-foreground hover:text-foreground" disabled={i === 0}>▲</button>
                    <button type="button" onClick={() => move(i, 1)} className="text-muted-foreground hover:text-foreground" disabled={i === fields.length - 1}>▼</button>
                  </div>
                  <GripVertical className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs font-semibold text-muted-foreground">#{i + 1}</span>
                  <div className="ms-auto">
                    <Select
                      value={f.field_type}
                      onValueChange={(val) => updateField(f.id, {
                        field_type: val as FieldType,
                        options: ["single_choice","multi_choice","dropdown"].includes(val) ? f.options : [],
                      })}
                    >
                      <SelectTrigger className="h-8 w-[170px] text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(["short_text","long_text","number","single_choice","multi_choice","yes_no","date","file","dropdown"] as FieldType[]).map((t) => (
                          <SelectItem key={t} value={t} className="text-xs">{fieldTypeLabel(t)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => removeField(f.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>

                <div className="grid sm:grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">{ar ? "السؤال (عربي) *" : "Question (AR) *"}</Label>
                    <Input value={f.label_ar} onChange={(e) => updateField(f.id, { label_ar: e.target.value })} />
                  </div>
                  <div>
                    <Label className="text-xs">{ar ? "السؤال (إنجليزي)" : "Question (EN)"}</Label>
                    <Input value={f.label_en ?? ""} onChange={(e) => updateField(f.id, { label_en: e.target.value })} />
                  </div>
                </div>

                <div>
                  <Label className="text-xs">{ar ? "نص توضيحي (اختياري)" : "Help text (optional)"}</Label>
                  <Input value={f.help_text ?? ""} onChange={(e) => updateField(f.id, { help_text: e.target.value })} />
                </div>

                {needsOptions && (
                  <div>
                    <Label className="text-xs">{ar ? "الخيارات (سطر لكل خيار)" : "Options (one per line)"}</Label>
                    <Textarea
                      rows={3}
                      value={f.options.join("\n")}
                      onChange={(e) => updateField(f.id, { options: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean) })}
                    />
                  </div>
                )}

                {f.field_type === "file" && (
                  <p className="text-xs text-muted-foreground">
                    {ar ? "الحد الأقصى لحجم الملف: 10 ميجا" : "Max file size: 10 MB"}
                  </p>
                )}
              </div>
            );
          })}

          <div className="flex gap-2 pt-2 border-t border-border">
            <Button size="sm" variant="outline" onClick={addField}>
              <Plus className="h-4 w-4 mx-1" />{ar ? "إضافة حقل" : "Add field"}
            </Button>
            <Button size="sm" onClick={saveAll} disabled={saving} className="ms-auto">
              {saving ? <Loader2 className="h-4 w-4 animate-spin mx-1" /> : <Save className="h-4 w-4 mx-1" />}
              {ar ? "حفظ النموذج" : "Save form"}
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
