import { describe, expect, it } from "vitest";
import { cleanPartnerNames, partnersContext } from "@/features/chat/lib/chat-partners";

describe("cleanPartnerNames", () => {
  it("trims, collapses spaces, drops one-letter rows and duplicates", () => {
    expect(
      cleanPartnerNames(["Med  Axis", " D ", "Damascus University", "damascus university", null]),
    ).toEqual(["Med Axis", "Damascus University"]);
  });
});

describe("partnersContext", () => {
  it("lists the partners as a closed list with the partners page link", () => {
    const text = partnersContext(["Damascus University", "Syrian Telecom"]);
    expect(text).toContain("Damascus University، Syrian Telecom");
    expect(text).toContain("ليست شريكاً معلناً");
    expect(text).toContain("https://www.aisyria.org/partners");
  });

  it("names no partner when the list could not be read", () => {
    const text = partnersContext(null);
    expect(text).toContain("لا تذكر أي جهة بالاسم");
    expect(text).toContain("https://www.aisyria.org/partners");
  });
});

describe("chat prompt", () => {
  it("no longer carries the unverified partners and projects", async () => {
    const { readFileSync } = await import("node:fs");
    const source = readFileSync("src/routes/api/chat.ts", "utf8");
    for (const claim of [
      "SYNC",
      "UNICEF",
      "اليونيسف",
      "Sarda Tech",
      "مُعافى",
      "AI Kids",
      "23 شباط",
    ])
      expect(source).not.toContain(claim);
  });
});
