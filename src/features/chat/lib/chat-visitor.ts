/* Who the visitor is, read from what they have written so far. The model was
   left to notice this itself and missed it: a payments provider's relations
   coordinator offering a partnership ("حابين نكون وسيلة دفع إلكتروني عندكم")
   was treated, and saved, as a learner. The clues are phrases a person uses
   about themself; asking about the association's partners or companies
   ("مين شركاء الجمعية؟") is not one. The result is a hint for the model, never
   a decision on its own. */

export type VisitorKind = "company" | "trainer" | "learner";
export type VisitorRead = { kind: VisitorKind; cues: string[] } | null;

const normalize = (text: string) =>
  text
    .replace(/[ً-ٰٟـ]/g, "") // harakat and tatweel
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .toLowerCase();

// Not جامعة/معهد/منصة: "انا بالجامعة" is a student at one, "انا بالمنصة" a user of it.
const ORG = "(?:شرك[ةه]|مؤسس[ةه]|منظم[ةه]|جه[ةه]|مركز|بنك|مصرف)";

const RULES: Record<VisitorKind, RegExp[]> = {
  company: [
    // "our company", "my company"
    /(?:شركتنا|شركتي|مؤسستنا|مؤسستي|منظمتنا|جهتنا|مركزنا|معهدنا|منصتنا|تطبيقنا|بنكنا)/,
    // "I am from / I work at a company…"
    new RegExp(`(?:انا|احنا|نحنا|نحن)\\s+(?:من|ب|في|بال|مع)?\\s*${ORG}`),
    // a role that speaks for an organisation
    /(?:منسق|مدير|مديره|ممثل|مندوب|مسؤول|مسؤوله|رئيس)\s+(?:ال)?(?:علاقات|اعمال|الاعمال|مبيعات|تسويق|شراكات|تطوير|قسم|فرع)/,
    /بالنياب[ةه] عن\s+\S+/, // not "باسم": also a first name
    // "company owner", the journey's own button, and its kin
    /(?:صاحب|صاحبه|مالك|مالكه|مؤسس)\s+(?:ال)?(?:شرك[ةه]|مؤسس[ةه]|جه[ةه]|مركز|معهد)/,
    /(?:شغل|اعمال|عمل)\s+شركتي/,
    // offering something to the association
    /(?:حابين|بدنا|منحب|نحب|نرغب|ناوين)\s+(?:نكون|نتعاون|نشارك|نقدم|نرعي|نمول|نتشارك|نعمل)/,
    /(?:نقدم|منقدم|بنقدم)\s+(?:خدم[ةه]|خدمات|حلول|حل)/,
    /(?:عرض|اقتراح)\s+(?:شراك[ةه]|تعاون)/,
    /(?:رعاي[ةه]|نرعي|نمول|تمويل)\s+(?:ل|مقاعد|المبادر[ةه]|برنامج)/,
    /تدريب\s+(?:موظفين|موظفينا|الموظفين|فريقنا|كوادرنا)/,
    /\b(?:our company|our organi[sz]ation|on behalf of|we offer|we provide|we would like to partner|sponsor(?:ship)?)\b/,
  ],
  trainer: [
    /(?:انا|انا)\s+(?:مدرب|مدربه|مدرس|مدرسه|استاذ|استاذه|محاضر|محاضره)/,
    /(?:بدي|حابب|حابه|بحب)\s+(?:اعطي|قدم|اقدم|درّس|درس)\s+(?:دور[ةه]|دورات|كورس|ورش[ةه])/,
    /بدي\s+صير\s+مدرب/,
    /\b(?:i am a trainer|i'm a trainer|i want to teach)\b/,
  ],
  learner: [
    /(?:انا|انا)\s+(?:طالب|طالبه|خريج|خريجه|مبتدئ|مبتدئه)/,
    /(?:بدي|حابب|حابه)\s+(?:اتعلم|تعلم|سجل\s+بدور[ةه])/,
    /\b(?:i am a student|i'm a student|i want to learn)\b/,
  ],
};

const ORDER: VisitorKind[] = ["company", "trainer", "learner"];

export function readVisitor(userTurns: string[]): VisitorRead {
  const text = normalize(userTurns.join("\n"));
  for (const kind of ORDER) {
    const cues = RULES[kind]
      .map((re) => text.match(re)?.[0]?.trim())
      .filter((cue): cue is string => !!cue);
    if (cues.length) return { kind, cues: [...new Set(cues)].slice(0, 3) };
  }
  return null;
}

/** The note the model gets about who it is talking to; empty when unknown. */
export function visitorContext(read: VisitorRead): string {
  if (!read) return "";
  const cues = read.cues.map((c) => `«${c}»`).join("، ");
  const what: Record<VisitorKind, string> = {
    company:
      "يبدو أن الزائر يتحدث باسم شركة أو جهة، أو يعرض خدمة أو شراكة على الجمعية. تعامل معه كشركة طوال المحادثة: افهم ما يعرضه أو يحتاجه، واطلب اسم الجهة واسمه وصفته وهاتفه أو بريده، واحفظ بـ `submit_company_lead`.",
    trainer:
      "يبدو أن الزائر مدرّب أو يريد التدريس مع الجمعية. وجّهه إلى طريق اعتماد المدربين ومجتمع المدربين.",
    learner: "يبدو أن الزائر يسأل لنفسه كمتعلّم. وجّهه إلى الدورات وفرص التدريب والمسار المناسب.",
  };
  return `\n\n# من يحادثك (تقدير من كلامه، ليس يقيناً)\n${what[read.kind]}\nالدلائل من كلامه: ${cues}.\nإذا ناقض كلامه اللاحق هذا التقدير، فاتبع كلامه.`;
}
