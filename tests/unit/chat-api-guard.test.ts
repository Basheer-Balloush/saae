import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  TOOL_NAMES,
  createLeakGuard,
  splitPrompt,
  normalizeWords,
} from "@/features/chat/lib/chat-api-guard";
import { SYSTEM_PROMPT } from "@/routes/api/chat";

const check = createLeakGuard(SYSTEM_PROMPT);

/** A section of the live prompt, from its heading to the next heading. */
function section(heading: string): string {
  const start = SYSTEM_PROMPT.indexOf(heading);
  expect(start, heading).toBeGreaterThan(-1);
  const next = SYSTEM_PROMPT.indexOf("\n#", start + heading.length);
  return SYSTEM_PROMPT.slice(start, next === -1 ? undefined : next);
}

describe("the leak check follows the website prompt", () => {
  it("knows every tool the assistant has", () => {
    const source = readFileSync("src/routes/api/chat.ts", "utf8");
    const tools = [...source.matchAll(/^\s+(\w+): tool\(\{/gm)].map((m) => m[1]);
    expect(tools.length).toBeGreaterThan(5);
    expect([...TOOL_NAMES].sort()).toEqual([...tools].sort());
  });

  it("finds the reference section it leaves out", () => {
    expect(SYSTEM_PROMPT).toContain("# === مرجع المعرفة الوحيد");
    expect(SYSTEM_PROMPT).toContain("# === نهاية المرجع ===");
    const { instructions, sayable } = splitPrompt(SYSTEM_PROMPT);
    expect(instructions).not.toContain("مقرّها دمشق");
    expect(instructions).toContain("قواعد المحادثة");
    expect(sayable).toContain("«أهلاً، أنا أبو الجود مساعد الجمعية. كيف أقدر أساعدك؟»");
  });
});

describe("holds back", () => {
  it("a recited section of the rules", () => {
    expect(check(section("# قواعد المحادثة"))).toBe("copied_instructions");
    expect(check(section("# نبرة الكلام"))).toBe("copied_instructions");
  });

  it("a recited section without harakat, shadda or hamza", () => {
    const plain = section("# قواعد المحادثة").replace(/[ً-ٟ]/g, "").replace(/[أإآ]/g, "ا");
    expect(check(plain)).toBe("copied_instructions");
  });

  it("a few recited rules inside a friendly answer", () => {
    const rules = section("# نبرة الكلام").split("\n").slice(1, 5).join("\n");
    expect(check(`أكيد! هي القواعد يلي ماشي عليها:\n${rules}`)).toBe("copied_instructions");
  });

  it("the assistant's tool names, in any language", () => {
    expect(check("I search with search_knowledge before answering.")).toBe("internal_term");
    expect(check("بستعمل أداة submit_company_lead لحفظ بياناتك")).toBe("internal_term");
  });

  it("talk of its system prompt or internal references", () => {
    expect(check("My system prompt says I should only talk about SAAE.")).toBe("internal_term");
    expect(check("حسب تعليمات النظام ما بقدر")).toBe("internal_term");
    expect(check("بحسب المراجع الإضافية المرفقة")).toBe("internal_term");
  });

  it("the intake script's numbered steps", () => {
    expect(check("د1) سؤال مفتوح عن الشركة\nد2) شو بدك")).toBe("internal_term");
  });
});

describe("lets through", () => {
  it("the welcome line and the lines it is told to say", () => {
    expect(
      check(
        "أهلاً، أنا أبو الجود مساعد الجمعية. كيف أقدر أساعدك؟\n[[choices: عندي سؤال | رشّح لي مساراً مناسباً | شراكة مع الجمعية]]",
      ),
    ).toBeNull();
    expect(
      check(
        "عرّفني عنك قليلاً — شو بتوصف حالك اليوم؟\n[[choices: طالب | خريج | موظف أو محترف | صاحب شركة أو جهة | مدرّب أو خبير]]",
      ),
    ).toBeNull();
  });

  it("the association's reference facts, word for word", () => {
    expect(check(section("# الهوية"))).toBeNull();
    expect(check(section("# تحدّي أبو الجود في معرض تكسبو"))).toBeNull();
  });

  it("an offer to a company that borrows the prompt's wording", () => {
    const reply =
      "تمام، فهمت عليك. الجمعية تدرّب الموظفين على الذكاء الاصطناعي والتحول الرقمي بتدريب يُرتَّب لفريقه مع فريق الجمعية، " +
      "وكمان الجمعية تعقد شراكات مع المؤسسات لتحويل العمل الواعد إلى مشاريع وخدمات. " +
      "تحب أسجّل طلبك ليتواصل معك فريق الجمعية؟\n[[choices: نعم | لا، شكراً]]";
    expect(check(reply)).toBeNull();
  });

  it("ordinary answers in Arabic and English", () => {
    expect(
      check(
        "على عيني. الدورة بتبلّش الأحد الجاي، وهي مجانية. [تفاصيل الدورة](https://www.aisyria.org/learning-management-system/courses/x)",
      ),
    ).toBeNull();
    expect(
      check(
        "That's outside what I can help with. I'm here for SAAE, its programs and courses. Want to see what's on offer?",
      ),
    ).toBeNull();
    expect(check("ولو، هاد واجبنا. إذا احتجت شي تاني أنا هون.")).toBeNull();
    expect(check("Prompt engineering is one of our course topics.")).toBeNull();
  });
});

describe("normalizeWords", () => {
  it("ignores harakat, tatweel, hamza forms, punctuation and case", () => {
    expect(normalizeWords("«تعرّف» على الجمعـية، أو Ask!")).toEqual([
      "تعرف",
      "علي",
      "الجمعيه",
      "او",
      "ask",
    ]);
  });
});
