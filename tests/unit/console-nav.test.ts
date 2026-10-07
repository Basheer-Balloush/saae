import { describe, expect, it } from "vitest";
import { NAV, isNavActive } from "@/components/console/nav";

const cms = NAV.cms;
const item = (en: string) => cms.flatMap((g) => g.items).find((i) => i.en === en)!;

describe("website console menu", () => {
  it("groups the website pages by what you do there", () => {
    expect(cms.map((g) => g.en ?? null)).toEqual([
      null,
      "Inbox",
      "Content",
      "Outreach",
      "Insights",
    ]);
    expect(cms.find((g) => g.en === "Outreach")!.items.map((i) => i.en)).toEqual([
      "Forms",
      "Events",
      "Initiative",
      "Chatbot",
    ]);
    expect(cms.find((g) => g.en === "Insights")!.items.map((i) => i.en)).toEqual([
      "Digital experience survey",
      "User locations",
    ]);
  });

  it("keeps every page reachable from exactly one item", () => {
    const paths = [
      "/admin/messages",
      "/admin/leads",
      "/admin/news",
      "/admin/forms",
      "/admin/crm/registration-links",
      "/admin/crm/registration-links/abc",
      "/admin/crm/texpo",
      "/admin/initiative",
      "/admin/chatbot",
      "/admin/feedback-survey",
      "/admin/locations",
    ];
    for (const p of paths) {
      const active = cms.flatMap((g) => g.items).filter((i) => isNavActive(i, p));
      expect(
        active.map((i) => i.en),
        p,
      ).toHaveLength(1);
    }
  });

  it("lights Events for both the sign-up links and the Texpo game", () => {
    expect(isNavActive(item("Events"), "/admin/crm/registration-links")).toBe(true);
    expect(isNavActive(item("Events"), "/admin/crm/texpo")).toBe(true);
    expect(isNavActive(item("Leads"), "/admin/crm/texpo")).toBe(false);
  });
});
