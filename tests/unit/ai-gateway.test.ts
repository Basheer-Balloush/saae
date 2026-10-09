import { describe, expect, it } from "vitest";
import { generateText } from "ai";
import {
  FREE_PAUSE_MS,
  freeFirst,
  resolveChatProvider,
  resolveFallbackModel,
  resolveFreeKey,
  withFallback,
} from "../../src/features/chat/lib/ai-gateway";

const gemini = "https://generativelanguage.googleapis.com/v1beta/openai";
const openrouter = "https://openrouter.ai/api/v1";

describe("chat provider", () => {
  it("uses the Gemini key against Google's OpenAI-compatible endpoint", () => {
    expect(
      resolveChatProvider({ CHAT_MODEL: "gemini-3.8-flash", GEMINI_API_KEY: "g-key" }),
    ).toEqual({
      name: "google",
      baseURL: gemini,
      apiKey: "g-key",
      model: "gemini-3.8-flash",
    });
  });

  it("still works through OpenRouter when only that key is set", () => {
    expect(
      resolveChatProvider({ CHAT_MODEL: "google/gemini-3.8-flash", OPENROUTER_API_KEY: "or-key" }),
    ).toEqual({
      name: "openrouter",
      baseURL: openrouter,
      apiKey: "or-key",
      model: "google/gemini-3.8-flash",
    });
  });

  it("prefers Gemini when both keys are present", () => {
    const p = resolveChatProvider({
      CHAT_MODEL: "gemini-3.8-flash",
      GEMINI_API_KEY: "g",
      OPENROUTER_API_KEY: "o",
    });
    expect(p?.name).toBe("google");
  });

  it("reports missing configuration instead of guessing", () => {
    expect(resolveChatProvider({ CHAT_MODEL: "gemini-3.8-flash" })).toBeNull();
    expect(
      resolveChatProvider({ CHAT_MODEL: "gemini-3.8-flash", GEMINI_API_KEY: "   " }),
    ).toBeNull();
    // OpenRouter has no default model: it needs CHAT_MODEL.
    expect(resolveChatProvider({ OPENROUTER_API_KEY: "o" })).toBeNull();
  });

  it("runs on Gemini 3.5 Flash-Lite when only the Gemini key is set", () => {
    expect(resolveChatProvider({ GEMINI_API_KEY: "g" })).toMatchObject({
      name: "google",
      model: "gemini-3.5-flash-lite",
    });
    expect(resolveChatProvider({ CHAT_MODEL: "  ", GEMINI_API_KEY: "g" })?.model).toBe(
      "gemini-3.5-flash-lite",
    );
    expect(resolveChatProvider({ GEMINI_API_KEY: "g", OPENROUTER_API_KEY: "o" })?.name).toBe(
      "google",
    );
  });

  it("ignores stray spaces around the values", () => {
    const p = resolveChatProvider({ CHAT_MODEL: " gemini-3.8-flash ", GEMINI_API_KEY: " g-key " });
    expect(p).toMatchObject({ apiKey: "g-key", model: "gemini-3.8-flash" });
  });
});

describe("when both keys are configured", () => {
  const both = { GEMINI_API_KEY: "g", OPENROUTER_API_KEY: "o" };

  it("sends an OpenRouter-style model id to OpenRouter, not to Google", () => {
    // The exact configuration that broke the live chat: a Gemini key left behind
    // while CHAT_MODEL had been switched to an OpenRouter id.
    const p = resolveChatProvider({ ...both, CHAT_MODEL: "qwen/qwen3.8-27b:free" });
    expect(p?.name).toBe("openrouter");
    expect(p?.model).toBe("qwen/qwen3.8-27b:free");
  });

  it("still sends a plain Google model name to Google", () => {
    expect(resolveChatProvider({ ...both, CHAT_MODEL: "gemini-3.8-flash" })?.name).toBe("google");
  });

  it("lets CHAT_PROVIDER override the guess in both directions", () => {
    expect(
      resolveChatProvider({ ...both, CHAT_MODEL: "qwen/q:free", CHAT_PROVIDER: "google" })?.name,
    ).toBe("google");
    expect(
      resolveChatProvider({ ...both, CHAT_MODEL: "gemini-3.8-flash", CHAT_PROVIDER: "openrouter" })
        ?.name,
    ).toBe("openrouter");
    expect(
      resolveChatProvider({ ...both, CHAT_MODEL: "gemini-3.8-flash", CHAT_PROVIDER: "Gemini" })
        ?.name,
    ).toBe("google");
  });

  it("reports missing configuration when the forced provider has no key", () => {
    expect(
      resolveChatProvider({ OPENROUTER_API_KEY: "o", CHAT_MODEL: "x/y", CHAT_PROVIDER: "google" }),
    ).toBeNull();
  });

  it("falls back to the only key there is, whatever the model looks like", () => {
    expect(
      resolveChatProvider({ OPENROUTER_API_KEY: "o", CHAT_MODEL: "gemini-3.8-flash" })?.name,
    ).toBe("openrouter");
    expect(resolveChatProvider({ GEMINI_API_KEY: "g", CHAT_MODEL: "gemini-3.8-flash" })?.name).toBe(
      "google",
    );
  });
});

describe("fallback model", () => {
  const google = { name: "google", baseURL: gemini, apiKey: "k", model: "gemini-3.5-flash-lite" };

  it("answers with Gemini 3.5 Flash when the first model is refused, unless told otherwise", () => {
    expect(resolveFallbackModel(google, {})).toBe("gemini-3.5-flash");
    expect(resolveFallbackModel(google, { CHAT_FALLBACK_MODEL: "gemini-3.8-flash" })).toBe(
      "gemini-3.8-flash",
    );
    expect(resolveFallbackModel(google, { CHAT_FALLBACK_MODEL: "off" })).toBe(null);
    expect(resolveFallbackModel({ ...google, model: "gemini-3.5-flash" }, {})).toBe(null);
    expect(resolveFallbackModel({ ...google, name: "openrouter" }, {})).toBe(null);
  });

  it("takes a free Gemini key only beside a different paid Gemini key", () => {
    expect(resolveFreeKey(google, { GEMINI_API_KEY_FREE: " free-key " })).toBe("free-key");
    expect(resolveFreeKey(google, {})).toBe(null);
    expect(resolveFreeKey(google, { GEMINI_API_KEY_FREE: google.apiKey })).toBe(null);
    expect(resolveFreeKey({ ...google, name: "openrouter" }, { GEMINI_API_KEY_FREE: "k" })).toBe(
      null,
    );
  });

  // A minimal model: answers with its name, or fails like a refused request.
  const model = (name: string, fails = false) => ({
    specificationVersion: "v3" as const,
    provider: "test",
    modelId: name,
    supportedUrls: {},
    doGenerate: async () => {
      if (fails) throw Object.assign(new Error("Too Many Requests"), { statusCode: 429 });
      return {
        content: [{ type: "text" as const, text: name }],
        finishReason: { unified: "stop" as const, raw: "stop" },
        usage: {
          inputTokens: { total: 1, noCache: 1, cacheRead: 0, cacheWrite: 0 },
          outputTokens: { total: 1, text: 1, reasoning: 0 },
        },
        warnings: [],
      };
    },
    doStream: async () => {
      throw new Error("not used");
    },
  });

  it("sends the request to the fallback when the first model fails, and says so", async () => {
    const failures: unknown[] = [];
    const { text } = await generateText({
      model: withFallback(model("first", true), model("second"), (e) => failures.push(e)),
      prompt: "hi",
      maxRetries: 0,
    });
    expect(text).toBe("second");
    expect(failures).toHaveLength(1);
  });

  it("uses the free key first and the paid key only when the free plan refuses", async () => {
    const paidReasons: unknown[] = [];
    const pause = { until: 0 };
    let clock = 1_000;
    const ask = (free: ReturnType<typeof model>) =>
      generateText({
        model: freeFirst(
          free,
          model("paid"),
          (r) => paidReasons.push(r),
          pause,
          () => clock,
        ),
        prompt: "hi",
        maxRetries: 0,
      }).then((r) => r.text);

    expect(await ask(model("free"))).toBe("free");
    expect(paidReasons).toHaveLength(0);

    // The free plan's limit is reached: the paid key answers, and the free key
    // is skipped for the next five minutes without being asked.
    expect(await ask(model("free", true))).toBe("paid");
    expect(pause.until).toBe(clock + FREE_PAUSE_MS);
    clock += FREE_PAUSE_MS - 1;
    expect(await ask(model("free"))).toBe("paid");
    clock += 2;
    expect(await ask(model("free"))).toBe("free");
    expect(paidReasons).toHaveLength(2);
  });

  it("does not touch the fallback when the first model answers", async () => {
    const failures: unknown[] = [];
    const { text } = await generateText({
      model: withFallback(model("first"), model("second", true), (e) => failures.push(e)),
      prompt: "hi",
      maxRetries: 0,
    });
    expect(text).toBe("first");
    expect(failures).toHaveLength(0);
  });
});
