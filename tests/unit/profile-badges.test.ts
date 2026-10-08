import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { BadgesCard } from "@/features/badges/BadgesCard";
import { ProfileBadgeStrip } from "@/features/badges/ProfileBadgeStrip";
import { BADGES, type BadgeKey, type EarnedBadge } from "@/features/badges/badges";

const earned: EarnedBadge[] = Object.keys(BADGES).map((key) => ({
  key: key as BadgeKey,
  earnedAt: "2026-10-06T12:00:00Z",
  level: null,
}));

describe("profile cover badges", () => {
  it.each(["en", "ar"] as const)(
    "links every registered badge to its localized details (%s)",
    (lang) => {
      const strip = renderToStaticMarkup(
        createElement(ProfileBadgeStrip, { badges: earned, lang }),
      );
      const details = renderToStaticMarkup(
        createElement(BadgesCard, { badges: earned, lang, failed: false, onRetry: () => {} }),
      );
      for (const badge of earned) {
        expect(strip).toContain(`href="#profile-badge-${badge.key}"`);
        expect(strip).toContain(BADGES[badge.key].name[lang]);
        expect(strip).toContain(BADGES[badge.key].about[lang]);
        expect(details).toContain(`id="profile-badge-${badge.key}"`);
      }
    },
  );

  it("leaves the cover badge area empty when no badges are earned", () => {
    expect(renderToStaticMarkup(createElement(ProfileBadgeStrip, { badges: [], lang: "en" }))).toBe(
      "",
    );
  });

  it("distinguishes loading, failed requests and a successful empty result", () => {
    const render = (badges: EarnedBadge[] | undefined, failed: boolean) =>
      renderToStaticMarkup(
        createElement(BadgesCard, { badges, failed, lang: "en", onRetry: () => {} }),
      );
    expect(render(undefined, false)).toContain("Loading badges");
    const failure = render(undefined, true);
    expect(failure).toContain("Could not load badges.");
    expect(failure).toContain("Try again");
    expect(failure).not.toContain("No badges yet");
    expect(render([], false)).toContain("No badges yet");
  });
});
