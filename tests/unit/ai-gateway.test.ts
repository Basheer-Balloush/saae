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
