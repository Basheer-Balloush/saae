import { describe, expect, it } from "vitest";
import { isInAttendanceWindow } from "@/features/attendance/lib/course-window";

describe("isInAttendanceWindow", () => {
  const now = new Date(2026, 9, 4, 12); // 4 October 2026, local time

  it("shows running courses and courses with no end date", () => {
    expect(isInAttendanceWindow({ end_date: "2026-10-20" }, now)).toBe(true);
    expect(isInAttendanceWindow({ end_date: null }, now)).toBe(true);
  });

  it("keeps a course for 14 days after it ends, then hides it", () => {
    expect(isInAttendanceWindow({ end_date: "2026-09-20" }, now)).toBe(true);
    expect(isInAttendanceWindow({ end_date: "2026-09-19" }, now)).toBe(false);
    expect(isInAttendanceWindow({ end_date: "2026-07-16T00:00:00+00:00" }, now)).toBe(false);
  });

  it("never hides an online, self-paced course", () => {
    expect(isInAttendanceWindow({ end_date: "2026-01-01", delivery_mode: "online" }, now)).toBe(
      true,
    );
  });
});
