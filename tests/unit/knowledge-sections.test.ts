import { describe, expect, it } from "vitest";
import { splitKnowledgeSections } from "../../src/lib/knowledge-sections";

describe("splitting an uploaded knowledge file", () => {
  it("makes one entry per ## heading, titled by the heading", () => {
    const md = "# ملف المعرفة\nملاحظة للمراجع\n\n## عن الجمعية\nالجمعية غير ربحية في سوريا.\n\n---\n\n## التواصل\n```\nالبريد: info@aisyria.org\n```\n";
    expect(splitKnowledgeSections("ignored", md)).toEqual([
      { title: "عن الجمعية", text: "الجمعية غير ربحية في سوريا." },
      { title: "التواصل", text: "البريد: info@aisyria.org" },
    ]);
  });

  it("keeps a text without headings as one entry under the typed title", () => {
    expect(splitKnowledgeSections(" رسوم الدورات ", "بعض الدورات مجانية وبعضها برسوم.")).toEqual([
      { title: "رسوم الدورات", text: "بعض الدورات مجانية وبعضها برسوم." },
    ]);
  });

  it("skips headings with no real text under them", () => {
    expect(splitKnowledgeSections("t", "## فارغ\n\n## ممتلئ\nنص كافٍ هنا للحفظ.")).toEqual([
      { title: "ممتلئ", text: "نص كافٍ هنا للحفظ." },
    ]);
  });

  it("treats ### and deeper headings as part of the entry, and handles Windows line endings", () => {
    expect(splitKnowledgeSections("t", "## أ\r\n### فرعي\r\nسطر من النص.")).toEqual([
      { title: "أ", text: "### فرعي\nسطر من النص." },
    ]);
  });
});
