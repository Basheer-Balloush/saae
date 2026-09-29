import { describe, expect, it } from "vitest";
import { chatErrorText, formatMessage } from "../../src/features/chat/lib/chat-format";

const plain = (t: string) =>
  formatMessage(t)
    .map((s) => s.text)
    .join("");

describe("what the visitor reads", () => {
  it("shows bold as bold instead of printing the stars", () => {
    expect(formatMessage("قبل **العنوان** بعد")).toEqual([
      { text: "قبل ", bold: false },
      { text: "العنوان", bold: true },
      { text: " بعد", bold: false },
    ]);
  });

  it("never leaves a stray star on screen", () => {
    expect(plain("**(Question 1 of 6)**\n**Who are you?**")).toBe(
      "(Question 1 of 6)\nWho are you?",
    );
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

describe("links in answers", () => {
  it("turns a bare course URL into a link, on www, leaving the full stop outside", () => {
    expect(
      formatMessage("سجّل هنا: https://aisyria.org/learning-management-system/courses/gen-ai-09."),
    ).toEqual([
      { text: "سجّل هنا: ", bold: false },
      {
        text: "https://www.aisyria.org/learning-management-system/courses/gen-ai-09",
        bold: false,
        href: "https://www.aisyria.org/learning-management-system/courses/gen-ai-09",
      },
      { text: ".", bold: false },
    ]);
  });

  it("keeps the label of a markdown link", () => {
    expect(formatMessage("[Generative AI 09](https://www.aisyria.org/x)")).toEqual([
      { text: "Generative AI 09", bold: false, href: "https://www.aisyria.org/x" },
    ]);
  });

  it("never makes a link out of a non-web scheme", () => {
    expect(formatMessage("[click](javascript:alert(1))").some((s) => s.href)).toBe(false);
  });

  it("keeps a link inside bold text bold", () => {
    expect(formatMessage("**https://www.aisyria.org/a**")).toEqual([
      { text: "https://www.aisyria.org/a", bold: true, href: "https://www.aisyria.org/a" },
    ]);
  });
});

describe("what the visitor reads when a reply fails", () => {
  it("keeps the server's own visitor wording", () => {
    const busy = "الخدمة مزدحمة الآن… info@aisyria.org.";
    expect(chatErrorText(busy, "ar")).toBe(busy);
  });

  it("rewords raw network and rate-limit errors in the visitor's language", () => {
    expect(chatErrorText("Failed to fetch", "ar")).toMatch(/تعذّر الوصول/);
    expect(chatErrorText("Rate limit exceeded. Please slow down.", "ar")).toMatch(/انتظر دقيقة/);
    expect(chatErrorText("Chat is temporarily unavailable", "en")).toMatch(/try again shortly/);
  });
});
