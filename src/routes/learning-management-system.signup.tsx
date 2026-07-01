import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { useLmsAuth } from "@/hooks/useLmsAuth";
import { useLang } from "@/lib/i18n";
import { lmsT } from "@/lib/lms-i18n";
import { localizeAuthError } from "@/lib/auth-error-i18n";
import { signUpLmsUser } from "@/lib/lms-auth.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, MailCheck, Eye, EyeOff } from "lucide-react";
import logo from "@/assets/saae-logo.png";

export const Route = createFileRoute("/learning-management-system/signup")({
  head: () => ({ meta: [{ title: "LMS · Sign up" }] }),
  component: LmsSignup,
});

const ARABIC_NAME_RE = /^[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF\s]+$/;

function calculatePasswordStrength(pw: string): number {
  let score = 0;
  if (pw.length >= 6) score += 1;
  if (pw.length >= 10) score += 1;
  if (/[a-z]/.test(pw)) score += 1;
  if (/[A-Z]/.test(pw)) score += 1;
  if (/[0-9]/.test(pw)) score += 1;
  if (/[^A-Za-z0-9]/.test(pw)) score += 1;
  return score;
}

function getStrengthInfo(score: number, lang: "ar" | "en") {
  const t = lmsT[lang];
  if (score <= 2) return { label: t.passwordWeak, color: "bg-red-500", width: `${(score / 6) * 100}%`, textColor: "text-red-500" };
  if (score <= 4) return { label: t.passwordMedium, color: "bg-amber-500", width: `${(score / 6) * 100}%`, textColor: "text-amber-500" };
  return { label: t.passwordStrong, color: "bg-green-600", width: `${(score / 6) * 100}%`, textColor: "text-green-600" };
}

const schema = z.object({
  fullName: z.string().trim().min(5).max(120).refine(
    (v) => {
      if (!ARABIC_NAME_RE.test(v)) return false;
      const parts = v.split(/\s+/).filter((p) => p.length >= 2);
      return parts.length >= 3;
    },
    { message: "ARABIC_TRIPLE" },
  ),
  email: z.string().trim().email().max(255),
  password: z.string().min(6).max(72),
  confirmPassword: z.string().min(6).max(72),
}).refine((d) => d.password === d.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

function LmsSignup() {
  const navigate = useNavigate();
  const { user, loading } = useLmsAuth();
  const { lang } = useLang();
  const tr = lmsT[lang];
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [asInstructor, setAsInstructor] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const signUpUser = useServerFn(signUpLmsUser);

  const passwordStrength = useMemo(() => calculatePasswordStrength(password), [password]);
  const strengthInfo = useMemo(() => getStrengthInfo(passwordStrength, lang), [passwordStrength, lang]);

  useEffect(() => {
    if (!loading && user) navigate({ to: "/learning-management-system/student" });
  }, [loading, user, navigate]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({ fullName, email, password, confirmPassword });
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      const code = issue.path[0];
      if (code === "fullName") {
        toast.error(lang === "ar" ? "يجب إدخال الاسم الثلاثي باللغة العربية (ثلاث كلمات على الأقل)" : "Enter your triple name in Arabic (at least three words)");
      } else if (code === "confirmPassword" || issue.message.includes("match")) {
        toast.error(lang === "ar" ? "كلمتا المرور غير متطابقتين" : "Passwords do not match");
      } else {
        toast.error(code === "email" ? tr.invalidEmail : tr.passwordMin);
      }
      return;
    }
    setSubmitting(true);
    try {
      await signUpUser({ data: { fullName: parsed.data.fullName, email: parsed.data.email, password: parsed.data.password, asInstructor, lang } });
      setSentTo(parsed.data.email);
      toast.success(tr.signedUp);
    } catch (err: unknown) {
      toast.error(localizeAuthError(err, lang, tr.authFailed));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center px-6 py-24">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-soft">
        <div className="flex flex-col items-center text-center">
          <img
            src={logo}
            alt="SAAE"
            width={80}
            height={80}
            className="h-16 w-auto"
          />
        </div>
        <h1 className="mt-3 text-xl font-bold text-foreground text-center">{tr.signUpTitle}</h1>
        <p className="mt-1 text-sm text-muted-foreground text-center">{tr.signUpSubtitle}</p>

        {sentTo ? (
          <div className="mt-6 flex flex-col items-center text-center gap-3 rounded-xl border border-primary/30 bg-primary/5 p-5">
            <div className="rounded-full bg-primary/10 p-3">
              <MailCheck className="h-7 w-7 text-primary" />
            </div>
            <h2 className="text-base font-semibold text-foreground">
              {lang === "ar" ? "تحقّق من بريدك الإلكتروني" : "Check your email"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {lang === "ar"
                ? "أرسلنا رابط تأكيد إلى"
                : "We sent a confirmation link to"}{" "}
              <span className="font-semibold text-foreground" dir="ltr">{sentTo}</span>
              {". "}
              {lang === "ar"
                ? "افتح الرابط لتفعيل حسابك."
                : "Open the link to activate your account."}
            </p>
            {asInstructor && (
              <div className="mt-2 w-full rounded-lg border border-amber-400/40 bg-amber-50 dark:bg-amber-950/30 px-4 py-3 text-sm text-amber-900 dark:text-amber-200 space-y-2">
                <p className="font-semibold">
                  {lang === "ar" ? "⏳ الخطوة التالية: املأ نموذج اعتماد المدرّب" : "⏳ Next step: complete the trainer application"}
                </p>
                <p className="text-xs opacity-90">
                  {lang === "ar"
                    ? "بعد تأكيد بريدك، سجّل الدخول ثم املأ نموذج طلب الاعتماد (٤ مراحل تقييم: نظري، عملي، تدريب، مقابلة) قبل نشر أي دورة."
                    : "After confirming your email, sign in and complete the accreditation application (4 evaluation phases) before publishing any course."}
                </p>
                <Link
                  to="/learning-management-system/trainer-apply"
                  className="inline-block text-xs font-semibold text-primary hover:underline"
                >
                  {lang === "ar" ? "فتح نموذج طلب الاعتماد ←" : "Open the accreditation form →"}
                </Link>
              </div>
            )}
            <Link
              to="/learning-management-system/login"
              className="mt-2 text-sm text-primary hover:underline font-medium"
            >
              {tr.haveAccount}
            </Link>
          </div>
        ) : (
          <>
            <form onSubmit={onSubmit} className="mt-5 space-y-3">
              <div>
                <Label htmlFor="name">{lang === "ar" ? "الاسم الثلاثي" : "Triple name"}</Label>
                <Input id="name" required value={fullName} onChange={(e) => setFullName(e.target.value)} dir="rtl" placeholder="مثال: محمد أحمد خالد" />
                <p className="mt-1 text-xs text-muted-foreground">
                  {lang === "ar" ? "ثلاث كلمات باللغة العربية فقط (الاسم، اسم الأب، الكنية)" : "Three Arabic words only (first, father, family)"}
                </p>
              </div>
              <div>
                <Label htmlFor="email">{tr.email}</Label>
                <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} dir="ltr" />
              </div>
              <div>
                <Label htmlFor="password">{tr.password}</Label>
                <div className="relative mt-2">
                  <Input id="password" type={showPassword ? "text" : "password"} autoComplete="new-password" required value={password} onChange={(e) => setPassword(e.target.value)} dir="ltr" className="pr-10" />
                  <button type="button" tabIndex={-1} onClick={() => setShowPassword((v) => !v)} className="absolute inset-y-0 right-2 flex items-center text-muted-foreground hover:text-foreground" aria-label={showPassword ? "Hide password" : "Show password"}>
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {password.length > 0 && (
                  <div className="mt-2 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">{tr.passwordStrength}</span>
                      <span className={`text-xs font-semibold ${strengthInfo.textColor}`}>{strengthInfo.label}</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-300 ${strengthInfo.color}`} style={{ width: strengthInfo.width }} />
                    </div>
                    <div className="flex flex-wrap gap-1">
                      <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] ${password.length >= 6 ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"}`}>6+</span>
                      <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] ${/[a-z]/.test(password) ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"}`}>abc</span>
                      <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] ${/[A-Z]/.test(password) ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"}`}>ABC</span>
                      <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] ${/[0-9]/.test(password) ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"}`}>123</span>
                      <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] ${/[^A-Za-z0-9]/.test(password) ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"}`}>!@#</span>
                    </div>
                  </div>
                )}
              </div>
              <div>
                <Label htmlFor="confirmPassword">{lang === "ar" ? "تأكيد كلمة المرور" : "Confirm password"}</Label>
                <div className="relative mt-2">
                  <Input id="confirmPassword" type={showConfirm ? "text" : "password"} autoComplete="new-password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} dir="ltr" className="pr-10" />
                  <button type="button" tabIndex={-1} onClick={() => setShowConfirm((v) => !v)} className="absolute inset-y-0 right-2 flex items-center text-muted-foreground hover:text-foreground" aria-label={showConfirm ? "Hide password" : "Show password"}>
                    {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="flex flex-col gap-2 rounded-xl border border-border p-3 bg-muted/30">
                <label className="flex items-center gap-2 cursor-pointer text-sm">
                  <input type="radio" name="role" checked={!asInstructor} onChange={() => setAsInstructor(false)} />
                  <span className="font-medium text-foreground">{tr.iAmStudent}</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-sm">
                  <input type="radio" name="role" checked={asInstructor} onChange={() => setAsInstructor(true)} />
                  <span className="font-medium text-foreground">{tr.iAmInstructor}</span>
                </label>
              </div>
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting && <Loader2 className="h-4 w-4 animate-spin mx-2" />}
                {tr.signUp}
              </Button>
            </form>
            <p className="mt-4 text-center text-sm text-muted-foreground">
              <Link to="/learning-management-system/login" className="text-primary hover:underline font-medium">
                {tr.haveAccount}
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
