import { describe, expect, it } from "vitest";
import { checkLocation, shouldPrompt } from "../../src/features/user-location/lib/location";
import { isValidCity, SYRIA_GOVERNORATES, tidyCity } from "../../src/lib/syria-governorates";
import { GOVERNORATES } from "../../src/features/feedback-survey/lib/feedback-survey";

describe("location form check", () => {
  it("accepts a governorate from the list and a typed city, tidied", () => {
    expect(checkLocation({ governorate: "rif-dimashq", city: "  ببيلا   الجديدة " })).toEqual({
      location: { governorate: "rif-dimashq", city: "ببيلا الجديدة" },
    });
    expect(checkLocation({ governorate: "abroad", city: "Turkey – Istanbul" })).toEqual({
      location: { governorate: "abroad", city: "Turkey – Istanbul" },
    });
  });

  it("names the missing field", () => {
    expect(checkLocation({ governorate: "", city: "حمص" })).toEqual({ missing: "governorate" });
    expect(checkLocation({ governorate: "paris", city: "حمص" })).toEqual({
      missing: "governorate",
    });
    expect(checkLocation({ governorate: "homs", city: "" })).toEqual({ missing: "city" });
  });

  it("rejects cities the database would reject", () => {
    for (const bad of ["x", "12345", "--", "  ", "ب".repeat(81)])
      expect(isValidCity(bad)).toBe(false);
    for (const ok of ["حمص", "Homs", "يبرود 2"]) expect(isValidCity(ok)).toBe(true);
    expect(tidyCity("\t دير \n الزور ")).toBe("دير الزور");
  });
});

describe("location prompt", () => {
  const base = { location: null, dismissedCount: 0, lastDismissedAt: null };
  const now = Date.parse("2026-10-01T12:00:00Z");

  it("asks a user with no location", () => {
    expect(shouldPrompt(base, now)).toBe(true);
  });
  it("never asks once a location is saved", () => {
    expect(shouldPrompt({ ...base, location: { governorate: "homs", city: "حمص" } }, now)).toBe(
      false,
    );
  });
  it("waits three days after Later, and stops after three", () => {
    const twoDays = new Date(now - 2 * 86_400_000).toISOString();
    const fourDays = new Date(now - 4 * 86_400_000).toISOString();
    expect(shouldPrompt({ ...base, dismissedCount: 1, lastDismissedAt: twoDays }, now)).toBe(false);
    expect(shouldPrompt({ ...base, dismissedCount: 2, lastDismissedAt: fourDays }, now)).toBe(true);
    expect(shouldPrompt({ ...base, dismissedCount: 3, lastDismissedAt: fourDays }, now)).toBe(
      false,
    );
  });
});

describe("governorate list", () => {
  it("is the same list, in the same order, as the feedback survey always used", () => {
    expect(GOVERNORATES.map((g) => g.value)).toEqual([
      "damascus",
      "rif-dimashq",
      "aleppo",
      "homs",
      "hama",
      "latakia",
      "tartus",
      "idlib",
      "deir-ez-zor",
      "raqqa",
      "hasakah",
      "daraa",
      "suwayda",
      "quneitra",
      "abroad",
    ]);
    expect(GOVERNORATES[0]).toEqual({ value: "damascus", ar: "دمشق", en: "Damascus" });
  });
  it("has 14 governorates with OCHA codes, plus abroad without one", () => {
    const codes = SYRIA_GOVERNORATES.filter((g) => g.pcode).map((g) => g.pcode);
    expect(codes).toHaveLength(14);
    expect(new Set(codes).size).toBe(14);
    expect(SYRIA_GOVERNORATES.find((g) => g.key === "abroad")?.pcode).toBeNull();
  });
});
