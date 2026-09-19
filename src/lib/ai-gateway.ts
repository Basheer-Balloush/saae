import { createOpenAICompatible } from '@ai-sdk/openai-compatible';

/* The website chat talks to one OpenAI-compatible endpoint. Google's Gemini API
   offers one, so a Gemini key is used directly when it is set; otherwise the
   OpenRouter key is used. CHAT_MODEL names the model for whichever is in use:
   "gemini-3.8-flash" for Google, "google/gemini-3.8-flash" for OpenRouter. */

export type ChatProvider = { name: string; baseURL: string; apiKey: string; model: string };

export function resolveChatProvider(
  env: Record<string, string | undefined> = process.env,
): ChatProvider | null {
  const model = env.CHAT_MODEL?.trim();
  const geminiKey = env.GEMINI_API_KEY?.trim();
  const openRouterKey = env.OPENROUTER_API_KEY?.trim();
  if (!model) return null;
  if (geminiKey) {
    return {
      name: 'google',
      baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai',
      apiKey: geminiKey,
      model,
    };
  }
  if (openRouterKey) {
    return { name: 'openrouter', baseURL: 'https://openrouter.ai/api/v1', apiKey: openRouterKey, model };
  }
  return null;
}

export function createChatModel() {
  const provider = resolveChatProvider();
  if (!provider) throw new Error('CHAT_CONFIGURATION_MISSING');
  return createOpenAICompatible({
    name: provider.name,
    baseURL: provider.baseURL,
    headers: { Authorization: `Bearer ${provider.apiKey}` },
  })(provider.model);
}
