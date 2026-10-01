/* Whether a visitor's message is worth a knowledge search. The search costs an
   embedding call before the answer can start, and a button press ("طالب أو خريج")
   or a greeting asks for no association facts. Anything else is searched: a
   missed search makes a worse answer, an extra one only a slower one. */

const GREETING =
  /^(hi|hello|hey|thanks|thank you|ok|okay|yes|no|سلام|السلام عليكم|مرحبا|مرحباً|أهلا|أهلاً|اهلا|هلا|شكرا|شكراً|تمام|نعم|لا|أكيد|اوكي|أوكي)$/i;
const PUNCTUATION = /[\s.,!?؟،؛:…"'«»()-]+/g;

export function needsKnowledgeSearch(text: string, offeredChoices: string[] = []): boolean {
  const t = text.trim();
  if (t.length <= 4) return false;
  if (offeredChoices.some((choice) => choice.trim() === t)) return false;
  return !GREETING.test(t.replace(PUNCTUATION, " ").trim());
}
