import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("global not-found experience", () => {
  const source = fs.readFileSync(
    path.resolve(process.cwd(), "src/features/website/not-found/NotFoundPage.tsx"),
    "utf8",
  );

  it("uses Abu Al-Joud and opens the real assistant", () => {
    expect(source).toContain("ABU_AL_JOUD.think");
    expect(source).toContain('new CustomEvent("assistant:open")');
  });

  it("provides bilingual recovery paths", () => {
    expect(source).toContain("Back to home");
    expect(source).toContain("العودة للرئيسية");
    expect(source).toContain('href="/" classes="nf-primary"');
  });

  it("provides a bilingual all-rights-reserved footer", () => {
    expect(source).toContain('All rights reserved"');
    expect(source).toContain('جميع الحقوق محفوظة"');
    expect(source).toContain("{copy.footer}");
    expect(source).toContain("<sup>©</sup> 2026");
    expect(source).toMatch(/<\/bdi>\s*\./);
  });
});
