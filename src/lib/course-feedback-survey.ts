/* Course feedback: the questions an online course asks once a learner has
   finished its lessons and passed its quiz (when it has one). The last step
   before the certificate. One source for the form, the server validator and
   the reports. The public website survey is separate (feedback-survey.ts).

   Answers are stored by id, never by label, so wording and language can
   change without touching stored responses. A template's version is saved
   with each response; change the version when a question or choice changes
   meaning. */

export type Lang = "ar" | "en";
export type Text = { ar: string; en: string };
export type Choice = Text & { id: string };

export type ChoiceQuestion = Text & {
  kind: "choice";
  id: string;
  choices: Choice[];
  /** Adds an optional short text box when the learner picks "other". */
  otherText?: boolean;
};
export type TextQuestion = Text & { kind: "text"; id: string; max: number };
export type Question = ChoiceQuestion | TextQuestion;
export type Step = { id: string; title: Text; questions: Question[] };

export type TemplateId = "standard" | "ai-architects";
export type Template = { id: TemplateId; version: string; steps: Step[] };

export const TEXT_MAX = 2000;
export const OTHER_TEXT_MAX = 200;
/** Notes key for a choice question's "other" text. */
export const otherKey = (questionId: string) => `${questionId}_other`;

/** Five choices whose ids are "1" (lowest) to "5" (highest). */
const scale = (labels: [Text, Text, Text, Text, Text]): Choice[] =>
  labels.map((label, i) => ({ id: String(i + 1), ...label }));

const CLEAR = scale([
  { ar: "غير واضح إطلاقاً", en: "Very unclear" },
  { ar: "غير واضح", en: "Unclear" },
  { ar: "مقبول", en: "Acceptable" },
  { ar: "واضح", en: "Clear" },
  { ar: "واضح جداً", en: "Very clear" },
]);

const USEFUL = scale([
  { ar: "غير مفيدة", en: "Not useful" },
  { ar: "مفيدة قليلاً", en: "Slightly useful" },
  { ar: "مفيدة إلى حدّ ما", en: "Moderately useful" },
  { ar: "مفيدة جداً", en: "Very useful" },
  { ar: "مفيدة للغاية", en: "Extremely useful" },
]);

const choice = (
  id: string,
  en: string,
  ar: string,
  choices: Choice[],
  otherText = false,
): ChoiceQuestion => ({ kind: "choice", id, en, ar, choices, ...(otherText ? { otherText } : {}) });

const PLATFORM: Step = {
  id: "platform",
  title: { ar: "المنصة والفيديو", en: "Platform and video" },
  questions: [
    choice(
      "navigation",
      "How easy was it to find and navigate the course lessons?",
      "ما مدى سهولة الوصول إلى دروس الدورة والتنقّل بينها؟",
      scale([
        { ar: "صعب جداً", en: "Very difficult" },
        { ar: "صعب", en: "Difficult" },
        { ar: "لا سهل ولا صعب", en: "Neither easy nor difficult" },
        { ar: "سهل", en: "Easy" },
        { ar: "سهل جداً", en: "Very easy" },
      ]),
    ),
    choice(
      "video_playback",
      "How reliably did the videos play?",
      "ما مدى سلاسة تشغيل الفيديوهات؟",
      scale([
        { ar: "متقطّع جداً", en: "Very unreliable" },
        { ar: "متقطّع", en: "Unreliable" },
        { ar: "مقبول", en: "Acceptable" },
        { ar: "سلس", en: "Reliable" },
        { ar: "سلس جداً", en: "Very reliable" },
      ]),
    ),
    choice("audio", "How clear was the audio?", "ما مدى وضوح الصوت؟", CLEAR),
    choice(
      "readability",
      "How readable were the demonstrations, slides, and screen details?",
      "ما مدى وضوح العروض والشرائح وتفاصيل الشاشة؟",
      CLEAR,
    ),
    choice(
      "device",
      "How comfortable was using the platform on your device?",
      "ما مدى راحة استخدام المنصة على جهازك؟",
      scale([
        { ar: "مزعج جداً", en: "Very uncomfortable" },
        { ar: "مزعج", en: "Uncomfortable" },
        { ar: "مقبول", en: "Acceptable" },
        { ar: "مريح", en: "Comfortable" },
        { ar: "مريح جداً", en: "Very comfortable" },
      ]),
    ),
  ],
};

const TEACHING_COMMON: Question[] = [
  choice(
    "explanations",
    "How clear were the instructor’s explanations?",
    "ما مدى وضوح شرح المدرّب؟",
    CLEAR,
  ),
  choice(
    "organisation",
    "How well were the lessons organized?",
    "ما مدى جودة تنظيم الدروس؟",
    scale([
      { ar: "سيئ جداً", en: "Very poorly" },
      { ar: "سيئ", en: "Poorly" },
      { ar: "مقبول", en: "Adequately" },
      { ar: "جيد", en: "Well" },
      { ar: "جيد جداً", en: "Very well" },
    ]),
  ),
  choice("pace", "How was the teaching pace?", "كيف كانت سرعة الشرح؟", [
    { id: "much_slow", ar: "بطيئة جداً", en: "Much too slow" },
    { id: "slow", ar: "بطيئة قليلاً", en: "Slightly slow" },
    { id: "right", ar: "مناسبة", en: "About right" },
    { id: "fast", ar: "سريعة قليلاً", en: "Slightly fast" },
    { id: "much_fast", ar: "سريعة جداً", en: "Much too fast" },
  ]),
  choice("examples", "How useful were the practical examples?", "ما مدى فائدة الأمثلة العملية؟", [
    ...USEFUL,
    { id: "na", ar: "لم تتضمّن الدورة أمثلة عملية", en: "The course had no practical examples" },
  ]),
];

const OUTCOMES_STANDARD: Question[] = [
  choice(
    "goals",
    "How well did the course meet your learning goals?",
    "إلى أي حدّ حقّقت الدورة أهدافك التعليمية؟",
    scale([
      { ar: "لم تحقّقها إطلاقاً", en: "Not at all" },
      { ar: "بشكل محدود", en: "Slightly" },
      { ar: "جزئياً", en: "Partly" },
      { ar: "إلى حدّ كبير", en: "Mostly" },
      { ar: "بالكامل", en: "Completely" },
    ]),
  ),
  choice(
    "confidence",
    "How confident do you feel using what you learned?",
    "ما مدى ثقتك في استخدام ما تعلّمته؟",
    scale([
      { ar: "غير واثق", en: "Not confident" },
      { ar: "واثق قليلاً", en: "Slightly confident" },
      { ar: "واثق إلى حدّ ما", en: "Somewhat confident" },
      { ar: "واثق", en: "Confident" },
      { ar: "واثق جداً", en: "Very confident" },
    ]),
  ),
  choice(
    "apply",
    "How likely are you to apply what you learned?",
    "ما مدى احتمال أن تطبّق ما تعلّمته؟",
    scale([
      { ar: "مستبعد جداً", en: "Very unlikely" },
      { ar: "مستبعد", en: "Unlikely" },
      { ar: "غير متأكد", en: "Unsure" },
      { ar: "مرجّح", en: "Likely" },
      { ar: "مرجّح جداً", en: "Very likely" },
    ]),
  ),
];

/* AI Workshop for Architects: one question per session instead of the three
   outcome questions. These rate the sessions; they do not test knowledge. */
const SESSION = [...USEFUL, { id: "na", ar: "لا أستطيع التقييم", en: "Unable to assess" }];
const OUTCOMES_AI_ARCHITECTS: Question[] = [
  choice(
    "session_prompting",
    "How useful was the session on prompting and architectural programming?",
    "ما مدى فائدة جلسة كتابة الأوامر (البرومبت) والبرنامج المعماري؟",
    SESSION,
  ),
  choice(
    "session_visuals",
    "How useful was the session on generating plans, presentations, and 3D visualizations?",
    "ما مدى فائدة جلسة توليد المساقط والعروض التقديمية والإظهار ثلاثي الأبعاد؟",
    SESSION,
  ),
  choice(
    "session_video",
    "How useful was the session on image-to-video animation and architectural presentation workflows?",
    "ما مدى فائدة جلسة تحويل الصور إلى فيديو وتحريك العروض المعمارية؟",
    SESSION,
  ),
];

const teaching = (outcomes: Question[]): Step => ({
  id: "teaching",
  title: { ar: "الشرح والفائدة", en: "Teaching and results" },
  questions: [...TEACHING_COMMON, ...outcomes],
});

const OVERALL: Step = {
  id: "overall",
  title: { ar: "رأيك العام", en: "Your overall view" },
  questions: [
    choice(
      "satisfaction",
      "How satisfied are you with the course overall?",
      "ما مدى رضاك عن الدورة بشكل عام؟",
      scale([
        { ar: "غير راضٍ إطلاقاً", en: "Very dissatisfied" },
        { ar: "غير راضٍ", en: "Dissatisfied" },
        { ar: "محايد", en: "Neutral" },
        { ar: "راضٍ", en: "Satisfied" },
        { ar: "راضٍ جداً", en: "Very satisfied" },
      ]),
    ),
    choice("recommend", "Would you recommend this course?", "هل تنصح غيرك بهذه الدورة؟", [
      { id: "definitely_not", ar: "بالتأكيد لا", en: "Definitely not" },
      { id: "probably_not", ar: "على الأرجح لا", en: "Probably not" },
      { id: "unsure", ar: "غير متأكد", en: "Unsure" },
      { id: "probably_yes", ar: "على الأرجح نعم", en: "Probably yes" },
      { id: "definitely_yes", ar: "بالتأكيد نعم", en: "Definitely yes" },
    ]),
    choice(
      "improve",
      "What most needs improvement?",
      "ما أكثر ما يحتاج إلى تحسين؟",
      [
        { id: "usability", ar: "سهولة استخدام المنصة", en: "Platform usability" },
        { id: "playback", ar: "تشغيل الفيديو", en: "Video playback" },
        { id: "recording", ar: "جودة التسجيل", en: "Recording quality" },
        { id: "explanations", ar: "الشرح", en: "Explanations" },
        { id: "pace_organisation", ar: "السرعة أو التنظيم", en: "Pace or organization" },
        { id: "exercises", ar: "التمارين العملية", en: "Practical exercises" },
        { id: "resources", ar: "المواد التعليمية", en: "Learning resources" },
        { id: "nothing", ar: "لا شيء محدّد", en: "Nothing specific" },
        { id: "other", ar: "أمر آخر", en: "Other" },
      ],
      true,
    ),
    choice(
      "practice_barrier",
      "What most limited your ability to practise?",
      "ما أكثر ما حدّ من قدرتك على التطبيق العملي؟",
      [
        { id: "nothing", ar: "لا شيء", en: "Nothing" },
        { id: "connectivity", ar: "الإنترنت أو الجهاز", en: "Internet or device limitations" },
        { id: "tool_cost", ar: "تكلفة الأدوات", en: "Tool cost" },
        {
          id: "tool_access",
          ar: "توفّر الأدوات أو الوصول إلى الحسابات",
          en: "Tool availability or account access",
        },
        { id: "instructions", ar: "تعليمات غير كافية", en: "Insufficient instructions" },
        { id: "time", ar: "وقت غير كافٍ للتدريب", en: "Insufficient practice time" },
        { id: "other", ar: "أمر آخر", en: "Other" },
      ],
      true,
    ),
    {
      kind: "text",
      id: "opinion",
      en: "What is your overall opinion of the course and platform?",
      ar: "ما رأيك العام في الدورة والمنصة؟",
      max: TEXT_MAX,
    },
    {
      kind: "text",
      id: "future",
      en: "What could we improve for future learners?",
      ar: "ما الذي يمكننا تحسينه للمتعلّمين القادمين؟",
      max: TEXT_MAX,
    },
  ],
};

export const TEMPLATES: Record<TemplateId, Template> = {
  standard: {
    id: "standard",
    version: "v1",
    steps: [PLATFORM, teaching(OUTCOMES_STANDARD), OVERALL],
  },
  "ai-architects": {
    id: "ai-architects",
    version: "v1",
    steps: [PLATFORM, teaching(OUTCOMES_AI_ARCHITECTS), OVERALL],
  },
};

/** The course's template; an unknown or empty value falls back to "standard". */
export function getTemplate(id: string | null | undefined): Template {
  return id && id in TEMPLATES ? TEMPLATES[id as TemplateId] : TEMPLATES.standard;
}

export const allQuestions = (t: Template) => t.steps.flatMap((s) => s.questions);

export type FeedbackInput = {
  answers: Record<string, string>;
  notes: Record<string, string>;
};

export type FeedbackIssue = {
  question: string;
  problem: "missing" | "invalid" | "too_long" | "unknown";
};

/** Questions in `step` still missing an answer (text questions are optional). */
export function missingInStep(step: Step, answers: Record<string, string>): string[] {
  return step.questions.filter((q) => q.kind === "choice" && !answers[q.id]).map((q) => q.id);
}

/** Checks a response against its template and returns a cleaned copy:
    trimmed text, empty notes dropped, "other" text kept only with "other".
    A draft may leave choices unanswered; a submission may not. */
export function checkFeedback(
  template: Template,
  input: FeedbackInput,
  mode: "draft" | "submit",
): { ok: boolean; issues: FeedbackIssue[]; clean: FeedbackInput } {
  const issues: FeedbackIssue[] = [];
  const clean: FeedbackInput = { answers: {}, notes: {} };
  const questions = allQuestions(template);
  const choiceById = new Map(
    questions.filter((q): q is ChoiceQuestion => q.kind === "choice").map((q) => [q.id, q]),
  );
  const textMax = new Map<string, number>();
  for (const q of questions) {
    if (q.kind === "text") textMax.set(q.id, q.max);
    else if (q.otherText) textMax.set(otherKey(q.id), OTHER_TEXT_MAX);
  }

  for (const [id, value] of Object.entries(input.answers ?? {})) {
    const q = choiceById.get(id);
    if (!q) issues.push({ question: id, problem: "unknown" });
    else if (typeof value !== "string" || !q.choices.some((c) => c.id === value))
      issues.push({ question: id, problem: "invalid" });
    else clean.answers[id] = value;
  }
  if (mode === "submit") {
    for (const id of choiceById.keys()) {
      if (!clean.answers[id] && !issues.some((i) => i.question === id))
        issues.push({ question: id, problem: "missing" });
    }
  }

  for (const [key, value] of Object.entries(input.notes ?? {})) {
    const max = textMax.get(key);
    if (max === undefined) {
      issues.push({ question: key, problem: "unknown" });
      continue;
    }
    if (typeof value !== "string") {
      issues.push({ question: key, problem: "invalid" });
      continue;
    }
    const text = value.trim();
    if ([...text].length > max) {
      issues.push({ question: key, problem: "too_long" });
      continue;
    }
    const owner = key.endsWith("_other") ? key.slice(0, -"_other".length) : null;
    if (owner && clean.answers[owner] !== "other") continue;
    if (text) clean.notes[key] = text;
  }

  return { ok: issues.length === 0, issues, clean };
}
