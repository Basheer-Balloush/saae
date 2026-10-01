import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
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
import { Field, useT } from "@/components/console/ui";

const FIELDS = [
  "approval_email_subject_ar",
  "approval_email_subject_en",
  "approval_email_body_ar",
  "approval_email_body_en",
  "approval_whatsapp_message_ar",
  "approval_whatsapp_message_en",
] as const;
type Key = (typeof FIELDS)[number];
type Values = Record<Key, string>;
const EMPTY = Object.fromEntries(FIELDS.map((k) => [k, ""])) as Values;

/* The per-course approval email and WhatsApp text. Empty fields use the
   default wording. */
export function ConfirmationMessagesDialog({
  courseId,
  open,
  onOpenChange,
}: {
  courseId: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { t } = useT();
  const [v, setV] = useState<Values>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    supabase
      .from("lms_courses")
      .select(FIELDS.join(","))
      .eq("id", courseId)
      .maybeSingle()
      .then(({ data, error }) => {
        setLoading(false);
        if (error) {
          toast.error(error.message);
          return;
        }
        const d = (data ?? {}) as unknown as Partial<Record<Key, string | null>>;
        setV(Object.fromEntries(FIELDS.map((k) => [k, d[k] ?? ""])) as Values);
      });
  }, [open, courseId]);

  const save = async () => {
    setSaving(true);
    const patch = Object.fromEntries(FIELDS.map((k) => [k, v[k].trim() || null]));
    const { error } = await supabase
      .from("lms_courses")
      .update(patch as never)
      .eq("id", courseId);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(t("تم الحفظ", "Saved"));
    onOpenChange(false);
  };

  const set = (k: Key) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setV({ ...v, [k]: e.target.value });

  return (
    <Dialog open={open} onOpenChange={(o) => !saving && onOpenChange(o)}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("رسائل تأكيد التسجيل", "Enrollment confirmation messages")}</DialogTitle>
          <DialogDescription>
            {t(
              "اترك الحقول فارغة لاستخدام النص الافتراضي. المتغيرات المتاحة: {{student_name}}, {{course_title}}, {{site_name}}, {{course_url}}",
              "Leave fields empty to use the default content. Available variables: {{student_name}}, {{course_title}}, {{site_name}}, {{course_url}}",
            )}
          </DialogDescription>
        </DialogHeader>
        {loading ? (
          <p className="py-8 text-center text-muted-foreground">{t("جارٍ التحميل…", "Loading…")}</p>
        ) : (
          <div className="space-y-4">
            <div className="text-[13px] font-extrabold text-[var(--cx-teal)]">
              {t("البريد الإلكتروني", "Email")}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="الموضوع (عربي)">
                <Input
                  dir="rtl"
                  value={v.approval_email_subject_ar}
                  onChange={set("approval_email_subject_ar")}
                  placeholder="تمت الموافقة على تسجيلك في {{course_title}}"
                />
              </Field>
              <Field label="Subject (English)">
                <Input
                  dir="ltr"
                  value={v.approval_email_subject_en}
                  onChange={set("approval_email_subject_en")}
                  placeholder="Your enrollment in {{course_title}} has been approved"
                />
              </Field>
            </div>
            <Field label="نص الرسالة (عربي)">
              <Textarea
                dir="rtl"
                rows={5}
                value={v.approval_email_body_ar}
                onChange={set("approval_email_body_ar")}
                placeholder={`مرحباً {{student_name}}،\n\nيسعدنا إخبارك بأنه قد تمت الموافقة على طلب تسجيلك في دورة "{{course_title}}".`}
              />
            </Field>
            <Field label="Body (English)">
              <Textarea
                dir="ltr"
                rows={5}
                value={v.approval_email_body_en}
                onChange={set("approval_email_body_en")}
                placeholder={`Hi {{student_name}},\n\nYour enrollment in "{{course_title}}" has been approved.`}
              />
            </Field>
            <div className="border-t border-[var(--cx-line)] pt-4 text-[13px] font-extrabold text-[var(--cx-green)]">
              {t("واتساب", "WhatsApp")}
              <span className="ms-2 font-normal text-[var(--cx-muted)]">
                {t(
                  "يُفتح بعد القبول مع هذه الرسالة لرقم الطالب.",
                  "Opens after approval with this message for the student's number.",
                )}
              </span>
            </div>
            <Field label="نص رسالة واتساب (عربي)">
              <Textarea
                dir="rtl"
                rows={4}
                value={v.approval_whatsapp_message_ar}
                onChange={set("approval_whatsapp_message_ar")}
                placeholder={`مرحباً {{student_name}}،\nتمت الموافقة على تسجيلك في "{{course_title}}". أهلاً بك في {{site_name}}.`}
              />
            </Field>
            <Field label="WhatsApp message (English)">
              <Textarea
                dir="ltr"
                rows={4}
                value={v.approval_whatsapp_message_en}
                onChange={set("approval_whatsapp_message_en")}
                placeholder={`Hi {{student_name}}, your enrollment in "{{course_title}}" has been approved. Welcome to {{site_name}}.`}
              />
            </Field>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            {t("إلغاء", "Cancel")}
          </Button>
          <Button onClick={save} disabled={saving || loading}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {t("حفظ", "Save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
