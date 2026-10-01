import { describe, expect, it } from "vitest";
import { checkLocation, type PersonRow } from "../../src/features/user-location/lib/location";
import {
  NO_FILTER,
  filterPeople,
  isFiltered,
  topCities,
} from "../../src/features/user-location/lib/location-stats";
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

describe("admin location filters", () => {
  const now = Date.parse("2026-10-01T12:00:00Z");
  const day = 86_400_000;
  const person = (p: Partial<PersonRow>): PersonRow => ({
    governorate: "homs",
    city: "حمص",
    city_key: "حمص",
    instructor: false,
    has_course: false,
    categories: [],
    answered_at: new Date(now - day).toISOString(),
    ...p,
  });
  const people = [
    person({ has_course: true, categories: ["prog"] }),
    person({
      governorate: "rif-dimashq",
      city: "ببيلا",
      city_key: "ببيلا",
      has_course: true,
      categories: ["prog", "health"],
    }),
    person({ governorate: "rif-dimashq", city: "ببيلة", city_key: "ببيلا", instructor: true }),
    person({
      governorate: "abroad",
      city: "Istanbul",
      city_key: "istanbul",
      answered_at: new Date(now - 40 * day).toISOString(),
    }),
  ];

  it("keeps everyone with no filter", () => {
    expect(filterPeople(people, NO_FILTER, [], now)).toHaveLength(4);
    expect(isFiltered(NO_FILTER)).toBe(false);
  });

  it("filters by governorate, interest, no course, role and date", () => {
    const f = (patch: Partial<typeof NO_FILTER>) =>
      filterPeople(people, { ...NO_FILTER, ...patch }, [], now);
    expect(f({ governorate: "rif-dimashq" })).toHaveLength(2);
    expect(f({ category: "prog" })).toHaveLength(2);
    expect(f({ category: "health" })).toHaveLength(1);
    expect(f({ category: "none" })).toHaveLength(2);
    expect(f({ role: "instructors" })).toHaveLength(1);
    expect(f({ role: "learners" })).toHaveLength(3);
    expect(f({ since: "30" })).toHaveLength(3);
    expect(f({ governorate: "rif-dimashq", category: "prog" })).toHaveLength(1);
  });

  it("leaves one side open for the chart of that side", () => {
    const filter = { ...NO_FILTER, governorate: "rif-dimashq", category: "prog" };
    expect(filterPeople(people, filter, ["governorate"], now)).toHaveLength(2);
    expect(filterPeople(people, filter, ["category"], now)).toHaveLength(2);
  });

  it("groups spellings of one city and shows the most common", () => {
    const cities = topCities([
      ...people,
      person({ governorate: "rif-dimashq", city: "ببيلا", city_key: "ببيلا" }),
    ]);
    expect(cities[0]).toEqual({ governorate: "rif-dimashq", city: "ببيلا", people: 3 });
    expect(cities).toHaveLength(3);
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
