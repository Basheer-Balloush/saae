
## Current state (verified)

- **Leads** live inside `AdminChatbotSection.tsx` as the `"leads"` subtab (`LeadsPanel`), backed by `listLeads` in `src/lib/admin-chat.functions.ts` reading `public.individual_leads` and `public.company_leads`. Filters/pagination are minimal (single fetch, client-side render).
- **Form submissions** live in two hardcoded admin routes:
  - `/admin/initiative-survey` → `src/routes/admin.initiative-survey.tsx` → `public.initiative_survey_responses`
  - `/admin/event-survey` → `src/routes/admin.event-survey.tsx` → `public.event_survey_responses`
  Each has its own table, search, filters, detail modal, CSV/Excel export.
- Sidebar (`src/components/admin/AdminSidebar.tsx`) already has a "Forms" group with the two surveys hardcoded as children, and a "Chatbot" leaf.
- Admin routes are file-based under `src/routes/admin.*.tsx`. Auth gate is `requireAdminBeforeLoad` (`admin` or `lms_admin`) — reuse as-is.
- No `forms` registry table exists. No shared submissions table. Every form today = one dedicated table + one bespoke admin page.

## Assumption about "dynamic form tabs"

The spec asks new future forms to appear automatically. Since each existing form is a bespoke table + page (no admin form-builder that persists a schema), truly generic auto-discovery is not achievable without building a form-builder — out of scope. I will make the tab list **data-driven from a single in-code registry** (`src/lib/admin-forms-registry.ts`) so adding a future form = one entry + its page component, no sidebar/route edits. Please flag if you instead want me to design a `public.admin_forms` metadata table now.

## Changes

### 1. Sidebar: introduce CRM group, remove Leads from Chatbot
`src/components/admin/AdminSidebar.tsx`:
```
CRM (Users icon)
  ├── Leads (submenu handled inside the CRM pages, or as sub-children)
  │     ├── Individuals  → /admin/crm/leads/individuals
  │     └── Companies    → /admin/crm/leads/companies
  └── Forms
        ├── Initiative Survey → /admin/crm/forms/initiative-survey
        └── Project Survey    → /admin/crm/forms/event-survey
```
Remove the old top-level "Forms" group. Keep Chatbot leaf. Nav children generated from the forms registry (`.map`) so future forms appear automatically.

### 2. New routes (file-based)
- `src/routes/admin.crm.tsx` — layout `<Outlet />` (guarded, noindex).
- `src/routes/admin.crm.index.tsx` — redirects to `/admin/crm/leads/individuals`.
- `src/routes/admin.crm.leads.tsx` — layout with Individuals / Companies tabs.
- `src/routes/admin.crm.leads.individuals.tsx` — extracts the individual-leads table from `LeadsPanel`.
- `src/routes/admin.crm.leads.companies.tsx` — extracts the company-leads table from `LeadsPanel`.
- `src/routes/admin.crm.forms.tsx` — layout listing form tabs from registry.
- `src/routes/admin.crm.forms.index.tsx` — redirects to first registry entry.
- `src/routes/admin.crm.forms.$formSlug.tsx` — resolves slug → registry entry → renders that form's dashboard component; `notFound()` for unknown slug.

### 3. Extract reusable pieces
- Move the individual/company lead tables out of `AdminChatbotSection.tsx` into `src/components/admin/crm/IndividualLeadsTable.tsx` and `CompanyLeadsTable.tsx` (same query via `listLeads`, same columns/actions — pure lift). Remove the `"leads"` subtab from `AdminChatbotSection` and its translation strings.
- Extract the survey dashboard bodies from `admin.initiative-survey.tsx` / `admin.event-survey.tsx` into `src/components/admin/crm/InitiativeSurveyDashboard.tsx` and `EventSurveyDashboard.tsx` (same queries, filters, exports, modals). Old route files become thin redirects to the new CRM URL.

### 4. Forms registry
`src/lib/admin-forms-registry.ts`:
```ts
export type AdminFormEntry = {
  slug: string;                       // URL segment
  labelAr: string; labelEn: string;
  Component: React.ComponentType;     // dashboard renderer
};
export const ADMIN_FORMS: AdminFormEntry[] = [
  { slug: "initiative-survey", labelAr: "استبيان المبادرة", labelEn: "Initiative Survey", Component: InitiativeSurveyDashboard },
  { slug: "event-survey",      labelAr: "استبيان المشاريع", labelEn: "Project Survey",    Component: EventSurveyDashboard },
];
```
Sidebar Forms children and `$formSlug` route both iterate this list.

### 5. Redirects (no broken bookmarks)
Old routes → new CRM URLs via `beforeLoad: () => { throw redirect({ to: "..." }) }`:
- `/admin/initiative-survey` → `/admin/crm/forms/initiative-survey`
- `/admin/event-survey` → `/admin/crm/forms/event-survey`
- Dashboard cards in `admin.dashboard.tsx` updated to new URLs.
- `AdminHeader` TITLES map gets the new paths.

### 6. Permissions & data
- Every new route uses `requireAdminBeforeLoad` — identical gate.
- No DB migration. No table rename. No data movement. `listLeads`, `individual_leads`, `company_leads`, `initiative_survey_responses`, `event_survey_responses` untouched.

## Files touched

Created:
- `src/routes/admin.crm.tsx`, `admin.crm.index.tsx`, `admin.crm.leads.tsx`, `admin.crm.leads.individuals.tsx`, `admin.crm.leads.companies.tsx`, `admin.crm.forms.tsx`, `admin.crm.forms.index.tsx`, `admin.crm.forms.$formSlug.tsx`
- `src/components/admin/crm/IndividualLeadsTable.tsx`, `CompanyLeadsTable.tsx`, `InitiativeSurveyDashboard.tsx`, `EventSurveyDashboard.tsx`
- `src/lib/admin-forms-registry.ts`

Modified:
- `src/components/admin/AdminSidebar.tsx` — add CRM group from registry, drop old Forms group
- `src/components/admin/AdminChatbotSection.tsx` — remove Leads subtab + strings
- `src/routes/admin.initiative-survey.tsx`, `admin.event-survey.tsx` — replaced with redirect stubs
- `src/routes/admin.dashboard.tsx` — updated card URLs
- `src/components/admin/AdminHeader.tsx` — TITLES entries for new paths

## Verification
- `bunx tsgo --noEmit`
- Manual: visit `/admin/crm/leads/individuals`, `/admin/crm/leads/companies`, `/admin/crm/forms/initiative-survey`, `/admin/crm/forms/event-survey`, unknown slug (404), old URLs (redirect), Chatbot no longer shows Leads, exports/filters still work, RTL/EN sidebar labels correct.

## Open question
Confirm the in-code forms registry is acceptable (fast, type-safe, no DB). If you need admins to create forms from the UI and have new tabs appear without a code change, that's a separate form-builder feature — say the word and I'll plan it.
