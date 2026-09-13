import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { useLang } from "@/lib/i18n";
import { lmsInternshipsT } from "@/lib/lms-internships-i18n";
import { useLmsAuth } from "@/hooks/useLmsAuth";
import {
  getInternshipApplyContext,
  mapApplyError,
  submitInternshipApplication,
  type ApplyContext,
} from "@/lib/lms-internships-apply.functions";
import { SubHero } from "@/components/lms-skin/SubHero";
import { LMS_SKIN_LINKS } from "@/components/lms-skin/skin";

export const Route = createFileRoute("/learning-management-system/internships/$slug/apply")({
  head: () => ({
    meta: [
      { title: "Apply — Internship" },
      { name: "robots", content: "noindex, nofollow" },
    ],
    links: LMS_SKIN_LINKS,
  }),
  component: ApplyPage,
});

type AnswerState = Record<string, { text?: string; selected?: string[] }>;

function ApplyPage() {
  const { slug } = Route.useParams();
  const { lang } = useLang();
  const ar = lang === "ar";
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

  const title = useMemo(() => {
    if (!ctx) return "";
    return lang === "ar"
      ? ctx.opportunity.title_ar
      : ctx.opportunity.title_en || ctx.opportunity.title_ar;
  }, [ctx, lang]);

  if (loadErr) {
    return (
      <SubHero
        id="apply-error-title"
        eyebrow={t.internshipsTitle}
        titleSpans={[loadErr]}
        titleClassName="course-page-title"
        copyChildren={
          <p style={{ marginTop: 28 }}>
            <Link to="/learning-management-system/internships" className="action action-primary">
              {t.internshipsTitle}
            </Link>
          </p>
        }
      />
    );
  }

  if (!ctx) {
    return (
      <section className="lms-hero lms-subhero">
        <div className="page-shell">
          <p className="state-box">
            <Loader2 className="h-6 w-6 animate-spin" />
          </p>
        </div>
      </section>
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
    <>
      <SubHero
        id="apply-title"
        eyebrow={t.internshipsTitle}
        titleSpans={[t.applyReviewTitle]}
        titleClassName="course-page-title"
        lede={t.applyReviewNotice}
        before={
          <nav className="course-crumbs" aria-label={ar ? "أنت هنا" : "You are here"}>
            <Link to="/learning-management-system/internships">{t.internshipsTitle}</Link>
            <span aria-hidden="true">/</span>
            <Link to="/learning-management-system/internships/$slug" params={{ slug }}>
              <span dir="auto">{title}</span>
            </Link>
          </nav>
        }
      />

      <section className="lms-section" aria-labelledby="apply-title">
        <div className="page-shell narrow-stack">
          {ctx.block_reason && <BlockNotice reason={ctx.block_reason} ctx={ctx} lang={lang} />}

          <article className="pro-card">
            <h2>{t.applyIdentitySection}</h2>
            <dl className="apply-rows">
              <ReviewRow label={ar ? "الاسم الكامل" : "Full name"} value={p.full_name} />
              <ReviewRow label={ar ? "البريد" : "Email"} value={ctx.email} />
              <ReviewRow label={ar ? "الهاتف" : "Phone"} value={p.phone} />
              <ReviewRow label={ar ? "المؤسّسة" : "Organization"} value={p.organization} />
              <ReviewRow label={ar ? "نبذة" : "Biography"} value={p.biography} />
            </dl>
          </article>

          {ctx.opportunity.require_cv && (
            <article className="pro-card">
              <h2>{t.applyCvSection}</h2>
              {ctx.cv ? (
                <p dir="auto">{ctx.cv.original_filename}</p>
              ) : (
                <p className="enroll-note is-invalid">{t.applyProfileIncomplete}</p>
              )}
            </article>
          )}

          <article className="pro-card">
            <h2>{t.applyCoursesSection}</h2>
            {ctx.courses.length === 0 ? (
              <p>{ar ? "لا توجد دورات" : "No courses"}</p>
            ) : (
              <ul className="apply-list">
                {ctx.courses.map((c) => (
                  <li key={c.id}>
                    <span dir="auto">{lang === "ar" ? c.title_ar : c.title_en || c.title_ar}</span>
                    <b>{Math.round(c.progress)}%</b>
                  </li>
                ))}
              </ul>
            )}
          </article>

          <article className="pro-card">
            <h2>{t.applyCertificatesSection}</h2>
            {ctx.certificates.length === 0 ? (
              <p>{ar ? "لا توجد شهادات" : "No certificates"}</p>
            ) : (
              <ul className="apply-list">
                {ctx.certificates.map((c) => (
                  <li key={c.id}>
                    <span dir="auto">{lang === "ar" ? c.course_title_ar : c.course_title_en || c.course_title_ar}</span>
                    <b dir="ltr">{c.serial}</b>
                  </li>
                ))}
              </ul>
            )}
          </article>

          {ctx.opportunity.questions.length > 0 && (
            <article className="pro-card">
              <h2>{t.applyQuestionsSection}</h2>
              {ctx.opportunity.questions.map((q) => {
                const label = lang === "ar" ? q.label_ar : q.label_en || q.label_ar;
                const help = lang === "ar" ? q.help_ar : q.help_en;
                const a = answers[q.id] ?? {};
                const inputId = `q-${q.id}`;
                const setText = (v: string) =>
                  setAnswers((prev) => ({ ...prev, [q.id]: { ...prev[q.id], text: v } }));
                const setSelected = (v: string[]) =>
                  setAnswers((prev) => ({ ...prev, [q.id]: { ...prev[q.id], selected: v } }));
                return (
                  <div key={q.id} className="field">
                    <label htmlFor={inputId}>
                      <span dir="auto">{label}</span>
                      {q.is_required && <span className="req-mark"> *</span>}
                    </label>
                    {help && (
                      <p className="hint" dir="auto">
                        {help}
                      </p>
                    )}
                    {q.kind === "long_text" ? (
                      <textarea id={inputId} value={a.text ?? ""} onChange={(e) => setText(e.target.value)} rows={4} dir="auto" />
                    ) : q.kind === "single_choice" ? (
                      <div className="choice-list" id={inputId}>
                        {q.options.map((opt) => (
                          <label key={opt}>
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
                      <div className="choice-list" id={inputId}>
                        {q.options.map((opt) => {
                          const checked = a.selected?.includes(opt) ?? false;
                          return (
                            <label key={opt}>
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
                      <input id={inputId} type="text" value={a.text ?? ""} onChange={(e) => setText(e.target.value)} dir="auto" />
                    )}
                  </div>
                );
              })}
            </article>
          )}

          <div className="apply-bar">
            <button type="button" className="auth-submit" disabled={cannotApply || submitting} onClick={onSubmit}>
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t.applySubmitting}
                </>
              ) : (
                t.applySubmit
              )}
            </button>
          </div>
        </div>
      </section>
    </>
  );
}

function ReviewRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd dir="auto">{value?.trim() ? value : "—"}</dd>
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
    <div className="enroll-note is-pending">
      <span>{msg}</span>
      {(reason === "profile_incomplete" ||
        ctx.missing_required_profile_fields.length > 0 ||
        ctx.cv_missing) && (
        <Link to="/learning-management-system/profile" className="action action-secondary">
          {t.applyProfileIncompleteAction}
        </Link>
      )}
    </div>
  );
}
