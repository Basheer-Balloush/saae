# Event Story Sharing Campaign — Phased Plan

Goal: one short guided path — account choice → sign in/up → two-option screen → campaign page with ready-made Story image → Add to Your Story. Bilingual (AR RTL / EN LTR), mobile-first, configurable, no extra forms.

## Phase 0 — Campaign configuration foundation (DB only)
- New table `lms_story_campaigns`: slug, active, starts_at, ends_at, title_ar/en, story_image_url, instagram_handle, course_ref (id or slug), post_share_destination, allow_download fallback flag.
- Public read limited to the currently active campaign; admin-only writes; GRANTs + RLS.
- Seed the 31 July 2026 event row (artwork URL filled in Phase 3).
- No UI change yet.

## Phase 1 — Campaign entry + auth continuity
- Route `/learning-management-system/campaign` (Screen A: "Do you have an account?" → Yes/No).
- Yes → LMS login, No → LMS signup, both carrying a validated internal `redirect` back to the campaign.
- Reuse `safeLmsRedirect`; reject external URLs. SAAE logo on screen.

## Phase 2 — Two-option choice screen
- After auth, land directly on the choice screen (never the public home page).
- Two cards: "Explore the Platform" and "Get the Generative AI Course for Free" (visually dominant).
- Bilingual labels through the existing translation system.

## Phase 3 — Campaign page + artwork
- Page shows only the vertical 1080×1920 Story image and one button below it.
- Artwork hosted as a real downloadable file (asset/storage URL), not a CSS background.
- Vertical ratio preserved on mobile and desktop.

## Phase 4 — Add to Your Story behavior
- `navigator.share` with the image as a File where supported.
- Fallback: save image + one clear "Open Instagram" action; friendly message only when sharing is unavailable.
- No technical errors surfaced.

## Phase 5 — Course access after sharing
- Route the user to the campaign's course-access destination per the approved enrollment rule (free grant for the configured Generative AI course).
- Idempotent; no screenshot verification step.

## Phase 6 — Admin configuration screen
- Admin LMS panel to edit campaign fields (active window, titles, artwork, handle, course, destination).

## Phase 7 — QA and release gate (done)
- Verify AR/EN, redirect survival, real file share, fallback, no private data, existing LMS behavior unchanged. Device testing on iPhone + Android with Instagram, plus Safari/Chrome without it.


### Phase 7 QA results (29 Jul 2026)
- Typecheck, campaign-file lint, production build: pass.
- Anonymous `/campaign` and `/campaign/choice` gate correctly; `/campaign/story` now also gates (fixed during QA) and returns to the Story step after auth.
- Redirect chain stays internal through login/signup (`safeLmsRedirect`).
- AR RTL and EN LTR verified on entry, choice, and story screens.
- Admin campaign page denies anonymous access; `lms_claim_story_campaign` has no anon EXECUTE and handles missing/unpublished course gracefully.
- Open item: campaign row has no `course_ref` set yet — set the Generative AI course in the admin Story campaign page before the event.
