/* Photos in Supabase storage are uploaded at full camera size: one homepage
   news photo was a 2.5 MB PNG, shown about 350px wide. Decoding that on a
   phone stalls the scroll. Supabase's image endpoint resizes on the fly and,
   for a browser that accepts WebP, converts too (that photo: 67 KB at 720px;
   an LMS course cover: 1.5 MB PNG -> 20 KB at 640px).
   Anything that is not a public storage object passes through unchanged. */

const OBJECT = "/storage/v1/object/public/";
const RENDER = "/storage/v1/render/image/public/";

/** Splits a storage URL; a lone `v=` cache-buster (LMS covers) is carried over. */
function splitResizable(url: string): { base: string; version: string } | null {
  if (!url || !url.includes(OBJECT)) return null;
  const [base, query = ""] = url.split("?", 2);
  if (!query) return { base, version: "" };
  const match = /^v=([\w.-]+)$/.exec(query);
  return match ? { base, version: match[1] } : null;
}

export function resizedImage(url: string, width: number, quality = 72): string {
  const parts = splitResizable(url);
  if (!parts) return url;
  const version = parts.version ? `&v=${parts.version}` : "";
  return `${parts.base.replace(OBJECT, RENDER)}?width=${width}&resize=contain&quality=${quality}${version}`;
}

/** A srcset of resized copies, or undefined when the image cannot be resized. */
export function resizedSrcSet(url: string, widths: number[] = [480, 720, 1080]): string | undefined {
  if (!splitResizable(url)) return undefined;
  return widths.map((w) => `${resizedImage(url, w)} ${w}w`).join(", ");
}
