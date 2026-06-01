import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { z } from "zod";
import { useLmsAuth } from "@/hooks/useLmsAuth";
import { useLang } from "@/lib/i18n";
import { lmsT } from "@/lib/lms-i18n";
import { localizeAuthError } from "@/lib/auth-error-i18n";
import { signUpLmsUser } from "@/lib/lms-auth.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, MailCheck, Eye, EyeOff } from "lucide-react";
import logo from "@/assets/saae-logo.png";

export const Route = createFileRoute("/learning-management-system/signup")({
  head: () => ({ meta: [{ title: "LMS · Sign up" }] }),
  component: LmsSignup,
});

const schema = z.object({
  fullName: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(255),
  password: z.string().min(6).max(72),
});

function LmsSignup() {
  const navigate = useNavigate();
  const { user, loading } = useLmsAuth();
  const { lang } = useLang();
  const tr = lmsT[lang];
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [asInstructor, setAsInstructor] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const signUpUser = useServerFn(signUpLmsUser);

  useEffect(() => {
    if (!loading && user) navigate({ to: "/learning-management-system/student" });
  }, [loading, user, navigate]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({ fullName, email, password });
    if (!parsed.success) {
      const code = parsed.error.issues[0].path[0];
      toast.error(code === "email" ? tr.invalidEmail : tr.passwordMin);
      return;
    }
    setSubmitting(true);
    try {
      await signUpUser({ data: { ...parsed.data, asInstructor, lang } });
      setSentTo(parsed.data.email);
      toast.success(tr.signedUp);
    } catch (err: unknown) {
      toast.error(localizeAuthError(err, lang, tr.authFailed));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center px-6 py-24">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-soft">
        <div className="flex flex-col items-center text-center">
          <img
            src={logo}
            alt="SAAE"
            width={80}
            height={80}
            className="h-16 w-auto"
          />
        </div>
        <h1 className="mt-3 text-xl font-bold text-foreground text-center">{tr.signUpTitle}</h1>
        <p className="mt-1 text-sm text-muted-foreground text-center">{tr.signUpSubtitle}</p>

        {sentTo ? (
          <div className="mt-6 flex flex-col items-center text-center gap-3 rounded-xl border border-primary/30 bg-primary/5 p-5">
            <div className="rounded-full bg-primary/10 p-3">
              <MailCheck className="h-7 w-7 text-primary" />
            </div>
            <h2 className="text-base font-semibold text-foreground">
              {lang === "ar" ? "تحقّق من بريدك الإلكتروني" : "Check your email"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {lang === "ar"
                ? "أرسلنا رابط تأكيد إلى"
                : "We sent a confirmation link to"}{" "}
              <span className="font-semibold text-foreground" dir="ltr">{sentTo}</span>
              {". "}
              {lang === "ar"
                ? "افتح الرابط لتفعيل حسابك."
                : "Open the link to activate your account."}
            </p>
            {asInstructor && (
              <div className="mt-2 w-full rounded-lg border border-amber-400/40 bg-amber-50 dark:bg-amber-950/30 px-4 py-3 text-sm text-amber-900 dark:text-amber-200">
                <p className="font-semibold">
                  {lang === "ar" ? "⏳ طلبك كمدرّب قيد المراجعة" : "⏳ Your instructor request is under review"}
                </p>
                <p className="mt-1 text-xs opacity-90">
                  {lang === "ar"
                    ? "بعد تأكيد البريد، سيقوم فريق الإدارة بمراجعة طلبك والموافقة عليه قبل أن تتمكن من نشر الدورات."
                    : "After confirming your email, our admin team will review and approve your request before you can publish courses."}
                </p>
              </div>
            )}
            <Link
              to="/learning-management-system/login"
              className="mt-2 text-sm text-primary hover:underline font-medium"
            >
              {tr.haveAccount}
            </Link>
          </div>
        ) : (
          <>
            <form onSubmit={onSubmit} className="mt-5 space-y-3">
              <div>
                <Label htmlFor="name">{tr.fullName}</Label>
                <Input id="name" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="email">{tr.email}</Label>
                <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} dir="ltr" />
              </div>
              <div>
                <Label htmlFor="password">{tr.password}</Label>
                <Input id="password" type="password" autoComplete="new-password" required value={password} onChange={(e) => setPassword(e.target.value)} dir="ltr" />
              </div>
              <div className="flex flex-col gap-2 rounded-xl border border-border p-3 bg-muted/30">
                <label className="flex items-center gap-2 cursor-pointer text-sm">
                  <input type="radio" name="role" checked={!asInstructor} onChange={() => setAsInstructor(false)} />
                  <span className="font-medium text-foreground">{tr.iAmStudent}</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-sm">
                  <input type="radio" name="role" checked={asInstructor} onChange={() => setAsInstructor(true)} />
                  <span className="font-medium text-foreground">{tr.iAmInstructor}</span>
                </label>
              </div>
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting && <Loader2 className="h-4 w-4 animate-spin mx-2" />}
                {tr.signUp}
              </Button>
            </form>
            <p className="mt-4 text-center text-sm text-muted-foreground">
              <Link to="/learning-management-system/login" className="text-primary hover:underline font-medium">
                {tr.haveAccount}
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
