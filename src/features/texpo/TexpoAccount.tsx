import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Gift } from "lucide-react";
import { useLang } from "@/lib/i18n/i18n";
import { localizeAuthError } from "@/lib/i18n/auth-error-i18n";
import { PASSWORD_MAX, PASSWORD_MIN } from "@/lib/auth/password-policy";
import { supabase } from "@/integrations/supabase/client";
import { signUpLmsUser } from "@/features/lms/lib/auth.functions";
import { LocationFields } from "@/features/user-location/LocationFields";
import {
  EMPTY_LOCATION,
  checkLocation,
  locationErrorMessage,
  type LocationDraft,
} from "@/features/user-location/lib/location";
import {
  PLAYER_EMAIL_MAX,
  PLAYER_NAME_MAX,
  isArabicTripleName,
  isEmailLike,
} from "./lib/texpo-shared";

const FORGOT = "/learning-management-system/forgot-password";

/* The account, inside the game, once the result is in: the name and email
   come from the first screen and are not asked again, so a new player adds
   only a password, its confirmation, and where they live. It creates the same
   account as the sign-up page (createLmsAccount), signs in, and hands over to
   the claim. An email that already has an account turns it into a sign-in. */
export function TexpoAccount({
  initial,
  onReady,
}: {
  initial: { name: string; email: string };
  onReady: () => void;
}) {
  const { lang } = useLang();
  const ar = lang === "ar";
  const t = (a: string, e: string) => (ar ? a : e);
  const signUp = useServerFn(signUpLmsUser);
  /* The first screen asked for both; they are typed here again only when the
     game does not have them (a play started before that screen existed). */
  const askName = !isArabicTripleName(initial.name);
  const askEmail = !isEmailLike(initial.email);

  const [mode, setMode] = useState<"signup" | "signin">("signup");
  const [name, setName] = useState(initial.name);
  const [email, setEmail] = useState(initial.email);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [place, setPlace] = useState<LocationDraft>(EMPTY_LOCATION);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const switchTo = (next: "signup" | "signin") => {
    setMode(next);
    setError(null);
    setNotice(null);
    setPassword("");
    setConfirm("");
  };

  const signIn = async (address: string) => {
    const { error: e } = await supabase.auth.signInWithPassword({ email: address, password });
    if (!e) return true;
    setError(localizeAuthError(e, lang, t("تعذّر تسجيل الدخول.", "Couldn't sign in.")));
    return false;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setError(null);
    const address = email.trim().toLowerCase();
    if (!isEmailLike(address)) {
      setError(t("تأكّد من بريدك الإلكتروني.", "Check your email address."));
      return;
    }

    if (mode === "signin") {
      if (!password) {
        setError(t("اكتب كلمة المرور.", "Enter your password."));
        return;
      }
      setBusy(true);
      try {
        if (await signIn(address)) onReady();
      } finally {
        setBusy(false);
      }
      return;
    }

    const fullName = name.replace(/\s+/g, " ").trim();
    if (!isArabicTripleName(fullName)) {
      setError(
        t(
          "اكتب اسمك الثلاثي بالأحرف العربية، كما سيظهر على شهاداتك.",
          "Write your full name as three Arabic words, as it will appear on your certificates.",
        ),
      );
      return;
    }
    if (password.length < PASSWORD_MIN) {
      setError(
        t(
          `كلمة المرور ${PASSWORD_MIN} أحرف على الأقل.`,
          `The password needs at least ${PASSWORD_MIN} characters.`,
        ),
      );
      return;
    }
    if (password !== confirm) {
      setError(t("كلمتا المرور غير متطابقتين.", "The passwords don't match."));
      return;
    }
    const where = checkLocation(place);
    if ("missing" in where) {
      setError(locationErrorMessage(lang, where.missing));
      return;
    }

    setBusy(true);
    try {
      const res = await signUp({
        data: {
          fullName,
          email: address,
          password,
          asInstructor: false,
          lang,
          location: where.location,
        },
      });
      if (res.confirmationRequired) {
        // Confirmation is on again: the saved result waits on this device.
        setNotice(
          t(
            "أرسلنا رابط التفعيل إلى بريدك. افتحه على هذا الجهاز ثم ارجع إلى هذه الصفحة لتستلم هديتك.",
            "We emailed you an activation link. Open it on this device, then come back to this page to claim your gift.",
          ),
        );
        return;
      }
      if (await signIn(res.email ?? address)) onReady();
    } catch (err) {
      if (err instanceof Error && /EMAIL_ALREADY_REGISTERED/.test(err.message)) {
        switchTo("signin");
        setNotice(
          t(
            "لهذا البريد حساب من قبل. أدخل كلمة مروره لتستلم هديتك.",
            "This email already has an account. Enter its password to claim your gift.",
          ),
        );
      } else {
        setError(
          localizeAuthError(
            err,
            lang,
            t("تعذّر إنشاء الحساب. حاول مجدداً.", "Couldn't create the account. Try again."),
          ),
        );
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="tx-account" onSubmit={submit} noValidate>
      <p className="tx-account-title">
        {mode === "signup"
          ? t(
              "هديتك جاهزة! أكمل حسابك لتستلمها",
              "Your gift is ready! Finish your account to claim it",
            )
          : t("سجّل دخولك لتستلم هديتك", "Sign in to claim your gift")}
      </p>
      {mode === "signup" && !askEmail && (
        <p className="tx-small tx-account-who">
          {t("الحساب:", "Account:")} <bdi dir="ltr">{email}</bdi>
        </p>
      )}
      {notice && <p className="tx-note">{notice}</p>}

      {mode === "signup" && askName && (
        <label className="tx-field">
          <span>{t("الاسم الثلاثي", "Full name (three Arabic words)")}</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
            maxLength={PLAYER_NAME_MAX}
            dir="auto"
          />
        </label>
      )}
      {/* Signing in may use another email: the one the existing account has. */}
      {(askEmail || mode === "signin") && (
        <label className="tx-field">
          <span>
            {mode === "signin"
              ? t("بريد حسابك", "Your account's email")
              : t("البريد الإلكتروني", "Email")}
          </span>
          <input
            type="email"
            inputMode="email"
            dir="ltr"
            autoComplete="email"
            maxLength={PLAYER_EMAIL_MAX}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
      )}
      <label className="tx-field">
        <span>{t("كلمة المرور", "Password")}</span>
        <input
          type="password"
          dir="ltr"
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
          maxLength={PASSWORD_MAX}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {mode === "signup" && (
          <small>
            {t(`${PASSWORD_MIN} أحرف على الأقل`, `At least ${PASSWORD_MIN} characters`)}
          </small>
        )}
      </label>
      {mode === "signup" && (
        <>
          <label className="tx-field">
            <span>{t("أعد كتابة كلمة المرور", "Confirm the password")}</span>
            <input
              type="password"
              dir="ltr"
              autoComplete="new-password"
              maxLength={PASSWORD_MAX}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </label>
          <div className="tx-place">
            <LocationFields value={place} onChange={setPlace} lang={lang} idPrefix="tx-place" />
          </div>
        </>
      )}

      {error && (
        <p className="tx-note tx-note-warn" role="alert">
          {error}
        </p>
      )}
      <button type="submit" className="tx-btn tx-btn-primary tx-btn-big" disabled={busy}>
        <Gift aria-hidden="true" />
        {busy
          ? t("لحظة…", "One moment…")
          : mode === "signup"
            ? t("أنشئ حسابي واستلم هديتي", "Create my account and claim my gift")
            : t("سجّل دخولي واستلم هديتي", "Sign in and claim my gift")}
      </button>
      <p className="tx-small tx-account-switch">
        {mode === "signup" ? (
          <button type="button" className="tx-link" onClick={() => switchTo("signin")}>
            {t("لديّ حساب، سجّل دخولي", "I have an account, sign in")}
          </button>
        ) : (
          <>
            <button type="button" className="tx-link" onClick={() => switchTo("signup")}>
              {t("ليس لديّ حساب", "I don't have an account")}
            </button>
            {" · "}
            <a className="tx-link" href={FORGOT}>
              {t("نسيت كلمة المرور؟", "Forgot the password?")}
            </a>
          </>
        )}
      </p>
    </form>
  );
}
