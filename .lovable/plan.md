## Source of truth

The news-category labels live in `src/lib/communityCategories.ts`. The extra (news-only) category we need to rename is keyed by `"society"` in `EXTRA_NEWS_CATEGORY_KEYS`, with display labels in `EXTRA_LABELS_AR` / `EXTRA_LABELS_EN`. Everything in the admin dashboard (Create News / Edit News category selector) and public news pages renders these labels through `communityLabel(key, lang)`. No enum, DB column, or slug uses `"society"` as a stored value beyond the free-text `news.category` / `news.categories` rows already saved.

The only other `Society` / `المجتمع` matches in the repo are unrelated prose (about-content, initiative copy, communities page, and the admin form field label "المجتمع (التصنيف)" which means "Community (Category)" — the form field for the category selector, not the "society" value). Those stay untouched.

## Change

Rename the display labels only. Keep the internal key `"society"` so existing news rows with `category = 'society'` (or `'society'` inside `categories[]`) automatically render as the new label.

In `src/lib/communityCategories.ts`:

```ts
const EXTRA_LABELS_AR: Record<...> = {
  society: "عام",
};
const EXTRA_LABELS_EN: Record<...> = {
  society: "General",
};
```

That's the whole code change. Because `communityLabel()` is the single label resolver used by:
- Admin create/edit category selector (`src/routes/admin.index.tsx`)
- News list (`src/routes/news.index.tsx`)
- News detail (`src/routes/news.$id.tsx`)
- Community pages

…the rename automatically flows to every surface in both Arabic and English, and existing articles keep their `society` association.

## Not changing

- Internal key / slug `society` (no data migration needed; historical articles keep their association).
- Order of categories in `NEWS_CATEGORY_KEYS`.
- Any other category label.
- Unrelated "Society"/"المجتمع" prose in about-content, initiative, or communities pages.
- The admin form field label "المجتمع (التصنيف)" (means "Community (Category)" — a field label, not the category value).
- Public routing (no URL uses the label; community pages use the `COMMUNITY_KEYS`, not `society`).

## Verification

- `bun run build` passes.
- Manually confirm in the admin news dialog that the selector shows "General" (EN) / "عام" (AR) and that saving/loading an article previously tagged `society` still shows it under the new label.

## Risks

None expected — pure label rename behind a single resolver function.
