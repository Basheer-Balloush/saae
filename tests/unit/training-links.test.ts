import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { cleanSlug } from "@/features/lms/lib/link-slug";
import { slugRegex } from "@/features/lms/internships/lib/admin";

const read = (file: string) => readFileSync(path.resolve(__dirname, "../../src", file), "utf8");

describe("cleanSlug", () => {
  it("leaves a real slug alone", () => {
    expect(cleanSlug("internships-for-startups", 80)).toBe("internships-for-startups");
    expect(cleanSlug("ai-tot-program", 60)).toBe("ai-tot-program");
  });

  it("reads back a slug pasted with capitals or sentence punctuation", () => {
    expect(cleanSlug("Internships-For-Startups", 80)).toBe("internships-for-startups");
    expect(cleanSlug("generative-ai-09.", 60)).toBe("generative-ai-09");
    expect(cleanSlug("trainer-apply.)", 60)).toBe("trainer-apply");
    expect(cleanSlug("generative-ai-09،", 60)).toBe("generative-ai-09");
    expect(cleanSlug(" ai-tot-program ", 60)).toBe("ai-tot-program");
  });

  it("keeps a course id usable", () => {
    const id = "e216feb3-d62d-4d6f-8990-6b6d319b6674";
    expect(cleanSlug(id, 60)).toBe(id);
    expect(cleanSlug(id.toUpperCase(), 60)).toBe(id);
  });

  it("refuses what cannot be a slug", () => {
    expect(cleanSlug("xx", 80)).toBeNull();
    expect(cleanSlug("تدريب", 80)).toBeNull();
    expect(cleanSlug("two words", 80)).toBeNull();
    expect(cleanSlug("a".repeat(81), 80)).toBeNull();
    expect(cleanSlug("...", 80)).toBeNull();
  });

  it("only ever returns slugs the admin form would accept", () => {
    for (const raw of ["Data-Analysis-2026.", "multiomics-bioinformatics-ai-internship-2026!"]) {
      const slug = cleanSlug(raw, 80);
      expect(slug && slugRegex.test(slug)).toBe(true);
    }
  });
});

describe("training and internship links never dead-end", () => {
  it("sends a hidden, draft or unknown internship to the list with a note", () => {
    const detail = read("routes/learning-management-system/internships/$slug/index.tsx");
    expect(detail).not.toMatch(/throw notFound\(\)/);
    expect(detail).toMatch(/if \(!detail\) throw toList\(\)/);
    expect(detail).toMatch(/search: \{ unavailable: 1 \}/);
    const list = read("routes/learning-management-system/internships/index.tsx");
    expect(list).toMatch(/validateSearch/);
    expect(list).toMatch(/internshipUnavailableNote/);
  });

  it("does not link applicants to an opportunity that has no public page", () => {
    const profile = read("routes/learning-management-system/profile.tsx");
    expect(profile).toMatch(/r\.opportunity_listed \?/);
  });

  it.each([
    ["routes/internships/index.tsx", '"/learning-management-system/internships"'],
    ["routes/internships/$slug.tsx", '"/learning-management-system/internships/$slug"'],
    ["routes/training.tsx", '"/learning-management-system"'],
    ["routes/lms.tsx", '"/learning-management-system"'],
    ["routes/courses/index.tsx", '"/learning-management-system/catalog"'],
    ["routes/courses/$id.tsx", '"/learning-management-system/courses/$id"'],
    [
      "routes/learning-management-system/courses/index.tsx",
      '"/learning-management-system/catalog"',
    ],
  ])("short address %s redirects to %s", (file, target) => {
    const src = read(file);
    expect(src).toContain(`to: ${target}`);
    expect(src).toMatch(/statusCode: 301/);
  });

  it("lists the internships in the sitemap", () => {
    const sitemap = read("routes/sitemap[.]xml.ts");
    expect(sitemap).toContain('path: "/learning-management-system/internships"');
    expect(sitemap).toContain("/learning-management-system/internships/${row.slug}");
  });
});
