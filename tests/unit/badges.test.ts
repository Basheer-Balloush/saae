import { readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { BADGES, badgeDefinition } from "@/features/badges/badges";

describe("profile badges", () => {
  it("every badge has its image in public/ and both languages", () => {
    for (const badge of Object.values(BADGES)) {
      expect(badge.image).toMatch(/^\/badges\/[a-z0-9-]+\.webp$/);
      expect(statSync(join("public", badge.image)).size).toBeGreaterThan(1000);
      expect(badge.name.ar && badge.name.en && badge.about.ar && badge.about.en).toBeTruthy();
    }
  });

  it("uses the authenticated member identity for the private badge RPC", () => {
    const source = readFileSync("src/features/badges/badges.functions.ts", "utf8");
    expect(source).toContain("requireSupabaseAuth");
    expect(source).toContain('rpc("event_my_badges", { p_user_id: context.userId })');
    expect(source).not.toContain(".inputValidator(");
  });
  it("renders an award snapshot and retains the legacy Texpo fallback", () => {
    expect(badgeDefinition({ key: "texpo-2026", earnedAt: "2026-10-08", level: null })).toEqual(
      BADGES["texpo-2026"],
    );
    const earned = {
      key: "event-test",
      earnedAt: "2026-10-08",
      level: null,
      definition: {
        image: "/badges/texpo-2026.webp",
        name: { ar: "اسم محفوظ", en: "Saved name" },
        about: { ar: "", en: "" },
      },
    };
    expect(badgeDefinition(earned)?.name.en).toBe("Saved name");
    expect(badgeDefinition({ key: "unknown", earnedAt: "2026-10-08", level: null })).toBeNull();
  });
});
