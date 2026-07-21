## Root cause

`src/components/site/Footer.tsx` renders the three quick links (Communities / Achievements / Partners) as bare `<a href="#communities">` etc. Those hashes resolve against the current URL, so on any non-home route they either do nothing or jump to a random on-page id. There is also no global hash-scroll handler — only `src/routes/index.tsx` has a homepage-local effect, which never runs when the user navigates in from `/about`, `/news`, an LMS route, or a fresh tab opened at `https://aisyria.org/#partners`.

`src/routes/__root.tsx` already has a `ScrollRestoration` component that force-scrolls to a saved-per-pathname position on every path change. That will fight a hash scroll unless we skip restoration when the incoming URL carries a hash.

The homepage section ids `home` (on the wrapper `div` in `index.tsx`), `communities`, `achievements`, `partners` already exist and match the required link targets — no id renaming needed.

## Changes

### 1. `src/components/site/Footer.tsx` — router-aware quick links
Replace the three `<a href="#…">` for `communities`, `achievements`, `partners` inside the Quick Links list with `<Link to="/" hash="…">` (from `@tanstack/react-router`, already imported). The existing `contact`/`news`/`about` `Link`s stay unchanged. Visual classes and hover state are preserved.

### 2. New `src/components/site/ScrollToHash.tsx` — global handler
Small client-only component with no UI:
- Reads the current location via `useLocation()` and `prefers-reduced-motion` via `matchMedia`.
- In an effect keyed on `[location.pathname, location.hash]`:
  - If `location.hash` is empty → do nothing (ScrollRestoration in `__root` already handles top / saved position).
  - If `location.hash` is present → poll for `document.getElementById(hash)` via `requestAnimationFrame` for up to ~2 s (60 rAF ticks or a wall-clock cutoff), then call `el.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" })`. Stop silently if the element never appears.
- Also runs once on mount to cover deep-link first loads (e.g. `/#partners` in a fresh tab), since the initial effect run already captures the initial hash.

Mount it inside `RootComponent` in `src/routes/__root.tsx`, right after `<ScrollRestoration />`.

### 3. `src/routes/__root.tsx` — don't fight hash scrolls
In the `ScrollRestoration` effect that scrolls on `[location.pathname]`, early-return when `window.location.hash` is non-empty so hash navigations aren't clobbered by the saved-position jump.

### 4. `src/routes/index.tsx` — remove duplicate handler
Delete the inline `useEffect` that polls for `#hash` on the homepage (lines ~65–93). The new global handler covers it. Keep the other effect that manages `history.scrollRestoration` on this route.

### 5. Section scroll offset for the sticky navbar
Add `scroll-mt-24` (6 rem ≈ 96 px, comfortably clears the fixed navbar's `py-3 + ~44 px` logo row and its blur band) to:
- The `#home` wrapper `div` in `src/routes/index.tsx`.
- The `#communities` section in `src/components/site/Communities.tsx`.
- The `#achievements` section in `src/components/site/Achievements.tsx`.
- The `#partners` section in `src/components/site/Partners.tsx`.

Tailwind's `scroll-mt-*` is direction-independent, so this works identically in RTL and LTR and in both themes.

### 6. Audit other hash links
Grep showed no other bare `href="#communities|#achievements|#partners|#home"` in the codebase; `Navbar.tsx` and `communities.$key.tsx` already use `<Link to="/" hash="…">`. Nothing else needs changing.

## Verification

- From `/about`, `/contact`, `/news`, `/news/:id`, `/one-million-initiative-home`, `/learning-management-system`: click each footer quick link → client-side nav to `/`, viewport lands on the matching section with the heading fully below the navbar.
- On `/`: same clicks smooth-scroll to the section, no reload.
- Fresh tab to `https://aisyria.org/#achievements` → after mount, viewport scrolls to Achievements.
- Normal cross-route navigation with no hash still lands at top (or saved position from ScrollRestoration).
- macOS "Reduce motion" enabled → scroll is instant.
- Keyboard: Tab to a footer quick link → Enter → same behavior as click.
- AR (RTL) and EN (LTR), light and dark themes: identical behavior; no direction-specific branches.
