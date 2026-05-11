## Goal
Replace the Data Community hero image with one that visually matches "Data Community" — charts, dashboards, analytics, or people working with data — instead of the current generic photo.

## Approach options

**Option A — Use a curated Unsplash photo (fastest, no asset to manage).** Swap the `data` entry in `HERO_IMG` (`src/routes/communities.$key.tsx`, line 22) to one of these data-themed photos that still match the rest of the site's "natural-light human collaboration, no robots" tone:

1. Analyst at a laptop with charts on screen — `photo-1551288049-bebda4e38f71`
2. Dashboard on a monitor with graphs — `photo-1460925895917-afdab827c52f`
3. Two people reviewing data on a screen together — `photo-1543286386-2e659306cd6c`
4. Sticky-note analytics planning wall — `photo-1454165804606-c3d57bc86b40`

Recommended default: **option 2** (dashboard/graphs) — clearest "data" signal.

**Option B — Generate a custom branded image** matching the editorial Teal/Olive palette. Slower but unique. Only worth it if you want every community hero to feel custom.

## Out of scope
Other community hero images (architecture, medical, etc.) — only `data` is changing.

Tell me which option (and which photo if A), or just say "go" and I'll use Option A photo 2.
