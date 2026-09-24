import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { Loader2, Upload, X, FileText } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useLmsAuth } from "@/hooks/useLmsAuth";
import { useLang } from "@/lib/i18n";
import { toUserMessage } from "@/lib/safe-error";
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
import { SubHero } from "@/components/lms-skin/SubHero";
import { LMS_SKIN_LINKS } from "@/components/lms-skin/skin";

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
    links: LMS_SKIN_LINKS,
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

  const eyebrow = ar ? "اعتماد المدرّبين" : "Trainer accreditation";

  if (loading || loadingExisting) {
    return (
      <section className="lms-hero lms-subhero">
        <div className="page-shell">
          <p className="state-box">
            <Loader2 className="h-5 w-5 animate-spin" />
          </p>
        </div>
      </section>
    );
  }

  if (existing) {
    return (
      <SubHero
        id="trainer-title"
        eyebrow={eyebrow}
        titleSpans={[ar ? "طلبك قيد المراجعة" : "Your application is under review"]}
        titleClassName="course-page-title"
        lede={
          ar
            ? "استلمنا طلبك للاعتماد كمدرّب معتمد ضمن نظام معادلة المدربين. سيتواصل معك فريق اللجنة عبر البريد الإلكتروني خلال أيام قليلة لبدء مراحل التقييم."
            : "We received your accreditation application. The committee will contact you by email within a few days to start the evaluation phases."
        }
        copyChildren={
          <>
            <p className="course-tags course-hero-tags">
              <span>
                {ar ? "الحالة الحالية" : "Current status"}: {existing.status}
              </span>
            </p>
            <p style={{ marginTop: 26 }}>
              <Link to="/learning-management-system" className="action action-primary">
                {ar ? "العودة إلى المنصة" : "Back to the platform"}
              </Link>
            </p>
          </>
        }
      />
    );
  }

  return (
    <>
      <SubHero
        id="trainer-title"
        eyebrow={eyebrow}
        titleSpans={ar ? ["طلب اعتماد", "كمدرّب"] : ["Trainer", "accreditation"]}
        lede={
          ar
            ? "يمر كل طلب بأربع مراحل تقييم (نظري، عملي، تدريب، مقابلة) ثم إعادة تقييم دورية كل 6 أشهر. اقرأ الشروط جيداً قبل الإرسال."
            : "Every application passes through four evaluation phases (theory, practical, training demo, interview) and a periodic re-evaluation every 6 months."
        }
      />

      <section className="lms-section" aria-labelledby="trainer-title">
        <div className="page-shell">
          <form onSubmit={onSubmit} className="narrow-stack">
            <article className="pro-card">
              <h2>{ar ? "١. البيانات الشخصية" : "1. Personal information"}</h2>
              <div className="form-grid">
                <div className="field">
                  <label htmlFor="ta-name-ar">{ar ? "الاسم الكامل (عربي)" : "Full name (Arabic)"} *</label>
                  <input id="ta-name-ar" type="text" dir="rtl" required value={fullNameAr} onChange={(e) => setFullNameAr(e.target.value)} />
                </div>
                <div className="field">
                  <label htmlFor="ta-name-en">{ar ? "الاسم الكامل (إنجليزي)" : "Full name (English)"} *</label>
                  <input id="ta-name-en" type="text" dir="ltr" required value={fullNameEn} onChange={(e) => setFullNameEn(e.target.value)} />
                </div>
                <div className="field">
                  <label htmlFor="ta-phone">{ar ? "رقم الهاتف" : "Phone"} *</label>
                  <input id="ta-phone" type="tel" dir="ltr" required value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+963…" />
                </div>
                <div className="field">
                  <label htmlFor="ta-dob">{ar ? "تاريخ الميلاد" : "Date of birth"} *</label>
                  <input id="ta-dob" type="date" required value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} />
                </div>
                <div className="field span-2">
                  <label htmlFor="ta-city">{ar ? "المدينة" : "City"} *</label>
                  <input id="ta-city" type="text" required value={city} onChange={(e) => setCity(e.target.value)} />
                </div>
                <div className="field span-2">
                  <label htmlFor="ta-avatar">{ar ? "صورة شخصية (اختياري في هذه المرحلة)" : "Profile photo (optional at this stage)"}</label>
                  <input id="ta-avatar" type="file" accept="image/*" onChange={(e) => setAvatarFile(e.target.files?.[0] ?? null)} />
                </div>
              </div>
            </article>

            <article className="pro-card">
              <h2>{ar ? "٢. بيانات الأهلية" : "2. Eligibility"}</h2>
              <div className="form-grid">
                <div className="field">
                  <label htmlFor="ta-exp">{ar ? "سنوات الخبرة بالذكاء الاصطناعي" : "AI experience"} *</label>
                  <Select value={experienceLevel} onValueChange={setExperienceLevel}>
                    <SelectTrigger id="ta-exp"><SelectValue placeholder={ar ? "اختر…" : "Select…"} /></SelectTrigger>
                    <SelectContent>
                      {EXPERIENCE_LEVELS.map((l) => (
                        <SelectItem key={l.id} value={l.id}>{ar ? l.ar : l.en}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="field">
                  <label htmlFor="ta-linkedin">{ar ? "رابط LinkedIn" : "LinkedIn URL"} *</label>
                  <input id="ta-linkedin" dir="ltr" required type="url" value={linkedinUrl} onChange={(e) => setLinkedinUrl(e.target.value)} placeholder="https://linkedin.com/in/…" />
                </div>
                <fieldset className="field span-2">
                  <legend>{ar ? "المجالات التخصصية (اختر واحدة على الأقل)" : "Specializations (pick at least one)"} *</legend>
                  <div className="course-filters" role="group">
                    {SPECIALIZATIONS.map((s) => (
                      <button key={s.id} type="button" aria-pressed={specializations.includes(s.id)} onClick={() => toggleSpec(s.id)}>
                        <span>{ar ? s.ar : s.en}</span>
                      </button>
                    ))}
                  </div>
                </fieldset>
                <div className="field span-2">
                  <label htmlFor="ta-bio">{ar ? "نبذة عن الخبرة" : "Experience summary"} *</label>
                  <textarea id="ta-bio" rows={5} required value={bio} onChange={(e) => setBio(e.target.value)} />
                </div>
                <div className="field">
                  <label htmlFor="ta-github">{ar ? "رابط GitHub / Portfolio" : "GitHub / Portfolio URL"}</label>
                  <input id="ta-github" dir="ltr" type="url" value={githubUrl} onChange={(e) => setGithubUrl(e.target.value)} />
                </div>
                <label className="check-row" htmlFor="prev">
                  <Checkbox id="prev" checked={hasPrevTraining} onCheckedChange={(v) => setHasPrevTraining(!!v)} />
                  <span>{ar ? "لديّ خبرة تدريبية سابقة" : "I have previous training experience"}</span>
                </label>
                {hasPrevTraining && (
                  <div className="field span-2">
                    <label htmlFor="ta-prev">{ar ? "تفاصيل الخبرة التدريبية" : "Previous training details"}</label>
                    <textarea id="ta-prev" rows={3} value={prevTrainingDetails} onChange={(e) => setPrevTrainingDetails(e.target.value)} />
                  </div>
                )}
                <div className="field span-2">
                  <label htmlFor="ta-cv">{ar ? "السيرة الذاتية" : "CV"} *</label>
                  <input id="ta-cv" type="file" onChange={(e) => setCvFile(e.target.files?.[0] ?? null)} />
                  {cvFile && (
                    <p className="field-note">
                      <FileText className="h-3 w-3" /> {cvFile.name}
                    </p>
                  )}
                </div>
                <div className="field span-2">
                  <label htmlFor="ta-samples">{ar ? "نماذج أعمال أو مشاريع (ملف واحد على الأقل)" : "Work samples (at least one)"} *</label>
                  <input id="ta-samples" type="file" multiple onChange={(e) => setWorkSamples(Array.from(e.target.files ?? []))} />
                  {workSamples.length > 0 && (
                    <ul className="file-list">
                      {workSamples.map((f, i) => (
                        <li key={i}>
                          <span>{f.name}</span>
                          <button
                            type="button"
                            aria-label={ar ? "إزالة" : "Remove"}
                            onClick={() => setWorkSamples((prev) => prev.filter((_, j) => j !== i))}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </article>

            <article className="pro-card">
              <h2>{ar ? "٣. الموافقات" : "3. Consents"}</h2>
              <div className="consent-list">
                <label className="check-row">
                  <Checkbox checked={consentEthics} onCheckedChange={(v) => setConsentEthics(!!v)} />
                  <span>{ar ? "أوافق على سياسات وأخلاقيات الجمعية." : "I accept the association's ethics and policies."}</span>
                </label>
                <label className="check-row">
                  <Checkbox checked={consentData} onCheckedChange={(v) => setConsentData(!!v)} />
                  <span>{ar ? "أوافق على معالجة بياناتي الشخصية لأغراض التقييم." : "I consent to processing of my personal data for evaluation."}</span>
                </label>
                <label className="check-row">
                  <Checkbox checked={consentProcess} onCheckedChange={(v) => setConsentProcess(!!v)} />
                  <span>
                    {ar
                      ? "أفهم أن نظام المعادلة يتكون من 4 مراحل (نظري، عملي، تدريب، مقابلة) وإعادة تقييم دورية كل 6 أشهر."
                      : "I understand the accreditation has 4 phases (theory, practical, training demo, interview) and a periodic re-evaluation every 6 months."}
                  </span>
                </label>
              </div>
            </article>

            {uploadPct && (
              <article className="pro-card">
                <UploadProgress
                  percent={uploadPct.pct}
                  loaded={uploadPct.loaded}
                  total={uploadPct.total}
                  label={`${ar ? "الملف" : "File"} ${uploadPct.index}/${uploadPct.count} — ${uploadPct.name}`}
                />
              </article>
            )}

            <div className="apply-bar">
              <button type="submit" className="auth-submit" disabled={submitting}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                <span>{ar ? "إرسال الطلب" : "Submit application"}</span>
              </button>
            </div>
          </form>
        </div>
      </section>
    </>
  );
}
