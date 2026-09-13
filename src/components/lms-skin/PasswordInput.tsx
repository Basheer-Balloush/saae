import { useState, type InputHTMLAttributes } from "react";
import { useLang } from "@/lib/i18n";
import { IconEye } from "./icons";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "type">;

/** A password input with the show/hide eye; passwords are always typed left to right. */
export function PasswordInput(props: Props) {
  const { lang } = useLang();
  const ar = lang === "ar";
  const [show, setShow] = useState(false);
  return (
    <div className="pass-wrap">
      <input {...props} type={show ? "text" : "password"} dir="ltr" />
      <button
        type="button"
        className="pass-toggle"
        aria-label={show ? (ar ? "إخفاء كلمة المرور" : "Hide password") : ar ? "إظهار كلمة المرور" : "Show password"}
        aria-pressed={show}
        onClick={() => setShow((v) => !v)}
      >
        <IconEye />
      </button>
    </div>
  );
}
