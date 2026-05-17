import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useLmsAuth } from "@/hooks/useLmsAuth";
import { useLang } from "@/lib/i18n";
import { lmsT } from "@/lib/lms-i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
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
      const { data, error } = await supabase.auth.signUp({
        email: parsed.data.email,
        password: parsed.data.password,
        options: {
          emailRedirectTo: `${window.location.origin}/learning-management-system/student`,
          data: { full_name: parsed.data.fullName },
        },
      });
      if (error) throw error;
      const uid = data.user?.id;
      if (uid) {
        // Default student role (best-effort; admin manages real grants)
        await supabase.from("user_roles").insert({ user_id: uid, role: "lms_student" as never });
        if (asInstructor) {
          await supabase.from("lms_instructors").insert({
            user_id: uid,
            full_name: parsed.data.fullName,
            approved: false,
          });
        }
      }
      toast.success(tr.signedUp);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : tr.authFailed);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center px-6 py-10">
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
      </div>
    </div>
  );
}
