import { useRef, useState } from "react";
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
const SIGNUP_WAIT_MS = 20_000;

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
  /* A second tap while the first is on its way is ignored. */
  const busyRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const switchTo = (next: "signup" | "signin") => {
    setMode(next);
    setError(null);
    setNotice(null);
    setPassword("");
    setConfirm("");
  };

  /** Signs in with the password typed here; the error, or null when it worked. */
  const trySignIn = async (address: string) => {
    const { error: e } = await supabase.auth.signInWithPassword({ email: address, password });
    return e;
  };
  const signInFailed = (e: unknown) =>
    setError(localizeAuthError(e, lang, t("تعذّر تسجيل الدخول.", "Couldn't sign in.")));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busyRef.current) return;
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
      busyRef.current = true;
      setBusy(true);
      try {
        const failed = await trySignIn(address);
        if (failed) signInFailed(failed);
        else onReady();
      } finally {
        busyRef.current = false;
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

    busyRef.current = true;
    setBusy(true);
    try {
      let res: { email?: string; confirmationRequired?: boolean } | undefined;
      let failure: unknown = null;
      try {
        // A reply that never comes (a dropped connection) counts as no reply
        // after 20 s; the sign-in below then finds the account if it exists.
        res = await Promise.race([
          signUp({
            data: {
              fullName,
              email: address,
              password,
              asInstructor: false,
              lang,
              location: where.location,
            },
          }),
          new Promise<never>((_, reject) =>
            window.setTimeout(() => reject(new Error("SIGNUP_NO_REPLY")), SIGNUP_WAIT_MS),
          ),
        ]);
      } catch (err) {
        failure = err;
      }
      if (res?.confirmationRequired) {
        // Confirmation is on again: the saved result waits on this device.
        setNotice(
          t(
            "أرسلنا رابط التفعيل إلى بريدك. افتحه على هذا الجهاز ثم ارجع إلى هذه الصفحة لتستلم هديتك.",
            "We emailed you an activation link. Open it on this device, then come back to this page to claim your gift.",
          ),
        );
        return;
      }
      // Sign in with the password just typed, whatever the answer was: the
      // account may exist although the answer never arrived (a slow venue
      // connection lost it after the server made the account), or this email
      // may have had one already. Either way the player goes straight on to
      // the coupon; only when that fails is there something to show.
      const signInError = await trySignIn(res?.email ?? address);
      if (!signInError) {
        onReady();
        return;
      }
      if (failure instanceof Error && /EMAIL_ALREADY_REGISTERED/.test(failure.message)) {
        switchTo("signin");
        setNotice(
          t(
            "لهذا البريد حساب من قبل. أدخل كلمة مروره لتستلم هديتك.",
            "This email already has an account. Enter its password to claim your gift.",
          ),
        );
      } else if (failure) {
        setError(
          localizeAuthError(
            failure,
            lang,
            t("تعذّر إنشاء الحساب. حاول مجدداً.", "Couldn't create the account. Try again."),
          ),
        );
      } else {
        signInFailed(signInError);
      }
    } finally {
      busyRef.current = false;
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
