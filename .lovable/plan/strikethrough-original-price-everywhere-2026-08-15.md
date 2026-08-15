# Strikethrough original price everywhere

## What I checked first

On the public catalogue the strikethrough already renders correctly: the "Markeing 360°"
card outputs the original price (20,000 SYP) inside a `line-through` element next to the
active discounted price (10,000 SYP). The public course-detail page passes both prices to
the same shared price component.

The gap is in the dashboards and in a few edge cases of the shared component:

- The instructor dashboard course list renders price with its own inline markup that
  ignores `sale_price` entirely — only the original price shows, with no strikethrough.
- The admin dashboard courses list shows no price at all, so an admin can't see that a
  discount is active.
- The shared component's struck-through element wraps an inner `dir="ltr"` flex span; in
  RTL this can visually clip or break the line depending on wrapping, so it needs a
  tighter, wrap-safe structure.

## Changes

1. Shared price component (`CoursePrice`)
   - Keep the existing rule: strikethrough only when a discounted price exists and is
     lower than the original.
   - Make the struck-through part render the line reliably in RTL and LTR by applying
     `line-through` (with `decoration-from-font`) directly to the amount span, and keep
     the whole block on one line with a non-wrapping original price so there is no layout
     shift when a discount appears.
   - Add a small `size="xs"` variant for dense dashboard rows.

2. Instructor dashboard course list
   - Fetch `sale_price` alongside `price` and replace the hand-rolled price markup with
     the shared price component so the original price is struck through beside the
     discounted one.

3. Admin dashboard courses list
   - Show the same price block (original struck through + active discounted price, or
     "Free") on each course row, using the shared component.

4. Course editor (admin + instructor use the same editor)
   - Keep both fields (Original price / السعر الأساسي and Discounted price / السعر بعد
     الخصم) and add a live preview under the discounted field showing exactly how the pair
     will render, so the discount is verifiable while editing.

## Technical notes

- Files: `src/components/lms/CoursePrice.tsx`,
  `src/routes/learning-management-system.instructor.index.tsx`,
  `src/routes/learning-management-system.admin.index.tsx`,
  `src/routes/learning-management-system.instructor.courses.$id.tsx`.
- No database or migration work: `sale_price` already exists and is already returned by
  the public catalogue and course-detail queries.
- Behaviour unchanged when only one price exists (plain price) or the course is free.
- Verification: Marketing 360° in Arabic RTL and English LTR on catalogue card, detail
  page, instructor list and admin list; a course with no discount; a free course; then
  typecheck, lint, tests and the production build.
