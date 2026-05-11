## Goal
On each community page (`/communities/:key`), the "News & Events" section should pull articles from the `news` table where `category = key`, instead of the hardcoded `DEFAULT_ACTIVITIES` / `ACTIVITIES_BY_KEY` arrays. News added in the admin will automatically appear under the matching community.

## Changes (single file: `src/routes/communities.$key.tsx`)

1. **Remove hardcoded data**
   - Delete `DEFAULT_ACTIVITIES` (lines 63–91) and `ACTIVITIES_BY_KEY` (lines 93–~230).
   - Keep the `ActivityItem` type (or adapt it to match DB rows).

2. **Fetch from Supabase inside the page component**
   - Add a `useEffect` that runs when `k` (community key) changes.
   - Query: `supabase.from("news").select("id, title, excerpt, category, published_at").eq("category", k).order("published_at", { ascending: false }).limit(10)`.
   - Store results in `useState<NewsRow[]>([])`.

3. **Map DB rows → ActivityFeed shape**
   - `date` → format `published_at` as `YYYY / MM / DD`.
   - `category` → use `communityLabel(row.category, lang)` for both `ar` and `en` (DB stores one title only — render the same string in both languages, since `news` rows aren't bilingual in the schema).
   - `title` / `desc` → use `row.title` / `row.excerpt` for both languages (same reason).
   - Make each item a `<Link to="/news/$id" params={{ id: row.id }}>` so clicking opens the detail page.

4. **Empty state**
   - If the query returns 0 rows, show a small placeholder under the section heading: `"لا توجد أخبار بعد لهذا المجتمع." / "No news yet for this community."` — no more fallback to fake hardcoded items.

5. **Loading state**
   - While fetching, render 3 skeleton rows using the same row layout (date column + title column) so layout doesn't jump.

## Technical notes
- The `news.category` column already stores values matching `COMMUNITY_KEYS` (`data`, `architecture`, `medical`, `entrepreneurship`, `research`, `software`, `economy`), so no schema or data migration is needed.
- `ActivityFeed` component signature changes slightly: items become clickable, and `category`/`title`/`desc` become plain strings instead of `{ ar, en }` objects. The visual design (Teal dividers, two-column 30/70 layout, Cairo font) stays identical.
- No changes to the database, RLS, or other routes.

## Out of scope
- Bilingual news content (DB has only one `title` / `excerpt` per row). If you later want AR/EN versions per article, that needs schema changes — say the word and I'll add it as a follow-up.
