import { createFileRoute, notFound } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useLang } from "@/lib/i18n";
import { toUserMessage } from "@/lib/safe-error";
import { isValidSlug, type DynamicForm } from "@/lib/dynamic-forms";
import { getPublishedFormBySlug, submitDynamicForm } from "@/lib/dynamic-forms.functions";

export const Route = createFileRoute("/forms/$slug")({
  head: ({ params }) => ({
    meta: [
      { title: `Form — ${params.slug}` },
      { name: "description", content: "Public form" },
      { property: "og:title", content: `Form — ${params.slug}` },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PublicFormPage,
  notFoundComponent: () => (
    <div className="min-h-screen flex items-center justify-center p-6 text-center">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Form not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">This form is unavailable or has not been published.</p>
      </div>
    </div>
  ),
  errorComponent: ({ error }) => (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div role="alert" className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
        {error.message}
      </div>
    </div>
  ),
});

function PublicFormPage() {
  const { slug } = Route.useParams();
  const { lang, dir } = useLang();
  const ar = lang === "ar";
  const fetchForm = useServerFn(getPublishedFormBySlug);
  const doSubmit = useServerFn(submitDynamicForm);

  const [form, setForm] = useState<DynamicForm | null | "missing">(null);
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!isValidSlug(slug)) {
      setForm("missing");
      return;
    }
    fetchForm({ data: { slug } })
      .then((f) => setForm(f ?? "missing"))
      .catch(() => setForm("missing"));
  }, [slug, fetchForm]);

  if (form === null) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }
  if (form === "missing") throw notFound();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Client-side required check
    for (const f of form.fields) {
      const v = values[f.id];
      const empty =
        v === undefined || v === null || v === "" ||
        (Array.isArray(v) && v.length === 0) ||
        (f.type === "single_checkbox" && !v);
      if (f.required && empty) {
        toast.error(ar ? `الحقل مطلوب: ${f.label_ar}` : `Required: ${f.label_en}`);
        return;
      }
    }
    setSubmitting(true);
    try {
      await doSubmit({ data: { slug: form.slug, values } });
      setDone(true);
    } catch (err) {
      toast.error(toUserMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6" dir={dir}>
        <div className="max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
          <CheckCircle2 className="mx-auto h-12 w-12 text-primary" />
          <h1 className="mt-4 text-2xl font-bold text-foreground">
            {ar ? "شكراً لك!" : "Thank you!"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {ar ? "تم استلام إجابتك بنجاح." : "Your submission was received successfully."}
          </p>
        </div>
      </div>
    );
  }

  const title = ar ? form.name_ar : form.name_en;
  const desc = ar ? form.description_ar : form.description_en;
  const submitLabel = ar ? form.submit_label_ar : form.submit_label_en;

  return (
    <div className="min-h-screen bg-background py-10 px-4" dir={dir}>
      <div className="mx-auto max-w-2xl">
        <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-sm">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{title}</h1>
          {desc && <p className="mt-2 text-sm text-muted-foreground whitespace-pre-wrap">{desc}</p>}

          <form onSubmit={submit} className="mt-6 space-y-5">
            {form.fields.map((f) => {
              const label = ar ? f.label_ar : f.label_en;
              const placeholder = ar ? f.placeholder_ar : f.placeholder_en;
              const val = values[f.id];
              const set = (v: unknown) => setValues((p) => ({ ...p, [f.id]: v }));
              const req = f.required && (
                <span className="ms-1 text-destructive" aria-hidden>*</span>
              );
              return (
                <div key={f.id} className="space-y-2">
                  {f.type !== "single_checkbox" && (
                    <Label htmlFor={f.id}>{label}{req}</Label>
                  )}
                  {f.type === "short_text" && (
                    <Input id={f.id} value={(val as string) ?? ""} placeholder={placeholder}
                      onChange={(e) => set(e.target.value)} required={f.required} maxLength={500} />
                  )}
                  {f.type === "long_text" && (
                    <Textarea id={f.id} value={(val as string) ?? ""} placeholder={placeholder}
                      onChange={(e) => set(e.target.value)} required={f.required} maxLength={5000} />
                  )}
                  {f.type === "email" && (
                    <Input id={f.id} type="email" dir="ltr" value={(val as string) ?? ""} placeholder={placeholder}
                      onChange={(e) => set(e.target.value)} required={f.required} maxLength={200} />
                  )}
                  {f.type === "number" && (
                    <Input id={f.id} type="number" dir="ltr" value={(val as number | undefined) ?? ""} placeholder={placeholder}
                      onChange={(e) => set(e.target.value === "" ? undefined : Number(e.target.value))} required={f.required} />
                  )}
                  {f.type === "date" && (
                    <Input id={f.id} type="date" dir="ltr" value={(val as string) ?? ""}
                      onChange={(e) => set(e.target.value)} required={f.required} />
                  )}
                  {f.type === "select" && (
                    <Select value={(val as string) ?? ""} onValueChange={set}>
                      <SelectTrigger id={f.id}><SelectValue placeholder={placeholder ?? "—"} /></SelectTrigger>
                      <SelectContent>
                        {(f.options ?? []).map((o) => (
                          <SelectItem key={o.value} value={o.value}>{ar ? o.label_ar : o.label_en}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  {f.type === "radio" && (
                    <RadioGroup value={(val as string) ?? ""} onValueChange={set}>
                      {(f.options ?? []).map((o) => (
                        <label key={o.value} className="flex items-center gap-2 text-sm">
                          <RadioGroupItem value={o.value} id={`${f.id}-${o.value}`} />
                          <span>{ar ? o.label_ar : o.label_en}</span>
                        </label>
                      ))}
                    </RadioGroup>
                  )}
                  {f.type === "checkbox_group" && (
                    <div className="space-y-2">
                      {(f.options ?? []).map((o) => {
                        const arr = Array.isArray(val) ? (val as string[]) : [];
                        const checked = arr.includes(o.value);
                        return (
                          <label key={o.value} className="flex items-center gap-2 text-sm">
                            <Checkbox
                              checked={checked}
                              onCheckedChange={(c) => {
                                const next = c ? [...arr, o.value] : arr.filter((v) => v !== o.value);
                                set(next);
                              }}
                            />
                            <span>{ar ? o.label_ar : o.label_en}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                  {f.type === "single_checkbox" && (
                    <label className="flex items-start gap-2 text-sm">
                      <Checkbox
                        id={f.id}
                        checked={!!val}
                        onCheckedChange={(c) => set(!!c)}
                      />
                      <span>{label}{req}</span>
                    </label>
                  )}
                </div>
              );
            })}

            <Button type="submit" disabled={submitting} className="w-full">
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {submitLabel}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
