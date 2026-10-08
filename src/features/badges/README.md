# Profile badges

The profile loads earned badges once with `useMyBadges`, scoped to the signed-in
account. `ProfileBadgeStrip` renders their images in the cover beside the profile
actions; `BadgesCard` renders the full details below. The strip wraps as more
badges are earned and links to each detail tile. Both support Arabic and English.

Event badges are now configured in **Admin → Events → Edit event**. Admins upload
the image, enter both languages and select eligibility (chosen members,
registration, confirmed attendance or a completed and claimed game). Awarding
is an explicit admin action against a confirmed member account; the server checks
eligibility. One snapshot per member/event is stored in `event_badge_awards`, so
later edits don't change earned badges. Duplicate approvals are safe.

Texpo's existing rewards continue to grant its badge automatically. Migration
`20261008120000_events.sql` preserves existing awards and captures future claims
with a database trigger. Account-scoped reads use `event_my_badges`; browsers
cannot execute that RPC directly or select award tables.

For a future badge unrelated to an event:

1. Add its image to `public/badges/` and its image path, English/Arabic name and
   description to `BADGES` in `badges.ts`. `BadgeKey` follows the registry keys.
2. Extend `getMyBadges` to return it only when the signed-in member has earned it,
   using the authoritative event or achievement record. Keep all privileged
   reads restricted to `context.userId`; never accept a user ID from the browser.
3. Return one entry per badge key, with `earnedAt` and `level` (`null` when there
   is no Texpo game level). Both displays include new returned badges automatically.

`#profile-badges` remains the section link used by the Texpo game. Each tile also
has `#profile-badge-<key>` for links from the cover.
