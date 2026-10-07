import {
  ANSWER_GRACE_MS,
  HINT_BONUS_SECONDS,
  LEVELS,
  QUESTION_SECONDS,
  levelFor,
  shuffledOrder,
  type PlayResult,
  type ServedQuestion,
} from "./texpo-shared";
import type { BankQuestion, Difficulty } from "./questions.server";

/* The rules of one play, as pure functions over the stored play. The bank and
   the play's own questions (its deck) are passed in, so this file never
   carries the answers itself. */

/** A play's questions by difficulty, in the order they are asked. */
export const DECK_SHAPE: readonly Difficulty[] = [
  "easy",
  "easy",
  "easy",
  "medium",
  "medium",
  "hard",
  "hard",
];

/** What a play keeps in `option_orders`: its questions, each with the order
    its options are shown in. */
export type StoredDeck = { id: string; o: number[] }[];

/** A play's questions: DECK_SHAPE drawn at random from the bank, never two on
    the same topic while the bank has another one left. */
export function drawDeck(
  bank: BankQuestion[],
  random?: (n: number) => Uint32Array,
): BankQuestion[] {
  const pools = new Map<Difficulty, BankQuestion[]>();
  for (const d of new Set(DECK_SHAPE)) {
    const pool = bank.filter((q) => q.difficulty === d);
    pools.set(
      d,
      shuffledOrder(pool.length, random).map((i) => pool[i]),
    );
  }
  const taken = new Set<string>();
  const topics = new Set<string>();
  return DECK_SHAPE.map((d) => {
    const pool = pools.get(d) ?? [];
    const pick =
      pool.find((q) => !taken.has(q.id) && !topics.has(q.topic)) ??
      pool.find((q) => !taken.has(q.id));
    if (!pick) throw new Error("bank_too_small");
    taken.add(pick.id);
    topics.add(pick.topic);
    return pick;
  });
}

export function storeDeck(deck: BankQuestion[], random?: (n: number) => Uint32Array): StoredDeck {
  return deck.map((q) => ({ id: q.id, o: shuffledOrder(q.options.en.length, random) }));
}

/** A play's questions and option orders read back from `option_orders`: a
    drawn deck, or the bare orders of a play started on the old fixed set.
    Null when the row fits neither (hand-edited, or a question since removed). */
export function deckFromStored(
  stored: unknown,
  bank: BankQuestion[],
  legacy: BankQuestion[],
): { deck: BankQuestion[]; orders: number[][] } | null {
  if (validOrders(stored, legacy)) return { deck: legacy, orders: stored };
  if (!Array.isArray(stored) || stored.length !== DECK_SHAPE.length) return null;
  const byId = new Map(bank.map((q) => [q.id, q]));
  const deck: BankQuestion[] = [];
  const orders: unknown[] = [];
  for (const entry of stored as { id?: unknown; o?: unknown }[]) {
    const item = typeof entry?.id === "string" ? byId.get(entry.id) : undefined;
    if (!item || deck.includes(item)) return null;
    deck.push(item);
    orders.push(entry.o);
  }
  return validOrders(orders, deck) ? { deck, orders } : null;
}

export type StoredAnswer = {
  q: number;
  /** Position the player tapped, or null when the time ran out. */
  shown: number | null;
  /** The option behind that position, in the question's own order. */
  choice: number | null;
  correct: boolean;
  ms: number;
  hint: boolean;
};

export function limitMs(q: number, hintQ: number | null): number {
  return (QUESTION_SECONDS + (hintQ === q ? HINT_BONUS_SECONDS : 0)) * 1000;
}

export function serveQuestion(
  deck: BankQuestion[],
  q: number,
  orders: number[][],
  shownAt: number,
  now: number,
  hintQ: number | null,
): ServedQuestion {
  const item = deck[q];
  const order = orders[q];
  const limit = limitMs(q, hintQ);
  return {
    index: q,
    total: deck.length,
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
  deck: BankQuestion[],
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
  const correct = !timedOut && choice === deck[q].answer;
  return {
    q,
    shown,
    choice,
    correct,
    ms: elapsed,
    hint: hintQ === q,
    timedOut,
    correctShown: order.indexOf(deck[q].answer),
  };
}

export function buildResult(deck: BankQuestion[], answers: StoredAnswer[]): PlayResult {
  const score = answers.filter((a) => a.correct).length;
  const level = levelFor(score);
  return {
    score,
    total: deck.length,
    level,
    percent: LEVELS[level].percent,
    review: deck.map((item, index) => {
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

/** Whether a stored order list is usable for this deck (guards hand-edited rows). */
export function validOrders(orders: unknown, deck: BankQuestion[]): orders is number[][] {
  return (
    Array.isArray(orders) &&
    orders.length === deck.length &&
    orders.every(
      (o, q) =>
        Array.isArray(o) &&
        o.length === deck[q].options.en.length &&
        [...o].sort((a, b) => a - b).every((v, i) => v === i),
    )
  );
}
