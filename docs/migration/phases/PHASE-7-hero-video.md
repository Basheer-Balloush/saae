# Phase 7 — The scroll-scrubbed hero video

**Do Phases 0–6 first.** This phase is deliberately last and deliberately separate.

## Why this is its own phase, and why it is allowed to fail

The prototype's hero maps page scroll position onto video playback time. It is the single most impressive thing in the design and the single most fragile thing to port, because it fights three systems this application already runs:

1. `src/routes/__root.tsx` installs its own scroll restoration — `history.scrollRestoration = "manual"` plus a `saae-scroll-positions` session store, written on every scroll frame.
2. `__root.tsx` wraps every route in a `framer-motion` `AnimatePresence` keyed on `location.pathname`, which mounts and unmounts the page around navigation.
3. The prototype's player toggles classes on `document.documentElement` (`hero-playback-locked`, `hero-snap-active`, `page-has-scrolled`) and locks input in JavaScript. If any of that survives an unmount, **the whole site is left scroll-locked.**

**If it cannot be made to behave, stop and ship the static hero from Phase 6.** The site is complete and correct without the video. It is not complete with a hero that traps the visitor. Do not compromise Phases 0–6 to land this.

---

## NON-NEGOTIABLES (full list in `docs/migration/INVARIANTS.md`)

1. **Never touch `:root`, `.dark`, or `@theme` in `src/styles.css`.**
2. **Do not modify** anything under `src/routes/learning-management-system*`, `attendance-management-system*`, `admin*`, `super-admin.tsx`, `api/`, `lovable/`, `src/components/{lms,ams,admin,ui}/`, `src/integrations/`, `src/lib/*.server.ts`, `supabase/migrations/`, `drizzle/`.
3. **No database changes.**
4. **Do not change `__root.tsx`'s scroll restoration or its `AnimatePresence` wrapper** to make the hero work. Fit the hero to the app, not the app to the hero.
5. **SSR safety.** No video element, no `URL.createObjectURL`, no `matchMedia`, no GSAP at module scope. All of it inside `useEffect`.
6. **Phones must never download the video.** The device gates below are a hard requirement, not an optimisation.

## Reference

- Player implementation: the inline `<script>` in `docs/migration/reference/prototype/index.html` (lines ~3916–5246)
- Device gates: the media queries around lines 1146–1185 of the same file
- The video file: `assets-to-upload/supabase-storage/hero-scrub.mp4` (7.2 MB, 1600 x 900, H.264)

---

## Files you may create or modify

**Create:**
```
src/components/site-v2/HeroScrubVideo.tsx
```

**Modify:**
```
src/components/site-v2/HeroStage.tsx     — swap the static background for the video when eligible
src/styles/saae-v2.css
```

Touch nothing else.

---

## Task 1 — Host the video

The video is **not** committed to the repository. Upload `hero-scrub.mp4` to a public Supabase Storage bucket and reference it by URL.

- Keeps the repo and every build light.
- Lets the client replace the footage later without a redeploy.
- Most visitors never download it, because of the gates below.

Put the URL in an environment variable (follow the project's existing `VITE_`-prefixed convention) with the static poster as the fallback when the variable is absent. **Do not hardcode a project-specific URL in the component.**

Set long-lived cache headers on the object.

## Task 2 — Device gates (before any bytes are fetched)

Reproduce the prototype's gating exactly. The video is requested **only** when **all** of these hold:

- pointer is fine (`matchMedia("(pointer: fine)")`)
- orientation is landscape
- viewport width is above the prototype's breakpoint
- `prefers-reduced-motion` is **not** `reduce`

Everything else — phones, portrait tablets, coarse-pointer portrait devices, short landscape phones, reduced-motion visitors — gets the static composition and **requests neither the video nor its desktop poster**.

Evaluate the gates inside `useEffect`, after mount. Never at module scope. The server-rendered markup is always the static path; the video is an enhancement applied on the client.

## Task 3 — The player

Port the behaviour from the prototype's inline script:

- Stream the asset, then map page scroll progress onto `video.currentTime` on a paused element.
- The playhead moves **only** in response to native scrolling. It stops the instant scrolling stops. It reverses when the visitor scrolls up.
- Frame-snapped seeks for smooth reverse scrubbing.
- A `requestAnimationFrame` driver — the prototype's comments record that `requestVideoFrameCallback` never fires on a paused video. Keep the rAF approach.
- Loading progress feeds the hero's progress ring.
- **If the video stalls or fails to load, the static poster and the complete HTML story stay visible.** Never a black rectangle, never a spinner that outlives the failure. Use a timeout as well as an error handler.

## Task 4 — Cleanup (the part that breaks sites)

The `useEffect` cleanup function must, without exception:

- remove every scroll, resize, `visibilitychange` and `matchMedia` listener
- cancel the rAF loop
- pause the video, clear its `src`, call `load()`, and revoke any object URL
- **remove every class it added to `document.documentElement`** — `hero-playback-locked`, `hero-snap-active`, and any other
- release any scroll or input lock, unconditionally, even on an error path

Write the lock release so it runs in a `finally`-equivalent position. A scroll lock that survives navigation is a site-wide outage, not a hero bug.

## Task 5 — Verify it coexists

Test all of these:

1. Load `/`, scroll through the hero, navigate to `/news`, come back. Scrolling works normally throughout.
2. Navigate away **mid-hero**, while the playback lock is active. Scrolling still works on the destination page.
3. Use the browser back and forward buttons across the home page. `__root.tsx`'s scroll restoration still restores positions on other routes.
4. Load `/` with the video URL returning 404. The hero shows the poster and the page is fully usable.
5. Load `/` on a throttled connection. The loading ring progresses and eventually resolves or times out into the poster.
6. Switch language on the home page while the hero is active.
7. Set `prefers-reduced-motion: reduce`. No video is requested; the static composition renders.
8. Load on a 390 px phone. **Check the network panel: no video request.**

---

## Acceptance criteria

- [ ] `bun run typecheck`, `bun run lint`, `bun run build` pass.
- [ ] `hero-scrub.mp4` is **not** in the repository.
- [ ] The video URL comes from an environment variable, with a static fallback.
- [ ] On a 390 px phone, the network panel shows **no** video and **no** desktop poster request.
- [ ] Under `prefers-reduced-motion: reduce`, no video is requested.
- [ ] All eight coexistence tests above pass, especially 2 — navigating away mid-hero.
- [ ] After visiting `/` and leaving, `document.documentElement.className` carries none of the hero's classes.
- [ ] A failed or slow video never leaves the page blank, spinning or locked.
- [ ] `src/routes/__root.tsx` shows **zero** changes in this phase.
- [ ] `git diff src/styles.css` still shows only the single Phase-0 `@import`.
- [ ] Every other page in the application is unchanged.

## If you cannot land it

Stop. Revert this phase's changes. Report precisely what fought what. The static hero from Phase 6 ships and the migration is complete without the video — that is an acceptable outcome, and a far better one than a hero that can strand a visitor.

## Report back

Whether the video shipped, where it is hosted, the gate conditions implemented, the results of all eight coexistence tests, and how the failure path behaves.
