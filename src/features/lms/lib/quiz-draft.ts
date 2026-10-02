/* Answers a student picks during a quiz are kept until the attempt is submitted,
   twice over: on the device at once (survives a reload, a crash or a dropped
   connection) and on the server shortly after (survives cleared browser data,
   private browsing and a change of device). When the quiz opens, the fuller of
   the two copies comes back.

   A draft belongs to one student, quiz, quiz version and attempt: a quiz edited
   since, or an attempt already submitted, starts clean rather than restoring
   answers to the wrong questions or into a retake. */

export type QuizDraftAnswers = Record<string, number>;
type DraftQuestion = { question_key: string; choices: unknown };
export type QuizDraft = { answers: QuizDraftAnswers; savedAt: number };

const PREFIX = "saae-quiz-draft";
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

export const quizDraftKey = (userId: string, quizId: string, version: number) =>
  `${PREFIX}:${userId}:${quizId}:v${version}`;

/** Keeps only answers that still fit the current questions. */
export function fitAnswers(saved: unknown, questions: DraftQuestion[]): QuizDraftAnswers {
  const fitted: QuizDraftAnswers = {};
  if (!saved || typeof saved !== "object" || Array.isArray(saved)) return fitted;
  const values = saved as Record<string, unknown>;
  for (const question of questions) {
    const value = values[question.question_key];
    if (
      Number.isInteger(value) &&
      Array.isArray(question.choices) &&
      (value as number) >= 0 &&
      (value as number) < question.choices.length
    ) {
      fitted[question.question_key] = value as number;
    }
  }
  return fitted;
}

/** The device copy for this attempt, or null when there is none worth restoring. */
export function loadQuizDraft(
  key: string,
  questions: DraftQuestion[],
  attemptsUsed: number,
): QuizDraft | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as {
      savedAt?: unknown;
      attemptsUsed?: unknown;
      answers?: unknown;
    };
    if (
      typeof parsed.savedAt !== "number" ||
      Date.now() - parsed.savedAt > MAX_AGE_MS ||
      // Drafts saved before attempts were recorded with them still belong to
      // the attempt in progress; a different count means it was submitted.
      (parsed.attemptsUsed !== undefined && parsed.attemptsUsed !== attemptsUsed)
    ) {
      localStorage.removeItem(key);
      return null;
    }
    const answers = fitAnswers(parsed.answers, questions);
    return Object.keys(answers).length ? { answers, savedAt: parsed.savedAt } : null;
  } catch {
    // Storage can be unavailable (private mode, server render); the server copy remains.
    return null;
  }
}

export function saveQuizDraft(key: string, answers: QuizDraftAnswers, attemptsUsed: number): void {
  try {
    if (Object.keys(answers).length) {
      localStorage.setItem(key, JSON.stringify({ savedAt: Date.now(), attemptsUsed, answers }));
    } else {
      localStorage.removeItem(key);
    }
  } catch {
    /* storage full or unavailable: the server copy still saves */
  }
}

export function clearQuizDraft(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    /* nothing to clear */
  }
}

/** The server copy (lms_get_quiz_draft), if it belongs to this version and attempt. */
export function readServerDraft(
  data: unknown,
  questions: DraftQuestion[],
  version: number,
  attemptsUsed: number,
): QuizDraft | null {
  if (!data || typeof data !== "object") return null;
  const draft = data as {
    quiz_version?: unknown;
    attempts_used?: unknown;
    answers?: unknown;
    updated_at?: unknown;
  };
  if (draft.quiz_version !== version || draft.attempts_used !== attemptsUsed) return null;
  const savedAt = typeof draft.updated_at === "string" ? Date.parse(draft.updated_at) : NaN;
  const answers = fitAnswers(draft.answers, questions);
  return Object.keys(answers).length
    ? { answers, savedAt: Number.isNaN(savedAt) ? 0 : savedAt }
    : null;
}

/** Answers are only added or changed, never removed, so the copy with more of
    them is the later one; between equals the newer save wins. */
export function pickDraft(a: QuizDraft | null, b: QuizDraft | null): QuizDraft | null {
  if (!a || !b) return a ?? b;
  const countA = Object.keys(a.answers).length;
  const countB = Object.keys(b.answers).length;
  if (countA !== countB) return countA > countB ? a : b;
  return a.savedAt >= b.savedAt ? a : b;
}

/** idle: nothing to save yet · saving · saved: on the server · retrying: on the
    device, the server save keeps being retried · device: on the device only (the
    server refused for good, e.g. before its migration is applied). */
export type DraftSaveStatus = "idle" | "saving" | "saved" | "retrying" | "device";

type SyncOptions = {
  /** Stores the whole answer set on the server; throws when it could not. */
  send: (answers: QuizDraftAnswers) => Promise<void>;
  onStatus?: (status: DraftSaveStatus) => void;
  /** Errors that retrying cannot fix (the attempt was submitted, the quiz changed). */
  isFinal?: (error: unknown) => boolean;
  delayMs?: number;
  retryMs?: number;
};

/**
 * Sends the latest answers to the server: shortly after each change, one request
 * at a time (so an older set never lands after a newer one), and again and again
 * after a failure until it succeeds or the page stops it.
 */
export class QuizDraftSync {
  private pending: QuizDraftAnswers | null = null;
  private inFlight: Promise<void> | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private stopped = false;
  private readonly delayMs: number;
  private readonly retryMs: number;

  constructor(private readonly options: SyncOptions) {
    this.delayMs = options.delayMs ?? 800;
    this.retryMs = options.retryMs ?? 5000;
  }

  /** Queues this answer set; it replaces any set not yet sent. */
  save(answers: QuizDraftAnswers): void {
    if (this.stopped) return;
    this.pending = answers;
    this.status("saving");
    this.schedule(this.delayMs);
  }

  /** Sends whatever is queued now (the tab is being hidden, the network is back). */
  flush(): void {
    if (this.stopped || !this.pending) return;
    this.schedule(0);
  }

  /** Stops sending and waits for a request already on its way. */
  async stop(): Promise<void> {
    this.stopped = true;
    this.clearTimer();
    await this.inFlight?.catch(() => undefined);
  }

  /** Starts again after stop(), e.g. when a submission failed. */
  resume(answers: QuizDraftAnswers): void {
    this.stopped = false;
    this.save(answers);
  }

  private status(status: DraftSaveStatus) {
    if (!this.stopped) this.options.onStatus?.(status);
  }

  private clearTimer() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }

  private schedule(ms: number) {
    this.clearTimer();
    this.timer = setTimeout(() => {
      this.timer = null;
      void this.run();
    }, ms);
  }

  private async run(): Promise<void> {
    // One request at a time; the one in flight picks up newer answers when done.
    if (this.stopped || this.inFlight || !this.pending) return;
    const answers = this.pending;
    this.pending = null;
    const request = this.options.send(answers);
    this.inFlight = request;
    try {
      await request;
      if (this.pending) this.schedule(0);
      else this.status("saved");
    } catch (error) {
      if (this.stopped) return;
      if (this.options.isFinal?.(error)) {
        this.status("device");
        this.pending = null;
        this.stopped = true;
        return;
      }
      // Keep these answers unless newer ones were picked meanwhile, and try again.
      this.pending = this.pending ?? answers;
      this.status("retrying");
      this.schedule(this.retryMs);
    } finally {
      this.inFlight = null;
    }
  }
}
