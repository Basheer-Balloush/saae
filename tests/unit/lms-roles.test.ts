import { describe, expect, it } from "vitest";
import { resolveLmsRole } from "../../src/lib/lms-roles";

describe("canonical LMS role", () => {
  it("recognizes a single admin without an instructor or student record", () => {
    expect(resolveLmsRole(["admin"])).toBe("admin");
  });
  it("recognizes an instructor without a student record", () => {
    expect(resolveLmsRole(["lms_instructor"])).toBe("lms_instructor");
  });
  it("keeps legacy sessions compatible during deployment", () => {
    expect(resolveLmsRole(["lms_student", "lms_admin", "lms_instructor"])).toBe("admin");
  });
  it("does not turn an attendance-only or unknown role into an LMS admin", () => {
    expect(resolveLmsRole(["attendance_admin"])).toBeNull();
    expect(resolveLmsRole([])).toBeNull();
    expect(resolveLmsRole(["lms_student"])).toBe("lms_student");
  });
});
