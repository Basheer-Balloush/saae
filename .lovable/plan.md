## Scope
Update only `src/routes/admin.login.tsx`. No changes to auth logic, other login pages, or shared components.

## Changes

### 1. Association logo above the form
- Reuse existing lang/theme-aware logo assets from `src/components/site/Navbar.tsx`: `saae-logo-en-light.png`, `saae-logo-en-dark.png`, `saae-logo-ar-light.png`, `saae-logo-ar-dark.png` (fallback: `saae-logo-horizontal.png`).
- Pick the matching one based on current `lang` (from `useLang`) and `theme` (from `useTheme`), which are already imported.
- Render centered above the `<h1>Admin Sign in</h1>` title inside the card, using a responsive height (`h-12 sm:h-14`), `w-auto`, `object-contain`, `mx-auto`, with margin below for spacing.
- Alt text: `"Syrian Association for AI & Entrepreneurship"` (EN) / `"الجمعية السورية للذكاء الاصطناعي وريادة الأعمال"` (AR).

### 2. Show/hide password toggle
- Add local `const [showPassword, setShowPassword] = useState(false);`.
- Wrap the password `<Input>` in a `relative` container. Keep the `Input`'s `value`, `onChange`, `required`, `autoComplete="current-password"`, `id="password"` untouched — only flip `type` between `"password"` and `"text"`.
- Add right-side padding on the input (`pr-10` in LTR, `pl-10` in RTL) so text never overlaps the icon. RTL handled via `dir` from `useLang`: use `pe-10` (logical padding-inline-end) so it works in both directions.
- Add `Eye` and `EyeOff` icons from `lucide-react` (already used in the file for other icons).
- Toggle button:
  - `type="button"` (never submits).
  - Absolutely positioned to the inline-end (`end-2 top-1/2 -translate-y-1/2`) so it mirrors correctly in RTL.
  - `aria-pressed={showPassword}`.
  - `aria-label` bound to translated strings `showPassword` / `hidePassword` added to the `T` dict (EN: "Show password" / "Hide password"; AR: "إظهار كلمة المرور" / "إخفاء كلمة المرور").
  - Uses shadcn `Button` `variant="ghost" size="icon"` for consistent focus ring + keyboard support.
  - `tabIndex` left default; visible focus comes from the shared Button component.

### Translation additions
Add `showPassword` and `hidePassword` keys to both `T.en` and `T.ar`.

### Behavior preserved
- No changes to `schema`, `onSubmit`, `signInWithPassword` call, redirect `useEffect`, toast messages, submitting state, or Enter-to-submit.
- Autocomplete stays `current-password`.
- Password stays hidden on load.

## Files changed
- `src/routes/admin.login.tsx` (only)

## Verification
- `bunx tsgo --noEmit` (typecheck).
- Manual: load `/admin/login`, confirm logo swaps with lang/theme, toggle shows/hides password without clearing it, Enter still submits, invalid creds still toast error, RTL mirrors icon to the left side.

## Assumptions
- Existing SAAE logos in `src/assets/` are the official association assets (already used site-wide in `Navbar`/`Footer`).
- No test suite exists for this route; no new tests added.

## Explicit non-changes
- `src/routes/attendance-management-system.login.tsx`, `src/routes/learning-management-system.login.tsx`, `learning-management-system.signup.tsx`, `learning-management-system.forgot-password.tsx`, `learning-management-system.reset-password.tsx` — untouched.
- No backend, Supabase config, RLS, or auth middleware changes.