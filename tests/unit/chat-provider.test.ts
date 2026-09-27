import { afterEach, describe, expect, it, vi } from 'vitest';
import { createChatModelForRequest } from '@/lib/ai-gateway.server';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('chat provider selection', () => {
  it('uses Gemini directly, even when Lovable provides its gateway key', () => {
    vi.stubEnv('LOVABLE_API_KEY', 'test-lovable-key');
    vi.stubEnv('GEMINI_API_KEY', 'test-gemini-key');
    vi.stubEnv('OPENROUTER_API_KEY', '');
    vi.stubEnv('CHAT_MODEL', '');
    const selection = createChatModelForRequest();
    expect(selection.kind).toBe('direct');
    expect((selection.model as { modelId: string }).modelId).toBe('gemini-3.5-flash-lite');
  });

  it('falls back to OpenRouter in an emergency, with an explicit model', () => {
    vi.stubEnv('GEMINI_API_KEY', '');
    vi.stubEnv('OPENROUTER_API_KEY', 'test-openrouter-secret');
    vi.stubEnv('CHAT_MODEL', 'provider/model-to-verify');
    expect((createChatModelForRequest().model as { modelId: string }).modelId).toBe('provider/model-to-verify');
  });

  it('refuses to start without a Gemini or OpenRouter key, even with a Lovable key', () => {
    vi.stubEnv('LOVABLE_API_KEY', 'test-lovable-key');
    vi.stubEnv('GEMINI_API_KEY', '');
    vi.stubEnv('OPENROUTER_API_KEY', '');
    vi.stubEnv('CHAT_MODEL', 'gemini-3.5-flash-lite');
    expect(() => createChatModelForRequest()).toThrow('CHAT_CONFIGURATION_MISSING');
  });
});
