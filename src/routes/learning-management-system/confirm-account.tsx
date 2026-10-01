import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Loader2, MailWarning } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useLang } from "@/lib/i18n/i18n";
import { lmsT } from "@/features/lms/lib/i18n";
import { checkGuestUpgrade, confirmGuestUpgrade } from "@/features/lms/lib/guest-account.functions";
import { PASSWORD_MIN } from "@/lib/auth/password-policy";
import { AuthLayout } from "@/features/lms/skin/AuthLayout";
import { NewPasswordFields } from "@/features/lms/skin/NewPasswordFields";
import { LMS_SKIN_LINKS } from "@/features/lms/skin/skin";

/* The link a guest opens from their email to finish creating their account:
   they choose a password here, and the guest becomes the account. It may be
   opened on another device; the token is the proof. */
export const Route = createFileRoute("/learning-management-system/confirm-account")({
  head: () => ({
    meta: [{ title: "Confirm your account — SAAE Training and Learning Platform" }],
    links: LMS_SKIN_LINKS,
  }),
  validateSearch: (raw: Record<string, unknown>): { token?: string } => ({
    token: typeof raw.token === "string" ? raw.token : undefined,
  }),
  component: ConfirmAccount,
});

type State = "working" | "ready" | "confirmed" | "invalid" | "expired" | "email_taken" | "error";

function ConfirmAccount() {
  const { token } = Route.useSearch();
  const { lang } = useLang();
  const ar = lang === "ar";
  const tr = lmsT[lang];
  const check = useServerFn(checkGuestUpgrade);
  const confirm = useServerFn(confirmGuestUpgrade);
  const [state, setState] = useState<State>("working");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    (async () => {
      if (!token) return setState("invalid");
      try {
        const res = await check({ data: { token } });
        if (res.status === "ready" || res.status === "email_taken") setEmail(res.email);
        setState(res.status);
      } catch {
        setState("error");
      }
    })();
  }, [check, token]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || saving) return;
    if (password.length < PASSWORD_MIN) return void toast.error(tr.passwordMin);
    if (password !== confirmPassword)
      return void toast.error(ar ? "كلمتا المرور غير متطابقتين" : "Passwords do not match");
    setSaving(true);
    try {
      const res = await confirm({ data: { token, password } });
      if (res.status === "weak_password") {
        toast.error(
          ar
            ? "كلمة المرور ضعيفة. استخدم أحرفاً كبيرة وصغيرة وأرقاماً ورموزاً."
            : "Password is too weak — use uppercase, lowercase, numbers and symbols",
        );
        return;
      }
      if (res.status === "confirmed") {
        // Setting the password ended the guest's sessions: sign in to the account.
        const { error } = await supabase.auth.signInWithPassword({ email: res.email, password });
        setSignedIn(!error);
      }
      if (res.status === "email_taken") setEmail(res.email);
      setState(res.status);
    } catch {
      setState("error");
    } finally {
      setSaving(false);
    }
  };

  const title: Record<State, string> = {
    working: ar ? "جارٍ التحقّق من الرابط…" : "Checking your link…",
    ready: ar ? "اختر كلمة المرور" : "Choose your password",
    confirmed: ar ? "تم تفعيل حسابك" : "Your account is ready",
    invalid: ar ? "الرابط غير صالح" : "This link is not valid",
    expired: ar ? "انتهت صلاحية الرابط" : "This link has expired",
    email_taken: ar ? "البريد مسجّل بحساب آخر" : "This email belongs to another account",
    error: ar ? "تعذّر تفعيل الحساب" : "We could not activate the account",
  };

  if (state === "ready") {
    return (
      <AuthLayout titleId="auth-title">
        <h1 id="auth-title">{title.ready}</h1>
        <p className="auth-lede">
          {ar ? "حسابك سيكون بالبريد" : "Your account will use"} <b dir="ltr">{email}</b>
          {ar
            ? ". اختر كلمة المرور ليصبح جاهزاً بكل دوراتك وتقدّمك كزائر."
            : ". Choose a password and it is ready, with every course and all the progress from your guest visits."}
        </p>
        <form onSubmit={onSubmit}>
          <NewPasswordFields
            password={password}
            confirmPassword={confirmPassword}
            onPassword={setPassword}
            onConfirmPassword={setConfirmPassword}
          />
          <button type="submit" className="auth-submit" disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            <span>{ar ? "إنشاء حسابي" : "Create my account"}</span>
          </button>
        </form>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout titleId="auth-title">
      <h1 id="auth-title">{title[state]}</h1>
      <div className="auth-result">
        {state === "working" ? (
          <Loader2 className="animate-spin" />
        ) : state === "confirmed" ? (
          <CheckCircle2 />
        ) : (
          <MailWarning />
        )}
        {state === "confirmed" && (
          <p>
            {ar ? "أصبح" : "The account for"} <b dir="ltr">{email}</b>{" "}
            {ar
              ? "حساباً كاملاً، وبقيت فيه دوراتك وتقدّمك كزائر."
              : "is ready, with every course and all the progress from your guest visits."}{" "}
            {!signedIn &&
              (ar
                ? "سجّل الدخول ببريدك وكلمة المرور التي اخترتها."
                : "Sign in with your email and the password you chose.")}
          </p>
        )}
        {(state === "invalid" || state === "expired") && (
          <p>
            {ar
              ? "افتح صفحة إنشاء الحساب من المتصفّح الذي تتصفّح منه كزائر، واطلب رابطاً جديداً."
              : "Open the sign-up page in the browser you use as a guest and ask for a new link."}
          </p>
        )}
        {state === "email_taken" && (
          <p>
            <b dir="ltr">{email}</b>{" "}
            {ar
              ? "مسجّل الآن بحساب آخر. سجّل الدخول إليه من متصفّحك كزائر، وستنتقل إليه دوراتك وتقدّمك."
              : "now belongs to another account. Sign in to it from your guest browser and your courses and progress move to it."}
          </p>
        )}
        {state === "error" && (
          <p>
            {ar ? "حاول فتح الرابط مرة أخرى بعد قليل." : "Try opening the link again in a moment."}
          </p>
        )}
        {state !== "working" &&
          (state === "confirmed" && signedIn ? (
            <Link to="/learning-management-system/student" className="auth-submit">
              <span>{ar ? "إلى دوراتي" : "Go to my courses"}</span>
            </Link>
          ) : state === "invalid" || state === "expired" ? (
            <Link to="/learning-management-system/signup" className="auth-submit">
              <span>{ar ? "إنشاء الحساب" : "Create the account"}</span>
            </Link>
          ) : (
            <Link to="/learning-management-system/login" className="auth-submit">
              <span>{ar ? "تسجيل الدخول" : "Sign in"}</span>
            </Link>
          ))}
      </div>
    </AuthLayout>
  );
}
