import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createChatModelForRequest } from '@/lib/ai-gateway.server';

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn());
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('chat provider selection', () => {
  it('prefers the Lovable AI Gateway when LOVABLE_API_KEY is present', () => {
    vi.stubEnv('LOVABLE_API_KEY', 'test-lovable-key');
    vi.stubEnv('OPENROUTER_API_KEY', 'test-openrouter-secret');
    vi.stubEnv('CHAT_MODEL', 'provider/model-to-verify');
    const selection = createChatModelForRequest(new Request('https://example.test/api/chat', { method: 'POST' }));
    expect(selection.kind).toBe('lovable');
    expect((selection.model as { modelId: string }).modelId).toBe('openai/gpt-6-astra');
    expect(selection.providerOptions?.openai.store).toBe(false);
    expect(typeof selection.gateway?.getRunId).toBe('function');
  });

  it('falls back to the direct OpenRouter provider without LOVABLE_API_KEY', () => {
    vi.stubEnv('LOVABLE_API_KEY', '');
    vi.stubEnv('OPENROUTER_API_KEY', 'test-openrouter-secret');
    vi.stubEnv('CHAT_MODEL', 'provider/model-to-verify');
    const selection = createChatModelForRequest(new Request('https://example.test/api/chat', { method: 'POST' }));
    expect(selection.kind).toBe('openrouter');
    expect((selection.model as { modelId: string }).modelId).toBe('provider/model-to-verify');
    expect(selection.providerOptions).toBeUndefined();
    expect(selection.gateway).toBeUndefined();
  });

  it('requires an explicitly chosen OpenRouter model in the fallback path', () => {
    vi.stubEnv('LOVABLE_API_KEY', '');
    vi.stubEnv('OPENROUTER_API_KEY', 'test-openrouter-secret');
    vi.stubEnv('CHAT_MODEL', '');
    expect(() => createChatModelForRequest(new Request('https://example.test/api/chat'))).toThrow('CHAT_CONFIGURATION_MISSING');
  });

  it('requires one of the two providers to be configured', () => {
    vi.stubEnv('LOVABLE_API_KEY', '');
    vi.stubEnv('OPENROUTER_API_KEY', '');
    expect(() => createChatModelForRequest(new Request('https://example.test/api/chat'))).toThrow();
  });
});
