# Verify after each phase

Run this **after every phase, before you commit.** It takes about two minutes and it is what makes the three safety rules checkable rather than merely stated.

Do not skip it because a phase "looked fine". The failures this catches are invisible on the page you just built — they show up on the LMS, on the admin console, or on a page nobody opened for six phases.

---

## 1. Nothing outside the allowlist was touched

```bash
git diff --stat
```

Read every path in that list against the "Files you may create or modify" section of the phase you just ran. **Anything not on that list is a failure**, even if it looks harmless. Revert and re-run the prompt rather than patching over it.

## 2. The dark palette did not reach `:root`

This is the single most important check in the migration.

```bash
git diff src/styles.css
```

Across the **entire** migration, from Phase 0 to Phase 7, this file gains exactly one line:

```css
@import "./styles/saae-v2.css";
```

If you ever see a change inside `:root`, `.dark`, or `@theme` — stop, revert, re-run. A dark ground in `:root` reaches the LMS, the attendance system, the admin CRM, the super-admin console and every dialog in the application.

```bash
grep -n -- "--v2-" src/styles.css        # expect: no matches
```

## 3. The shared chrome was not edited

`Navbar.tsx` and `Footer.tsx` are imported by twelve routes, five of which keep the current light design.

```bash
git diff --stat src/components/site/Navbar.tsx src/components/site/Footer.tsx
```

Expect: **empty output**, in every phase.

## 4. Content and logic files were not rewritten

```bash
git diff --stat src/lib/about-content.ts \
                src/lib/initiative.functions.ts \
                src/integrations/ \
                src/components/ui/ \
                supabase/migrations/ \
                drizzle/
```

Expect: **empty output**, in every phase.

(Phase 5 is permitted to restyle the *presentation* inside the three files in `src/components/initiative/` — but their fields, validation and submit handlers must show no change. Read that diff rather than counting on it.)

## 5. Four URLs that catch a leak

Load these and confirm each has a **light background, the current navigation, and readable text**:

| URL | What a failure here means |
|---|---|
| `/learning-management-system/catalog` | `:root` leak, or the font change broke the highest-traffic student surface |
| `/admin/login` | `:root` leak into the authenticated console |
| `/communities/data` | a shared `site/` component was edited |
| `/resources/ai-tools` | `Navbar` or `Footer` was edited |

Four URLs, not ten. These are the four that catch every category of leak.

## 6. The page you just built

- English **and** Arabic.
- 360 px **and** 1440 px. No horizontal page scroll at either.
- The chatbot launcher (`AssistantFab`) is visible.
- Every list on the page shows **real data from Supabase**, not the prototype's placeholders.
- Navigation links move client-side — no full page reload.

## 7. Build

```bash
bun run typecheck
bun run lint
bun run build
```

---

## Then commit

**One commit per phase.** That is what makes any single phase revertable without unpicking the others.

```bash
git add -A
git commit -m "Phase N: <what it did>"
```

If a phase fails any check above, **revert rather than repair**:

```bash
git checkout -- .
```

and re-run the phase prompt. Patching a phase that went outside its lane tends to produce a diff nobody can review.
