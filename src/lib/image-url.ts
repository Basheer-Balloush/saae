/* Photos in Supabase storage are uploaded at full camera size: one homepage
   news photo was a 2.5 MB PNG, shown about 350px wide. Decoding that on a
   phone stalls the scroll. Supabase's image endpoint resizes on the fly and,
   for a browser that accepts WebP, converts too (that photo: 67 KB at 720px).
   Anything that is not a public storage object passes through unchanged. */

const OBJECT = "/storage/v1/object/public/";
const RENDER = "/storage/v1/render/image/public/";

export function resizedImage(url: string, width: number, quality = 72): string {
  if (!url || !url.includes(OBJECT) || url.includes("?")) return url;
  return `${url.replace(OBJECT, RENDER)}?width=${width}&resize=contain&quality=${quality}`;
}

/** A srcset of resized copies, or undefined when the image cannot be resized. */
export function resizedSrcSet(url: string, widths: number[] = [480, 720, 1080]): string | undefined {
  if (!url || !url.includes(OBJECT) || url.includes("?")) return undefined;
  return widths.map((w) => `${resizedImage(url, w)} ${w}w`).join(", ");
}
