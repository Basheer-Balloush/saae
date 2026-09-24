import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { useLmsAuth } from "@/hooks/useLmsAuth";
import { useLang } from "@/lib/i18n";
import { lmsT } from "@/lib/lms-i18n";
import { localizeAuthError } from "@/lib/auth-error-i18n";
import { signUpLmsUser, resendLmsConfirmationEmail } from "@/lib/lms-auth.functions";
import { toast } from "sonner";
import { Loader2, MailCheck } from "lucide-react";
import { PASSWORD_MIN, scorePasswordStrength } from "@/lib/password-policy";
import { lmsRedirectSearchSchema } from "@/lib/lms-redirect";
import { AuthLayout } from "@/components/lms-skin/AuthLayout";
import { PasswordInput } from "@/components/lms-skin/PasswordInput";
import { LMS_SKIN_LINKS } from "@/components/lms-skin/skin";


export const Route = createFileRoute("/learning-management-system/signup")({
  head: () => ({ meta: [{ title: "LMS · Sign up" }], links: LMS_SKIN_LINKS }),
  validateSearch: (raw: Record<string, unknown>) => lmsRedirectSearchSchema(raw),
  component: LmsSignup,
});


const ARABIC_NAME_RE = /^[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿\s]+$/;

function getStrengthInfo(score: number, lang: "ar" | "en") {
  const t = lmsT[lang];
  if (score <= 2) return { label: t.passwordWeak, color: "bg-red-500", width: `${(score / 6) * 100}%`, textColor: "text-red-400" };
  if (score <= 4) return { label: t.passwordMedium, color: "bg-amber-500", width: `${(score / 6) * 100}%`, textColor: "text-amber-400" };
  return { label: t.passwordStrong, color: "bg-green-500", width: `${(score / 6) * 100}%`, textColor: "text-green-400" };
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
  password: z.string().min(PASSWORD_MIN).max(72),
  confirmPassword: z.string().min(PASSWORD_MIN).max(72),
}).refine((d) => d.password === d.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

function LmsSignup() {
  const navigate = useNavigate();
  const { user, loading } = useLmsAuth();
  const { lang } = useLang();
  const ar = lang === "ar";
  const tr = lmsT[lang];
  const search = Route.useSearch();
  const returnTo = search.redirect;
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [asInstructor, setAsInstructor] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ email: string; confirmationRequired: boolean } | null>(null);
  const [resending, setResending] = useState(false);
  const signUpUser = useServerFn(signUpLmsUser);
  const resendConfirmation = useServerFn(resendLmsConfirmationEmail);

  const onResend = async () => {
    if (!result || resending) return;
    setResending(true);
    try {
      await resendConfirmation({ data: { email: result.email, lang } });
      toast.success(lang === "ar" ? "أعدنا إرسال رابط التأكيد" : "Confirmation link sent again");
    } catch (err: unknown) {
      toast.error(localizeAuthError(err, lang, tr.authFailed));
    } finally {
      setResending(false);
    }
  };


  const passwordStrength = useMemo(() => scorePasswordStrength(password), [password]);
  const strengthInfo = useMemo(() => getStrengthInfo(passwordStrength, lang), [passwordStrength, lang]);

  useEffect(() => {
    // Once the account is active, land the user back where they started.
    if (!loading && user) navigate({ to: returnTo ?? "/learning-management-system/profile" });
  }, [loading, user, navigate, returnTo]);



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
      const res = await signUpUser({ data: { fullName: parsed.data.fullName, email: parsed.data.email, password: parsed.data.password, asInstructor, lang } });
      // The server is the single source of truth for whether confirmation is required.
      const confirmationRequired = res?.confirmationRequired !== false;
      setResult({ email: res?.email ?? parsed.data.email, confirmationRequired });
      toast.success(confirmationRequired ? tr.signedUp : tr.signedUpConfirmed);
    } catch (err: unknown) {
      toast.error(localizeAuthError(err, lang, tr.authFailed));
    } finally {
      setSubmitting(false);
    }
  };

  const passChecks = [
    { label: `${PASSWORD_MIN}+`, met: password.length >= PASSWORD_MIN },
    { label: "abc", met: /[a-z]/.test(password) },
    { label: "ABC", met: /[A-Z]/.test(password) },
    { label: "123", met: /[0-9]/.test(password) },
    { label: "!@#", met: /[^A-Za-z0-9]/.test(password) },
  ];

  return (
    <AuthLayout titleId="auth-title">
      <h1 id="auth-title">{tr.signUpTitle}</h1>
      <p className="auth-lede">{tr.signUpSubtitle}</p>

      {result ? (
        <div className="auth-result">
          <MailCheck />
          <h2>
            {result.confirmationRequired
              ? (ar ? "تحقّق من بريدك الإلكتروني" : "Check your email")
              : (ar ? "تم إنشاء حسابك" : "Your account is ready")}
          </h2>
          <p>
            {result.confirmationRequired ? (
              <>
                {ar ? "أرسلنا رابط تأكيد إلى" : "We sent a confirmation link to"}{" "}
                <b dir="ltr">{result.email}</b>
                {". "}
                {ar
                  ? "افتح الرابط لتأكيد بريدك قبل تسجيل الدخول."
                  : "Open the link to confirm your email before signing in."}
              </>
            ) : (
              <>
                {ar ? "تم تفعيل الحساب" : "We activated the account for"}{" "}
                <b dir="ltr">{result.email}</b>
                {". "}
                {ar ? "يمكنك تسجيل الدخول مباشرة." : "You can sign in right away."}
              </>
            )}
          </p>

          {result.confirmationRequired && (
            <button type="button" className="auth-secondary" onClick={onResend} disabled={resending}>
              {resending && <Loader2 className="h-4 w-4 animate-spin" />}
              <span>{ar ? "إعادة إرسال رابط التأكيد" : "Resend confirmation email"}</span>
            </button>
          )}

          {asInstructor && (
            <div className="auth-next">
              <b>{ar ? "⏳ الخطوة التالية: املأ نموذج اعتماد المدرّب" : "⏳ Next step: complete the trainer application"}</b>
              <span>
                {ar
                  ? "سجّل الدخول ثم املأ نموذج طلب الاعتماد (٤ مراحل تقييم: نظري، عملي، تدريب، مقابلة) قبل نشر أي دورة."
                  : "Sign in and complete the accreditation application (4 evaluation phases) before publishing any course."}
              </span>
              <Link to="/learning-management-system/trainer-apply">
                {ar ? "فتح نموذج طلب الاعتماد ←" : "Open the accreditation form →"}
              </Link>
            </div>
          )}
          <p className="auth-alt">
            <Link to="/learning-management-system/login" search={{ redirect: returnTo }}>
              {tr.haveAccount}
            </Link>
          </p>
        </div>
      ) : (
        <>
          <form onSubmit={onSubmit}>
            <div className="field">
              <label htmlFor="name">{ar ? "الاسم الثلاثي" : "Triple name"}</label>
              <input id="name" type="text" autoComplete="name" required value={fullName} onChange={(e) => setFullName(e.target.value)} dir="rtl" placeholder="مثال: محمد أحمد خالد" />
              <p className="hint">
                {ar ? "ثلاث كلمات باللغة العربية فقط (الاسم، اسم الأب، الكنية)" : "Three Arabic words only (first, father, family)"}
              </p>
            </div>
            <div className="field">
              <label htmlFor="email">{tr.email}</label>
              <input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} dir="ltr" placeholder="name@example.com" />
            </div>
            <div className="field">
              <label htmlFor="password">{tr.password}</label>
              <PasswordInput id="password" autoComplete="new-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
              {password.length > 0 && (
                <div className="pass-strength">
                  <div className="pass-strength-row">
                    <span>{tr.passwordStrength}</span>
                    <span className={strengthInfo.textColor}>{strengthInfo.label}</span>
                  </div>
                  <div className="pass-strength-bar">
                    <i className={strengthInfo.color} style={{ width: strengthInfo.width }} />
                  </div>
                  <div className="pass-chips">
                    {passChecks.map((c) => (
                      <span key={c.label} className={c.met ? "is-met" : undefined}>{c.label}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="field">
              <label htmlFor="confirmPassword">{ar ? "تأكيد كلمة المرور" : "Confirm password"}</label>
              <PasswordInput id="confirmPassword" autoComplete="new-password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
            </div>
            <fieldset className="field role-field">
              <legend>{ar ? "انضم بصفتك" : "Join as"}</legend>
              <div className="role-seg">
                <label className="role-opt">
                  <input type="radio" name="role" checked={!asInstructor} onChange={() => setAsInstructor(false)} />
                  <span>{tr.iAmStudent}</span>
                </label>
                <label className="role-opt">
                  <input type="radio" name="role" checked={asInstructor} onChange={() => setAsInstructor(true)} />
                  <span>{tr.iAmInstructor}</span>
                  <small>{ar ? "يتطلب موافقة" : "Needs approval"}</small>
                </label>
              </div>
            </fieldset>
            <button type="submit" className="auth-submit" disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              <span>{tr.signUp}</span>
            </button>
          </form>
          <p className="auth-alt">
            <Link to="/learning-management-system/login" search={{ redirect: returnTo }}>
              {tr.haveAccount}
            </Link>
          </p>
        </>
      )}
    </AuthLayout>
  );
}
