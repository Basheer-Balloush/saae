/* Course feedback: the form an online course asks once a learner has
   finished its lessons and passed its quiz (when it has one). The last step
   before the certificate. The public website survey is separate
   (feedback-survey.ts).

   Forms live in the database (lms_feedback_forms / lms_feedback_form_versions)
   and admins edit them: one default form, and optionally a course's own. This
   file holds their shape, the rules a form must follow, the default questions
   (seeded into the database the first time they are needed) and the checks
   on a learner's answers, shared by the form, the editor and the server.

   Answers are stored by question and choice id, never by label. Every save
   of a form is a new version, and each response keeps the version it
   answered, so editing a form never changes answers already sent. */

import { z } from "zod";

export type Lang = "ar" | "en";
export type Text = { ar: string; en: string };
export type Choice = Text & { id: string };

export type ChoiceQuestion = Text & {
  kind: "choice";
  id: string;
  required: boolean;
  choices: Choice[];
  /** The last choice is "other" (id OTHER_ID) and opens an optional text box. */
  otherText?: boolean;
};
export type TextQuestion = Text & { kind: "text"; id: string; required: boolean; max: number };
export type Question = ChoiceQuestion | TextQuestion;
export type Step = { id: string; title: Text; questions: Question[] };
export type FormDefinition = { steps: Step[] };

export const TEXT_MAX = 2000;
export const OTHER_TEXT_MAX = 200;
export const OTHER_ID = "other";
export const LIMITS = {
  steps: 8,
  questions: 60,
  choices: 12,
  label: 300,
  stepTitle: 80,
} as const;

/** Notes key for a choice question's "other" text. */
export const otherKey = (questionId: string) => `${questionId}_other`;

/* ---------- the default form ---------- */

/** Five choices whose ids are "1" (lowest) to "5" (highest). */
const scale = (labels: [Text, Text, Text, Text, Text]): Choice[] =>
  labels.map((label, i) => ({ id: String(i + 1), ...label }));

const choice = (
  id: string,
  en: string,
  ar: string,
  choices: Choice[],
  otherText = false,
): ChoiceQuestion => ({
  kind: "choice",
  id,
  en,
  ar,
  required: true,
  choices,
  ...(otherText ? { otherText } : {}),
});

const written = (id: string, en: string, ar: string): TextQuestion => ({
  kind: "text",
  id,
  en,
  ar,
  required: false,
  max: TEXT_MAX,
});

/** The questions every online course starts with: short on purpose, each
    covering one area. Once saved in the database, the database copy is the
    one that counts, and admins can add to it. */
export const DEFAULT_FORM: FormDefinition = {
  steps: [
    {
      id: "course",
      title: { ar: "الدورة والمنصة", en: "The course and platform" },
      questions: [
        choice(
          "platform",
          "How easy was it to use the platform and move between lessons on your device?",
          "ما مدى سهولة استخدام المنصة والتنقّل بين الدروس على جهازك؟",
          scale([
            { ar: "صعب جداً", en: "Very difficult" },
            { ar: "صعب", en: "Difficult" },
            { ar: "مقبول", en: "Acceptable" },
            { ar: "سهل", en: "Easy" },
            { ar: "سهل جداً", en: "Very easy" },
          ]),
        ),
        choice(
          "video",
          "How good was the video: playback, sound, and clarity of the screen and slides?",
          "كيف تقيّم جودة الفيديو من حيث التشغيل والصوت ووضوح الشاشة والشرائح؟",
          scale([
            { ar: "ضعيفة جداً", en: "Very poor" },
            { ar: "ضعيفة", en: "Poor" },
            { ar: "مقبولة", en: "Fair" },
            { ar: "جيدة", en: "Good" },
            { ar: "ممتازة", en: "Excellent" },
          ]),
        ),
        choice(
          "teaching",
          "How would you rate the instructor’s explanations and the organization of the lessons?",
          "كيف تقيّم شرح المدرّب وتنظيم الدروس؟",
          scale([
            { ar: "ضعيف جداً", en: "Very poor" },
            { ar: "ضعيف", en: "Poor" },
            { ar: "مقبول", en: "Fair" },
            { ar: "جيد", en: "Good" },
            { ar: "ممتاز", en: "Excellent" },
          ]),
        ),
        choice(
          "examples",
          "How useful were the practical examples and exercises?",
          "ما مدى فائدة الأمثلة والتمارين العملية؟",
          [
            ...scale([
              { ar: "غير مفيدة", en: "Not useful" },
              { ar: "مفيدة قليلاً", en: "Slightly useful" },
              { ar: "مفيدة إلى حدّ ما", en: "Moderately useful" },
              { ar: "مفيدة جداً", en: "Very useful" },
              { ar: "مفيدة للغاية", en: "Extremely useful" },
            ]),
            {
              id: "na",
              ar: "لم تتضمّن الدورة أمثلة أو تمارين عملية",
              en: "The course had no practical examples or exercises",
            },
          ],
        ),
        choice("pace", "How was the teaching pace?", "كيف كانت سرعة الشرح؟", [
          { id: "much_slow", ar: "بطيئة جداً", en: "Much too slow" },
          { id: "slow", ar: "بطيئة قليلاً", en: "Slightly slow" },
          { id: "right", ar: "مناسبة", en: "About right" },
          { id: "fast", ar: "سريعة قليلاً", en: "Slightly fast" },
          { id: "much_fast", ar: "سريعة جداً", en: "Much too fast" },
        ]),
        choice(
          "readiness",
          "How ready do you feel to apply what you learned?",
          "ما مدى استعدادك لتطبيق ما تعلّمته؟",
          scale([
            { ar: "غير مستعد", en: "Not ready" },
            { ar: "مستعد قليلاً", en: "Slightly ready" },
            { ar: "مستعد إلى حدّ ما", en: "Somewhat ready" },
            { ar: "مستعد", en: "Ready" },
            { ar: "مستعد تماماً", en: "Fully ready" },
          ]),
        ),
      ],
    },
    {
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
            { id: "video", ar: "جودة الفيديو والصوت", en: "Video and sound quality" },
            { id: "explanations", ar: "الشرح", en: "Explanations" },
            { id: "pace_organisation", ar: "السرعة أو التنظيم", en: "Pace or organization" },
            {
              id: "exercises",
              ar: "التمارين والأمثلة العملية",
              en: "Exercises and practical examples",
            },
            { id: "resources", ar: "المواد التعليمية", en: "Learning resources" },
            {
              id: "tools",
              ar: "الأدوات أو الوصول إليها",
              en: "Tools, or access to them",
            },
            { id: "nothing", ar: "لا شيء محدّد", en: "Nothing specific" },
            { id: OTHER_ID, ar: "أمر آخر", en: "Other" },
          ],
          true,
        ),
        written(
          "comments",
          "Any other comments or suggestions?",
          "هل لديك ملاحظات أو اقتراحات أخرى؟",
        ),
      ],
    },
  ],
};

export const OTHER_CHOICE: Choice = { id: OTHER_ID, ar: "أمر آخر", en: "Other" };

export const allQuestions = (f: FormDefinition) => f.steps.flatMap((s) => s.questions);

/* ---------- the rules a form must follow ---------- */

const ID = /^[a-z0-9_]{1,40}$/;
const label = (max: number) => z.string().max(max);
const bilingual = (max: number) => z.object({ ar: label(max), en: label(max) });

/** The shape of a form sent by the editor. Empty labels and duplicates are
    left to formProblems(), which can say which question is wrong. */
export const formDefinitionSchema = z.object({
  steps: z
    .array(
      z.object({
        id: z.string().regex(ID),
        title: bilingual(LIMITS.stepTitle),
        questions: z
          .array(
            z.discriminatedUnion("kind", [
              z.object({
                kind: z.literal("choice"),
                id: z.string().regex(ID),
                ar: label(LIMITS.label),
                en: label(LIMITS.label),
                required: z.boolean(),
                choices: z
                  .array(
                    z.object({
                      id: z.string().regex(ID),
                      ar: label(LIMITS.label),
                      en: label(LIMITS.label),
                    }),
                  )
                  .max(LIMITS.choices),
                otherText: z.boolean().optional(),
              }),
              z.object({
                kind: z.literal("text"),
                id: z.string().regex(ID),
                ar: label(LIMITS.label),
                en: label(LIMITS.label),
                required: z.boolean(),
                max: z.number().int().min(1).max(TEXT_MAX),
              }),
            ]),
          )
          .max(LIMITS.questions),
      }),
    )
    .max(LIMITS.steps),
}) satisfies z.ZodType<FormDefinition>;

export type FormProblem = {
  code:
    | "no_steps"
    | "too_many_steps"
    | "step_title"
    | "empty_step"
    | "no_questions"
    | "too_many_questions"
    | "question_text"
    | "duplicate_question"
    | "reserved_question_id"
    | "too_few_choices"
    | "too_many_choices"
    | "choice_text"
    | "duplicate_choice"
    | "other_last";
  step: number;
  question?: number;
  choice?: number;
};

const blank = (t: Text) => !t.ar.trim() || !t.en.trim();

/** Everything that stops a form from being saved, in the order it appears.
    Indexes are zero-based. */
export function formProblems(form: FormDefinition): FormProblem[] {
  const problems: FormProblem[] = [];
  if (form.steps.length === 0) problems.push({ code: "no_steps", step: 0 });
  if (form.steps.length > LIMITS.steps) problems.push({ code: "too_many_steps", step: 0 });
  const total = allQuestions(form).length;
  if (form.steps.length && total === 0) problems.push({ code: "no_questions", step: 0 });
  if (total > LIMITS.questions) problems.push({ code: "too_many_questions", step: 0 });

  const seen = new Set<string>();
  form.steps.forEach((s, step) => {
    if (blank(s.title)) problems.push({ code: "step_title", step });
    if (s.questions.length === 0) problems.push({ code: "empty_step", step });
    s.questions.forEach((q, question) => {
      const at = { step, question };
      if (blank(q)) problems.push({ code: "question_text", ...at });
      if (seen.has(q.id)) problems.push({ code: "duplicate_question", ...at });
      seen.add(q.id);
      if (q.id.endsWith("_other")) problems.push({ code: "reserved_question_id", ...at });
      if (q.kind !== "choice") return;
      if (q.choices.length < 2) problems.push({ code: "too_few_choices", ...at });
      if (q.choices.length > LIMITS.choices) problems.push({ code: "too_many_choices", ...at });
      const ids = new Set<string>();
      q.choices.forEach((c, choice) => {
        if (blank(c)) problems.push({ code: "choice_text", ...at, choice });
        if (ids.has(c.id)) problems.push({ code: "duplicate_choice", ...at, choice });
        ids.add(c.id);
      });
      const otherAt = q.choices.findIndex((c) => c.id === OTHER_ID);
      if (q.otherText && otherAt !== q.choices.length - 1)
        problems.push({ code: "other_last", ...at });
    });
  });
  return problems;
}

/** A fresh id for a question or choice the editor adds, unused in `taken`. */
export function newId(prefix: string, taken: Iterable<string>): string {
  const used = new Set(taken);
  for (;;) {
    const id = `${prefix}_${Math.random().toString(36).slice(2, 8)}`;
    if (!used.has(id)) return id;
  }
}

/* ---------- a learner's answers ---------- */

export type FeedbackInput = {
  answers: Record<string, string>;
  notes: Record<string, string>;
};

export type FeedbackIssue = {
  question: string;
  problem: "missing" | "invalid" | "too_long" | "unknown";
};

const noteLimits = (form: FormDefinition) => {
  const max = new Map<string, number>();
  for (const q of allQuestions(form)) {
    if (q.kind === "text") max.set(q.id, q.max);
    else if (q.otherText) max.set(otherKey(q.id), OTHER_TEXT_MAX);
  }
  return max;
};

/** Required questions in `step` still missing an answer. */
export function missingInStep(
  step: Step,
  answers: Record<string, string>,
  notes: Record<string, string>,
): string[] {
  return step.questions
    .filter((q) => q.required && (q.kind === "choice" ? !answers[q.id] : !notes[q.id]?.trim()))
    .map((q) => q.id);
}

/** Checks a response against its form and returns a cleaned copy: trimmed
    text, empty notes dropped, "other" text kept only with "other". A draft
    may leave questions unanswered; a submission must answer the required ones. */
export function checkFeedback(
  form: FormDefinition,
  input: FeedbackInput,
  mode: "draft" | "submit",
): { ok: boolean; issues: FeedbackIssue[]; clean: FeedbackInput } {
  const issues: FeedbackIssue[] = [];
  const clean: FeedbackInput = { answers: {}, notes: {} };
  const questions = allQuestions(form);
  const choiceById = new Map(
    questions.filter((q): q is ChoiceQuestion => q.kind === "choice").map((q) => [q.id, q]),
  );
  const textMax = noteLimits(form);

  for (const [id, value] of Object.entries(input.answers ?? {})) {
    const q = choiceById.get(id);
    if (!q) issues.push({ question: id, problem: "unknown" });
    else if (typeof value !== "string" || !q.choices.some((c) => c.id === value))
      issues.push({ question: id, problem: "invalid" });
    else clean.answers[id] = value;
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
    if (owner && choiceById.has(owner) && clean.answers[owner] !== OTHER_ID) continue;
    if (text) clean.notes[key] = text;
  }

  if (mode === "submit") {
    for (const q of questions) {
      if (!q.required || issues.some((i) => i.question === q.id)) continue;
      const answered = q.kind === "choice" ? !!clean.answers[q.id] : !!clean.notes[q.id];
      if (!answered) issues.push({ question: q.id, problem: "missing" });
    }
  }

  return { ok: issues.length === 0, issues, clean };
}

/** A saved draft checked against the form as it is now: answers to
    questions that were removed or changed are dropped, the rest kept. Used
    when an admin edits the form while a learner is part-way through it. */
export function keepValidAnswers(form: FormDefinition, input: FeedbackInput): FeedbackInput {
  const kept = checkFeedback(form, input, "draft").clean;
  const max = noteLimits(form);
  // checkFeedback drops an oversized note with an issue; keep it cut to size.
  for (const [key, value] of Object.entries(input.notes ?? {})) {
    const limit = max.get(key);
    if (limit === undefined || kept.notes[key] || typeof value !== "string") continue;
    const owner = key.endsWith("_other") ? key.slice(0, -"_other".length) : null;
    if (owner && kept.answers[owner] !== OTHER_ID) continue;
    const text = [...value.trim()].slice(0, limit).join("");
    if (text) kept.notes[key] = text;
  }
  return kept;
}
