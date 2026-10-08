# Events administration

The console's Events item opens `/admin/events`. Events are grouped as ongoing,
upcoming, past, draft or archived and are searchable by name/location. Admins and
LMS admins can manage them. `/admin/crm/texpo` redirects to the seeded Texpo event.

## Creation and publishing

Add event collects Arabic/English names and descriptions, an immutable URL slug,
location, optional raster cover image, dates, opening/closing hours, and sessions
or activities with bilingual details, speaker, location and start/end times.
Dates must be unique; sessions fit within the day's hours. Publishing exposes
only event information and its schedule at `/events/<slug>`. Draft and archived
pages return not found. Published pages use `noindex, nofollow`, have no public
directory/navigation link and aren't added to the sitemap. A direct URL is not
a password or an access restriction. Visitor registration/activity/badge-claim
buttons on the information page are deferred.

Texpo is seeded as a draft for 8–11 October 2026, with **All and four day tabs**.
Its opening hours and location remain unset until an admin supplies them.

## Connect existing tools

Enable registration, surveys, attendance and/or the game on an event, then
connect the relevant tools on its detail page:

- Registration: create a tracked link or associate an existing sign-up link.
  Its `/join/<token>` submissions become event leads.
- Surveys: create a dynamic form in Forms, then associate it. Historical field
  labels are retained when displaying responses.
- Attendance: associate an existing AMS group/course. Presence records belong
  to the event through that group.
- Game: create or associate a tracked link for the existing Abu Al-Joud quiz.
  It retains the existing shared one-gift-per-account/device policy and Texpo
  coupon expiry (10 December 2026) and category. This change doesn't introduce
  a custom game builder or independent reward campaigns.

One source belongs to one event. Connecting a source includes its historical
data; disconnecting excludes that data without deleting its records. The Texpo
booth/main link stays associated with Texpo. Existing Texpo game links are
associated by the migration. Registration links, forms and AMS groups are not
assigned by guessed labels or dates: an admin explicitly connects them.
The old global sign-up-link pages continue working. Legacy fixed surveys such
as `/event-survey` aren't silently assigned to Texpo; use a connected dynamic
form for event surveys.

## Daily reporting and badges

Each action uses its own timestamp and `Asia/Damascus` calendar-day boundaries:
opens, starts, completions, claims, coupon-use requests, chat openings, lead
submissions, survey submissions, presence confirmations and badge awards.
All includes the complete event history, including actions outside scheduled
days. Presence transitions are captured separately so unrelated AMS edits can't
move attendance into another day. Historical attendance uses the stored
`updated_at` available before migration. Existing device/link opens are still
first-open records, not every repeat visit. Coupon-use counts follow the
existing pending/applied definition and the redemption request's creation time.
Participant details reflect the current stored profile, while counts follow
action timestamps.

Counts and breakdowns are computed in PostgreSQL. The newest 500 records/plays
are displayed with an explicit cap notice; full totals remain accurate. Exports
cover the displayed records and include times in Damascus time. The admin event
list is bounded to 500 and reports an error rather than silently truncating.

Badges require an uploaded raster image, bilingual name/description and an
eligibility rule. Admins approve awards by a confirmed member's email. Public
email submissions alone never automatically award a badge. Eligibility is checked
in SQL; duplicate awards are ignored atomically, and the badge definition is
snapshotted. Texpo's original automatic claim badge is preserved. General badges
appear on the member's LMS profile beside the existing Texpo badge.

## Storage, security and deployment

Apply `supabase/migrations/20261008120000_events.sql` once to the intended
database before deploying the app. It runs transactionally, adds event/source/
badge/presence tables, seeds Texpo, preserves existing Texpo badges, adds scoped
report/award/link RPCs and creates the public `event-assets` bucket. It doesn't
change scores, coupons, enrollment or existing game reward rules. Newly uploaded
event images are public; upload only material intended for public use. The
bucket accepts PNG/JPEG/WebP up to 5 MB and grants uploads only to admins/LMS admins.
Unused uploaded images aren't deleted automatically.

Event tables and reporting RPCs have no browser grants. Every admin server
function validates the bearer identity and checks `user_roles` before privileged
access. Member reads obtain identity from authenticated middleware. Public
resolution strips private fields and returns no participant data. SQL helper
permissions are explicitly revoked from public/anonymous/authenticated roles.
Source creation and association are atomic; source deletions clean associations.

Rollback: first deploy the prior application version, then drop the event-specific
triggers and RPCs before their tables (attendance marks, badge awards, sources,
events). Preserve/export award/event data and uploaded files beforehand. Do not
delete existing game, lead, survey, attendance or coupon tables. Retaining the
unused event tables and bucket while reverting the app is the safest rollback.

Verification commands:

```sh
bun run typecheck
bun run test:unit
bun run build
bun run check:bundle
# Only on an isolated test database with the migration applied:
psql "$EVENT_TEST_DATABASE_URL" -v ON_ERROR_STOP=1 -f tests/db/events.sql
```

`tests/db/events.sql` creates fixtures inside a rolled-back transaction and checks
midnight/cross-day reporting, event isolation, permissions, badge rules and
idempotency, atomic link creation and counts above the row display cap. The
migration and these assertions were additionally exercised in isolated PGlite
PostgreSQL with minimal stubs for the pre-existing tables, not against live data.
