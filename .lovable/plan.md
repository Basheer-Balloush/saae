# Admin Dashboard — Sidebar Navigation Refactor

Pure UI/navigation refactor. No changes to backend, routes, RLS, auth, permissions, or business logic. All existing pages remain reachable at their current URLs.

## Current state (verified)

- Top nav lives inline in `src/routes/admin.index.tsx` as pill buttons switching a local `tab` state between: News, Members, Chatbot, Partners.
- Sibling admin routes exist as separate pages: `/admin/initiative`, `/admin/initiative-survey`, `/admin/event-survey`.
- There is **no existing** CRM, Leads, Contacts, Organizations, Activities, Notes, Communication History, Follow-ups, Form Builder, Analytics, Roles, Permissions, or Settings module in the codebase.

## Scope decision (important)

The spec lists modules that don't exist yet (CRM sub-pages, Form Builder, Roles/Permissions, etc.). This plan is a **navigation architecture refactor only** — it will not invent new feature pages. The sidebar will expose the modules that map to existing functionality; groups the spec mentions that have no backing page will be **omitted** from the sidebar for now (not shown as dead links). When those features get built later, they slot into the already-defined groups.

If you want empty placeholder pages for the missing items ("coming soon"), say so and I'll add them — otherwise they stay out.

## Sidebar module mapping (existing pages only)

- **Dashboard** → `/admin` (overview: keep News table here as the landing view, or make it a small stats page — see Question below)
- **News** → `/admin` News tab (extracted into `/admin/news` sub-route OR kept as tab, see Question)
- **Partners** → Partners tab
- **Members** → Members tab
- **Forms** (group)
  - Initiative Survey → `/admin/initiative-survey`
  - Event Survey → `/admin/event-survey`
- **Initiative** → `/admin/initiative` (Million Initiative admin)
- **Chatbot** → Chatbot tab
- **Settings** → omitted (no page exists)
- **CRM** → omitted (no page exists)

Order in sidebar: Dashboard, News, Partners, Members, Forms, Initiative, Chatbot.

## Implementation

1. **New `AdminLayout`** at `src/routes/admin.tsx` (parent layout route) rendering `<Outlet />` with:
   - shadcn `SidebarProvider` + custom `AdminSidebar` component
   - Minimal top header: sidebar toggle, page title, language switcher, user menu (search/notifications omitted — no backing data)
   - Content area with automatic offset via SidebarProvider CSS vars
2. **`AdminSidebar` component** (`src/components/admin/AdminSidebar.tsx`) using shadcn `Sidebar` primitives:
   - `collapsible="icon"` (72px collapsed / 260px expanded via `--sidebar-width` CSS vars)
   - Uses `w-[var(--sidebar-width)]` explicit syntax (Tailwind v4 fix)
   - `localStorage` persistence of collapsed state via controlled `open` prop
   - Lucide icons per item; tooltip on collapsed hover (built into shadcn `SidebarMenuButton`)
   - Active state via `useRouterState` pathname match: highlighted bg + start-side accent bar + bold + colored icon
   - Nested groups (Forms) use `SidebarMenuSub` with smooth expand
   - Mobile: shadcn Sidebar already renders as Sheet drawer with overlay + auto-close on nav
3. **Refactor `admin.index.tsx`**:
   - Remove the inline pill nav
   - Split the four tab bodies (News, Members, Chatbot, Partners) into their own route files: `admin.news.tsx`, `admin.members.tsx`, `admin.chatbot.tsx`, `admin.partners.tsx` — each imports the existing section components unchanged
   - `admin.index.tsx` becomes the Dashboard landing (keeps News list as the default view OR simple welcome — see Question)
   - Auth gate (`useEffect` redirect to `/admin/login`) moves into `admin.tsx` layout so it protects all children
4. **RTL**: shadcn Sidebar already flips via `dir="rtl"` on `<html>`; verify active-border side uses logical `border-s-*` utilities.
5. **Styling**: reuse existing design tokens (`--primary`, `--sidebar-*`); no new palette.

## Files touched

- New: `src/routes/admin.tsx`, `src/routes/admin.news.tsx`, `src/routes/admin.members.tsx`, `src/routes/admin.chatbot.tsx`, `src/routes/admin.partners.tsx`, `src/components/admin/AdminSidebar.tsx`, `src/components/admin/AdminHeader.tsx`
- Modified: `src/routes/admin.index.tsx` (strip nav + tabs, become dashboard landing), `src/routes/admin.initiative.tsx`, `src/routes/admin.initiative-survey.tsx`, `src/routes/admin.event-survey.tsx` (remove their own top headers so they render inside the shared layout)
- Untouched: all business logic, form dialogs, server functions, Supabase calls, `admin.login.tsx`, LMS admin routes (separate area)

## Out of scope (explicit)

- No CRM / Leads / Contacts / Organizations / Activities / Notes / Communication / Follow-ups module
- No Form Builder, Analytics, Published Forms, Responses pages
- No Roles / Permissions / System Settings UI
- LMS admin (`/learning-management-system/admin/*`) is a separate area — untouched

## Question before I build

1. **Dashboard landing** — should `/admin` become (a) a small stats overview page (news count, members count, etc.), or (b) keep it as the News list (rename sidebar "News" to point to `/admin` and drop "Dashboard")? I'll default to **(b)** — cleanest with zero new feature work — unless you say otherwise.
2. **Placeholder pages** for CRM / Forms Builder / Settings — add empty "coming soon" pages so the sidebar groups from your spec are visible, or omit them entirely? Default: **omit**.
