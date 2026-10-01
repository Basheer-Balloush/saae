import { describe, expect, it } from "vitest";
import type { FormDefinition } from "@/features/lms/course-feedback/lib/survey";
import {
  feedbackCsv,
  responseLines,
  summarizeFeedback,
  versionKey,
  type ReportResponse,
} from "@/features/lms/course-feedback/lib/report";

const F = "00000000-0000-0000-0000-00000000000f";

/** Version 1: a pace question and a comment box. */
const v1: FormDefinition = {
  steps: [
    {
      id: "s1",
      title: { ar: "الخطوة", en: "Step" },
      questions: [
        {
          kind: "choice",
          id: "pace",
          ar: "السرعة؟",
          en: "Pace?",
          required: true,
          choices: [
            { id: "slow", ar: "بطيئة", en: "Slow" },
            { id: "right", ar: "مناسبة", en: "Right" },
            { id: "fast", ar: "سريعة", en: "Fast" },
          ],
        },
        {
          kind: "text",
          id: "old_comment",
          ar: "تعليق؟",
          en: "Comment?",
          required: false,
          max: 2000,
        },
      ],
    },
  ],
};

/** Version 2: pace reworded and "fast" dropped, the comment removed, a
    question with "other" added. */
const v2: FormDefinition = {
  steps: [
    {
      id: "s1",
      title: { ar: "الخطوة", en: "Step" },
      questions: [
        {
          kind: "choice",
          id: "pace",
          ar: "كيف كانت السرعة؟",
          en: "How was the pace?",
          required: true,
          choices: [
            { id: "slow", ar: "بطيئة", en: "Slow" },
            { id: "right", ar: "مناسبة", en: "About right" },
          ],
        },
        {
          kind: "choice",
          id: "improve",
          ar: "ما يحتاج تحسيناً؟",
          en: "What needs improving?",
          required: false,
          otherText: true,
          choices: [
            { id: "video", ar: "الفيديو", en: "Video" },
            { id: "other", ar: "أمر آخر", en: "Other" },
          ],
        },
      ],
    },
  ],
};

const versions = { [versionKey(F, 1)]: v1, [versionKey(F, 2)]: v2 };
const response = (
  id: string,
  formVersion: number,
  answers: Record<string, string>,
  notes: Record<string, string> = {},
): ReportResponse => ({
  id,
  studentId: `student-${id}`,
  formId: F,
  formVersion,
  lang: "ar",
  submittedAt: "2026-09-28T10:00:00Z",
  answers,
  notes,
});

const responses = [
  response("a", 1, { pace: "fast" }, { old_comment: "Great" }),
  response("b", 1, { pace: "right" }),
  response("c", 2, { pace: "right", improve: "other" }, { improve_other: "More exercises" }),
];

describe("feedback totals", () => {
  const summary = summarizeFeedback(v2, responses, versions);

  it("lists the current form's questions first, then removed ones", () => {
    expect(summary.map((q) => [q.id, q.current])).toEqual([
      ["pace", true],
      ["improve", true],
      ["old_comment", false],
    ]);
  });

  it("counts a question across versions under its current wording", () => {
    const pace = summary[0];
    expect(pace.en).toBe("How was the pace?");
    expect(pace.asked).toBe(3);
    expect(pace.answered).toBe(3);
    expect(pace.choices.map((c) => [c.id, c.en, c.count])).toEqual([
      ["slow", "Slow", 0],
      ["right", "About right", 2],
      // Dropped from the current form: kept with the wording learners saw.
      ["fast", "Fast", 1],
    ]);
  });

  it("only counts responses whose form asked the question", () => {
    const improve = summary[1];
    expect(improve.asked).toBe(1);
    expect(improve.choices.find((c) => c.id === "other")?.count).toBe(1);
    expect(improve.texts).toEqual([
      { responseId: "c", studentId: "student-c", text: "More exercises" },
    ]);
    const comment = summary[2];
    expect(comment.asked).toBe(2);
    expect(comment.answered).toBe(1);
    expect(comment.texts.map((x) => x.text)).toEqual(["Great"]);
  });
});

describe("one response", () => {
  it("reads back with the questions and choices that learner saw", () => {
    expect(responseLines(responses[0], versions, "en")).toEqual([
      { question: "Pace?", answer: "Fast" },
      { question: "Comment?", answer: "Great" },
    ]);
    expect(responseLines(responses[2], versions, "ar")).toEqual([
      { question: "كيف كانت السرعة؟", answer: "مناسبة" },
      { question: "ما يحتاج تحسيناً؟", answer: "أمر آخر: More exercises" },
    ]);
  });
});

describe("the CSV", () => {
  it("has a column per question, reads in Excel, and never runs a formula", () => {
    const risky = response("d", 2, { pace: "slow" });
    risky.notes = {};
    const all = [...responses, risky];
    const csv = feedbackCsv(
      summarizeFeedback(v2, all, versions),
      all,
      versions,
      { "student-a": "Rana", "student-d": '=HYPERLINK("x")' },
      "en",
    );
    expect(csv.startsWith("﻿")).toBe(true);
    const lines = csv.slice(1).split("\r\n");
    expect(lines[0]).toBe(
      '"Name","Submitted","Language","Form version","How was the pace?","What needs improving?","Comment?"',
    );
    expect(lines[1]).toBe('"Rana","2026-09-28T10:00:00Z","ar","1","Fast","","Great"');
    expect(lines[3]).toContain('"Other: More exercises"');
    expect(lines[4].startsWith(`"'=HYPERLINK(""x"")"`)).toBe(true);
  });
});
