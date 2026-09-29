import { describe, expect, it } from "vitest";
import {
  codeProblem,
  couponErrorMessage,
  couponOffer,
  couponWhatsappText,
  discountFor,
  formatSP,
  listPrice,
  normalizeCode,
  paymentSummary,
  phoneKey,
  quoteSummary,
  randomCode,
  whatsappNumber,
  type PaymentEntry,
} from "@/lib/coupons";

describe("codes", () => {
  it("ignore capitals and spaces", () => {
    expect(normalizeCode(" archathon 2025 ")).toBe("ARCHATHON2025");
    expect(normalizeCode("sara-20")).toBe("SARA-20");
  });

  it("follow the database's format", () => {
    expect(codeProblem("")).toBe("empty");
    expect(codeProblem("ab")).toBe("too_short");
    expect(codeProblem("A".repeat(41))).toBe("too_long");
    expect(codeProblem("كود2025")).toBe("characters");
    expect(codeProblem("-SPRING")).toBe("characters");
    expect(codeProblem("spring 20")).toBeNull();
    expect(codeProblem("SPRING_20")).toBeNull();
  });

  it("are generated without letters that are easy to misread", () => {
    const code = randomCode();
    expect(code).toMatch(/^[A-HJKMNP-Z2-9]{4}-[A-HJKMNP-Z2-9]{4}$/);
    expect(codeProblem(code)).toBeNull();
    expect(randomCode(() => new Uint8Array(8))).toBe("AAAA-AAAA");
  });
});

describe("prices", () => {
  it("use the sale price when it is lower, and 0 for a free course", () => {
    expect(listPrice(1500, 1200, false)).toBe(1200);
    expect(listPrice(1500, 1800, false)).toBe(1500);
    expect(listPrice(1500, null, false)).toBe(1500);
    expect(listPrice(1500, 1200, true)).toBe(0);
    expect(listPrice(0, null, false)).toBe(0);
  });

  it("take the percentage but never more than the maximum (the plan's examples)", () => {
    expect(discountFor(1500, 20, 400)).toBe(300);
    expect(discountFor(2000, 20, 400)).toBe(400);
    expect(discountFor(4650, 20, 400)).toBe(400);
    expect(discountFor(4650, 20, null)).toBe(930);
  });

  it("honors a minimum without exceeding the maximum or course price", () => {
    expect(discountFor(1000, 5, null, 100)).toBe(100);
    expect(discountFor(1000, 20, null, 100)).toBe(200);
    expect(discountFor(1000, 5, 150, 100)).toBe(100);
    expect(discountFor(1000, 30, 150, 100)).toBe(150);
    expect(discountFor(80, 5, null, 100)).toBe(80);
  });

  it("round down to whole pounds, like the database", () => {
    expect(discountFor(1333, 15, null)).toBe(199);
    expect(discountFor(1100, 7, null)).toBe(77);
    expect(discountFor(4650, 12.5, null)).toBe(581);
    expect(discountFor(1000, 100, null)).toBe(1000);
    expect(discountFor(0, 20, null)).toBe(0);
  });

  it("are written in Syrian pounds", () => {
    expect(formatSP(4250, true)).toBe("4,250 ل.س");
    expect(formatSP(4250, false)).toBe("4,250 SP");
  });
});

describe("messages", () => {
  it("explain each refusal and fall back to a general one", () => {
    expect(couponErrorMessage("coupon_expired", true)).toBe("انتهت صلاحية هذا الكود.");
    expect(couponErrorMessage("coupon_used_up", false)).toBe("This code has been used up.");
    expect(couponErrorMessage("something_new", false)).toBe(
      "The code could not be checked. Try again.",
    );
  });

  it("describe what a checked code does", () => {
    const base = { ok: true as const, code: "X", list_price: 4650, final_price: 4250 };
    expect(
      quoteSummary(
        {
          ...base,
          effect: "discount",
          scope: "personal",
          percent_off: 20,
          min_discount: 100,
          max_discount: 400,
          discount: 400,
        },
        true,
      ),
    ).toBe("كوبون شخصي: خصم 20٪ بحد أدنى 100 ل.س (حتى سعر الدورة) بحد أقصى 400 ل.س");
    expect(
      quoteSummary(
        {
          ...base,
          effect: "discount",
          scope: "category",
          percent_off: 15,
          min_discount: null,
          max_discount: null,
          discount: 697,
        },
        false,
      ),
    ).toBe("Category coupon: 15% off");
    expect(
      quoteSummary(
        {
          ...base,
          effect: "recognition",
          scope: "course",
          percent_off: null,
          min_discount: null,
          max_discount: null,
          discount: 4650,
        },
        false,
      ),
    ).toMatch(/^Recognition code/);
  });
});

describe("what a learner has paid", () => {
  const entry = (
    id: string,
    kind: PaymentEntry["kind"],
    amount: number,
    corrects_id: string | null = null,
  ) => ({ id, kind, amount, corrects_id });

  it("adds up payments towards what is owed (the plan's example: 71%)", () => {
    const s = paymentSummary(4250, [entry("a", "payment", 2000), entry("b", "payment", 1000)]);
    expect(s).toMatchObject({
      paid: 3000,
      waived: 0,
      remaining: 1250,
      percent: 71,
      state: "partial",
    });
  });

  it("is complete when payments and waivers cover it", () => {
    expect(
      paymentSummary(800, [entry("a", "payment", 500), entry("b", "payment", 300)]),
    ).toMatchObject({
      remaining: 0,
      percent: 100,
      state: "paid",
    });
    expect(
      paymentSummary(1000, [entry("a", "payment", 400), entry("b", "waiver", 600)]),
    ).toMatchObject({
      paid: 400,
      waived: 600,
      remaining: 0,
      state: "waived",
    });
  });

  it("undoes a cancelled entry and remembers which one it was", () => {
    const s = paymentSummary(800, [
      entry("a", "payment", 500),
      entry("b", "payment", 300),
      entry("c", "correction", -500, "a"),
    ]);
    expect(s).toMatchObject({ paid: 300, remaining: 500, percent: 38, state: "partial" });
    expect([...s.cancelled]).toEqual(["a"]);
    const w = paymentSummary(1000, [
      entry("a", "waiver", 600),
      entry("b", "correction", -600, "a"),
    ]);
    expect(w).toMatchObject({ paid: 0, waived: 0, state: "unpaid" });
  });

  it("never shows 100% while something is still owed", () => {
    expect(paymentSummary(10000, [entry("a", "payment", 9999)]).percent).toBe(99);
  });

  it("tells apart nothing owed and nothing recorded", () => {
    expect(paymentSummary(0, []).state).toBe("free");
    expect(paymentSummary(null, [entry("a", "payment", 100)])).toMatchObject({
      state: "untracked",
      paid: 100,
    });
    expect(paymentSummary(500, []).state).toBe("unpaid");
  });
});

describe("personal coupons", () => {
  it("match a Syrian mobile number however it is written", () => {
    expect(phoneKey("0944 123 456")).toBe("944123456");
    expect(phoneKey("+963 944-123-456")).toBe("944123456");
    expect(phoneKey("00963944123456")).toBe("944123456");
    expect(phoneKey("12345")).toBe("12345");
  });

  it("open WhatsApp with the country code first", () => {
    expect(whatsappNumber("0944 123 456")).toBe("963944123456");
    expect(whatsappNumber("+963944123456")).toBe("963944123456");
    expect(whatsappNumber("0049 170 1234567")).toBe("491701234567");
    expect(whatsappNumber(null)).toBe("");
  });

  it("describe the offer in the email and message", () => {
    const c = {
      percent_off: 20,
      min_discount: null,
      max_discount: 400,
      max_uses: 2,
      expires_at: null,
    };
    expect(couponOffer(c, true)).toEqual({
      offer: "خصم 20٪ بحد أقصى 400 ل.س",
      limits: "صالح لـ 2 دورات",
    });
    expect(couponOffer({ ...c, max_discount: null, max_uses: 1 }, false)).toEqual({
      offer: "20% off",
      limits: "valid for 1 course",
    });
    expect(couponOffer({ ...c, min_discount: 100 }, false).offer).toBe(
      "20% off, at least 100 SP (up to the course price), at most 400 SP",
    );
    const text = couponWhatsappText({ ...c, code: "K7QX-M2PA" }, "سارة", "https://x/catalog", true);
    expect(text).toContain("K7QX-M2PA");
    expect(text).toContain("https://x/catalog");
  });
});
