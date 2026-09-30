import { useMemo } from "react";
import { useLang } from "@/lib/i18n/i18n";
import { lmsT } from "@/features/lms/lib/i18n";
import { PASSWORD_MIN, scorePasswordStrength } from "@/lib/auth/password-policy";
import { PasswordInput } from "./PasswordInput";

function strengthInfo(score: number, lang: "ar" | "en") {
  const t = lmsT[lang];
  const width = `${(score / 6) * 100}%`;
  if (score <= 2)
    return { label: t.passwordWeak, color: "bg-red-500", width, textColor: "text-red-400" };
  if (score <= 4)
    return { label: t.passwordMedium, color: "bg-amber-500", width, textColor: "text-amber-400" };
  return { label: t.passwordStrong, color: "bg-green-500", width, textColor: "text-green-400" };
}

type Props = {
  password: string;
  confirmPassword: string;
  onPassword: (value: string) => void;
  onConfirmPassword: (value: string) => void;
};

/** A new password with its strength meter, and the field that repeats it. */
export function NewPasswordFields({
  password,
  confirmPassword,
  onPassword,
  onConfirmPassword,
}: Props) {
  const { lang } = useLang();
  const tr = lmsT[lang];
  const info = useMemo(() => strengthInfo(scorePasswordStrength(password), lang), [password, lang]);
  const checks = [
    { label: `${PASSWORD_MIN}+`, met: password.length >= PASSWORD_MIN },
    { label: "abc", met: /[a-z]/.test(password) },
    { label: "ABC", met: /[A-Z]/.test(password) },
    { label: "123", met: /[0-9]/.test(password) },
    { label: "!@#", met: /[^A-Za-z0-9]/.test(password) },
  ];

  return (
    <>
      <div className="field">
        <label htmlFor="password">{tr.password}</label>
        <PasswordInput
          id="password"
          autoComplete="new-password"
          required
          value={password}
          onChange={(e) => onPassword(e.target.value)}
        />
        {password.length > 0 && (
          <div className="pass-strength">
            <div className="pass-strength-row">
              <span>{tr.passwordStrength}</span>
              <span className={info.textColor}>{info.label}</span>
            </div>
            <div className="pass-strength-bar">
              <i className={info.color} style={{ width: info.width }} />
            </div>
            <div className="pass-chips">
              {checks.map((c) => (
                <span key={c.label} className={c.met ? "is-met" : undefined}>
                  {c.label}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
      <div className="field">
        <label htmlFor="confirmPassword">
          {lang === "ar" ? "تأكيد كلمة المرور" : "Confirm password"}
        </label>
        <PasswordInput
          id="confirmPassword"
          autoComplete="new-password"
          required
          value={confirmPassword}
          onChange={(e) => onConfirmPassword(e.target.value)}
        />
      </div>
    </>
  );
}
