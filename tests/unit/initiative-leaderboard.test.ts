import { describe, expect, it } from "vitest";
import { initialsFor, safeLogoUrl } from "../../src/components/initiative/live-leaderboard";

describe("the badge a sponsor gets when we hold no logo", () => {
  it("takes one initial from each of the first two words", () => {
    expect(initialsFor("Ilm Hub")).toBe("IH");
    expect(initialsFor("Syrian Association for AI")).toBe("SA");
  });

  it("takes three characters from a single-word name", () => {
    expect(initialsFor("Devista")).toBe("DEV");
    expect(initialsFor("elm")).toBe("ELM");
  });

  it("reads Arabic names by character, not by byte", () => {
    expect(initialsFor("شركة دمشق")).toBe("شد");
    expect(initialsFor("دمشق")).toBe("دمش");
  });

  it("does not split an astral character in half", () => {
    // Four code points, eight UTF-16 units: slicing by unit would emit a
    // lone surrogate and render as a replacement glyph.
    expect(initialsFor("𝐀𝐁𝐂𝐃")).toBe("𝐀𝐁𝐂");
  });

  it("survives a name that is only whitespace", () => {
    expect(initialsFor("   ")).toBe("?");
    expect(initialsFor("")).toBe("?");
  });
});

describe("which logo values are allowed to become an image source", () => {
  it("accepts an absolute http(s) URL", () => {
    expect(safeLogoUrl("https://cdn.example.org/a.png")).toBe("https://cdn.example.org/a.png");
    expect(safeLogoUrl("http://cdn.example.org/a.png")).toBe("http://cdn.example.org/a.png");
  });

  it("accepts a rooted same-origin path", () => {
    expect(safeLogoUrl("/cinematic/images/partners/partner-devista.webp")).toBe(
      "/cinematic/images/partners/partner-devista.webp",
    );
  });

  it("rejects a script-bearing scheme whatever its casing or padding", () => {
    expect(safeLogoUrl("javascript:alert(1)")).toBeNull();
    expect(safeLogoUrl("  JaVaScRiPt:alert(1)  ")).toBeNull();
    expect(safeLogoUrl("data:image/svg+xml,<svg onload=alert(1)>")).toBeNull();
    expect(safeLogoUrl("vbscript:msgbox(1)")).toBeNull();
  });

  it("rejects a protocol-relative host, which would leave our origin", () => {
    expect(safeLogoUrl("//evil.example/a.png")).toBeNull();
  });

  it("rejects a bare relative path rather than guessing a base", () => {
    expect(safeLogoUrl("a.png")).toBeNull();
    expect(safeLogoUrl("../../a.png")).toBeNull();
  });

  it("treats absent and empty values as no logo", () => {
    expect(safeLogoUrl(null)).toBeNull();
    expect(safeLogoUrl("")).toBeNull();
    expect(safeLogoUrl("   ")).toBeNull();
  });
});
