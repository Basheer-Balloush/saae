## Goal

Make the homepage news slider in `src/components/site/FeaturedNews.tsx` support both a normal click (opens the article) and a press-hold-drag (slides the row), based on actual pointer movement — not on hold time.

## Root cause of current behavior

`handlePointerDown` currently:
- Reads the transform and freezes the row at that offset immediately.
- Removes the marquee animation class right away.
- Calls `setPointerCapture` on pointer-down.
- Sets cursor to `grabbing`.

This means every mouse-down enters "drag mode" before the user has moved, and pointer capture routes the eventual `pointerup` to the row instead of the anchor, so the `<Link>` click doesn't fire reliably. A click without meaningful motion should just open the article.

## Fix (single file: `src/components/site/FeaturedNews.tsx`)

### 1. Add a drag threshold + "armed vs active" model

- Add a constant `DRAG_THRESHOLD = 5` (px).
- Extend `dragRef` to track state:
  - `isPointerDown: boolean` — mouse is held, not necessarily dragging yet.
  - `isDragging: boolean` — threshold crossed; row is being moved.
  - `startX: number`
  - `initialOffset: number` (row's current `translateX` at pointer-down)
  - `pointerId: number | null`
- Keep `didDragRef` as the flag the click handler reads to cancel navigation.

### 2. `handlePointerDown` (light-touch)

- Only record `startX`, `initialOffset` (from `DOMMatrixReadOnly` of current transform), `pointerId`, and set `isPointerDown = true`, `isDragging = false`, `didDragRef.current = false`.
- Do NOT: call `preventDefault`, `setPointerCapture`, remove the animation class, write inline `transform`, or change cursor.
- This preserves the normal click path.

### 3. `handlePointerMove`

- Return early if `!isPointerDown`.
- Compute `delta = e.clientX - startX`.
- If `!isDragging` and `Math.abs(delta) >= DRAG_THRESHOLD`:
  - Promote to drag: `isDragging = true`, `didDragRef.current = true`.
  - Now do the deferred setup:
    - Re-read current computed transform (animation has kept moving during the hold) and update `initialOffset` to that value so the row doesn't jump.
    - `row.classList.remove(animationClass)` and set inline `transform: translateX(<currentOffset>px)` to freeze it.
    - `row.setPointerCapture(e.pointerId)`.
    - `row.style.cursor = "grabbing"`.
- Once `isDragging` is true:
  - `e.preventDefault()` to block text selection / native drag.
  - Apply `translateX(initialOffset + delta)px` (finger-following, same as today).

### 4. `handlePointerUp` / `handlePointerCancel`

- If `!isDragging`:
  - Just clear `isPointerDown` and `pointerId`. Leave `didDragRef.current === false` so the `<Link>` click that fires next opens the article.
  - Do not touch animation, transform, cursor, or pointer capture (none was taken).
- If `isDragging`:
  - Run the existing release math: wrap the offset, compute `pct` against the correct per-direction `from`/`to` (already keyed off `dir` after the previous fix), set `animationDelay`, re-add `animationClass`, then in `requestAnimationFrame` clear the inline `transform` so autoplay resumes from the released position.
  - `releasePointerCapture` (guarded in try/catch).
  - Reset cursor to `grab`.
  - Keep `didDragRef.current = true` so the click handler on the `<Link>` cancels navigation for this release.
- Always reset `isPointerDown`, `isDragging`, `pointerId`.

### 5. `handleLinkClick` on the card `<Link>`

```ts
if (didDragRef.current) {
  e.preventDefault();
  e.stopPropagation();
  didDragRef.current = false;
  return;
}
saveOffset();
```

- Click without drag → falls through and TanStack `<Link>` navigates; also persists the current marquee offset via `saveOffset()` (unchanged).
- Click after a drag → navigation is blocked once; flag is cleared for the next interaction.

### 6. Keep everything else identical

- Language-based keyframe selection (`animationClass` from `dir`), the `dir`-keyed reset effect, hover pause via `isPaused`, restore-on-return effect, `saveOffset`, `wrapOffset`, mask gradient, card markup, 30s duration, responsive widths, outer wrapper's `dir="ltr"`.

## Acceptance checks (manual, in preview)

- Click a card without moving → article opens.
- Press, move horizontally more than ~5px, release → row slides, no article opens, autoplay resumes from released position.
- Press and hold stationary, then release → article opens (tiny sub-threshold jitter is tolerated).
- Works in both English (L→R autoplay) and Arabic (R→L autoplay), including switching languages at runtime with no flicker.
- Hover still pauses; leaving hover resumes cleanly.
- Back-navigation from a news detail restores the slider position within the same language.

## Files changed

- `src/components/site/FeaturedNews.tsx` (only)
