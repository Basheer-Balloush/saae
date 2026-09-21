/* The chat window shows plain text, so any markdown the model emits arrives as
   literal **stars** and ### hashes. Bold is worth keeping — it is rendered as
   bold — and the rest of the markup is removed rather than shown. */

export type Segment = { text: string; bold: boolean };

export function formatMessage(text: string): Segment[] {
  const cleaned = text
    .replace(/^#{1,6}\s+/gm, "") // heading hashes
    .replace(/^\s*[-*]\s+/gm, "• ") // bullets the model writes as - or *
    .replace(/__(.+?)__/gs, "**$1**"); // treat __x__ as bold too

  const segments: Segment[] = [];
  const bold = /\*\*(.+?)\*\*/gs;
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = bold.exec(cleaned)) !== null) {
    if (match.index > last) segments.push({ text: cleaned.slice(last, match.index), bold: false });
    segments.push({ text: match[1], bold: true });
    last = match.index + match[0].length;
  }
  if (last < cleaned.length) segments.push({ text: cleaned.slice(last), bold: false });
  // Any stray marker left over (an unclosed **) is noise, not content.
  return segments
    .map((s) => ({ ...s, text: s.text.replace(/\*\*/g, "") }))
    .filter((s) => s.text.length > 0);
}
