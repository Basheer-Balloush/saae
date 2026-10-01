import { afterEach, describe, expect, it, vi } from "vitest";
import { embedTexts, geminiInput } from "../../src/features/chat/lib/embeddings.server";

const vector = (n: number) => Array.from({ length: 1536 }, () => n);

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("knowledge embeddings", () => {
  it("uses Gemini when its key is set, asking for 1536 numbers", async () => {
    vi.stubEnv("GEMINI_API_KEY", "g-key");
    vi.stubEnv("OPENAI_API_KEY", "");
    const fetchMock = vi.fn(
      async () =>
        new Response(
          JSON.stringify({ embeddings: [{ values: vector(0.1) }, { values: vector(0.2) }] }),
        ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const out = await embedTexts(["أ", "ب"], { kind: "document", title: "عن الجمعية" });

    expect(out).toHaveLength(2);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toContain("gemini-embedding-2:batchEmbedContents");
    expect((init.headers as Record<string, string>)["x-goog-api-key"]).toBe("g-key");
    const body = JSON.parse(init.body as string);
    expect(body.requests[0].output_dimensionality).toBe(1536);
    expect(body.requests[0].content.parts[0].text).toBe("title: عن الجمعية | text: أ");
  });

  it("formats search questions and untitled documents the way Gemini expects", () => {
    expect(geminiInput("كيف أنضم؟", { kind: "query" })).toBe(
      "task: search result | query: كيف أنضم؟",
    );
    expect(geminiInput("نص", { kind: "document" })).toBe("title: none | text: نص");
  });

  it("rejects vectors of the wrong size", async () => {
    vi.stubEnv("GEMINI_API_KEY", "g-key");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ embeddings: [{ values: [1, 2, 3] }] }))),
    );
    await expect(embedTexts(["أ"])).rejects.toThrow(/dimensions/);
  });

  it("says so plainly when no key is set", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    vi.stubEnv("OPENAI_API_KEY", "");
    await expect(embedTexts(["أ"])).rejects.toThrow("EMBEDDING_CONFIGURATION_MISSING");
  });
});
