## Problem
Partner logos contain pure-dark marks that vanish on dark-mode `bg-surface` and pure-white marks that vanish on light-mode `bg-surface`. Only SDO currently has a manual dark/light swap.

## Solution
Wrap every logo in a single subtle background chip that is **slightly darker than the section surface in light mode** (making white logos visible) and **slightly lighter than the section surface in dark mode** (making dark logos visible).

The `bg-muted` design token already behaves exactly this way:
- Light: `oklch(0.965)` vs surface `oklch(0.975)` — dark enough for white marks.
- Dark: `oklch(0.28)` vs surface `oklch(0.235)` — light enough for black marks.

## Changes

### 1. Update `src/components/site/Partners.tsx`
- Replace the current logo wrapper `<div className="flex h-36 w-52 ...">` with a chip-styled container using:
  - `bg-muted rounded-lg border border-border/40 p-3`
  - Keep the same `flex items-center justify-center` centering.
- Keep existing `h-36` outer sizing so the marquee grid stays aligned.
- Retain the SDO light/dark dual-image swap — it already works and the chip makes it even safer.
- Remove the now-unnecessary `dark:hidden` / `hidden dark:block` split for SDO if the chip alone handles it, OR keep it for visual fidelity. The plan keeps it.

### 2. Verify visual QA
- Capture screenshots in both light and dark modes.
- Confirm: all 21 logos are clearly legible, no clipping inside chips, marquee animation unaffected.

No new assets, tokens, or dependencies required.