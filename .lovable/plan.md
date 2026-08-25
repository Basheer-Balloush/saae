# "Ended" state on course cards (excluding Online courses)

## What the user will see

Any course whose end date is in the past — and that is **not** an Online course — renders in the listing grids with:

- a grayscale cover image and muted, neutral card colors (kept muted on hover),
- a corner ribbon stamp reading "COURSE ENDED" / "دورة منتهية" (short form "ENDED" / "منتهية" on small cards),
- screen-reader text "This course has ended" / "انتهت هذه الدورة".

The card stays clickable, keeps its price/level/delivery badges and rating/student counts. Online courses never get this treatment, regardless of their end date. Courses with no end date are never "ended". A course ending today stays active until the day after its end date.

## Where it applies

- Catalog / browse grid (`/learning-management-system/catalog`)
- Instructor public profile course list
- Student "My Courses" tiles on the student dashboard

All go through one shared rule, so any future surface using the shared card gets it automatically.

## Technical details

**Data**: `lms_courses` already has `end_date` (nullable date) and `delivery_mode` (enum, source of truth). Two data paths currently omit `end_date`:

1. `public.lms_list_catalog_public` RPC — additive migration: `CREATE OR REPLACE FUNCTION` with the same argument signature plus an `end_date date` column in the returned table. No table/RLS/grant changes, no behavior change to filtering or `total_count`.
2. The instructor-profile and student-dashboard `select(...)` lists — add `end_date` (and `delivery_mode` where missing) to the selected columns.

**Shared logic**: new `src/lib/lms-course-ended.ts` exporting `isCourseEnded({ end_date, delivery_mode })` — returns `false` when `delivery_mode === "online"` (explicit early exit) or `end_date` is null; otherwise compares the date-only `end_date` against today, ended only from the day after. Uses the same date-only comparison convention already used elsewhere in the LMS.

**Presentation**: `src/components/lms/CourseCard.tsx` gains `end_date` on `CourseCardData` and computes `isEnded`. Styling via reusable Tailwind v4 `@utility` classes in `src/styles.css` (`course-card-ended`, `course-card-ended-media`, `course-ended-stamp`) built only from existing semantic tokens (`muted`, `muted-foreground`, `border`, existing radius/shadow) — no new colors, no inline styles. Hover-state overrides keep the muted look.

**Stamp**: absolutely positioned ribbon in the cover's top-inline-start corner, RTL/LTR safe using logical properties (`start-*`), with `aria-hidden` visual text plus an `sr-only` sentence for assistive tech. Labels added to `src/lib/lms-i18n.ts` (ar/en).

**Student dashboard tiles**: reuse the same utility classes and stamp markup on the existing tile so browsing behavior matches, without changing enrollment/progress logic.

## Out of scope

No changes to enrollment, pricing, RLS, admin editors, routing, or course detail pages.

## Verification

Typecheck, lint, existing tests, production build, plus a browser pass over the catalog in Arabic and English confirming: past-dated in-person/hybrid courses show grayscale + stamp, online past-dated courses look normal, no-end-date courses look normal, a course ending today is not marked ended, and ended cards remain clickable.
