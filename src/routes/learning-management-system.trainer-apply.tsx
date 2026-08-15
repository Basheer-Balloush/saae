import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { Loader2, Upload, X, CheckCircle2, FileText } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useLmsAuth } from "@/hooks/useLmsAuth";
import { useLang } from "@/lib/i18n";
import { toUserMessage } from "@/lib/safe-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { uploadToSupabaseStorage } from "@/lib/upload-with-progress";
import {
  submitTrainerApplication,
  attachTrainerApplicationFile,
} from "@/lib/trainer-application.functions";
import { UploadProgress } from "@/components/ui/upload-progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/learning-management-system/trainer-apply")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "LMS · طلب اعتماد كمدرّب / Trainer application" },
      {
        name: "description",
        content:
          "Apply to become an accredited AI trainer with the Syrian Association for AI Empowerment (SAAE).",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: TrainerApplyPage,
});

const SPECIALIZATIONS = [
  { id: "ml", ar: "تعلم الآلة", en: "Machine Learning" },
  { id: "nlp", ar: "معالجة اللغة الطبيعية", en: "NLP" },
  { id: "automation", ar: "الأتمتة", en: "Automation" },
  { id: "cv", ar: "الرؤية الحاسوبية", en: "Computer Vision" },
  { id: "llm", ar: "النماذج اللغوية الكبيرة", en: "LLMs" },
  { id: "other", ar: "أخرى", en: "Other" },
] as const;

const EXPERIENCE_LEVELS = [
  { id: "lt_1", ar: "أقل من سنة", en: "Less than 1 year" },
  { id: "1_2", ar: "من 1 إلى 2 سنة", en: "1–2 years" },
  { id: "3_5", ar: "من 3 إلى 5 سنوات", en: "3–5 years" },
  { id: "5_plus", ar: "أكثر من 5 سنوات", en: "5+ years" },
] as const;

const schema = z.object({
  fullNameAr: z.string().trim().min(1),
  fullNameEn: z.string().trim().min(1),
  phone: z.string().trim().min(1),
  dateOfBirth: z.string().refine((v) => {
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return false;
    const age = (Date.now() - d.getTime()) / (365.25 * 24 * 3600 * 1000);
    return age >= 18;
  }, { message: "min_age_18" }),
  city: z.string().trim().min(1),
  experienceLevel: z.enum(["lt_1", "1_2", "3_5", "5_plus"]),
  specializations: z.array(z.string()).min(1),
  bio: z.string().trim().min(1),
  linkedinUrl: z.string().trim().url(),
  githubUrl: z.string().trim().url().optional().or(z.literal("")),
  hasPrevTraining: z.boolean(),
  prevTrainingDetails: z.string().optional().or(z.literal("")),
  consentEthics: z.literal(true),
  consentData: z.literal(true),
  consentProcess: z.literal(true),
});

type ExistingApp = { id: string; status: string; submitted_at: string };

function TrainerApplyPage() {
  const navigate = useNavigate();
  const { user, loading } = useLmsAuth();
  const { lang } = useLang();
  const ar = lang === "ar";

  const [existing, setExisting] = useState<ExistingApp | null>(null);
  const [loadingExisting, setLoadingExisting] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploadPct, setUploadPct] = useState<{ pct: number; loaded: number; total: number; name: string; index: number; count: number } | null>(null);

  const [fullNameAr, setFullNameAr] = useState("");
  const [fullNameEn, setFullNameEn] = useState("");
  const [phone, setPhone] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [city, setCity] = useState("");
  const [experienceLevel, setExperienceLevel] = useState<string>("");
  const [specializations, setSpecializations] = useState<string[]>([]);
  const [bio, setBio] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
  const [hasPrevTraining, setHasPrevTraining] = useState(false);
  const [prevTrainingDetails, setPrevTrainingDetails] = useState("");
  const [consentEthics, setConsentEthics] = useState(false);
  const [consentData, setConsentData] = useState(false);
  const [consentProcess, setConsentProcess] = useState(false);
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [workSamples, setWorkSamples] = useState<File[]>([]);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate({ to: "/learning-management-system/login" });
      return;
    }
    (async () => {
      const { data } = await supabase
        .from("trainer_applications")
        .select("id,status,submitted_at")
        .eq("user_id", user.id)
        .maybeSingle();
      setExisting(data as ExistingApp | null);
      setLoadingExisting(false);
    })();
  }, [loading, user, navigate]);

  const toggleSpec = (id: string) =>
    setSpecializations((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
    );

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!cvFile) {
      toast.error(ar ? "يجب رفع السيرة الذاتية" : "CV file is required");
      return;
    }
    if (workSamples.length < 1) {
      toast.error(ar ? "يجب رفع نموذج عمل واحد على الأقل" : "Upload at least one work sample");
      return;
    }
    const parsed = schema.safeParse({
      fullNameAr,
      fullNameEn,
      phone,
      dateOfBirth,
      city,
      experienceLevel,
      specializations,
      bio,
      linkedinUrl,
      githubUrl,
      hasPrevTraining,
      prevTrainingDetails,
      consentEthics,
      consentData,
      consentProcess,
    });
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      const msg = issue.message;
      const map: Record<string, string> = {
        min_age_18: ar ? "يجب أن يكون عمرك 18 سنة أو أكثر" : "You must be at least 18 years old",
      };
      toast.error(map[msg] ?? (ar ? `تحقق من الحقل: ${issue.path.join(".")}` : `Check field: ${issue.path.join(".")}`));
      return;
    }
    setSubmitting(true);
    try {
      // 1) create application row through the protected command (A-06)
      const { application_id: applicationId } = await submitTrainerApplication({
        data: {
          full_name_ar: parsed.data.fullNameAr,
          full_name_en: parsed.data.fullNameEn,
          phone: parsed.data.phone,
          date_of_birth: parsed.data.dateOfBirth,
          city: parsed.data.city,
          experience_level: parsed.data.experienceLevel as "lt_1" | "1_2" | "3_5" | "5_plus",
          specializations: parsed.data.specializations,
          bio: parsed.data.bio,
          linkedin_url: parsed.data.linkedinUrl,
          github_url: parsed.data.githubUrl || null,
          has_prev_training: parsed.data.hasPrevTraining,
          prev_training_details: parsed.data.prevTrainingDetails || null,
          consent_ethics: true,
          consent_data: true,
          consent_process: true,
        },
      });

      // 2) upload files, registering each one through the protected command
      const uploads: { kind: "cv" | "work_sample" | "avatar"; file: File }[] = [
        { kind: "cv", file: cvFile },
        ...workSamples.map((f) => ({ kind: "work_sample" as const, file: f })),
      ];
      if (avatarFile) uploads.push({ kind: "avatar", file: avatarFile });

      const total = uploads.length;
      for (let i = 0; i < uploads.length; i++) {
        const u = uploads[i];
        const safeName = u.file.name.replace(/[^A-Za-z0-9._-]/g, "_");
        const path = `${user.id}/${applicationId}/${u.kind}-${Date.now()}-${safeName}`;
        setUploadPct({ pct: 0, loaded: 0, total: u.file.size, name: u.file.name, index: i + 1, count: total });
        await uploadToSupabaseStorage({
          bucket: "trainer-applications",
          path,
          file: u.file,
          upsert: false,
          contentType: u.file.type,
          onProgress: (pct, loaded, tot) =>
            setUploadPct({ pct, loaded, total: tot, name: u.file.name, index: i + 1, count: total }),
        });
        await attachTrainerApplicationFile({
          data: {
            application_id: applicationId,
            kind: u.kind,
            storage_path: path,
            original_name: u.file.name,
            content_type: u.file.type || null,
            size_bytes: u.file.size,
          },
        });
      }

      toast.success(ar ? "تم إرسال طلبك بنجاح" : "Application submitted");
      setExisting({ id: applicationId, status: "pending_review", submitted_at: new Date().toISOString() });

    } catch (err) {
      toast.error(toUserMessage(err));
    } finally {
      setSubmitting(false);
      setUploadPct(null);
    }
  };

  if (loading || loadingExisting) {
    return <p className="text-center py-20 text-muted-foreground">…</p>;
  }

  if (existing) {
    return (
      <div className="mx-auto max-w-2xl px-4 sm:px-6 py-16">
        <div className="rounded-2xl border border-primary/30 bg-primary/5 p-8 text-center">
          <CheckCircle2 className="mx-auto h-12 w-12 text-primary" />
          <h1 className="mt-4 text-2xl font-bold text-foreground">
            {ar ? "طلبك قيد المراجعة" : "Your application is under review"}
          </h1>
          <p className="mt-3 text-muted-foreground">
            {ar
              ? "استلمنا طلبك للاعتماد كمدرّب معتمد ضمن نظام معادلة المدربين. سيتواصل معك فريق اللجنة عبر البريد الإلكتروني خلال أيام قليلة لبدء مراحل التقييم."
              : "We received your accreditation application. The committee will contact you by email within a few days to start the evaluation phases."}
          </p>
          <p className="mt-4 text-xs text-muted-foreground">
            {ar ? "الحالة الحالية" : "Current status"}:{" "}
            <span className="font-semibold text-foreground">{existing.status}</span>
          </p>
          <Link
            to="/learning-management-system"
            className="mt-6 inline-block text-sm text-primary hover:underline"
          >
            {ar ? "العودة إلى المنصة" : "Back to the platform"}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-8 sm:py-12">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
          {ar ? "طلب اعتماد كمدرّب" : "Trainer accreditation application"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {ar
            ? "يمر كل طلب بأربع مراحل تقييم (نظري، عملي، تدريب، مقابلة) ثم إعادة تقييم دورية كل 6 أشهر. اقرأ الشروط جيداً قبل الإرسال."
            : "Every application passes through four evaluation phases (theory, practical, training demo, interview) and a periodic re-evaluation every 6 months."}
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-8">
        {/* Personal */}
        <section className="rounded-2xl border border-border bg-card p-5 space-y-4">
          <h2 className="font-bold text-foreground">
            {ar ? "١. البيانات الشخصية" : "1. Personal information"}
          </h2>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Label>{ar ? "الاسم الكامل (عربي)" : "Full name (Arabic)"} *</Label>
              <Input dir="rtl" required value={fullNameAr} onChange={(e) => setFullNameAr(e.target.value)} />
            </div>
            <div>
              <Label>{ar ? "الاسم الكامل (إنجليزي)" : "Full name (English)"} *</Label>
              <Input dir="ltr" required value={fullNameEn} onChange={(e) => setFullNameEn(e.target.value)} />
            </div>
            <div>
              <Label>{ar ? "رقم الهاتف" : "Phone"} *</Label>
              <Input dir="ltr" required value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+963…" />
            </div>
            <div>
              <Label>{ar ? "تاريخ الميلاد" : "Date of birth"} *</Label>
              <Input type="date" required value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <Label>{ar ? "المدينة" : "City"} *</Label>
              <Input required value={city} onChange={(e) => setCity(e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <Label>{ar ? "صورة شخصية (اختياري في هذه المرحلة)" : "Profile photo (optional at this stage)"}</Label>
              <Input type="file" accept="image/*" onChange={(e) => setAvatarFile(e.target.files?.[0] ?? null)} />
            </div>
          </div>
        </section>

        {/* Eligibility */}
        <section className="rounded-2xl border border-border bg-card p-5 space-y-4">
          <h2 className="font-bold text-foreground">
            {ar ? "٢. بيانات الأهلية" : "2. Eligibility"}
          </h2>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Label>{ar ? "سنوات الخبرة بالذكاء الاصطناعي" : "AI experience"} *</Label>
              <Select value={experienceLevel} onValueChange={setExperienceLevel}>
                <SelectTrigger><SelectValue placeholder={ar ? "اختر…" : "Select…"} /></SelectTrigger>
                <SelectContent>
                  {EXPERIENCE_LEVELS.map((l) => (
                    <SelectItem key={l.id} value={l.id}>{ar ? l.ar : l.en}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{ar ? "رابط LinkedIn" : "LinkedIn URL"} *</Label>
              <Input dir="ltr" required type="url" value={linkedinUrl} onChange={(e) => setLinkedinUrl(e.target.value)} placeholder="https://linkedin.com/in/…" />
            </div>
            <div className="sm:col-span-2">
              <Label>{ar ? "المجالات التخصصية (اختر واحدة على الأقل)" : "Specializations (pick at least one)"} *</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {SPECIALIZATIONS.map((s) => {
                  const active = specializations.includes(s.id);
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => toggleSpec(s.id)}
                      className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
                        active
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border hover:border-primary"
                      }`}
                    >
                      {ar ? s.ar : s.en}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="sm:col-span-2">
              <Label>
                {ar ? "نبذة عن الخبرة" : "Experience summary"} *
              </Label>
              <Textarea rows={5} required value={bio} onChange={(e) => setBio(e.target.value)} />
            </div>
            <div>
              <Label>{ar ? "رابط GitHub / Portfolio" : "GitHub / Portfolio URL"}</Label>
              <Input dir="ltr" type="url" value={githubUrl} onChange={(e) => setGithubUrl(e.target.value)} />
            </div>
            <div className="flex items-end gap-2">
              <Checkbox id="prev" checked={hasPrevTraining} onCheckedChange={(v) => setHasPrevTraining(!!v)} />
              <Label htmlFor="prev" className="cursor-pointer">
                {ar ? "لديّ خبرة تدريبية سابقة" : "I have previous training experience"}
              </Label>
            </div>
            {hasPrevTraining && (
              <div className="sm:col-span-2">
                <Label>{ar ? "تفاصيل الخبرة التدريبية" : "Previous training details"}</Label>
                <Textarea rows={3} value={prevTrainingDetails} onChange={(e) => setPrevTrainingDetails(e.target.value)} />
              </div>
            )}
            <div className="sm:col-span-2">
              <Label>{ar ? "السيرة الذاتية" : "CV"} *</Label>
              <Input type="file" onChange={(e) => setCvFile(e.target.files?.[0] ?? null)} />
              {cvFile && (
                <p className="mt-1 text-xs text-muted-foreground flex items-center gap-1">
                  <FileText className="h-3 w-3" /> {cvFile.name}
                </p>
              )}
            </div>
            <div className="sm:col-span-2">
              <Label>{ar ? "نماذج أعمال أو مشاريع (ملف واحد على الأقل)" : "Work samples (at least one)"} *</Label>
              <Input
                type="file"
                multiple
                onChange={(e) => setWorkSamples(Array.from(e.target.files ?? []))}
              />
              {workSamples.length > 0 && (
                <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                  {workSamples.map((f, i) => (
                    <li key={i} className="flex items-center justify-between gap-2 rounded border border-border px-2 py-1">
                      <span className="truncate">{f.name}</span>
                      <button type="button" onClick={() => setWorkSamples((prev) => prev.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-destructive">
                        <X className="h-3 w-3" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </section>

        {/* Consents */}
        <section className="rounded-2xl border border-border bg-card p-5 space-y-3">
          <h2 className="font-bold text-foreground">{ar ? "٣. الموافقات" : "3. Consents"}</h2>
          <label className="flex items-start gap-2 cursor-pointer text-sm">
            <Checkbox checked={consentEthics} onCheckedChange={(v) => setConsentEthics(!!v)} />
            <span>{ar ? "أوافق على سياسات وأخلاقيات الجمعية." : "I accept the association's ethics and policies."}</span>
          </label>
          <label className="flex items-start gap-2 cursor-pointer text-sm">
            <Checkbox checked={consentData} onCheckedChange={(v) => setConsentData(!!v)} />
            <span>{ar ? "أوافق على معالجة بياناتي الشخصية لأغراض التقييم." : "I consent to processing of my personal data for evaluation."}</span>
          </label>
          <label className="flex items-start gap-2 cursor-pointer text-sm">
            <Checkbox checked={consentProcess} onCheckedChange={(v) => setConsentProcess(!!v)} />
            <span>
              {ar
                ? "أفهم أن نظام المعادلة يتكون من 4 مراحل (نظري، عملي، تدريب، مقابلة) وإعادة تقييم دورية كل 6 أشهر."
                : "I understand the accreditation has 4 phases (theory, practical, training demo, interview) and a periodic re-evaluation every 6 months."}
            </span>
          </label>
        </section>

        {uploadPct && (
          <div className="rounded-xl border border-border bg-card p-4">
            <UploadProgress
              percent={uploadPct.pct}
              loaded={uploadPct.loaded}
              total={uploadPct.total}
              label={`${ar ? "الملف" : "File"} ${uploadPct.index}/${uploadPct.count} — ${uploadPct.name}`}
            />
          </div>
        )}

        <div className="flex justify-end gap-2">
          <Button type="submit" disabled={submitting}>
            {submitting && <Loader2 className="h-4 w-4 animate-spin mx-2" />}
            <Upload className="h-4 w-4 mx-1" />
            {ar ? "إرسال الطلب" : "Submit application"}
          </Button>
        </div>
      </form>
    </div>
  );
}
