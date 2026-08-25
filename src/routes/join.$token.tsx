import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";

import { useLang } from "@/lib/i18n";
import {
  RegistrationFormSchema,
  resolveRegistrationLink,
  submitRegistration,
  type PublicLinkState,
} from "@/lib/crm-registration-links.functions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/join/$token")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Join SAAE — Registration" },
      {
        name: "description",
        content: "Register to join the Syrian Association for Artificial Intelligence Enthusiasts.",
      },
      { property: "og:title", content: "Join SAAE — Registration" },
      {
        property: "og:description",
        content: "Register to join the Syrian Association for Artificial Intelligence Enthusiasts.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: JoinPage,
});

type Fields = {
  full_name: string;
  email: string;
  phone: string;
  specialty: string;
  work_field: string;
  address: string;
  short_description: string;
};

const EMPTY: Fields = {
  full_name: "",
  email: "",
  phone: "",
  specialty: "",
  work_field: "",
  address: "",
  short_description: "",
};

function JoinPage() {
  const { token } = Route.useParams();
  const { lang, dir } = useLang();
  const ar = lang === "ar";

  const resolveFn = useServerFn(resolveRegistrationLink);
  const submitFn = useServerFn(submitRegistration);

  const [state, setState] = useState<PublicLinkState | null>(null);
  const [loading, setLoading] = useState(true);
  const [values, setValues] = useState<Fields>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof Fields, string>>>({});
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await resolveFn({ data: { token } });
        if (alive) setState(res);
      } catch {
        if (alive) setState({ state: "inactive" });
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
    if (!values.email.trim() && !values.phone.trim()) {
      setErrors({
        email: ar ? "أدخل البريد الإلكتروني أو رقم الهاتف" : "Enter an email or a phone number",
      });
      return;
    }
    const parsed = RegistrationFormSchema.safeParse({ token, ...values });
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
      if (res.result === "created") setDone(true);
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
          <Card className="space-y-3 p-8 text-center">
            <AlertTriangle className="mx-auto h-8 w-8 text-amber-500" />
            <h1 className="text-xl font-bold text-foreground">
              {ar ? "هذا الرابط لم يعد فعّالًا" : "This registration link is no longer active"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {ar
                ? "تم إيقاف التسجيل عبر هذا الرابط. يرجى التواصل مع ممثل الجمعية للحصول على رابط جديد."
                : "Registration through this link is closed. Please contact the association representative for a new link."}
            </p>
          </Card>
        ) : done ? (
          <Card className="space-y-3 p-8 text-center">
            <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-500" />
            <h1 className="text-xl font-bold text-foreground">
              {ar ? "تم استلام طلبك" : "Your registration was received"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {ar ? "شكرًا لك، سنتواصل معك قريبًا." : "Thank you, we will be in touch soon."}
            </p>
          </Card>
        ) : (
          <Card className="p-6 sm:p-8">
            <h1 className="mb-1 text-2xl font-bold text-foreground">
              {ar ? "الانضمام إلى الجمعية" : "Join the association"}
            </h1>
            <p className="mb-6 text-sm text-muted-foreground" dir="auto">
              {state.label}
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
                value={values.email}
                error={errors.email}
                onChange={(v) => set("email", v)}
              />
              <Field
                id="phone"
                label={ar ? "رقم الهاتف" : "Phone number"}
                value={values.phone}
                error={errors.phone}
                onChange={(v) => set("phone", v)}
              />
              <Field
                id="specialty"
                label={ar ? "التخصص" : "Specialty"}
                value={values.specialty}
                error={errors.specialty}
                onChange={(v) => set("specialty", v)}
              />
              <Field
                id="work_field"
                label={ar ? "مجال العمل" : "Field of work"}
                value={values.work_field}
                error={errors.work_field}
                onChange={(v) => set("work_field", v)}
              />
              <Field
                id="address"
                label={ar ? "العنوان" : "Address"}
                value={values.address}
                error={errors.address}
                onChange={(v) => set("address", v)}
              />
              <div className="space-y-1.5">
                <Label htmlFor="short_description">{ar ? "نبذة قصيرة" : "Short note"}</Label>
                <Textarea
                  id="short_description"
                  rows={4}
                  maxLength={2000}
                  value={values.short_description}
                  onChange={(e) => set("short_description", e.target.value)}
                />
                {errors.short_description && (
                  <p className="text-xs text-destructive">{errors.short_description}</p>
                )}
              </div>

              {formError && <p className="text-sm text-destructive">{formError}</p>}

              <Button type="submit" className="w-full" disabled={saving}>
                {saving && <Loader2 className="mx-2 h-4 w-4 animate-spin" />}
                {ar ? "إرسال" : "Submit"}
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
        {required && <span className="mx-1 text-destructive">*</span>}
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
