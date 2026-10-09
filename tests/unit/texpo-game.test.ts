import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { LEGACY_QUESTIONS, TEXPO_BANK } from "@/features/texpo/lib/questions.server";
import {
  DECK_SHAPE,
  buildResult,
  deckFromStored,
  drawDeck,
  gradeAnswer,
  limitMs,
  serveQuestion,
  storeDeck,
  validOrders,
} from "@/features/texpo/lib/engine";
import {
  ANSWER_GRACE_MS,
  COUPON_CATEGORY_SLUG,
  FIELDS,
  INTERESTS,
  LEVELS,
  MAIN_LINK_SLUG,
  QUESTION_COUNT,
  STATUSES,
  answersFor,
  isArabicTripleName,
  isEmailLike,
  levelFor,
  profileCode,
  profileText,
  readProfile,
  shuffledOrder,
  slugFromLabel,
} from "@/features/texpo/lib/texpo-shared";
import { safeLmsRedirect } from "@/features/lms/lib/redirect";
import { assistantPlacement } from "@/features/chat/lib/assistant-placement";
import {
  cookieDomain,
  forgetWaiting,
  knownWaiting,
  rememberWaiting,
  savePlayer,
  storedPlayer,
} from "@/features/texpo/lib/play-store";

/** A random source that always returns zeros: the same deck every time. */
const zeros = (n: number) => new Uint32Array(n);
const deck = drawDeck(TEXPO_BANK, zeros);
const identity = deck.map(() => [0, 1, 2, 3]);
const reversed = deck.map(() => [3, 2, 1, 0]);

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

describe("the question bank", () => {
  it("has 50 questions: 20 easy, 15 medium, 15 hard, each with its own id", () => {
    expect(TEXPO_BANK).toHaveLength(50);
    const count = (d: string) => TEXPO_BANK.filter((q) => q.difficulty === d).length;
    expect([count("easy"), count("medium"), count("hard")]).toEqual([20, 15, 15]);
    const ids = [...TEXPO_BANK, ...LEGACY_QUESTIONS].map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("has four distinct options in both languages, a valid answer, a hint and an explanation", () => {
    for (const q of [...TEXPO_BANK, ...LEGACY_QUESTIONS]) {
      for (const lang of ["ar", "en"] as const) {
        expect(q.options[lang], q.id).toHaveLength(4);
        expect(new Set(q.options[lang]).size, q.id).toBe(4);
        expect(q.text[lang].trim(), q.id).not.toBe("");
        expect(q.hint[lang].trim(), q.id).not.toBe("");
        expect(q.explanation[lang].trim(), q.id).not.toBe("");
      }
      expect(q.answer).toBeGreaterThanOrEqual(0);
      expect(q.answer).toBeLessThan(4);
      expect(/[؀-ۿ]/.test(q.text.ar + q.options.ar.join("")), q.id).toBe(true);
    }
  });

  it("keeps questions and answers short", () => {
    for (const q of TEXPO_BANK) {
      for (const lang of ["ar", "en"] as const) {
        expect(q.text[lang].length, q.id).toBeLessThanOrEqual(100);
        for (const o of q.options[lang]) expect(o.length, `${q.id} ${o}`).toBeLessThanOrEqual(55);
      }
    }
  });

  it("cannot be won by always picking the longest answer, whatever 7 a player gets", () => {
    for (const lang of ["ar", "en"] as const) {
      // A tie counts against us: the player could pick the right one.
      const longestWins = (d: string) =>
        TEXPO_BANK.filter((q) => {
          if (q.difficulty !== d) return false;
          const lens = q.options[lang].map((o) => o.length);
          return lens[q.answer] === Math.max(...lens);
        }).length;
      const slots = (d: string) => DECK_SHAPE.filter((x) => x === d).length;
      const worst = ["easy", "medium", "hard"].reduce(
        (sum, d) => sum + Math.min(slots(d), longestWins(d)),
        0,
      );
      // Intermediate needs 4; the longest-answer trick must stay a beginner.
      expect(worst, lang).toBeLessThan(4);
    }
  });
});

describe("the two steps before the game", () => {
  it("gives every status a reply and a second question in both languages", () => {
    for (const st of STATUSES) {
      expect(st.ar && st.en && st.reply.ar && st.reply.en && st.ask.ar && st.ask.en).toBeTruthy();
    }
  });

  it("asks about interests only when the player neither studies nor works", () => {
    for (const st of STATUSES) {
      expect(answersFor(st.id)).toBe(st.id === "none" ? INTERESTS : FIELDS);
    }
  });

  it("keeps every answer pair inside the stored column (40 characters)", () => {
    for (const st of STATUSES) {
      for (const a of answersFor(st.id)) {
        const code = profileCode(st.id, a.id);
        expect(code).toBe(`${st.id}:${a.id}`);
        expect(code!.length).toBeLessThanOrEqual(40);
        expect(a.id.length).toBeLessThanOrEqual(20);
      }
    }
  });

  it("refuses a pair the page never offers", () => {
    expect(profileCode("none", "health")).toBeNull();
    expect(profileCode("work", "curious")).toBeNull();
    expect(profileCode("retired", "health")).toBeNull();
    expect(profileCode("work", "")).toBeNull();
  });

  it("reads a stored pair back", () => {
    expect(readProfile("seeking:engineering")).toEqual({
      status: "seeking",
      field: "engineering",
      interest: null,
      legacy: null,
    });
    expect(readProfile("none:create")).toMatchObject({ status: "none", interest: "create" });
    expect(profileText("work:health", "en")).toEqual({
      status: "I work",
      answer: "Medicine & health",
    });
    expect(profileText("none:curious", "ar")).toEqual({
      status: "لا أدرس ولا أعمل حالياً",
      answer: "مجرد فضول",
    });
  });

  it("still labels plays that answered the old single question", () => {
    expect(readProfile("tech")).toMatchObject({ status: null, field: null });
    expect(profileText("tech", "en")).toEqual({
      status: "",
      answer: "I work in tech or engineering",
    });
    expect(profileText(null, "en")).toEqual({ status: "", answer: "" });
    expect(profileText("work:nonsense", "en")).toEqual({ status: "", answer: "" });
  });
});

describe("each play's questions", () => {
  it("are 7, easy to hard: 3 easy, 2 medium, 2 hard", () => {
    expect(QUESTION_COUNT).toBe(7);
    expect(DECK_SHAPE).toHaveLength(QUESTION_COUNT);
    expect(deck.map((q) => q.difficulty).join(",")).toBe("easy,easy,easy,medium,medium,hard,hard");
  });

  it("never repeat a question or a topic", () => {
    for (let i = 0; i < 500; i++) {
      const d = drawDeck(TEXPO_BANK);
      expect(d.map((q) => q.difficulty)).toEqual([...DECK_SHAPE]);
      expect(new Set(d.map((q) => q.id)).size).toBe(QUESTION_COUNT);
      expect(new Set(d.map((q) => q.topic)).size).toBe(QUESTION_COUNT);
    }
  });

  it("are drawn at random, so players get different questions", () => {
    const ones = (n: number) => new Uint32Array(n).fill(1);
    expect(drawDeck(TEXPO_BANK, ones).map((q) => q.id)).not.toEqual(deck.map((q) => q.id));
    const seen = new Set<string>();
    for (let i = 0; i < 200; i++) for (const q of drawDeck(TEXPO_BANK)) seen.add(q.id);
    expect(seen.size).toBeGreaterThan(45);
  });

  it("are stored with their option orders and read back the same", () => {
    const stored = JSON.parse(JSON.stringify(storeDeck(deck)));
    const back = deckFromStored(stored, TEXPO_BANK, LEGACY_QUESTIONS);
    expect(back?.deck).toEqual(deck);
    expect(back?.orders).toEqual(stored.map((e: { o: number[] }) => e.o));
  });

  it("keep working for plays started on the old fixed 7", () => {
    const old = LEGACY_QUESTIONS.map(() => [2, 0, 3, 1]);
    const back = deckFromStored(old, TEXPO_BANK, LEGACY_QUESTIONS);
    expect(back?.deck).toBe(LEGACY_QUESTIONS);
    expect(back?.orders).toEqual(old);
  });

  it("refuse rows that fit no deck", () => {
    const good = storeDeck(deck);
    const read = (v: unknown) => deckFromStored(v, TEXPO_BANK, LEGACY_QUESTIONS);
    expect(read("nope")).toBeNull();
    expect(read(good.slice(1))).toBeNull();
    expect(read([{ id: "Z99", o: [0, 1, 2, 3] }, ...good.slice(1)])).toBeNull();
    expect(read([good[0], good[0], ...good.slice(2)])).toBeNull();
    expect(read([{ id: good[0].id, o: [0, 0, 1, 2] }, ...good.slice(1)])).toBeNull();
    expect(read([null, ...good.slice(1)])).toBeNull();
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
    expect(validOrders(identity, deck)).toBe(true);
    expect(validOrders(identity.slice(1), deck)).toBe(false);
    expect(validOrders([[0, 0, 1, 2], ...identity.slice(1)], deck)).toBe(false);
    expect(validOrders("nope", deck)).toBe(false);
  });
});

describe("serving", () => {
  it("shows options in the player's order and never the answer", () => {
    const served = serveQuestion(deck, 0, reversed, 1000, 6000, null);
    expect(served.options.en).toEqual([...deck[0].options.en].reverse());
    expect(served.remainingMs).toBe(15000);
    expect(JSON.stringify(served)).not.toContain('"answer"');
    expect(served.hint).toBeNull();
  });

  it("adds ten seconds and the hint on the hinted question only", () => {
    expect(limitMs(2, 2)).toBe(30000);
    expect(limitMs(3, 2)).toBe(20000);
    const hinted = serveQuestion(deck, 2, identity, 0, 0, 2);
    expect(hinted.hint).toEqual(deck[2].hint);
    expect(serveQuestion(deck, 3, identity, 0, 0, 2).hintUsed).toBe(true);
  });
});

describe("grading", () => {
  it("maps the tapped position back through the shuffle", () => {
    const rightShown = reversed[0].indexOf(deck[0].answer);
    const right = gradeAnswer(deck, 0, reversed, rightShown, 0, 5000, null);
    expect(right).toMatchObject({ correct: true, timedOut: false, correctShown: rightShown });
    const wrong = gradeAnswer(deck, 0, reversed, (rightShown + 1) % 4, 0, 5000, null);
    expect(wrong.correct).toBe(false);
    expect(wrong.correctShown).toBe(rightShown);
  });

  it("counts no answer and late answers as timeouts", () => {
    const shown = identity[0].indexOf(deck[0].answer);
    expect(gradeAnswer(deck, 0, identity, null, 0, 1000, null)).toMatchObject({
      correct: false,
      timedOut: true,
    });
    expect(gradeAnswer(deck, 0, identity, shown, 0, 20000 + ANSWER_GRACE_MS, null).correct).toBe(
      true,
    );
    expect(gradeAnswer(deck, 0, identity, shown, 0, 20001 + ANSWER_GRACE_MS, null).timedOut).toBe(
      true,
    );
    // The hint's extra ten seconds count.
    expect(gradeAnswer(deck, 0, identity, shown, 0, 28000, 0).correct).toBe(true);
  });

  it("builds the result and the review", () => {
    const answers = deck.map((q, i) => ({
      q: i,
      shown: q.answer,
      choice: i < 4 ? q.answer : (q.answer + 1) % 4,
      correct: i < 4,
      ms: 1000,
      hint: false,
    }));
    const r = buildResult(deck, answers);
    expect(r).toMatchObject({ score: 4, total: 7, level: "intermediate", percent: 35 });
    expect(r.review[0].ok).toBe(true);
    expect(r.review[6].ok).toBe(false);
    expect(r.review[6].correct.en).toBe(deck[6].options.en[deck[6].answer]);
    expect(buildResult(deck, []).review.every((x) => x.chosen === null)).toBe(true);
  });
});

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const latestMigration = (needle: string) => {
  const dir = join(process.cwd(), "supabase/migrations");
  const hit = readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .sort()
    .filter((f) => readFileSync(join(dir, f), "utf8").includes(needle))
    .pop();
  return hit ? readFileSync(join(dir, hit), "utf8") : "";
};

describe("links", () => {
  it("make readable codes from labels", () => {
    expect(slugFromLabel("Booth QR – Day 2")).toBe("booth-qr-day-2");
    expect(slugFromLabel("إنستغرام", () => "lfixed")).toBe("lfixed");
  });

  it("have no Direct row: visits without a working link count under the booth link", () => {
    expect(MAIN_LINK_SLUG).toBe("booth");
    expect(read("src/features/texpo/lib/texpo-admin.functions.ts")).not.toMatch(/"direct"/);
    expect(read("src/routes/admin/crm/texpo.tsx")).not.toMatch(/"direct"|Direct \(/);
  });
});

describe("one gift", () => {
  const claim = latestMigration("FUNCTION public.game_claim_reward");

  it("per account and per phone, in the claim itself", () => {
    expect(claim).toContain("'already_claimed'");
    expect(claim).toContain("'device_claimed'");
    expect(claim).toContain("game_plays_one_claim_per_device");
  });

  it("only on the Generative AI courses", () => {
    expect(COUPON_CATEGORY_SLUG).toBe("generative-ai");
    expect(claim).toContain(`slug = '${COUPON_CATEGORY_SLUG}'`);
    expect(claim).toMatch(/INSERT INTO public\.lms_coupons \([^)]*category_id/);
    expect(latestMigration("FUNCTION public.lms_coupon_quote")).toContain(
      "v_coupon.category_id IS NOT NULL",
    );
  });

  it("with no way to start over on the same phone", () => {
    const game = read("src/features/texpo/TexpoGame.tsx");
    expect(game).not.toMatch(/New player|newPlayer/);
    expect(game).toContain(`catalog?category=\${COUPON_CATEGORY_SLUG}`);
    expect(read("src/features/texpo/lib/texpo.functions.ts")).toMatch(
      /deviceClaimed\(sb, data\.device\)\) throw new Error\("device_claimed"\)/,
    );
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

describe("who is playing (the first screen)", () => {
  it("checks the name the way the learning platform does: three Arabic words", () => {
    expect(isArabicTripleName("محمد أحمد خالد")).toBe(true);
    expect(isArabicTripleName("  محمد   أحمد   خالد ")).toBe(true);
    expect(isArabicTripleName("محمد أحمد")).toBe(false);
    expect(isArabicTripleName("Mohammad Ahmad Khaled")).toBe(false);
    expect(isArabicTripleName("محمد Ahmad خالد")).toBe(false);
  });

  it("checks the email loosely on the phone (the server parses it again)", () => {
    expect(isEmailLike("sara@example.com")).toBe(true);
    expect(isEmailLike(" sara@example.co ")).toBe(true);
    expect(isEmailLike("sara@example")).toBe(false);
    expect(isEmailLike("sara example@x.com")).toBe(false);
    expect(isEmailLike("")).toBe(false);
  });

  it("is saved as a lead and on the play, and never blocks the start", () => {
    const fns = read("src/features/texpo/lib/texpo.functions.ts");
    expect(fns).toMatch(/export const texpoRegister = createServerFn/);
    expect(fns).toContain('.from("individual_leads")');
    expect(fns).toContain("player_name: data.name ?? null");
    expect(fns).toContain("player_email: data.email ?? null");
    expect(fns).toContain("email: playerEmail.optional().catch(undefined)");
    expect(fns).toContain("name: playerName.optional().catch(undefined)");
  });

  it("is filed under the event's sign-up link, so Admin → Events counts it", () => {
    const fns = read("src/features/texpo/lib/texpo.functions.ts");
    expect(fns).toMatch(/\.eq\("kind", "game"\)[\s\S]*?\.eq\("kind", "registration"\)/);
    expect(fns).toContain("registration_link_id: signupLink");
    // The Events report counts leads by that link (event_report, 20261008120000).
    expect(read("supabase/migrations/20261008120000_events.sql")).toContain(
      "JOIN sources s ON s.kind = 'registration' AND s.source_id = r.id",
    );
  });

  it("shows in the Events players list before any claim", () => {
    const admin = read("src/features/texpo/TexpoAdmin.tsx");
    expect(admin).toContain("{p.name || p.email ? (");
    expect(admin).not.toMatch(/\{p\.claimed_at \? \(\s*<>\s*<div className="font-bold">\{p\.name/);
  });

  it("stays on the phone only, never in a cookie, and is cleared by a claim", () => {
    const store = new Map<string, string>();
    const fake = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
    };
    const g = globalThis as { localStorage?: unknown };
    const before = g.localStorage;
    g.localStorage = fake;
    try {
      savePlayer({ name: "محمد أحمد خالد", email: "m@example.com", phone: "" });
      expect(storedPlayer()).toEqual({ name: "محمد أحمد خالد", email: "m@example.com", phone: "" });
      savePlayer(null);
      expect(storedPlayer()).toBeNull();
    } finally {
      g.localStorage = before;
    }
    const playStore = read("src/features/texpo/lib/play-store.ts");
    const savePlayerBody = playStore.slice(playStore.indexOf("export function savePlayer"));
    expect(savePlayerBody.slice(0, 400)).not.toMatch(/writeCookie|write\(/);
    expect(read("src/features/texpo/TexpoGame.tsx")).toMatch(
      /savePlayer\(null\);\s+forgetWaiting\(\);/,
    );
  });
});

describe("the account inside the game", () => {
  it("creates the same account as the sign-up page, with a password and where they live", () => {
    const account = read("src/features/texpo/TexpoAccount.tsx");
    expect(account).toContain("signUpLmsUser");
    expect(account).toContain("checkLocation(place)");
    expect(account).toContain("password !== confirm");
    expect(account).toContain("EMAIL_ALREADY_REGISTERED");
    expect(account).toContain("signInWithPassword");
  });

  it("does not ask again for the name and email from the first screen", () => {
    const account = read("src/features/texpo/TexpoAccount.tsx");
    expect(account).toContain("const askName = !isArabicTripleName(initial.name)");
    expect(account).toContain("const askEmail = !isEmailLike(initial.email)");
    expect(account).toMatch(/mode === "signup" && askName &&/);
    // Creating the account never shows the email field when the first screen gave it.
    expect(account).toContain('(askEmail || mode === "signin") && (');
    // So the first screen takes the name the way the account needs it.
    expect(read("src/features/texpo/TexpoGame.tsx")).toContain("if (!isArabicTripleName(name))");
  });

  it("replaces the trip to the sign-up page; the normal pages are untouched", () => {
    const game = read("src/features/texpo/TexpoGame.tsx");
    expect(game).toContain("<TexpoAccount");
    expect(game).not.toContain("signup?redirect=%2Ftexpo");
  });
});

describe("one play per start", () => {
  it("ignores a second tap on the phone, and a repeated start on the server", () => {
    const game = read("src/features/texpo/TexpoGame.tsx");
    expect(game).toMatch(/if \(startingRef\.current\) return;/);
    expect(game).toContain("disabled={!!starting}");
    const fns = read("src/features/texpo/lib/texpo.functions.ts");
    expect(fns).toMatch(
      /\.eq\("device_id", data\.device\)\s*\.is\("finished_at", null\)\s*\.eq\("current_q", 0\)/,
    );
    expect(fns).toContain("if (recent) return stateOf(sb, recent as PlayRow);");
  });
});

describe("signing in to an existing account", () => {
  it("asks for that account's email, prefilled with the one from the first screen", () => {
    const account = read("src/features/texpo/TexpoAccount.tsx");
    expect(account).toContain('(askEmail || mode === "signin") && (');
    expect(account).toContain('mode === "signup" && !askEmail && (');
  });
});

describe("coming back later", () => {
  it("finds a waiting result by the account's email, from any device", () => {
    const fns = read("src/features/texpo/lib/texpo.functions.ts");
    expect(fns).toMatch(/export const texpoFindMine = createServerFn[\s\S]*?requireSupabaseAuth/);
    expect(fns).toMatch(/\.eq\("player_email", email\)[\s\S]*?\.is\("claimed_at", null\)/);
    expect(read("src/features/texpo/TexpoClaimNudge.tsx")).toContain("texpoFindMine");
  });

  it("asks the server once per visit, per account", () => {
    const store = new Map<string, string>();
    const fake = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
    };
    const g = globalThis as { sessionStorage?: unknown };
    const before = g.sessionStorage;
    g.sessionStorage = new Proxy(fake, {
      ownKeys: () => [...store.keys()],
      getOwnPropertyDescriptor: (_t, k) =>
        store.has(String(k))
          ? { enumerable: true, configurable: true, value: store.get(String(k)) }
          : undefined,
    });
    try {
      expect(knownWaiting("u1")).toBeNull();
      rememberWaiting("u1", true);
      rememberWaiting("u2", false);
      expect(knownWaiting("u1")).toBe(true);
      expect(knownWaiting("u2")).toBe(false);
      forgetWaiting();
      expect(knownWaiting("u1")).toBeNull();
    } finally {
      g.sessionStorage = before;
    }
  });
});
