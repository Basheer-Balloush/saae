# Phase 0 — Foundation

**Nothing visible changes in this phase.** No existing page is migrated. We are laying the design system, the assets and the new page chrome so that every later phase is a small, safe, reviewable step.

Do not start any other phase until this one builds clean.

---

## NON-NEGOTIABLES (read `docs/migration/INVARIANTS.md` in full before starting)

1. **Never touch `:root`, `.dark`, or `@theme` in `src/styles.css`.** All new tokens go in a new file, scoped to a `.saae-v2` wrapper class, every token prefixed `--v2-`. A dark ground leaking into the LMS / attendance system / admin CRM is the one mistake here that is expensive to undo.
2. **Do not modify** anything under `src/routes/learning-management-system*`, `attendance-management-system*`, `admin*`, `super-admin.tsx`, `api/`, `lovable/`, `src/components/{lms,ams,admin,ui}/`, `src/integrations/`, `src/lib/*.server.ts`, `supabase/migrations/`, `drizzle/`.
3. **No database changes.** No migrations, no new columns, no edits to `src/integrations/supabase/types.ts`.
4. **SSR safety.** This app server-renders. `window`, `document`, `localStorage`, `matchMedia`, `IntersectionObserver`, GSAP registration — all of it goes inside `useEffect`, never at module scope or in a render body.
5. **Do not port the prototype's `language.js`.** It swaps DOM text nodes at runtime and will corrupt React's rendering. Strings go into `src/lib/translations.ts` and are read through `useLang()`.
6. **Do not delete `AssistantFab`** (the chatbot launcher) or the Google Analytics tags in `__root.tsx`.

## Reference material in this repo

- `docs/migration/reference/prototype/` — the full static prototype source. Read its CSS and markup for exact values.
- `docs/migration/reference/design-tokens.md` — the unified token set. **Use it verbatim.**
- `docs/migration/reference/chrome-dictionary-ar-en.md` — Arabic for the new chrome strings.
- `docs/migration/reference/data-binding-map.md` — which prototype block binds to which live data source.

---

## Files you may create or modify in this phase

**Create:**
```
src/styles/saae-v2.css
src/components/site-v2/RadialNav.tsx
src/components/site-v2/JourneyRibbon.tsx
src/components/site-v2/FooterV2.tsx
src/components/site-v2/PageV2.tsx
src/components/site-v2/Reveal.tsx
public/fonts/**                     (copied, not authored)
public/saae/**                      (copied, not authored)
```

**Modify (narrowly):**
```
src/styles.css                      — ONE new @import line at the bottom. Nothing else.
src/lib/translations.ts             — add new keys only. Do not change existing values.
src/routes/__root.tsx               — font loading + language-default fix only (see tasks 5 and 6)
```

Touch nothing else.

---

## Task 1 — Assets into the repo

Copy from the delivered bundle:

- `assets-to-upload/public/fonts/*` → `public/fonts/`
- `assets-to-upload/public/saae/*` → `public/saae/`

These are referenced from code as `/fonts/...` and `/saae/...`.

Do **not** copy the hero video (`hero-scrub.mp4`). It is handled in Phase 7 and is hosted externally.

## Task 2 — `src/styles/saae-v2.css`

Create the file with:

1. The `@font-face` block for Cairo, copied from `reference/prototype/index.html` (lines ~14–87). **Keep the `unicode-range` splits exactly** — they are what stops Latin pages downloading the large Arabic TTFs. Rewrite the `src:` URLs from `assets/fonts/...` to `/fonts/...`.
2. The complete `.saae-v2 { ... }` token block from `reference/design-tokens.md`, including the two responsive `--v2-page` overrides.
3. The `[dir="rtl"]` typography corrections from the same file.
4. The `prefers-reduced-motion` block from the same file.

Then add exactly one line at the **bottom** of `src/styles.css`:

```css
@import "./styles/saae-v2.css";
```

**Verify before continuing:** `git diff src/styles.css` must show one added line and nothing else.

## Task 3 — `PageV2.tsx`

A single wrapper every migrated page uses. It owns the `.saae-v2` class, the direction attribute, and the shared chrome, so no page has to remember them.

```tsx
// Shape, not final code — implement in the project's own style.
export function PageV2({
  children,
  ribbonSections,          // optional: [{ id, labelKey }] for the journey ribbon
}: {
  children: React.ReactNode;
  ribbonSections?: RibbonSection[];
}) {
  const { dir } = useLang();
  return (
    <div className="saae-v2" dir={dir}>
      <RadialNav />
      {ribbonSections?.length ? <JourneyRibbon sections={ribbonSections} /> : null}
      <main id="main-content">{children}</main>
      <FooterV2 />
    </div>
  );
}
```

Also include the skip link (`Skip to main content` → `#main-content`) from the prototype.

## Task 4 — The chrome components

Port these three from the prototype. Match the visual design closely; re-implement the behaviour in React rather than copying the imperative JS.

### `RadialNav.tsx`
Source: `reference/prototype/index.html` (the `.radial-nav` block), `reference/prototype/assets/css/navigation.css`, `reference/prototype/assets/js/navigation.js`.

- Six items: Home `/`, News `/news`, About `/about`, Partners `/partners`, Initiative `/one-million-initiative-home`, Contact `/contact`. **Internal `<Link>` components — never `<a href="...html">`.**
- Labels come from `translations.ts`, not from `data-nav-en` / `data-nav-ar` attributes.
- Keep the arc geometry (`--angle`, `--counter-angle`, staggered `--delay`).
- **RTL:** mirror the arc to the opposite side and negate the angles when `dir === "rtl"`.
- Keep the language toggle button (the `.radial-language` pill). It calls `useLang().toggle()`.
- **Hide the theme toggle here.** Migrated pages are dark-only. Do not remove `ThemeProvider` from the app.
- Accessibility as in the prototype: `aria-expanded` on the toggle, `inert` + `aria-hidden` on the collapsed item list, Escape closes, focus is trapped while open, and the current route gets `aria-current="page"`.
- State (`open`) is React state. `IntersectionObserver` and any `document` listener go in `useEffect` with cleanup.

### `JourneyRibbon.tsx`
Source: the `.journey-ribbon` block in `index.html` plus its CSS.

- Takes a `sections` prop so each page declares its own chapters. Do not hardcode the home page's.
- Shows the current chapter and a count; expands to section links plus a page list; Escape closes; it minimises while the visitor keeps scrolling.
- Anchored to the inline-end edge on desktop, the bottom edge on mobile. **RTL flips the desktop edge.**
- Scroll tracking via `IntersectionObserver` inside `useEffect`.

### `FooterV2.tsx`
Source: the `<footer class="site-footer">` block in `index.html`.

- Four regions: the closing call-to-action band, the identity column (bilingual logo + claim + social), the "Explore" nav column, and the map card.
- Logos: `/saae/saae-logo-en.png` and `/saae/saae-logo-ar.png`, **switched by `lang`, not by CSS `display` on both** — only one should be in the DOM.
- **Every internal link is a `<Link>`.** Convert the prototype's `https://aisyria.org/...` anchors per the table in `reference/data-binding-map.md` → "Footer link rewrites". Social, maps, `mailto:` and `tel:` stay external with `target="_blank" rel="noopener noreferrer"`.
- Contact values (address, `info@aisyria.org`, `+963 930 763 547`) are already correct in the prototype and match the live site. Keep the phone number `dir="ltr"`.
- All labels through `translations.ts`.

### `Reveal.tsx`
A small shared scroll-reveal wrapper replacing the prototype's `.reveal` class + `sections.js` observer. `framer-motion` is already a dependency — use `whileInView` with `viewport={{ once: true }}`. Under `prefers-reduced-motion`, render the final state with no animation.

## Task 5 — Font loading (pick one, not both)

The app currently loads Cairo from Google Fonts in `src/routes/__root.tsx`. We now self-host it. **Remove from `__root.tsx`'s `links` array:**

- the `https://fonts.googleapis.com/css2?family=Cairo...` stylesheet
- the `preconnect` to `fonts.googleapis.com`
- the `preconnect` to `fonts.gstatic.com`

Leave every other link, meta, script and the JSON-LD block untouched.

This removes a render-blocking third-party request from every page in the application, LMS included.

**This is the riskiest task in an otherwise invisible phase** — it changes type loading for *every* page in the application, including surfaces nobody will look at again for six phases. Verify all four of these, in Arabic and English:

- `/resources/ai-tools` — a public page that is not part of this migration
- `/learning-management-system/catalog` — the highest-traffic student surface
- `/admin/login` — the authenticated console
- `/` — the current home page

If **any** of them regresses (wrong family, invisible text while loading, Arabic falling back to a system font), restore the Google Fonts link and the two `preconnect` hints, keep the self-hosted `@font-face` rules scoped under `.saae-v2` only, and report it. Do not ship broken type across the application to save one request.

## Task 6 — Fix the language-default mismatch (pre-existing bug)

`src/lib/i18n.tsx` defaults to `"ar"` when nothing is stored. The inline bootstrap script in `RootShell` (`src/routes/__root.tsx`) defaults to `'en'`. On a first visit these disagree for one frame, which will be much more visible behind the new pages' language-transition animation.

Make both default to the same language. **Use `"ar"`** — it matches `i18n.tsx`, which is what actually drives rendering, and it is the primary audience language. Change only the `||'en'` fallback in the inline script.

## Task 7 — Translation keys

Add the new chrome keys to `src/lib/translations.ts` under both `en` and `ar`, using `reference/chrome-dictionary-ar-en.md`.

Scope for this phase: navigation labels, ribbon labels, footer column titles and links, skip link, language-toggle label.

**Do not change any existing key's value.** Add only.

---

## Acceptance criteria

- [ ] `bun run typecheck`, `bun run lint`, `bun run build` all pass.
- [ ] `git diff src/styles.css` shows exactly one added `@import` line.
- [ ] No `--v2-*` token is defined outside `.saae-v2`.
- [ ] `src/routes/__root.tsx` diff contains only the font-link removal and the one-word language-default change. JSON-LD, meta, gtag, `AssistantFab`, providers all unchanged.
- [ ] Existing pages (`/`, `/about`, `/news`, `/contact`, `/learning-management-system`, `/admin`) look **exactly as before** — this phase must be visually invisible.
- [ ] Cairo renders in both Arabic and English across the app from the self-hosted files.
- [ ] The new components compile and are exported, even though no route uses them yet.

## Report back

List the files created and changed, confirm the `styles.css` diff is one line, and state anything in the prototype chrome you could not reproduce faithfully.
