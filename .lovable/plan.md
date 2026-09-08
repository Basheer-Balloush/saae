# Fix the hero scroll-up fade to a cinematic blur crossfade

## Problem
The current reverse-scroll behaviour on the cinematic homepage fades the hero media and text card out, jumps the video to the previous checkpoint, then fades back in. The user experiences this as abrupt and "blinky" rather than cinematic.

## Goal
Replace the blinky cut with a smooth, cinematic blur-and-opacity crossfade when scrolling up between hero checkpoints. Keep all existing hero behaviour intact: forward scrub, snap points, exit wall, reduced-motion/static-gate fallbacks, and Arabic RTL mirroring.

## What will change

### 1. Visual treatment
- Add a `filter: blur()` transition to `.hero-media` and `.hero-copy-stage` during reverse travel.
- Add a subtle `scale(1.03)` to the media so the outgoing frame feels like it is drifting back, and the incoming frame settles forward.
- Introduce a temporary vignette darkening overlay that lifts during the fade, masking the video seek moment.
- Lengthen the fade-out phase and shorten the fully-hidden phase so the transition reads as a continuous crossfade, not a blank.
- Use a cinematic ease (`cubic-bezier(.45, 0, .15, 1)`) for both opacity and blur.

### 2. State machine in `src/lib/public-site/hero-cinema.ts`
- Keep the existing reverse-fade detection but rename the phases to `fading-out`, `seeking`, `fading-in`.
- Trigger the seek when opacity/blur are near their peak, not immediately, so the frame jump is hidden by blur.
- Cancel the transition cleanly on downward scroll.
- Maintain reduced-motion and static-experience guards.

### 3. CSS in `src/styles/public-site.css`
- Extend the existing `.hero-reverse-fade` rules to animate `opacity`, `filter`, and `transform`.
- Add a `.hero-reverse-wash` pseudo-element that darkens during the fade.
- Keep `prefers-reduced-motion: reduce` overriding all motion.

### 4. Verification
- Run `bun run typecheck` and the existing build.
- Use Playwright to scroll up through the hero and capture screenshots at each checkpoint to confirm the blur crossfade is visible and not abrupt.
- Test reduced-motion media query still disables the effect.

## Out of scope
- No changes to forward scroll behaviour, snap points, exit wall, or loader.
- No new video encode or asset changes.
- No changes to the hero bands, copy, or community card flip.

## Files to edit
- `src/lib/public-site/hero-cinema.ts`
- `src/styles/public-site.css`
