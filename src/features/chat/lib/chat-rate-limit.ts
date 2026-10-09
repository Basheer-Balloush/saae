/* How much one visitor may chat (migration 20261009120000, chat_rate_hit).
   Counted per device and per internet address in the database, so every
   worker sees the same numbers. The address cap is high on purpose: at an
   event the whole stand shares one Wi-Fi address. */

export const CHAT_LIMITS = {
  perMinute: 8,
  perDay: 40,
  addressPerDay: 400,
} as const;

export type LimitReason = "minute" | "day" | "address";
export type LimitVerdict = { ok: true } | { ok: false; reason: LimitReason; retry_after: number };

/** The chat window's device id, when it is one; anything else is ignored. */
export function cleanDeviceId(raw: unknown): string | null {
  return typeof raw === "string" && /^[A-Za-z0-9_-]{6,128}$/.test(raw) ? raw : null;
}

/** What the visitor reads when a limit is reached. The minute limit keeps the
    wording the chat window already translates ("wait a minute"); the daily
    ones carry the email, so the window shows them as they are. */
export function limitMessage(reason: LimitReason, lang: "ar" | "en"): string {
  if (reason === "minute") return "Rate limit exceeded. Please slow down.";
  if (reason === "day")
    return lang === "ar"
      ? "وصلت للحد اليومي لرسائل أبو الجود من هذا الجهاز. فيك ترجع بكرا، ولأي شي مستعجل راسل فريق الجمعية على info@aisyria.org."
      : "You've reached today's message limit for Abu Al-Joud on this device. Come back tomorrow, or email the team at info@aisyria.org for anything urgent.";
  return lang === "ar"
    ? "وصل هذا الاتصال للحد اليومي لرسائل أبو الجود. جرّب بكرا، ولأي شي مستعجل راسل فريق الجمعية على info@aisyria.org."
    : "This connection has reached today's message limit for Abu Al-Joud. Try again tomorrow, or email the team at info@aisyria.org for anything urgent.";
}

/** The database's answer as a verdict; anything unexpected lets the message through. */
export function readVerdict(data: unknown): LimitVerdict {
  const v = data as { ok?: unknown; reason?: unknown; retry_after?: unknown } | null;
  if (!v || v.ok !== false) return { ok: true };
  const reason: LimitReason =
    v.reason === "day" || v.reason === "address" || v.reason === "minute" ? v.reason : "minute";
  const retry = Number(v.retry_after);
  return { ok: false, reason, retry_after: Number.isFinite(retry) && retry > 0 ? retry : 60 };
}
