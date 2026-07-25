import { z } from "zod";

/**
 * Shared types and Zod schemas for the LMS profile service.
 * Consumed by server functions (validation) and UI (client-side validation).
 */

export const PROFILE_BUCKET = "internship-private";

export const AVATAR_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;
export const CV_MIME_TYPES = ["application/pdf"] as const;

export const AVATAR_MAX_BYTES = 5 * 1024 * 1024;
export const CV_MAX_BYTES = 10 * 1024 * 1024;

export const ProfileFileKindSchema = z.enum(["avatar", "cv"]);
export type ProfileFileKind = z.infer<typeof ProfileFileKindSchema>;

export const UpdateProfileInputSchema = z.object({
  full_name: z.string().trim().min(1).max(200).optional().nullable(),
  biography: z.string().trim().max(4000).optional().nullable(),
  organization: z.string().trim().max(200).optional().nullable(),
  phone: z.string().trim().max(40).optional().nullable(),
  locale: z.enum(["ar", "en"]).optional().nullable(),
});
export type UpdateProfileInput = z.infer<typeof UpdateProfileInputSchema>;

export const PrepareUploadInputSchema = z.object({
  kind: ProfileFileKindSchema,
  filename: z.string().trim().min(1).max(255),
  mime: z.string().trim().min(1).max(120),
  size: z.number().int().positive(),
});
export type PrepareUploadInput = z.infer<typeof PrepareUploadInputSchema>;

export const FinalizeUploadInputSchema = z.object({
  kind: ProfileFileKindSchema,
  path: z.string().min(1).max(512),
  mime: z.string().trim().min(1).max(120),
  size: z.number().int().positive(),
  original_filename: z.string().trim().min(1).max(255),
});
export type FinalizeUploadInput = z.infer<typeof FinalizeUploadInputSchema>;

export const SignedDownloadInputSchema = z.object({
  file_id: z.string().uuid(),
  /** signed url TTL in seconds; capped server-side. */
  expires_in: z.number().int().positive().max(300).optional(),
});
export type SignedDownloadInput = z.infer<typeof SignedDownloadInputSchema>;

export type ProfileRow = {
  user_id: string;
  full_name: string | null;
  biography: string | null;
  organization: string | null;
  phone: string | null;
  locale: string | null;
  avatar_file_id: string | null;
  cv_file_id: string | null;
  created_at: string;
  updated_at: string;
};

export type ProfileFileRow = {
  id: string;
  user_id: string;
  kind: ProfileFileKind;
  bucket: string;
  path: string;
  mime_type: string;
  size_bytes: number;
  original_filename: string | null;
  version: number;
  is_current: boolean;
  created_at: string;
  updated_at: string;
};

/** Validate a client-declared MIME against declared kind + size caps. */
export function validateFileAgainstKind(
  kind: ProfileFileKind,
  mime: string,
  size: number,
): { ok: true } | { ok: false; reason: string } {
  if (size <= 0) return { ok: false, reason: "empty_file" };
  if (kind === "avatar") {
    if (!(AVATAR_MIME_TYPES as readonly string[]).includes(mime)) {
      return { ok: false, reason: "avatar_mime" };
    }
    if (size > AVATAR_MAX_BYTES) return { ok: false, reason: "avatar_size" };
  } else {
    if (!(CV_MIME_TYPES as readonly string[]).includes(mime)) {
      return { ok: false, reason: "cv_mime" };
    }
    if (size > CV_MAX_BYTES) return { ok: false, reason: "cv_size" };
  }
  return { ok: true };
}

/** First bytes of a file → coarse magic-byte check. */
export function detectMagicBytes(
  bytes: Uint8Array,
): "pdf" | "jpeg" | "png" | "webp" | "unknown" {
  if (bytes.length >= 4 && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) {
    return "pdf";
  }
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "jpeg";
  }
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 &&
    bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a
  ) {
    return "png";
  }
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
  ) {
    return "webp";
  }
  return "unknown";
}

export function magicBytesMatchMime(
  kind: ProfileFileKind,
  mime: string,
  detected: ReturnType<typeof detectMagicBytes>,
): boolean {
  if (kind === "cv") return detected === "pdf" && mime === "application/pdf";
  if (mime === "image/jpeg") return detected === "jpeg";
  if (mime === "image/png") return detected === "png";
  if (mime === "image/webp") return detected === "webp";
  return false;
}
