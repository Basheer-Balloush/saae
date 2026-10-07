import { readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { BADGES } from "@/features/badges/badges";

describe("profile badges", () => {
  it("every badge has its image in public/ and both languages", () => {
    for (const badge of Object.values(BADGES)) {
      expect(badge.image).toMatch(/^\/badges\/[a-z0-9-]+\.webp$/);
      expect(statSync(join("public", badge.image)).size).toBeGreaterThan(1000);
      expect(badge.name.ar && badge.name.en && badge.about.ar && badge.about.en).toBeTruthy();
    }
  });

  it("reads only the signed-in member's own claimed Texpo play", () => {
    const source = readFileSync("src/features/badges/badges.functions.ts", "utf8");
    expect(source).toContain("requireSupabaseAuth");
    expect(source).toContain('.eq("user_id", context.userId)');
    expect(source).toContain('.not("claimed_at", "is", null)');
  });
});
