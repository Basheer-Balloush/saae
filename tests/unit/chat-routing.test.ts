import { describe, expect, it } from "vitest";
import { needsKnowledgeSearch } from "../../src/features/chat/lib/chat-routing";

describe("when the assistant searches its knowledge", () => {
  it("skips a button the assistant just offered", () => {
    expect(needsKnowledgeSearch("طالب أو خريج", ["طالب أو خريج", "صاحب شركة"])).toBe(false);
  });

  it("skips greetings and thanks", () => {
    expect(needsKnowledgeSearch("مرحباً!")).toBe(false);
    expect(needsKnowledgeSearch("Thank you.")).toBe(false);
    expect(needsKnowledgeSearch("السلام عليكم")).toBe(false);
  });

  it("searches a real question, even one that starts with a greeting", () => {
    expect(needsKnowledgeSearch("ما هي رسوم العضوية؟")).toBe(true);
    expect(needsKnowledgeSearch("مرحبا، متى المؤتمر السنوي؟")).toBe(true);
  });

  it("searches free text typed instead of pressing a button", () => {
    expect(needsKnowledgeSearch("أنا طالب طب بدي أتعلم تحليل الصور", ["طالب أو خريج"])).toBe(true);
  });
});
