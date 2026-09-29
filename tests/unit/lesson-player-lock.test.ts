import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const player = readFileSync(
  path.resolve(__dirname, "../../src/routes/learning-management-system/student/player/$courseId.tsx"),
  "utf8",
);

describe("lesson player lock", () => {
  it("has no way to skip ahead to a lesson that is not open yet", () => {
    expect(player).not.toMatch(/Skip to next lesson|تخطَّ إلى الدرس التالي/);
  });

  it("locks lessons the same way for every account, admins and instructors included", () => {
    const isOpen = player.match(/const isOpen = [^\n]+/)?.[0] ?? "";
    expect(isOpen).toContain("openIds.has(id)");
    expect(isOpen).not.toMatch(/isStaff|role|instructor/);
  });
});
