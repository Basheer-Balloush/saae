# Phase 1 — `/partners` (new route)

**Do Phase 0 first.** This phase depends on `PageV2`, `RadialNav`, `JourneyRibbon`, `FooterV2` and the `.saae-v2` token layer existing.

This is deliberately the first visible page: it is a **brand-new route**, so there is no existing page to break. It proves the token scoping, the chrome and the database binding end to end before we touch anything the public already uses.

---

## NON-NEGOTIABLES (full list in `docs/migration/INVARIANTS.md`)

1. **Never touch `:root`, `.dark`, or `@theme` in `src/styles.css`.** New styles are scoped under `.saae-v2`, tokens prefixed `--v2-`.
2. **Do not modify** anything under `src/routes/learning-management-system*`, `attendance-management-system*`, `admin*`, `super-admin.tsx`, `api/`, `lovable/`, `src/components/{lms,ams,admin,ui}/`, `src/integrations/`, `src/lib/*.server.ts`, `supabase/migrations/`, `drizzle/`.
3. **No database changes.** No migrations, no new columns, no edits to `src/integrations/supabase/types.ts`.
4. **SSR safety** — `window` / `document` / observers only inside `useEffect`.
5. **The database is the source of truth for partners.** The prototype's 23 hardcoded `.webp` logos are placeholders. Do not ship them.
6. All strings through `useLang()` / `src/lib/translations.ts`. Never port `language.js`.

## Reference

- Design: `docs/migration/reference/prototype/partners.html`
- Tokens: `docs/migration/reference/design-tokens.md`
- Bindings: `docs/migration/reference/data-binding-map.md`
- Arabic: `docs/migration/reference/chrome-dictionary-ar-en.md`

---

## Files you may create or modify

**Create:**
```
src/routes/partners.tsx
```

**Modify (narrowly):**
```
src/styles/saae-v2.css          — add the partners page styles
src/lib/translations.ts         — add new keys only
src/routes/sitemap[.]xml.ts     — add one entry
```

Touch nothing else. In particular, **do not modify `src/components/site/Partners.tsx`** — that is the home-page logo wall and it stays as it is until Phase 6.

---

## Task 1 — The route

Create `src/routes/partners.tsx` as a TanStack file route at `/partners`, following the conventions already used in `src/routes/news.index.tsx`.

**Loader** — fetch every partner, not just the home-page subset:

```ts
loader: async () => {
  const { data } = await supabase
    .from("partners")
    .select("id,name,logo_url,logo_light_url,size_class,display_order")
    .order("display_order", { ascending: true });
  return { partners: data ?? [] };
}
```

Note the difference from the home-page component: **no `show_on_home` filter.** This page is the full register.

**Logo URL resolution.** Some seeded rows store `/src/assets/partner-*.png` paths. `src/components/site/Partners.tsx` already contains a `resolveLogo()` helper backed by `import.meta.glob`. **Copy that helper's approach** into this route (or lift it into a small shared module under `src/components/site-v2/`) so legacy rows resolve to real built URLs. Do not edit the original file.

**`head()`** — this is a new route, so author the metadata:

```ts
head: () => ({
  meta: [
    { title: "الشركاء — الجمعية السورية للذكاء الصنعي وريادة الأعمال" },
    { name: "description", content: "..." },       // bilingual-aware, follow the pattern in contact.tsx
    { property: "og:title", content: "..." },
    { property: "og:description", content: "..." },
    { property: "og:url", content: "https://aisyria.org/partners" },
  ],
  links: [{ rel: "canonical", href: "https://aisyria.org/partners" }],
})
```

Match the shape used by the existing public routes.

## Task 2 — The page

Wrap everything in `<PageV2>`. Port the design from `reference/prototype/partners.html`:

- The header block: eyebrow, `<h1>` ("The partner register." / the Arabic from the dictionary), the intro paragraph, the rule.
- The `.partner-grid` of `.partner-plate` items: a square plate holding the mark, with the partner name beneath.

**Bind each plate to a database row:**

| Prototype | Bind to |
|---|---|
| `<img src="assets/images/partners/partner-damascus.webp">` | `partner.logo_url` (resolved), with `partner.logo_light_url` as the alternate where the design needs a light-ground mark |
| `<span class="plate-name">Damascus University</span>` | `partner.name` |
| grid order | `display_order` ascending |
| plate size | `size_class` |

`alt` text: the prototype uses `alt=""` with a visible name beside it — that is correct and accessible. Keep it. Do not duplicate the name into `alt`.

Images: `loading="lazy"`, `decoding="async"`, explicit `width` / `height` to prevent layout shift.

**Empty state:** if the query returns nothing, render the header and a short bilingual "partners will be listed here" line — never an empty page or a crash.

## Task 3 — Responsive

- 1280 px and up: the prototype's grid.
- 768–1279: fewer columns, same rhythm.
- Below 768: two columns; plates stay square; names wrap without truncation.
- Below 400: two columns still, reduced gap. Not one column — the marks read better paired.
- The grid must never cause horizontal page scroll. If plates cannot fit, they wrap.

## Task 4 — RTL

- Grid flows right-to-left in Arabic (`direction` is inherited from `PageV2`; verify the visual order actually reverses).
- The header rule and eyebrow align to the inline start.
- Arabic headings: `letter-spacing: normal`, looser line-height (see `design-tokens.md`).
- The radial nav arc mirrors — this is `RadialNav`'s job from Phase 0; just verify it here.

## Task 5 — Sitemap

Add to the static entries array in `src/routes/sitemap[.]xml.ts`:

```ts
{ path: "/partners", changefreq: "monthly", priority: "0.7" },
```

Change nothing else in that file.

## Task 6 — Translation keys

Add the partners-page chrome strings to `translations.ts` under both `en` and `ar` from `chrome-dictionary-ar-en.md` (eyebrow "Shared work", the register heading, the intro, the empty-state line). Add only — change no existing value.

---

## Acceptance criteria

- [ ] `bun run typecheck`, `bun run lint`, `bun run build` pass.
- [ ] `/partners` renders the **real partner rows from Supabase**, in `display_order`, with no hardcoded logo list anywhere in the diff.
- [ ] `git diff src/styles.css` is unchanged from Phase 0 (one `@import` line total).
- [ ] Every new CSS rule is nested under `.saae-v2`.
- [ ] Correct in English and Arabic; correct at 360, 390, 768, 1024, 1280, 1440 px; no horizontal scroll at any width.
- [ ] The chatbot launcher (`AssistantFab`) is visible on the page.
- [ ] Nav and footer links navigate **client-side** (no full page reload).
- [ ] `/` , `/about`, `/news`, `/contact` and the LMS are visually **unchanged** — nothing in this phase should have reached them.
- [ ] `/sitemap.xml` includes `/partners`.

## Note for the client (not a build task)

The prototype carries 23 partner marks; the database currently seeds 20. High-quality `.webp` versions of all of them, including the ones not yet in the database, are in `assets-to-upload/optional-partner-logos/`. **Add or upgrade them through the existing admin Partners screen — never in code.** Report which prototype marks have no matching database row so the client can decide.

## Report back

Files changed, the exact query used, the count of partners rendered, and any partner whose logo failed to resolve.
