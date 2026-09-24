import { describe, expect, it } from "vitest";
import { getUnansweredQuestions, isQuestionAnswered } from "../../src/lib/quiz-validation";
import { isSkinnedLmsPath } from "../../src/components/lms-skin/skin";

const questions = [
  { question_key: "first", choices: ["A", "B"] },
  { question_key: "middle", choices: ["A", "B", "C"] },
  { question_key: "last", choices: ["A", "B"] },
];
describe("quiz completion", () => {
  it("accepts the first option (zero) as an answer", () => {
    expect(isQuestionAnswered(questions[0], { first: 0 })).toBe(true);
  });
  it("finds a skipped question even when the final question was answered", () => {
    expect(getUnansweredQuestions(questions, { first: 0, last: 1 })).toEqual([questions[1]]);
  });
  it("returns every omission in question order, ignoring unrelated keys", () => {
    expect(getUnansweredQuestions(questions, { last: 1, unrelated: 0 })).toEqual(
      questions.slice(0, 2),
    );
  });
  it("allows submission only after every displayed question has a valid choice", () => {
    expect(getUnansweredQuestions(questions, { first: 0, middle: 2, last: 1 })).toEqual([]);
  });
  it.each([-1, 2, 0.5, NaN, Infinity, undefined, null, "0"])(
    "rejects invalid selection %s",
    (value) => {
      expect(isQuestionAnswered(questions[0], { first: value } as Record<string, number>)).toBe(
        false,
      );
    },
  );
  it("rejects unavailable choices and inherited answers", () => {
    expect(isQuestionAnswered({ question_key: "first", choices: null }, { first: 0 })).toBe(false);
    expect(isQuestionAnswered(questions[0], Object.create({ first: 0 }))).toBe(false);
  });
  it("updates the first missing question after the student fills a gap", () => {
    expect(getUnansweredQuestions(questions, {})[0].question_key).toBe("first");
    expect(getUnansweredQuestions(questions, { first: 0 })[0].question_key).toBe("middle");
  });
});
describe("quiz styling scope", () => {
  it("uses the LMS identity for the student quiz menu and attempt route", () => {
    expect(isSkinnedLmsPath("/learning-management-system/student/quiz/course-123")).toBe(true);
    expect(isSkinnedLmsPath("/learning-management-system/instructor/quiz-results/course-123")).toBe(
      true,
    );
    expect(isSkinnedLmsPath("/learning-management-system/student/player/course-123")).toBe(false);
  });
});
