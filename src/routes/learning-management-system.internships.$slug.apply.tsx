import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";

import { useLang } from "@/lib/i18n";
import { lmsInternshipsT } from "@/lib/lms-internships-i18n";
import { useLmsAuth } from "@/hooks/useLmsAuth";
import {
  getInternshipApplyContext,
  mapApplyError,
  submitInternshipApplication,
  type ApplyContext,
} from "@/lib/lms-internships-apply.functions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/learning-management-system/internships/$slug/apply")({
  head: () => ({
    meta: [
      { title: "Apply — Internship" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: ApplyPage,
});

type AnswerState = Record<string, { text?: string; selected?: string[] }>;

function ApplyPage() {
  const { slug } = Route.useParams();
  const { lang, dir } = useLang();
  const t = lmsInternshipsT[lang];
  const navigate = useNavigate();
  const { user, loading: authLoading } = useLmsAuth();
  const getCtx = useServerFn(getInternshipApplyContext);
  const submit = useServerFn(submitInternshipApplication);

  const [ctx, setCtx] = useState<ApplyContext | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [answers, setAnswers] = useState<AnswerState>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate({
        to: "/learning-management-system/login",
        search: {
          redirect: `/learning-management-system/internships/${slug}/apply`,
        } as any,
      });
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await getCtx({ data: { slug } });
        if (cancelled) return;
        setCtx(res);
        // seed answer state
        const init: AnswerState = {};
        for (const q of res.opportunity.questions) init[q.id] = { text: "", selected: [] };
        setAnswers(init);
      } catch (err) {
        if (!cancelled) setLoadErr(mapApplyError(err, lang));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug, authLoading, user, getCtx, lang, navigate]);

  const Arrow = dir === "rtl" ? ArrowRight : ArrowLeft;
  const title = useMemo(() => {
    if (!ctx) return "";
    return lang === "ar"
      ? ctx.opportunity.title_ar
      : ctx.opportunity.title_en || ctx.opportunity.title_ar;
  }, [ctx, lang]);

  if (loadErr) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-16 text-center" dir={dir}>
        <p className="text-destructive">{loadErr}</p>
        <Link
          to="/learning-management-system/internships"
          className="mt-4 inline-block text-primary underline"
        >
          {t.internshipsTitle}
        </Link>
      </div>
    );
  }

  if (!ctx) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const onSubmit = async () => {
    // Validate required questions client-side
    for (const q of ctx.opportunity.questions) {
      if (!q.is_required) continue;
      const a = answers[q.id];
      const hasText = !!a?.text && a.text.trim().length > 0;
      const hasSel = !!a?.selected && a.selected.length > 0;
      if (q.kind === "single_choice" || q.kind === "multi_choice") {
        if (!hasSel) {
          toast.error(lang === "ar" ? "بعض الأسئلة المطلوبة فارغة" : "Please answer all required questions");
          return;
        }
      } else if (!hasText) {
        toast.error(lang === "ar" ? "بعض الأسئلة المطلوبة فارغة" : "Please answer all required questions");
        return;
      }
    }

    const payload = ctx.opportunity.questions
      .map((q) => {
        const a = answers[q.id];
        if (!a) return null;
        if (q.kind === "single_choice") {
          const sel = a.selected?.[0];
          if (!sel) return null;
          return { question_id: q.id, answer_json: sel };
        }
        if (q.kind === "multi_choice") {
          if (!a.selected?.length) return null;
          return { question_id: q.id, answer_json: a.selected };
        }
        if (!a.text?.trim()) return null;
        return { question_id: q.id, answer_text: a.text.trim() };
      })
      .filter(Boolean) as { question_id: string; answer_text?: string; answer_json?: unknown }[];

    setSubmitting(true);
    try {
      const res = await submit({
        data: { opportunity_id: ctx.opportunity.id, answers: payload },
      });
      if (!res?.id) throw new Error("application_not_found");
      toast.success(t.applySubmitted);
      navigate({ to: "/learning-management-system/profile" });
    } catch (err) {
      toast.error(mapApplyError(err, lang));
    } finally {
      setSubmitting(false);
    }

  };

  const p = ctx.profile;
  const cannotApply = !ctx.can_apply;

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-8 sm:py-12 space-y-6" dir={dir}>
      <Link
        to="/learning-management-system/internships/$slug"
        params={{ slug }}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary"
      >
        <Arrow className="h-4 w-4" />
        <span dir="auto">{title}</span>
      </Link>

      <header>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{t.applyReviewTitle}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t.applyReviewNotice}</p>
      </header>

      {ctx.block_reason && (
        <BlockNotice reason={ctx.block_reason} ctx={ctx} lang={lang} />
      )}

      {/* Identity */}
      <Card className="p-5 space-y-2">
        <h2 className="text-base font-semibold text-foreground">{t.applyIdentitySection}</h2>
        <ReviewRow label={lang === "ar" ? "الاسم الكامل" : "Full name"} value={p.full_name} />
        <ReviewRow label={lang === "ar" ? "البريد" : "Email"} value={ctx.email} />
        <ReviewRow label={lang === "ar" ? "الهاتف" : "Phone"} value={p.phone} />
        <ReviewRow
          label={lang === "ar" ? "المؤسّسة" : "Organization"}
          value={p.organization}
        />
        <ReviewRow label={lang === "ar" ? "نبذة" : "Biography"} value={p.biography} multiline />
      </Card>

      {/* CV */}
      {ctx.opportunity.require_cv && (
        <Card className="p-5">
          <h2 className="text-base font-semibold text-foreground mb-2">{t.applyCvSection}</h2>
          {ctx.cv ? (
            <p className="text-sm text-foreground" dir="auto">
              {ctx.cv.original_filename}
            </p>
          ) : (
            <p className="text-sm text-destructive">{t.applyProfileIncomplete}</p>
          )}
        </Card>
      )}

      {/* Courses */}
      <Card className="p-5">
        <h2 className="text-base font-semibold text-foreground mb-2">{t.applyCoursesSection}</h2>
        {ctx.courses.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {lang === "ar" ? "لا توجد دورات" : "No courses"}
          </p>
        ) : (
          <ul className="space-y-1 text-sm">
            {ctx.courses.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-2">
                <span className="text-foreground" dir="auto">
                  {lang === "ar" ? c.title_ar : c.title_en || c.title_ar}
                </span>
                <Badge variant={c.completed ? "default" : "outline"}>
                  {Math.round(c.progress)}%
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* Certificates */}
      <Card className="p-5">
        <h2 className="text-base font-semibold text-foreground mb-2">
          {t.applyCertificatesSection}
        </h2>
        {ctx.certificates.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {lang === "ar" ? "لا توجد شهادات" : "No certificates"}
          </p>
        ) : (
          <ul className="space-y-1 text-sm">
            {ctx.certificates.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-2">
                <span className="text-foreground" dir="auto">
                  {lang === "ar" ? c.course_title_ar : c.course_title_en || c.course_title_ar}
                </span>
                <span className="font-mono text-xs text-muted-foreground">{c.serial}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* Additional questions */}
      {ctx.opportunity.questions.length > 0 && (
        <Card className="p-5 space-y-4">
          <h2 className="text-base font-semibold text-foreground">
            {t.applyQuestionsSection}
          </h2>
          {ctx.opportunity.questions.map((q) => {
            const label = lang === "ar" ? q.label_ar : q.label_en || q.label_ar;
            const help = lang === "ar" ? q.help_ar : q.help_en;
            const a = answers[q.id] ?? {};
            const setText = (v: string) =>
              setAnswers((prev) => ({ ...prev, [q.id]: { ...prev[q.id], text: v } }));
            const setSelected = (v: string[]) =>
              setAnswers((prev) => ({ ...prev, [q.id]: { ...prev[q.id], selected: v } }));
            return (
              <div key={q.id} className="space-y-2">
                <Label className="text-sm">
                  <span dir="auto">{label}</span>
                  {q.is_required && <span className="text-destructive"> *</span>}
                </Label>
                {help && (
                  <p className="text-xs text-muted-foreground" dir="auto">
                    {help}
                  </p>
                )}
                {q.kind === "long_text" ? (
                  <Textarea
                    value={a.text ?? ""}
                    onChange={(e) => setText(e.target.value)}
                    rows={4}
                    dir="auto"
                  />
                ) : q.kind === "single_choice" ? (
                  <div className="space-y-1">
                    {q.options.map((opt) => (
                      <label key={opt} className="flex items-center gap-2 text-sm">
                        <input
                          type="radio"
                          name={q.id}
                          checked={a.selected?.[0] === opt}
                          onChange={() => setSelected([opt])}
                        />
                        <span dir="auto">{opt}</span>
                      </label>
                    ))}
                  </div>
                ) : q.kind === "multi_choice" ? (
                  <div className="space-y-1">
                    {q.options.map((opt) => {
                      const checked = a.selected?.includes(opt) ?? false;
                      return (
                        <label key={opt} className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => {
                              const cur = new Set(a.selected ?? []);
                              if (e.target.checked) cur.add(opt);
                              else cur.delete(opt);
                              setSelected(Array.from(cur));
                            }}
                          />
                          <span dir="auto">{opt}</span>
                        </label>
                      );
                    })}
                  </div>
                ) : (
                  <Input
                    value={a.text ?? ""}
                    onChange={(e) => setText(e.target.value)}
                    dir="auto"
                  />
                )}
              </div>
            );
          })}
        </Card>
      )}

      <div className="sticky bottom-4 flex justify-center">
        <Button
          size="lg"
          className="shadow-lg"
          disabled={cannotApply || submitting}
          onClick={onSubmit}
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin me-2" />
              {t.applySubmitting}
            </>
          ) : (
            t.applySubmit
          )}
        </Button>
      </div>
    </div>
  );
}

function ReviewRow({
  label,
  value,
  multiline,
}: {
  label: string;
  value?: string | null;
  multiline?: boolean;
}) {
  return (
    <div className="grid grid-cols-3 gap-2 text-sm">
      <div className="text-muted-foreground">{label}</div>
      <div
        className={`col-span-2 text-foreground ${multiline ? "whitespace-pre-wrap" : ""}`}
        dir="auto"
      >
        {value?.trim() ? value : <span className="text-muted-foreground">—</span>}
      </div>
    </div>
  );
}

function BlockNotice({
  reason,
  ctx,
  lang,
}: {
  reason: NonNullable<ApplyContext["block_reason"]>;
  ctx: ApplyContext;
  lang: "ar" | "en";
}) {
  const t = lmsInternshipsT[lang];
  let msg = "";
  if (reason === "not_open") msg = t.internshipClosed;
  else if (reason === "not_open_yet")
    msg = lang === "ar" ? "لم يُفتح التقديم بعد" : "Applications are not open yet";
  else if (reason === "deadline_passed")
    msg = lang === "ar" ? "انقضى الموعد النهائي للتقديم" : "The application deadline has passed";
  else if (reason === "duplicate") msg = t.applyDuplicate;
  else if (reason === "active_application")
    msg = lang === "ar" ? "لديك طلب فعّال بالفعل" : "You already have an active application";
  else if (reason === "profile_incomplete") msg = t.applyProfileIncomplete;

  return (
    <Card className="p-4 border-destructive/40 bg-destructive/5">
      <p className="text-sm text-foreground">{msg}</p>
      {(reason === "profile_incomplete" ||
        ctx.missing_required_profile_fields.length > 0 ||
        ctx.cv_missing) && (
        <Link
          to="/learning-management-system/profile"
          className="mt-2 inline-block text-sm text-primary underline"
        >
          {t.applyProfileIncompleteAction}
        </Link>
      )}
    </Card>
  );
}
