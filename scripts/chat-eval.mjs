#!/usr/bin/env node
/* Asks Abu Al-Joud real visitor questions and checks each answer.
   Usage: node scripts/chat-eval.mjs [base-url]   (default https://www.aisyria.org)
   EVAL_PAUSE_MS sets the pause between questions (default 6000).
   Every question runs in a fresh chat session. Each case lists patterns the
   answer must contain and patterns it must not; a case passes when all hold.
   Answers that send the visitor to the email or phone are counted apart: that
   should be the last resort, so the count should stay near zero. */

const BASE = (process.argv[2] || "https://www.aisyria.org").replace(/\/$/, "");
// Each question can take several model calls (one per tool step); pacing keeps
// the run inside the provider's per-minute limit.
const PAUSE_MS = Number(process.env.EVAL_PAUSE_MS ?? 6000);
const CONTACT = /info@aisyria\.org|930 763 547/;

const CASES = [
  // Courses: by exact name, with typos, and details the course page shows.
  {
    q: "دورة الذكاء الاصطناعي التوليدي 09: شو موعدها ومكانها وسعرها وهل التسجيل مفتوح؟",
    // Started on 2026-10-04: the bot must say so rather than offer registration.
    must: [/بلّشت|بدأت|ما عم تستقبل|غير متاحة|مو متاحة/],
    mustNot: [/ما قدرت أحدد|التسجيل (مفتوح|متاح)/],
  },
  {
    q: "ماهي دورة الذكا االاصطناعي التوليدي؟",
    must: [/التوليدي/],
    mustNot: [/ما قدرت أحدد|غير موجودة/],
  },
  {
    q: "مين المدرب بدورة الذكاء الاصطناعي التوليدي 09؟ وشو الأيام؟",
    must: [/الأحد|الثلاثاء|الخميس/],
  },
  {
    q: "احكيلي عن دورة المنهجية الحديثة في هندسة البرمجيات وهل فيني سجّل فيها؟",
    must: [/انتهت|منتهية|خلصت|(غير|مو|مش) متاحة|ما في دورة/],
    mustNot: [/التسجيل مفتوح/],
  },
  { q: "بدي شي دورة مجانية", must: [/مجان/], mustNot: [/10,000|3,500|4,950/] },
  // A recommendation starts by asking about interests; a list request does not.
  { q: "اقترح علي دورات", must: [/\[\[choices:/], mustNot: [/courses\//] },
  {
    turns: ["اقترح علي دورات"],
    q: "الذكاء الاصطناعي وأدواته",
    must: [/courses\//],
    mustNot: [/تسويق 360|التوليدي 09/],
  },
  { q: "اقترح علي دورة بالإعلام والكتابة", must: [/التحرير الإعلامي/] },
  // Links are short clickable labels, not bare long URLs.
  {
    q: "عطيني رابط دورة الذكاء الاصطناعي التوليدي 09",
    must: [/\]\(https:\/\/www\.aisyria\.org\//],
  },
  // "Available" means joinable today: not started, deadline not passed, not ended.
  {
    q: "شو الدورات المتاحة حالياً؟",
    must: [/courses\//],
    // التوليدي 09 and إدارة الفرق started on 2026-10-04.
    mustNot: [
      /تسويق 360|تطوير المشروع البحثي|بناء الهوية التدريسية|المنهجية الحديثة|التوليدي 09|إدارة الفرق والمشاريع/,
    ],
  },
  {
    q: "بدي سجل بدورة تسويق 360",
    must: [/(موعد التسجيل|التسجيل).{0,12}(انتهى|خلص|مغلق)|انتهى موعد التسجيل|بلّشت|بدأت|ما عاد/],
    mustNot: [/التسجيل (مفتوح|متاح)/],
  },
  // A repeated question is answered again, not refused.
  {
    turns: ["عرّفني على الجمعية ورؤيتها"],
    q: "عرّفني على الجمعية ورؤيتها",
    must: [/الذكاء الاصطناعي/],
    mustNot: [/سبق وحكينا|سبق أن|كما ذكرت|ذكرت سابقاً/],
  },
  // Internships: the published MultiOmics opportunity was denied to visitors.
  {
    q: "كان في فرصة تدريب بالمعلوماتية الحيوية مع MultiOmics، كيف بقدم؟",
    must: [/MultiOmics|المعلوماتية الحيوية/, /internships\//],
    mustNot: [/غير مدرجة|غير موجودة|غير متوفرة/],
  },
  {
    q: "شو فرص التدريب العملي المتاحة حالياً؟",
    must: [/MultiOmics|المعلوماتية الحيوية/, /إدارة وتشغيل الأعمال/, /شركات ناشئة/],
  },
  // "فرص التدريب" means internships only, all of the open ones.
  {
    q: "شو فرص التدريب حاليا",
    must: [/MultiOmics|المعلوماتية الحيوية/, /إدارة وتشغيل الأعمال/, /شركات ناشئة/],
    mustNot: [/courses\//, /المعدات الطبية/],
  },
  // "Training programme" covers courses and internships alike.
  {
    q: "كم برنامج تدريبي متاح حاليا للتقديم ؟",
    must: [/MultiOmics|المعلوماتية الحيوية|إدارة وتشغيل|شركات ناشئة/, /courses\/|دورة|دورات/],
  },
  // No invented dialect words.
  {
    q: "بالنسبة الى مهندس ذكاء صنعي ai مثلي ...ما هي برامج التدريب التي قد تفيدني",
    mustNot: [/بهلكونه|عري عيني|فيكفي/],
  },
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
  // Gender-neutral unless the visitor says otherwise; no merged words like فيكفي.
  {
    q: "إذا لغيت تسجيلي قبل الدورة بيومين برجعولي المصاري؟",
    must: [/25/],
    mustNot: [/لغيتِ|تواصلي|تكرمي|فيكفي/],
  },
  { q: "أنا طالبة طب، شو بتنصحني؟", mustNot: [/فيكفي/] },
  { q: "شكراً كتير على المساعدة", must: [/ولو|تسلم|العفو|الله يسلمك|واجب|على راسي|بالخدمة/] },
  {
    q: "بدي تفاصيل دورة الذكاء الاصطناعي التوليدي 09 لو سمحت",
    must: [/على عيني|على راسي|من عيوني|تكرم|حاضر|تؤمر|أكيد/],
  },
  // A company offering a service is a company lead: collect its details, don't send it to the email first.
  {
    q: "أنا منسق علاقات بشركة كاش موبايل وحابين نكون وسيلة دفع إلكتروني عندكم",
    must: [/اسم|الاسم|بياناتك|رقم|تواصل/],
    mustNot: [/info@aisyria\.org/],
  },
  // The 2026-10-06 conversation: the visitor turns out to speak for a payments company.
  {
    turns: ["منصة فيها دفع الكتروني لشي", "مو مفكرين يحطو كاش موبايل MTN"],
    q: "لا بس وصل خبر انو حابين نكون وسيلة دفع الكتروني عندكم",
    must: [/اسم|الشركة|الجهة|بيانات|صفت/],
    mustNot: [/info@aisyria\.org/],
  },
  // Student and graduate are separate, and each is asked about their studies or work.
  {
    turns: ["رشّح لي مساراً مناسباً"],
    q: "خريج",
    must: [/اختصاص|درست/],
    mustNot: [/courses\//],
  },
  {
    turns: ["رشّح لي مساراً مناسباً"],
    q: "طالب",
    must: [/تدرس|سنة/],
    mustNot: [/courses\//],
  },
  // The 2026-10-06 company owner went through the learner questions and got a course.
  {
    turns: ["رشّح لي مساراً مناسباً"],
    q: "صاحب شركة أو جهة",
    must: [/اسم|شركتك/],
    mustNot: [/courses\/|مستواك|وين وصلت مع الذكاء|ساعة/],
  },
  {
    turns: [
      "رشّح لي مساراً مناسباً",
      "صاحب شركة أو جهة",
      "شركة النور للتجهيزات الطبية، منبيع أجهزة للمستشفيات",
    ],
    q: "استشارة لإدخال الذكاء الاصطناعي بشغلنا",
    must: [/\?|؟/],
    mustNot: [/courses\/|مستواك|ساعة/],
  },
  // English.
  { q: "Do you have any internships open right now?", must: [/internships/] },
  { q: "Is UNICEF a partner of SAAE?", must: [/not/i], mustNot: [/[\u0600-\u06FF]{4,}/] },
  {
    q: "Which courses are open for registration now?",
    mustNot: [/[\u0600-\u06FF]{6,}.*[\u0600-\u06FF]{6,}.*[\u0600-\u06FF]{6,}/, /Marketing 360/],
  },
];

async function ask(question, sessionId = `eval-${Math.random().toString(36).slice(2, 10)}`) {
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
      if (event.type === "error") return { text, error: `stream error: ${event.errorText ?? "?"}` };
    } catch {
      // keep-alive or [DONE]
    }
  }
  return { text };
}

let passed = 0;
let contact = 0;
for (const c of CASES) {
  // A case with turns replays them in one session; only the last reply is checked.
  const sessionId = `eval-${Math.random().toString(36).slice(2, 10)}`;
  for (const turn of c.turns ?? []) {
    await ask(turn, sessionId);
    await new Promise((r) => setTimeout(r, PAUSE_MS));
  }
  const { text, error } = await ask(c.q, sessionId);
  const failures = [
    ...(error ? [error] : []),
    ...(c.must ?? []).filter((re) => !re.test(text)).map((re) => `missing ${re}`),
    ...(c.mustNot ?? []).filter((re) => re.test(text)).map((re) => `has ${re}`),
  ];
  if (CONTACT.test(text)) contact += 1;
  if (failures.length === 0) passed += 1;
  console.log(`${failures.length ? "✗" : "✓"} ${c.q}`);
  await new Promise((r) => setTimeout(r, PAUSE_MS));
  if (failures.length)
    console.log(`    ${failures.join("; ")}\n    → ${text.replace(/\s+/g, " ").slice(0, 300)}`);
}
console.log(
  `\n${passed}/${CASES.length} passed · ${contact} answers sent the visitor to email/phone`,
);
process.exitCode = passed === CASES.length ? 0 : 1;
