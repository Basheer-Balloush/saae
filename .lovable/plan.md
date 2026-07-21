## Root cause

`FeaturedNews` (the homepage news slider) chooses its marquee animation from `dir` in `useLang`, but the two keyframes are assigned the wrong way around for what the user perceives as "direction":

- `news-marquee` animates `translateX(0) → translateX(-50%)`. Content slides **leftward**, so items visually flow **right → left**. This is currently applied when `dir === "ltr"` (English).
- `news-marquee-rtl` animates `-50% → 0`. Content slides **rightward**, items flow **left → right**. This is currently applied when `dir === "rtl"` (Arabic).

So today English scrolls right‑to‑left and Arabic scrolls left‑to‑right — the opposite of what's requested. The outer wrapper is also hardcoded `dir="ltr"`, which further hides the language from the slider.

Runtime language switching mostly works (React re-renders and swaps `animationClass`), but two things can cause a flicker/desync when toggling AR↔EN:

1. `animationDelay` set during drag/restore is preserved on the row element, so after a language change the new animation starts at the old offset.
2. The pointer‑drag math (`factor = dir === "rtl" ? 1 : -1`) is tied to the old direction assumption and will need to flip in step with the keyframe swap.

## Fix

Only touch `src/components/site/FeaturedNews.tsx`. No other slider/component changes.

1. Swap the direction → keyframe mapping so:
   - English (`dir === "ltr"`) uses the keyframe that translates `-50% → 0` (items flow L→R).
   - Arabic (`dir === "rtl"`) uses `0 → -50%` (items flow R→L).
   Keep both keyframes; just switch which class each branch picks.
2. Flip the drag direction factor to match the new mapping so swiping still feels natural in both languages.
3. Update the "restore offset" / "release drag" math (`from`, `to`, `pct`) to use the new per‑direction start/end so autoplay resumes seamlessly after a drag in either language.
4. Reset `animationDelay` and any inline `transform` on `rowRef` in a `useEffect` keyed on `dir`, so switching AR↔EN at runtime restarts the marquee cleanly with no flicker or leftover offset. Also clear the persisted `SCROLL_KEY` on direction change so a saved Arabic offset can't be applied to an English run.
5. Keep the outer wrapper's `dir="ltr"` (it exists so `translateX` math is consistent); direction is expressed via the chosen keyframe, not via the wrapper's `dir` attribute.
6. Preserve everything else: card markup, spacing, 30s duration, hover pause, pointer drag, link click behavior, mask gradient, responsive widths.

## Verification

Project has no test runner wired up for this slider, so verify manually in the preview:

- Load `/` in English → news row auto‑scrolls left → right; new cards enter from the left edge; drag left/right feels natural; release resumes autoplay from the released position.
- Load `/` in Arabic → news row auto‑scrolls right → left; drag feels natural.
- Toggle language via the navbar switcher without reloading → direction flips immediately, no double animation, no jump, no console/hydration errors.
- Hover pauses; leaving hover resumes without the earlier glitch.
- Clicking a card still navigates and restores position on back‑nav within the same language.

## Files changed

- `src/components/site/FeaturedNews.tsx` (only)

## Report after implementation

Root cause, the single file changed, how locale drives direction (via `useLang().dir` selecting the keyframe class + a `dir`-keyed reset effect), and the manual checks above.
