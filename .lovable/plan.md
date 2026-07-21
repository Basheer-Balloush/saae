## Root cause

In `src/components/site/FeaturedNews.tsx`, each card is already wrapped in a TanStack `<Link to="/news/$id" params={{ id }}>`, but the row calls `row.setPointerCapture(e.pointerId)` inside `handlePointerDown`. When a pointer is captured by an ancestor, the browser retargets the subsequent `click` event to the capturing element (the row `div`) instead of the `<Link>` child. TanStack Router's `<Link>` relies on its own `onClick` handler to intercept navigation and call `router.navigate`; that handler never runs, so clicking a card does nothing. The `href` also isn't followed because pointer capture + our `pointerup` handling absorbs the gesture.

Secondary contributor: `handlePointerDown` unconditionally strips the animation class and switches the row to an inline `translateX(...)`, even for a plain tap that never moves. That does not itself block navigation, but it does mean every "click" is treated as a zero-length "drag", which pairs badly with pointer capture.

Nothing is wrong with the data — `slides[i].id` is the real `news.id` and the target route `/news/$id` exists (`src/routes/news.$id.tsx`) and is used elsewhere.

## Fix (single file: `src/components/site/FeaturedNews.tsx`)

1. Defer drag setup until real movement is detected:
   - In `handlePointerDown`, only record `{ startX, initialOffset, pointerId }` and set `didDragRef.current = false`. Do NOT call `setPointerCapture`, do NOT freeze `transform`, do NOT remove `animationClass`, do NOT change cursor. A tap therefore behaves like a normal click on the `<Link>` and TanStack Router navigates.
   - In `handlePointerMove`, when the horizontal delta first crosses ~5px, promote the gesture to a drag: freeze the current transform, remove `animationClass`, call `setPointerCapture` on the row, set `cursor: grabbing`, and set `didDragRef.current = true`. From then on, follow the finger and `preventDefault()` as today.
   - `handlePointerUp` keeps the existing "resume animation from released offset" logic but only runs the drag-release branch when `didDragRef.current` is true; for a pure tap it does nothing (no capture to release, no transform to clear).
2. Keep `handleLinkClick`: if `didDragRef.current` is true, `e.preventDefault()` so a drag doesn't accidentally navigate; otherwise call `saveOffset()` as today so the marquee position is restored on back-nav.
3. Add `role="link"` isn't needed — `<Link>` already renders an `<a href>`, which gives keyboard focus and Enter-to-activate for free. Add `cursor-pointer` on the card (currently the row has `cursor-grab`, which is fine on the row but the `<Link>` should read as clickable; keep row `cursor-grab`, ensure the `<Link>` doesn't override to something non-clickable — current `cardClass` already inherits, so no change needed).
4. Preserve everything else: 30s duration, keyframes and their locale mapping, hover pause, mask gradient, spacing, responsive widths, card markup, "View all" button, saved-offset restore across nav, direction-reset effect.

## Verification

- Click three different cards on `/` (English and Arabic) → each opens `/news/<its own id>` and the article page renders that specific article.
- Keyboard: Tab focuses each card (it's an `<a>`), Enter opens the article.
- Touch: tap navigates; horizontal swipe (>5px) drags the row and does NOT navigate; release resumes autoplay from the released position.
- Hover pause and language switch (AR↔EN) still work with no jump, no console errors, no double animation.
- Back-nav from a news article restores the previous marquee offset within the same language.

## Files changed

- `src/components/site/FeaturedNews.tsx` (only)