# About page interaction and localization update

## Scope
Update the existing `/about` page only. Preserve its current dark circuit background, typography, navbar, footer, page structure, and all content not explicitly named for removal or replacement.

## Changes
- Remove the two small labels “What we do” and “Where the work stands” from the existing markup, including their spacing.
- Center the “From learning to public value” and “Proof lives in public” headings and supporting paragraphs in both languages, while preserving natural LTR English and RTL Arabic punctuation.
- Convert LEARN, RESEARCH, and BUILD into one accessible three-option interaction. LEARN remains active initially; mouse, touch, and keyboard selection updates one non-overlapping description with a 400–600 ms fade/slide and restrained turquoise active styling.
- Animate the three numeric achievements once on first viewport entry, preserving separators and trailing `+`. Add staggered fade-up/glow entrances and a reduced-motion static fallback.
- Replace the numeric specialist-community achievement with an icon and the localized general label “Specialist Communities” / “المجتمعات التخصصية”.
- Replace the number-specific communities heading with the same general localized title and remove wording that states a fixed community count.
- Remove the existing 09 “Quality Entrepreneurship” card and its About-page-only translation/content references. Leave unrelated community routes and data outside `/about` unchanged.
- Restyle the remaining eight cards as a balanced responsive editorial grid: varied desktop offsets, two columns on tablet, one column on mobile, staggered viewport reveals, restrained hover/focus lift and glow, and reduced-motion support.
- Use document `lang`/`dir` as the source of truth and logical CSS properties for page-level alignment and positioning. Keep intentionally centered content centered in both directions.

## Technical details
- Keep the current static About HTML, `language.js` localization flow, `about-inline.css`, and `about-inline.js`; no new page, route, section, or animation library.
- Use semantic buttons with `aria-selected`, an associated description region, and visible `:focus-visible` treatment for the pillar interaction.
- Use `IntersectionObserver` plus `requestAnimationFrame` for one-time statistics/card animation, with cleanup-safe initialization through the existing cinematic script lifecycle.
- Preserve translated text mapping behavior and update only the affected About strings.

## Verification
- Test English and Arabic at desktop, tablet, and mobile widths.
- Verify language switching, `html[lang]` and `html[dir]`, punctuation order, centered headings, count-up formatting, one-time animation, reduced motion, keyboard/touch selection, focus visibility, card reflow, no clipping/overlap, and no horizontal scrolling.
- Check preview runtime/console output and the latest build status after implementation.
