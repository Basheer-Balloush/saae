# Phase 3 — `/about`

**Do Phases 0–2 first.**

## The decision that shapes this phase

The prototype branch contains **two** About designs, and they are not interchangeable:

| File | Information architecture | Visual language |
|---|---|---|
| `about.html` | A different editorial concept — LEARN / RESEARCH / BUILD, "Proof lives in public", nine community fields. **Does not carry the site's existing vision / mission / goals / values copy.** | **Dark** (`#03171e`) — consistent with the rest of the new design |
| `about-v2.html` | Maps **1:1** onto the site's existing `src/lib/about-content.ts`: who-we-are, vision + mission, 5 goals, 5 fields, 5 values | **Light warm paper** (`#f2f1e6`) — inconsistent with the new dark chrome |

Neither works alone: `about.html` would throw away the organisation's approved About copy; `about-v2.html` would drop a light page into a dark site, under dark chrome.

**The build target is a hybrid:**

> **`about-v2.html`'s information architecture, rendered in `about.html`'s dark visual language, plus the nine-fields section from `about.html`, plus the board and executive team restored from the database.**

Every piece of the site's current About content survives. The page matches the rest of the new design. Nothing is invented.

---

## NON-NEGOTIABLES (full list in `docs/migration/INVARIANTS.md`)

1. **Never touch `:root`, `.dark`, or `@theme` in `src/styles.css`.** New styles scoped under `.saae-v2`, tokens prefixed `--v2-`.
2. **Do not modify** anything under `src/routes/learning-management-system*`, `attendance-management-system*`, `admin*`, `super-admin.tsx`, `api/`, `lovable/`, `src/components/{lms,ams,admin,ui}/`, `src/integrations/`, `src/lib/*.server.ts`, `supabase/migrations/`, `drizzle/`.
3. **No database changes.**
4. **`src/lib/about-content.ts` is content, not markup. Do not rewrite its Arabic or English.** Read from it. The prototype's English is a design-demo paraphrase of this same content — the file wins.
5. **Do not use `about-v2.css`'s light palette.** Map it onto the canonical dark `--v2-*` tokens using the substitution table in `reference/design-tokens.md`.
6. **SSR safety** — `window` / `document` / observers only inside `useEffect`.

## Reference

- Structure: `docs/migration/reference/prototype/about-v2.html` + `assets/css/about-v2.css`
- Visual language: `docs/migration/reference/prototype/about.html` + `assets/css/about.css`
- Token mapping: `docs/migration/reference/design-tokens.md`
- Bindings: `docs/migration/reference/data-binding-map.md`

---

## Files you may create or modify

**Modify:**
```
src/routes/about.tsx
src/styles/saae-v2.css          — add about styles
src/lib/translations.ts         — add new keys only
```

Touch nothing else. **`src/lib/about-content.ts` is read-only for this phase.**

---

## The page, section by section

Wrap in `<PageV2>`. Give the ribbon this page's own chapters.

### 01 — Hero / Who we are
- Source design: `about-v2.html` sections 00–01.
- Copy: `aboutContent[lang].hero` (title, subtitle, `backHome`).
- The prototype's cursor-reactive growing branch mark is a nice touch. Port it if it can be done cleanly with the existing `framer-motion` dependency and a `useEffect`-mounted pointer listener. If it fights SSR or costs more than it earns, ship the static mark and say so.

### 02 — One root. Two branches. (Vision + Mission)
- Source design: `about-v2.html` section 02 — the two-column fork.
- Copy: `aboutContent[lang].vision` (`eyebrow`, `body`) and `aboutContent[lang].mission` (`eyebrow`, `body`).
- The prototype's dark-band treatment for this chapter is already correct for our palette.

### 03 — Five ways the work takes root (Goals)
- Source design: `about-v2.html` section 03 — the selectable "seeds" with a panel that answers.
- Copy: `aboutContent[lang].goals` — `heading`, `intro`, and `items` (exactly 5).
- **Drive it from the array.** Do not hardcode five components. If the array ever grows, the component adapts.
- Keep the prototype's keyboard support: arrow keys move between seeds, the panel updates, the selection survives a language switch.
- Selection is React state.

### 04 — A living system of skills (Fields of work)
- Source design: `about-v2.html` section 04 — numbered branches off one stem.
- Copy: `aboutContent[lang].fields` — `heading`, `intro`, `items` (exactly 5).
- Numbering is derived from the index, not written into the strings.

### 05 — The canopy above everything we do (Values)
- Source design: `about-v2.html` section 05.
- Copy: `aboutContent[lang].values` — `heading`, `intro`, `items` (exactly 5).

### 06 — Nine fields, one shared method (Communities)
- Source design: `about.html`, the nine-field section.
- Data: `t.communities.cards` from `src/lib/translations.ts` and `COMMUNITY_KEYS` from `src/lib/communityCategories.ts`.
- Each card links to `<Link to="/communities/$key" params={{ key }} />`. Those pages exist and are **not** part of this migration — they keep their current light design. That is expected.

### 07 — Board of Directors and Executive Team — **RESTORE THIS**
Neither prototype About design has a team section. The live page has one and it must not be lost.

- Keep the existing `MembersSection` logic from `src/routes/about.tsx`: query `members`, filter `category` = `"board"` then `"executive"`, order by `display_order` ascending.
- Fields: `full_name_ar` / `full_name_en`, `position_ar` / `position_en`, `bio_ar` / `bio_en`, `photo_url`.
- Language selection follows the existing pattern in the file.
- Headings come from `aboutContent[lang].members` (`boardTitle`, `boardSubtitle`, `executiveTitle`, `executiveSubtitle`) — already bilingual.
- Keep the existing behaviour of rendering nothing when a category has no rows.
- **Restyle the cards into the new dark design.** A missing `photo_url` must render a designed initial or placeholder, never a broken image.

### 08 — Closing
- Source design: `about-v2.html` section 06.
- A closing statement and a call to action. Link it to `/one-million-initiative-home` or `/contact` — whichever the copy supports.

---

## Metadata

Keep the existing `head()` from `src/routes/about.tsx` unchanged.

## Responsive and RTL

- Correct at 360, 390, 768, 1024, 1280, 1440 px. No horizontal page scroll.
- The two-branch fork stacks below 768 without losing the vision/mission distinction.
- The goals selector is usable by touch on a phone: targets at least 44 x 44 px, and the panel is reachable without a hover state.
- The members grid: 1 column on phones, 2 on tablets, 3–4 on desktop.
- Arabic: mirrored, `letter-spacing: normal` on headings, looser line-height. The numbered fields list keeps Western numerals for the index markers unless the existing site uses Arabic-Indic — match the existing site.

## Translation keys

Add only the **new chrome** strings for this page (section eyebrows, chapter numbers, the communities section heading, the seed-selector hint) from `chrome-dictionary-ar-en.md`.

**Do not add keys that duplicate `about-content.ts`.** Vision, mission, goals, fields and values all come from that file.

---

## Acceptance criteria

- [ ] `bun run typecheck`, `bun run lint`, `bun run build` pass.
- [ ] `src/lib/about-content.ts` shows **zero** changes in the diff.
- [ ] All five goals, all five fields and all five values render, from the arrays.
- [ ] The board and executive team sections render real rows from the `members` table in both languages.
- [ ] The nine communities render and link to `/communities/$key`.
- [ ] `head()` unchanged.
- [ ] No light-paper background survives anywhere — the page ground is `--v2-canvas`.
- [ ] `git diff src/styles.css` still shows only the single Phase-0 `@import`.
- [ ] Correct in English and Arabic at 360 px and 1440 px.
- [ ] The chatbot launcher is visible.
- [ ] `/`, `/news`, `/contact`, `/partners` and the LMS are unchanged.

## Report back

Files changed, confirmation that `about-content.ts` was not edited, the member counts rendered per category, and whether the cursor-reactive hero mark shipped or was simplified.
