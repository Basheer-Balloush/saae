import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { wrapLanguageModel, type LanguageModelMiddleware } from "ai";

type LanguageModelV3 = Parameters<typeof wrapLanguageModel>[0]["model"];

/* The website chat talks to one OpenAI-compatible endpoint. Google's Gemini API
   offers one, so a Gemini key is used directly when it is set; OpenRouter is the
   emergency fallback. CHAT_MODEL names the model for whichever is in use:
   "gemini-3.5-flash-lite" for Google, "google/gemini-3.5-flash-lite" for
   OpenRouter. With only a Gemini key, CHAT_MODEL may be left out. */

export type ChatProvider = { name: string; baseURL: string; apiKey: string; model: string };

export const DEFAULT_GEMINI_MODEL = "gemini-3.5-flash-lite";
const GOOGLE = "https://generativelanguage.googleapis.com/v1beta/openai";
const OPENROUTER = "https://openrouter.ai/api/v1";

export function resolveChatProvider(
  env: Record<string, string | undefined> = process.env,
): ChatProvider | null {
  const geminiKey = env.GEMINI_API_KEY?.trim();
  // OpenRouter has no sensible default, so it still needs CHAT_MODEL.
  const model = env.CHAT_MODEL?.trim() || (geminiKey ? DEFAULT_GEMINI_MODEL : undefined);
  const openRouterKey = env.OPENROUTER_API_KEY?.trim();
  const forced = env.CHAT_PROVIDER?.trim().toLowerCase();
  if (!model) return null;

  const google = geminiKey ? { name: "google", baseURL: GOOGLE, apiKey: geminiKey, model } : null;
  const openrouter = openRouterKey
    ? { name: "openrouter", baseURL: OPENROUTER, apiKey: openRouterKey, model }
    : null;

  // CHAT_PROVIDER settles it when both keys are present and the model name alone
  // cannot say which was meant.
  if (forced === "google" || forced === "gemini") return google;
  if (forced === "openrouter") return openrouter;

  // A model id carrying a provider prefix ("qwen/qwen3-27b:free") is an OpenRouter
  // id; Google's own names never contain a slash. Sending one to Google fails with
  // an unhelpful error, so let the model name pick the provider before the key does.
  if (model.includes("/") && openrouter) return openrouter;
  return google ?? openrouter;
}

/* The second model a request goes to when the first is refused. Google's free
   plan limits each model's requests separately, and a model is sometimes
   overloaded: five visitor messages on 7 Oct 2026 got no answer at all.
   CHAT_FALLBACK_MODEL names it ("off" for none); with Google it defaults to
   Gemini 3.5 Flash, which costs more per message but only answers when the
   first model could not. */
export const DEFAULT_GEMINI_FALLBACK_MODEL = "gemini-3.5-flash";

export function resolveFallbackModel(
  provider: ChatProvider,
  env: Record<string, string | undefined> = process.env,
): string | null {
  const set = env.CHAT_FALLBACK_MODEL?.trim();
  if (set?.toLowerCase() === "off") return null;
  const model = set || (provider.name === "google" ? DEFAULT_GEMINI_FALLBACK_MODEL : "");
  return model && model !== provider.model ? model : null;
}

function modelFor(provider: ChatProvider, modelId: string) {
  return createOpenAICompatible({
    name: provider.name,
    baseURL: provider.baseURL,
    headers: { Authorization: `Bearer ${provider.apiKey}` },
    // Streamed replies carry token counts only when asked for; without this every
    // answer's usage came back empty and the bot's cost could not be measured.
    includeUsage: true,
  })(modelId);
}

/** The first model, and the fallback when the first one's request fails. A
    request the visitor cancelled is not sent again. */
export function withFallback(
  primary: LanguageModelV3,
  fallback: LanguageModelV3,
  onFallback?: (error: unknown) => void,
): LanguageModelV3 {
  const giveUp = (aborted: boolean | undefined, error: unknown) => {
    if (aborted) throw error;
    onFallback?.(error);
  };
  const middleware: LanguageModelMiddleware = {
    specificationVersion: "v3",
    wrapGenerate: async ({ doGenerate, params }) => {
      try {
        return await doGenerate();
      } catch (error) {
        giveUp(params.abortSignal?.aborted, error);
        return fallback.doGenerate(params);
      }
    },
    wrapStream: async ({ doStream, params }) => {
      try {
        return await doStream();
      } catch (error) {
        giveUp(params.abortSignal?.aborted, error);
        return fallback.doStream(params);
      }
    },
  };
  return wrapLanguageModel({ model: primary, middleware });
}

export function createChatModel(
  options: { onFallback?: (error: unknown, fallbackModel: string) => void } = {},
) {
  const provider = resolveChatProvider();
  if (!provider) throw new Error("CHAT_CONFIGURATION_MISSING");
  const primary = modelFor(provider, provider.model);
  const fallbackModel = resolveFallbackModel(provider);
  if (!fallbackModel) return primary;
  return withFallback(primary, modelFor(provider, fallbackModel), (error) =>
    options.onFallback?.(error, fallbackModel),
  );
}
