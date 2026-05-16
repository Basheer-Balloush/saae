# Plan

## 1. Header simplification
Edit `src/components/site/Navbar.tsx`:
- Replace `sections` array with: `home`, `about`, `news`, `contact` (in that order).
- Remove `communities`, `achievements`, `partners` items from desktop + mobile nav.
- Keep existing logo + theme/lang toggles.
- `contact` link will scroll to the new footer/contact area (`#contact` anchor on the Footer).

## 2. Home page reorder + remove Assistant section
Edit `src/routes/index.tsx`:
- New order inside `<main>`: `FeaturedNews` (hero) → `Partners` → `Achievements` → `Communities` → (Footer).
- Remove `<Assistant />` import + render.
- Keep `AssistantFab` mounted globally (already in root) so the chat popup remains available.

## 3. Assistant FAB greeting bubble
Edit `src/components/site/AssistantFab.tsx`:
- Add a small chat-bubble tooltip next to the FAB on first appearance: "Need help? Talk with me 👋" / "بحاجة لمساعدة؟ تحدّث معي 👋".
- Auto-show after a short delay (e.g. 2.5s), auto-hide after 8s, and hide when user opens the chat.
- Dismissible via a tiny ✕ button; remember dismissal in `localStorage` so it doesn't keep nagging.
- Add the two strings to `src/lib/translations.ts` under `assistant.greeting`.

## 4. About page: Board of Directors + Executive Members
Database (migration):
- New table `public.members` with columns: `id uuid pk`, `category text check in ('board','executive')`, `full_name text`, `position text`, `bio text`, `photo_url text nullable`, `display_order int default 0`, `created_at`, `updated_at`.
- RLS: public SELECT (read); INSERT/UPDATE/DELETE only when `has_role(auth.uid(),'admin')`.
- Reuse `news-images` storage bucket for member photos (already public).

About page (`src/routes/about.tsx`):
- Add two new sections rendered after `Values`: **Board of Directors** and **Executive Members**, each a responsive grid of cards showing photo, name, position, bio.
- Fetch from `members` table filtered by `category`, ordered by `display_order`.

Admin dashboard (`src/routes/admin.index.tsx`):
- Add a "Members" management panel (tabs: News | Members) with list + create/edit/delete form for each member (name, position, bio, category select, photo upload, display order).

## 5. News scroll restoration from hero
- In `FeaturedNews.tsx`, when a card is clicked, save `{ id, scrollLeft }` of the marquee row to `sessionStorage` under `news-marquee-pos`.
- On mount, if a saved position exists, pause the marquee animation and set the row's `transform: translateX(...)` so the clicked card appears in view, then resume animation from there (or leave paused briefly and resume on hover/timer).
- Implementation detail: switch the marquee from pure CSS animation to a CSS animation with `animation-delay` computed from saved offset, OR convert to a JS-driven `requestAnimationFrame` translate so we can resume from arbitrary offset. Use the latter for accuracy.

## Files touched
- `src/components/site/Navbar.tsx`
- `src/routes/index.tsx`
- `src/components/site/AssistantFab.tsx`
- `src/lib/translations.ts`
- `src/routes/about.tsx`
- `src/routes/admin.index.tsx`
- `src/components/site/FeaturedNews.tsx`
- New DB migration: create `members` table + RLS.

## Notes / confirmation
- "Contact" in the header will scroll to the existing footer section (renamed/anchored as `#contact`). If you want a separate `/contact` page instead, let me know.
- Members admin will live inside the existing `/admin` dashboard behind admin auth.
- News scroll restore only applies when the user navigates back from a news detail page in the same tab/session.

Approve and I'll implement.
