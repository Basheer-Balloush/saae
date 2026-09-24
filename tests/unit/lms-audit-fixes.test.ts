import { afterEach, describe, expect, it, vi } from "vitest";
import { resizedImage, resizedSrcSet } from "@/lib/image-url";
import { sortOpenFirst } from "@/lib/lms-course-ended";
import { currentLmsReturn } from "@/lib/lms-redirect";

const STORE = "https://x.supabase.co/storage/v1/object/public/lms-media/a/cover.png";

describe("resized storage images", () => {
  it("carries the LMS cover cache-buster into the resize URL", () => {
    expect(resizedImage(`${STORE}?v=1789547403230`, 720)).toBe(
      "https://x.supabase.co/storage/v1/render/image/public/lms-media/a/cover.png?width=720&resize=contain&quality=72&v=1789547403230",
    );
    expect(resizedSrcSet(`${STORE}?v=12`, [480])).toContain(
      "width=480&resize=contain&quality=72&v=12 480w",
    );
  });

  it("still resizes plain storage URLs", () => {
    expect(resizedImage(STORE, 480)).toBe(
      "https://x.supabase.co/storage/v1/render/image/public/lms-media/a/cover.png?width=480&resize=contain&quality=72",
    );
  });

  it("leaves other queries and non-storage URLs alone", () => {
    expect(resizedImage(`${STORE}?token=abc`, 480)).toBe(`${STORE}?token=abc`);
    expect(resizedSrcSet(`${STORE}?token=abc`)).toBeUndefined();
    expect(resizedImage("/cinematic/images/logo.png", 480)).toBe("/cinematic/images/logo.png");
  });
});

describe("open courses first", () => {
  afterEach(() => vi.useRealTimers());

  it("moves ended courses after open ones and keeps order inside each group", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 8, 24, 12));
    const list = [
      { id: "ended-a", end_date: "2026-08-01", delivery_mode: "onsite" },
      { id: "open-a", end_date: "2026-10-04", delivery_mode: "onsite" },
      { id: "ended-b", end_date: "2026-07-01", delivery_mode: "onsite" },
      { id: "online", end_date: "2026-01-01", delivery_mode: "online" },
      { id: "open-b", end_date: null, delivery_mode: "onsite" },
    ];
    expect(sortOpenFirst(list).map((c) => c.id)).toEqual([
      "open-a",
      "online",
      "open-b",
      "ended-a",
      "ended-b",
    ]);
    expect(list[0].id).toBe("ended-a");
  });
});

describe("login return address", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("returns the current LMS page", () => {
    vi.stubGlobal("window", {
      location: { pathname: "/learning-management-system/student/player/x", search: "?l=2" },
    });
    expect(currentLmsReturn()).toBe("/learning-management-system/student/player/x?l=2");
  });

  it("keeps the existing target instead of nesting /login", () => {
    vi.stubGlobal("window", {
      location: {
        pathname: "/learning-management-system/login",
        search: "?redirect=%2Flearning-management-system%2Fstudent",
      },
    });
    expect(currentLmsReturn()).toBe("/learning-management-system/student");
  });

  it("refuses anything outside the LMS", () => {
    vi.stubGlobal("window", { location: { pathname: "/admin", search: "" } });
    expect(currentLmsReturn()).toBeUndefined();
  });
});
