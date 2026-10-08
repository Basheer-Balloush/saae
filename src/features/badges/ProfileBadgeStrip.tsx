import { BADGES, type EarnedBadge } from "./badges";

/** Every earned badge gets a place in the cover, linking to its full details. */
export function ProfileBadgeStrip({ badges, lang }: { badges: EarnedBadge[]; lang: "ar" | "en" }) {
  if (!badges.length) return null;

  return (
    <ul className="profile-badge-strip" aria-label={lang === "ar" ? "الشارات" : "Badges"}>
      {badges.map((earned) => {
        const badge = BADGES[earned.key];
        const label = `${badge.name[lang]} — ${badge.about[lang]}`;
        return (
          <li key={earned.key}>
            <a href={`#profile-badge-${earned.key}`} aria-label={label} title={label}>
              <img src={badge.image} alt="" width={64} height={64} decoding="async" />
            </a>
          </li>
        );
      })}
    </ul>
  );
}
