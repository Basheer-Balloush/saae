Plan: Update the pie chart segment colors so the Remaining slice uses the main footer color token (`--footer`).

Steps:
1. In `src/routes/one-million-initiative-home.tsx`, reorder the `sliceTokens` array so that the 4th index (Remaining in `pieData`) resolves to `var(--footer)`. The most coherent reordering is:
   ```ts
   const sliceTokens = ["--footer-accent", "--footer-medium", "--footer-light", "--footer"];
   ```
   This maps:
   - Trained → `--footer-accent`
   - Waitlist → `--footer-medium`
   - Covered (free) → `--footer-light`
   - Remaining → `--footer` (main footer color)

2. The existing gradient logic and `originalIndex % sliceTokens.length` mapping in the Recharts `<Cell>` elements stays unchanged, so the change is limited to the color order.

3. Verify the project still builds with `bun run build`.

No other files need changes; no other pie-chart logic, labels, or layout will be affected.