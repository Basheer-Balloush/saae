# Restructure notes (September 2026)

Started from `main` at **`1e854ec6`** ("Read profile content only from the encrypted table") on branch `refactor/cleanup`. Earlier builds on `1a5192dc` and `056d9624` were redone on this newer `main` so the course-feedback and encrypted profile-card work are included.

## Baseline and result

| Check                            | Baseline (1e854ec6)            | After                                           |
| -------------------------------- | ------------------------------ | ----------------------------------------------- |
| `tsc --noEmit`                   | 0 errors                       | 0 errors                                        |
| unit tests                       | 370 passed (41 files)          | 370 passed (41 files)                           |
| offline checks (`test:plans`)    | 19 pass / 0 fail               | 19 pass / 0 fail                                |
| `vite build`                     | OK                             | OK                                              |
| bundle check                     | OK                             | OK                                              |
| ESLint errors                    | ~7,900 (almost all formatting) | 104 (102 `no-explicit-any`, see below)          |
| knip unused files / dependencies | 70 files, 44 packages          | 0 / 0                                           |
| route tree                       | 126 route ids                  | identical ids, paths, parents and address lists |

## What changed

1. **Deleted dead code.**
   - An abandoned second copy of the public site: `components/public`, `components/public-shell`, `lib/public-site/*` except `language.ts`, `styles/public-site.css` and `public/site`.
   - About 25 unused components, hooks and lib files.
   - 33 unused shadcn components.
   - Unreferenced images, CSS and JS in `public/` and `src/assets`.
   - `drizzle/`.
2. **Removed 44 unused packages.** These include Capacitor, the Lovable email packages, drizzle, and unused Radix and UI libraries. Added `sharp` and `postcss`, which scripts already used.
3. **Organised the code by product area.** See the README folder map. Each feature now owns its UI and its `lib/`. `src/lib`, `src/hooks` and `src/components` keep only what several areas share.
4. **Grouped page routes into folders** by product. The URLs did not change; this was verified by comparing the generated route tree.
5. **Formatting and lint.**
   - Prettier formatted the code. The protected files are in `.prettierignore`.
   - The real lint errors were fixed without changing behaviour.
   - `knip.json` was added.
6. **Documentation.**
   - Added `README.md`.
   - Moved `DEPLOYMENT.md` and `roadmap.md` into `docs/`.
   - Grouped the admin and mobile docs.
   - Updated the paths in `docs/PROJECT-DOCUMENTATION.md` and `AGENTS.md`.

## Structure fixes found by the structure audit

An import-graph audit of the first build found five placement problems, fixed here:

1. The six animation pieces were in `components/motion` although only the website uses them: now `features/website/motion`.
2. The site footer lived in the website folder although the LMS uses it too: now `components/layout/Footer.tsx`.
3. `StarRating` (the `/feedback` survey) sat in the website folder: now in `features/feedback-survey`.
4. The LMS core imported from its sub-areas (internships translations, the course editor's `FileUploader`): both now live in the LMS core.
5. The LMS email queue imported the instructor-approved email from `lms/instructors`: that email now lives in the LMS core.

Result: no import cycles between areas; LMS sub-areas depend on the core, never the reverse.

## Kept on purpose

- **The `/lovable/email/*` routes.** Live webhooks call them: the email queue and the Supabase auth hook.
- **The 29 legacy redirect routes.** Each is now marked `// Legacy URL`. `admin/crm/contacts/route.tsx` and `learning-management-system/student/route.tsx` also redirect, but they are layouts, so they stay unlabelled.
- **`src/assets/partner-*.png`.** They are loaded by `import.meta.glob`, and the database stores their paths.
- **`public/cinematic/js/news-buildex-aleppo-inline.js`.** It is byte-identical to `news-tv-interview-inline.js`, but merging them would touch a route for little gain.
- **`@ts-nocheck` in `features/website/lib/public-language.ts`.** It is a DOM script; typing it is a separate job.
- **`src/integrations/supabase/*`.** Untouched, including a `prefer-const` lint warning in `previewAuthStorage.ts`.
- **102 `no-explicit-any`.** Replacing them needs per-case type work; this is left as a follow-up.
- **86 unused exports (knip).** Many are standard shadcn sub-components or unused server functions. Removing them is a separate, reviewable change.

## Known, not caused by this change

- Local dev returns 404 on three `/__l5e/assets-v1/.../ministry-*.png` images (`/one-million-initiative`, `/international-business-bridge`). The same happens on untouched `main`.

## Open decisions for the owner

- **Deploy side effect.** Server-function ids come from file paths. After this deploy, a visitor with a tab open from _before_ the deploy may see one failed action and need to refresh once. Merge at a low-traffic time.
- **`.lovable/`** (old planning notes): delete it if the repository is no longer linked to Lovable.
- **Splitting the files over 700 lines** (listed in the restructure brief, Phase 6): recommended as a separate follow-up PR, one file per commit.

## Equivalence audit (2026-09-29, against `main` 1e854ec6)

| Check                                                                                                    | Result                                                                                                                           |
| -------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| typecheck / tests / offline checks / build / bundle check                                                | 0 errors / 370 passed, 2 skipped (same as main) / 19 pass / OK / OK                                                              |
| Line-by-line comparison of all 498 kept files with their originals (import paths and formatting ignored) | Only comments, the legacy-URL labels, one `let` → `const`, test file paths, and 5 regexes differ                                 |
| The 5 rewritten regexes, on every Unicode code point (1,112,064)                                         | Identical matches                                                                                                                |
| Server functions (`createServerFn` exports)                                                              | 143 on main, 143 here, same names                                                                                                |
| Route tree                                                                                               | 126 route ids with identical paths and parents                                                                                   |
| Every page URL, APIs, sitemap, webhooks, robots/llms/AMS files and a 404 (137 requests)                  | Identical status, redirect, content type, title and server-rendered text                                                         |
| Encrypted profile cards (3 cards, AR and EN) against the live site                                       | Identical text, links, contact file and images; analytics off on those pages                                                     |
| Structure (import graph)                                                                                 | No cycles between areas; LMS sub-areas depend on the core only                                                                   |
| Deleted public files referenced anywhere / live DB rows pointing at removed files                        | None / none                                                                                                                      |
| Generated CSS                                                                                            | No class used by remaining code disappeared (474 removed classes belonged to deleted code)                                       |
| Screenshots: 31 pages, desktop EN and phone AR, top/middle/bottom, storage blocked (186)                 | Same layout and text; differences only in animation frames (mascot, ticker, count-up counters, which settle to identical values) |

Not covered: pages behind a login (their code is covered by the line-by-line comparison and the build).
