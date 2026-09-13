# Mobile homepage redesign

The phone homepage includes the complete association landing page, opening with **ذكاء وريادة لوطن ينهض**. Cairo and the existing petrol, turquoise, and olive palette are preserved. A cinematic tree opening leads into learning and participation, the initiative, nine communities, news, mission, achievements, 23 partner logos, FAQ, a closing invitation, and comprehensive footer navigation.

## Behavior

- Phones receive complete server-rendered content. Fine-pointer devices at least 768px wide without reduced-motion preferences load the desktop cinematic enhancement after capability detection.
- Arabic and English share the content inventory. Stored language restores after hydration; blocked storage does not disable switching.
- Cards, section navigation, menu, FAQ, and footer expose desktop destinations or documented local equivalents. Unit tests compare these against desktop HTML and resolve local routes and anchors.
- Both tree videos have pause controls and receive sources only on eligible clients. Reduced-motion and save-data users receive posters. Changing to reduced motion stops playback; a manually paused closing video remains paused after scrolling away and back.
- The hero grows with enlarged text. Images reserve dimensions and below-fold images load lazily.

## Generated imagery

Four conceptual photographs were generated with the built-in OpenAI image tool on 2026-09-13. The tool does not expose a model selector, so no specific model version is claimed. See [prompts and provenance](mobile-image-prompts.json).

| Asset under public/cinematic/mobile | Scene | Dimensions | Bytes |
| --- | --- | --- | ---: |
| way-learning.webp | Learner and instructor | 800 × 500 | 45,920 |
| way-communities.webp | Peer discussion | 800 × 500 | 60,892 |
| way-registration.webp | Entrepreneur and mentor testing a sensor | 800 × 500 | 54,872 |
| initiative-portrait.webp | Learner in a university courtyard | 900 × 1125 | 67,158 |

These are illustrative people and settings, not records of real participants or events. Informative images have bilingual descriptions identifying the generated illustration; the initiative background is decorative with empty alternative text. Real news photographs, logos, and tree videos retain their existing assets. WebP files are resized and encoded derivatives; original PNGs remain in local task outputs.

## Verification

- All 27 unit tests passed across four files.
- Typecheck passed via the script's TypeScript fallback because tsgo is unavailable.
- Production build passed with existing server-function deprecation, bundle-size, and Cloudflare configuration warnings.
- Targeted lint passed with no errors and one existing language-provider Fast Refresh warning. Repository-wide lint was previously stopped after more than five minutes without results; run `bun run lint` for that broader check.
- Chromium checks covered 320, 390, and 430px phone widths without horizontal overflow, 200% root text without hero clipping, closing-video pause persistence, and live reduced-motion changes. No application exceptions were recorded.
- The mobile photo cards and initiative feature were visually inspected. Real-device Safari, field Core Web Vitals, and a complete site-wide accessibility audit were not performed.

## Integration

Affected components: MobileHome.tsx, mobile-home-content.ts, mobile-home.css, useHeroCapability.ts, index/root routes, language provider, and homepage unit tests. The obsolete MobileHero is removed. No dependency, authentication, backend, database, or migration changes are required.

The imagery uses SAAE's Syrian learning and entrepreneurship context. wallashi.tech could not be resolved during reference review and is not claimed as verified visual evidence. GitHub branch delivery does not verify hosting deployment; use the repository's normal deployment process.
