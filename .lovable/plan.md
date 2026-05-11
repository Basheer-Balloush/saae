# Attendance Management System — Isolated PWA + Own Auth

## Goal

Build the Attendance Management System (AMS) as a **self-contained section** of the project that:
- lives entirely under `/attendance-management-system/*`
- has its **own login** and its own user pool (independent from the CMS admin)
- looks like the CMS visually (same design tokens from `src/styles.css`)
- is installable as a **PWA scoped only to this section** (the public site & CMS are NOT PWA)
- has **no cross-links** to the rest of the site (no shared navbar, no link from CMS, no link back to the main site)

Sections inside AMS are intentionally left blank — they will be added later.

## Important caveat about PWA in Lovable

Service workers do not behave well inside Lovable's editor preview (iframe + stale caches). To stay safe:
- The service worker will be **disabled in dev / preview / iframe** contexts.
- PWA install + offline behavior will only be active on the **published URL**.
- Inside the editor preview, AMS will still work as a normal web page; it just won't be "installable" there.

If you want the install prompt to show in preview too, we'd have to accept the stale-cache risk — not recommended.

## Architecture

### 1. Routes (file-based, isolated subtree)

```text
src/routes/
  attendance-management-system.tsx              -> layout for the whole AMS (own <Outlet/>, own shell, NO main-site Navbar/Footer)
  attendance-management-system.index.tsx        -> blank dashboard placeholder
  attendance-management-system.login.tsx        -> AMS sign-in page
  _ams-auth.tsx                                 -> pathless auth guard layout (optional pattern)
```

The layout file renders its own minimal header (logo/title + sign-out) and an `<Outlet />`. No `Navbar`, no `Footer`, no `AssistantFab` here. (We'll conditionally hide `AssistantFab` on AMS routes.)

The existing `/super-admin` dashboard tile and any other cross-link to AMS will be removed so nothing in the main site points at it.

### 2. Auth model (independent, but on the same backend)

Lovable Cloud only has one `auth.users` table, so true "separate auth DB" isn't possible without a second project. The standard pattern for an isolated tenant is:

- Reuse Supabase Auth (email + password), but **scope access via a role**.
- Add a new role to the existing `app_role` enum: **`attendance_user`** (and later we can add `attendance_admin` when needed).
- AMS routes only let users in whose `user_roles` row has `attendance_user` (or `attendance_admin`).
- The existing CMS `admin` role gives **no** access to AMS, and vice-versa. They're completely orthogonal.
- AMS login page lives at `/attendance-management-system/login` and only redirects within AMS — it never sends users to `/admin`.

Signup: disabled from the UI for now (sections to come later will define how users get provisioned). Users will be created by you / a future admin via the backend.

### 3. PWA setup (scoped to AMS only)

- Add `vite-plugin-pwa` with:
  - `scope: "/attendance-management-system/"`
  - `start_url: "/attendance-management-system/"`
  - `display: "standalone"`
  - `name: "Attendance Management System"`, short name `"AMS"`
  - icons (we'll generate a simple icon set, 192/512, maskable)
  - `devOptions.enabled: false`
  - `navigateFallbackDenylist` excluding `/`, `/admin/*`, `/news/*`, `/communities/*`, `/api/*`, `/about`, etc. so the SW never claims main-site navigations
  - `runtimeCaching` using `NetworkFirst` for HTML
- Service worker registration is **guarded**: only registers when
  - `window.self === window.top` (not in iframe)
  - hostname is not a Lovable preview host (`id-preview--*`, `lovableproject.com`)
  - current path starts with `/attendance-management-system/`
- A `<link rel="manifest">` is injected only on AMS routes (via the route's `head()`), so the main site doesn't advertise the manifest.

### 4. Design palette

All shadcn tokens (`--background`, `--primary`, `--card`, etc.) and fonts already live in `src/styles.css` and are global. AMS will reuse them directly — same buttons, inputs, cards, toasts. The visual difference will be:
- AMS has its own minimal header (no community/news nav)
- Layout colors / spacing follow the same CMS admin look

No new color tokens needed.

## Files to create / change

**New**
- `src/routes/attendance-management-system.tsx` — AMS layout with own header + `<Outlet />`
- `src/routes/attendance-management-system.index.tsx` — blank dashboard placeholder ("Coming soon — sections will be added")
- `src/routes/attendance-management-system.login.tsx` — email/password sign-in, role check, redirect to AMS index
- `src/hooks/useAmsAuth.ts` — session + role check for `attendance_user` / `attendance_admin`
- `src/lib/pwa-register.ts` — guarded SW registration helper
- `public/ams-icon-192.png`, `public/ams-icon-512.png` — PWA icons (generated)

**Changed**
- `src/routes/attendance-management-system.tsx` replaces the current single-file blank page
- `vite.config.ts` — add `vite-plugin-pwa` with AMS-scoped config
- `src/components/site/AssistantFab.tsx` (or where it's mounted in `__root.tsx`) — hide on AMS routes
- `src/routes/super-admin.tsx` — remove the "Attendance Management System" tile so nothing links into AMS from the main site (current super-admin page links to both systems; per the new requirement, AMS must be unreachable from the rest of the site)
- DB migration: add `'attendance_user'` (and `'attendance_admin'`) to the `app_role` enum + RLS-friendly policies if/when AMS tables come later

**Deleted**
- `src/routes/attendance.tsx` if any leftover (already renamed earlier — verify)

## Backend migration (preview)

```sql
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'attendance_user';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'attendance_admin';
```

No new tables yet — those come with the future sections.

## Out of scope for this step

- Actual attendance features (check-in/out, employees, reports, schedules) — you'll provide these later.
- User signup UI for AMS — for now users are provisioned by you via the backend.
- Push notifications, background sync.
- A standalone subdomain (would require a second Lovable project).

## Open questions before implementing

1. **Initial AMS user**: do you want me to set you up an AMS account during this step (email you provide + temporary password), or wait until the sections are defined?
2. **Logo/icon for the PWA**: generate a simple placeholder icon now, or leave a plain colored tile until you provide one?
3. **Super-admin page**: confirm I should remove the AMS tile from `/super-admin` so nothing in the existing site points to AMS.
