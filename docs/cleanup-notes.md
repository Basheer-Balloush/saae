# Restructure notes (September 2026)

Started from `main` at **`1a5192dc`** ("Abu Al-Joud answers about SAAE only") on branch `refactor/cleanup`.

## Baseline and result

| Check                            | Baseline (1a5192dc)            | After                                           |
| -------------------------------- | ------------------------------ | ----------------------------------------------- |
| `tsc --noEmit`                   | 0 errors                       | 0 errors                                        |
| unit tests                       | 344 passed (39 files)          | 344 passed (39 files)                           |
| offline checks (`test:plans`)    | 19 pass / 0 fail               | 19 pass / 0 fail                                |
| `vite build`                     | OK                             | OK                                              |
| bundle check                     | OK (274 files)                 | OK                                              |
| ESLint errors                    | ~7,900 (almost all formatting) | 104 (102 `no-explicit-any`, see below)          |
| knip unused files / dependencies | 70 files, 44 packages          | 0 / 0                                           |
| route tree                       | 123 routes                     | identical ids, paths, parents and address lists |

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
