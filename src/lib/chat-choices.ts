/* The assistant marks a question's answers so the widget can show them as buttons:
   the last line of its message is [[choices: A | B | C]]. The marker is stripped
   from what the visitor reads, and a message without one simply has no buttons.

   The line arrives dressed in whatever the model felt like adding — backticks
   copied from the prompt's example, a full stop, and, in Arabic, invisible
   direction marks. So the line is matched as a line, not by an exact shape. */

const MARKER = /\[\[\s*choices\s*:\s*([^\]]+)\]\]/i;
// Backticks, punctuation, and bidi controls may sit around the marker on its line.
const DECORATION = /[`\s.,;!?؛،؟​-‏‪-‮⁦-⁩]/g;
const LINES_FROM_END = 3;
const MAX_CHOICES = 6;
const MAX_LABEL = 60;

export function parseChoices(text: string): { text: string; choices: string[] } {
  const lines = text.split(/\r?\n/);
  const first = Math.max(0, lines.length - LINES_FROM_END);
  for (let i = lines.length - 1; i >= first; i--) {
    const match = lines[i].match(MARKER);
    if (!match) continue;
    // Only a line that is *just* the marker: one embedded in a sentence is the
    // assistant talking about it, not offering answers.
    if (lines[i].replace(match[0], "").replace(DECORATION, "").length > 0) continue;

    const choices = match[1]
      .split("|")
      .map((choice) => choice.trim().replace(/^\d+[).\-\s]+/, "").trim())
      .filter((choice) => choice.length > 0 && choice.length <= MAX_LABEL)
      .slice(0, MAX_CHOICES);
    if (choices.length === 0) continue;

    lines.splice(i, 1);
    return { text: lines.join("\n").trimEnd(), choices };
  }
  return { text, choices: [] };
}
