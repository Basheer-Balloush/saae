## Root cause

`LogoParticles` re-initializes its entire animation on every parent re-render because its main `useEffect` has `[size, colors, reducedMotion]` as dependencies and the `colors` default (`["#048090", "#b8a06a"]`) is a **new array literal each time the component renders** (default-parameter values are re-created per call). So the reference-equality check on `colors` always fails.

Meanwhile, `FeaturedNews` calls `setIsPaused(true/false)` on every `onMouseEnter` / `onMouseLeave` on the marquee row. Because `LogoParticles` sits inside the same `FeaturedNews` component, every hover on any news card re-renders the parent → re-renders `LogoParticles` → `colors` gets a new reference → the animation effect re-runs → previous RAF is cancelled, images reload, points get re-sampled, particles are reallocated, and the animation visibly restarts / stutters. Dragging the slider also flips hover state as the pointer crosses cards, compounding the effect.

Secondary contributors (also fixed):
- `LogoParticles` is not memoized, so it always re-renders with the parent.
- Slider hover state lives on the same component as the logo, so any local state change forces the logo subtree through React's render pass.

## Fix

Only two files, no design changes.

### 1. `src/components/site/LogoParticles.tsx`

- Hoist the default color pair to a module-level constant (`DEFAULT_COLORS = ["#048090", "#b8a06a"] as const`) and use it as the default value so the reference is stable across renders.
- Keep animation state driven by refs; put the current `colors` into a ref and read it inside `draw`, so passing a different palette later would not tear down the animation either.
- Drop `colors` from the main effect's dependency array; keep `[size, reducedMotion]`. Size legitimately requires reinit (canvas dimensions + resampling); reduced-motion legitimately swaps to the static `<img>` branch.
- Wrap the default export in `React.memo` so shallow-equal props (`size`, `className`, and now-stable `colors`) skip re-render entirely when the parent re-renders due to slider hover / drag state.
- Preserve everything visible: canvas size, colors, particle sampling step, phase durations, alpha curves, reduced-motion fallback image, DPR handling, cleanup on real unmount.

### 2. `src/components/site/FeaturedNews.tsx` (isolation only)

- Extract the news marquee (the `dir="ltr"` overflow wrapper plus its inner draggable row and the `<style>` keyframes) into a local `NewsMarquee` sub-component that owns `isPaused`, `rowRef`, `dragRef`, `didDragRef`, and all pointer handlers.
- `FeaturedNews` keeps the section shell, heading block, `LogoParticles`, "View all" button, and passes `slides`, `t`, `dir`, `lang` down as stable props (arrays/strings from state, no new object literals per render).
- Net effect: `setIsPaused` on hover only re-renders `NewsMarquee`, not `FeaturedNews` or `LogoParticles`. Combined with `React.memo`, the logo subtree is fully insulated from slider interaction.
- No visual/behavioral change to the slider: same drag threshold, same autoplay/pause, same link-click guard, same restore-offset effect, same dir-keyed reset.

## Why this satisfies each requirement

- Isolates the logo from slider state → hover/drag/click on any news card cannot reach `LogoParticles`' render path.
- Animation initialized once after mount (effect deps no longer churn).
- No changing `key`, no recreated particle arrays, no rebuilt canvas context, no duplicated RAF loops.
- RAF id + `cancelled` flag stay in the effect closure; cleanup only fires on real unmount or size/reduced-motion change.
- `prefers-reduced-motion` behavior unchanged.
- No dependency on visibility / IntersectionObserver added (out of scope of this bug and the section is already above-the-fold on the homepage).

## Manual verification

- Load `/`, hover repeatedly and quickly across many news cards for 30+ seconds → logo phases (assembleA → revealA → hideA → scatterA → …B) progress without restart or stutter.
- Drag/swipe the slider left/right multiple times → logo continues uninterrupted.
- Switch language via navbar → slider flips direction (existing behavior), logo continues without reinitializing (size unchanged; only `dir` changed, which the logo doesn't consume).
- Resize the window to change viewport-based `size` prop (200 ↔ 150 via responsive `<LogoParticles>` instances) → each instance still runs its own animation; the visible one keeps going.
- Click a news card and navigate back → logo mounts fresh (expected) and runs smoothly.
- No new console errors; React DevTools shows `LogoParticles` render count staying flat during slider interaction.

## Files changed

- `src/components/site/LogoParticles.tsx`
- `src/components/site/FeaturedNews.tsx`
