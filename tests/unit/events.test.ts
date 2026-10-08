import { describe, expect, it } from "vitest";
import {
  damascusDate,
  eventInputSchema,
  eventPhase,
  newEvent,
  orderedDays,
} from "@/features/events/lib/events";

function valid() {
  return {
    ...newEvent(),
    slug: "event-2026",
    title_ar: "فعالية",
    title_en: "Event",
    schedule: [{ date: "2026-10-08", start: "09:00", end: "17:00", sessions: [] }],
  };
}
describe("event planning and local day boundaries", () => {
  it("assigns UTC midnight boundaries to Damascus, independently of the host", () => {
    expect(damascusDate("2026-10-08T20:59:59Z")).toBe("2026-10-08");
    expect(damascusDate("2026-10-08T21:00:00Z")).toBe("2026-10-09");
  });
  it("rejects duplicate days and impossible calendar dates", () => {
    const event = valid();
    expect(
      eventInputSchema.safeParse({ ...event, schedule: [event.schedule[0], event.schedule[0]] })
        .success,
    ).toBe(false);
    expect(
      eventInputSchema.safeParse({
        ...event,
        schedule: [{ ...event.schedule[0], date: "2026-02-30" }],
      }).success,
    ).toBe(false);
  });
  it("rejects reversed and partial opening hours", () => {
    for (const [start, end] of [
      ["17:00", "09:00"],
      ["09:00", ""],
      ["24:00", "25:00"],
    ])
      expect(
        eventInputSchema.safeParse({
          ...valid(),
          schedule: [{ ...valid().schedule[0], start, end }],
        }).success,
      ).toBe(false);
  });
  it("requires activities to fit their day's hours", () => {
    const event = valid();
    const session = {
      title_ar: "جلسة",
      title_en: "Session",
      start: "08:00",
      end: "10:00",
      speaker: "",
      location: "",
      description_ar: "",
      description_en: "",
    };
    expect(
      eventInputSchema.safeParse({
        ...event,
        schedule: [{ ...event.schedule[0], sessions: [session] }],
      }).success,
    ).toBe(false);
    expect(
      eventInputSchema.safeParse({
        ...event,
        schedule: [{ ...event.schedule[0], sessions: [{ ...session, start: "09:00" }] }],
      }).success,
    ).toBe(true);
  });
  it("rejects unsafe URL slugs, arbitrary image URLs and duplicate tools", () => {
    expect(eventInputSchema.safeParse({ ...valid(), slug: "../admin" }).success).toBe(false);
    expect(
      eventInputSchema.safeParse({ ...valid(), image: "https://attacker.example/asset.svg" })
        .success,
    ).toBe(false);
    expect(eventInputSchema.safeParse({ ...valid(), tools: ["game", "game"] }).success).toBe(false);
  });
  it("requires the badge's eligibility tool and an uploaded raster asset", () => {
    const badge = {
      image: "f7a0f407-0d93-4cbb-ae6d-c1cc4f261601.webp",
      name_ar: "شارة",
      name_en: "Badge",
      description_ar: "",
      description_en: "",
      rule: "attendance",
    };
    expect(eventInputSchema.safeParse({ ...valid(), badge }).success).toBe(false);
    expect(eventInputSchema.safeParse({ ...valid(), badge, tools: ["attendance"] }).success).toBe(
      true,
    );
  });
  it("sorts dates without mutating persisted input and groups published events", () => {
    const schedule = [{ ...valid().schedule[0], date: "2026-10-11" }, valid().schedule[0]];
    expect(orderedDays(schedule)[0].date).toBe("2026-10-08");
    expect(schedule[0].date).toBe("2026-10-11");
    const event = { status: "published" as const, schedule };
    expect(eventPhase(event, "2026-10-07")).toBe("upcoming");
    expect(eventPhase(event, "2026-10-08")).toBe("ongoing");
    expect(eventPhase(event, "2026-10-11")).toBe("ongoing");
    expect(eventPhase(event, "2026-10-12")).toBe("past");
    expect(eventPhase({ ...event, status: "draft" }, "2026-10-09")).toBe("draft");
  });
});
