import { describe, expect, it } from "vitest";
import { parseChoices } from "../../src/lib/chat-choices";

describe("answer buttons", () => {
  it("takes the options off the end and leaves the question readable", () => {
    const { text, choices } = parseChoices(
      "من أنت اليوم؟\n[[choices: طالب أو خريج | محترف في مجال آخر | صاحب شركة | مدرّب أو خبير]]",
    );
    expect(text).toBe("من أنت اليوم؟");
    expect(choices).toEqual(["طالب أو خريج", "محترف في مجال آخر", "صاحب شركة", "مدرّب أو خبير"]);
  });

  it("leaves an ordinary answer untouched", () => {
    const answer = "الدورة تبدأ في أيار وسعرها 100 دولار.";
    expect(parseChoices(answer)).toEqual({ text: answer, choices: [] });
  });

  it("drops leading numbering the model may add to each option", () => {
    expect(parseChoices("س\n[[choices: 1) مبتدئ | 2. أساسيات | 3 - متقدّم]]").choices).toEqual([
      "مبتدئ",
      "أساسيات",
      "متقدّم",
    ]);
  });

  it("ignores a marker that is not at the end, so quoted text stays intact", () => {
    const text = "[[choices: a | b]] وبعدها كلام";
    expect(parseChoices(text).choices).toEqual([]);
  });

  it("keeps the row short and skips empty or oversized labels", () => {
    const many = parseChoices(`س\n[[choices: ${["a", "b", "c", "d", "e", "f", "g", "h"].join(" | ")}]]`);
    expect(many.choices).toHaveLength(6);
    expect(parseChoices(`س\n[[choices: أ |  | ${"x".repeat(80)} | ب]]`).choices).toEqual(["أ", "ب"]);
  });

  it("is case-insensitive and tolerates spacing from the model", () => {
    expect(parseChoices("س\n[[ Choices :  نعم | لا ]]").choices).toEqual(["نعم", "لا"]);
  });
});

describe("markers the model writes imperfectly", () => {
  it("reads the line even when wrapped in backticks, as the prompt example is", () => {
    const { text, choices } = parseChoices(
      "أهلاً، كيف أقدر أساعدك؟\n`[[choices: عندي سؤال | رشّح لي مساراً | شراكة]]`",
    );
    expect(choices).toEqual(["عندي سؤال", "رشّح لي مساراً", "شراكة"]);
    expect(text).toBe("أهلاً، كيف أقدر أساعدك؟");
    expect(text).not.toContain("`");
  });

  it("copes with a code fence or a trailing full stop", () => {
    expect(parseChoices("س\n```[[choices: أ | ب]]```").choices).toEqual(["أ", "ب"]);
    expect(parseChoices("س\n[[choices: أ | ب]].").choices).toEqual(["أ", "ب"]);
  });
});

describe("the shapes an Arabic reply actually arrives in", () => {
  const expected = ["نعم، ابدأ", "لاحقاً"];
  const line = "[[choices: نعم، ابدأ | لاحقاً]]";

  it("reads the line through invisible direction marks", () => {
    // What the live site showed as raw text: a right-to-left mark after the marker.
    expect(parseChoices(`سؤال\n\`${line}\`‏`).choices).toEqual(expected);
    expect(parseChoices(`سؤال\n‏\`${line}\``).choices).toEqual(expected);
  });

  it("reads it through Arabic punctuation and stray spacing", () => {
    expect(parseChoices(`سؤال\n\`${line}\`،`).choices).toEqual(expected);
    expect(parseChoices(`سؤال\n   ${line}   `).choices).toEqual(expected);
  });

  it("still removes the whole line from what the visitor reads", () => {
    const { text } = parseChoices(`سؤال\n\`${line}\`‏`);
    expect(text).toBe("سؤال");
    expect(text).not.toMatch(/choices|`|\[\[/);
  });

  it("leaves a marker that is part of a sentence alone", () => {
    const sentence = `اكتب السطر ${line} في نهاية الرسالة`;
    expect(parseChoices(sentence)).toEqual({ text: sentence, choices: [] });
  });

  it("ignores a marker buried far above the end of a long message", () => {
    const text = [line, "سطر", "سطر", "سطر آخر"].join("\n");
    expect(parseChoices(text).choices).toEqual([]);
  });
});
