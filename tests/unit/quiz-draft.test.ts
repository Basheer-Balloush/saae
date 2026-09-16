import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearQuizDraft, loadQuizDraft, quizDraftKey, saveQuizDraft } from "../../src/lib/quiz-draft";

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

describe("quiz answer drafts", () => {
  const key = quizDraftKey("student", "quiz", 2);

  it("restores saved answers, including the first option (zero)", () => {
    saveQuizDraft(key, { q1: 0, q2: 1 });
    expect(loadQuizDraft(key, questions)).toEqual({ q1: 0, q2: 1 });
  });

  it("keeps drafts apart per student, quiz and version", () => {
    saveQuizDraft(key, { q1: 2 });
    expect(loadQuizDraft(quizDraftKey("other", "quiz", 2), questions)).toEqual({});
    expect(loadQuizDraft(quizDraftKey("student", "quiz", 3), questions)).toEqual({});
  });

  it("drops answers that no longer fit the questions", () => {
    saveQuizDraft(key, { q1: 5, q2: 1, removed: 0 });
    expect(loadQuizDraft(key, questions)).toEqual({ q2: 1 });
  });

  it("clears after submit and ignores drafts older than a week", () => {
    saveQuizDraft(key, { q1: 1 });
    clearQuizDraft(key);
    expect(loadQuizDraft(key, questions)).toEqual({});
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-01T00:00:00Z"));
    saveQuizDraft(key, { q1: 1 });
    vi.setSystemTime(new Date("2026-09-09T00:00:01Z"));
    expect(loadQuizDraft(key, questions)).toEqual({});
  });

  it("still works when storage is unavailable or corrupt", () => {
    localStorage.setItem(key, "not json");
    expect(loadQuizDraft(key, questions)).toEqual({});
    vi.stubGlobal("localStorage", undefined);
    expect(() => saveQuizDraft(key, { q1: 1 })).not.toThrow();
    expect(loadQuizDraft(key, questions)).toEqual({});
  });
});
