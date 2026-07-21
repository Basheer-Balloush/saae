## Root cause

In `src/components/site/Footer.tsx`, the organization logo is rendered as a bare `<img>` with no anchor or `Link` wrapper. It has no click handler and no keyboard affordance, so clicking it does nothing — users stay on the current page and scroll position.

The homepage route (`src/routes/index.tsx`) already sets `window.history.scrollRestoration = "manual"` and force-scrolls to `(0,0)` on mount when there's no hash, plus a separate effect that scrolls to a section when a hash is present. So the only reliable way to guarantee "top of homepage" is to navigate to `/` with no hash and, when already on `/`, imperatively scroll to top (since same-route `<Link>` clicks don't remount and won't retrigger the initial effect).

## Changes

**File:** `src/components/site/Footer.tsx`

1. Import `Link`, `useRouterState` from `@tanstack/react-router`.
2. Wrap the existing `<img src={logo} …>` in a TanStack `<Link>`:
   - `to="/"` (the app has a single localized homepage; language is handled via `useLang()` context, not URL prefix, so `/` is correct for both AR and EN).
   - `resetScroll` left at default (true) so cross-route clicks land at the top.
   - `hash={undefined}` / no `hash` prop, and no `search`, so no fragment is appended.
   - `aria-label` set from `t.nav` (e.g. `t.nav.home` if available, otherwise a localized "Syrian Association for AI & Entrepreneurship — Home" string; will confirm the key when editing).
   - `className="inline-block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 rounded-sm"` to preserve layout and add a visible keyboard focus ring; the `<img>` keeps its current `width`, `height`, `className`, and `brightness-0 invert` styling untouched.
3. Add an `onClick` handler that, when the current pathname is already `/` (via `useRouterState({ select: s => s.location.pathname })`):
   - Calls `window.scrollTo({ top: 0, behavior: "smooth" })`.
   - Does NOT `preventDefault()` for modifier/middle clicks (`e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0`), so "open in new tab" keeps working via the underlying anchor `<Link>` renders.
   - For a plain left click on `/`, calls `e.preventDefault()` after scrolling to avoid a redundant same-route navigation entry in history.
4. If the URL contains a hash on `/` (e.g. `/#partners`), the same handler clears it with `window.history.replaceState(null, "", "/")` before scrolling, satisfying requirement 6.

No other footer markup, links, translations, or global nav behavior are touched.

## Localized routing

The project uses a single set of routes with runtime language switching (`useLang()` + `dir` on elements). There is no `/ar` / `/en` prefix, so the localized homepage URL for both languages is `/`. The `aria-label` is pulled from the active-language translations so screen readers announce it correctly in AR and EN.

## Verification

- From `/about`, `/contact`, `/news`, and an LMS route: click footer logo → lands on `/` at scroll 0, no hash in URL.
- On `/` scrolled to Partners: click logo → smooth scroll to top, URL stays `/`, no duplicate history entry.
- On `/#partners`: click logo → hash removed, viewport at top.
- Keyboard: Tab to logo → visible focus ring → Enter activates same as click.
- Cmd/Ctrl/middle click → opens `/` in a new tab.
- Repeat all of the above with language toggled to English and to Arabic (RTL); footer layout, logo size, and `brightness-0 invert` styling unchanged.
- No console errors; build passes.
