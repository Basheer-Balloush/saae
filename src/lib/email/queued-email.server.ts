import { getSiteUrl, type EmailPayload } from "./email-delivery.server";

export class InvalidQueuedEmail extends Error {}

export function escapeEmailHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!,
  );
}

/** Render only known templates; preserve already-rendered legacy messages. */
export function renderQueuedEmail(payload: Record<string, unknown>): EmailPayload {
  const to = payload.to;
  if (typeof to !== "string" || !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(to))
    throw new InvalidQueuedEmail("Invalid queued recipient");
  if (payload.template_name === "initiative-seat-claim") {
    const data = payload.template_data as Record<string, unknown> | undefined;
    if (!data || typeof data.claim_token !== "string" || !/^[a-f0-9]{48}$/i.test(data.claim_token))
      throw new InvalidQueuedEmail("Invalid initiative claim token");
    const name =
      typeof data.full_name === "string" && data.full_name.trim()
        ? data.full_name.trim()
        : "المشارك/ة";
    const link = new URL("/initiative/claim", getSiteUrl());
    link.searchParams.set("token", data.claim_token);
    const subject = "تم تأمين مقعدك في المبادرة — الجمعية السورية للذكاء الاصطناعي وريادة الأعمال";
    const text = `مرحباً ${name}،\n\nتم تأمين مقعدك في المبادرة. يمكنك تفعيل حسابك والوصول إلى الدورة عبر الرابط التالي:\n${link.href}\n\nهذا الرابط خاص بك، يرجى عدم مشاركته.\n\nالجمعية السورية للذكاء الاصطناعي وريادة الأعمال`;
    const html = `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"/></head><body style="font-family:Arial,sans-serif;color:#0f172a"><div style="max-width:600px;margin:auto;padding:24px"><h2>مرحباً ${escapeEmailHtml(name)}،</h2><p>تم تأمين مقعدك في المبادرة. يمكنك تفعيل حسابك والوصول إلى الدورة عبر الرابط التالي:</p><p><a href="${escapeEmailHtml(link.href)}">تفعيل مقعدي</a></p><p>هذا الرابط خاص بك، يرجى عدم مشاركته.</p><p>الجمعية السورية للذكاء الاصطناعي وريادة الأعمال</p></div></body></html>`;
    return { to, subject, html, text };
  }
  if (payload.template_name) throw new InvalidQueuedEmail("Unsupported queued email template");
  const { subject, html, text } = payload;
  if (
    typeof subject !== "string" ||
    !subject.trim() ||
    !((typeof html === "string" && html.trim()) || (typeof text === "string" && text.trim()))
  )
    throw new InvalidQueuedEmail("Queued email requires a subject and body");
  return {
    to,
    subject,
    html: typeof html === "string" ? html : undefined,
    text: typeof text === "string" ? text : undefined,
  };
}

/** Optional staging restriction; normal login/reset emails are unaffected. */
export function isBackgroundRecipientAllowed(to: unknown): boolean {
  const allowed = (process.env.BACKGROUND_EMAIL_TEST_ALLOWLIST ?? "")
    .split(",")
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean);
  return !allowed.length || (typeof to === "string" && allowed.includes(to.trim().toLowerCase()));
}
