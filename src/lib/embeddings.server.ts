// Preserve the model, 1536 dimensions and chunking used by restored knowledge vectors.
export async function embedTexts(inputs: string[]): Promise<number[][]> {
  if (!inputs.length) return [];
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error('EMBEDDING_CONFIGURATION_MISSING');
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'text-embedding-3-small', dimensions: 1536, input: inputs }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new Error(`Embedding provider error (${response.status})`);
  const json = await response.json() as { data?: { index: number; embedding: number[] }[] };
  if (!Array.isArray(json.data) || json.data.length !== inputs.length) throw new Error('Invalid embedding response');
  const rows = [...json.data].sort((a, b) => a.index - b.index);
  if (rows.some((row, index) => row.index !== index || !Array.isArray(row.embedding) || row.embedding.length !== 1536 || row.embedding.some(value => typeof value !== 'number' || !Number.isFinite(value)))) throw new Error('Invalid embedding dimensions or ordering');
  return rows.map(row => row.embedding);
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
