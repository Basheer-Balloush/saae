/* Texpo game: the pieces both the page and the server need. The questions and
   their answers stay on the server (questions.server.ts); the page only ever
   sees a question after it is served and its answer after it is sent. */

export type Lang = "ar" | "en";
export type Bi = { ar: string; en: string };

export const TEXPO_GAME = "texpo";
export const QUESTION_COUNT = 10;
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
      ar: "كل خبير بدأ من هنا. كوبون 20٪ خطوتك الأولى.",
      en: "Every expert started here. Your 20% coupon is a first step.",
    },
  },
  intermediate: {
    percent: 35,
    name: { ar: "متوسط", en: "Intermediate" },
    line: {
      ar: "تستخدم الذكاء الاصطناعي بوعي. طوّر مهاراتك مع خصم 35٪.",
      en: "You use AI with good sense. Go further with 35% off.",
    },
  },
  professional: {
    percent: 50,
    name: { ar: "محترف", en: "Professional" },
    line: {
      ar: "مذهل! تعرف الذكاء الاصطناعي جيداً. خصم 50٪ لك.",
      en: "Impressive! You really know your AI. 50% off is yours.",
    },
  },
};

/** 0–4 right: beginner, 5–7: intermediate, 8–10: professional. */
export function levelFor(score: number): Level {
  if (score >= 8) return "professional";
  if (score >= 5) return "intermediate";
  return "beginner";
}

/* The two questions before the game. Not graded; they go to the CRM. */
export const FIELDS = [
  { id: "study", ar: "أدرس", en: "I study" },
  { id: "tech", ar: "أعمل في التقنية أو الهندسة", en: "I work in tech or engineering" },
  {
    id: "design",
    ar: "أعمل في التصميم أو الإعلام أو صناعة المحتوى",
    en: "I work in design, media or content",
  },
  {
    id: "business",
    ar: "أدير عملاً أو أعمل في الإدارة",
    en: "I run a business or work in management",
  },
  { id: "teach", ar: "أعلّم أو أدرّب", en: "I teach or train" },
  { id: "job", ar: "أبحث عن عمل", en: "I'm looking for work" },
  { id: "other", ar: "شيء آخر", en: "Something else" },
] as const;
export type FieldId = (typeof FIELDS)[number]["id"];

export const AI_USES = [
  { id: "daily", ar: "يومياً", en: "Every day" },
  { id: "weekly", ar: "أسبوعياً", en: "Every week" },
  { id: "tried", ar: "جرّبتها بضع مرات", en: "I've tried it a few times" },
  { id: "never", ar: "لم أجرّبها بعد", en: "Not yet" },
] as const;
export type AiUseId = (typeof AI_USES)[number]["id"];

/** Abu Al-Joud's answer to the "what do you do" pick. */
export const FIELD_REPLIES: Record<FieldId, Bi> = {
  study: {
    ar: "طالب علم! الذكاء الاصطناعي رفيق دراسة رائع. لنرَ ما تعرفه.",
    en: "A student! AI can be a great study partner. Let's see what you know.",
  },
  tech: {
    ar: "من أهل التقنية! هذه أسئلة عن الاستخدام اليومي، فلا تُفرط في التفكير.",
    en: "A tech person! These are everyday questions, so don't overthink them.",
  },
  design: {
    ar: "مبدع! أدوات الصور والنصوص صارت جزءاً من عملك. لنبدأ.",
    en: "A creative! Image and writing tools are part of your work now. Let's go.",
  },
  business: {
    ar: "رائد أعمال! الذكاء الاصطناعي يوفّر الوقت والمال. لنرَ معلوماتك.",
    en: "A business mind! AI saves time and money. Let's test what you know.",
  },
  teach: {
    ar: "معلّم! هذه المرة سأكون أنا من يطرح الأسئلة.",
    en: "A teacher! This time I'm the one asking the questions.",
  },
  job: {
    ar: "بالتوفيق في بحثك! مهارات الذكاء الاصطناعي تفتح أبواباً كثيرة.",
    en: "Good luck with the search! AI skills open a lot of doors.",
  },
  other: {
    ar: "أهلاً بك! لا يهم مجالك، فالذكاء الاصطناعي في كل مكان.",
    en: "Welcome! Whatever you do, AI is everywhere now.",
  },
};

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
  | { status: "not_found" | "not_finished" | "no_account" | "guest" | "play_claimed" };

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
export const LINK_SLUG_RE = /^[a-z0-9][a-z0-9-]{1,39}$/;

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
