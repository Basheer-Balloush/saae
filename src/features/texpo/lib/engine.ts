import {
  ANSWER_GRACE_MS,
  HINT_BONUS_SECONDS,
  LEVELS,
  QUESTION_SECONDS,
  levelFor,
  type PlayResult,
  type ServedQuestion,
} from "./texpo-shared";
import type { BankQuestion } from "./questions.server";

/* The rules of one play, as pure functions over the stored play. The bank is
   passed in, so this file never carries the answers itself. */

export type StoredAnswer = {
  q: number;
  /** Position the player tapped, or null when the time ran out. */
  shown: number | null;
  /** The option behind that position in the bank's order. */
  choice: number | null;
  correct: boolean;
  ms: number;
  hint: boolean;
};

export function limitMs(q: number, hintQ: number | null): number {
  return (QUESTION_SECONDS + (hintQ === q ? HINT_BONUS_SECONDS : 0)) * 1000;
}

export function serveQuestion(
  bank: BankQuestion[],
  q: number,
  orders: number[][],
  shownAt: number,
  now: number,
  hintQ: number | null,
): ServedQuestion {
  const item = bank[q];
  const order = orders[q];
  const limit = limitMs(q, hintQ);
  return {
    index: q,
    total: bank.length,
    difficulty: item.difficulty,
    text: item.text,
    options: {
      ar: order.map((i) => item.options.ar[i]),
      en: order.map((i) => item.options.en[i]),
    },
    limitMs: limit,
    remainingMs: Math.max(0, Math.min(limit, limit - (now - shownAt))),
    hintUsed: hintQ !== null,
    hint: hintQ === q ? item.hint : null,
  };
}

export function gradeAnswer(
  bank: BankQuestion[],
  q: number,
  orders: number[][],
  shown: number | null,
  shownAt: number,
  now: number,
  hintQ: number | null,
): StoredAnswer & { timedOut: boolean; correctShown: number } {
  const order = orders[q];
  const elapsed = Math.max(0, now - shownAt);
  const timedOut = shown === null || elapsed > limitMs(q, hintQ) + ANSWER_GRACE_MS;
  const choice = shown === null ? null : (order[shown] ?? null);
  const correct = !timedOut && choice === bank[q].answer;
  return {
    q,
    shown,
    choice,
    correct,
    ms: elapsed,
    hint: hintQ === q,
    timedOut,
    correctShown: order.indexOf(bank[q].answer),
  };
}

export function buildResult(bank: BankQuestion[], answers: StoredAnswer[]): PlayResult {
  const score = answers.filter((a) => a.correct).length;
  const level = levelFor(score);
  return {
    score,
    total: bank.length,
    level,
    percent: LEVELS[level].percent,
    review: bank.map((item, index) => {
      const a = answers.find((x) => x.q === index);
      return {
        index,
        text: item.text,
        chosen:
          a && a.choice !== null
            ? { ar: item.options.ar[a.choice], en: item.options.en[a.choice] }
            : null,
        correct: { ar: item.options.ar[item.answer], en: item.options.en[item.answer] },
        ok: !!a?.correct,
        explanation: item.explanation,
      };
    }),
  };
}

/** Whether a stored order list is usable for this bank (guards hand-edited rows). */
export function validOrders(orders: unknown, bank: BankQuestion[]): orders is number[][] {
  return (
    Array.isArray(orders) &&
    orders.length === bank.length &&
    orders.every(
      (o, q) =>
        Array.isArray(o) &&
        o.length === bank[q].options.en.length &&
        [...o].sort((a, b) => a - b).every((v, i) => v === i),
    )
  );
}
