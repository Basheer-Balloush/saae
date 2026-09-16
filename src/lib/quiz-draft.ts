/* In-progress quiz answers are kept on the student's device until the attempt
   is submitted, so a reload, a reopened tab or a dropped connection never loses
   them. One draft per student, quiz and quiz version: a quiz edited after the
   draft was saved starts clean rather than restoring answers to other questions. */

export type QuizDraftAnswers = Record<string, number>;
type DraftQuestion = { question_key: string; choices: unknown };

const PREFIX = "saae-quiz-draft";
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export const quizDraftKey = (userId: string, quizId: string, version: number) =>
  `${PREFIX}:${userId}:${quizId}:v${version}`;

/** Saved answers that still fit the current questions; anything stale is dropped. */
export function loadQuizDraft(key: string, questions: DraftQuestion[]): QuizDraftAnswers {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as { savedAt?: unknown; answers?: unknown };
    if (
      typeof parsed.savedAt !== "number" ||
      Date.now() - parsed.savedAt > MAX_AGE_MS ||
      !parsed.answers ||
      typeof parsed.answers !== "object"
    ) {
      localStorage.removeItem(key);
      return {};
    }
    const saved = parsed.answers as Record<string, unknown>;
    const restored: QuizDraftAnswers = {};
    for (const question of questions) {
      const value = saved[question.question_key];
      if (
        Number.isInteger(value) &&
        Array.isArray(question.choices) &&
        (value as number) >= 0 &&
        (value as number) < question.choices.length
      ) {
        restored[question.question_key] = value as number;
      }
    }
    return restored;
  } catch {
    // Storage can be unavailable (private mode, server render); the quiz still works.
    return {};
  }
}

export function saveQuizDraft(key: string, answers: QuizDraftAnswers): void {
  try {
    if (Object.keys(answers).length) {
      localStorage.setItem(key, JSON.stringify({ savedAt: Date.now(), answers }));
    } else {
      localStorage.removeItem(key);
    }
  } catch {
    /* storage full or unavailable: answers stay in memory as before */
  }
}

export function clearQuizDraft(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    /* nothing to clear */
  }
}
