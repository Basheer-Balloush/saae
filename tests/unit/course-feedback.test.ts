import { describe, expect, it } from "vitest";
import {
  TEMPLATES,
  allQuestions,
  checkFeedback,
  getTemplate,
  missingInStep,
  otherKey,
  type ChoiceQuestion,
} from "@/lib/course-feedback-survey";
import { feedbackState } from "@/lib/course-feedback-state";

const standard = TEMPLATES.standard;
const choices = (t = standard) =>
  allQuestions(t).filter((q): q is ChoiceQuestion => q.kind === "choice");

/** A full set of answers: the first choice of every question. */
const fullAnswers = (t = standard) =>
  Object.fromEntries(choices(t).map((q) => [q.id, q.choices[0].id]));

describe("course feedback questions", () => {
  it.each(Object.values(TEMPLATES))(
    "$id asks 16 choice questions and 2 optional written ones in 3 steps",
    (t) => {
      const qs = allQuestions(t);
      expect(t.steps).toHaveLength(3);
      expect(qs.filter((q) => q.kind === "choice")).toHaveLength(16);
      expect(qs.filter((q) => q.kind === "text").map((q) => q.id)).toEqual(["opinion", "future"]);
      expect(new Set(qs.map((q) => q.id)).size).toBe(qs.length);
    },
  );

  it("has Arabic and English for every question and choice, with unique choice ids", () => {
    for (const t of Object.values(TEMPLATES)) {
      for (const q of allQuestions(t)) {
        expect(q.ar.trim() && q.en.trim()).toBeTruthy();
        if (q.kind !== "choice") continue;
        expect(new Set(q.choices.map((c) => c.id)).size).toBe(q.choices.length);
        for (const c of q.choices) expect(c.ar.trim() && c.en.trim()).toBeTruthy();
      }
    }
  });

  it("gives the architecture workshop its three session questions instead of the outcome ones", () => {
    const ids = allQuestions(TEMPLATES["ai-architects"]).map((q) => q.id);
    expect(ids).toEqual(
      expect.arrayContaining(["session_prompting", "session_visuals", "session_video"]),
    );
    expect(ids).not.toEqual(expect.arrayContaining(["goals"]));
    const session = choices(TEMPLATES["ai-architects"]).find((q) => q.id === "session_video")!;
    expect(session.choices.map((c) => c.id)).toEqual(["1", "2", "3", "4", "5", "na"]);
  });

  it("falls back to the standard template for an unknown or empty course setting", () => {
    expect(getTemplate("ai-architects").id).toBe("ai-architects");
    expect(getTemplate("something-else").id).toBe("standard");
    expect(getTemplate(null).id).toBe("standard");
  });
});

describe("checking a response", () => {
  it("accepts a complete submission with blank comments", () => {
    const res = checkFeedback(
      standard,
      { answers: fullAnswers(), notes: { opinion: "   " } },
      "submit",
    );
    expect(res.ok).toBe(true);
    expect(res.clean.notes).toEqual({});
  });

  it("names every unanswered question on submit, but lets a draft be partial", () => {
    const answers = fullAnswers();
    delete answers.pace;
    delete answers.recommend;
    const res = checkFeedback(standard, { answers, notes: {} }, "submit");
    expect(res.ok).toBe(false);
    expect(res.issues).toEqual([
      { question: "pace", problem: "missing" },
      { question: "recommend", problem: "missing" },
    ]);
    expect(checkFeedback(standard, { answers: { pace: "right" }, notes: {} }, "draft").ok).toBe(
      true,
    );
  });

  it("refuses choices and questions that do not exist", () => {
    const res = checkFeedback(
      standard,
      { answers: { ...fullAnswers(), pace: "7", made_up: "1" }, notes: { hacked: "x" } },
      "submit",
    );
    expect(res.issues).toEqual(
      expect.arrayContaining([
        { question: "pace", problem: "invalid" },
        { question: "made_up", problem: "unknown" },
        { question: "hacked", problem: "unknown" },
      ]),
    );
  });

  it("refuses a workshop answer on the standard template", () => {
    const res = checkFeedback(standard, { answers: { session_video: "5" }, notes: {} }, "draft");
    expect(res.issues).toEqual([{ question: "session_video", problem: "unknown" }]);
  });

  it("limits written answers to 2,000 characters, counting Arabic letters once", () => {
    const at = "ب".repeat(2000);
    expect(checkFeedback(standard, { answers: {}, notes: { future: at } }, "draft").ok).toBe(true);
    expect(
      checkFeedback(standard, { answers: {}, notes: { future: at + "ب" } }, "draft").issues,
    ).toEqual([{ question: "future", problem: "too_long" }]);
  });

  it("keeps the 'other' text only when 'other' is the answer", () => {
    const withOther = checkFeedback(
      standard,
      { answers: { improve: "other" }, notes: { [otherKey("improve")]: " Arabic subtitles " } },
      "draft",
    );
    expect(withOther.clean.notes).toEqual({ improve_other: "Arabic subtitles" });
    const without = checkFeedback(
      standard,
      { answers: { improve: "playback" }, notes: { [otherKey("improve")]: "left over" } },
      "draft",
    );
    expect(without.ok).toBe(true);
    expect(without.clean.notes).toEqual({});
  });

  it("finds what is missing in a step", () => {
    const [platform] = standard.steps;
    expect(missingInStep(platform, { navigation: "3", audio: "4" })).toEqual([
      "video_playback",
      "readability",
      "device",
    ]);
    expect(missingInStep(standard.steps[2], fullAnswers())).toEqual([]);
  });
});

describe("where a learner stands", () => {
  const base = { enrolled: true, onsite: false, submitted: false };

  it("opens the form once lessons and quiz are done", () => {
    expect(feedbackState({ ...base, reason: "feedback_required" })).toBe("open");
    // Before the certificate rule is on, or with a certificate issued earlier.
    expect(feedbackState({ ...base, reason: null })).toBe("open");
  });

  it("sends the learner back to the lessons or the quiz first", () => {
    expect(feedbackState({ ...base, reason: "lessons_incomplete" })).toBe("lessons_incomplete");
    expect(feedbackState({ ...base, reason: "progress_incomplete" })).toBe("lessons_incomplete");
    expect(feedbackState({ ...base, reason: "quiz_not_passed" })).toBe("quiz_required");
  });

  it("does not ask onsite learners, anyone not enrolled, or anyone who already answered", () => {
    expect(feedbackState({ ...base, onsite: true, reason: null })).toBe("onsite");
    expect(feedbackState({ ...base, enrolled: false, reason: null })).toBe("not_enrolled");
    expect(feedbackState({ ...base, submitted: true, reason: "feedback_required" })).toBe(
      "submitted",
    );
    expect(feedbackState({ ...base, reason: "no_lessons" })).toBe("unavailable");
  });
});
