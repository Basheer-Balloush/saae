# SAAE UI Migration — start here

This package migrates the new UI design (the `khara` branch of `saae-cinematic-landing`) into the live `aisyria.org` application, page by page, without touching the LMS, the attendance system, the admin CRM, or the public pages that have not been redesigned yet.

---

## What this is, in one paragraph

The new UI is a **static HTML prototype** with hardcoded content. The live site is a **TanStack Start + React + Supabase application** whose public content lives in a database and is bilingual with RTL. So this is not a file swap — it is a re-implementation of the prototype's design inside the application, re-bound to the live data. That is what the eight phase prompts do.

## Before you run anything — one setup step

Lovable's agent can only read what is in the project. **Commit the reference material into the repository first**, or every phase will be guessing at CSS values it cannot see.

Copy this whole folder into the project as `docs/migration/`:

```
docs/migration/
  INVARIANTS.md
  phases/
  reference/
```

Then copy the assets into place (the agent is told to do this in Phase 0, but doing it yourself is faster and safer):

```
assets-to-upload/public/fonts/*  →  public/fonts/
assets-to-upload/public/saae/*   →  public/saae/
```

Do **not** commit `assets-to-upload/supabase-storage/hero-scrub.mp4`. It goes to Supabase Storage in Phase 7.

`docs/` is not part of the Vite build, so none of this ships to visitors.

## How to run it

**One phase per Lovable prompt. Never two.** Each phase file is self-contained — it restates the rules, names the files it is allowed to touch, and lists what "done" means. That is deliberate: Lovable loses context between prompts, so nothing may depend on it remembering an earlier one.

For each phase, in order:

1. Paste the contents of the phase file as the prompt. (Or: *"Read `docs/migration/phases/PHASE-1-partners.md` and carry it out exactly."*)
2. When it finishes, run the acceptance checklist at the bottom of that file yourself. Do not take "done" on trust.
3. **Run `reference/verify-after-each-phase.md`.** Five `git diff` commands and four URLs, about two minutes. This is what makes the safety rules checkable instead of merely stated — it catches the failures that are invisible on the page you just built. Do not skip it.
4. **Commit.** One commit per phase, so any phase can be reverted on its own.
5. Only then start the next phase.

If a phase fails a check, **revert and re-run the prompt** rather than patching it. A phase that went outside its lane produces a diff nobody can review.

If a phase comes back with something outside its allowlist changed, revert it and re-run the prompt rather than patching over it.

## The phases

| # | File | What it does | Risk |
|---|---|---|---|
| 0 | `PHASE-0-foundation.md` | Design tokens, fonts, assets, new nav / ribbon / footer. **Nothing visible changes.** | Very low |
| 1 | `PHASE-1-partners.md` | New `/partners` route, bound to the `partners` table | Low — no existing page to break |
| 2 | `PHASE-2-news.md` | `/news` and `/news/$id`; four bespoke prototype articles become one DB template | Medium |
| 3 | `PHASE-3-about.md` | `/about`, hybrid design, board and executive team restored | Medium |
| 4 | `PHASE-4-contact.md` | `/contact`, form contract preserved, missing field added | Medium |
| 5 | `PHASE-5-initiative.md` | `/one-million-initiative-home`, real payment dialogs wired in | Medium-high — touches money flows |
| 6 | `PHASE-6-home.md` | `/` home, static hero | High — the most content |
| 7 | `PHASE-7-hero-video.md` | The scroll-scrubbed hero video | High, and **allowed to fail** |

Phases 0–6 leave a complete, correct site. Phase 7 is an enhancement on top.

## The three rules that keep this safe

1. **The dark palette never reaches `:root`.** All new tokens are scoped to a `.saae-v2` wrapper and prefixed `--v2-`. `src/styles.css` gains exactly one line — an `@import` — across the whole migration. If you check one thing after each phase, check this: `git diff src/styles.css`.
2. **`Navbar.tsx` and `Footer.tsx` are never edited.** Twelve routes import them, and five of those keep their current light design. The new chrome ships as new components used only by migrated pages.
3. **The database is the source of truth for content.** The prototype's news items, partner logos, statistics and Arabic copy are design placeholders. Every phase says so; verify it in the diff.

## What you should expect to see

**A visible seam, on purpose.** Until the remaining public pages are redesigned, the site has two looks: the seven migrated pages are dark and cinematic; `/communities/*`, `/resources/ai-tools`, `/international-business-bridge`, `/one-million-initiative` (the ministry document) and `/one-million-initiative-donors` keep the current light design. That follows from migrating only the pages that were redesigned. Those pages are untouched and fully working throughout.

**The theme toggle disappears on migrated pages.** The new design has no light variant. `ThemeProvider` and the toggle keep working everywhere else.

## Three things worth knowing before you start

**1. The prototype's mobile hero drops most of the home page.** On phones the prototype hides the entire cinematic hero — which carries the statistics, the nine communities, the learning pathway and the initiative panel — and shows one headline instead. Phase 6 fixes this: on mobile those four sections render stacked below the static hero. Only the scroll mechanism is desktop-only, never the content.

**2. The prototype has five different palettes.** Each page was designed separately: four near-but-not-identical dark navies, plus `about-v2.html` which is a light warm-paper design. `reference/design-tokens.md` unifies them onto one set anchored on the home page and the initiative page — whose two brand primitives are already **exactly** the application's teal `#048090` and green `#698F3F`. Nothing about the brand changes.

**3. `about-v2.html` is the right content, in the wrong colours.** It maps 1:1 onto your existing About copy — vision, mission, five goals, five fields, five values — but it is the light design. `about.html` is dark and consistent, but carries a different, unrelated set of copy. Phase 3 builds the hybrid: `about-v2`'s structure in `about.html`'s dark visual language, plus the nine communities, plus the board and executive team from the database. All your current About content survives.

## Gaps the prototype has, and where they are closed

| Gap | Closed in |
|---|---|
| Contact form has no `inquiry_type` field, which the CRM filters on | Phase 4 — a styled select is added |
| Neither About design has the board or executive team | Phase 3 — restored from the `members` table |
| The learning-platform call to action points at the contact page | Phase 6 — repointed at `/learning-management-system` |
| No page metadata anywhere — no titles, descriptions, canonicals, JSON-LD | Every phase — existing `head()` blocks are preserved verbatim |
| No chatbot, no analytics ("by design", per the prototype README) | Every phase — `AssistantFab` and `gtag` are explicitly protected |
| Footer links point outward to `https://aisyria.org/...` | Phase 0 — rewritten as internal routes |
| Statistics, communities and pathways vanish on mobile | Phase 6 — rendered as stacked sections |

## Two follow-ups, outside this migration

- **Partner logos.** The prototype carries 23 marks; the database seeds 20. High-quality versions of all of them, including the three that have no database row, are in `assets-to-upload/optional-partner-logos/`. Add them through the **existing admin Partners screen** — not in code. Phase 1 reports which ones are missing.
- **The remaining public pages.** `/communities/*`, `/resources/ai-tools`, `/international-business-bridge` and the two other initiative routes have no new design yet. When they get one, they follow the same pattern: wrap in `PageV2`, restyle, bind to the data that is already there.

## Package contents

```
README-START-HERE.md                 this file
INVARIANTS.md                        the rules, restated at the top of every phase
phases/PHASE-0..7-*.md               the eight prompts, in order
reference/
  verify-after-each-phase.md         run this after every phase, before committing
  data-binding-map.md                every prototype block → its live data source
  design-tokens.md                   the unified --v2-* token set + mapping table
  chrome-dictionary-ar-en.md         195 EN/AR strings, with precedence rules
  prototype/                         the full prototype source, media stripped
assets-to-upload/
  public/fonts/                      → public/fonts/
  public/saae/                       → public/saae/
  supabase-storage/hero-scrub.mp4    → Supabase Storage (Phase 7)
  optional-partner-logos/            → upload via the admin screen, not code
```
