# Mobile Baseline — PR0 (record-only, plan.md Sec 22.1 + 23)

Date (UTC): 2026-09-12
Branch: `mobile-responsiveness-upgrade`
Base commit: `c70f0898d415bf4e35ed2ac957f9adc0c45e706d`
Workdir: `C:\Users\LENOVO\Documents\ok\SAAE_React`

> Record-only baseline. No source edits, no fixes, no commits. Truthful command capture.

## 1. Base

- `git rev-parse HEAD` → `c70f0898d415bf4e35ed2ac957f9adc0c45e706d`
- `git branch --show-current` → `mobile-responsiveness-upgrade`
- `git status --short` (before) → clean (empty output)
- Toolchain: `bun 1.3.14`, `npm 11.12.1` (bun used for all commands)
- Scripts noted (read-only, not edited): `package.json` → `build: vite build`, `lint: eslint .`,
  `typecheck: tsgo --noEmit || tsc --noEmit`; `vite.config.ts` → TanStack Start via
  `@lovable.dev/vite-tanstack-config`, server entry `src/server.ts`.

## 2. Commands + exit codes + log tails (last ≤5 lines)

| # | Command | Exit | Tail (≤5 lines) |
|---|---------|------|-----------------|
| 1 | `bun install --frozen-lockfile` | 0 | `Checked 1153 installs across 1222 packages (no changes) [1.56s]` |
| 2 | `bun run typecheck` | 0 | `bun: command not found: tsgo` → fallback `tsc --noEmit` silent, no errors |
| 3 | `bun run lint` | TIMEOUT (>120 s, no output; not retried, non-blocking per plan) | `$ eslint .` then no further output within budget |
| 4 | `bun run build` | 0 | `✓ built in 20.58s` (nitro/cloudflare); preview via `vite preview`, deploy via `nitro deploy --prebuilt` |

Build output note: no `dist/` — TanStack Start + nitro emits `.output/`:
`.output/` = 824 files, 40,704,720 bytes (≈38.82 MiB).

## 3. Asset sizes (`public/cinematic`)

- Total: 121 files, 23,643,025 bytes (≈22.55 MB) — nothing deleted.
- `public/cinematic/js/hero-instrument.js` → Y, 62,603 bytes
- `public/cinematic/css/home.css` → Y, 175,338 bytes
- `hero-scrub.mp4` → Y, `public/cinematic/hero-scrub.mp4`, 7,463,491 bytes (≈7.12 MB)
- Top-10 largest: `hero-scrub.mp4` (7,463,491) > `tv-interview-2.png` (2,541,681) =
  `tv-interview-1.png` (2,541,681) > `tv-interview-3.png` (2,261,917) >
  `hero-start.png` (939,662) > `initiative-launch.jpg` / `event-initiative.jpg` (723,006 each) >
  `logo-tree-transparent.png` (458,849) > `three.core.min.js` (385,392) >
  `three.module.min.js` (365,558).

## 4. Known limits

- No `.git` base diff included (baseline is a snapshot, not a range).
- Deps verified present via `--frozen-lockfile` (no changes); lockfile contents not audited.
- `lint` timed out (>120 s) — result unknown, recorded as-is, not fixed.
- No secrets or `.env` values recorded (only noted that bun reads `.env`, unnamed).
- Post-baseline `git status --short` must show only `?? docs/mobile-baseline-PR0.md`.
