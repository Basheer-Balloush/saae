/* Texpo game: the pieces both the page and the server need. The questions and
   their answers stay on the server (questions.server.ts); the page only ever
   sees a question after it is served and its answer after it is sent. */

export type Lang = "ar" | "en";
export type Bi = { ar: string; en: string };

export const TEXPO_GAME = "texpo";
export const QUESTION_COUNT = 7;
/** Seconds to answer; a hint adds HINT_BONUS_SECONDS to that question. */
export const QUESTION_SECONDS = 20;
export const HINT_BONUS_SECONDS = 10;
/** Slack for slow venue internet before a late answer counts as a timeout. */
export const ANSWER_GRACE_MS = 4000;
/** Texpo ends on 11 October 2026; coupons last until 10 December 2026. */
export const COUPON_EXPIRES = "2026-12-10T23:59:59+03:00";

export type Level = "beginner" | "intermediate" | "professional";

export const LEVELS: Record<Level, { percent: number; name: Bi; line: Bi }> = {
  beginner: {
    percent: 20,
    name: { ar: "مبتدئ", en: "Beginner" },
    line: {
      ar: "كل خبير بدأ من هنا. هديتك كوبون خصم 20٪.",
      en: "Every expert started here. Your gift: a 20% coupon.",
    },
  },
  intermediate: {
    percent: 35,
    name: { ar: "متوسط", en: "Intermediate" },
    line: {
      ar: "تستخدم الذكاء الاصطناعي بوعي. هديتك كوبون خصم 35٪.",
      en: "You use AI with good sense. Your gift: a 35% coupon.",
    },
  },
  professional: {
    percent: 50,
    name: { ar: "محترف", en: "Professional" },
    line: {
      ar: "مذهل! تعرف الذكاء الاصطناعي جيداً. هديتك كوبون خصم 50٪.",
      en: "Impressive! You really know your AI. Your gift: a 50% coupon.",
    },
  },
};

/** 0–3 right: beginner, 4–5: intermediate, 6–7: professional. */
export function levelFor(score: number): Level {
  if (score >= 6) return "professional";
  if (score >= 4) return "intermediate";
  return "beginner";
}

/* The two steps before the game. Not graded; they go to the CRM.
   1. Where the player is now (STATUSES).
   2. Their field (FIELDS) when they study, work or look for work, or what
      draws them to AI (INTERESTS) when they do neither.
   Both answers live in game_plays.field as "<status>:<answer>", for example
   "work:health", so the CRM contact gets them through game_claim_reward with
   no database change. Plays started before 2026-10-07 hold one of
   LEGACY_FIELDS instead (readProfile tells them apart). */
export const STATUSES = [
  {
    id: "study",
    ar: "أدرس",
    en: "I study",
    ask: { ar: "ماذا تدرس؟", en: "What do you study?" },
    reply: {
      ar: "طالب علم! الذكاء الاصطناعي رفيق دراسة رائع. ماذا تدرس؟",
      en: "A student! AI makes a great study partner. What do you study?",
    },
  },
  {
    id: "work",
    ar: "أعمل",
    en: "I work",
    ask: { ar: "في أي مجال تعمل؟", en: "What field do you work in?" },
    reply: {
      ar: "رائع! الذكاء الاصطناعي يدخل كل مهنة اليوم. في أي مجال تعمل؟",
      en: "Great! AI is finding its way into every job. What's your field?",
    },
  },
  {
    id: "both",
    ar: "أدرس وأعمل",
    en: "I study and work",
    ask: { ar: "ما مجال دراستك أو عملك؟", en: "What field do you study or work in?" },
    reply: {
      ar: "تدرس وتعمل معاً؟ همّة عالية! ما مجالك؟",
      en: "Studying and working? That takes drive! What's your field?",
    },
  },
  {
    id: "seeking",
    ar: "أبحث عن عمل",
    en: "I'm looking for work",
    ask: { ar: "في أي مجال تبحث عن عمل؟", en: "What field are you looking for work in?" },
    reply: {
      ar: "بالتوفيق في بحثك! مهارات الذكاء الاصطناعي تفتح أبواباً كثيرة. في أي مجال؟",
      en: "Good luck with the search! AI skills open a lot of doors. Which field?",
    },
  },
  {
    id: "none",
    ar: "لا أدرس ولا أعمل حالياً",
    en: "Neither at the moment",
    ask: {
      ar: "ما الذي يهمّك أكثر في الذكاء الاصطناعي؟",
      en: "What interests you most about AI?",
    },
    reply: {
      ar: "أهلاً بك! الفضول أول خطوة. ما الذي يشدّك إلى الذكاء الاصطناعي؟",
      en: "Welcome! Curiosity is the first step. What draws you to AI?",
    },
  },
] as const;
export type StatusId = (typeof STATUSES)[number]["id"];

/** Close to SAAE's communities (software, data, city, healthcare, research,
    economy, trainers, media), plus the fields visitors often come from. */
export const FIELDS = [
  { id: "software", ar: "البرمجة وتقنية المعلومات", en: "Software & IT" },
  { id: "data", ar: "البيانات والذكاء الاصطناعي", en: "Data & AI" },
  { id: "engineering", ar: "الهندسة والعمارة", en: "Engineering & architecture" },
  { id: "health", ar: "الطب والصحة", en: "Medicine & health" },
  { id: "business", ar: "الأعمال والاقتصاد", en: "Business & economics" },
  { id: "media", ar: "التصميم والإعلام", en: "Design & media" },
  { id: "education", ar: "التعليم والتدريب", en: "Teaching & training" },
  { id: "science", ar: "العلوم والبحث العلمي", en: "Science & research" },
  { id: "humanities", ar: "القانون والآداب", en: "Law & humanities" },
  { id: "other", ar: "مجال آخر", en: "Something else" },
] as const;
export type FieldId = (typeof FIELDS)[number]["id"];

export const INTERESTS = [
  { id: "everyday", ar: "تسهيل أموري اليومية", en: "Making daily life easier" },
  { id: "create", ar: "صناعة الصور والفيديو والمحتوى", en: "Making images, video and content" },
  { id: "learn", ar: "تعلّم مهارة جديدة", en: "Learning a new skill" },
  { id: "income", ar: "إيجاد عمل أو مصدر دخل", en: "Finding work or an income" },
  { id: "project", ar: "بدء مشروعي الخاص", en: "Starting my own project" },
  { id: "curious", ar: "مجرد فضول", en: "Just curious" },
] as const;
export type InterestId = (typeof INTERESTS)[number]["id"];

type Choice = { id: string; ar: string; en: string };

/** The second step's choices for a status: interests for "none", fields otherwise. */
export function answersFor(status: StatusId): readonly Choice[] {
  return status === "none" ? INTERESTS : FIELDS;
}

/** "<status>:<answer>" when the pair is one the page offers, else null. */
export function profileCode(status: string, answer: string): string | null {
  const s = STATUSES.find((x) => x.id === status);
  if (!s || !answersFor(s.id).some((a) => a.id === answer)) return null;
  return `${s.id}:${answer}`;
}

/** The single "what do you do" question asked before 2026-10-07. */
const LEGACY_FIELDS: Record<string, Bi> = {
  study: { ar: "أدرس", en: "I study" },
  tech: { ar: "أعمل في التقنية أو الهندسة", en: "I work in tech or engineering" },
  design: {
    ar: "أعمل في التصميم أو الإعلام أو صناعة المحتوى",
    en: "I work in design, media or content",
  },
  business: { ar: "أدير عملاً أو أعمل في الإدارة", en: "I run a business or work in management" },
  teach: { ar: "أعلّم أو أدرّب", en: "I teach or train" },
  job: { ar: "أبحث عن عمل", en: "I'm looking for work" },
  other: { ar: "شيء آخر", en: "Something else" },
};

export type Profile = {
  status: StatusId | null;
  field: FieldId | null;
  interest: InterestId | null;
  /** The answer to the old single question, for plays from before 2026-10-07. */
  legacy: Bi | null;
};

/** A stored game_plays.field read back. */
export function readProfile(stored: string | null): Profile {
  const none: Profile = { status: null, field: null, interest: null, legacy: null };
  if (!stored) return none;
  const [status, answer] = stored.split(":");
  if (answer === undefined) return { ...none, legacy: LEGACY_FIELDS[stored] ?? null };
  if (profileCode(status, answer) === null) return none;
  return status === "none"
    ? { ...none, status, interest: answer as InterestId }
    : { ...none, status: status as StatusId, field: answer as FieldId };
}

/** The two answers as text, "" where there is none. */
export function profileText(stored: string | null, lang: Lang): { status: string; answer: string } {
  const p = readProfile(stored);
  const label = (c: Choice | Bi | null | undefined) => (c ? c[lang] : "");
  if (p.legacy) return { status: "", answer: label(p.legacy) };
  return {
    status: label(STATUSES.find((s) => s.id === p.status)),
    answer: label(
      FIELDS.find((f) => f.id === p.field) ?? INTERESTS.find((i) => i.id === p.interest),
    ),
  };
}

/* What the page receives. */
export type ServedQuestion = {
  index: number;
  total: number;
  difficulty: "easy" | "medium" | "hard";
  text: Bi;
  /** In the order this player sees them. */
  options: { ar: string[]; en: string[] };
  limitMs: number;
  remainingMs: number;
  hintUsed: boolean;
  /** The hint for this question once it was asked for. */
  hint: Bi | null;
};

export type ReviewItem = {
  index: number;
  text: Bi;
  chosen: Bi | null;
  correct: Bi;
  ok: boolean;
  explanation: Bi;
};

export type PlayResult = {
  score: number;
  total: number;
  level: Level;
  percent: number;
  review: ReviewItem[];
};

export type Reward = {
  code: string;
  percent: number;
  expiresAt: string;
  level: Level;
  score: number;
};

export type PlayState =
  | { phase: "question"; playId: string; score: number; question: ServedQuestion }
  | { phase: "result"; playId: string; result: PlayResult; claimed: boolean };

export type AnswerOutcome = {
  correct: boolean;
  timedOut: boolean;
  correctShown: number;
  explanation: Bi;
  score: number;
  /** The next question's index; the page asks for it when the player taps Next. */
  nextIndex: number | null;
  result: PlayResult | null;
};

export type ClaimOutcome =
  | { status: "claimed" | "already_claimed"; reward: Reward; emailed: boolean }
  | {
      status:
        | "not_found"
        | "not_finished"
        | "no_account"
        | "guest"
        | "play_claimed"
        | "device_claimed";
    };

/** A random order of 0..n-1. */
export function shuffledOrder(
  n: number,
  random: (n: number) => Uint32Array = randomUint32,
): number[] {
  const order = Array.from({ length: n }, (_, i) => i);
  const rnd = random(n);
  for (let i = n - 1; i > 0; i--) {
    const j = rnd[i] % (i + 1);
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}

function randomUint32(n: number): Uint32Array {
  const out = new Uint32Array(n);
  crypto.getRandomValues(out);
  return out;
}

/** Device ids and link codes as the server accepts them. */
export const DEVICE_ID_RE = /^[A-Za-z0-9_-]{8,64}$/;

/* ---------- who is playing (the first screen) ---------- */

export const PLAYER_NAME_MAX = 120;
export const PLAYER_EMAIL_MAX = 255;
export const PLAYER_PHONE_MAX = 40;

/** A plain address check for the form; the server parses it with zod again. */
export function isEmailLike(v: string): boolean {
  return v.length <= PLAYER_EMAIL_MAX && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());
}

const ARABIC_NAME_RE = /^[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF\s]+$/;

/** The learning platform's name rule, as on certificates: three Arabic words.
    Same check as the sign-up page and createLmsAccount. */
export function isArabicTripleName(v: string): boolean {
  const t = v.trim();
  if (t.length < 5 || t.length > PLAYER_NAME_MAX || !ARABIC_NAME_RE.test(t)) return false;
  return t.split(/\s+/).filter((part) => part.length >= 2).length >= 3;
}
export const LINK_SLUG_RE = /^[a-z0-9][a-z0-9-]{1,39}$/;

/** The booth QR link. Plain /texpo, and a stopped or unknown link, count under it. */
export const MAIN_LINK_SLUG = "booth";
/** Texpo coupons work only on the courses of this category (Generative AI). */
export const COUPON_CATEGORY_SLUG = "generative-ai";

/** "Booth QR – Day 2" -> "booth-qr-day-2"; Arabic-only labels fall back to a random code. */
export function slugFromLabel(label: string, random: () => string = randomSlug): string {
  const s = label
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32)
    .replace(/-+$/g, "");
  return LINK_SLUG_RE.test(s) ? s : random();
}

function randomSlug(): string {
  const bytes = new Uint8Array(4);
  crypto.getRandomValues(bytes);
  return "l" + Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}
