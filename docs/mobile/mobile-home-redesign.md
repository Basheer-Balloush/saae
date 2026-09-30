# Mobile homepage redesign

The phone homepage includes the complete association landing page, opening with **ذكاء وريادة لوطن ينهض**. Cairo and the existing petrol, turquoise, and olive palette are preserved. A cinematic tree opening leads into learning and participation, the initiative, nine communities, news, mission, achievements, 23 partner logos, FAQ, a closing invitation, and comprehensive footer navigation.

## Behavior

- Phones receive complete server-rendered content. Fine-pointer devices at least 768px wide without reduced-motion preferences load the desktop cinematic enhancement after capability detection.
- Arabic and English share the content inventory. Stored language restores after hydration; blocked storage does not disable switching.
- Cards, section navigation, menu, FAQ, and footer expose desktop destinations or documented local equivalents. Unit tests compare these against desktop HTML and resolve local routes and anchors.
- Both tree videos have pause controls and receive sources only on eligible clients. Reduced-motion and save-data users receive posters. Changing to reduced motion stops playback; a manually paused closing video remains paused after scrolling away and back.
- The hero grows with enlarged text. Images reserve dimensions and below-fold images load lazily.

## People-free visual direction

People appear only in genuine news photographs. The four generated people images and their obsolete generation prompts have been removed from the project.

- Learning, communities, and registration are three visible navigation cards using book, network, and rocket symbols. There is no photo carousel or hidden entry point.
- The national initiative uses a 6 KB SVG derived from the existing public/cinematic/js/syria-outline.js coordinates (Natural Earth admin-0 1:50m, public domain). The dot texture is decorative, not participation or coverage data. The one-million figure is explicitly labeled as the initiative goal.
- Existing abstract tree videos, partner logos, wordmarks, and the contact map remain. Sampled frames from both tree videos show only branching structures and light.
- No new AI-generated bitmap was needed: the new artwork is a native vector graphic.

This direction follows the original association's education, practical technology, research, entrepreneurship, and national development purpose: https://aisyria.org/about and https://aisyria.org/.

## Verification

- All 28 unit tests passed across four files.
- Typecheck passed via the script's TypeScript fallback because tsgo is unavailable.
- Production build passed with existing server-function deprecation, bundle-size, and Cloudflare configuration warnings.
- Targeted lint passed with no errors and one existing language-provider Fast Refresh warning. Repository-wide lint was previously stopped after more than five minutes without results; run `bun run lint` for that broader check.
- Chromium checks covered 320, 390, and 430px phone widths without horizontal overflow, 200% root text without hero clipping, closing-video pause persistence, and live reduced-motion changes. No application exceptions were recorded.
- The entry cards and national initiative graphic were visually inspected. A regression test limits non-news assets to the reviewed graphics. Real-device Safari, field Core Web Vitals, and a complete site-wide accessibility audit were not performed.

## Integration

Affected components: MobileHome.tsx, mobile-home-content.ts, mobile-home.css, useHeroCapability.ts, index/root routes, language provider, and homepage unit tests. The obsolete MobileHero is removed. No dependency, authentication, backend, database, or migration changes are required.

The imagery uses SAAE's Syrian learning and entrepreneurship context. wallashi.tech could not be resolved during reference review and is not claimed as verified visual evidence. GitHub branch delivery does not verify hosting deployment; use the repository's normal deployment process.
