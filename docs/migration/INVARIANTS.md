# SAAE UI Migration — Invariants

**This block is repeated verbatim at the top of every phase prompt. It is not optional context. A phase that violates any rule below has failed, even if the page it produced looks correct.**

---

## 1. What this project is

We are migrating a **visual design only**. The design comes from a static HTML prototype (committed at `docs/migration/reference/prototype/`). The live site is a TanStack Start + React 19 + Supabase application.

**The prototype is a picture of the destination, not the source of truth for content.** Every piece of real content — news, partners, members, initiative figures, contact details, Arabic copy — already exists in this application and in its Supabase database. The prototype hardcoded stand-ins for all of it.

> Port the design. Re-bind the data. Never copy the prototype's placeholder content over live content.

## 2. Do not touch

Never modify, refactor, "clean up", or reformat anything in these paths:

```
src/routes/learning-management-system*
src/routes/attendance-management-system*
src/routes/admin*
src/routes/super-admin.tsx
src/routes/api/**
src/routes/lovable/**
src/components/lms/**
src/components/ams/**
src/components/admin/**
src/components/ui/**            (shadcn primitives — use them, do not edit them)
src/integrations/**             (Supabase client + generated types)
src/lib/*.server.ts
src/lib/email-templates/**
supabase/migrations/**
drizzle/**
```

Also leave these public routes exactly as they are — they are **not** part of this migration and keep the current light-themed `Navbar` / `Footer`:

```
src/routes/one-million-initiative.tsx          (the ministry document)
src/routes/one-million-initiative-donors.tsx
src/routes/communities.$key.tsx
src/routes/international-business-bridge.tsx
src/routes/resources.ai-tools.tsx
src/routes/registration.tsx
src/routes/initiative.claim.tsx
src/routes/forms.$slug.tsx
src/routes/event-signup.$token.tsx
src/routes/join.$token.tsx
```

## 3. No database changes

- No new tables, no new columns, no migrations, no RLS changes.
- Do not edit `src/integrations/supabase/types.ts`. It is generated.
- Every query you write must match an existing table and existing column names.
- If a design element seems to need a field that does not exist, **render it from what exists or omit it** — and say so in your summary. Do not invent schema.

## 4. Token scoping — the single most important rule

The new design is **dark** (`--canvas: #06232a`). The application is **light** (`src/styles.css` sets `color-scheme: light only` and a full light token set on `:root`).

- **Never add, remove, or change a custom property inside `:root`, `.dark`, or `@theme` in `src/styles.css`.**
- All new design tokens live inside a **scoped block** keyed on a wrapper class:

```css
/* src/styles/saae-v2.css — new file, imported once from styles.css */
.saae-v2 {
  --v2-canvas: #06232a;
  --v2-type:   #e7f1f0;
  /* ... */
}
```

- Every migrated page renders inside `<div className="saae-v2"> ... </div>`.
- Prefix every new token with `--v2-` so it can never collide with an app token.
- Prefix every new global class with `v2-` for the same reason.

Reason: `:root` is shared by the LMS, the attendance system, the admin CRM, the super-admin console, every dialog, and every email preview route. A dark ground leaking into those is the one mistake in this migration that is expensive to undo.

## 5. Server-side rendering safety

This app server-renders. Any of the following at module scope or in a render body will break the build or the first paint:

- `document`, `window`, `navigator`, `localStorage`, `matchMedia`
- GSAP / ScrollTrigger registration
- `IntersectionObserver`, `ResizeObserver`
- video element creation, `URL.createObjectURL`

All of it goes inside `useEffect` (which never runs on the server), guarded with `if (typeof window === "undefined") return;` where a helper may be called early. Animation libraries are imported dynamically inside the effect, not at the top of the file.

## 6. Preserve SEO and page metadata

The prototype has **no** `<head>` metadata at all. Every migrated route already has a `head()` export. **Keep it byte-for-byte unless the phase says otherwise:**

- `title`, `meta name="description"`
- `og:title`, `og:description`, `og:url`
- `rel="canonical"`
- JSON-LD blocks (`NGO` on the root route, `LocalBusiness` on `/contact`)

If you add a route, add it to `src/routes/sitemap[.]xml.ts`.

## 7. Preserve behaviour the prototype does not have

The prototype's README boasts "no forms, accounts, chatbot, cookies, analytics". A faithful port would silently delete working features. Keep all of these:

- **`AssistantFab`** — the chatbot launcher, mounted from `__root.tsx` on public pages. It must keep appearing on every migrated page.
- **Google Analytics** (`gtag`, `G-MM4Y7E9Y96`) in `__root.tsx`.
- **`sonner` toasts** for form feedback.
- **Route-level scroll restoration** already implemented in `__root.tsx`.

## 8. Arabic and English copy precedence

The site is bilingual with RTL. Two dictionaries now exist and they must not fight:

| Kind of string | Source of truth |
|---|---|
| Anything from the database (news, partners, members) | **The database.** `title_ar` / `title_en`, `content_ar` / `content_en`. |
| Vision, mission, goals, fields, values | **`src/lib/about-content.ts`** — already bilingual. |
| Nav labels, footer, section headings, stats, communities | **`src/lib/translations.ts`** — already bilingual. |
| New UI chrome the site never had (ribbon labels, eyebrows, new section headings, loader copy) | The prototype dictionary at `docs/migration/reference/chrome-dictionary-ar-en.md`. **Add these as new keys in `translations.ts`.** |

**Never overwrite existing Arabic copy with the prototype's Arabic.** The prototype's Arabic is a paraphrase written for a design demo. The live Arabic is the organisation's approved wording.

All new strings go through `useLang()` / `translations.ts`. **Do not port the prototype's `language.js` runtime DOM-swapping engine.** It walks the DOM and replaces text nodes — that fights React's reconciler and will produce corrupted text and hydration errors.

## 9. RTL correctness

The prototype was authored LTR-first. These need explicit mirroring:

- **Radial nav** — items are positioned with inline `--angle` / `--counter-angle` custom properties. In RTL, mirror the arc to the opposite side and negate the angles.
- **Journey ribbon** — edge-anchored right on desktop. In RTL it anchors left.
- Use CSS logical properties (`inline-start` / `inline-end`, `margin-inline`, `padding-inline`) instead of `left` / `right` everywhere you can.
- Arabic never gets `letter-spacing`. Set `letter-spacing: normal` under `[dir="rtl"]` for every heading class that uses tracking.
- Arabic headings need more line-height than the English (`~1.45` vs `~1.05`).

## 10. Theme toggle

Migrated pages are dark by design; there is no light variant of this design. **Hide the theme toggle on migrated pages** (pass a prop to the new nav). Leave `ThemeProvider` and the toggle fully working everywhere else. Do not remove theme support from the app.

## 11. Responsive and motion

- Every page must be correct at **360, 390, 768, 1024, 1280, 1440 px**.
- No horizontal page scroll at any width. Wide elements (partner grids, news reels, tables) scroll inside their own `overflow-x: auto` container.
- Touch targets at least 44 x 44 px.
- Honour `prefers-reduced-motion: reduce` — replace scroll-driven and looping animation with a static end state. The prototype already does this; keep it.
- Phones must never download the hero video. The prototype gates it on `(pointer: coarse)` + portrait + viewport width; keep those gates.

## 12. Definition of done for every phase

A phase is complete only when all of these pass:

```bash
bun run typecheck
bun run lint
bun run build
```

plus:

- No file outside the phase's stated allowlist was modified.
- `git diff src/styles.css` shows no change inside `:root`, `.dark`, or `@theme`.
- The page renders correctly in **English and Arabic**, at **360 px and 1440 px**.
- Every dynamic list on the page shows **real data from Supabase**, not the prototype's hardcoded items.
- The chatbot launcher is visible.
- The existing `head()` metadata is unchanged.

Report at the end of each phase: files changed, data sources bound, anything you could not do, and anything you had to decide.
