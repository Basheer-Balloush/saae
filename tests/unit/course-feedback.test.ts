import { describe, expect, it } from "vitest";
import {
  DEFAULT_FORM,
  LIMITS,
  OTHER_CHOICE,
  allQuestions,
  checkFeedback,
  formDefinitionSchema,
  formProblems,
  keepValidAnswers,
  missingInStep,
  newId,
  otherKey,
  type ChoiceQuestion,
  type FormDefinition,
} from "@/features/lms/course-feedback/lib/survey";
import { feedbackState } from "@/features/lms/course-feedback/lib/state";

const form = DEFAULT_FORM;
const choices = (f: FormDefinition = form) =>
  allQuestions(f).filter((q): q is ChoiceQuestion => q.kind === "choice");

/** A full set of answers: the first choice of every question. */
const fullAnswers = (f: FormDefinition = form) =>
  Object.fromEntries(choices(f).map((q) => [q.id, q.choices[0].id]));

/** A deep copy to edit in a test. */
const copy = (f: FormDefinition = form): FormDefinition => structuredClone(f);

describe("the default form", () => {
  it("asks 9 required choice questions and 1 optional written one in 2 steps", () => {
    const qs = allQuestions(form);
    expect(form.steps).toHaveLength(2);
    expect(qs).toHaveLength(10);
    expect(qs.filter((q) => q.kind === "choice" && q.required)).toHaveLength(9);
    expect(qs.filter((q) => q.kind === "text" && !q.required).map((q) => q.id)).toEqual([
      "comments",
    ]);
  });

  it("follows every rule a saved form must follow", () => {
    expect(formProblems(form)).toEqual([]);
    expect(formDefinitionSchema.parse(form)).toEqual(form);
  });
});

describe("the rules for an edited form", () => {
  it("needs both languages on steps, questions and choices", () => {
    const f = copy();
    f.steps[0].title.en = " ";
    f.steps[0].questions[0].ar = "";
    (f.steps[0].questions[1] as ChoiceQuestion).choices[2].en = "";
    expect(formProblems(f)).toEqual([
      { code: "step_title", step: 0 },
      { code: "question_text", step: 0, question: 0 },
      { code: "choice_text", step: 0, question: 1, choice: 2 },
    ]);
  });

  it("needs at least one step, one question, and two choices per choice question", () => {
    expect(formProblems({ steps: [] }).map((p) => p.code)).toEqual(["no_steps"]);
    const empty = copy();
    empty.steps = [{ ...empty.steps[0], questions: [] }];
    expect(formProblems(empty).map((p) => p.code)).toEqual(["no_questions", "empty_step"]);
    const f = copy();
    (f.steps[0].questions[0] as ChoiceQuestion).choices.splice(1);
    expect(formProblems(f)).toEqual([{ code: "too_few_choices", step: 0, question: 0 }]);
  });

  it("refuses repeated ids and ids that clash with an 'other' note", () => {
    const f = copy();
    f.steps[1].questions[0].id = f.steps[0].questions[0].id;
    f.steps[1].questions[3].id = "video_other";
    const q = f.steps[0].questions[1] as ChoiceQuestion;
    q.choices[1].id = q.choices[0].id;
    expect(formProblems(f).map((p) => p.code)).toEqual([
      "duplicate_choice",
      "duplicate_question",
      "reserved_question_id",
    ]);
  });

  it("keeps 'other' as the last choice when it opens a text box", () => {
    const f = copy();
    const q = f.steps[1].questions[2] as ChoiceQuestion;
    q.choices = [OTHER_CHOICE, ...q.choices.filter((c) => c.id !== OTHER_CHOICE.id)];
    expect(formProblems(f).map((p) => p.code)).toEqual(["other_last"]);
  });

  it("caps steps, questions and choices", () => {
    const f = copy();
    f.steps = Array.from({ length: LIMITS.steps + 1 }, (_, i) => ({
      ...f.steps[0],
      id: `s${i}`,
      questions: f.steps[0].questions.map((q) => ({ ...q, id: `${q.id}_${i}` })),
    }));
    expect(formProblems(f).map((p) => p.code)).toEqual(["too_many_steps"]);
    expect(formDefinitionSchema.safeParse(f).success).toBe(false);
  });

  it("refuses malformed input before looking at it", () => {
    const bad = copy() as unknown as { steps: { questions: { kind: string }[] }[] };
    bad.steps[0].questions[0].kind = "rating";
    expect(formDefinitionSchema.safeParse(bad).success).toBe(false);
    const badId = copy();
    badId.steps[0].questions[0].id = "Has Spaces";
    expect(formDefinitionSchema.safeParse(badId).success).toBe(false);
  });

  it("makes fresh ids that are not taken", () => {
    const taken = ["q_aaaaaa", "q_bbbbbb"];
    const id = newId("q", taken);
    expect(id).toMatch(/^q_[a-z0-9]{1,6}$/);
    expect(taken).not.toContain(id);
  });
});

describe("checking a response", () => {
  it("accepts a complete submission with blank comments", () => {
    const res = checkFeedback(
      form,
      { answers: fullAnswers(), notes: { comments: "   " } },
      "submit",
    );
    expect(res.ok).toBe(true);
    expect(res.clean.notes).toEqual({});
  });

  it("names every unanswered required question on submit, but lets a draft be partial", () => {
    const answers = fullAnswers();
    delete answers.pace;
    delete answers.satisfaction;
    const res = checkFeedback(form, { answers, notes: {} }, "submit");
    expect(res.ok).toBe(false);
    expect(res.issues).toEqual([
      { question: "pace", problem: "missing" },
      { question: "satisfaction", problem: "missing" },
    ]);
    expect(checkFeedback(form, { answers: { pace: "right" }, notes: {} }, "draft").ok).toBe(true);
  });

  it("requires a written answer when the admin made it required, and not a choice left optional", () => {
    const f = copy();
    const comments = f.steps[1].questions.find((q) => q.id === "comments")!;
    comments.required = true;
    f.steps[0].questions[0].required = false;
    const answers = fullAnswers(f);
    delete answers.platform;
    const res = checkFeedback(f, { answers, notes: { comments: "  " } }, "submit");
    expect(res.issues).toEqual([{ question: "comments", problem: "missing" }]);
    expect(checkFeedback(f, { answers, notes: { comments: "Good" } }, "submit").ok).toBe(true);
  });

  it("refuses choices and questions that do not exist", () => {
    const res = checkFeedback(
      form,
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

  it("limits written answers to 2,000 characters, counting Arabic letters once", () => {
    const at = "ب".repeat(2000);
    expect(checkFeedback(form, { answers: {}, notes: { comments: at } }, "draft").ok).toBe(true);
    expect(
      checkFeedback(form, { answers: {}, notes: { comments: at + "ب" } }, "draft").issues,
    ).toEqual([{ question: "comments", problem: "too_long" }]);
  });

  it("keeps the 'other' text only when 'other' is the answer", () => {
    const withOther = checkFeedback(
      form,
      { answers: { improve: "other" }, notes: { [otherKey("improve")]: " Arabic subtitles " } },
      "draft",
    );
    expect(withOther.clean.notes).toEqual({ improve_other: "Arabic subtitles" });
    const without = checkFeedback(
      form,
      { answers: { improve: "video" }, notes: { [otherKey("improve")]: "left over" } },
      "draft",
    );
    expect(without.ok).toBe(true);
    expect(without.clean.notes).toEqual({});
  });

  it("finds what is missing in a step, written questions included", () => {
    const [first] = form.steps;
    expect(missingInStep(first, { platform: "3", teaching: "4" }, {})).toEqual([
      "video",
      "examples",
      "pace",
      "readiness",
    ]);
    const last = copy().steps[1];
    last.questions.find((q) => q.id === "comments")!.required = true;
    expect(missingInStep(last, fullAnswers(), {})).toEqual(["comments"]);
    expect(missingInStep(last, fullAnswers(), { comments: "More practice" })).toEqual([]);
  });
});

describe("a draft after the admin edits the form", () => {
  it("keeps the answers that still fit and drops the rest", () => {
    const f = copy();
    // The admin removed "video", dropped a pace choice and made "comments"
    // shorter.
    f.steps[0].questions = f.steps[0].questions.filter((q) => q.id !== "video");
    const pace = f.steps[0].questions.find((q) => q.id === "pace") as ChoiceQuestion;
    pace.choices = pace.choices.filter((c) => c.id !== "much_fast");
    const comments = f.steps[1].questions.find((q) => q.id === "comments")!;
    if (comments.kind === "text") comments.max = 10;
    const kept = keepValidAnswers(f, {
      answers: { platform: "4", video: "5", pace: "much_fast", improve: "other" },
      notes: { comments: "  far too long for ten  ", improve_other: "subtitles", gone: "x" },
    });
    expect(kept).toEqual({
      answers: { platform: "4", improve: "other" },
      notes: { comments: "far too lo", improve_other: "subtitles" },
    });
  });
});

describe("where a learner stands", () => {
  const base = { enrolled: true, onsite: false, enabled: true, submitted: false };

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

  it("asks nothing on a course an admin switched feedback off for", () => {
    expect(feedbackState({ ...base, enabled: false, reason: null })).toBe("disabled");
    // A response sent before it was switched off still counts as sent.
    expect(feedbackState({ ...base, enabled: false, submitted: true, reason: null })).toBe(
      "submitted",
    );
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
