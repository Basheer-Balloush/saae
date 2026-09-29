import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Loader2, UserRound } from "lucide-react";
import { toast } from "sonner";
import { useLmsAuth } from "@/hooks/useLmsAuth";
import { useLang } from "@/lib/i18n";
import { lmsT } from "@/lib/lms-i18n";
import { localizeAuthError } from "@/lib/auth-error-i18n";
import { continueAsGuest } from "@/lib/guest";
import { currentLmsReturn } from "@/lib/lms-redirect";

/** "Continue as guest" under the sign-in and sign-up forms. */
export function ContinueAsGuest({ redirect }: { redirect?: string }) {
  const navigate = useNavigate();
  const { lang } = useLang();
  const ar = lang === "ar";
  const [busy, setBusy] = useState(false);

  const start = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await continueAsGuest(lang);
      toast.success(ar ? "أنت الآن زائر" : "You are browsing as a guest");
      navigate({ to: redirect ?? "/learning-management-system/catalog" });
    } catch (err) {
      toast.error(localizeAuthError(err, lang, lmsT[lang].authFailed));
      setBusy(false);
    }
  };

  return (
    <div className="auth-guest">
      <span className="auth-or">{ar ? "أو" : "or"}</span>
      <button type="button" className="auth-secondary" onClick={start} disabled={busy}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserRound className="h-4 w-4" />}
        <span>{ar ? "المتابعة كزائر" : "Continue as a guest"}</span>
      </button>
      <p className="auth-guest-hint">
        {ar
          ? "تصفّح الدورات واطلب التسجيل الآن، وأنشئ حسابك متى شئت دون أن تفقد تقدّمك. الكوبونات والشهادات تحتاج حساباً."
          : "Browse and request courses now, and create your account whenever you like without losing your progress. Coupons and certificates need an account."}
      </p>
    </div>
  );
}

/** Tells a guest where their progress lives and how to keep it. Renders
    nothing for anyone else. */
export function GuestBanner() {
  const { isGuest } = useLmsAuth();
  const { lang } = useLang();
  const ar = lang === "ar";
  if (!isGuest) return null;
  const back = currentLmsReturn();
  return (
    <section className="guest-banner" aria-labelledby="guest-banner-title">
      <div className="page-shell">
        <div className="guest-banner-card">
          <UserRound aria-hidden="true" />
          <div className="guest-banner-copy">
            <h2 id="guest-banner-title">
              {ar ? "أنت تتصفّح كزائر" : "You are browsing as a guest"}
            </h2>
            <p>
              {ar
                ? "تقدّمك محفوظ على هذا المتصفّح فقط. أنشئ حسابك لتحفظه أينما كنت، وتستخدم الكوبونات، وتحصل على شهاداتك."
                : "Your progress is kept on this browser only. Create your account to keep it anywhere, use coupons and receive your certificates."}
            </p>
          </div>
          <div className="guest-banner-actions">
            <Link
              to="/learning-management-system/signup"
              search={{ redirect: back }}
              className="action action-primary"
            >
              <span>{ar ? "إنشاء حسابي" : "Create my account"}</span>
            </Link>
            <Link
              to="/learning-management-system/login"
              search={{ redirect: back }}
              className="action action-secondary"
            >
              <span>{ar ? "لديّ حساب" : "I have an account"}</span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
