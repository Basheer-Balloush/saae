/** Facts the visitor already volunteered, derived only from trusted user turns. */
export function knownVisitorFacts(userTurns: string[]): string[] {
  const text = userTurns.join("\n").toLocaleLowerCase();
  const facts: string[] = [];
  if (/(?:طالب|طالبة|student|graduate)/i.test(text)) facts.push("role=student_or_graduate");
  if (/(?:طب|طبي|طبية|الرعاية الصحية|healthcare|medical)/i.test(text))
    facts.push("field=healthcare");
  if (/(?:ما بعرف برمجة|لا أعرف البرمجة|لا اعرف البرمجة|no programming|can't code)/i.test(text))
    facts.push("programming_experience=none");
  if (/(?:مبتدئ(?:ة)? تماماً|من الصفر|new to ai|complete beginner)/i.test(text))
    facts.push("ai_level=beginner");
  return facts;
}
