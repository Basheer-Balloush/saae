# Design Tokens — the unified `--v2-*` set

## The problem this file solves

The prototype was built page by page, and **each page invented its own palette**. There are five near-but-not-identical dark navies and one page that is not dark at all:

| Prototype file | Ground | Accent |
|---|---|---|
| `index.html` (inline) | `#06232a` | `#048090` petrol / `#698f3f` olive |
| `assets/css/initiative.css` | `#06232a` | `#048090` / `#008b9d` turquoise |
| `assets/css/contact.css` | `#04121a` | `#5ed8e6` cyan |
| `assets/css/about.css` | `#03171e` | `#72dce5` cyan / `#9abb63` green |
| `assets/css/about-v2.css` | `#f2f1e6` **light warm paper** | `#0a7f86` / `#5f8a2a` / `#a15a06` |

Shipping four slightly different navies is a defect, not a design. **Unify on the `index.html` / `initiative.css` palette** — it is the one the hero, the nav and the footer already use, and its two primitives are the organisation's actual brand colours.

Brand alignment is already correct: the prototype's `--petrol: #048090` and `--olive: #698f3f` are **exactly** the live application's `--primary` (Teal Blue #048090) and `--secondary` (Asparagus Green #698F3F). Nothing about the brand changes in this migration.

---

## The canonical set

Create `src/styles/saae-v2.css` and import it once from the bottom of `src/styles.css`. **Nothing in this file may sit at `:root`.**

```css
.saae-v2 {
  /* ── Brand primitives (from the official logo artwork) ───────────────
     Use for graphics and large type. Never for small text.             */
  --v2-petrol:          #048090;
  --v2-olive:           #698f3f;

  /* ── Readable ramps. Each is the lightest step that still clears
     WCAG AA (4.5:1) on the ground it is used against.                  */
  --v2-petrol-text:     #04626e;
  --v2-petrol-lift:     #b8e8f0;
  --v2-olive-text:      #516f30;
  --v2-olive-lift:      #a8cf7e;

  /* ── Grounds. --v2-canvas is the page. --v2-paper is a type colour
     on dark grounds, never the page ground.                            */
  --v2-paper:           #fefdfc;
  --v2-canvas:          #06232a;
  --v2-canvas-deep:     #03171e;   /* darkest bands: footer, closing scenes */
  --v2-panel:           #0c303a;
  --v2-deep:            #144248;

  /* ── Supporting hues ─────────────────────────────────────────────── */
  --v2-teal:            #227f8c;
  --v2-teal-lift:       #b8e8f0;
  --v2-turquoise:       #008b9d;   /* the SAAE logo turquoise */
  --v2-turquoise-lift:  #77e0e8;
  --v2-green:           #688c3e;
  --v2-green-lift:      #81a657;

  /* ── Type ────────────────────────────────────────────────────────── */
  --v2-ink:             #1e1e1e;   /* type on light chips that sit on the dark page */
  --v2-type:            #e7f1f0;   /* body copy on --v2-canvas */
  --v2-muted:           #9fbabe;
  --v2-line:            rgba(184, 232, 240, .16);
  --v2-line-firm:       rgba(184, 232, 240, .32);

  /* ── Layout and motion ───────────────────────────────────────────── */
  --v2-page:            min(1180px, calc(100vw - 48px));
  --v2-header-height:   82px;
  --v2-ease-out:        cubic-bezier(.16, 1, .3, 1);

  /* base */
  background: var(--v2-canvas);
  color: var(--v2-type);
  color-scheme: dark;
}

@media (max-width: 900px) { .saae-v2 { --v2-page: min(100% - 36px, 900px); } }
@media (max-width: 600px) { .saae-v2 { --v2-page: calc(100% - 32px); } }
```

## Mapping the per-page variants onto the canonical set

When porting `about.css` and `contact.css`, substitute as follows. Do **not** carry their originals across.

| Prototype token | Where | Use instead |
|---|---|---|
| `--night: #03171e` | about.css | `--v2-canvas-deep` |
| `--night: #04121a` | contact.css | `--v2-canvas` |
| `--deep: #010e13` / `#061a23` | about, contact | `--v2-canvas-deep` |
| `--surface: #062933` / `--panel: #0a2229` | about, contact | `--v2-panel` |
| `--panel-lift: #0c2b36` | contact.css | `--v2-deep` |
| `--cyan: #72dce5` / `#5ed8e6` | about, contact | `--v2-turquoise-lift` |
| `--cyan-lift: #9beef5` | contact.css | `--v2-petrol-lift` |
| `--cyan-deep: #3fb6c8` | contact.css | `--v2-teal` |
| `--green: #9abb63` / `--olive: #a8cf7e` | about, contact | `--v2-olive-lift` |
| `--white: #fffefa` / `#fefdfc` | about, contact | `--v2-paper` |
| `--text: #dcebea` / `--type: #cfe3e7` | about, contact | `--v2-type` |
| `--muted: #91aaad` / `#9fbabe` | about, contact | `--v2-muted` |
| `--line: rgba(114,220,229,.16)` | about.css | `--v2-line` |
| `--initiative-*` (all) | initiative.css | drop the prefix, use the `--v2-*` equivalent |
| `--page` / `--shell` | all | `--v2-page` |
| `--ease` / `--ease-out` | all | `--v2-ease-out` |

### The orange

`index.html` defines `--accent: #f99c00` and `--accent-hover: #e58c00`. `initiative.css` carries an explicit comment that **orange is not part of the SAAE identity** and replaces it with the logo turquoise.

**Resolution: drop the orange.** Wherever `--accent` was used for a call-to-action, use `--v2-turquoise` with `--v2-ink` as its foreground. If a warm accent is genuinely needed for a single element, raise it rather than reintroducing the token.

*(Note: the live application's `--accent` in `:root` is an unrelated light teal tint. Another reason the new tokens must be prefixed and scoped.)*

---

## Typography

Cairo, weights 400 / 600 / 700 / 900 — the same family the application already uses.

**Loading:** the live app pulls Cairo from Google Fonts via a `<link>` in `__root.tsx`. The prototype self-hosts it (WOFF2 Latin subsets + TTF Arabic). **Pick one — do not ship both**, or every page downloads the family twice.

Recommendation: **self-host.** Copy `assets-to-upload/public/fonts/` into `public/fonts/`, declare the `@font-face` rules in `saae-v2.css` with the prototype's `unicode-range` splits, and remove the Google Fonts `<link>` and its two `preconnect` hints from `__root.tsx`. This removes a third-party render-blocking request from every page in the app, LMS included, and the Arabic files are already the official ones.

The `unicode-range` split matters: Latin text pulls only the ~40 KB WOFF2 subsets, Arabic pulls the full TTFs only when Arabic characters are on the page.

**Type scale.** The application already has a fluid scale in `@theme` (`--text-display-1` … `--text-caption`). Reuse it. Do not add a second scale.

---

## RTL rules that belong with the tokens

```css
.saae-v2[dir="rtl"] h1,
.saae-v2[dir="rtl"] h2,
.saae-v2[dir="rtl"] h3,
.saae-v2[dir="rtl"] .v2-eyebrow {
  letter-spacing: normal;   /* Arabic must never be tracked */
  line-height: 1.45;        /* vs ~1.05 for the English display sizes */
  word-spacing: normal;
}
```

Prefer logical properties throughout: `inset-inline-start`, `margin-inline`, `padding-inline`, `border-inline-start`, `text-align: start`.

---

## Reduced motion

The prototype already ships this. Keep it:

```css
@media (prefers-reduced-motion: reduce) {
  .saae-v2 *,
  .saae-v2 *::before,
  .saae-v2 *::after {
    animation-duration: .01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: .01ms !important;
    scroll-behavior: auto !important;
  }
}
```

Scroll-driven sequences (the hero scrub, the mission reel, the counters) must render their **final state** under reduced motion, not their first frame.
