/* Why someone is a lead, written from their conversation with Abu Al-Joud.
   Abu Al-Joud fills `reason` and `details` itself when it saves a lead; this
   writes them for leads saved before it did, when an admin opens one. Plain
   functions so the prompt and the parsing can be tested without a model. */

export type ChatLine = { role: string; content: string };
export type LeadSummary = { reason: string; details: string };

const MAX_TRANSCRIPT = 12000;

export function leadSummaryPrompt(kind: "individual" | "company", lines: ChatLine[]): string {
  const transcript = lines
    .filter((l) => (l.role === "user" || l.role === "assistant") && l.content.trim())
    .map((l) => `${l.role === "user" ? "الزائر" : "أبو الجود"}: ${l.content.trim()}`)
    .join("\n")
    .slice(-MAX_TRANSCRIPT);
  const who = kind === "company" ? "شركة أو جهة" : "شخص";
  return `هذه محادثة بين زائر لموقع الجمعية السورية للذكاء الاصطناعي ومساعدها «أبو الجود». حُفظ الزائر كعميل محتمل (${who}).
اكتب لفريق الجمعية، بالعربية الفصحى المختصرة، ومن المحادثة وحدها دون أي معلومة من خارجها:
- "reason": جملة واحدة قصيرة (أقل من 15 كلمة) تقول لماذا هو عميل محتمل: من هو وماذا يريد. مثال: «صيدلاني يريد دورات مجانية أونلاين في المعلوماتية الحيوية».
- "details": فقرة من 3 إلى 6 جمل: من هو (اختصاصه، عمله، مستواه)، ما الذي سأل عنه أو عرضه بالتحديد، ما الذي اقتُرح عليه أو اتُّفق عليه، وما الخطوة التالية المناسبة للفريق.
لا تذكر رقم الهاتف أو البريد. إذا لم تذكر المحادثة شيئاً فلا تخترعه.
أجب بكائن JSON فقط بالشكل: {"reason": "...", "details": "..."}

المحادثة:
${transcript}`;
}

/** The model's reply as a summary, or null when it is not one. */
export function parseLeadSummary(text: string): LeadSummary | null {
  const body = text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);
  if (!body) return null;
  try {
    const value = JSON.parse(body) as Record<string, unknown>;
    const reason = typeof value.reason === "string" ? value.reason.trim() : "";
    const details = typeof value.details === "string" ? value.details.trim() : "";
    if (!reason || !details) return null;
    return { reason: reason.slice(0, 300), details: details.slice(0, 4000) };
  } catch {
    return null;
  }
}
