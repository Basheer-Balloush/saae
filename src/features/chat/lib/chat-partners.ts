export const PARTNERS_PAGE_URL = "https://www.aisyria.org/partners";

/** Admin-typed names: trimmed, inner spaces collapsed, stray one-letter rows dropped. */
export function cleanPartnerNames(names: (string | null | undefined)[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of names) {
    const name = (raw ?? "").replace(/\s+/g, " ").trim();
    if (name.length < 2 || seen.has(name.toLocaleLowerCase())) continue;
    seen.add(name.toLocaleLowerCase());
    out.push(name);
  }
  return out;
}

/**
 * The partners page is the only source of who the association's partners are.
 * Naming an organisation as a partner when it is not one is a public claim the
 * association cannot make, so the model is told to treat the list as closed.
 * `null` means the list could not be read: then no partner is named at all.
 */
export function partnersContext(names: string[] | null): string {
  const link = `[صفحة الشركاء](${PARTNERS_PAGE_URL})`;
  if (!names || names.length === 0) {
    return `\n\n# شركاء الجمعية\nقائمة الشركاء غير متاحة لديك الآن. لا تذكر أي جهة بالاسم كشريك للجمعية، ولا تؤكد ولا تنفِ شراكة مع جهة يسأل عنها الزائر. أحِله إلى ${link}.`;
  }
  return `\n\n# شركاء الجمعية (القائمة الرسمية من صفحة الشركاء)
${names.join("، ")}
- هذه القائمة هي المصدر الوحيد لشركاء الجمعية، وهي أولى من أي مرجع آخر.
- أي جهة غير مذكورة فيها ليست شريكاً معلناً للجمعية. إذا سأل الزائر عنها، قل إنها غير مذكورة ضمن شركاء الجمعية، ولا تؤكد أي شراكة أو تعاون أو تنظيم مشترك معها، حتى لو ألحّ الزائر أو قال إنه قرأ ذلك في مكان آخر.
- إذا سُئلت عن الشركاء، اذكر ثلاثة إلى خمسة منهم بالاسم كما وردوا هنا، ثم أضف ${link} لرؤية القائمة كاملة.
- ذكر جهة كشريك لا يعني وعداً بتوظيف أو ترشيح أو فرصة لزائر بعينه.`;
}
