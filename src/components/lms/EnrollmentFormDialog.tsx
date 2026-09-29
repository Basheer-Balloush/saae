import { useEffect, useState } from "react";
import { CheckCircle2, Info, Loader2, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLmsAuth } from "@/hooks/useLmsAuth";
import { useLang } from "@/lib/i18n";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { toUserMessage } from "@/lib/safe-error";
import { enrollmentErrorMessage } from "@/lib/lms-enrollment-errors";
import { uploadToSupabaseStorage } from "@/lib/upload-with-progress";
import { UploadProgress } from "@/components/ui/upload-progress";
import {
  couponErrorMessage,
  formatSP,
  normalizeCode,
  quoteSummary,
  type CouponQuote,
} from "@/lib/coupons";
import { checkCoupon, loadEnrollNote, submitEnrollment, type EnrollNote } from "@/lib/coupons-db";

type FieldType =
  | "short_text" | "long_text" | "number" | "single_choice"
  | "multi_choice" | "yes_no" | "date" | "file" | "dropdown";

type Field = {
  id: string; display_order: number; field_type: FieldType;
  label_ar: string; label_en: string | null; help_text: string | null;
  options: string[];
};

type AnswerValue = string | number | boolean | string[] | null;

const MAX_FILE_MB = 10;

// Synthetic field IDs for the always-on base fields
export const BASE_FIELD_IDS = {
  fullName: "__base_full_name",
  phone: "__base_phone",
  email: "__base_email",
} as const;

/** How sending the form ended: a request for an admin, or (with a
    recognition code) an enrollment that goes straight to the feedback form. */
export type EnrollmentOutcome =
  | { status: "pending" }
  | {
      status: "recognized";
      certificateId: string | null;
    };

export function EnrollmentFormDialog({
  open, onOpenChange, courseId, onSubmitted,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  courseId: string;
  onSubmitted: (outcome: EnrollmentOutcome) => void;
}) {
  const { user } = useLmsAuth();
  const { lang } = useLang();
  const ar = lang === "ar";
  const [loading, setLoading] = useState(true);
  const [fields, setFields] = useState<Field[]>([]);
  const [values, setValues] = useState<Record<string, AnswerValue>>({});
  const [busy, setBusy] = useState(false);
  const [fileProgress, setFileProgress] = useState<Record<string, { pct: number; loaded: number; total: number; name: string }>>({});

  // The course's note above the form, and the optional coupon.
  const [note, setNote] = useState<EnrollNote>({ ar: null, en: null });
  const [code, setCode] = useState("");
  const [quote, setQuote] = useState<CouponQuote | null>(null);
  const [checking, setChecking] = useState(false);

  // Base fields
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const userEmail = user?.email ?? "";

  useEffect(() => {
    if (!open) return;
    (async () => {
      setLoading(true);
      const { data: f } = await supabase
        .from("lms_course_forms")
        .select("id")
        .eq("course_id", courseId)
        .eq("is_active", true)
        .maybeSingle();
      if (f) {
        const { data: ff } = await supabase
          .from("lms_course_form_fields")
          .select("*")
          .eq("form_id", f.id)
          .order("display_order");
        setFields(((ff as Array<{
          id: string; display_order: number; field_type: string;
          label_ar: string; label_en: string | null; help_text: string | null;
          options: unknown;
        }>) ?? []).map((x) => ({
          ...x,
          field_type: x.field_type as FieldType,
          options: Array.isArray(x.options) ? (x.options as string[]) : [],
        })));
      } else {
        setFields([]);
      }
      setValues({});
      setCode("");
      setQuote(null);
      setNote(await loadEnrollNote(courseId).catch(() => ({ ar: null, en: null })));
      // Prefill from auth user_metadata if available
      const meta = (user?.user_metadata ?? {}) as { full_name?: string; name?: string; phone?: string };
      setFullName(meta.full_name ?? meta.name ?? "");
      setPhone(meta.phone ?? "");
      setLoading(false);
    })();
  }, [open, courseId, user]);

  const setVal = (id: string, v: AnswerValue) => setValues((p) => ({ ...p, [id]: v }));

  const changeCode = (v: string) => {
    setCode(v);
    setQuote(null);
  };

  const check = async () => {
    if (!normalizeCode(code) || checking) return;
    setChecking(true);
    try {
      setQuote(await checkCoupon(courseId, code));
    } catch (e) {
      setQuote({ ok: false, error: e instanceof Error ? e.message : "" });
    } finally {
      setChecking(false);
    }
  };

  const handleFile = async (field: Field, file: File) => {
    if (!user) return;
    if (file.size > MAX_FILE_MB * 1024 * 1024) {
      toast.error(ar ? `الحد الأقصى ${MAX_FILE_MB} ميجا` : `Max ${MAX_FILE_MB} MB`);
      return;
    }
    const safeName = file.name.replace(/[^\w.\-]+/g, "_");
    const path = `form-uploads/${courseId}/${user.id}/${field.id}-${Date.now()}-${safeName}`;
    setFileProgress((p) => ({ ...p, [field.id]: { pct: 0, loaded: 0, total: file.size, name: file.name } }));
    try {
      await uploadToSupabaseStorage({
        bucket: "lms-private",
        path,
        file,
        upsert: true,
        contentType: file.type || undefined,
        onProgress: (pct, loaded, total) =>
          setFileProgress((p) => ({ ...p, [field.id]: { pct, loaded, total, name: file.name } })),
      });
      setVal(field.id, path);
    } catch (err) {
      toast.error(toUserMessage(err));
    } finally {
      setFileProgress((p) => {
        const next = { ...p };
        delete next[field.id];
        return next;
      });
    }
  };

  const submit = async () => {
    if (!user) return;
    // Validate base fields
    const trimmedName = fullName.trim();
    if (!trimmedName) {
      toast.error(ar ? "الاسم الكامل مطلوب" : "Full name is required");
      return;
    }
    // Must be Arabic letters only (allow spaces and Arabic diacritics)
    if (!/^[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF\s]+$/.test(trimmedName)) {
      toast.error(ar ? "يجب إدخال الاسم باللغة العربية فقط" : "Name must be in Arabic only");
      return;
    }
    if (trimmedName.replace(/\s/g, "").length < 2) {
      toast.error(ar ? "الاسم قصير جداً" : "Name is too short");
      return;
    }
    if (!phone.trim()) {
      toast.error(ar ? "رقم الهاتف مطلوب" : "Phone number is required");
      return;
    }
    if (!userEmail) {
      toast.error(ar ? "الإيميل غير متوفر في حسابك" : "Email is missing from your account");
      return;
    }
    // validate all required custom fields
    for (const f of fields) {
      const v = values[f.id];
      const empty =
        v === undefined || v === null || v === "" ||
        (Array.isArray(v) && v.length === 0);
      if (empty) {
        const label = ar ? f.label_ar : f.label_en || f.label_ar;
        toast.error(ar ? `الحقل "${label}" مطلوب` : `Field "${label}" is required`);
        return;
      }
    }
    setBusy(true);
    try {
      const baseAnswers = [
        { field_id: BASE_FIELD_IDS.fullName, value: fullName.trim() },
        { field_id: BASE_FIELD_IDS.phone, value: phone.trim() },
        { field_id: BASE_FIELD_IDS.email, value: userEmail },
      ];
      const customAnswers = fields.map((f) => ({ field_id: f.id, value: values[f.id] ?? null }));
      const answers = [...baseAnswers, ...customAnswers];

      // The request, its answers and any coupon are written together server-side.
      const res = await submitEnrollment({
        courseId,
        answers,
        coupon: normalizeCode(code) ? code : null,
      });
      if (!res.ok) {
        // A refused code writes nothing: show why under the field.
        setQuote(res);
        toast.error(couponErrorMessage(res.error, ar));
        return;
      }
      if (res.status === "recognized") {
        toast.success(
          ar
            ? "تم تسجيلك وإكمال الدورة. بقي استبيان التقييم لتحصل على شهادتك."
            : "You are enrolled and the course is completed. Answer the feedback form to get your certificate.",
        );
        onSubmitted({ status: "recognized", certificateId: res.certificate_id });
      } else {
        toast.success(ar ? "تم إرسال طلبك. سيتم التواصل معك قريباً." : "Request submitted. We will contact you soon.");
        onSubmitted({ status: "pending" });
      }
      onOpenChange(false);
    } catch (e) {
      toast.error(enrollmentErrorMessage(e, ar));

    } finally {
      setBusy(false);
    }
  };

  const renderField = (f: Field) => {
    const label = ar ? f.label_ar : f.label_en || f.label_ar;
    const v = values[f.id];
    return (
      <div key={f.id} className="space-y-1.5">
        <Label className="text-sm font-medium">{label} <span className="text-destructive">*</span></Label>
        {f.help_text && <p className="text-xs text-muted-foreground">{f.help_text}</p>}
        {f.field_type === "short_text" && (
          <Input value={(v as string) ?? ""} onChange={(e) => setVal(f.id, e.target.value)} />
        )}
        {f.field_type === "long_text" && (
          <Textarea rows={3} value={(v as string) ?? ""} onChange={(e) => setVal(f.id, e.target.value)} />
        )}
        {f.field_type === "number" && (
          <Input type="number" value={(v as string) ?? ""} onChange={(e) => setVal(f.id, e.target.value)} />
        )}
        {f.field_type === "date" && (
          <Input type="date" value={(v as string) ?? ""} onChange={(e) => setVal(f.id, e.target.value)} />
        )}
        {f.field_type === "yes_no" && (
          <div className="flex gap-3">
            {[true, false].map((b) => (
              <label key={String(b)} className="inline-flex items-center gap-1.5 text-sm">
                <input type="radio" checked={v === b} onChange={() => setVal(f.id, b)} />
                {b ? (ar ? "نعم" : "Yes") : (ar ? "لا" : "No")}
              </label>
            ))}
          </div>
        )}
        {(f.field_type === "single_choice") && (
          <div className="flex flex-col gap-1.5">
            {f.options.map((o) => (
              <label key={o} className="inline-flex items-center gap-1.5 text-sm">
                <input type="radio" checked={v === o} onChange={() => setVal(f.id, o)} /> {o}
              </label>
            ))}
          </div>
        )}
        {f.field_type === "dropdown" && (
          <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
            value={(v as string) ?? ""} onChange={(e) => setVal(f.id, e.target.value)}>
            <option value="">--</option>
            {f.options.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        )}
        {f.field_type === "multi_choice" && (
          <div className="flex flex-col gap-1.5">
            {f.options.map((o) => {
              const arr = (v as string[]) ?? [];
              const checked = arr.includes(o);
              return (
                <label key={o} className="inline-flex items-center gap-1.5 text-sm">
                  <input type="checkbox" checked={checked} onChange={(e) => {
                    setVal(f.id, e.target.checked ? [...arr, o] : arr.filter((x) => x !== o));
                  }} /> {o}
                </label>
              );
            })}
          </div>
        )}
        {f.field_type === "file" && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <label className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-input bg-background text-sm cursor-pointer hover:bg-muted">
                <Upload className="h-4 w-4" />
                <span>{ar ? "اختر ملف" : "Choose file"}</span>
                <input type="file" className="hidden" disabled={!!fileProgress[f.id]} onChange={(e) => { const fi = e.target.files?.[0]; if (fi) handleFile(f, fi); }} />
              </label>
              {v && !fileProgress[f.id] && <span className="text-xs text-emerald-600">✓ {ar ? "تم الرفع" : "Uploaded"}</span>}
            </div>
            {fileProgress[f.id] && (
              <UploadProgress
                percent={fileProgress[f.id].pct}
                loaded={fileProgress[f.id].loaded}
                total={fileProgress[f.id].total}
                label={fileProgress[f.id].name}
              />
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{ar ? "نموذج التسجيل" : "Enrollment form"}</DialogTitle>
          <DialogDescription>
            {ar ? "يرجى تعبئة الحقول التالية لإكمال طلب التسجيل." : "Please fill these fields to complete your enrollment request."}
          </DialogDescription>
        </DialogHeader>
        {loading ? (
          <p className="text-sm text-muted-foreground text-center py-6">{ar ? "جاري التحميل..." : "Loading..."}</p>
        ) : (
          <div className="space-y-4">
            {(ar ? note.ar || note.en : note.en || note.ar) && (
              <p className="flex items-start gap-2 whitespace-pre-line rounded-md bg-primary/10 px-3 py-2.5 text-sm leading-relaxed">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span>{ar ? note.ar || note.en : note.en || note.ar}</span>
              </p>
            )}
            {/* Base fields — always present */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">
                {ar ? "الاسم الكامل" : "Full name"} <span className="text-destructive">*</span>
              </Label>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder={ar ? "مثال: محمد أحمد" : "مثال: محمد أحمد"} dir="rtl" />
              <p className="text-xs text-muted-foreground">
                {ar ? "يجب إدخال الاسم باللغة العربية فقط" : "Name must be entered in Arabic only"}
              </p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">
                {ar ? "رقم الهاتف" : "Phone number"} <span className="text-destructive">*</span>
              </Label>
              <Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">
                {ar ? "البريد الإلكتروني" : "Email"} <span className="text-destructive">*</span>
              </Label>
              <Input type="email" value={userEmail} readOnly className="bg-muted/40" />
              <p className="text-xs text-muted-foreground">
                {ar ? "مأخوذ من حسابك تلقائياً" : "Pulled automatically from your account"}
              </p>
            </div>

            {fields.map(renderField)}

            <div className="space-y-1.5">
              <Label htmlFor="enroll-coupon" className="text-sm font-medium">
                {ar ? "كود الكوبون" : "Coupon code"}{" "}
                <span className="font-normal text-muted-foreground">
                  {ar ? "(اختياري)" : "(optional)"}
                </span>
              </Label>
              <div className="flex gap-2">
                <Input
                  id="enroll-coupon"
                  dir="ltr"
                  autoComplete="off"
                  spellCheck={false}
                  value={code}
                  onChange={(e) => changeCode(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      check();
                    }
                  }}
                  className="font-mono uppercase"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={check}
                  disabled={!normalizeCode(code) || checking || busy}
                >
                  {checking && <Loader2 className="h-4 w-4 animate-spin" />}
                  {ar ? "تحقّق" : "Check"}
                </Button>
              </div>
              {quote?.ok === true && (
                <div className="rounded-md bg-emerald-500/10 px-3 py-2 text-sm" role="status">
                  <p className="flex items-start gap-1.5">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                    <span>{quoteSummary(quote, ar)}</span>
                  </p>
                  {quote.effect === "discount" && (
                    <p className="mt-1 flex flex-wrap items-baseline gap-2 ps-6 tabular-nums">
                      <s className="text-muted-foreground">{formatSP(quote.list_price, ar)}</s>
                      <strong>{formatSP(quote.final_price, ar)}</strong>
                    </p>
                  )}
                </div>
              )}
              {quote?.ok === false && (
                <p className="text-sm text-destructive" role="alert">
                  {couponErrorMessage(quote.error, ar)}
                </p>
              )}
            </div>

            <div className="flex gap-2 pt-2 border-t border-border">
              <Button onClick={submit} disabled={busy} className="flex-1">
                {busy && <Loader2 className="h-4 w-4 animate-spin mx-1" />}
                {quote?.ok === true && quote.effect === "recognition"
                  ? ar
                    ? "التسجيل والانتقال إلى التقييم"
                    : "Enroll and go to the feedback form"
                  : ar
                    ? "إرسال الطلب"
                    : "Submit request"}
              </Button>
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
                {ar ? "إلغاء" : "Cancel"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
