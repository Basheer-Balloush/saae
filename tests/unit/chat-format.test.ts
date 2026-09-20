import { describe, expect, it } from "vitest";
import { formatMessage } from "../../src/lib/chat-format";

const plain = (t: string) => formatMessage(t).map((s) => s.text).join("");

describe("what the visitor reads", () => {
  it("shows bold as bold instead of printing the stars", () => {
    expect(formatMessage("قبل **العنوان** بعد")).toEqual([
      { text: "قبل ", bold: false },
      { text: "العنوان", bold: true },
      { text: " بعد", bold: false },
    ]);
  });

  it("never leaves a stray star on screen", () => {
    expect(plain("**(Question 1 of 6)**\n**Who are you?**")).toBe("(Question 1 of 6)\nWho are you?");
    expect(plain("an unclosed **marker here")).toBe("an unclosed marker here");
  });

  it("removes heading hashes and turns list dashes into bullets", () => {
    expect(plain("### عنوان\n- أول\n* ثاني")).toBe("عنوان\n• أول\n• ثاني");
  });

  it("treats underscores as bold, the way the model sometimes writes it", () => {
    expect(formatMessage("__مهم__")).toEqual([{ text: "مهم", bold: true }]);
  });

  it("leaves an ordinary sentence exactly as it is", () => {
    const s = "الدورة تبدأ في أيار وسعرها 100 دولار.";
    expect(formatMessage(s)).toEqual([{ text: s, bold: false }]);
  });

  it("keeps multi-line bold together", () => {
    expect(formatMessage("**سطر\nوسطر**")).toEqual([{ text: "سطر\nوسطر", bold: true }]);
  });
});
