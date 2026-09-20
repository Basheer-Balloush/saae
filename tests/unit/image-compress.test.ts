import { describe, expect, it } from "vitest";
import { COMPRESS_ABOVE_BYTES, fitWithin, shouldCompress, webpPath } from "../../src/lib/image-compress";

describe("which uploads get compressed", () => {
  it("compresses the phone photographs that caused the egress bill", () => {
    expect(shouldCompress("image/jpeg", 4 * 1024 * 1024)).toBe(true);
    expect(shouldCompress("image/png", 1.5 * 1024 * 1024)).toBe(true);
    expect(shouldCompress("image/webp", 900 * 1024)).toBe(true);
  });

  it("leaves small images alone, where re-encoding buys nothing", () => {
    expect(shouldCompress("image/png", 40 * 1024)).toBe(false);
    expect(shouldCompress("image/jpeg", COMPRESS_ABOVE_BYTES)).toBe(false);
  });

  it("never touches animated, vector or non-image uploads", () => {
    for (const type of ["image/gif", "image/svg+xml", "application/pdf", "video/mp4", ""]) {
      expect(shouldCompress(type, 9 * 1024 * 1024)).toBe(false);
    }
  });
});

describe("resizing", () => {
  it("fits a large photo inside the box, keeping its shape", () => {
    expect(fitWithin(4000, 3000, 1600)).toEqual({ width: 1600, height: 1200 });
    expect(fitWithin(3000, 4000, 1600)).toEqual({ width: 1200, height: 1600 });
  });

  it("never enlarges a small image", () => {
    expect(fitWithin(800, 600, 1600)).toEqual({ width: 800, height: 600 });
  });

  it("keeps a sliver of an extreme panorama visible", () => {
    expect(fitWithin(8000, 100, 1600)).toEqual({ width: 1600, height: 20 });
    expect(fitWithin(0, 0)).toEqual({ width: 0, height: 0 });
  });
});

describe("the stored name", () => {
  it("matches the bytes, so caches and downloads are not misled", () => {
    expect(webpPath("news/cover-123.png")).toBe("news/cover-123.webp");
    expect(webpPath("a/b/photo.JPEG")).toBe("a/b/photo.webp");
    expect(webpPath("already.webp")).toBe("already.webp");
  });

  it("leaves a name with no known extension recognisable", () => {
    expect(webpPath("covers/no-extension")).toBe("covers/no-extension.webp");
  });
});
