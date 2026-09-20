/* Photographs uploaded from a phone arrive at several megabytes and are shown on
   cards a few hundred pixels wide. Every visitor then downloads the original,
   which is what pushed the project past its egress allowance. Images are resized
   and converted to WebP in the browser before they are uploaded. */

export const MAX_EDGE = 1600;
export const QUALITY = 0.82;
// Below this, re-encoding buys little and can even make a small PNG bigger.
export const COMPRESS_ABOVE_BYTES = 200 * 1024;

const RECOMPRESSIBLE = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"]);

/** Animated and vector images are left alone: re-encoding them loses what they are. */
export function shouldCompress(type: string, bytes: number, limit = COMPRESS_ABOVE_BYTES): boolean {
  return RECOMPRESSIBLE.has(type.toLowerCase()) && bytes > limit;
}

/** Scales (w, h) down to fit the box, keeping the aspect ratio; never scales up. */
export function fitWithin(width: number, height: number, maxEdge = MAX_EDGE): { width: number; height: number } {
  if (width <= 0 || height <= 0) return { width: 0, height: 0 };
  const longest = Math.max(width, height);
  if (longest <= maxEdge) return { width: Math.round(width), height: Math.round(height) };
  const scale = maxEdge / longest;
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

/** The stored name must match the bytes: a WebP body under a .png name confuses caches and downloads. */
export function webpPath(path: string): string {
  return path.replace(/\.(jpe?g|png|webp)$/i, "") + ".webp";
}

/**
 * Returns a WebP copy of the image, or the original file when compressing is not
 * worthwhile or not possible (an unsupported type, a browser without canvas
 * encoding, a decode failure). Never throws: an upload is more important than a
 * saved kilobyte.
 */
export async function compressImage(file: File, maxEdge = MAX_EDGE, quality = QUALITY): Promise<File> {
  if (!shouldCompress(file.type, file.size)) return file;
  if (typeof document === "undefined" || typeof createImageBitmap !== "function") return file;
  try {
    const bitmap = await createImageBitmap(file);
    const { width, height } = fitWithin(bitmap.width, bitmap.height, maxEdge);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) return file;
    context.drawImage(bitmap, 0, 0, width, height);
    bitmap.close?.();
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((result) => resolve(result), "image/webp", quality),
    );
    // A re-encode that saved nothing is not worth changing the file for.
    if (!blob || blob.type !== "image/webp" || blob.size >= file.size) return file;
    return new File([blob], webpPath(file.name), { type: "image/webp", lastModified: Date.now() });
  } catch {
    return file;
  }
}
