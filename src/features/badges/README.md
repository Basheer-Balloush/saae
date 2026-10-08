# Profile badges

The profile loads earned badges once with `useMyBadges`, scoped to the signed-in
account. `ProfileBadgeStrip` renders their images in the cover beside the profile
actions; `BadgesCard` renders the full details below. The strip wraps as more
badges are earned and links to each detail tile. Both support Arabic and English.

To add a badge:

1. Add its image to `public/badges/` and its image path, English/Arabic name and
   description to `BADGES` in `badges.ts`. `BadgeKey` follows the registry keys.
2. Extend `getMyBadges` to return it only when the signed-in member has earned it,
   using the authoritative event or achievement record. Keep all privileged
   reads restricted to `context.userId`; never accept a user ID from the browser.
3. Return one entry per badge key, with `earnedAt` and `level` (`null` when there
   is no Texpo game level). Both displays include new returned badges automatically.

`#profile-badges` remains the section link used by the Texpo game. Each tile also
has `#profile-badge-<key>` for links from the cover.
