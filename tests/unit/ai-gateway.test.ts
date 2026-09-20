import { describe, expect, it } from "vitest";
import { resolveChatProvider } from "../../src/lib/ai-gateway";

const gemini = "https://generativelanguage.googleapis.com/v1beta/openai";
const openrouter = "https://openrouter.ai/api/v1";

describe("chat provider", () => {
  it("uses the Gemini key against Google's OpenAI-compatible endpoint", () => {
    expect(resolveChatProvider({ CHAT_MODEL: "gemini-3.8-flash", GEMINI_API_KEY: "g-key" })).toEqual({
      name: "google",
      baseURL: gemini,
      apiKey: "g-key",
      model: "gemini-3.8-flash",
    });
  });

  it("still works through OpenRouter when only that key is set", () => {
    expect(
      resolveChatProvider({ CHAT_MODEL: "google/gemini-3.8-flash", OPENROUTER_API_KEY: "or-key" }),
    ).toEqual({ name: "openrouter", baseURL: openrouter, apiKey: "or-key", model: "google/gemini-3.8-flash" });
  });

  it("prefers Gemini when both keys are present", () => {
    const p = resolveChatProvider({ CHAT_MODEL: "gemini-3.8-flash", GEMINI_API_KEY: "g", OPENROUTER_API_KEY: "o" });
    expect(p?.name).toBe("google");
  });

  it("reports missing configuration instead of guessing", () => {
    expect(resolveChatProvider({ GEMINI_API_KEY: "g" })).toBeNull();
    expect(resolveChatProvider({ CHAT_MODEL: "gemini-3.8-flash" })).toBeNull();
    expect(resolveChatProvider({ CHAT_MODEL: "  ", GEMINI_API_KEY: "g" })).toBeNull();
    expect(resolveChatProvider({ CHAT_MODEL: "gemini-3.8-flash", GEMINI_API_KEY: "   " })).toBeNull();
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
    expect(resolveChatProvider({ ...both, CHAT_MODEL: "qwen/q:free", CHAT_PROVIDER: "google" })?.name).toBe("google");
    expect(resolveChatProvider({ ...both, CHAT_MODEL: "gemini-3.8-flash", CHAT_PROVIDER: "openrouter" })?.name).toBe("openrouter");
    expect(resolveChatProvider({ ...both, CHAT_MODEL: "gemini-3.8-flash", CHAT_PROVIDER: "Gemini" })?.name).toBe("google");
  });

  it("reports missing configuration when the forced provider has no key", () => {
    expect(resolveChatProvider({ OPENROUTER_API_KEY: "o", CHAT_MODEL: "x/y", CHAT_PROVIDER: "google" })).toBeNull();
  });

  it("falls back to the only key there is, whatever the model looks like", () => {
    expect(resolveChatProvider({ OPENROUTER_API_KEY: "o", CHAT_MODEL: "gemini-3.8-flash" })?.name).toBe("openrouter");
    expect(resolveChatProvider({ GEMINI_API_KEY: "g", CHAT_MODEL: "gemini-3.8-flash" })?.name).toBe("google");
  });
});
