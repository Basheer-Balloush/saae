import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  Eye,
  EyeOff,
  GraduationCap,
  Languages,
  ShieldCheck,
  UserRoundCheck,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { ConsoleAmbient, useConsoleRoot } from "@/components/console/ConsoleShell";
import MotionButton from "@/features/website/motion/motion-button";
import { useLang } from "@/lib/i18n/i18n";
import {
  PM_DEMO_ACCOUNTS,
  PM_DEMO_PASSWORD,
  authenticatePmDemo,
  loadPmSession,
  pmRolePath,
  savePmSession,
  type PmDemoAccount,
} from "./auth";
import "@/components/console/console.css";
import "./project-management.css";

const ROLE_ICONS: Record<PmDemoAccount["role"], LucideIcon> = {
  admin: ShieldCheck,
  mentor: UserRoundCheck,
  intern: GraduationCap,
};

export function ProjectManagementLogin() {
  useConsoleRoot();
  const navigate = useNavigate();
  const { lang, dir, toggle } = useLang();
  const ar = lang === "ar";
  const t = (en: string, arabic: string) => (ar ? arabic : en);
  const [email, setEmail] = useState(PM_DEMO_ACCOUNTS[0].email);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const session = loadPmSession();
    if (session) navigate({ to: pmRolePath(session.role) as never, replace: true });
  }, [navigate]);

  const selectAccount = (account: PmDemoAccount) => {
    setEmail(account.email);
    setPassword("");
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const session = authenticatePmDemo(email, password);
    if (!session) {
      toast.error(
        t("The email or password is incorrect", "البريد الإلكتروني أو كلمة المرور غير صحيحة"),
      );
      return;
    }
    savePmSession(session);
    toast.success(t("Welcome to your workspace", "مرحباً بك في مساحة العمل"));
    navigate({ to: pmRolePath(session.role) as never, replace: true });
  };

  return (
    <main className="cx pm pm-auth" dir={dir}>
      <ConsoleAmbient />
      <section className="pm-auth-story" aria-label={t("About the workspace", "عن مساحة العمل")}>
        <a className="pm-auth-brand" href="/">
          <span className="cx-brand-tree" aria-hidden="true" />
          <span>
            <strong>SAAE</strong>
            <small>{t("Project management", "إدارة المشاريع")}</small>
          </span>
        </a>
        <div className="pm-auth-story-copy">
          <span className="cx-eyebrow">
            {t("ONE TEAM · CLEAR DELIVERY", "فريق واحد · إنجاز واضح")}
          </span>
          <h1>{t("Turn every project into shared progress.", "حوّل كل مشروع إلى تقدّم مشترك.")}</h1>
          <p>
            {t(
              "A focused workspace for administrators, mentors and interns—with the right view and permissions for every role.",
              "مساحة عمل مركّزة للمديرين والمرشدين والمتدربين، بصلاحيات وتجربة مناسبة لكل دور.",
            )}
          </p>
        </div>
        <div className="pm-auth-role-strip" aria-hidden="true">
          <span>{t("Admin", "مدير")}</span>
          <span>{t("Mentor", "مرشد")}</span>
          <span>{t("Intern", "متدرب")}</span>
        </div>
      </section>

      <section className="pm-auth-form-side">
        <button
          className="pm-auth-language"
          type="button"
          onClick={toggle}
          aria-label={ar ? "English" : "العربية"}
        >
          <Languages /> {ar ? "EN" : "ع"}
        </button>

        <form className="pm-auth-card" onSubmit={submit}>
          <div className="pm-auth-heading">
            <span>{t("SECURE WORKSPACE", "مساحة عمل آمنة")}</span>
            <h2>{t("Sign in", "تسجيل الدخول")}</h2>
            <p>
              {t(
                "Choose your demo account, then enter the password.",
                "اختر حساباً تجريبياً ثم أدخل كلمة المرور.",
              )}
            </p>
          </div>

          <div
            className="pm-auth-accounts"
            role="group"
            aria-label={t("Demo accounts", "الحسابات التجريبية")}
          >
            {PM_DEMO_ACCOUNTS.map((account) => {
              const Icon = ROLE_ICONS[account.role];
              const active = email === account.email;
              const label =
                account.role === "admin"
                  ? t("Admin", "مدير")
                  : account.role === "mentor"
                    ? t("Mentor", "مرشد")
                    : t("Intern", "متدرب");
              return (
                <button
                  key={account.role}
                  type="button"
                  data-active={active}
                  onClick={() => selectAccount(account)}
                >
                  <Icon />
                  <strong>{label}</strong>
                  <small>{account.email}</small>
                </button>
              );
            })}
          </div>

          <label className="pm-auth-field">
            <span>{t("Email address", "البريد الإلكتروني")}</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              dir="ltr"
              required
            />
          </label>

          <label className="pm-auth-field">
            <span>{t("Password", "كلمة المرور")}</span>
            <span className="pm-auth-password">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                dir="ltr"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((current) => !current)}
                aria-label={t(
                  showPassword ? "Hide password" : "Show password",
                  showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور",
                )}
              >
                {showPassword ? <EyeOff /> : <Eye />}
              </button>
            </span>
          </label>

          <div className="pm-auth-demo-note">
            <span>{t("Demo password", "كلمة مرور العرض")}</span>
            <button type="button" onClick={() => setPassword(PM_DEMO_PASSWORD)} dir="ltr">
              {PM_DEMO_PASSWORD}
            </button>
          </div>

          <MotionButton
            type="submit"
            label={t("Open workspace", "فتح مساحة العمل")}
            classes="pm-motion-button pm-auth-submit"
          />

          <p className="pm-auth-disclaimer">
            {t(
              "Demo authentication is stored only in this browser.",
              "تُحفظ جلسة العرض التجريبي في هذا المتصفح فقط.",
            )}
          </p>
        </form>
      </section>
    </main>
  );
}
