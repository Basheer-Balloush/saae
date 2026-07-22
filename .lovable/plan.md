Plan: Make the pie chart segment colors exactly match the solid legend colors shown in the legend spans.

Context: The custom legend uses solid CSS-variable backgrounds (`var(--footer-accent)`, `var(--footer-medium)`, `var(--footer-light)`, `var(--footer)`), while the pie chart currently fills each segment with a gradient that uses the same variable but at reduced opacity. That makes the chart segments look different from the legend dots.

Steps:
1. In `src/routes/one-million-initiative-home.tsx`, change the `<Cell>` fill from the gradient URL to the same CSS variable used by the matching legend span:
   ```tsx
   <Cell
     key={entry.name}
     fill={`var(${sliceTokens[originalIndex % sliceTokens.length]})`}
   />
   ```
   This will make Covered, Trained, Waitlist, and Remaining segments use the exact same solid colors as their legend labels.

2. Remove the now-unused `<defs>` gradient block and the related `sliceTokens` mapping loop in the `<PieChart>` element, since the gradient definitions are no longer referenced.

3. Verify the project builds with `bun run build`.

No other pie-chart logic, labels, or layout will change.