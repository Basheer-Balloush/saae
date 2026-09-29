/* One pasted text or uploaded .md file can hold many knowledge entries. Each
   "## heading" starts a new entry with that heading as its title, so every
   entry is stored and searched on its own instead of being cut into
   1000-character pieces across entry boundaries. A text without "##"
   headings stays one entry under the title the admin typed.

   Markdown scaffolding that means nothing to the bot is dropped: ``` fence
   lines and --- separators. */

export type KnowledgeSection = { title: string; text: string };

const HEADING = /^##\s+(.+?)\s*#*\s*$/;
const NOISE = /^\s*(```.*|-{3,}|\*{3,}|_{3,})\s*$/;
const MIN_TEXT = 10;
const MAX_TITLE = 200;

function tidy(lines: string[]): string {
  return lines
    .filter((line) => !NOISE.test(line))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function splitKnowledgeSections(title: string, text: string): KnowledgeSection[] {
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  const sections: KnowledgeSection[] = [];
  let current: { title: string; lines: string[] } | null = null;
  const intro: string[] = [];

  for (const line of lines) {
    const heading = line.match(HEADING);
    if (heading) {
      if (current) sections.push({ title: current.title, text: tidy(current.lines) });
      current = { title: heading[1].trim().slice(0, MAX_TITLE), lines: [] };
    } else if (current) {
      current.lines.push(line);
    } else {
      intro.push(line);
    }
  }
  if (current) sections.push({ title: current.title, text: tidy(current.lines) });

  // No headings: the whole text is one entry.
  if (sections.length === 0) {
    const whole = tidy(intro);
    return whole.length >= MIN_TEXT ? [{ title: title.trim().slice(0, MAX_TITLE), text: whole }] : [];
  }
  // Text before the first heading (a file's own title or notes) is not an entry.
  return sections.filter((s) => s.text.length >= MIN_TEXT);
}
