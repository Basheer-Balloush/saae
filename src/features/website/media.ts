import { uploadToSupabaseStorage } from "@/lib/upload-with-progress";

/* Uploads for the website content (news, team, partners). Same bucket and
   paths as before. The bucket has no server-side type or size rules, so
   these checks are the only guard. */

export const IMAGE_MIME = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;
export const VIDEO_MIME = ["video/mp4", "video/webm", "video/quicktime"] as const;
const IMAGE_EXT = /\.(jpe?g|png|webp|gif)$/i;
const VIDEO_EXT = /\.(mp4|webm|mov)$/i;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_VIDEO_BYTES = 200 * 1024 * 1024;

export function checkImage(file: File, ar: boolean): string | null {
  if (
    !IMAGE_MIME.includes(file.type as (typeof IMAGE_MIME)[number]) ||
    !IMAGE_EXT.test(file.name)
  ) {
    return ar
      ? `${file.name}: نوع الصورة غير مسموح (JPG / PNG / WEBP / GIF فقط)`
      : `${file.name}: unsupported image type (JPG / PNG / WEBP / GIF only)`;
  }
  if (file.size > MAX_IMAGE_BYTES)
    return ar ? `${file.name}: الحجم أكبر من 10 ميجابايت` : `${file.name}: larger than 10 MB`;
  return null;
}

export function checkVideo(file: File, ar: boolean): string | null {
  if (
    !VIDEO_MIME.includes(file.type as (typeof VIDEO_MIME)[number]) ||
    !VIDEO_EXT.test(file.name)
  ) {
    return ar
      ? `${file.name}: نوع الفيديو غير مسموح (MP4 / WEBM / MOV فقط)`
      : `${file.name}: unsupported video type (MP4 / WEBM / MOV only)`;
  }
  if (file.size > MAX_VIDEO_BYTES)
    return ar ? `${file.name}: الحجم أكبر من 200 ميجابايت` : `${file.name}: larger than 200 MB`;
  return null;
}

export type Progress = { pct: number; loaded: number; total: number; name: string };

/** News photos, videos and member photos: news-images/{images|videos}/<uuid>.<ext> */
export async function uploadNewsMedia(
  file: File,
  kind: "image" | "video",
  onProgress?: (p: Progress) => void,
) {
  const ext =
    (file.name.split(".").pop() || (kind === "video" ? "mp4" : "jpg"))
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "") || (kind === "video" ? "mp4" : "jpg");
  const { publicUrl } = await uploadToSupabaseStorage({
    bucket: "news-images",
    path: `${kind}s/${crypto.randomUUID()}.${ext}`,
    file,
    upsert: false,
    contentType: file.type || undefined,
    onProgress: (pct, loaded, total) => onProgress?.({ pct, loaded, total, name: file.name }),
  });
  return publicUrl;
}

/** Partner logos: news-images/partners/<uuid>.<ext> */
export async function uploadPartnerLogo(file: File, onProgress?: (p: Progress) => void) {
  const ext =
    (file.name.split(".").pop() || "png").toLowerCase().replace(/[^a-z0-9]/g, "") || "png";
  const { publicUrl } = await uploadToSupabaseStorage({
    bucket: "news-images",
    path: `partners/${crypto.randomUUID()}.${ext}`,
    file,
    upsert: false,
    contentType: file.type || undefined,
    onProgress: (pct, loaded, total) => onProgress?.({ pct, loaded, total, name: file.name }),
  });
  return publicUrl;
}

/** Donor logos for the initiative: news-images/initiative-logos/<uuid>.<ext>. Any image up to 5 MB, as before. */
export async function uploadInitiativeLogo(file: File, onProgress?: (p: Progress) => void) {
  const ext =
    (file.name.split(".").pop() || "png").toLowerCase().replace(/[^a-z0-9]/g, "") || "png";
  const { publicUrl } = await uploadToSupabaseStorage({
    bucket: "news-images",
    path: `initiative-logos/${crypto.randomUUID()}.${ext}`,
    file,
    upsert: false,
    contentType: file.type || undefined,
    onProgress: (pct, loaded, total) => onProgress?.({ pct, loaded, total, name: file.name }),
  });
  return publicUrl;
}
