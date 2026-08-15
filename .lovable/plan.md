# Real registration counts + dual pricing display

## 1. Show real registration counts everywhere

Today course cards, the course detail page, and instructor profiles run the real
enrollment number through a helper that pushes every course up to a "at least 50–60
students" display value. The database itself is accurate: for example "Marketing 360°"
has 0 real enrollments, Generative AI has 18, Modern Software Engineering has 71.

Changes:
- Delete the display-count helper (`src/lib/lms-display-count.ts`).
- Course card, course detail page, and instructor profile totals show the real
  `students_count` value straight from the database (which already matches the
  enrollment rows exactly and is kept in sync on enroll/unenroll).
- No mock or padded numbers remain anywhere on the platform, now or for future courses.

## 2. Dual pricing with strikethrough

The discounted price field (`sale_price`) already exists in the database, is returned by
the public catalogue query, and the shared price component already renders the original
price struck through next to the discounted one. Two gaps remain:

- The instructor/admin course editor has the sale-price field, but the admin course
  screens that also edit price need the same field so admins can set both prices.
- The instructor profile page loads courses without `sale_price`, so cards there never
  show the discount.

Changes:
- Add `sale_price` to the instructor-profile course query so those cards render the
  discount correctly.
- Make sure both price inputs (Original price, Discounted price) are available in every
  course create/edit surface an admin or instructor uses, with the discounted field
  optional and clearly labelled in Arabic and English.
- Behaviour stays: both prices present and discount lower than original → original shown
  struck through beside the active discounted price; one price only → plain price; free
  courses → "Free" label.

## Technical notes

- Files touched: `src/lib/lms-display-count.ts` (removed),
  `src/components/lms/CourseCard.tsx`, `src/routes/learning-management-system.courses.$id.tsx`,
  `src/routes/learning-management-system.instructors.$id.tsx`, and the course editor
  screens for the price fields.
- No destructive migration; `sale_price` already exists with public read access.
- Capacity checks (`max_students`) already use the real count and are unaffected.
- Verification: check a course with 0 enrollments shows 0, one with 71 shows 71, set a
  discount on a course and confirm the strikethrough on card + detail page in both
  Arabic RTL and English LTR, then run typecheck, lint, tests, and the production build.
