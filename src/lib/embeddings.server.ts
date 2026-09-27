/* Knowledge vectors are 1536 numbers, the size the database column holds.
   Gemini (GEMINI_API_KEY, the key the chat already uses) makes them when it
   is set; otherwise OpenAI (OPENAI_API_KEY). Vectors from different models
   can't be compared, so after switching providers the knowledge has to be
   added again. */

const DIMENSIONS = 1536;
const GEMINI_MODEL = 'gemini-embedding-2';
const GEMINI_BATCH = 100;

export type EmbedTask =
  | { kind: 'document'; title?: string }
  | { kind: 'query' };

function readKey(name: string): string | undefined {
  return process.env[name]?.trim() || undefined;
}

function checked(vectors: unknown[], count: number): number[][] {
  if (vectors.length !== count) throw new Error('Invalid embedding response');
  for (const v of vectors) {
    if (!Array.isArray(v) || v.length !== DIMENSIONS || v.some((x) => typeof x !== 'number' || !Number.isFinite(x))) {
      throw new Error('Invalid embedding dimensions or ordering');
    }
  }
  return vectors as number[][];
}

// Gemini wants the task written into the text itself.
export function geminiInput(text: string, task: EmbedTask): string {
  return task.kind === 'query'
    ? `task: search result | query: ${text}`
    : `title: ${task.title?.trim() || 'none'} | text: ${text}`;
}

async function embedWithGemini(key: string, inputs: string[], task: EmbedTask): Promise<number[][]> {
  const out: number[][] = [];
  for (let i = 0; i < inputs.length; i += GEMINI_BATCH) {
    const batch = inputs.slice(i, i + GEMINI_BATCH);
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:batchEmbedContents`,
      {
        method: 'POST',
        headers: { 'x-goog-api-key': key, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requests: batch.map((text) => ({
            model: `models/${GEMINI_MODEL}`,
            content: { parts: [{ text: geminiInput(text, task) }] },
            output_dimensionality: DIMENSIONS,
          })),
        }),
        signal: AbortSignal.timeout(30_000),
      },
    );
    if (!response.ok) throw new Error(`Embedding provider error (${response.status})`);
    const json = (await response.json()) as { embeddings?: { values?: number[] }[] };
    out.push(...checked((json.embeddings ?? []).map((e) => e.values), batch.length));
  }
  return out;
}

async function embedWithOpenAI(key: string, inputs: string[]): Promise<number[][]> {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'text-embedding-3-small', dimensions: DIMENSIONS, input: inputs }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new Error(`Embedding provider error (${response.status})`);
  const json = await response.json() as { data?: { index: number; embedding: number[] }[] };
  if (!Array.isArray(json.data) || json.data.length !== inputs.length) throw new Error('Invalid embedding response');
  const rows = [...json.data].sort((a, b) => a.index - b.index);
  if (rows.some((row, index) => row.index !== index)) throw new Error('Invalid embedding dimensions or ordering');
  return checked(rows.map((row) => row.embedding), inputs.length);
}

export async function embedTexts(inputs: string[], task: EmbedTask = { kind: 'document' }): Promise<number[][]> {
  if (!inputs.length) return [];
  const gemini = readKey('GEMINI_API_KEY');
  if (gemini) return embedWithGemini(gemini, inputs, task);
  const openai = readKey('OPENAI_API_KEY');
  if (openai) return embedWithOpenAI(openai, inputs);
  throw new Error('EMBEDDING_CONFIGURATION_MISSING');
}

export async function embedOne(input: string, task: EmbedTask = { kind: 'query' }): Promise<number[]> {
  const [v] = await embedTexts([input], task);
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
