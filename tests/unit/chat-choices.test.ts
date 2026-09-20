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
