// Server-only helpers for Lovable AI Gateway embeddings + simple chunking.
const EMBED_URL = "https://ai.gateway.lovable.dev/v1/embeddings";
const EMBED_MODEL = "openai/text-embedding-3-small"; // 1536 dims

export async function embedTexts(inputs: string[]): Promise<number[][]> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("Missing LOVABLE_API_KEY");
  if (inputs.length === 0) return [];

  const res = await fetch(EMBED_URL, {
    method: "POST",
    headers: {
      "Lovable-API-Key": key,
      "X-Lovable-AIG-SDK": "vercel-ai-sdk",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model: EMBED_MODEL, input: inputs }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Embedding error ${res.status}: ${body}`);
  }
  const json = (await res.json()) as { data: Array<{ embedding: number[] }> };
  return json.data.map((d) => d.embedding);
}

export async function embedOne(input: string): Promise<number[]> {
  const [v] = await embedTexts([input]);
  return v;
}

export function chunkText(
  text: string,
  size = 1000,
  overlap = 100,
): string[] {
  const clean = text.replace(/\r\n/g, "\n").replace(/[ \t]+\n/g, "\n").trim();
  if (clean.length <= size) return clean.length > 0 ? [clean] : [];
  const chunks: string[] = [];
  let start = 0;
  while (start < clean.length) {
    const end = Math.min(start + size, clean.length);
    let slice = clean.slice(start, end);
    // try to break on a paragraph or sentence boundary near the end
    if (end < clean.length) {
      const lastBreak = Math.max(
        slice.lastIndexOf("\n\n"),
        slice.lastIndexOf("\n"),
        slice.lastIndexOf(". "),
        slice.lastIndexOf("۔ "),
      );
      if (lastBreak > size * 0.5) {
        slice = slice.slice(0, lastBreak);
      }
    }
    chunks.push(slice.trim());
    start += Math.max(slice.length - overlap, 1);
  }
  return chunks.filter((c) => c.length > 0);
}
