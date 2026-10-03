#!/usr/bin/env node
/* Asks Abu Al-Joud real visitor questions and checks each answer.
   Usage: node scripts/chat-eval.mjs [base-url]   (default https://www.aisyria.org)
   Every question runs in a fresh chat session. Each case lists patterns the
   answer must contain and patterns it must not; a case passes when all hold.
   Answers that send the visitor to the email or phone are counted apart: that
   should be the last resort, so the count should stay near zero. */

const BASE = (process.argv[2] || "https://www.aisyria.org").replace(/\/$/, "");
const CONTACT = /info@aisyria\.org|930 763 547/;

const CASES = [
  // Courses: by exact name, with typos, and details the course page shows.
  {
    q: "دورة الذكاء الاصطناعي التوليدي 09: شو موعدها ومكانها وسعرها وهل التسجيل مفتوح؟",
    must: [/10-04|4 تشرين|٤|تشرين الأول|أكتوبر/, /دمشق|مقر الجمعية/, /500/],
    mustNot: [/ما قدرت أحدد/],
  },
  { q: "ماهي دورة الذكا االاصطناعي التوليدي؟", must: [/التوليدي/], mustNot: [/ما قدرت أحدد|غير موجودة/] },
  { q: "مين المدرب بدورة الذكاء الاصطناعي التوليدي 09؟ وشو الأيام؟", must: [/الأحد|الثلاثاء|الخميس/] },
  {
    q: "احكيلي عن دورة المنهجية الحديثة في هندسة البرمجيات وهل فيني سجّل فيها؟",
    must: [/انتهت|منتهية/],
    mustNot: [/التسجيل مفتوح/],
  },
  { q: "بدي شي دورة مجانية", must: [/مجاني/] },
  // Internships: the published MultiOmics opportunity was denied to visitors.
  {
    q: "كان في فرصة تدريب بالمعلوماتية الحيوية مع MultiOmics، كيف بقدم؟",
    must: [/MultiOmics|المعلوماتية الحيوية/, /internships\//],
    mustNot: [/غير مدرجة|غير موجودة|غير متوفرة/],
  },
  { q: "شو فرص التدريب العملي المتاحة حالياً؟", must: [/internships/] },
  // Partners: a closed list.
  { q: "هل منظمة SYNC شريكة للجمعية؟", must: [/غير مذكورة|ليست|لا تظهر|ليس/], mustNot: [/^نعم/] },
  { q: "مين شركاء الجمعية؟", must: [/partners/], mustNot: [/SYNC|اليونيسف|UNICEF|Sarda Tech/] },
  // Things the old prompt invented.
  { q: "شو مشاريع الجمعية البارزة؟", mustNot: [/معافى|مُعافى|قانوني|القمح|جسور التعليم/] },
  { q: "عندكم معسكرات AI Kids للأطفال؟", mustNot: [/نعم،? (عندنا|لدينا)/] },
  // News and the initiative.
  { q: "شو آخر أخبار الجمعية؟", must: [/2026|حزيران|تموز|مليون|المدربين/] },
  { q: "كم مقعد ممول بمبادرة المليون ومين الرعاة؟", must: [/1,?200|١٢٠٠/, /elm/i] },
  // Knowledge base.
  { q: "كيف بتحقق من شهادة صادرة عن الجمعية؟", must: [/verify/] },
  { q: "بدي صير مدرب معكم شو الخطوات؟", must: [/trainer-apply|اعتماد/] },
  { q: "شو المجتمعات التخصصية بالجمعية؟", must: [/ثمان|8/, /البيانات/] },
  // Tone: warm Damascene courtesy in Arabic.
  { q: "شكراً كتير على المساعدة", must: [/ولو|تسلم|العفو|الله يسلمك|واجب|على راسي|بالخدمة/] },
  { q: "بدي تفاصيل دورة الذكاء الاصطناعي التوليدي 09 لو سمحت", must: [/على عيني|على راسي|من عيوني|تكرم|حاضر|تؤمر|أكيد/] },
  // English.
  { q: "Do you have any internships open right now?", must: [/internships/] },
  { q: "Is UNICEF a partner of SAAE?", must: [/not/i] },
];

async function ask(question) {
  const sessionId = `eval-${Math.random().toString(36).slice(2, 10)}`;
  const res = await fetch(`${BASE}/api/chat`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: "https://www.aisyria.org" },
    body: JSON.stringify({
      sessionId,
      lang: /[؀-ۿ]/.test(question) ? "ar" : "en",
      messages: [{ id: "u1", role: "user", parts: [{ type: "text", text: question }] }],
    }),
  });
  if (!res.ok) return { text: "", error: `HTTP ${res.status}` };
  const raw = await res.text();
  let text = "";
  for (const line of raw.split("\n")) {
    if (!line.startsWith("data: ")) continue;
    try {
      const event = JSON.parse(line.slice(6));
      if (event.type === "text-delta") text += event.delta;
    } catch {
      // keep-alive or [DONE]
    }
  }
  return { text };
}

let passed = 0;
let contact = 0;
for (const c of CASES) {
  const { text, error } = await ask(c.q);
  const failures = [
    ...(error ? [error] : []),
    ...(c.must ?? []).filter((re) => !re.test(text)).map((re) => `missing ${re}`),
    ...(c.mustNot ?? []).filter((re) => re.test(text)).map((re) => `has ${re}`),
  ];
  if (CONTACT.test(text)) contact += 1;
  if (failures.length === 0) passed += 1;
  console.log(`${failures.length ? "✗" : "✓"} ${c.q}`);
  if (failures.length) console.log(`    ${failures.join("; ")}\n    → ${text.replace(/\s+/g, " ").slice(0, 300)}`);
}
console.log(`\n${passed}/${CASES.length} passed · ${contact} answers sent the visitor to email/phone`);
process.exitCode = passed === CASES.length ? 0 : 1;
