
## Align typography to the SAAE brand kit

Goal: drop the substitute display serif (Fraunces) and rebuild the site's type system around the brand-kit hierarchy using **Cairo only** — exactly as the brand kit's "Display 2" allows.

### Font stack

- **Primary & display: Cairo** — weights 400 / 600 / 700 / 900 (Latin + Arabic)
- **Remove** Fraunces import and the `--font-display` Fraunces fallback
- **`.font-display`** utility now resolves to Cairo Black (900), tight tracking, optical refinements (`text-balance`, `-webkit-font-smoothing`)
- Update `<head>` font preconnect/preload accordingly

### Type scale (matches brand kit, fluid for web)

Defined as CSS custom properties in `src/styles.css` and exposed as Tailwind utility classes via `@theme inline` (`text-display-1`, `text-display-2`, `text-h1`, `text-h2`, `text-h3`, `text-body`, `text-small`, `text-caption`).

| Token | Brand-kit role | Family / weight | Web size (mobile → desktop) | Tracking / leading |
|---|---|---|---|---|
| `text-display-1` | Display 1 (hero) | Cairo 900 | clamp(2.75rem, 6vw, 5.25rem) ≈ 44 → 84px | -0.03em / 1.02 |
| `text-display-2` | Display 2 | Cairo 900 | clamp(2.25rem, 4.5vw, 4rem) ≈ 36 → 64px | -0.025em / 1.05 |
| `text-h1` | Primary heading | Cairo 700 | clamp(2rem, 3.6vw, 3.25rem) ≈ 32 → 52px | -0.02em / 1.1 |
| `text-h2` | Secondary heading (46px) | Cairo 700 | clamp(1.75rem, 2.8vw, 2.875rem) ≈ 28 → 46px | -0.015em / 1.15 |
| `text-h3` | Tertiary heading (28px) | Cairo 600 | clamp(1.25rem, 1.6vw, 1.75rem) ≈ 20 → 28px | -0.01em / 1.25 |
| `text-body` | Body | Cairo 400 (700 for emphasis) | 1rem–1.0625rem ≈ 16–17px | 0 / 1.65 |
| `text-small` | Bullets / lists | Cairo 600 | 1.125rem–1.25rem ≈ 18–20px | 0 / 1.5 |
| `text-caption` | Captions / eyebrows | Cairo 400 | 0.875rem–1rem ≈ 14–16px | 0.18em uppercase variant for eyebrows | 

Arabic adjustments: when `dir="rtl"`, bump line-height by ~0.05 on display/h1/h2 (Arabic letterforms need more vertical air) via a `[dir="rtl"]` selector.

### Component updates (font-only — no layout/copy changes)

- **`Navbar`** — logo wordmark uses `font-semibold tracking-[0.18em]`; nav links unchanged (already Cairo). No structural change.
- **`FeaturedNews`** — section title → `text-display-2`; featured article headline → `text-h1`; side/recent card headlines → `text-h3`; eyebrows use `text-caption` uppercase tracked.
- **`Communities`** — title → `text-display-2`; card titles → `text-h3`; descriptions → `text-body`.
- **`Achievements`** — main statement "Building Syria's AI future, line by line." → `text-display-1` (the one true hero moment); body → `text-body`; stat numbers → Cairo 900 at `clamp(2.5rem, 4vw, 3.5rem)` with tight tracking.
- **`Partners`** — title → `text-display-2`; partner wordmarks → Cairo 600 16px.
- **`Footer`** — column heads keep `text-caption` uppercase; HQ/mission body → `text-body`; small links unchanged.

### Files touched

- `src/styles.css` — remove Fraunces import; remove `--font-display` fallback to serif; add type tokens and utility classes; add RTL line-height bumps.
- `src/components/site/FeaturedNews.tsx`
- `src/components/site/Communities.tsx`
- `src/components/site/Achievements.tsx`
- `src/components/site/Partners.tsx`
- `src/components/site/Footer.tsx`
- `src/components/site/Navbar.tsx` (minor)

### Out of scope

- Colors, spacing, imagery, copy, animations — untouched.
- No new dependencies.
