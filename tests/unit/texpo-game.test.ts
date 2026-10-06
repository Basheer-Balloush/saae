import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { TEXPO_QUESTIONS } from "@/features/texpo/lib/questions.server";
import {
  buildResult,
  gradeAnswer,
  limitMs,
  serveQuestion,
  validOrders,
} from "@/features/texpo/lib/engine";
import {
  ANSWER_GRACE_MS,
  FIELDS,
  FIELD_REPLIES,
  LEVELS,
  QUESTION_COUNT,
  levelFor,
  shuffledOrder,
  slugFromLabel,
} from "@/features/texpo/lib/texpo-shared";
import { safeLmsRedirect } from "@/features/lms/lib/redirect";
import { assistantPlacement } from "@/features/chat/lib/assistant-placement";
import { cookieDomain } from "@/features/texpo/lib/play-store";

const bank = TEXPO_QUESTIONS;
const identity = bank.map(() => [0, 1, 2, 3]);
const reversed = bank.map(() => [3, 2, 1, 0]);

describe("levels", () => {
  it("0–3 beginner, 4–5 intermediate, 6–7 professional", () => {
    expect([0, 3].map(levelFor)).toEqual(["beginner", "beginner"]);
    expect([4, 5].map(levelFor)).toEqual(["intermediate", "intermediate"]);
    expect([6, 7].map(levelFor)).toEqual(["professional", "professional"]);
    expect([
      LEVELS.beginner.percent,
      LEVELS.intermediate.percent,
      LEVELS.professional.percent,
    ]).toEqual([20, 35, 50]);
  });
});

describe("the question set", () => {
  it("is 7 questions, easy to hard", () => {
    expect(QUESTION_COUNT).toBe(7);
    expect(bank).toHaveLength(QUESTION_COUNT);
    expect(bank.map((q) => q.difficulty).join(",")).toBe("easy,easy,easy,medium,medium,hard,hard");
  });

  it("has four distinct options in both languages, a valid answer, a hint and an explanation", () => {
    for (const q of bank) {
      for (const lang of ["ar", "en"] as const) {
        expect(q.options[lang]).toHaveLength(4);
        expect(new Set(q.options[lang]).size).toBe(4);
        expect(q.text[lang].trim()).not.toBe("");
        expect(q.hint[lang].trim()).not.toBe("");
        expect(q.explanation[lang].trim()).not.toBe("");
      }
      expect(q.answer).toBeGreaterThanOrEqual(0);
      expect(q.answer).toBeLessThan(4);
      expect(/[؀-ۿ]/.test(q.text.ar + q.options.ar.join(""))).toBe(true);
    }
  });

  it("cannot be won by always picking the longest answer", () => {
    for (const lang of ["ar", "en"] as const) {
      const longestWins = bank.filter((q) => {
        const lens = q.options[lang].map((o) => o.length);
        return lens.indexOf(Math.max(...lens)) === q.answer;
      }).length;
      // Intermediate needs 4; the longest-answer trick must stay a beginner.
      expect(longestWins, lang).toBeLessThan(4);
    }
  });

  it("has a host reply for every field", () => {
    for (const f of FIELDS) expect(FIELD_REPLIES[f.id].ar && FIELD_REPLIES[f.id].en).toBeTruthy();
  });
});

describe("shuffling", () => {
  it("gives a permutation", () => {
    for (let i = 0; i < 50; i++) {
      expect([...shuffledOrder(4)].sort()).toEqual([0, 1, 2, 3]);
    }
  });

  it("is driven by the random source", () => {
    const fixed = () => new Uint32Array([0, 0, 0, 0]);
    expect(shuffledOrder(4, fixed)).toEqual([1, 2, 3, 0]);
  });

  it("checks stored orders", () => {
    expect(validOrders(identity, bank)).toBe(true);
    expect(validOrders(identity.slice(1), bank)).toBe(false);
    expect(validOrders([[0, 0, 1, 2], ...identity.slice(1)], bank)).toBe(false);
    expect(validOrders("nope", bank)).toBe(false);
  });
});

describe("serving", () => {
  it("shows options in the player's order and never the answer", () => {
    const served = serveQuestion(bank, 0, reversed, 1000, 6000, null);
    expect(served.options.en).toEqual([...bank[0].options.en].reverse());
    expect(served.remainingMs).toBe(15000);
    expect(JSON.stringify(served)).not.toContain('"answer"');
    expect(served.hint).toBeNull();
  });

  it("adds ten seconds and the hint on the hinted question only", () => {
    expect(limitMs(2, 2)).toBe(30000);
    expect(limitMs(3, 2)).toBe(20000);
    const hinted = serveQuestion(bank, 2, identity, 0, 0, 2);
    expect(hinted.hint).toEqual(bank[2].hint);
    expect(serveQuestion(bank, 3, identity, 0, 0, 2).hintUsed).toBe(true);
  });
});

describe("grading", () => {
  it("maps the tapped position back through the shuffle", () => {
    const rightShown = reversed[0].indexOf(bank[0].answer);
    const right = gradeAnswer(bank, 0, reversed, rightShown, 0, 5000, null);
    expect(right).toMatchObject({ correct: true, timedOut: false, correctShown: rightShown });
    const wrong = gradeAnswer(bank, 0, reversed, (rightShown + 1) % 4, 0, 5000, null);
    expect(wrong.correct).toBe(false);
    expect(wrong.correctShown).toBe(rightShown);
  });

  it("counts no answer and late answers as timeouts", () => {
    const shown = identity[0].indexOf(bank[0].answer);
    expect(gradeAnswer(bank, 0, identity, null, 0, 1000, null)).toMatchObject({
      correct: false,
      timedOut: true,
    });
    expect(gradeAnswer(bank, 0, identity, shown, 0, 20000 + ANSWER_GRACE_MS, null).correct).toBe(
      true,
    );
    expect(gradeAnswer(bank, 0, identity, shown, 0, 20001 + ANSWER_GRACE_MS, null).timedOut).toBe(
      true,
    );
    // The hint's extra ten seconds count.
    expect(gradeAnswer(bank, 0, identity, shown, 0, 28000, 0).correct).toBe(true);
  });

  it("builds the result and the review", () => {
    const answers = bank.map((q, i) => ({
      q: i,
      shown: q.answer,
      choice: i < 4 ? q.answer : (q.answer + 1) % 4,
      correct: i < 4,
      ms: 1000,
      hint: false,
    }));
    const r = buildResult(bank, answers);
    expect(r).toMatchObject({ score: 4, total: 7, level: "intermediate", percent: 35 });
    expect(r.review[0].ok).toBe(true);
    expect(r.review[6].ok).toBe(false);
    expect(r.review[6].correct.en).toBe(bank[6].options.en[bank[6].answer]);
    expect(buildResult(bank, []).review.every((x) => x.chosen === null)).toBe(true);
  });
});

describe("links", () => {
  it("make readable codes from labels", () => {
    expect(slugFromLabel("Booth QR – Day 2")).toBe("booth-qr-day-2");
    expect(slugFromLabel("إنستغرام", () => "lfixed")).toBe("lfixed");
  });
});

describe("sign-in return", () => {
  it("accepts the game and the learning platform only", () => {
    expect(safeLmsRedirect("/texpo")).toBe("/texpo");
    expect(safeLmsRedirect("/texpo?l=booth")).toBe("/texpo?l=booth");
    expect(safeLmsRedirect("/learning-management-system/student")).toBe(
      "/learning-management-system/student",
    );
    expect(safeLmsRedirect("/texpos")).toBeUndefined();
    expect(safeLmsRedirect("/texpo/../admin")).toBeUndefined();
    expect(safeLmsRedirect("//evil.example/texpo")).toBeUndefined();
    expect(safeLmsRedirect("https://evil.example/texpo")).toBeUndefined();
  });
});

describe("the saved play", () => {
  it("is shared between aisyria.org and www.aisyria.org, and stays host-only elsewhere", () => {
    expect(cookieDomain("aisyria.org")).toBe("aisyria.org");
    expect(cookieDomain("www.aisyria.org")).toBe("aisyria.org");
    expect(cookieDomain("localhost")).toBeNull();
    expect(cookieDomain("notaisyria.org")).toBeNull();
  });
});

describe("the chat on the game page", () => {
  it("is mounted for the game's buttons, without the floating launcher", () => {
    expect(assistantPlacement("/texpo")).toEqual({ mounted: true, launcher: false });
  });
});

describe("the answer key stays on the server", () => {
  it("is imported for its values only by the server functions", () => {
    const files: string[] = [];
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const p = join(dir, name);
        if (statSync(p).isDirectory()) walk(p);
        else if (/\.(ts|tsx)$/.test(name)) files.push(p);
      }
    };
    walk(join(process.cwd(), "src/features/texpo"));
    files.push(
      join(process.cwd(), "src/routes/texpo.tsx"),
      join(process.cwd(), "src/routes/admin/crm/texpo.tsx"),
    );
    const offenders = files.filter((p) => {
      if (/questions\.server\.ts$/.test(p) || /texpo\.functions\.ts$/.test(p)) return false;
      const text = readFileSync(p, "utf8");
      const imports = text.match(/(?:from|import\()\s*["'][^"']*questions\.server["']/g) ?? [];
      const typeOnly =
        text.match(/import type \{[^}]*\} from ["'][^"']*questions\.server["']/g) ?? [];
      return imports.length > typeOnly.length;
    });
    expect(offenders).toEqual([]);
    // And the server functions load it lazily, inside handlers.
    const fns = readFileSync(
      join(process.cwd(), "src/features/texpo/lib/texpo.functions.ts"),
      "utf8",
    );
    expect(fns).toMatch(/await import\("\.\/questions\.server"\)/);
    expect(fns).not.toMatch(/^import .*questions\.server/m);
  });
});
