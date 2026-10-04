import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { useLmsAuth } from "@/hooks/useLmsAuth";
import { useLang } from "@/lib/i18n/i18n";
import { lmsT } from "@/features/lms/lib/i18n";
import { localizeAuthError } from "@/lib/i18n/auth-error-i18n";
import { signUpLmsUser, resendLmsConfirmationEmail } from "@/features/lms/lib/auth.functions";
import { resendGuestUpgrade, startGuestUpgrade } from "@/features/lms/lib/guest-account.functions";
import { supabase } from "@/integrations/supabase/client";
import { ContinueAsGuest } from "@/features/lms/GuestAccess";
import { toast } from "sonner";
import { Loader2, MailCheck } from "lucide-react";
import { PASSWORD_MIN } from "@/lib/auth/password-policy";
import { lmsRedirectSearchSchema } from "@/features/lms/lib/redirect";
import { AuthLayout } from "@/features/lms/skin/AuthLayout";
import { NewPasswordFields } from "@/features/lms/skin/NewPasswordFields";
import { LMS_SKIN_LINKS } from "@/features/lms/skin/skin";
import { LocationFields } from "@/features/user-location/LocationFields";
import {
  EMPTY_LOCATION,
  checkLocation,
  locationErrorMessage,
} from "@/features/user-location/lib/location";
import { saveMyLocation } from "@/features/user-location/lib/location.functions";

export const Route = createFileRoute("/learning-management-system/signup")({
  head: () => ({
    meta: [{ title: "Sign up — SAAE Training and Learning Platform" }],
    links: LMS_SKIN_LINKS,
  }),
  validateSearch: (raw: Record<string, unknown>) => lmsRedirectSearchSchema(raw),
  component: LmsSignup,
});

// Wait 60 s after signup before the first resend, then 90 s after each one.
// The server holds its own limit; this keeps the button honest.
const FIRST_RESEND_WAIT = 60;
const NEXT_RESEND_WAIT = 90;

const ARABIC_NAME_RE = /^[\u0600-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-\uFEFF\s]+$/;

// A guest gives a name and an email here, and chooses the password on the page
// their confirmation link opens.
const guestSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(5)
    .max(120)
    .refine(
      (v) => {
        if (!ARABIC_NAME_RE.test(v)) return false;
        const parts = v.split(/\s+/).filter((p) => p.length >= 2);
        return parts.length >= 3;
      },
      { message: "ARABIC_TRIPLE" },
    ),
  email: z.string().trim().email().max(255),
});

const schema = guestSchema
  .extend({
    password: z.string().min(PASSWORD_MIN).max(72),
    confirmPassword: z.string().min(PASSWORD_MIN).max(72),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

function LmsSignup() {
  const navigate = useNavigate();
  const { user, loading, isGuest } = useLmsAuth();
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
  const [location, setLocation] = useState(EMPTY_LOCATION);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ email: string; confirmationRequired: boolean } | null>(
    null,
  );
  const [resending, setResending] = useState(false);
  const [resendReadyAt, setResendReadyAt] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  // State updates land a render late, so a double click could fire twice.
  const resendLock = useRef(false);
  const signUpUser = useServerFn(signUpLmsUser);
  const resendConfirmation = useServerFn(resendLmsConfirmationEmail);
  const upgradeGuest = useServerFn(startGuestUpgrade);
  const resendUpgrade = useServerFn(resendGuestUpgrade);
  const saveLocation = useServerFn(saveMyLocation);

  // A guest's name from the enrollment form fills the name field.
  useEffect(() => {
    if (!isGuest || !user) return;
    let cancelled = false;
    supabase
      .from("lms_user_profiles")
      .select("full_name")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        const name = data?.full_name?.trim();
        if (!cancelled && name) setFullName((v) => v || name);
      });
    return () => {
      cancelled = true;
    };
  }, [isGuest, user]);

  const resendWait = Math.max(0, Math.ceil((resendReadyAt - now) / 1000));

  useEffect(() => {
    if (resendReadyAt <= Date.now()) return;
    const id = window.setInterval(() => {
      const t = Date.now();
      setNow(t);
      if (t >= resendReadyAt) window.clearInterval(id);
    }, 1000);
    return () => window.clearInterval(id);
  }, [resendReadyAt]);

  const startResendWait = (seconds: number) => {
    const t = Date.now();
    setNow(t);
    setResendReadyAt(t + seconds * 1000);
  };

  const onResend = async () => {
    if (!result || resendLock.current || resendReadyAt > Date.now()) return;
    resendLock.current = true;
    setResending(true);
    try {
      const res = isGuest
        ? await resendUpgrade({ data: { lang } })
        : await resendConfirmation({ data: { email: result.email, lang } });
      if (res.sent) {
        toast.success(lang === "ar" ? "أعدنا إرسال رابط التأكيد" : "Confirmation link sent again");
        startResendWait(NEXT_RESEND_WAIT);
      } else {
        toast.error(
          lang === "ar"
            ? "طلبات كثيرة، انتظر قليلاً ثم حاول مجدداً"
            : "Too many requests. Please wait before trying again",
        );
        startResendWait(Math.max(res.retryAfter, 1));
      }
    } catch (err: unknown) {
      toast.error(localizeAuthError(err, lang, tr.authFailed));
    } finally {
      resendLock.current = false;
      setResending(false);
    }
  };

  useEffect(() => {
    // Once the account is active, land the user back where they started.
    if (!loading && user && !isGuest)
      navigate({ to: returnTo ?? "/learning-management-system/profile" });
  }, [loading, user, isGuest, navigate, returnTo]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = isGuest
      ? guestSchema.safeParse({ fullName, email })
      : schema.safeParse({ fullName, email, password, confirmPassword });
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      const code = issue.path[0];
      if (code === "fullName") {
        toast.error(
          lang === "ar"
            ? "يجب إدخال الاسم الثلاثي باللغة العربية (ثلاث كلمات على الأقل)"
            : "Enter your triple name in Arabic (at least three words)",
        );
      } else if (code === "confirmPassword" || issue.message.includes("match")) {
        toast.error(lang === "ar" ? "كلمتا المرور غير متطابقتين" : "Passwords do not match");
      } else {
        toast.error(code === "email" ? tr.invalidEmail : tr.passwordMin);
      }
      return;
    }
    const checkedLocation = checkLocation(location);
    if ("missing" in checkedLocation) {
      toast.error(locationErrorMessage(lang, checkedLocation.missing));
      return;
    }
    setSubmitting(true);
    try {
      if (isGuest) {
        // The guest is signed in already, so the location is saved as theirs
        // now; the account keeps it. A failure here must not block the account.
        await saveLocation({ data: checkedLocation.location }).catch(() => undefined);
        // The guest account itself becomes the new account.
        const res = await upgradeGuest({
          data: {
            fullName: parsed.data.fullName,
            email: parsed.data.email,
            asInstructor,
            lang,
          },
        });
        if (res.confirmationRequired) {
          setResult({ email: res.email, confirmationRequired: true });
          startResendWait(FIRST_RESEND_WAIT);
          toast.success(tr.signedUp);
        } else {
          // No email to confirm: straight to the page where they choose the password.
          window.location.assign(res.next);
        }
        return;
      }
      const res = await signUpUser({
        data: {
          fullName: parsed.data.fullName,
          email: parsed.data.email,
          password,
          asInstructor,
          lang,
          location: checkedLocation.location,
        },
      });
      // The server is the single source of truth for whether confirmation is required.
      const confirmationRequired = res?.confirmationRequired !== false;
      setResult({ email: res?.email ?? parsed.data.email, confirmationRequired });
      if (confirmationRequired) startResendWait(FIRST_RESEND_WAIT);
      toast.success(confirmationRequired ? tr.signedUp : tr.signedUpConfirmed);
    } catch (err: unknown) {
      toast.error(localizeAuthError(err, lang, tr.authFailed));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout titleId="auth-title">
      <h1 id="auth-title">{tr.signUpTitle}</h1>
      <p className="auth-lede">{tr.signUpSubtitle}</p>
      {isGuest && !result && (
        <p className="auth-guest-note">
          {ar
            ? "أنت تتصفّح كزائر. أنشئ حسابك وستبقى فيه دوراتك وتقدّمك وطلباتك. تختار كلمة المرور بعد تأكيد بريدك."
            : "You are browsing as a guest. Create your account and it keeps your courses, progress and requests. You choose your password after confirming your email."}
        </p>
      )}

      {result ? (
        <div className="auth-result">
          <MailCheck />
          <h2>
            {result.confirmationRequired
              ? ar
                ? "تحقّق من بريدك الإلكتروني"
                : "Check your email"
              : ar
                ? "تم إنشاء حسابك"
                : "Your account is ready"}
          </h2>
          <p>
            {result.confirmationRequired ? (
              <>
                {ar ? "أرسلنا رابط تأكيد إلى" : "We sent a confirmation link to"}{" "}
                <b dir="ltr">{result.email}</b>
                {". "}
                {isGuest
                  ? ar
                    ? "افتح الرابط لتأكيد بريدك واختيار كلمة المرور، فيصبح حسابك جاهزاً بكل دوراتك وتقدّمك كزائر. إلى ذلك الحين تبقى زائراً."
                    : "Open the link to confirm your email and choose your password, and your account is ready with every course and all your guest progress. Until then you stay a guest."
                  : ar
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
            <button
              type="button"
              className="auth-secondary"
              onClick={onResend}
              disabled={resending || resendWait > 0}
            >
              {resending && <Loader2 className="h-4 w-4 animate-spin" />}
              <span>{ar ? "إعادة إرسال رابط التأكيد" : "Resend confirmation email"}</span>
              {resendWait > 0 && !resending && (
                <span dir="ltr">
                  ({Math.floor(resendWait / 60)}:{String(resendWait % 60).padStart(2, "0")})
                </span>
              )}
            </button>
          )}

          {asInstructor && (
            <div className="auth-next">
              <b>
                {ar
                  ? "⏳ الخطوة التالية: املأ نموذج اعتماد المدرّب"
                  : "⏳ Next step: complete the trainer application"}
              </b>
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
              <input
                id="name"
                type="text"
                autoComplete="name"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                dir="rtl"
                placeholder="مثال: محمد أحمد خالد"
              />
              <p className="hint">
                {ar
                  ? "ثلاث كلمات باللغة العربية فقط (الاسم، اسم الأب، الكنية)"
                  : "Three Arabic words only (first, father, family)"}
              </p>
            </div>
            <div className="field">
              <label htmlFor="email">{tr.email}</label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                dir="ltr"
                placeholder="name@example.com"
              />
            </div>
            <LocationFields
              value={location}
              onChange={setLocation}
              lang={lang}
              idPrefix="signup-loc"
            />
            {!isGuest && (
              <NewPasswordFields
                password={password}
                confirmPassword={confirmPassword}
                onPassword={setPassword}
                onConfirmPassword={setConfirmPassword}
              />
            )}
            <fieldset className="field role-field">
              <legend>{ar ? "انضم بصفتك" : "Join as"}</legend>
              <div className="role-seg">
                <label className="role-opt">
                  <input
                    type="radio"
                    name="role"
                    checked={!asInstructor}
                    onChange={() => setAsInstructor(false)}
                  />
                  <span>{tr.iAmStudent}</span>
                </label>
                <label className="role-opt">
                  <input
                    type="radio"
                    name="role"
                    checked={asInstructor}
                    onChange={() => setAsInstructor(true)}
                  />
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
          {!user && !loading && <ContinueAsGuest redirect={returnTo} />}
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
