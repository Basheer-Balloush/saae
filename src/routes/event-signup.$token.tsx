import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { Loader2, CheckCircle2, AlertTriangle } from "lucide-react";

import { useLang } from "@/lib/i18n";
import {
  resolveSignupLink,
  submitEventSignup,
  SignupFormSchema,
  type PublicSignupState,
} from "@/lib/event-signup.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/event-signup/$token")({
  head: () => ({
    meta: [
      { title: "Event sign-up — SAAE" },
      {
        name: "description",
        content: "Sign up for a SAAE training event using your invitation link.",
      },
      { property: "og:title", content: "Event sign-up — SAAE" },
      {
        property: "og:description",
        content: "Sign up for a SAAE training event using your invitation link.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: EventSignupPage,
});

type Fields = {
  full_name: string;
  email: string;
  phone: string;
  organization: string;
  biography: string;
};

const EMPTY: Fields = {
  full_name: "",
  email: "",
  phone: "",
  organization: "",
  biography: "",
};

function EventSignupPage() {
  const { token } = Route.useParams();
  const { lang, dir } = useLang();
  const ar = lang === "ar";

  const resolveFn = useServerFn(resolveSignupLink);
  const submitFn = useServerFn(submitEventSignup);

  const [state, setState] = useState<PublicSignupState | null>(null);
  const [loading, setLoading] = useState(true);
  const [values, setValues] = useState<Fields>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof Fields, string>>>({});
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState<"created" | "duplicate" | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await resolveFn({ data: { token } });
        if (alive) setState(res);
      } catch {
        if (alive) setState({ state: "unknown" });
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [resolveFn, token]);

  const set = (k: keyof Fields, v: string) => {
    setValues((p) => ({ ...p, [k]: v }));
    setErrors((p) => ({ ...p, [k]: undefined }));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const parsed = SignupFormSchema.safeParse({ token, ...values });
    if (!parsed.success) {
      const next: Partial<Record<keyof Fields, string>> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof Fields;
        if (key && key in EMPTY && !next[key]) {
          next[key] = ar ? "قيمة غير صالحة" : "Invalid value";
        }
      }
      setErrors(next);
      return;
    }
    setSaving(true);
    try {
      const res = await submitFn({ data: parsed.data });
      if (res.result === "created") setDone("created");
      else if (res.result === "duplicate") setDone("duplicate");
      else if (res.result === "inactive") setState({ state: "inactive" });
      else
        setFormError(
          ar
            ? "عدد كبير من المحاولات. يرجى المحاولة لاحقًا."
            : "Too many attempts. Please try again later.",
        );
    } catch {
      setFormError(
        ar ? "تعذّر إرسال الطلب. حاول مرة أخرى." : "Could not submit. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="min-h-screen bg-background px-4 py-12" dir={dir}>
      <div className="mx-auto w-full max-w-xl">
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : state?.state !== "ok" ? (
          <Card className="p-8 text-center space-y-3">
            <AlertTriangle className="mx-auto h-8 w-8 text-amber-500" />
            <h1 className="text-xl font-bold text-foreground">
              {ar ? "هذا الرابط لم يعد فعّالًا" : "This link is no longer active"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {ar
                ? "تم إيقاف التسجيل عبر هذا الرابط. يرجى التواصل مع منظّم الفعالية للحصول على رابط جديد."
                : "Sign-ups through this link are closed. Please contact the event organiser for a new link."}
            </p>
          </Card>
        ) : done ? (
          <Card className="p-8 text-center space-y-3">
            <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-500" />
            <h1 className="text-xl font-bold text-foreground">
              {done === "created"
                ? ar
                  ? "تم استلام تسجيلك"
                  : "Your sign-up was received"
                : ar
                  ? "لقد سجّلت مسبقًا"
                  : "You have already signed up"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {done === "created"
                ? ar
                  ? "شكرًا لك، سنتواصل معك قريبًا."
                  : "Thank you, we will be in touch soon."
                : ar
                  ? "تم تسجيلك سابقًا في هذه الفعالية بهذا البريد أو رقم الهاتف."
                  : "A sign-up for this event already exists with this email or phone number."}
            </p>
          </Card>
        ) : (
          <Card className="p-6 sm:p-8">
            <h1 className="text-2xl font-bold text-foreground mb-1">
              {ar ? "التسجيل في الفعالية" : "Event sign-up"}
            </h1>
            <p className="text-sm text-muted-foreground mb-6" dir="auto">
              {ar ? state.title_ar : state.title_en || state.title_ar}
            </p>

            <form onSubmit={onSubmit} className="space-y-4" noValidate>
              <Field
                id="full_name"
                label={ar ? "الاسم الكامل" : "Full name"}
                required
                value={values.full_name}
                error={errors.full_name}
                onChange={(v) => set("full_name", v)}
              />
              <Field
                id="email"
                type="email"
                label={ar ? "البريد الإلكتروني" : "Email"}
                required
                value={values.email}
                error={errors.email}
                onChange={(v) => set("email", v)}
              />
              <Field
                id="phone"
                label={ar ? "رقم الهاتف" : "Phone number"}
                required
                value={values.phone}
                error={errors.phone}
                onChange={(v) => set("phone", v)}
              />
              <Field
                id="organization"
                label={ar ? "الجهة / المنظمة" : "Organization"}
                value={values.organization}
                error={errors.organization}
                onChange={(v) => set("organization", v)}
              />
              <div className="space-y-1.5">
                <Label htmlFor="biography">{ar ? "نبذة قصيرة" : "Short bio"}</Label>
                <Textarea
                  id="biography"
                  rows={4}
                  maxLength={2000}
                  value={values.biography}
                  onChange={(e) => set("biography", e.target.value)}
                />
                {errors.biography && <p className="text-xs text-destructive">{errors.biography}</p>}
              </div>

              {formError && <p className="text-sm text-destructive">{formError}</p>}

              <Button type="submit" className="w-full" disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 animate-spin mx-2" />}
                {ar ? "إرسال التسجيل" : "Submit sign-up"}
              </Button>
            </form>
          </Card>
        )}
      </div>
    </main>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  error,
  required,
  type = "text",
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  required?: boolean;
  type?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>
        {label}
        {required && <span className="text-destructive mx-1">*</span>}
      </Label>
      <Input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={!!error}
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
