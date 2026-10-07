import { describe, expect, it } from "vitest";
import { leadSummaryPrompt, parseLeadSummary } from "@/features/crm/lib/lead-summary";

describe("parseLeadSummary", () => {
  it("reads the JSON, also inside a code fence", () => {
    const fenced =
      '```json\n{"reason": "صيدلاني يريد دورات مجانية", "details": "صيدلاني سأل عن دورات."}\n```';
    expect(parseLeadSummary(fenced)).toEqual({
      reason: "صيدلاني يريد دورات مجانية",
      details: "صيدلاني سأل عن دورات.",
    });
  });

  it("refuses replies that are not a full summary", () => {
    expect(parseLeadSummary("لا أعرف")).toBe(null);
    expect(parseLeadSummary('{"reason": "x"}')).toBe(null);
    expect(parseLeadSummary('{"reason": "x", "details": ')).toBe(null);
  });
});

describe("leadSummaryPrompt", () => {
  it("names the speakers, keeps only the conversation, and asks for JSON", () => {
    const prompt = leadSummaryPrompt("company", [
      { role: "system", content: "hidden" },
      { role: "user", content: "حابين نكون وسيلة دفع عندكم" },
      { role: "assistant", content: "على راسي، شو اسم الشركة؟" },
    ]);
    expect(prompt).toContain("الزائر: حابين نكون وسيلة دفع عندكم");
    expect(prompt).toContain("أبو الجود: على راسي");
    expect(prompt).not.toContain("hidden");
    expect(prompt).toContain("شركة أو جهة");
    expect(prompt).toContain('{"reason": "...", "details": "..."}');
  });
});
