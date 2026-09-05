# Phase 5 — `/one-million-initiative-home`

**Do Phases 0–4 first.**

The prototype's `initiative.html` is a redesign of the **interactive** initiative page — the one with live counters, sponsors and the three ways to take part. That is `/one-million-initiative-home` in the application.

This page moves money and collects registrations. Its three calls to action are wired to real server functions today. The prototype's own pay modal is a **stub** that collects a name and does nothing. Do not ship it.

---

## Which initiative route is which

| Route | What it is | This phase |
|---|---|---|
| `/one-million-initiative-home` | The interactive public page: stats, sponsors, three participation paths | **Migrate this one** |
| `/one-million-initiative` | The long Arabic ministry document (vision, methodology, economic model, accreditation) | **Do not touch** |
| `/one-million-initiative-donors` | The donors listing | **Do not touch** |
| `/initiative/claim` | Sponsored-seat claim flow | **Do not touch** |

The three untouched routes keep the current light `Navbar` / `Footer`. That is expected and correct for now.

---

## NON-NEGOTIABLES (full list in `docs/migration/INVARIANTS.md`)

1. **Never touch `:root`, `.dark`, or `@theme` in `src/styles.css`.** New styles scoped under `.saae-v2`, tokens prefixed `--v2-`.
2. **Do not modify** anything under `src/routes/learning-management-system*`, `attendance-management-system*`, `admin*`, `super-admin.tsx`, `api/`, `lovable/`, `src/components/{lms,ams,admin,ui}/`, `src/integrations/`, `src/lib/*.server.ts`, `supabase/migrations/`, `drizzle/`.
3. **No database changes.**
4. **Do not change any payment, waitlist or donation logic.** The three dialog components and `src/lib/initiative.functions.ts` are behaviour, not design. You may restyle the *inside* of the dialogs; you may not change what they submit or how.
5. **Delete the prototype's `#pay-modal` stub.** It is a design placeholder with no backend.
6. **SSR safety** — `window` / `document` / observers only inside `useEffect`.

## Reference

- Design: `docs/migration/reference/prototype/initiative.html` + `assets/css/initiative.css` + `assets/js/initiative.js`
- Bindings: `docs/migration/reference/data-binding-map.md`
- Tokens: `docs/migration/reference/design-tokens.md`

Note: `initiative.css` already uses the canonical ground (`--initiative-deep: #06232a` = `--v2-canvas`). Drop the `--initiative-` prefix and use the `--v2-*` names. **Heed the comment already in that file: orange is not part of the SAAE identity — use the logo turquoise.**

Note also: this page's prototype uses `data-i18n="key"` attributes with a dictionary inside `initiative.js`, a different mechanism from the other pages. Both collapse to the same thing here — keys in `translations.ts`, read through `useLang()`.

---

## Files you may modify

```
src/routes/one-million-initiative-home.tsx
src/styles/saae-v2.css                          — add initiative styles
src/lib/translations.ts                         — add new keys only
src/components/initiative/FlipCard.tsx          — restyle only, if needed
```

**You may restyle the presentation inside these three, but not their logic, fields, validation or submission:**
```
src/components/initiative/WaitlistDialog.tsx
src/components/initiative/DirectPaymentDialog.tsx
src/components/initiative/CorporateDonationDialog.tsx
```

Touch nothing else. `src/lib/initiative.functions.ts` is **read-only**.

---

## Task 1 — Keep the data layer

The existing route already loads everything through `useServerFn`:

```ts
const statsFn    = useServerFn(getInitiativeStats);    // { target, done, waiting, coveredUnassigned, totalFunded }
const settingsFn = useServerFn(getInitiativeSettings);
const donorsFn   = useServerFn(getTopDonors);          // { limit, donorType: "company" | "individual" }
```

Keep all of it: the calls, the polling or refresh behaviour, the error handling, the `displayDone` count-up animation. **Only the markup around it changes.**

Keep the existing `head()` export unchanged.

## Task 2 — The page

Wrap in `<PageV2>` and port `initiative.html` section by section.

### Hero — "One million Syrian AI users."
Headline and standfirst from `translations.ts`. No hardcoded figure in the copy — if a number appears, it comes from `stats`.

### Progress — "A million begins with the next person."
The prototype's progress dial. Bind:

| Dial element | Live value |
|---|---|
| goal | `stats.target` |
| completed | `stats.done` (animated via the existing `displayDone`) |
| waiting | `stats.waiting` |
| funded but unassigned | `stats.coveredUnassigned` |
| total seats funded | `stats.totalFunded` |

The current page renders this with `recharts` (`PieChart` / `Pie` / `Cell`), already a dependency. Either restyle the recharts version to the new design or rebuild the dial as SVG following the prototype — **whichever produces a dial that is accurate and readable at 360 px.** Do not add a new charting library.

Numbers must be locale-formatted and must degrade gracefully while `stats` is still `null` (skeleton, not `NaN` and not `0`).

### Purpose — "Built to turn access into agency."
The three-panel section, plus the values strip. Copy from `translations.ts`.

### Sponsors — "Every sponsored seat is a start."
Bind to `getTopDonors`, both lists: companies (`donorType: "company"`) and individuals (`donorType: "individual"`), limit 10 each. Restyle the existing `DonorTable`. Empty list renders a designed empty state, never a bare table head.

### Participate — "Learn. Wait. Or open a seat."
The three path cards. **This is the critical wiring.**

| Prototype card | Prototype behaviour | Must become |
|---|---|---|
| "Pay & start" — `$1` | `<a href="https://aisyria.org/one-million-initiative-home">` / opens the stub `#pay-modal` | `onClick` → `setPayOpen(true)` → **`DirectPaymentDialog`** |
| "Join the waitlist" | external `<a>` | `onClick` → `setWaitlistOpen(true)` → **`WaitlistDialog`** |
| "Sponsor seats" | external `<a>` | `onClick` → `setDonateOpen(true)` → **`CorporateDonationDialog`** |

Every one of those external `https://aisyria.org/...` hrefs must be gone from the diff. They send visitors on a full page reload back to the page they are already on.

Delete the prototype's `#pay-modal` markup, its `pay-form`, its fake success view and its `data-pay-open` / `data-pay-close` handlers.

The three cards must be real buttons (or links with proper button semantics): keyboard-activatable, focus-visible, `aria-haspopup="dialog"`.

### Closing — "One million begins with one."
Closing call to action. Point it at whichever dialog the copy supports, or `/learning-management-system` if it is about starting to learn. Not an external `aisyria.org` link.

## Task 3 — The dialogs

Restyle the three dialogs so they read as part of the new dark design (they use the shared shadcn `Dialog` primitive — **restyle from outside via `.saae-v2` scoped CSS or a class prop, do not edit `src/components/ui/dialog.tsx`**).

**Do not change:** their fields, their validation, their submit handlers, the server functions they call, their success and error states, or their bilingual copy.

If a dialog renders in a portal outside the `.saae-v2` wrapper, the scoped tokens will not reach it. Handle that by putting the wrapper class on the dialog content itself — **not** by moving tokens to `:root`.

**If that fight cannot be won cleanly, leave the three dialogs in their current light styling and say so.** These dialogs open only from this one page. A light dialog on a dark page is a cosmetic mismatch on a single surface; a token moved to `:root` is a regression across the LMS, the attendance system and the admin console. Take the cosmetic mismatch every time.

---

## Responsive and RTL

- Correct at 360, 390, 768, 1024, 1280, 1440 px. No horizontal page scroll.
- The progress dial stays legible at 360 px — shrink the ring, keep the figures outside it if needed.
- The three path cards stack below 768; each stays a full, tappable target.
- The 3D tilt / hover effects on the path cards are pointer-only. On touch, the card must be immediately usable with no hover state required.
- Donor lists scroll inside their own container if they overflow — the page never scrolls sideways.
- Arabic: mirrored layout, `letter-spacing: normal` on headings, looser line-height. The dial's text labels mirror; the numerals follow whatever the existing site already does.

## Translation keys

Add the initiative chrome strings to `translations.ts` under both `en` and `ar`. The Arabic is in `initiative.js`'s `data-i18n` dictionary — read `reference/prototype/assets/js/initiative.js`.

**Where a string already exists in the live route, the live Arabic wins.**

---

## Acceptance criteria

- [ ] `bun run typecheck`, `bun run lint`, `bun run build` pass.
- [ ] The dial and all figures come from `getInitiativeStats` — **no hardcoded numbers** anywhere in the diff.
- [ ] Sponsor lists come from `getTopDonors`.
- [ ] All three path cards open the **real** dialogs. Verified by opening each one.
- [ ] `grep "aisyria.org"` in `src/routes/one-million-initiative-home.tsx` returns nothing except inside `head()` metadata.
- [ ] The prototype's `#pay-modal` stub does not exist in the source.
- [ ] `src/lib/initiative.functions.ts` shows zero changes.
- [ ] The three dialogs' fields, validation and submit logic show zero changes — styling only.
- [ ] No file under `src/components/ui/` was modified.
- [ ] `head()` unchanged.
- [ ] `git diff src/styles.css` still shows only the single Phase-0 `@import`.
- [ ] `/one-million-initiative`, `/one-million-initiative-donors` and `/initiative/claim` are visually and behaviourally **unchanged**.
- [ ] Correct in English and Arabic at 360 px and 1440 px.
- [ ] The chatbot launcher is visible.

## Report back

Files changed, confirmation each of the three dialogs opens and submits as before, the stats fields bound, and how you handled the dialog portal / token scoping.
