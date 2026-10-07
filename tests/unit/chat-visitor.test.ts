import { describe, expect, it } from "vitest";
import { readVisitor, visitorContext } from "@/features/chat/lib/chat-visitor";

const kind = (...turns: string[]) => readVisitor(turns)?.kind ?? null;

describe("readVisitor", () => {
  it("recognises the payments provider from the 2026-10-06 conversation as a company", () => {
    const turns = [
      "أخبرني عن الجمعية",
      "منصة فيها دفع الكتروني لشي",
      "مو مفكرين يحطو كاش موبايل MTN",
      "لا بس وصل خبر انو حابين نكون وسيلة دفع الكتروني عندخم",
    ];
    expect(kind(...turns)).toBe("company");
    expect(readVisitor(turns)?.cues).toContain("حابين نكون");
    expect(kind("حذيفة محمود منسق العلاقات والاعمال بتطبيق كاش موبايل MTN")).toBe("company");
  });

  it("recognises other ways of speaking for an organisation", () => {
    expect(kind("أنا من شركة برمجيات بدمشق")).toBe("company");
    expect(kind("بدنا تدريب موظفين على الذكاء الاصطناعي")).toBe("company");
    expect(kind("شركتنا مهتمة بالتعاون")).toBe("company");
    expect(kind("We offer cloud hosting and would like to partner")).toBe("company");
    expect(kind("صاحب شركة أو جهة")).toBe("company");
    expect(kind("صاحب شركة")).toBe("company");
    expect(kind("بدي طوّر شغل شركتي")).toBe("company");
  });

  it("does not read a learner's questions about companies or partners as a company", () => {
    expect(kind("مين شركاء الجمعية؟")).toBe(null);
    expect(kind("هل في شركات بتوظف خريجين؟")).toBe(null);
    expect(kind("طبعاً بدي اتعلم")).toBe("learner");
    expect(kind("انا بالجامعة سنة رابعة")).toBe(null);
    expect(kind("انا باسم من حلب")).toBe(null);
    expect(kind("كيف بدفع؟ فيني ادفع بشام كاش؟")).toBe(null);
  });

  it("recognises trainers and learners", () => {
    expect(kind("أنا مدرّب ICDL وبدي أعطي دورة")).toBe("trainer");
    expect(kind("بدي صير مدرب معكم")).toBe("trainer");
    expect(kind("أنا طالبة طب")).toBe("learner");
    expect(kind("بدي ادرس برمجة")).toBe(null);
  });

  it("lets a company outrank a learner when both appear", () => {
    expect(kind("أنا خريج", "وهلق أنا من شركة ناشئة وحابين نتعاون معكم")).toBe("company");
  });
});

describe("visitorContext", () => {
  it("is empty when nothing is known, and names the clues otherwise", () => {
    expect(visitorContext(null)).toBe("");
    const note = visitorContext(readVisitor(["حابين نكون وسيلة دفع عندكم"]));
    expect(note).toContain("submit_company_lead");
    expect(note).toContain("«حابين نكون»");
  });
});
