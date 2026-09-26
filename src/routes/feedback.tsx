import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { StarRating } from "@/components/feedback/StarRating";
import {
  AGE_RANGES,
  CONTACT_METHODS,
  DEVICES,
  FREQUENCIES,
  GOVERNORATES,
  NA_LABEL,
  NOTE_FIELDS,
  RATING_LABELS,
  SECTIONS,
  SERVICES,
  USER_TYPES,
  isSectionVisible,
  type AnswerValue,
  type Choice,
  type Lang,
  type NoteKey,
  type RatingSection,
} from "@/lib/feedback-survey";
import {
  getFeedbackUploadUrl,
  startFeedbackSurvey,
  submitFeedbackSurvey,
} from "@/lib/feedback-survey.functions";
import "@/components/feedback/feedback.css";

export const Route = createFileRoute("/feedback")({
  validateSearch: (s) => z.object({ lang: z.enum(["ar", "en"]).optional() }).parse(s),
  head: () => ({
    meta: [
      { title: "شاركنا رأيك — استبيان التجربة الرقمية | SAAE" },
      {
        name: "description",
        content: "رأيك يساعدنا على تطوير موقع الجمعية السورية للذكاء الاصطناعي وريادة الأعمال ومنصتها التعليمية وخدماتها الرقمية.",
      },
      { property: "og:title", content: "شاركنا رأيك — استبيان التجربة الرقمية لجمعية SAAE" },
      {
        property: "og:description",
        content: "قيّم موقع الجمعية ومنصتها التعليمية والمساعد الذكي أبو الجود خلال 4 إلى 6 دقائق.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap",
      },
    ],
  }),
  component: FeedbackPage,
});

const DRAFT_KEY = "saae-feedback-draft-v1";
const LOGO = "/feedback/saae-logo.png";

type Draft = {
  submissionId: string | null;
  step: number;
  user_type: string;
  age_range: string;
  governorate: string;
  usage_frequency: string;
  device_type: string;
  services_used: string[];
  answers: Record<string, AnswerValue>;
  notes: Record<NoteKey, string>;
  wants_contact: boolean;
  contact_name: string;
  contact_value: string;
  preferred_contact_method: string;
  consent: boolean;
};

const EMPTY: Draft = {
  submissionId: null,
  step: 0,
  user_type: "",
  age_range: "",
  governorate: "",
  usage_frequency: "",
  device_type: "",
  services_used: [],
  answers: {},
  notes: { positive_notes: "", improvement_notes: "", problem_notes: "", requested_feature: "", general_notes: "" },
  wants_contact: false,
  contact_name: "",
  contact_value: "",
  preferred_contact_method: "",
  consent: false,
};

const TX = {
  ar: {
    title: "شاركنا رأيك",
    subtitle: "رأيك يساعدنا على تطوير موقع الجمعية ومنصتها التعليمية وخدماتها الرقمية.",
    time: "يستغرق الاستبيان من 4 إلى 6 دقائق.",
    privacy: "يمكنك المشاركة دون كتابة اسمك. ستُستخدم الإجابات لأغراض تحسين الخدمات فقط.",
    step: (a: number, b: number) => `الخطوة ${a} من ${b}`,
    about: "معلومات عنك",
    aboutHint: "كل الحقول في هذا القسم اختيارية.",
    userType: "ما صفتك؟",
    age: "الفئة العمرية",
    gov: "المحافظة",
    freq: "كم مرة تستخدم موقع الجمعية أو منصتها؟",
    device: "ما الجهاز الذي استخدمته؟",
    services: "ما الخدمات التي استخدمتها؟",
    servicesHint: "اختر كل ما ينطبق؛ سنعرض لك الأقسام المرتبطة فقط.",
    choose: "اختر…",
    notes: "ملاحظاتك المكتوبة",
    notesHint: "اكتب بحرية؛ كل الحقول اختيارية.",
    screenshot: "صورة للمشكلة التقنية (اختياري)",
    screenshotHint: "JPG أو PNG أو WebP، بحجم لا يتجاوز 5 ميغابايت.",
    screenshotBad: "الملف غير مدعوم أو أكبر من 5 ميغابايت.",
    remove: "إزالة",
    wantsContact: "هل ترغب أن يتواصل معك فريق الجمعية؟",
    yes: "نعم",
    no: "لا",
    name: "الاسم",
    contactValue: "البريد الإلكتروني أو رقم الهاتف",
    method: "طريقة التواصل المفضلة",
    contactRequired: "يرجى كتابة بريد إلكتروني أو رقم هاتف لنتمكن من التواصل معك.",
    review: "مراجعة الإجابات",
    reviewHint: "راجع إجاباتك قبل الإرسال. يمكنك الرجوع لأي خطوة لتعديلها.",
    edit: "تعديل",
    unanswered: "بدون إجابة",
    consent: "أوافق على استخدام إجاباتي لأغراض تحليل جودة الخدمات وتطويرها.",
    consentRequired: "يرجى الموافقة قبل الإرسال.",
    next: "التالي",
    back: "السابق",
    submit: "إرسال الاستبيان",
    sending: "جارٍ الإرسال…",
    missing: "بعض الأسئلة المطلوبة بحاجة إلى تقييم.",
    error: "تعذّر حفظ إجاباتك الآن. تحقّق من اتصالك وحاول مرة أخرى.",
    rate: "تم إرسال عدد كبير من الاستبيانات من هذا الاتصال. حاول لاحقاً.",
    thanks: "شكراً لمشاركتك. رأيك خطوة أساسية في تطوير خدمات الجمعية.",
    home: "العودة إلى موقع الجمعية",
    again: "تعبئة استبيان جديد",
    required: "مطلوب",
    optional: "اختياري",
    naAllowed: "يمكنك اختيار «لا ينطبق» إذا لم تستخدم الميزة.",
    switchLang: "English",
    none: "—",
  },
  en: {
    title: "Share your feedback",
    subtitle: "Your opinion helps us improve SAAE's website, learning platform and digital services.",
    time: "The survey takes 4 to 6 minutes.",
    privacy: "You can take part without giving your name. Answers are used only to improve our services.",
    step: (a: number, b: number) => `Step ${a} of ${b}`,
    about: "About you",
    aboutHint: "Every field in this section is optional.",
    userType: "Which best describes you?",
    age: "Age range",
    gov: "Governorate",
    freq: "How often do you use the SAAE website or platform?",
    device: "Which device did you use?",
    services: "Which services have you used?",
    servicesHint: "Pick all that apply; we'll show only the related sections.",
    choose: "Choose…",
    notes: "Your written feedback",
    notesHint: "Write freely; every field is optional.",
    screenshot: "Screenshot of a technical problem (optional)",
    screenshotHint: "JPG, PNG or WebP, up to 5 MB.",
    screenshotBad: "Unsupported file or larger than 5 MB.",
    remove: "Remove",
    wantsContact: "Would you like the SAAE team to contact you?",
    yes: "Yes",
    no: "No",
    name: "Name",
    contactValue: "Email or phone number",
    method: "Preferred contact method",
    contactRequired: "Please add an email or phone number so we can reach you.",
    review: "Review your answers",
    reviewHint: "Check your answers before sending. You can go back to edit any step.",
    edit: "Edit",
    unanswered: "Not answered",
    consent: "I agree that my answers may be used to analyse and improve service quality.",
    consentRequired: "Please agree before submitting.",
    next: "Next",
    back: "Back",
    submit: "Submit survey",
    sending: "Sending…",
    missing: "Some required questions still need a rating.",
    error: "We couldn't save your answers right now. Check your connection and try again.",
    rate: "Too many surveys were sent from this connection. Please try later.",
    thanks: "Thank you for taking part. Your opinion is a key step in improving SAAE's services.",
    home: "Back to the SAAE website",
    again: "Fill in a new survey",
    required: "Required",
    optional: "Optional",
    naAllowed: "Choose “Not applicable” if you haven't used the feature.",
    switchLang: "العربية",
    none: "—",
  },
};

type StepDef = { kind: "profile" } | { kind: "section"; section: RatingSection } | { kind: "notes" } | { kind: "review" };

function FeedbackPage() {
  const search = Route.useSearch();
  const lang: Lang = search.lang ?? "ar";
  const tr = TX[lang];
  const navigate = useNavigate();
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [loaded, setLoaded] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState(false);
  const honeypot = useRef<HTMLInputElement>(null);
  const topRef = useRef<HTMLDivElement>(null);

  const start = useServerFn(startFeedbackSurvey);
  const submit = useServerFn(submitFeedbackSurvey);
  const uploadUrl = useServerFn(getFeedbackUploadUrl);

  // Restore autosaved draft
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) setDraft({ ...EMPTY, ...JSON.parse(raw) });
    } catch {
      /* ignore */
    }
    setLoaded(true);
  }, []);
  useEffect(() => {
    if (!loaded || done) return;
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch {
      /* ignore */
    }
  }, [draft, loaded, done]);

  // Register the start of a response once.
  useEffect(() => {
    if (!loaded || draft.submissionId || done) return;
    start({ data: { lang, website: honeypot.current?.value || undefined } })
      .then((r) => r.id && setDraft((d) => ({ ...d, submissionId: r.id })))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded]);

  const steps: StepDef[] = useMemo(
    () => [
      { kind: "profile" },
      ...SECTIONS.filter((s) => isSectionVisible(s, draft.services_used)).map(
        (section) => ({ kind: "section", section }) as StepDef,
      ),
      { kind: "notes" },
      { kind: "review" },
    ],
    [draft.services_used],
  );
  const stepIdx = Math.min(draft.step, steps.length - 1);
  const step = steps[stepIdx]!;
  const progress = Math.round(((stepIdx + 1) / steps.length) * 100);

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => ({ ...d, [k]: v }));
  const setAnswer = (key: string, v: AnswerValue) =>
    setDraft((d) => ({ ...d, answers: { ...d.answers, [key]: v } }));

  const sectionMissing = (s: RatingSection) =>
    s.allowNA ? [] : s.questions.filter((q) => draft.answers[q.key] === undefined).map((q) => q.key);
  const contactInvalid = draft.wants_contact && draft.contact_value.trim().length < 5;

  const stepValid = (st: StepDef) => {
    if (st.kind === "section") return sectionMissing(st.section).length === 0;
    if (st.kind === "notes") return !contactInvalid && !fileError;
    return true;
  };

  const goTo = (i: number) => {
    setShowErrors(false);
    setError(null);
    set("step", i);
    requestAnimationFrame(() => topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };
  const next = () => {
    if (!stepValid(step)) {
      setShowErrors(true);
      requestAnimationFrame(() => {
        document.querySelector<HTMLElement>(".fb-q.is-invalid button, .fb-field.is-invalid input")?.focus();
      });
      return;
    }
    goTo(stepIdx + 1);
  };

  const switchLang = () => navigate({ to: "/feedback", search: { lang: lang === "ar" ? "en" : undefined } });

  const onFile = (f: File | null) => {
    setFileError(false);
    if (!f) return setFile(null);
    if (!["image/jpeg", "image/png", "image/webp"].includes(f.type) || f.size > 5 * 1024 * 1024) {
      setFile(null);
      setFileError(true);
      return;
    }
    setFile(f);
  };

  const doSubmit = async () => {
    if (!draft.consent) {
      setShowErrors(true);
      return;
    }
    const firstBad = steps.findIndex((s) => !stepValid(s));
    if (firstBad >= 0) {
      goTo(firstBad);
      setShowErrors(true);
      setError(tr.missing);
      return;
    }
    setSending(true);
    setError(null);
    try {
      let screenshot_path: string | null = null;
      if (file && draft.submissionId) {
        try {
          const up = await uploadUrl({
            data: { submissionId: draft.submissionId, contentType: file.type as "image/png", size: file.size },
          });
          const { error: upErr } = await supabase.storage
            .from("feedback-screenshots")
            .uploadToSignedUrl(up.path, up.token, file, { contentType: file.type });
          if (!upErr) screenshot_path = up.path;
        } catch {
          /* screenshot is optional */
        }
      }
      const cv = draft.contact_value.trim();
      const isEmail = cv.includes("@");
      const visibleKeys = new Set(
        steps.flatMap((s) => (s.kind === "section" ? s.section.questions.map((q) => q.key) : [])),
      );
      const answers = Object.fromEntries(Object.entries(draft.answers).filter(([k]) => visibleKeys.has(k)));
      const res = await submit({
        data: {
          submissionId: draft.submissionId,
          website: honeypot.current?.value || undefined,
          lang,
          user_type: draft.user_type || null,
          age_range: draft.age_range || null,
          governorate: draft.governorate || null,
          usage_frequency: draft.usage_frequency || null,
          device_type: draft.device_type || null,
          services_used: draft.services_used,
          answers,
          consent: true,
          wants_contact: draft.wants_contact,
          contact_name: draft.contact_name,
          contact_email: isEmail ? cv : null,
          contact_phone: !isEmail && cv ? cv : null,
          preferred_contact_method: draft.preferred_contact_method || null,
          ...draft.notes,
          screenshot_path,
        } as never,
      });
      if (!res.ok) {
        setError(res.error === "rate_limited" ? tr.rate : res.error === "missing_required" ? tr.missing : tr.error);
        return;
      }
      localStorage.removeItem(DRAFT_KEY);
      setDone(true);
      requestAnimationFrame(() => topRef.current?.scrollIntoView({ block: "start" }));
    } catch (e) {
      console.error("[feedback] submit failed", e);
      setError(
        import.meta.env.DEV && e instanceof Error ? `${tr.error} (${e.message})` : tr.error,
      );
    } finally {
      setSending(false);
    }
  };

  const restart = () => {
    localStorage.removeItem(DRAFT_KEY);
    setDraft(EMPTY);
    setFile(null);
    setDone(false);
    start({ data: { lang } })
      .then((r) => r.id && setDraft((d) => ({ ...d, submissionId: r.id })))
      .catch(() => {});
  };

  return (
    <div className="fb-root" dir={lang === "ar" ? "rtl" : "ltr"} lang={lang}>
      <div ref={topRef} />
      <header className="fb-header">
        <div className="fb-header-inner">
          <a href="/" className="fb-logo-link" aria-label="SAAE">
            <img src={LOGO} alt={lang === "ar" ? "شعار الجمعية السورية للذكاء الاصطناعي وريادة الأعمال" : "SAAE logo"} className="fb-logo" width={374} height={400} />
          </a>
          <button type="button" className="fb-lang" onClick={switchLang}>
            {tr.switchLang}
          </button>
        </div>
      </header>

      <main className="fb-main">
        {done ? (
          <section className="fb-card fb-thanks" aria-live="polite">
            <img src={LOGO} alt="" className="fb-thanks-logo" width={374} height={400} />
            <h1 className="fb-display">{tr.thanks}</h1>
            <div className="fb-actions fb-actions-center">
              <a href="/" className="fb-btn fb-btn-primary">
                {tr.home}
              </a>
              <button type="button" className="fb-btn fb-btn-ghost" onClick={restart}>
                {tr.again}
              </button>
            </div>
          </section>
        ) : (
          <>
            <section className="fb-intro">
              <h1 className="fb-display">{tr.title}</h1>
              <p className="fb-subtitle">{tr.subtitle}</p>
              <p className="fb-meta">
                <span>{tr.time}</span>
              </p>
              <p className="fb-privacy">{tr.privacy}</p>
            </section>

            <div className="fb-progress" aria-label={tr.step(stepIdx + 1, steps.length)}>
              <div className="fb-progress-top">
                <span>{tr.step(stepIdx + 1, steps.length)}</span>
                <span>{progress}%</span>
              </div>
              <div className="fb-progress-bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}>
                <span style={{ inlineSize: `${progress}%` }} />
              </div>
            </div>

            <input
              ref={honeypot}
              type="text"
              name="website"
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              className="fb-hp"
            />

            <section className="fb-card fb-step" key={stepIdx}>
              {step.kind === "profile" && (
                <>
                  <h2 className="fb-h2">{tr.about}</h2>
                  <p className="fb-hint">{tr.aboutHint}</p>
                  <ChoiceGroup legend={tr.userType} options={USER_TYPES} value={draft.user_type} onChange={(v) => set("user_type", v)} lang={lang} />
                  <div className="fb-grid-2">
                    <SelectField label={tr.age} options={AGE_RANGES} value={draft.age_range} onChange={(v) => set("age_range", v)} lang={lang} placeholder={tr.choose} />
                    <SelectField label={tr.gov} options={GOVERNORATES} value={draft.governorate} onChange={(v) => set("governorate", v)} lang={lang} placeholder={tr.choose} />
                  </div>
                  <ChoiceGroup legend={tr.freq} options={FREQUENCIES} value={draft.usage_frequency} onChange={(v) => set("usage_frequency", v)} lang={lang} />
                  <ChoiceGroup legend={tr.device} options={DEVICES} value={draft.device_type} onChange={(v) => set("device_type", v)} lang={lang} />
                  <fieldset className="fb-group">
                    <legend className="fb-q-label">{tr.services}</legend>
                    <p className="fb-hint">{tr.servicesHint}</p>
                    <div className="fb-chips">
                      {SERVICES.map((s) => {
                        const on = draft.services_used.includes(s.value);
                        return (
                          <label key={s.value} className={`fb-chip ${on ? "is-on" : ""}`}>
                            <input
                              type="checkbox"
                              checked={on}
                              onChange={() => {
                                let list = on
                                  ? draft.services_used.filter((x) => x !== s.value)
                                  : [...draft.services_used, s.value];
                                if (s.value === "none" && !on) list = ["none"];
                                else if (s.value !== "none") list = list.filter((x) => x !== "none");
                                set("services_used", list);
                              }}
                            />
                            <span>{s[lang]}</span>
                          </label>
                        );
                      })}
                    </div>
                  </fieldset>
                </>
              )}

              {step.kind === "section" && (
                <>
                  <h2 className="fb-h2">{step.section[lang]}</h2>
                  <p className="fb-hint">
                    {step.section.allowNA ? tr.naAllowed : `${tr.required}: ${RATING_LABELS[lang].slice(1).map((l, i) => `${i + 1} ${l}`).join(" · ")}`}
                  </p>
                  {step.section.questions.map((q) => (
                    <StarRating
                      key={q.key}
                      id={q.key}
                      label={q[lang]}
                      value={draft.answers[q.key]}
                      onChange={(v) => setAnswer(q.key, v)}
                      allowNA={step.section.allowNA}
                      lang={lang}
                      invalid={showErrors && !step.section.allowNA && draft.answers[q.key] === undefined}
                    />
                  ))}
                </>
              )}

              {step.kind === "notes" && (
                <>
                  <h2 className="fb-h2">{tr.notes}</h2>
                  <p className="fb-hint">{tr.notesHint}</p>
                  {NOTE_FIELDS.map((n) => (
                    <div className="fb-field" key={n.key}>
                      <label htmlFor={`note-${n.key}`} className="fb-q-label">
                        {n[lang]}
                      </label>
                      <textarea
                        id={`note-${n.key}`}
                        rows={4}
                        maxLength={3000}
                        value={draft.notes[n.key]}
                        onChange={(e) => set("notes", { ...draft.notes, [n.key]: e.target.value })}
                      />
                    </div>
                  ))}
                  <div className={`fb-field ${fileError ? "is-invalid" : ""}`}>
                    <label htmlFor="fb-file" className="fb-q-label">
                      {tr.screenshot}
                    </label>
                    <p className="fb-hint">{tr.screenshotHint}</p>
                    <input id="fb-file" type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => onFile(e.target.files?.[0] ?? null)} />
                    {file && (
                      <p className="fb-file">
                        {file.name}{" "}
                        <button type="button" className="fb-link" onClick={() => onFile(null)}>
                          {tr.remove}
                        </button>
                      </p>
                    )}
                    {fileError && <p className="fb-err" role="alert">{tr.screenshotBad}</p>}
                  </div>
                  <fieldset className="fb-group">
                    <legend className="fb-q-label">{tr.wantsContact}</legend>
                    <div className="fb-chips">
                      {[true, false].map((v) => (
                        <label key={String(v)} className={`fb-chip ${draft.wants_contact === v ? "is-on" : ""}`}>
                          <input type="radio" name="wants_contact" checked={draft.wants_contact === v} onChange={() => set("wants_contact", v)} />
                          <span>{v ? tr.yes : tr.no}</span>
                        </label>
                      ))}
                    </div>
                  </fieldset>
                  {draft.wants_contact && (
                    <div className="fb-grid-2">
                      <div className="fb-field">
                        <label htmlFor="fb-name" className="fb-q-label">{tr.name}</label>
                        <input id="fb-name" maxLength={120} value={draft.contact_name} onChange={(e) => set("contact_name", e.target.value)} autoComplete="name" />
                      </div>
                      <div className={`fb-field ${showErrors && contactInvalid ? "is-invalid" : ""}`}>
                        <label htmlFor="fb-contact" className="fb-q-label">{tr.contactValue}</label>
                        <input id="fb-contact" dir="ltr" maxLength={200} value={draft.contact_value} onChange={(e) => set("contact_value", e.target.value)} aria-invalid={showErrors && contactInvalid} />
                        {showErrors && contactInvalid && <p className="fb-err" role="alert">{tr.contactRequired}</p>}
                      </div>
                      <SelectField label={tr.method} options={CONTACT_METHODS} value={draft.preferred_contact_method} onChange={(v) => set("preferred_contact_method", v)} lang={lang} placeholder={tr.choose} />
                    </div>
                  )}
                </>
              )}

              {step.kind === "review" && (
                <>
                  <h2 className="fb-h2">{tr.review}</h2>
                  <p className="fb-hint">{tr.reviewHint}</p>
                  {steps.map((s, i) => {
                    if (s.kind !== "section") return null;
                    return (
                      <div className="fb-review" key={s.section.key}>
                        <div className="fb-review-head">
                          <h3>{s.section[lang]}</h3>
                          <button type="button" className="fb-link" onClick={() => goTo(i)}>{tr.edit}</button>
                        </div>
                        <ul>
                          {s.section.questions.map((q) => {
                            const v = draft.answers[q.key];
                            return (
                              <li key={q.key}>
                                <span>{q[lang]}</span>
                                <strong>
                                  {typeof v === "number" ? `${"★".repeat(v)} ${v}/5 · ${RATING_LABELS[lang][v]}` : v === "na" ? NA_LABEL[lang] : tr.unanswered}
                                </strong>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    );
                  })}
                  <label className={`fb-consent ${showErrors && !draft.consent ? "is-invalid" : ""}`}>
                    <input type="checkbox" checked={draft.consent} onChange={(e) => set("consent", e.target.checked)} />
                    <span>{tr.consent}</span>
                  </label>
                  {showErrors && !draft.consent && <p className="fb-err" role="alert">{tr.consentRequired}</p>}
                </>
              )}

              {showErrors && step.kind === "section" && !stepValid(step) && (
                <p className="fb-err fb-err-box" role="alert">{tr.missing}</p>
              )}
              {error && <p className="fb-err fb-err-box" role="alert">{error}</p>}

              <div className="fb-actions">
                {stepIdx > 0 && (
                  <button type="button" className="fb-btn fb-btn-ghost" onClick={() => goTo(stepIdx - 1)} disabled={sending}>
                    {tr.back}
                  </button>
                )}
                {step.kind === "review" ? (
                  <button
                    type="button"
                    className="fb-btn fb-btn-primary"
                    onClick={doSubmit}
                    disabled={sending || !draft.consent}
                    aria-busy={sending}
                  >
                    {sending ? tr.sending : tr.submit}
                  </button>
                ) : (
                  <button type="button" className="fb-btn fb-btn-primary" onClick={next}>
                    {tr.next}
                  </button>
                )}
              </div>
            </section>
          </>
        )}
      </main>
      <footer className="fb-footer">
        <Link to="/">aisyria.org</Link>
      </footer>
    </div>
  );
}

function ChoiceGroup({
  legend,
  options,
  value,
  onChange,
  lang,
}: {
  legend: string;
  options: Choice[];
  value: string;
  onChange: (v: string) => void;
  lang: Lang;
}) {
  const name = useMemo(() => `g-${legend.length}-${options[0]?.value}`, [legend, options]);
  return (
    <fieldset className="fb-group">
      <legend className="fb-q-label">{legend}</legend>
      <div className="fb-chips">
        {options.map((o) => (
          <label key={o.value} className={`fb-chip ${value === o.value ? "is-on" : ""}`}>
            <input type="radio" name={name} checked={value === o.value} onChange={() => onChange(o.value)} onClick={() => value === o.value && onChange("")} />
            <span>{o[lang]}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function SelectField({
  label,
  options,
  value,
  onChange,
  lang,
  placeholder,
}: {
  label: string;
  options: Choice[];
  value: string;
  onChange: (v: string) => void;
  lang: Lang;
  placeholder: string;
}) {
  const id = `sel-${options[0]?.value}`;
  return (
    <div className="fb-field">
      <label htmlFor={id} className="fb-q-label">{label}</label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o[lang]}</option>
        ))}
      </select>
    </div>
  );
}
