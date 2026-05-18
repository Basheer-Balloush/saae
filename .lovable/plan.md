## Goal
Rename the `medical` community across the site to "Healthcare Community" (EN) and "مجتمع الرعاية الصحية" (AR). The internal key `medical` stays the same to preserve URLs and the news category mapping.

## Changes

1. **`src/lib/communityCategories.ts`**
   - `COMMUNITY_LABELS_AR.medical`: `"المجتمع الطبي والذكاء الاصطناعي"` → `"مجتمع الرعاية الصحية"`
   - `COMMUNITY_LABELS_EN.medical`: `"Medical & AI Community"` → `"Healthcare Community"`

2. **`src/lib/translations.ts`**
   - EN `communities.cards.medical.title`: → `"Healthcare Community"`
   - AR `communities.cards.medical.title`: → `"مجتمع الرعاية الصحية"`
   - Descriptions kept as-is (still accurate: digital transformation in the Syrian health sector).

3. **`src/routes/communities.$key.tsx`**
   - No code changes required — labels come from `COMMUNITY_LABELS_*` and translations. Mission/details text already speaks about healthcare and remains accurate.

## Out of scope
- URL slug `/communities/medical` stays unchanged (no broken links, no routing churn).
- News rows tagged with `category = "medical"` continue to map to this community.
