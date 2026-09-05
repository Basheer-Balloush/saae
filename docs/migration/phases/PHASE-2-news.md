# Phase 2 — `/news` and `/news/$id`

**Do Phases 0 and 1 first.**

This is the phase where the prototype is most misleading. It contains **four hand-built article pages** with bespoke layouts (`news/tv-interview.html`, `news/initiative-launch.html`, `news/trainers-graduation.html`, `news/buildex-aleppo.html`). Those four are **not** four pages to port. They are four screenshots of what **one** database-driven template should look like.

The live site has a `news` table with an unbounded number of rows, all bilingual, each with a gallery and videos. Anything hardcoded here breaks the moment the client publishes article number five.

---

## NON-NEGOTIABLES (full list in `docs/migration/INVARIANTS.md`)

1. **Never touch `:root`, `.dark`, or `@theme` in `src/styles.css`.** New styles scoped under `.saae-v2`, tokens prefixed `--v2-`.
2. **Do not modify** anything under `src/routes/learning-management-system*`, `attendance-management-system*`, `admin*`, `super-admin.tsx`, `api/`, `lovable/`, `src/components/{lms,ams,admin,ui}/`, `src/integrations/`, `src/lib/*.server.ts`, `supabase/migrations/`, `drizzle/`.
3. **No database changes.** No new columns, no slug column, no migrations, no edits to `types.ts`.
4. **URLs do not change.** Articles stay at `/news/$id` with the current UUIDs. The prototype's `tv-interview.html`-style slugs would require a schema column and an admin change, and would break every link already shared publicly.
5. **Never hardcode an article.** Not its headline, not its body, not its images, not its date. All of it comes from Supabase.
6. **Ignore `reference/prototype/assets/js/news-language.js` entirely.** It carries hand-written Arabic for those four articles. Article Arabic lives in `news.content_ar` / `news.title_ar` / `news.excerpt_ar`.
7. **SSR safety** — `window` / `document` / observers only inside `useEffect`.

## Reference

- Index design: `docs/migration/reference/prototype/news.html`
- Article design: `docs/migration/reference/prototype/news/*.html` — read all four, extract the **common** structure
- Bindings: `docs/migration/reference/data-binding-map.md`
- Tokens: `docs/migration/reference/design-tokens.md`

---

## Files you may create or modify

**Modify:**
```
src/routes/news.index.tsx
src/routes/news.$id.tsx
src/styles/saae-v2.css          — add news styles
src/lib/translations.ts         — add new keys only
```

**Create (optional, if it keeps the routes readable):**
```
src/components/site-v2/NewsCard.tsx
src/components/site-v2/ArticleBody.tsx
```

Touch nothing else. **Do not modify `src/components/site/FeaturedNews.tsx`** — that is the home-page reel and it belongs to Phase 6.

---

## Part A — `/news` (index)

### Keep

- The existing `loader` exactly as it is. It already fetches every column the new design needs.
- The existing `head()` block **byte-for-byte**. The prototype has no metadata; do not lose the current title, description, `og:*` or canonical.

### Change

Replace the page body with the design from `reference/prototype/news.html`, wrapped in `<PageV2>`.

Bind each card:

| Prototype | Bind to |
|---|---|
| card headline | `pickLang(title_ar, title_en, title, lang)` |
| card excerpt | `pickLang(excerpt_ar, excerpt_en, excerpt, lang)` |
| card image | `image_url` |
| card tag ("Broadcast", "Initiative", "Training", "Applied work") | `categories[]`, falling back to `category`, rendered through `communityLabel()` from `src/lib/communityCategories.ts` |
| card date | `published_at`, formatted per language |
| card link | `<Link to="/news/$id" params={{ id: row.id }} />` |

`pickLang` and the date formatter already exist in the current route — reuse them, do not rewrite them.

### Requirements

- The grid renders **all** rows from the loader, in `published_at` descending. Do not slice to four.
- If a row has no `image_url`, render a designed placeholder — never a broken image.
- If there are no rows, render the header and a bilingual empty-state line.
- The layout must hold at 4 articles and at 60. Verify the second case by reasoning about the CSS, not by assuming.

## Part B — `/news/$id` (article)

### Keep

- The existing `loader` (article query + related-articles query).
- The existing `head({ params, loaderData })` block, which builds per-article `title`, `description`, `og:*` and canonical from the loaded row. **This is important for sharing and search — do not simplify it away.**
- The `STATIC_ARTICLE` fallback for non-UUID ids.
- The existing not-found branch.

### Change

Distil **one** template from the four prototype articles. Read all four and take what they share:

1. **Header** — tags, headline, date, optional lead.
2. **Media** — a hero image and a gallery. The live source is `image_url` + `images[]`, deduplicated. The existing route already builds `carouselImages` and uses the shadcn `Carousel` with RTL support — **keep that logic**, restyle its shell.
3. **Body** — `pickLang(content_ar, content_en, content, lang)`. This is **plain text**. Split on blank lines into paragraphs. Do not use `dangerouslySetInnerHTML`; the content is not sanitised HTML and injecting it would be an XSS hole.
4. **Video** — `videos[]`, rendered only when non-empty.
5. **Related** — the existing related query, restyled as cards.
6. **Back to news** — a `<Link to="/news">` with a direction-aware arrow (the route already picks `ArrowLeft` / `ArrowRight` from `dir` — keep it).

### What to drop from the prototype articles

The four pages contain per-article editorial furniture: pull-quotes, bespoke captions, hand-placed figure grids, article-specific section headings. **None of it can be reproduced from the database.** Design the single template so it reads well with only what the schema provides, and looks deliberate — not like a page missing its decorations.

If you believe a specific piece of furniture is worth keeping, say so in your report. **Do not add a database column for it.**

### Requirements

- Every article renders correctly with: no images, one image, many images, no video, several videos, a short body, a very long body.
- Long Arabic body text stays readable: comfortable measure (around 65–75 characters), generous line-height, `letter-spacing: normal`.
- Images: `loading="lazy"` below the fold, explicit dimensions, no layout shift.

---

## Responsive and RTL (both pages)

- Correct at 360, 390, 768, 1024, 1280, 1440 px. No horizontal page scroll.
- The card grid drops to one column below 768.
- The carousel is swipeable on touch and keyboard-navigable.
- Arabic: mirrored layout, mirrored arrows, `letter-spacing: normal` on headings, looser line-height.
- Dates format per language.

## Translation keys

Add the news chrome strings (section eyebrow, index heading and intro, "Read the story", "Related news", empty state, "Back to news") to `translations.ts` under both `en` and `ar` from `chrome-dictionary-ar-en.md`.

**The rows marked BLOCKED in that file are article headlines and excerpts. Never add them as keys.** They come from the database.

---

## Acceptance criteria

- [ ] `bun run typecheck`, `bun run lint`, `bun run build` pass.
- [ ] `/news` lists **every** article from Supabase, newest first, bilingual.
- [ ] `/news/$id` renders any article from one template. Verified against at least three different rows with different image counts.
- [ ] `grep` the diff: no article headline, excerpt, body or image filename from the prototype appears anywhere in the source.
- [ ] Article URLs are unchanged — existing `/news/<uuid>` links still resolve.
- [ ] `head()` on both routes is unchanged, including the per-article dynamic metadata.
- [ ] No `dangerouslySetInnerHTML` was introduced.
- [ ] `git diff src/styles.css` still shows only the single Phase-0 `@import`.
- [ ] Correct in English and Arabic at 360 px and 1440 px.
- [ ] The chatbot launcher is visible.
- [ ] `/`, `/about`, `/contact`, `/partners` and the LMS are unchanged.

## Report back

Files changed, the fields bound, how many articles you tested against, and any prototype article furniture you dropped and why.
