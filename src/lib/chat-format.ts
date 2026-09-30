/* The chat window shows plain text, so any markdown the model emits arrives as
   literal **stars** and ### hashes. Bold is worth keeping — it is rendered as
   bold — and the rest of the markup is removed rather than shown. Web links,
   bare or written as [label](url), become link segments. */

export type Segment = { text: string; bold: boolean; href?: string };

// A markdown link, or a bare http(s) URL (stopping at spaces, brackets and quotes).
const LINK = /\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)|(https?:\/\/[^\s<>()[\]"'«»]+)/g;
// Sentence punctuation right after a bare URL belongs to the sentence.
const TRAILING = /[.,;:!?،؛؟]+$/;

/** Only http(s) links, and the association's own site always on www. */
export function safeHref(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.protocol !== "https:" && u.protocol !== "http:") return null;
    if (u.hostname === "aisyria.org") {
      u.hostname = "www.aisyria.org";
      u.protocol = "https:";
    }
    return u.toString();
  } catch {
    return null;
  }
}

function splitLinks(segment: Segment): Segment[] {
  const out: Segment[] = [];
  let last = 0;
  let match: RegExpExecArray | null;
  LINK.lastIndex = 0;
  while ((match = LINK.exec(segment.text)) !== null) {
    let raw = match[2] ?? match[3];
    let label = match[1];
    let end = match.index + match[0].length;
    if (!label) {
      const trail = raw.match(TRAILING)?.[0] ?? "";
      raw = raw.slice(0, raw.length - trail.length);
      end -= trail.length;
    }
    const href = safeHref(raw);
    if (!href) continue;
    if (match.index > last) out.push({ text: segment.text.slice(last, match.index), bold: segment.bold });
    const shortCourseLabel = href.includes("/learning-management-system/courses/")
      ? /[\u0600-\u06FF]/.test(segment.text)
        ? "تفاصيل الدورة"
        : "Course details"
      : href;
    out.push({ text: label ?? shortCourseLabel, bold: segment.bold, href });
    last = end;
    LINK.lastIndex = end;
  }
  if (last === 0) return [segment];
  if (last < segment.text.length) out.push({ text: segment.text.slice(last), bold: segment.bold });
  return out;
}

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
    .filter((s) => s.text.length > 0)
    .flatMap(splitLinks);
}

/* What the visitor reads when a reply fails. The server's stream errors are
   already worded for visitors (they carry the association's contacts); its
   early refusals and the browser's network errors are plain English, so they
   are reworded in the visitor's language. */
export function chatErrorText(message: string | undefined, lang: "ar" | "en"): string {
  const m = message ?? "";
  if (m.includes("@")) return m;
  if (/rate limit|too many/i.test(m)) {
    return lang === "ar"
      ? "أرسلت رسائل كثيرة بسرعة. انتظر دقيقة ثم حاول مرة أخرى."
      : "You've sent a lot of messages quickly. Wait a minute, then try again.";
  }
  if (/fetch|network|load failed/i.test(m) || !m) {
    return lang === "ar"
      ? "تعذّر الوصول إلى أبو الجود. تحقّق من اتصالك وحاول مرة أخرى."
      : "Couldn't reach Abu Al-Joud. Check your connection and try again.";
  }
  return lang === "ar"
    ? "تعذّر إكمال الرد الآن. حاول مرة أخرى بعد قليل."
    : "The reply couldn't be finished right now. Please try again shortly.";
}
