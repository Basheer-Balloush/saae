## Diagnosis

In `src/routes/one-million-initiative-home.tsx` (~lines 187–250), the donut is a Recharts `<PieChart>` inside `ResponsiveContainer`, and the center label is an **HTML overlay** — an absolutely-positioned `<div className="absolute inset-0 flex flex-col items-center justify-center">` sitting on top of the chart. So the fix is HTML wrapping + responsive font sizing, not SVG `<tspan>`.

The chart uses fixed pixel radii: `innerRadius={92}`, `outerRadius={140}`. That means the inner circle diameter is a fixed 184px regardless of the container width, so the label's max width must be derived from that inner-radius value, not from the viewport. English "Progress toward 1,000,000" currently renders as a single non-wrapping line in a container that spans the full overlay, so it overflows past the ring.

## Fix (only the center-label block, ~lines 238–249)

Derive constants from the existing chart props so future resizes stay in sync:

- Reuse the `innerRadius = 92` value (lift to a `const INNER_R = 92` used in both the `<Pie innerRadius={INNER_R}>` prop and the label wrapper) so the label width tracks the ring.
- Label wrapper inline style: `maxWidth: INNER_R * 2 - 24` (≈160px, leaves ~12px padding each side so text never touches the ring), plus `paddingInline: 8`. Keep `absolute inset-0 flex flex-col items-center justify-center text-center` and add `mx-auto` on an inner block sized to that maxWidth so it stays centered on the chart's cx/cy at any container width.

Then, for the three lines inside:

1. **Eyebrow ("Progress toward 1,000,000" / "التقدّم نحو المليون")**
   - Allow wrapping: `whitespace-normal break-words leading-[1.15]`, keep `uppercase text-muted-foreground text-center`.
   - Responsive font via inline `fontSize: 'clamp(10px, 3.2cqi, 12px)'` on a container using `containerType: 'inline-size'` on the donut wrapper — or, if we prefer to avoid container queries, use Tailwind `text-[10px] sm:text-xs` with `leading-[1.15]`. Chart size is fixed in px, so viewport units are wrong here; container-query units (`cqi`) or plain breakpoint classes are correct.
   - Apply the tighter English tracking conditionally: `tracking-[0.12em]` when `!isAr`, keep `tracking-[0.18em]` when `isAr`, so Arabic letter-spacing is untouched.

2. **Central number (`displayDone.toLocaleString()`)**
   - Bound its width the same way: it lives inside the same `maxWidth: INNER_R*2 - 24` wrapper, plus `leading-none tabular-nums`.
   - Replace `text-4xl sm:text-5xl` with a responsive clamp so 7-char values like `1,000,000` still fit: inline `fontSize: 'clamp(22px, 6cqi, 40px)'` (or, without container queries, `text-2xl sm:text-4xl` with a hard `maxWidth` on the number itself). Keep the existing gradient/`bg-clip-text` styling and animation untouched — this only changes size.

3. **Percentage / target line**
   - Keep on one line: add `whitespace-nowrap`, keep `text-xs text-muted-foreground mt-1`. Content unchanged: `((done / target) * 100).toFixed(1)% / target.toLocaleString()`.

Nothing else changes: chart data, colors, gradients, `innerRadius`/`outerRadius`, `paddingAngle`, animation props, tooltip, legend, and Arabic copy stay exactly as-is. `isAr` is already available in the component, so the tracking swap is a one-line ternary.

## Why this satisfies each requirement

- **Max width from `innerRadius`**: `INNER_R * 2 - 24`, reused from the same const passed to `<Pie innerRadius>`.
- **English wraps, Arabic unaffected**: `whitespace-normal` + tighter English tracking only.
- **Responsive font with floor/ceiling**: `clamp(10px, 3.2cqi, 12px)` for eyebrow, `clamp(22px, 6cqi, 40px)` for the number (or breakpoint equivalents).
- **Long digit lengths never touch the ring**: number lives in the same bounded wrapper and scales down via clamp.
- **Percentage never mid-wraps**: `whitespace-nowrap`.
- **Positioned relative to chart center**: still `absolute inset-0` + flex-centered; no fixed pixel offsets, unaffected by redraws/resizes.
- **Scoped**: only the center-label overlay `<div>` and the `INNER_R` constant are edited; stats cards, sponsors, CSR, hero, flip cards remain untouched.

## Verification

- Visually check EN + AR at 1440 / 1024 / 768 / 390 / 320px.
- Temporarily set `done` to a large value (e.g. 1,000,000) in dev to confirm the digit-length case.
- Confirm donut animation still plays and no console errors.