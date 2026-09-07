# SAAE — New public interface migrated into the existing application

## 1. Executive summary

The existing app is a TanStack Start + React app on Lovable Cloud with 99 routes covering the public site, LMS, CRM, AMS, Admin, initiative and API endpoints. The uploaded package is a static, self-contained site (7 HTML pages, ~12.6k lines of HTML/CSS/JS, GSAP + ScrollTrigger, a 7.2 MB hero video, Cairo fonts, 18 MB of imagery).

Target: keep every existing backend, route, guard and data path exactly as it is, and rebuild the **public** pages (home, about, news, news detail, partners, initiative, contact, communities) as React components that reproduce the new design and read from the existing database. The static site is used as a design and behaviour reference only; it is never served as HTML.

Highest risks: the cinematic hero (750vh scroll-driven video scrub) ported to React without leaks; CSS from the new design leaking into LMS/CRM/AMS/Admin; the video weight on mobile; the second translation dictionary in `language.js` competing with the existing i18n.

Recommended order: foundation → homepage → inner pages → data → localisation → performance → accessibility → regression.

## 2. Architecture comparison

| | Existing | New package |
|---|---|---|
| Runtime | React 19, TanStack Start/Router, Vite, SSR | Static HTML served by a tiny preview server |
| Styling | Tailwind v4 tokens in `src/styles.css`, shadcn/Radix | Inline `<style>` + 5 CSS files, raw custom properties |
| Motion | CSS + light JS | GSAP 3, ScrollTrigger, custom scrub loop, IntersectionObserver reveals |
| Data | Lovable Cloud (Supabase), RLS, server functions | Hardcoded markup |
| i18n | `src/lib/i18n.tsx`, EN/AR, RTL | `assets/js/language.js`, its own EN→AR dictionary |
| Nav | `Navbar.tsx` / `Footer.tsx` | Radial nav + journey ribbon (`navigation.css`, `navigation.js`) |

## 3. Route mapping

| New page | Production route | Data source |
|---|---|---|
| index.html | `/` (`src/routes/index.tsx`) | `news` table; partners, communities, achievements as today |
| about.html | `/about` | `src/lib/about-content.ts` |
| news.html | `/news` | `news` table |
| news/*.html | `/news/$id` | `news` table (real records; the 4 static articles are reference only) |
| partners.html | new `/partners` route + home section | existing partner records / admin partners |
| initiative.html | `/one-million-initiative-home` | existing initiative functions |
| contact.html | `/contact` | existing contact submission + CRM flow |
| (none) | `/communities/$key` | existing community content |

No existing URL is removed or renamed. `about-v2.html` is **not** the production candidate: `about.html` is the page every other page links to and carries the shared navigation, while `about-v2.html` is an unlinked alternate. Its chapter rhythm can inform section styling on `/about`.

## 4. Component mapping

| New | Existing | Action |
|---|---|---|
| radial nav + ribbon | `site/Navbar.tsx` | MODIFY — new visuals, keep every destination, language/theme toggles, mobile menu |
| footer | `site/Footer.tsx` | MODIFY — new layout, keep real contact details, map, socials |
| cinematic hero | — | CREATE `site/hero/*` (`CinematicHero`, `HeroVideo`, `HeroPoster`, `HeroBand`, `JourneyRibbon`) |
| news reel | `FeaturedNews.tsx` | REPLACE presentation, keep loader data |
| partner ring | `Partners.tsx` | MODIFY |
| communities flip card | `Communities.tsx` | MODIFY |
| stats / proof | `Achievements.tsx` | MODIFY |
| mission, FAQ, closing CTA | — | CREATE |
| all forms/dialogs | existing | REUSE unchanged |

Nothing becomes one monolithic page component; each section is its own file under `src/components/site/`.

## 5. Data mapping

News → `news` table (existing loader and `/news/$id`). Partners → existing partner assets/records with admin control. Communities → `communityCategories.ts`. Counters → real values where the app already has them, otherwise the copy stays editorial text rather than a fake metric. Contact → existing submission path. Initiative → existing donation, corporate donation, waitlist and claim flows untouched.

## 6. Asset mapping

- Production: `hero-scrub.mp4`, `hero-start.webp/jpg`, tree/logo marks, the 24 partner `.webp` marks, Cairo woff2 (4 weights), `favicon.svg`, section imagery.
- Existing: current partner PNGs, logos, `location-map.png` — kept where already correct; the webp marks replace like-for-like only.
- Skipped: `review/`, `source/`, contact prototype PNGs, duplicate `hero-start.png/jpg`, Arabic TTFs (woff2 covers it), `.claude/`, run scripts, preview server.
- Large media goes through Lovable Assets (CDN pointers), not into the repository.

## 7. Dependency mapping

Existing already covers routing, data, forms, UI primitives. New: `gsap` (with ScrollTrigger) — justified for the scroll-driven hero and section chapters; no vendored minified copies. Avoided: any second router, animation library duplicate, i18n library, or carousel package.

## 8. Design-system migration

Public tokens (`petrol`, `olive`, `turquoise`, `turquoise-lift`, `canvas`, `panel`, `paper`, `accent`, `type`, `ink-muted`, `line`) are declared under a `.public-site` scope, not on `:root`, so LMS/CRM/AMS/Admin keep today's theme. Cairo 400/600/700/900 self-hosted via `<link preload>` in `__root.tsx`. Every new public class is namespaced; no global element selectors.

## 9. Homepage strategy

`PublicSiteLayout` → `CinematicHero` (sticky 750vh stage, poster first, deferred video, five narrative beats driven by scroll progress, grain/wash/vignette, journey ribbon) → mission → network → initiative → proof → communities → news reel → partner ring → FAQ → closing CTA → footer. Scroll progress is read in a rAF loop bound to the stage element and torn down on unmount; the video is seeked, never played, and coalesced to paint frames. Below 821px or under reduced motion the static hero renders instead and the video is never requested.

## 10. Inner pages

About: chapter sections over `about-content.ts`. News: new grid/reel over real records; detail pages keep IDs and routes. Partners: ring plus grid, real marks only. Initiative: new presentation, existing dialogs and server functions. Contact: new layout, existing form, validation and CRM write. Communities: new cards over existing content.

## 11. Functional preservation

No change to `src/integrations/supabase/*`, auth guards, `_authenticated`-style gates, admin route guard, server functions, RLS, migrations, email, uploads or video integration. LMS/CRM/AMS/Admin routes and components are untouched.

## 12–20. Cross-cutting strategy

- **Animation**: GSAP inside `gsap.matchMedia()` contexts created in `useLayoutEffect` and reverted on cleanup; ScrollTrigger refreshed on route change; no scroll hijacking.
- **Video**: poster paints first, video preloads `none` then loads after idle on desktop only, fails silently to the poster, removed entirely under reduced motion.
- **Localisation**: only the existing i18n; `language.js` strings are imported as translation data, its runtime is discarded. RTL mirroring for ribbon, reels and arrows.
- **Responsive**: verified at 1440×900, 1280×800, 1024, 821 boundary, 768, 390×844, 375×812.
- **Accessibility**: one H1, skip link, focus-visible states, ribbon keyboard + Escape + focus restore, alt text, ARIA on carousels, contrast checked on dark grounds.
- **SEO**: per-route `head()` with title, description, canonical, OG/Twitter; sitemap route updated for `/partners`.
- **Performance**: CDN assets, responsive images, lazy sections, font preload, code-split hero.
- **Security**: unchanged — presentation layer only.

## 21. Risk register (ranked)

1. Supabase/auth/LMS regression — critical: no backend files touched; regression pass at the end.
2. CSS leakage into internal apps — high: scoped tokens and namespaced classes.
3. Hero scroll/GSAP lifecycle leaks — high: scoped contexts, explicit teardown.
4. Video payload on mobile — high: never requested below 821px.
5. Route breakage — high: existing paths preserved; `/partners` is additive.
6. RTL breakage in new motion components — medium.
7. Dependency bloat — medium: gsap only.

## 22. Testing plan

Typecheck, lint, unit tests, production build; browser passes at the listed viewports in EN and AR; reduced-motion and video-blocked runs; smoke of login, LMS catalog/course/enrollment, admin dashboard, CRM lists, AMS, initiative dialogs and contact submission.

## 23. Definition of done

Every public page matches the new design at the four reference viewports in both languages; all dynamic content comes from existing tables; no internal surface changes visually or functionally; build, typecheck, lint and tests pass; no console errors; reduced-motion and no-video paths render correctly.

## 24. File modification plan

- **Will change**: `src/routes/index.tsx`, `about.tsx`, `news.index.tsx`, `news.$id.tsx`, `contact.tsx`, `one-million-initiative-home.tsx`, `communities.$key.tsx`, `__root.tsx` (fonts), `src/styles.css` (scoped public block), `src/lib/i18n.tsx` (new strings), most of `src/components/site/*`, new `src/routes/partners.tsx`, new asset pointers.
- **May change**: `sitemap[.]xml.ts`, `src/lib/about-content.ts`, `communityCategories.ts`, `package.json` (gsap).
- **Must not change**: everything under `src/integrations/`, `supabase/`, all `admin.*`, `learning-management-system.*`, `attendance-management-system.*`, `api/`, `lovable/` routes, `src/components/lms/*`, `src/components/admin/*`, `src/components/ams/*`, all `*.functions.ts` / `*.server.ts`.

## 25. Ambiguity register

1. Homepage stats (5,000+ trainees, 120+ courses, 30+ partners, 7+ communities) — use live counts from the database, or keep them as fixed editorial figures?
2. Partner ring shows 24 marks including some not in the current partner set — add the new marks as real partner records, or show only partners already in the system?
3. The four static news articles — reference only, or should their content be added as real news records?
4. `/partners` as a new public page: confirm it should exist alongside the homepage partner section.

Implementation stops here until this plan is approved.
