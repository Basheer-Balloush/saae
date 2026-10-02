import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearQuizDraft,
  loadQuizDraft,
  pickDraft,
  QuizDraftSync,
  quizDraftKey,
  readServerDraft,
  saveQuizDraft,
  type DraftSaveStatus,
  type QuizDraftAnswers,
} from "../../src/lib/quiz-draft";

const questions = [
  { question_key: "q1", choices: ["A", "B", "C"] },
  { question_key: "q2", choices: ["A", "B"] },
];

beforeEach(() => {
  const store = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  });
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("quiz answers kept on the device", () => {
  const key = quizDraftKey("student", "quiz", 2);

  it("restores saved answers, including the first option (zero)", () => {
    saveQuizDraft(key, { q1: 0, q2: 1 }, 0);
    expect(loadQuizDraft(key, questions, 0)?.answers).toEqual({ q1: 0, q2: 1 });
  });

  it("keeps drafts apart per student, quiz and version", () => {
    saveQuizDraft(key, { q1: 2 }, 0);
    expect(loadQuizDraft(quizDraftKey("other", "quiz", 2), questions, 0)).toBeNull();
    expect(loadQuizDraft(quizDraftKey("student", "quiz", 3), questions, 0)).toBeNull();
  });

  it("never carries answers into the next attempt", () => {
    saveQuizDraft(key, { q1: 2 }, 0);
    expect(loadQuizDraft(key, questions, 1)).toBeNull();
    expect(loadQuizDraft(key, questions, 0)).toBeNull();
  });

  it("drops answers that no longer fit the questions", () => {
    saveQuizDraft(key, { q1: 5, q2: 1, removed: 0 }, 0);
    expect(loadQuizDraft(key, questions, 0)?.answers).toEqual({ q2: 1 });
  });

  it("clears after submit and ignores drafts older than a month", () => {
    saveQuizDraft(key, { q1: 1 }, 0);
    clearQuizDraft(key);
    expect(loadQuizDraft(key, questions, 0)).toBeNull();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-01T00:00:00Z"));
    saveQuizDraft(key, { q1: 1 }, 0);
    vi.setSystemTime(new Date("2026-10-02T00:00:00Z"));
    expect(loadQuizDraft(key, questions, 0)).toBeNull();
  });

  it("still works when storage is unavailable or corrupt", () => {
    localStorage.setItem(key, "not json");
    expect(loadQuizDraft(key, questions, 0)).toBeNull();
    vi.stubGlobal("localStorage", undefined);
    expect(() => saveQuizDraft(key, { q1: 1 }, 0)).not.toThrow();
    expect(loadQuizDraft(key, questions, 0)).toBeNull();
  });
});

describe("quiz answers kept on the server", () => {
  const server = (over: Record<string, unknown> = {}) => ({
    quiz_version: 2,
    attempts_used: 0,
    answers: { q1: 1, q2: 0 },
    updated_at: "2026-10-02T10:00:00Z",
    ...over,
  });

  it("reads the server copy for this version and attempt", () => {
    expect(readServerDraft(server(), questions, 2, 0)).toEqual({
      answers: { q1: 1, q2: 0 },
      savedAt: Date.parse("2026-10-02T10:00:00Z"),
    });
  });

  it("ignores a copy for another version, another attempt, or nothing at all", () => {
    expect(readServerDraft(server({ quiz_version: 1 }), questions, 2, 0)).toBeNull();
    expect(readServerDraft(server({ attempts_used: 1 }), questions, 2, 0)).toBeNull();
    expect(readServerDraft(null, questions, 2, 0)).toBeNull();
    expect(readServerDraft(server({ answers: { q1: 9 } }), questions, 2, 0)).toBeNull();
  });

  it("restores the fuller copy, and the newer one between equals", () => {
    const device = { answers: { q1: 1 }, savedAt: 200 };
    const cloud = { answers: { q1: 0, q2: 1 }, savedAt: 100 };
    expect(pickDraft(device, cloud)).toBe(cloud);
    expect(pickDraft({ answers: { q1: 2 }, savedAt: 300 }, device)).toEqual({
      answers: { q1: 2 },
      savedAt: 300,
    });
    expect(pickDraft(null, cloud)).toBe(cloud);
    expect(pickDraft(device, null)).toBe(device);
    expect(pickDraft(null, null)).toBeNull();
  });
});

describe("sending answers to the server", () => {
  function setup(
    send: (answers: QuizDraftAnswers) => Promise<void>,
    isFinal?: (e: unknown) => boolean,
  ) {
    vi.useFakeTimers();
    const statuses: DraftSaveStatus[] = [];
    const sync = new QuizDraftSync({
      send,
      isFinal,
      onStatus: (s) => statuses.push(s),
      delayMs: 800,
      retryMs: 5000,
    });
    return { sync, statuses };
  }

  it("waits for a pause, then sends only the latest answers", async () => {
    const sent: QuizDraftAnswers[] = [];
    const { sync, statuses } = setup(async (a) => void sent.push(a));
    sync.save({ q1: 0 });
    sync.save({ q1: 0, q2: 1 });
    await vi.advanceTimersByTimeAsync(800);
    expect(sent).toEqual([{ q1: 0, q2: 1 }]);
    expect(statuses.at(-1)).toBe("saved");
  });

  it("keeps retrying after failures until a save gets through", async () => {
    let calls = 0;
    const sent: QuizDraftAnswers[] = [];
    const { sync, statuses } = setup(async (a) => {
      calls += 1;
      if (calls < 3) throw new Error("Failed to fetch");
      sent.push(a);
    });
    sync.save({ q1: 1 });
    await vi.advanceTimersByTimeAsync(800);
    expect(statuses.at(-1)).toBe("retrying");
    await vi.advanceTimersByTimeAsync(5000);
    expect(statuses.at(-1)).toBe("retrying");
    await vi.advanceTimersByTimeAsync(5000);
    expect(sent).toEqual([{ q1: 1 }]);
    expect(statuses.at(-1)).toBe("saved");
  });

  it("sends one request at a time, and newer answers right after", async () => {
    const sent: QuizDraftAnswers[] = [];
    let release!: () => void;
    const { sync } = setup(
      (a) =>
        new Promise<void>((resolve) => {
          sent.push(a);
          release = resolve;
        }),
    );
    sync.save({ q1: 0 });
    await vi.advanceTimersByTimeAsync(800);
    sync.save({ q1: 2 });
    await vi.advanceTimersByTimeAsync(800);
    expect(sent).toEqual([{ q1: 0 }]);
    release();
    await vi.advanceTimersByTimeAsync(0);
    expect(sent).toEqual([{ q1: 0 }, { q1: 2 }]);
  });

  it("a retry never overwrites answers picked meanwhile", async () => {
    const sent: QuizDraftAnswers[] = [];
    let fail = true;
    const { sync } = setup(async (a) => {
      if (fail) {
        fail = false;
        sync.save({ q1: 2 });
        throw new Error("offline");
      }
      sent.push(a);
    });
    sync.save({ q1: 1 });
    await vi.advanceTimersByTimeAsync(800 + 5000);
    expect(sent).toEqual([{ q1: 2 }]);
  });

  it("flushes at once, stops cleanly, and gives up on final errors", async () => {
    const sent: QuizDraftAnswers[] = [];
    const { sync } = setup(async (a) => void sent.push(a));
    sync.save({ q1: 1 });
    sync.flush();
    await vi.advanceTimersByTimeAsync(0);
    expect(sent).toEqual([{ q1: 1 }]);

    sync.save({ q1: 2 });
    await sync.stop();
    await vi.advanceTimersByTimeAsync(10_000);
    expect(sent).toEqual([{ q1: 1 }]);
    sync.resume({ q1: 2 });
    await vi.advanceTimersByTimeAsync(800);
    expect(sent).toEqual([{ q1: 1 }, { q1: 2 }]);

    let calls = 0;
    const final = setup(
      async () => {
        calls += 1;
        throw new Error("already_submitted");
      },
      (e) => e instanceof Error && e.message === "already_submitted",
    );
    final.sync.save({ q1: 0 });
    await vi.advanceTimersByTimeAsync(60_000);
    expect(calls).toBe(1);
  });
});
