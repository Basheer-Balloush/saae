// Server-only. All application email transports share this recipient guard.
export function getSiteUrl(): string {
  const value = process.env.SITE_URL;
  if (!value) throw new Error('SITE_URL is not configured');
  const url = new URL(value);
  if (url.username || url.password || url.search || url.hash || url.pathname !== '/' ||
      (url.protocol !== 'https:' && !(url.protocol === 'http:' && url.hostname === 'localhost'))) {
    throw new Error('SITE_URL must be an HTTPS origin (or http://localhost for development)');
  }
  return url.origin;
}
export function assertEmailRecipientAllowed(to: string): void {
  const mode = process.env.EMAIL_DELIVERY_MODE ?? 'disabled';
  if (mode !== 'test' && mode !== 'live') throw new Error('EMAIL_DELIVERY_DISABLED');
  if (mode === 'test') {
    const allowed = (process.env.TEST_EMAIL_ALLOWLIST ?? '').split(',').map(v => v.trim().toLowerCase()).filter(Boolean);
    if (!allowed.includes(to.trim().toLowerCase())) throw new Error('EMAIL_RECIPIENT_NOT_ALLOWED');
  }
  if (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM) throw new Error('EMAIL_CONFIGURATION_MISSING');
}
export type EmailPayload = { to: string; subject: string; html?: string; text?: string; idempotencyKey?: string };
export async function sendTransactionalEmail(input: EmailPayload): Promise<void> {
  assertEmailRecipientAllowed(input.to);
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json', Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      ...(input.idempotencyKey ? { 'Idempotency-Key': `saae-${new URL(process.env.SUPABASE_URL!).hostname}-${input.idempotencyKey}` } : {}),
    },
    body: JSON.stringify({ from: process.env.EMAIL_FROM, to: [input.to], subject: input.subject, html: input.html, text: input.text }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) {
    // Provider responses can contain recipients or authentication links. Do not log them.
    const error = new Error(`Email provider error (${response.status})`) as Error & { status: number; retryAfterSeconds: number };
    error.status = response.status;
    const retry = Number(response.headers.get('retry-after') ?? 60);
    error.retryAfterSeconds = Number.isFinite(retry) && retry > 0 ? Math.min(retry, 3600) : 60;
    throw error;
  }
}
