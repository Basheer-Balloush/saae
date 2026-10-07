/* What an API caller must never receive: the assistant's own instructions.
   The prompt tells the model not to reveal them, but a determined caller can
   script thousands of attempts, so every API answer is checked before it is
   sent. An answer is held back when it names the assistant's internals (a tool,
   "system prompt", a step label of the intake script) or copies a long run of
   the instruction text word for word.

   Not every part of the prompt is secret. The association's reference section
   (identity, Texpo rules, contact) and the lines the assistant is told to say
   («…», "…", the answer buttons) are what it should say: runs of words found
   there do not count as copied. A paraphrase or translation of the instructions
   is not caught here; the prompt's own rule is the defence against that. */

export type LeakVerdict = null | "internal_term" | "copied_instructions";

const REFERENCE_START = "# === مرجع المعرفة الوحيد";
const REFERENCE_END = "# === نهاية المرجع ===";

/** The assistant's tools; tests/unit/chat-api-guard.test.ts fails when chat.ts gains one not listed here. */
export const TOOL_NAMES = [
  "find_courses",
  "get_course_details",
  "find_internships",
  "latest_news",
  "initiative_status",
  "search_knowledge",
  "send_to_team",
  "save_visitor_profile",
  "submit_individual_lead",
  "submit_company_lead",
] as const;

const SHINGLE = 8;
// Copied words that make an answer a recital: many words, or fewer words taken
// from several separate lines of the rules. Telling a company what the
// association offers borrows two lines of the prompt (24 words); four recited
// rules copy over 60.
const MAX_COPIED_WORDS = 40;
const MAX_COPIED_ACROSS_LINES = { words: 24, lines: 3 };

export const normalizeWords = (text: string): string[] =>
  text
    .replace(/[ً-ٰٟـ]/g, "") // harakat, dagger alif, tatweel
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);

const shingles = (words: string[]): string[] => {
  const out: string[] = [];
  for (let i = 0; i + SHINGLE <= words.length; i++) out.push(words.slice(i, i + SHINGLE).join(" "));
  return out;
};

/** The prompt split into its instructions and what the assistant may say word for word. */
export function splitPrompt(prompt: string): { instructions: string; sayable: string[] } {
  const start = prompt.indexOf(REFERENCE_START);
  const end = prompt.indexOf(REFERENCE_END);
  const hasReference = start !== -1 && end > start;
  const instructions = hasReference
    ? prompt.slice(0, start) + prompt.slice(end + REFERENCE_END.length)
    : prompt;
  const sayable = [
    ...(hasReference ? [prompt.slice(start, end)] : []),
    ...(instructions.match(/«[^»]*»|“[^”]*”|"[^"\n]*"/g) ?? []),
    ...instructions.split("\n").filter((line) => /\[\[\s*choices/i.test(line)),
  ];
  return { instructions, sayable };
}

const INTERNAL = [
  new RegExp(`\\b(?:${TOOL_NAMES.join("|")})\\b`, "i"),
  /\bsystem\s+(?:prompt|message|instructions?)\b/i,
  // Step labels of the intake script at the start of a line: أ1) ب2) د4) هـ1) م3)
  /^\s*(?:أ|ب|ج|د|هـ|م)[1-9١-٩]\)/m,
];
// Matched on normalised words, so spelling with or without hamza or harakat is the same.
const INTERNAL_WORDS = [
  "تعليمات النظام",
  "موجّه النظام",
  "برومبت النظام",
  "قاعدة معرفة الأدمن",
  "المراجع الإضافية",
  "مرجع المعرفة الوحيد",
].map((phrase) => normalizeWords(phrase).join(" "));

export function createLeakGuard(systemPrompt: string) {
  const { instructions, sayable } = splitPrompt(systemPrompt);
  const allowed = new Set(sayable.flatMap((text) => shingles(normalizeWords(text))));
  // Each run of the instructions, with the line it starts on.
  const words: string[] = [];
  const lineOf: number[] = [];
  instructions.split("\n").forEach((line, n) => {
    for (const word of normalizeWords(line)) {
      words.push(word);
      lineOf.push(n);
    }
  });
  const secret = new Map<string, number>();
  shingles(words).forEach((gram, i) => {
    if (!allowed.has(gram) && !secret.has(gram)) secret.set(gram, lineOf[i]);
  });

  return function check(reply: string): LeakVerdict {
    if (INTERNAL.some((re) => re.test(reply))) return "internal_term";
    const replyWords = normalizeWords(reply);
    const joined = ` ${replyWords.join(" ")} `;
    if (INTERNAL_WORDS.some((phrase) => joined.includes(` ${phrase} `))) return "internal_term";

    const copied = new Array<boolean>(replyWords.length).fill(false);
    const lines = new Set<number>();
    shingles(replyWords).forEach((gram, i) => {
      const line = secret.get(gram);
      if (line === undefined) return;
      lines.add(line);
      for (let j = i; j < i + SHINGLE; j++) copied[j] = true;
    });
    const count = copied.filter(Boolean).length;
    const recited =
      count >= MAX_COPIED_WORDS ||
      (count >= MAX_COPIED_ACROSS_LINES.words && lines.size >= MAX_COPIED_ACROSS_LINES.lines);
    return recited ? "copied_instructions" : null;
  };
}
