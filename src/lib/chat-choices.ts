/* The assistant marks a question's answers so the widget can show them as buttons:
   the last line of its message is [[choices: A | B | C]]. The marker is stripped
   from what the visitor reads, and a message without one simply has no buttons. */

// The model often wraps the line in backticks, copying the prompt's own example,
// and sometimes adds a full stop. All of that still means "these are the answers".
const MARKER = /`{0,3}\s*\[\[\s*choices\s*:\s*([^\]]+)\]\]\s*`{0,3}[.\s]*$/i;
const MAX_CHOICES = 6;
const MAX_LABEL = 60;

export function parseChoices(text: string): { text: string; choices: string[] } {
  const match = text.match(MARKER);
  if (!match) return { text, choices: [] };
  const choices = match[1]
    .split("|")
    .map((c) => c.trim().replace(/^\d+[).\-\s]+/, "").trim())
    .filter((c) => c.length > 0 && c.length <= MAX_LABEL)
    .slice(0, MAX_CHOICES);
  return { text: text.replace(MARKER, "").trimEnd(), choices };
}
