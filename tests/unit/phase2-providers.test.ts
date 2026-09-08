import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { assertEmailRecipientAllowed, getSiteUrl, sendTransactionalEmail } from '@/lib/email-delivery.server';
import { embedTexts } from '@/lib/embeddings.server';
import { createChatModel } from '@/lib/ai-gateway';

beforeEach(() => {
  vi.stubEnv('EMAIL_DELIVERY_MODE', 'disabled');
  vi.stubEnv('TEST_EMAIL_ALLOWLIST', 'tester@example.test');
  vi.stubEnv('RESEND_API_KEY', 'test-resend-secret');
  vi.stubEnv('EMAIL_FROM', 'SAAE <sender@example.test>');
  vi.stubEnv('SUPABASE_URL', 'https://example.supabase.co');
  vi.stubEnv('OPENAI_API_KEY', 'test-embedding-secret');
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 200 })));
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe('email delivery', () => {
  it('does not send while disabled', async () => {
    await expect(sendTransactionalEmail({ to: 'tester@example.test', subject: 'test', text: 'hello' })).rejects.toThrow('DISABLED');
    expect(fetch).not.toHaveBeenCalled();
  });
  it('restricts test mode to exact recipients without redirecting authentication links', () => {
    vi.stubEnv('EMAIL_DELIVERY_MODE', 'test');
    expect(() => assertEmailRecipientAllowed('TESTER@example.test')).not.toThrow();
    expect(() => assertEmailRecipientAllowed('real-user@example.test')).toThrow('NOT_ALLOWED');
    expect(() => assertEmailRecipientAllowed('tester@example.test.evil')).toThrow('NOT_ALLOWED');
  });
  it('uses the direct provider, server key and project-scoped retry identity', async () => {
    vi.stubEnv('EMAIL_DELIVERY_MODE', 'test');
    await sendTransactionalEmail({ to: 'tester@example.test', subject: 'test', text: 'hello', idempotencyKey: 'outbox-123' });
    const [url, request] = vi.mocked(fetch).mock.calls[0];
    expect(url).toBe('https://api.resend.com/emails');
    const headers = new Headers(request?.headers);
    expect(headers.get('Authorization')).toBe('Bearer test-resend-secret');
    expect(headers.get('X-Connection-Api-Key')).toBeNull();
    expect(headers.get('Idempotency-Key')).toBe('saae-example.supabase.co-outbox-123');
    expect(JSON.parse(String(request?.body))).toMatchObject({ from: 'SAAE <sender@example.test>', to: ['tester@example.test'], text: 'hello' });
  });
  it('preserves 429 and retry delay without exposing provider bodies', async () => {
    vi.stubEnv('EMAIL_DELIVERY_MODE', 'live');
    vi.mocked(fetch).mockResolvedValue(new Response('private-authentication-link', { status: 429, headers: { 'Retry-After': '120' } }));
    await expect(sendTransactionalEmail({ to: 'tester@example.test', subject: 'test' })).rejects.toMatchObject({ status: 429, retryAfterSeconds: 120, message: 'Email provider error (429)' });
  });
  it('reads the email origin at request time and rejects malformed origins', () => {
    vi.stubEnv('SITE_URL', 'https://staging.example.test');
    expect(getSiteUrl()).toBe('https://staging.example.test');
    vi.stubEnv('SITE_URL', 'https://production.example.test');
    expect(getSiteUrl()).toBe('https://production.example.test');
    vi.stubEnv('SITE_URL', 'https://production.example.test/path');
    expect(getSiteUrl).toThrow('HTTPS origin');
  });
});
describe('embedding compatibility', () => {
  it('avoids API calls for empty input', async () => {
    expect(await embedTexts([])).toEqual([]);
    expect(fetch).not.toHaveBeenCalled();
  });
  it('keeps 1536 dimensions and restores input order using provider indices', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({ data: [
      { index: 1, embedding: Array(1536).fill(2) }, { index: 0, embedding: Array(1536).fill(1) },
    ] })));
    const values = await embedTexts(['one', 'two']);
    expect(values[0][0]).toBe(1); expect(values[1][0]).toBe(2);
    const [url, request] = vi.mocked(fetch).mock.calls[0];
    expect(url).toBe('https://api.openai.com/v1/embeddings');
    expect(JSON.parse(String(request?.body))).toEqual({ model: 'text-embedding-3-small', dimensions: 1536, input: ['one', 'two'] });
    expect(new Headers(request?.headers).get('Authorization')).toBe('Bearer test-embedding-secret');
  });
  it.each([
    [{ index: 0, embedding: [1] }],
    [{ index: 1, embedding: Array(1536).fill(1) }],
    [],
  ])('rejects incompatible or missing vectors', async (...data) => {
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({ data })));
    await expect(embedTexts(['one'])).rejects.toThrow('Invalid embedding');
  });
});
it('requires an explicitly chosen chat model', () => {
  vi.stubEnv('OPENROUTER_API_KEY', 'test-chat-secret'); vi.stubEnv('CHAT_MODEL', '');
  expect(createChatModel).toThrow('CHAT_CONFIGURATION_MISSING');
  vi.stubEnv('CHAT_MODEL', 'provider/model-to-verify');
  expect(createChatModel().modelId).toBe('provider/model-to-verify');
});
