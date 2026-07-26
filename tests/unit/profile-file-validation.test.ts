import { describe, it, expect } from "vitest";
import {
  validateFileAgainstKind,
  detectMagicBytes,
  magicBytesMatchMime,
  AVATAR_MAX_BYTES,
  CV_MAX_BYTES,
} from "@/lib/lms-profile";

const PDF = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]);
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0]);

describe("profile file validation (baseline regression guard)", () => {
  it("accepts a valid CV and rejects wrong MIME or oversize", () => {
    expect(validateFileAgainstKind("cv", "application/pdf", 1024).ok).toBe(true);
    expect(validateFileAgainstKind("cv", "image/png", 1024).ok).toBe(false);
    expect(validateFileAgainstKind("cv", "application/pdf", CV_MAX_BYTES + 1).ok).toBe(false);
  });

  it("accepts valid avatars and rejects oversize", () => {
    expect(validateFileAgainstKind("avatar", "image/webp", 2048).ok).toBe(true);
    expect(validateFileAgainstKind("avatar", "application/pdf", 2048).ok).toBe(false);
    expect(validateFileAgainstKind("avatar", "image/png", AVATAR_MAX_BYTES + 1).ok).toBe(false);
  });

  it("rejects empty files", () => {
    expect(validateFileAgainstKind("cv", "application/pdf", 0).ok).toBe(false);
  });

  it("detects magic bytes and cross-checks the declared MIME", () => {
    expect(detectMagicBytes(PDF)).toBe("pdf");
    expect(detectMagicBytes(PNG)).toBe("png");
    expect(detectMagicBytes(JPEG)).toBe("jpeg");
    expect(magicBytesMatchMime("cv", "application/pdf", "pdf")).toBe(true);
    // A PDF renamed as an image must not pass as an avatar.
    expect(magicBytesMatchMime("avatar", "image/png", "pdf")).toBe(false);
  });
});
