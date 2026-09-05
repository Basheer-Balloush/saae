# Phase 4 — `/contact`

**Do Phases 0–3 first.**

This page has a **working form that writes to the database and feeds the admin CRM.** The prototype's form is decorative — it has no backend and is missing a required field. The visual design migrates; the data contract does not change.

---

## NON-NEGOTIABLES (full list in `docs/migration/INVARIANTS.md`)

1. **Never touch `:root`, `.dark`, or `@theme` in `src/styles.css`.** New styles scoped under `.saae-v2`, tokens prefixed `--v2-`.
2. **Do not modify** anything under `src/routes/learning-management-system*`, `attendance-management-system*`, `admin*`, `super-admin.tsx`, `api/`, `lovable/`, `src/components/{lms,ams,admin,ui}/`, `src/integrations/`, `src/lib/*.server.ts`, `supabase/migrations/`, `drizzle/`.
3. **No database changes.** `contact_messages` keeps its exact shape.
4. **The `zod` schema and the `supabase.from("contact_messages").insert(...)` call are the contract. Do not change field names, validation rules, or the insert payload.** Only the presentation around them changes.
5. **Keep the `LocalBusiness` JSON-LD** in the existing `head()`. The prototype has no metadata at all; losing this costs local search visibility.
6. **SSR safety** — `window` / `document` / observers only inside `useEffect`.

## Reference

- Design: `docs/migration/reference/prototype/contact.html` + `assets/css/contact.css` + `assets/js/contact.js`
- Token mapping: `docs/migration/reference/design-tokens.md` (contact.css's `--night: #04121a` and `--cyan: #5ed8e6` map onto the canonical set — do not carry them across)
- Bindings: `docs/migration/reference/data-binding-map.md`

---

## Files you may modify

```
src/routes/contact.tsx
src/styles/saae-v2.css          — add contact styles
src/lib/translations.ts         — add new keys only
```

Touch nothing else.

---

## Task 1 — Keep the contract

These stay exactly as they are in `src/routes/contact.tsx`:

- the `zod` `schema` object and every rule in it
- the `FormData` type
- the `inquiryLabels` bilingual record
- the `onSubmit` handler's validation, insert payload, `toast.success` / `toast.error` and `setSent` behaviour
- the whole `head()` export, including the `LocalBusiness` JSON-LD

## Task 2 — The field the prototype forgot

The prototype form has five inputs: `name`, `email`, `phone`, `context`, `subject`, `message`.

The live insert requires **`inquiry_type`** — a required enum the admin CRM filters and triages on. Without it, every enquiry arrives as an undifferentiated blob.

**Add a styled select**, designed to match the prototype's field treatment (same border, focus ring, label rhythm). Options and bilingual labels already exist in `inquiryLabels`:

| value | English | Arabic |
|---|---|---|
| `general` | General inquiry | استفسار عام |
| `individual` | Individual (training/learning) | فرد (تدريب/تعلّم) |
| `company` | Company | شركة |
| `partnership` | Partnership | شراكة |
| `training` | Staff training | تدريب موظفين |
| `media` | Media | إعلام |
| `other` | Other | أخرى |

Default: `general`. Use the existing shadcn `Select` from `src/components/ui/select` — **restyle it from outside via `.saae-v2` scoped CSS; do not edit the primitive.**

## Task 3 — Field mapping

Port the prototype's form layout and bind it to the existing state:

| Prototype input | Live field |
|---|---|
| `#f-name` | `full_name` |
| `#f-email` | `email` |
| `#f-phone` | `phone` (optional) |
| `#f-context` | `organization` (optional) |
| *(new)* | `inquiry_type` |
| `#f-subject` | `subject` |
| `#f-message` | `message` |

Note the prototype's `novalidate` on the form. **Keep the app's behaviour instead:** `__root.tsx` installs a global `invalid` handler that turns native validation into bilingual `sonner` toasts. Do not disable it, and do not add a second, competing validation layer.

Keep `dir="ltr"` on the email and phone inputs so those read correctly inside an Arabic page.

## Task 4 — Direct lines and the rest of the page

Port the "Reach us the way you prefer" block. **Values come from the live route, not the prototype**, though in this case they already agree:

- `info@aisyria.org` — `mailto:` link
- `+963 930 763 547` — `tel:+963930763547`, `dir="ltr"`
- Damascus, beside the Ministry of Higher Education and Scientific Research
- Response time: within 48 hours
- Social links: Instagram, Facebook, LinkedIn — external, `target="_blank" rel="noopener noreferrer"`

The prototype's `#write` anchor is linked from the home page ("Ask about learning"). **Keep an element with `id="write"` on the form** so those links keep working. `ScrollToHash` in `__root.tsx` already handles the scrolling.

Ignore `reference/prototype/assets/images/contact-prototypes/` — those are design mockups, not page assets.

## Task 5 — Success state

The prototype has no success state. The live route sets `sent` and shows a confirmation. Design a success view in the new visual language:

- confirms the message was sent, bilingually
- keeps the `sonner` toast as well
- offers a way back (send another / return home)
- does not clear the page to nothing

---

## Responsive and RTL

- Correct at 360, 390, 768, 1024, 1280, 1440 px. No horizontal page scroll.
- Below 768 the two-column form stacks; inputs go full width; the submit button is full width and at least 44 px tall.
- Inputs are at least 16 px on iOS or Safari zooms the page on focus.
- Labels are real `<label for>` elements, not placeholders.
- Visible focus rings on every control — do not remove outlines without replacing them.
- Arabic: the form mirrors, but email and phone inputs keep `dir="ltr"`. The submit arrow flips direction.

## Translation keys

Add only the new chrome strings for this page (section eyebrows, headings, field labels, the submit label, the success copy) from `chrome-dictionary-ar-en.md`. `inquiryLabels` already exists — reuse it, do not duplicate it.

---

## Acceptance criteria

- [ ] `bun run typecheck`, `bun run lint`, `bun run build` pass.
- [ ] A submitted message **lands in `contact_messages`** with all seven fields populated, `inquiry_type` included.
- [ ] The `zod` schema and the insert payload are unchanged in the diff.
- [ ] Validation errors surface as bilingual toasts, as before.
- [ ] The `LocalBusiness` JSON-LD and the rest of `head()` are unchanged.
- [ ] `/contact#write` scrolls to the form.
- [ ] `git diff src/styles.css` still shows only the single Phase-0 `@import`.
- [ ] No file under `src/components/ui/` was modified.
- [ ] Correct in English and Arabic at 360 px and 1440 px; no iOS zoom-on-focus.
- [ ] The chatbot launcher is visible.
- [ ] `/`, `/about`, `/news`, `/partners` and the LMS are unchanged.

## Report back

Files changed, confirmation the insert contract is untouched, and the result of one real end-to-end submission.
