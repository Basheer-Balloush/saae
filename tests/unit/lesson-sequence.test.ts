import { describe, expect, it } from "vitest";
import { openLessonIds, orderLessons, upNextLesson } from "@/features/lms/lib/lesson-sequence";

const sections = [
  { id: "s2", display_order: 2 },
  { id: "s1", display_order: 1 },
];
const lessons = [
  { id: "c", section_id: "s2", display_order: 1 },
  { id: "b", section_id: "s1", display_order: 2 },
  { id: "a2", section_id: "s1", display_order: 1 },
  { id: "a1", section_id: "s1", display_order: 1 },
  { id: "x", section_id: "gone", display_order: 0 },
];
const ids = (list: { id: string }[]) => list.map((l) => l.id);

describe("lesson order", () => {
  it("orders by section, then lesson, with the id settling ties", () => {
    expect(ids(orderLessons(sections, lessons))).toEqual(["a1", "a2", "b", "c"]);
  });

  it("leaves out lessons whose section is not in the course", () => {
    expect(ids(orderLessons(sections, lessons))).not.toContain("x");
  });
});

describe("open lessons", () => {
  const ordered = orderLessons(sections, lessons);
  const open = (...done: string[]) => [...openLessonIds(ordered, new Set(done))].sort();

  it("opens only the first lesson for a new student", () => {
    expect(open()).toEqual(["a1"]);
  });

  it("opens each lesson once the one before it is completed", () => {
    expect(open("a1")).toEqual(["a1", "a2"]);
    expect(open("a1", "a2", "b")).toEqual(["a1", "a2", "b", "c"]);
  });

  it("keeps completed lessons open to go back to", () => {
    expect(open("a1", "a2", "b", "c")).toEqual(["a1", "a2", "b", "c"]);
  });

  it("keeps lessons completed out of order open, but nothing past the first gap", () => {
    // Completed before lessons were locked: a2 was skipped.
    expect(open("a1", "b")).toEqual(["a1", "a2", "b"]);
  });

  it("ignores completions from other courses", () => {
    expect(open("elsewhere")).toEqual(["a1"]);
  });
});

describe("up next", () => {
  const ordered = orderLessons(sections, lessons);
  const after = (id: string, ...done: string[]) =>
    upNextLesson(ordered, id, new Set(done))?.id ?? null;

  it("moves on to the next lesson once the current one is completed", () => {
    expect(after("a1", "a1")).toBe("a2");
    expect(after("b", "a1", "a2", "b")).toBe("c");
  });

  it("goes back to the first lesson still to complete when the next is locked", () => {
    // a2 was skipped before lessons were locked; b is replayed.
    expect(after("b", "a1", "b")).toBe("a2");
  });

  it("returns to an unfinished lesson from the last one, or stops when all are done", () => {
    expect(after("c", "a1", "b", "c")).toBe("a2");
    expect(after("c", "a1", "a2", "b", "c")).toBeNull();
  });
});
