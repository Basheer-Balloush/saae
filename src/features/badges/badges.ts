import type { Bi, Level } from "@/features/texpo/lib/texpo-shared";

/* Badges a member earns at SAAE events, shown on their profile. Each badge is
   read from the record of what the member did (the Texpo badge is a Texpo play
   tied to their account), so there is no separate badge table to keep in step. */

export type BadgeKey = keyof typeof BADGES;

export type EarnedBadge = {
  key: BadgeKey;
  earnedAt: string;
  /** The game level, for badges that come from a game. */
  level: Level | null;
};

// Adding a definition also extends BadgeKey; both profile displays use this registry.
export const BADGES = {
  "texpo-2026": {
    image: "/badges/texpo-2026.webp",
    name: { ar: "تكسبو 2026", en: "Texpo 2026" },
    about: { ar: "حضور معرض تكسبو 2026", en: "Attended Texpo 2026" },
  },
} satisfies Record<string, { image: string; name: Bi; about: Bi }>;
