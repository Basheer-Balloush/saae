## Goal

Replace the current flat pie chart with a refined, professional donut chart that reads as a hero stat — not a default Recharts widget.

## What changes

**Visual treatment (donut, not flat pie)**
- Switch to a donut (inner radius ~85, outer ~130) so the center can hold the headline number.
- Center label: large `done.toLocaleString()` on top, smaller `% of 1,000,000` underneath, both using primary/foreground tokens.
- Slice colors driven by semantic tokens (primary, secondary, accent, muted) via CSS variables — no hardcoded hex. Subtle gradient fill per slice using SVG `<defs>` linearGradient (token → token-glow).
- 2px background-colored stroke between slices for clean separation; soft drop-shadow on the whole donut via `filter: drop-shadow(...)` using `--shadow-elegant`.
- Remove the redundant horizontal progress bar above the chart (the donut already encodes progress) OR keep it but demote it visually — recommend remove.

**Labels & legend**
- Drop in-slice percentage labels (cluttered on small slices). Keep tooltip only for hover detail.
- Replace default Recharts `<Legend>` with a custom legend rendered as a 2×2 (desktop) / stacked (mobile) grid of cards under the chart. Each item: color dot, label, count, percentage.

**Motion**
- One-time mount animation: donut sweeps in from 0 → full (`animationBegin: 0, animationDuration: 900, animationEasing: 'ease-out'`). Center number counts up from 0 to `done` over the same duration.

**Empty state (done = 0)**
- Show the donut as a single muted ring with the center showing "0%" and subline "Be the first to fund a seat" (AR equivalent).

## Technical notes

- File: `src/routes/one-million-initiative-home.tsx` — replace the `PieChart` block (lines ~162–208) and remove the helper `renderPieLabel` if unused.
- Add a small `useCountUp` hook locally (or inline `requestAnimationFrame` interpolation) for the center number.
- Custom legend is a plain div grid — no Recharts `Legend` import needed after this.
- All colors via `hsl(var(--primary))` / `hsl(var(--secondary))` etc. so it adapts to light/dark and matches the rest of the page.
- Keep i18n: legend labels and center subline already come from the `pieData` names + `t.*` strings.

## Out of scope

- Donor leaderboard styling, hero section, CTA buttons.
- Backend / stats RPC.
