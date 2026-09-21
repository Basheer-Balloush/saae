import { createOpenAICompatible } from '@ai-sdk/openai-compatible';

/* The website chat talks to one OpenAI-compatible endpoint. Google's Gemini API
   offers one, so a Gemini key is used directly when it is set; otherwise the
   OpenRouter key is used. CHAT_MODEL names the model for whichever is in use:
   "gemini-3.8-flash" for Google, "google/gemini-3.8-flash" for OpenRouter. */

export type ChatProvider = { name: string; baseURL: string; apiKey: string; model: string };

const GOOGLE = 'https://generativelanguage.googleapis.com/v1beta/openai';
const OPENROUTER = 'https://openrouter.ai/api/v1';

export function resolveChatProvider(
  env: Record<string, string | undefined> = process.env,
): ChatProvider | null {
  const model = env.CHAT_MODEL?.trim();
  const geminiKey = env.GEMINI_API_KEY?.trim();
  const openRouterKey = env.OPENROUTER_API_KEY?.trim();
  const forced = env.CHAT_PROVIDER?.trim().toLowerCase();
  if (!model) return null;

  const google = geminiKey ? { name: 'google', baseURL: GOOGLE, apiKey: geminiKey, model } : null;
  const openrouter = openRouterKey
    ? { name: 'openrouter', baseURL: OPENROUTER, apiKey: openRouterKey, model }
    : null;

  // CHAT_PROVIDER settles it when both keys are present and the model name alone
  // cannot say which was meant.
  if (forced === 'google' || forced === 'gemini') return google;
  if (forced === 'openrouter') return openrouter;

  // A model id carrying a provider prefix ("qwen/qwen3-27b:free") is an OpenRouter
  // id; Google's own names never contain a slash. Sending one to Google fails with
  // an unhelpful error, so let the model name pick the provider before the key does.
  if (model.includes('/') && openrouter) return openrouter;
  return google ?? openrouter;
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
