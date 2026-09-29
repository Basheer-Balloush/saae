import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Loader2, MailWarning } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLang } from "@/lib/i18n";
import { confirmGuestUpgrade } from "@/lib/guest-account.functions";
import { AuthLayout } from "@/components/lms-skin/AuthLayout";
import { LMS_SKIN_LINKS } from "@/components/lms-skin/skin";

/* The link a guest opens from their email to finish creating their account.
   It may be opened on another device; the token is the proof. */
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

type State = "working" | "confirmed" | "invalid" | "expired" | "email_taken" | "error";

function ConfirmAccount() {
  const { token } = Route.useSearch();
  const { lang } = useLang();
  const ar = lang === "ar";
  const confirm = useServerFn(confirmGuestUpgrade);
  const [state, setState] = useState<State>("working");
  const [email, setEmail] = useState("");
  const [signedIn, setSignedIn] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    (async () => {
      if (!token) return setState("invalid");
      try {
        const res = await confirm({ data: { token } });
        if (res.status === "confirmed" || res.status === "email_taken") setEmail(res.email);
        if (res.status === "confirmed") {
          // In the guest's own browser the session now belongs to the account.
          const { data } = await supabase.auth.getSession();
          if (data.session) {
            const { data: fresh } = await supabase.auth.refreshSession();
            setSignedIn(!!fresh.user && !fresh.user.is_anonymous && fresh.user.email === res.email);
          }
        }
        setState(res.status);
      } catch {
        setState("error");
      }
    })();
  }, [confirm, token]);

  const title: Record<State, string> = {
    working: ar ? "جارٍ تفعيل حسابك…" : "Activating your account…",
    confirmed: ar ? "تم تفعيل حسابك" : "Your account is ready",
    invalid: ar ? "الرابط غير صالح" : "This link is not valid",
    expired: ar ? "انتهت صلاحية الرابط" : "This link has expired",
    email_taken: ar ? "البريد مسجّل بحساب آخر" : "This email belongs to another account",
    error: ar ? "تعذّر تفعيل الحساب" : "We could not activate the account",
  };

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
