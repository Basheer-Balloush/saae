import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { LEVELS } from "@/features/texpo/lib/texpo-shared";
import { badgeDefinition, type EarnedBadge } from "./badges";
import { EVENT_TIMEZONE } from "@/features/events/lib/events";

/* The Badges card on the LMS profile (uses the profile's pro-card styles). */
export function BadgesCard({
  lang,
  badges,
  failed,
  onRetry,
}: {
  lang: "ar" | "en";
  badges: EarnedBadge[] | undefined;
  failed: boolean;
  onRetry: () => void;
}) {
  const ar = lang === "ar";

  // The Texpo game links here (#profile-badges); the card only exists once the
  // profile has loaded, so the browser can't jump to it on its own.
  useEffect(() => {
    if (badges && window.location.hash === "#profile-badges") {
      document.getElementById("profile-badges")?.scrollIntoView({ block: "start" });
    }
  }, [badges]);

  return (
    <article className="pro-card" id="profile-badges">
      <h2>{ar ? "الشارات" : "Badges"}</h2>
      {!badges && failed ? (
        <div className="state-box" role="alert">
          <p>{ar ? "تعذّر تحميل الشارات." : "Could not load badges."}</p>
          <button type="button" className="action action-secondary" onClick={onRetry}>
            <span>{ar ? "حاول مجدداً" : "Try again"}</span>
          </button>
        </div>
      ) : !badges ? (
        <p role="status">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          <span className="sr-only">{ar ? "جارٍ تحميل الشارات" : "Loading badges"}</span>
        </p>
      ) : badges.length === 0 ? (
        <p>
          {ar
            ? "لا توجد شارات بعد. تحصل عليها من فعاليات الجمعية وتحدّياتها."
            : "No badges yet. You earn them at SAAE events and challenges."}
        </p>
      ) : (
        <ul className="badge-list">
          {badges.map((b) => {
            const badge = badgeDefinition(b);
            if (!badge) return null;
            const date = new Date(b.earnedAt).toLocaleDateString(ar ? "ar-SY" : "en-GB", {
              timeZone: EVENT_TIMEZONE,
              day: "numeric",
              month: "long",
              year: "numeric",
            });
            return (
              <li key={b.key} className="badge-tile" id={`profile-badge-${b.key}`}>
                <img src={badge.image} alt="" width={84} height={84} decoding="async" />
                <span className="badge-copy">
                  <strong>{ar ? badge.name.ar : badge.name.en}</strong>
                  <span>{ar ? badge.about.ar : badge.about.en}</span>
                  <small>
                    {b.level && (
                      <>
                        <b>{ar ? LEVELS[b.level].name.ar : LEVELS[b.level].name.en}</b> ·{" "}
                      </>
                    )}
                    {date}
                  </small>
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </article>
  );
}
