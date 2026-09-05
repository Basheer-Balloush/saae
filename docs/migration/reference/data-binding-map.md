# Data Binding Map

Every hardcoded block in the prototype, and the live source it must be bound to.
**This table is the migration.** The CSS is the easy half.

---

## Home (`/` — prototype `index.html`)

| Prototype block | Live source | Notes |
|---|---|---|
| News reel, 4 hardcoded slides | `supabase.from("news")` where `show_on_home = true`, order `published_at desc`, `created_at desc`, limit 8 | Already loaded by the existing `loader` in `src/routes/index.tsx`. Keep the loader; restyle `FeaturedNews`. |
| News card image | `news.image_url` | Prototype's `event-*.jpg` are placeholders. Do not ship them. |
| News card tag ("Broadcast", "Initiative"…) | `news.categories[]` / `news.category` via `communityLabel()` in `src/lib/communityCategories.ts` | |
| News card link `news/tv-interview.html` | `<Link to="/news/$id" params={{ id: row.id }} />` | |
| Partner logo wall, 23 hardcoded `.webp` | `supabase.from("partners")` where `show_on_home = true`, order `display_order asc` | Existing `Partners.tsx` already does this, including the `resolveLogo()` shim for legacy `/src/assets/...` rows. Keep that shim. |
| Hero stat band — 5,000+ / 120+ / 30+ / 7+ | `translations.ts` → `t.achievements.stats` | Bilingual already. Do not hardcode the numerals. |
| Community flip card, 9 cards | `translations.ts` → `t.communities.cards` + `COMMUNITY_KEYS` in `src/lib/communityCategories.ts` | Each card links to `/communities/$key`. |
| Mission reel — TRAIN / APPLY / BUILD | New chrome copy. Add as new keys in `translations.ts`. | Arabic in `chrome-dictionary-ar-en.md`. |
| FAQ accordion (5 items) | New chrome copy. New keys in `translations.ts`. | |
| Footer "Official site" column linking to `https://aisyria.org/...` | Internal `<Link>` — we **are** the official site now | See "Footer link rewrites" below. |
| *(missing from prototype)* | `LmsCta` — the learning-platform call to action | **Must be reinstated.** See Phase 6. |

## About (`/about` — prototype `about-v2.html` + `about.html`)

| Prototype block | Live source |
|---|---|
| "A community built around possibility" | `aboutContent[lang].hero` |
| "One root. Two branches." — vision / mission | `aboutContent[lang].vision` and `.mission` |
| "Five ways the work takes root" — 5 seeds | `aboutContent[lang].goals.items` (exactly 5) |
| "A living system of skills" — 5 branches | `aboutContent[lang].fields.items` (exactly 5) |
| "The canopy above everything we do" — 5 values | `aboutContent[lang].values.items` (exactly 5) |
| "Nine fields, one shared method" (from `about.html`) | `t.communities.cards` + `COMMUNITY_KEYS` |
| *(missing from prototype)* | `supabase.from("members")` — board + executive. **Must be reinstated.** |

## News index (`/news` — prototype `news.html`)

| Prototype block | Live source |
|---|---|
| 4 hardcoded article cards | `supabase.from("news")` full list, order `published_at desc` — existing loader in `src/routes/news.index.tsx` |
| Card title | `pickLang(title_ar, title_en, title, lang)` |
| Card excerpt | `pickLang(excerpt_ar, excerpt_en, excerpt, lang)` |
| Card tag | `categories[]` via `communityLabel()` |

## News article (`/news/$id` — prototype `news/*.html`)

The prototype has **four bespoke, hand-laid-out article pages**. They collapse into **one** template.

| Prototype element | Live source |
|---|---|
| Headline | `pickLang(title_ar, title_en, title, lang)` |
| Body | `pickLang(content_ar, content_en, content, lang)` — plain text, split on blank lines into paragraphs |
| Hero + gallery images | `image_url` + `images[]`, deduplicated, in the existing `Carousel` |
| Embedded video | `videos[]` |
| Tags | `categories[]` via `communityLabel()` |
| Date | `published_at`, formatted per language |
| Related articles | existing second query in the route loader |

**URLs stay `/news/$id` with the current UUIDs.** Do not introduce slugs — that would need a schema column and an admin change, and would break every link already shared.

Keep the existing `STATIC_ARTICLE` fallback for non-UUID ids.

## Partners (`/partners` — prototype `partners.html`) — NEW ROUTE

| Prototype block | Live source |
|---|---|
| 23 hardcoded logos | `supabase.from("partners")`, **no** `show_on_home` filter, order `display_order asc` |
| Logo image | `logo_url`, with `logo_light_url` as the alternate for dark grounds |
| Sizing | `size_class` |

**Note for the client, not for the build:** the prototype carries 23 partner marks; the database currently seeds 20. The three that appear only in the prototype (`partner-engineers`, `partner-med-axis`, `partner-sharafai`, plus `partner-social-affairs` which may duplicate the existing `partner-mosal` row) are supplied in `assets-to-upload/optional-partner-logos/`. **Add them through the existing admin Partners screen — not in code.**

## Contact (`/contact` — prototype `contact.html`)

| Prototype field | Live column in `contact_messages` |
|---|---|
| `name` | `full_name` — required, 2–100 chars |
| `email` | `email` — required, valid email, max 255 |
| `phone` | `phone` — optional, max 30, nullable |
| `context` | `organization` — optional, max 150, nullable |
| *(no field in prototype)* | `inquiry_type` — **required enum.** Add a styled select. Options: `general`, `individual`, `company`, `partnership`, `training`, `media`, `other`. Labels already exist bilingually in `src/routes/contact.tsx` (`inquiryLabels`). |
| `subject` | `subject` — required, 2–200 |
| `message` | `message` — required, 5–2000 |

Keep the existing `zod` schema and the existing `supabase.from("contact_messages").insert(...)` call unchanged. Only the presentation changes.

Direct-line values (email, phone, headquarters) come from the existing route, not from the prototype's copy.

## Initiative (`/one-million-initiative-home` — prototype `initiative.html`)

| Prototype block | Live source |
|---|---|
| Progress dial / counters | `getInitiativeStats()` from `src/lib/initiative.functions.ts`, via `useServerFn` |
| Goal + configuration figures | `getInitiativeSettings()` |
| Sponsor / donor lists | `getTopDonors()` — companies and individuals |
| Path card 1 — "Pay & start" | Opens the existing **`DirectPaymentDialog`** (`src/components/initiative/DirectPaymentDialog.tsx`) |
| Path card 2 — "Join the waitlist" | Opens the existing **`WaitlistDialog`** |
| Path card 3 — "Sponsor seats" | Opens the existing **`CorporateDonationDialog`** |
| Prototype's own `#pay-modal` stub | **Delete it.** It collects a name and email and does nothing. The real dialogs are wired to server functions. |
| External `href="https://aisyria.org/one-million-initiative-home"` on all three cards | Replace with `onClick` handlers that open the dialogs above |

`FlipCard` (`src/components/initiative/FlipCard.tsx`) already exists and can be restyled rather than replaced.

---

## Footer link rewrites

The prototype's footer "Official site" column links outward to `https://aisyria.org/...` because the prototype was a separate deployment. **In the app, every one of these becomes an internal route link.** Leaving them as external anchors would send visitors on a full page reload back into the same site.

| Prototype href | Becomes |
|---|---|
| `https://aisyria.org/#communities` | `<Link to="/" hash="communities">` |
| `https://aisyria.org/#achievements` | `<Link to="/" hash="achievements">` |
| `https://aisyria.org/learning-management-system` | `<Link to="/learning-management-system">` |
| `https://aisyria.org/resources/ai-tools` | `<Link to="/resources/ai-tools">` |
| `https://aisyria.org/one-million-initiative-home` | `<Link to="/one-million-initiative-home">` |
| `https://aisyria.org/registration` | `<Link to="/registration">` |
| `index.html`, `about.html`, `news.html`, `partners.html`, `initiative.html`, `contact.html` | `/`, `/about`, `/news`, `/partners`, `/one-million-initiative-home`, `/contact` |

Social links, the maps link, `mailto:` and `tel:` stay external and keep `target="_blank" rel="noopener noreferrer"`.

---

## Known gaps to raise, not to silently paper over

1. **`LmsCta` has no home in the new design.** The prototype only links the learning platform from the footer. Phase 6 reinstates it as a designed section.
2. **`inquiry_type`** has no field in the prototype form. Phase 4 adds a select.
3. **Board and executive members** are absent from both prototype About designs. Phase 3 reinstates the section.
4. **Language default mismatch (pre-existing).** `src/lib/i18n.tsx` defaults to `"ar"`; the inline bootstrap script in `__root.tsx` (`RootShell`) defaults to `'en'`. On a first visit these disagree for one frame. This predates the migration but the new pages' language-transition animation will make it more visible. Fix it in Phase 0 by making both default to the same language.
