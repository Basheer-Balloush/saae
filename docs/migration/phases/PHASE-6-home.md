# Phase 6 — `/` (home)

**Do Phases 0–5 first.** The home page is last because it carries the most and depends on every pattern the earlier phases established.

**The scroll-scrubbed hero video is NOT in this phase.** Ship the hero with the designed static frame. Phase 7 adds the video on top, and is allowed to fail without blocking this one.

---

## The mobile problem you must fix

Read this before you plan the page.

In the prototype, the entire cinematic hero — `.cinematic-scroll` — is set to `display: none` on phones, portrait tablets and any coarse-pointer portrait device (`index.html`, the media blocks around lines 1146–1185). Only `.hero-static` remains.

That hero contains **five bands**, and four of them are the page's actual substance:

| Band | Content |
|---|---|
| 0 | Opening statement |
| 1 | The learning platform — "Structured pathways, not scattered tutorials" |
| 2 | The Million Syrian AI Users initiative |
| 3 | SAAE in numbers — 5,000+ trainees, 120+ courses, 30+ partners, 7+ communities |
| 4 | The nine SAAE communities |

The static mobile hero replaces all five with one headline and two buttons. **So on a phone, the prototype's home page silently drops the statistics, the communities, the learning pathway and the initiative panel.** Most of this site's audience is on a phone.

**Requirement: on mobile, bands 1–4 must render as real, stacked sections beneath the static hero.** Same content, same data bindings, laid out for a small screen instead of driven by scroll position. Only the *cinematic mechanism* is desktop-only — never the content it carries.

---

## NON-NEGOTIABLES (full list in `docs/migration/INVARIANTS.md`)

1. **Never touch `:root`, `.dark`, or `@theme` in `src/styles.css`.** New styles scoped under `.saae-v2`, tokens prefixed `--v2-`.
2. **Do not modify** anything under `src/routes/learning-management-system*`, `attendance-management-system*`, `admin*`, `super-admin.tsx`, `api/`, `lovable/`, `src/components/{lms,ams,admin,ui}/`, `src/integrations/`, `src/lib/*.server.ts`, `supabase/migrations/`, `drizzle/`.
3. **No database changes.**
4. **No hardcoded content.** Not the news items, not the partner logos, not the statistics, not the community names.
5. **SSR safety** — this page has the most client-only behaviour in the migration. Every observer, every measurement, every animation registration goes inside `useEffect`. Nothing at module scope.
6. **Keep the existing `loader`, `head()` and the scroll-restoration effect** in `src/routes/index.tsx`.

## Reference

- Design: `docs/migration/reference/prototype/index.html` (markup at lines ~3346–3915, styles above it, behaviour in the inline script and `assets/js/sections.js`, `motion.js`, `text-effect.js`)
- Bindings: `docs/migration/reference/data-binding-map.md`
- Tokens: `docs/migration/reference/design-tokens.md`

---

## Files you may create or modify

**Modify:**
```
src/routes/index.tsx
src/components/site/FeaturedNews.tsx      — restyle; keep its props and data shape
src/components/site/Partners.tsx          — restyle; keep the query and resolveLogo()
src/components/site/Achievements.tsx      — restyle; keep t.achievements binding
src/components/site/Communities.tsx       — restyle; keep t.communities binding
src/components/site/LmsCta.tsx            — restyle
src/components/site/InitiativeCta.tsx     — restyle
src/styles/saae-v2.css
src/lib/translations.ts                   — add new keys only
```

**Create (as needed):**
```
src/components/site-v2/HeroStage.tsx
src/components/site-v2/MissionReel.tsx
src/components/site-v2/HomeFaq.tsx
```

Touch nothing else.

> If restyling the six `site/` components in place would break the five non-migrated routes that also import them — **check first** — then create `site-v2` variants instead and leave the originals untouched. `FeaturedNews`, `Partners`, `Achievements`, `Communities`, `LmsCta` and `InitiativeCta` are currently imported **only by `src/routes/index.tsx`**, so in-place restyling is expected to be safe. `Navbar` and `Footer` are **not** — they are used by 12 routes and must not be touched.

---

## Page structure

Wrap in `<PageV2>` with the ribbon chapters: News, Partners, How we work, Answers.

### 1. Hero

**Desktop (fine pointer, landscape, wide):** the five-band stage. Bands advance with scroll position. In this phase, the background is the static frame `/saae/hero-static.jpg` (with `/saae/hero-start.webp` as the opening frame). Phase 7 replaces that background with the video and changes nothing else.

**Mobile, portrait tablet, coarse pointer, or `prefers-reduced-motion`:** the static hero (`/saae/hero-static.jpg`, headline, two calls to action) **followed by bands 1–4 as ordinary stacked sections.** See the mobile requirement above.

Band content and bindings:

| Band | Content | Bound to |
|---|---|---|
| 0 | Opening headline + eyebrow | `translations.ts` (new keys) |
| 1 | Learning platform | `translations.ts`. **Its call to action links to `/learning-management-system`, not to `/contact#write`.** See "The LMS link" below. |
| 2 | Initiative | `translations.ts`; call to action → `<Link to="/one-million-initiative-home">` |
| 3 | Statistics | `t.achievements.stats` — **never hardcode the numerals.** Keep the count-up animation, but honour `prefers-reduced-motion` by rendering the final value. |
| 4 | Communities flip card | `t.communities.cards` + `COMMUNITY_KEYS`; each links to `/communities/$key` |

Keep the accessible summary paragraph the prototype puts in `.sr-only` — it is what a screen-reader user gets instead of the scroll sequence.

**The LMS link.** The prototype points the learning-platform band at `contact.html#write` because the prototype had no learning platform. The application does. Point band 1 at `/learning-management-system`. This is the `LmsCta` content — it is not missing from the new design, it is mislinked in it.

### 2. News — "The work, as it happens."

Restyle `FeaturedNews` into the prototype's news reel.

- Data comes from the **existing `loader`** in `src/routes/index.tsx` (`news` where `show_on_home = true`, newest first, limit 8) — already passed in as `initialNews`. Do not add a second query.
- Bind headline / excerpt / image / tag / date / link per `data-binding-map.md`.
- The reel renders however many rows come back — not exactly four, and not fewer than what the loader returned.
- The "Everything SAAE has published" card links to `/news`.
- Missing image → designed placeholder. Zero rows → the section is hidden, not an empty rail.

### 3. Partners — "Institutions carry it further."

Restyle `Partners`. **Keep its existing query** (`show_on_home = true`, `display_order` ascending) and its `resolveLogo()` helper untouched. The "View all partners" link goes to `/partners` (built in Phase 1) — **not** to an external `aisyria.org` URL.

The marquee must pause on hover and on focus, and must not animate under `prefers-reduced-motion`.

### 4. Mission — "How SAAE works: train, apply, build"

The three-step sticky reel. New content — add the copy as `translations.ts` keys from the chrome dictionary. Sticky positioning is desktop-only; below 768 it becomes three stacked cards.

### 5. FAQ — "A clear way in."

The five-item accordion. New content — `translations.ts` keys.

Build it on the existing shadcn `Accordion` from `src/components/ui/accordion` and restyle from outside. Real disclosure semantics: `<button>` triggers, `aria-expanded`, keyboard operable.

### 6. Footer

`FooterV2` from Phase 0 — nothing new here.

---

## Behaviour to port carefully

The prototype's home page runs a lot of imperative JavaScript. Re-implement, do not copy:

| Prototype | In React |
|---|---|
| `site-loader` opening animation | A React component with state. It must **never** be able to leave the page hidden — if its "ready" signal never fires, it dismisses itself on a timeout. A stuck loader is a blank site. |
| `language-wash` transition | Keep it; drive it from `useLang()`'s language change, not from a DOM listener. |
| `.reveal` scroll reveals | The `Reveal` component from Phase 0. |
| `sections.js` observers | `useEffect` + `IntersectionObserver`, with cleanup. |
| `text-effect.js` | Only if it survives SSR cleanly. If it does not, drop it and say so. |
| `html` class toggles (`hero-playback-locked`, `hero-snap-active`, `page-has-scrolled`) | **Be careful.** `__root.tsx` already manages `history.scrollRestoration` and a `saae-scroll-positions` session store, and wraps every route in a `framer-motion` `AnimatePresence` keyed on pathname. Anything that locks scrolling or mutates `document.documentElement` must clean up completely on unmount, or navigating away from the home page will leave the site scroll-locked. **Test navigating away and back.** |

---

## Responsive

- Correct at 360, 390, 768, 1024, 1280, 1440 px. No horizontal page scroll at any width.
- **Bands 1–4 are present on mobile as stacked sections.** This is the acceptance criterion most likely to be missed.
- The news reel scrolls inside its own container, never the page.
- The stat figures stay legible at 360 px.
- The community card's previous/next controls are at least 44 x 44 px.
- Touch: nothing depends on hover to be reachable.

## RTL

- The hero bands, the news reel and the partner marquee all travel in the correct direction in Arabic.
- The radial nav arc mirrors (Phase 0).
- `letter-spacing: normal` and looser line-height on Arabic headings.
- The count-up animation and the numerals follow whatever the existing site does.

## Translation keys

Add the home chrome strings from `chrome-dictionary-ar-en.md`. **The rows marked BLOCKED are news headlines — never add them.** `t.achievements` and `t.communities` already exist; reuse them.

---

## Acceptance criteria

- [ ] `bun run typecheck`, `bun run lint`, `bun run build` pass.
- [ ] News, partners, statistics and communities all render from their **live sources**. No hardcoded content in the diff.
- [ ] **On a 390 px viewport, the statistics, the communities, the learning-platform pathway and the initiative panel are all present and readable.**
- [ ] The learning-platform call to action links to `/learning-management-system`.
- [ ] "View all partners" links to `/partners`.
- [ ] No `aisyria.org` absolute URLs in the page source outside `head()`.
- [ ] The loading overlay always dismisses, including when the network is slow or an asset 404s.
- [ ] Navigating `/` → `/news` → `/` leaves scrolling working normally, with no leftover classes on `<html>`.
- [ ] `prefers-reduced-motion: reduce` gives a static, complete page with no scroll-driven sequences.
- [ ] `src/components/site/Navbar.tsx` and `Footer.tsx` show **zero** changes.
- [ ] `head()` and the existing `loader` unchanged.
- [ ] `git diff src/styles.css` still shows only the single Phase-0 `@import`.
- [ ] The chatbot launcher is visible.
- [ ] `/about`, `/news`, `/contact`, `/partners`, `/one-million-initiative-home` and the LMS are all unchanged.

## Report back

Files changed, how mobile renders bands 1–4, how the loader failure path works, confirmation that scroll state is clean after navigating away, and anything from the prototype's imperative JavaScript you chose not to port.
