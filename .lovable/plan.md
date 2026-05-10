
## SAAE — Bilingual Editorial Landing Page

A premium, institutional, light-mode-first landing page for the Syrian Association for AI & Entrepreneurship, strictly following the SAAE brand kit. Editorial tone (Apple Education / Stripe / modern university), with bilingual EN/AR support and full RTL.

---

### Brand & design system

Set up in `src/styles.css` as semantic oklch tokens:

- `--primary` — Teal Blue `#048090`
- `--secondary` — Asparagus Green `#698F3F`
- `--foreground` / dark surface — Jet Black `#2E2E2E`
- `--background` — white; `--muted` very soft warm gray
- Subtle teal→green gradient token, used sparingly (one accent only)
- Soft shadow tokens, restrained radii, generous spacing scale
- Dark mode variants (Jet Black surface, white text, muted teal accents) — secondary theme only

Typography:
- **Cairo** (400/600/700/900) — primary for AR + EN, headings, body, UI
- **Evanston Tavern 1919** — display font, used only on hero-style statements
- Load via Google Fonts (Cairo). Evanston Tavern 1919 is not on Google Fonts — fall back to a tasteful display alternative (e.g. Fraunces or DM Serif Display) styled to match the editorial all-caps usage, with a code comment noting the substitution so the user can drop in the licensed font file later.

Imagery: realistic photography of students, workshops, collaboration. Use a small set of curated Unsplash photos themed around education, mentorship, classrooms, lab work, Middle-Eastern youth. No robots, no holograms.

Logo: copy the uploaded logo into `src/assets/saae-logo.png` and import via ES module.

### Bilingual + RTL architecture

- Lightweight `LanguageProvider` (React context) in `src/lib/i18n.tsx`
  - `lang: 'en' | 'ar'`, persisted in `localStorage`
  - Sets `document.documentElement.lang` and `dir` (`rtl` for AR)
  - Exposes `t(key)` against a single `translations` dictionary keyed `en`/`ar`
- All copy lives in one `src/lib/translations.ts` file
- Tailwind layout uses logical properties / flex so RTL flips automatically; a few `rtl:` variants where needed
- Language switcher in the navbar toggles state and HTML `dir`

### Routes (TanStack Start)

Single-page landing in `src/routes/index.tsx`, since the brief is a landing page composed of homepage sections. Each section becomes its own component:

```
src/components/site/
  Navbar.tsx
  FeaturedNews.tsx       (Section 2 — first/main, editorial news layout)
  Communities.tsx        (Section 3)
  Achievements.tsx       (Section 4 — split layout)
  Partners.tsx           (Section 5 — marquee)
  Footer.tsx             (Section 6 — 4 columns)
  LanguageSwitcher.tsx
  ThemeToggle.tsx
```

Root route (`__root.tsx`) wraps `<Outlet />` with `LanguageProvider` + `ThemeProvider` and sets SEO meta (title, description, og:title, og:description, og:image using a chosen hero photo). Cairo + display font preloaded via `<link>` tags in `head()`.

### Section breakdown

**Navbar** — sticky, transparent on top; on scroll adds soft white glass (backdrop-blur + thin border + subtle shadow). Left: SAAE logo + wordmark. Center: Home / News / Communities / Achievements / Partners / About / Contact (in-page anchors). Right: EN/AR switch, light/dark toggle, primary "Join the Movement" button (teal). Mobile: clean slide-in sheet.

**Featured News & Recent Activities** (first section, no marketing hero):
- Editorial layout: one large featured article (60% width, large cover image, category chip, title in Cairo Bold, short dek, date, CTA) + 3 smaller cards stacked beside it (40%).
- Below grid: 4 additional recent activity cards.
- "View All News & Activities" centered ghost button (teal border).
- Mock content for 8 items (workshops, partnerships, hackathons) in both languages.

**Communities** — section heading "Communities Building Syria's Digital Future" + supporting paragraph. 3×2 grid of 6 cards: Women in AI, HealthTech, Digital Education, AI Research, Entrepreneurship, Robotics. Each: lucide icon (teal), title, 2-line description, subtle border + soft shadow, gentle hover lift + border-teal transition. Centered "Discover Communities" CTA.

**Achievements** — two-column split:
- Left: large editorial statement "Building Syria's AI Future Line by Line." (display font), supporting paragraph.
- Right: 5 stat cards in an asymmetric layout (e.g. 2 + 2 + 1) — minimal cards with stat number in Cairo Black + teal underline accent, label below. Numbers: 5,000+ Learners, 120+ Courses, 30+ Strategic Partners, 15+ Communities, 50+ Workshops.

**Partners** — heading "Trusted By Institutions Driving Innovation". Continuous marquee of 8–10 placeholder partner wordmarks (simple text-based logos in muted gray, full brand color on hover). Pause on hover.

**Footer** — light institutional variant (soft off-white surface, jet-black text, restrained teal accents) per brand kit's preference for light mode:
- Col 1: logo + mission statement + social icons (Instagram, X, LinkedIn, YouTube)
- Col 2: Quick links list
- Col 3: Compact contact form (Name / Email / Message / Send — client-side only, shows success toast)
- Col 4: HQ card — "Damascus — near Ministry of Higher Education and Scientific Research", phone +963 930 763 547, email info@aisyria.org, small static map image, "Visit Us" button linking to Google Maps
- Bottom bar: © 2025 SAAE · made in Damascus

### Motion

- Framer Motion already common; use sparingly: fade-up on section enter, gentle card hover lift, navbar transparency transition.
- Reduced-motion respected via `prefers-reduced-motion`.

### SEO

- `head()` in root + index with bilingual-aware title/description (defaults to EN), og:image set to chosen featured editorial photo.
- Single H1 ("Building Syria's AI Future Line by Line." inside Achievements, or alternatively a visually-hidden H1 at top — to be decided during implementation to avoid double-H1).
- Semantic `<header>`, `<main>`, `<section>`, `<footer>`, alt text on all images.

### Technical notes

- New deps: `framer-motion` (animation), `lucide-react` (already present via shadcn). No backend; everything static.
- Files created/edited:
  - `src/styles.css` — brand tokens, font imports
  - `src/routes/__root.tsx` — providers, fonts, meta
  - `src/routes/index.tsx` — composes section components
  - `src/lib/i18n.tsx`, `src/lib/translations.ts`, `src/lib/theme.tsx`
  - `src/components/site/*` — listed above
  - `src/assets/saae-logo.png` — copied from upload
- All colors via semantic tokens — no hex in components.
- Build is verified after implementation; placeholder index removed.

### Out of scope (can follow in later turns)
- Real CMS-backed news, real contact-form submission, separate `/news`, `/about`, `/contact` routes (currently anchor sections per the "landing page" brief — I'll flag this and can split into routes if you prefer for SEO).
