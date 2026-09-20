import { describe, expect, it } from "vitest";
import {
  courseUrl,
  noCourseFallback,
  providerBusyMessage,
  toCourseOptions,
  ORG_EMAIL,
  ORG_PHONE,
  type CatalogRow,
} from "../../src/lib/chat-intake";

const row = (over: Partial<CatalogRow> = {}): CatalogRow => ({
  id: "11111111-1111-1111-1111-111111111111",
  slug: "ai-foundations",
  title_ar: "أساسيات الذكاء الاصطناعي",
  title_en: "AI Foundations",
  level: "beginner",
  is_free: false,
  price: 100,
  sale_price: null,
  delivery_mode: "online",
  ...over,
});

describe("course options offered by the assistant", () => {
  it("uses the visitor's language and a real course link", () => {
    const [ar] = toCourseOptions([row()], "ar");
    const [en] = toCourseOptions([row()], "en");
    expect(ar.title).toBe("أساسيات الذكاء الاصطناعي");
    expect(en.title).toBe("AI Foundations");
    expect(ar.url).toBe("https://aisyria.org/learning-management-system/courses/ai-foundations");
  });

  it("falls back to the course id when a course has no slug", () => {
    expect(courseUrl({ slug: null, id: "abc" })).toBe(
      "https://aisyria.org/learning-management-system/courses/abc",
    );
  });

  it("falls back to the other language rather than showing an empty title", () => {
    expect(toCourseOptions([row({ title_ar: null })], "ar")[0].title).toBe("AI Foundations");
    expect(toCourseOptions([row({ title_en: null })], "en")[0].title).toBe("أساسيات الذكاء الاصطناعي");
  });

  it("drops a course that has no title in either language", () => {
    expect(toCourseOptions([row({ title_ar: null, title_en: null })], "ar")).toEqual([]);
  });

  it("states the price the visitor would actually pay", () => {
    expect(toCourseOptions([row({ is_free: true })], "ar")[0].price).toBe("مجاني");
    expect(toCourseOptions([row({ is_free: true })], "en")[0].price).toBe("Free");
    // The site quotes Syrian pounds; the assistant must not invent dollars.
    expect(toCourseOptions([row()], "en")[0].price).toBe("100 SYP");
    expect(toCourseOptions([row()], "ar")[0].price).toBe("ل.س 100");
    expect(toCourseOptions([row({ sale_price: 60 })], "en")[0].price).toBe("60 SYP");
    expect(toCourseOptions([row({ price: 150000 })], "ar")[0].price).toBe("ل.س 150,000");
    expect(toCourseOptions([row({ price: null })], "en")[0].price).toBe("Price not set");
  });

  it("offers at most three courses so the answer stays readable", () => {
    expect(toCourseOptions(Array.from({ length: 9 }, () => row()), "ar")).toHaveLength(3);
    expect(toCourseOptions(Array.from({ length: 9 }, () => row()), "ar", 1)).toHaveLength(1);
  });

  it("gives the association's phone and email when nothing matches", () => {
    const ar = noCourseFallback("ar");
    expect(ar.phone).toBe(ORG_PHONE);
    expect(ar.email).toBe(ORG_EMAIL);
    expect(ar.message).toContain(ORG_PHONE);
    expect(noCourseFallback("en").message).toContain("No published course");
  });
});

describe("when the provider refuses the call", () => {
  it("explains a rate limit in the visitor's language, with the phone number", () => {
    const err = new Error("Failed after 3 attempts. Last error: Too Many Requests");
    expect(providerBusyMessage(err, "ar")).toContain(ORG_PHONE);
    expect(providerBusyMessage(err, "ar")).toContain("مزدحمة");
    expect(providerBusyMessage(err, "en")).toContain("busy right now");
  });

  it("recognises the provider's other ways of saying the same thing", () => {
    for (const text of ["429 quota exceeded", "RESOURCE_EXHAUSTED", "rate-limit reached"]) {
      expect(providerBusyMessage(new Error(text), "en")).toContain("busy right now");
    }
  });

  it("falls back to a plain apology for any other failure", () => {
    const msg = providerBusyMessage(new Error("socket hang up"), "en");
    expect(msg).toContain("Something went wrong");
    expect(msg).toContain(ORG_EMAIL);
  });
});

describe("diagnosing a failure from the chat window", () => {
  it("adds the provider's status code so the cause is visible without server logs", () => {
    const err = Object.assign(new Error("Not Found"), { statusCode: 404 });
    expect(providerBusyMessage(err, "en")).toContain("(404)");
    expect(providerBusyMessage(err, "ar")).toContain("(404)");
  });

  it("finds the status on a wrapped error, or in the message text", () => {
    expect(providerBusyMessage({ cause: { status: 402 } }, "en")).toContain("(402)");
    expect(providerBusyMessage(new Error("request failed with 401"), "en")).toContain("(401)");
  });

  it("says nothing extra when there is no status to show", () => {
    expect(providerBusyMessage(new Error("socket hang up"), "en")).not.toContain("(");
  });

  it("keeps the rate-limit wording free of codes", () => {
    expect(providerBusyMessage(new Error("Too Many Requests"), "en")).toContain("busy right now");
  });
});
