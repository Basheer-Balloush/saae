import { describe, expect, it } from "vitest";
import {
  PM_DEMO_ACCOUNTS,
  PM_DEMO_PASSWORD,
  authenticatePmDemo,
  pmRolePath,
} from "@/features/project-management/auth";

describe("project management demo authentication", () => {
  it.each(PM_DEMO_ACCOUNTS)("signs $role into its own workspace", (account) => {
    const session = authenticatePmDemo(account.email.toUpperCase(), PM_DEMO_PASSWORD);
    expect(session).toMatchObject({
      userId: account.userId,
      role: account.role,
      email: account.email,
    });
    expect(pmRolePath(account.role)).toBe(`/project-management/${account.role}`);
  });

  it("rejects unknown credentials", () => {
    expect(authenticatePmDemo("admin@saae.org", "wrong-password")).toBeNull();
    expect(authenticatePmDemo("unknown@saae.org", PM_DEMO_PASSWORD)).toBeNull();
  });
});
