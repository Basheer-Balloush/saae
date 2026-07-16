import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/event-survey")({
  head: () => ({
    meta: [
      { title: "استبيان المشاريع الناشئة | SAAE" },
      { name: "description", content: "شارك تفاصيل مشروعك أو شركتك الناشئة." },
      { property: "og:title", content: "استبيان المشاريع الناشئة" },
      { property: "og:description", content: "شارك تفاصيل مشروعك أو شركتك الناشئة." },
    ],
  }),
  component: EventSurvey,
});

const STAGES = [
  "فكرة",
  "نموذج أولي (Prototype)",
  "منتج أولي (MVP)",
  "منتج جاهز",
  "مشروع قائم ويحقق إيرادات",
  "شركة ناشئة متوسعة",
];

function EventSurvey() {
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [f, setF] = useState({
    project_name: "", contact_name: "", phone: "", email: "", city: "",
    website: "", facebook_url: "", instagram_url: "", linkedin_url: "",
    field: "", description: "", problem_solved: "", stage: "",
    team_size: "", notes: "",
  });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setF((s) => ({ ...s, [k]: e.target.value }));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const words = f.description.trim().split(/\s+/).filter(Boolean).length;
    if (words < 50 || words > 150) {
      toast.error(`وصف المشروع يجب أن يكون بين 50 و150 كلمة (حالياً: ${words})`);
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("event_survey_responses").insert({
      project_name: f.project_name.trim(),
      contact_name: f.contact_name.trim(),
      phone: f.phone.trim(),
      email: f.email.trim(),
      city: f.city.trim(),
      website: f.website.trim() || null,
      facebook_url: f.facebook_url.trim() || null,
      instagram_url: f.instagram_url.trim() || null,
      linkedin_url: f.linkedin_url.trim() || null,
      field: f.field.trim(),
      description: f.description.trim(),
      problem_solved: f.problem_solved.trim(),
      stage: f.stage,
      team_size: f.team_size.trim(),
      notes: f.notes.trim() || null,
    });
    setSubmitting(false);
    if (error) { toast.error(error.message); return; }
    setDone(true);
    toast.success("تم إرسال الاستبيان بنجاح");
  };

  if (done) {
    return (
      <div dir="rtl" className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="max-w-md text-center bg-card border border-border rounded-2xl p-8">
          <CheckCircle2 className="h-14 w-14 text-primary mx-auto mb-4" />
          <h1 className="text-2xl font-bold">شكراً لمشاركتك!</h1>
          <p className="text-muted-foreground mt-2">تم استلام بياناتك وسنتواصل معك قريباً.</p>
        </div>
      </div>
    );
  }

  return (
    <div dir="rtl" className="min-h-screen bg-background py-10 px-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold">استبيان المشاريع والشركات الناشئة</h1>
        <p className="text-muted-foreground mt-2">
          يرجى تعبئة البيانات التالية عن مشروعك.
        </p>

        <form onSubmit={onSubmit} className="mt-8 space-y-5 bg-card border border-border rounded-2xl p-6">
          <Field label="اسم المشروع أو الشركة الناشئة" required>
            <Input value={f.project_name} onChange={set("project_name")} required maxLength={200} />
          </Field>
          <Field label="اسم الشخص المسؤول عن المشاركة" required>
            <Input value={f.contact_name} onChange={set("contact_name")} required maxLength={200} />
          </Field>
          <div className="grid md:grid-cols-2 gap-4">
            <Field label="رقم الهاتف" required>
              <Input dir="ltr" type="tel" value={f.phone} onChange={set("phone")} required maxLength={40} />
            </Field>
            <Field label="البريد الإلكتروني" required>
              <Input dir="ltr" type="email" value={f.email} onChange={set("email")} required maxLength={200} />
            </Field>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <Field label="المدينة" required>
              <Input value={f.city} onChange={set("city")} required maxLength={100} />
            </Field>
            <Field label="الموقع الإلكتروني (إن وجد)">
              <Input dir="ltr" type="url" value={f.website} onChange={set("website")} maxLength={300} placeholder="https://" />
            </Field>
          </div>

          <div className="pt-2">
            <p className="text-sm font-semibold mb-2">روابط صفحات المشروع (إن وجدت)</p>
            <div className="space-y-3">
              <Field label="Facebook">
                <Input dir="ltr" value={f.facebook_url} onChange={set("facebook_url")} maxLength={300} placeholder="https://facebook.com/..." />
              </Field>
              <Field label="Instagram">
                <Input dir="ltr" value={f.instagram_url} onChange={set("instagram_url")} maxLength={300} placeholder="https://instagram.com/..." />
              </Field>
              <Field label="LinkedIn">
                <Input dir="ltr" value={f.linkedin_url} onChange={set("linkedin_url")} maxLength={300} placeholder="https://linkedin.com/..." />
              </Field>
            </div>
          </div>

          <Field label="ما هو مجال عمل المشروع؟" required>
            <Input value={f.field} onChange={set("field")} required maxLength={200} />
          </Field>

          <Field label="صف مشروعك (50 - 150 كلمة)" required>
            <Textarea value={f.description} onChange={set("description")} required rows={5} maxLength={2000} />
            <p className="text-xs text-muted-foreground mt-1">
              عدد الكلمات: {f.description.trim().split(/\s+/).filter(Boolean).length}
            </p>
          </Field>

          <Field label="ما المشكلة التي يحلها مشروعك؟" required>
            <Textarea value={f.problem_solved} onChange={set("problem_solved")} required rows={3} maxLength={1500} />
          </Field>

          <Field label="في أي مرحلة يوجد المشروع الآن؟" required>
            <Select value={f.stage} onValueChange={(v) => setF((s) => ({ ...s, stage: v }))}>
              <SelectTrigger><SelectValue placeholder="اختر المرحلة" /></SelectTrigger>
              <SelectContent>
                {STAGES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>

          <Field label="كم عدد أفراد الفريق؟" required>
            <Input value={f.team_size} onChange={set("team_size")} required maxLength={50} />
          </Field>

          <Field label="هل لديك أي ملاحظات؟">
            <Textarea value={f.notes} onChange={set("notes")} rows={3} maxLength={1500} />
          </Field>

          <Button type="submit" disabled={submitting || !f.stage} className="w-full">
            {submitting ? "جاري الإرسال..." : "إرسال الاستبيان"}
          </Button>
        </form>
      </div>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <Label className="mb-1.5 block">
        {label} {required && <span className="text-destructive">*</span>}
      </Label>
      {children}
    </div>
  );
}
