import { describe, it, expect } from "vitest";
import {
  canTransition,
  LIFECYCLE_TRANSITIONS,
  OpportunityInputSchema,
  slugRegex,
} from "@/lib/lms-internships-admin";

describe("internship lifecycle (baseline regression guard)", () => {
  it("allows only declared transitions", () => {
    expect(canTransition("draft", "published")).toBe(true);
    expect(canTransition("published", "closed")).toBe(true);
    expect(canTransition("closed", "published")).toBe(true);
    expect(canTransition("draft", "closed")).toBe(false);
  });

  it("treats archived as terminal", () => {
    expect(LIFECYCLE_TRANSITIONS.archived).toHaveLength(0);
    expect(canTransition("archived", "published")).toBe(false);
    expect(canTransition("archived", "archived")).toBe(true);
  });

  it("enforces slug shape", () => {
    expect(slugRegex.test("data-analysis-2026")).toBe(true);
    expect(slugRegex.test("Data Analysis")).toBe(false);
    expect(slugRegex.test("-leading")).toBe(false);
  });

  it("validates opportunity input and rejects a bad slug", () => {
    const base = { title_ar: "ت", title_en: "T", slug: "ok-slug" };
    expect(OpportunityInputSchema.safeParse(base).success).toBe(true);
    expect(OpportunityInputSchema.safeParse({ ...base, slug: "Bad Slug" }).success).toBe(false);
  });
});
