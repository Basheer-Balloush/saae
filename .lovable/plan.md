
## Inspection report

### Current architecture
- Admin shell: `src/routes/admin.tsx` + `AdminSidebar.tsx` (top-level: Dashboard, News, Partners, Members, CRM group [Leads sub, Companies sub], Forms group [Initiative/Project + dynamic list], Initiative, Chatbot).
- Chatbot page (`admin.chatbot.tsx`) only renders `AdminChatbotSection` — it does NOT contain lead management. Leads already live under `/admin/crm/leads/{individuals,companies}` via `LeadsView`. No move required.
- Legacy hardcoded surveys: `InitiativeSurveyDashboard` and `EventSurveyDashboard` — data in `initiative_survey_responses` (145 rows) and `event_survey_responses` (40 rows). Registered in `src/lib/admin-forms-registry.tsx`.
- Dynamic forms already scaffolded: table `public.dynamic_forms` (0 rows), `public.dynamic_form_submissions`, server fns in `src/lib/dynamic-forms.functions.ts`, builder `DynamicFormBuilder.tsx`, submissions viewer `DynamicFormSubmissions.tsx`. Public route `/forms/$slug`.
- Current dynamic-forms create/edit lives at `/admin/crm/forms/new` and `.../edit` — mixed into CRM per the old spec.

### Database
- `dynamic_forms(id uuid PK, slug unique, name_ar/en, description_ar/en, submit_label_ar/en, status dynamic_form_status[draft|published], fields jsonb, created_by, timestamps)`.
- `dynamic_form_submissions(id, form_id → dynamic_forms.id ON DELETE CASCADE, values jsonb, field_snapshot jsonb, user_agent, submitted_at)`, indexed on `(form_id, submitted_at DESC)`.
- RLS: admin-only for management/read submissions; public insert requires `status='published'`; public read only for published forms.

### Gaps vs. request
1. No top-level "Forms" management page — mixed into CRM.
2. Status enum lacks `hidden` and `archived`.
3. `ON DELETE CASCADE` on submissions FK silently destroys history — violates Part 4.
4. No submissions count surfaced in list, no lifecycle actions (hide/archive), no safeguarded delete.
5. Legacy surveys are hardcoded; safe to keep as legacy read-only entries in CRM > Forms tab strip (their tables cannot be reshaped into `dynamic_form_submissions` without data risk and are out of scope for "Forms Management").
6. Sidebar CRM group currently exposes a "Forms" child that duplicates the intended split.

### Migration (single migration)
- `ALTER TYPE dynamic_form_status ADD VALUE 'hidden'; ADD VALUE 'archived';`
- Drop existing FK on `dynamic_form_submissions.form_id`; recreate `ON DELETE RESTRICT` so deletion cannot silently wipe history.
- Keep RLS as-is (public insert already gated to `published`, so hidden/archived reject new submissions automatically).

### Implementation plan (staged)

**Stage 1 — DB + shared types**
- Migration above.
- Extend `DynamicForm.status` union in `src/lib/dynamic-forms.ts` to `'draft'|'published'|'hidden'|'archived'` and update Zod schema.

**Stage 2 — Server functions** (`src/lib/dynamic-forms.functions.ts`)
- `listDynamicForms` → also return `submissions_count` (single grouped query).
- `setDynamicFormStatus({ id, status })` — admin-only status transitions.
- `deleteDynamicForm({ id, deleteSubmissions?: boolean })` — count submissions; refuse when >0 unless `deleteSubmissions:true` (explicit flag); when true, delete children first then the form.

**Stage 3 — Forms Management (top-level)**
- New routes: `src/routes/admin.forms.tsx` (layout+list), `admin.forms.new.tsx` (create), `admin.forms.$formId.edit.tsx` (edit by immutable UUID, not slug).
- List view mirrors News table (`admin.index.tsx`): columns Name (AR/EN), Slug, Status badge, Submissions count, Updated, Created, Actions (Edit / Publish↔Hide toggle / Archive / Delete-with-confirm / View Data).
- "View Data" links to `/admin/crm/forms/$formSlug`.
- Delete dialog shows submission count; blocks default delete when >0; separate "Delete form and N submissions" destructive path.
- Sidebar: add top-level "Forms" entry (icon `FileText`) between Members and CRM. Remove Forms group from CRM in sidebar.

**Stage 4 — CRM > Forms (submissions only)**
- Keep `admin.crm.forms.tsx` layout but strip create/edit buttons and route links; tab strip = legacy registry entries (initiative-survey, event-survey) + dynamic_forms rows filtered to statuses admin should see (draft/published/hidden/archived — all visible in CRM tab list for review; label archived/hidden with badges).
- Delete `admin.crm.forms.new.tsx` and `admin.crm.forms.$formSlug.edit.tsx`; add redirects to new `/admin/forms/...` equivalents.
- `admin.crm.forms.$formSlug.tsx` continues to resolve legacy registry first, then dynamic_forms — unchanged for isolation guarantee (query filters strictly by form UUID).
- Enhance `DynamicFormSubmissions.tsx`: add text search (across values), date-range filter, sort, refresh, "View full response" dialog already present, keep `.xlsx` export (already uses `exportRowsToXlsx` with formula-injection guard).

**Stage 5 — Redirects & polish**
- `/admin/crm/forms/new` → redirect `/admin/forms/new`.
- `/admin/crm/forms/:slug/edit` → redirect `/admin/forms/{id}/edit` (resolve slug → id first; fall back to list).
- Public `/forms/$slug` unchanged; already blocks non-`published` forms via server fn.

### Files touched
- MIG: `supabase/migrations/*_forms_lifecycle.sql`
- ADD: `src/routes/admin.forms.tsx`, `admin.forms.new.tsx`, `admin.forms.$formId.edit.tsx`
- EDIT: `src/lib/dynamic-forms.ts`, `dynamic-forms.functions.ts`, `src/components/admin/AdminSidebar.tsx`, `src/routes/admin.crm.forms.tsx`, `src/components/admin/crm/DynamicFormSubmissions.tsx`, `src/components/admin/crm/DynamicFormBuilder.tsx` (route back to /admin/forms after save).
- REMOVE/redirect: `admin.crm.forms.new.tsx`, `admin.crm.forms.$formSlug.edit.tsx`.

### Out of scope / assumptions
- Not backfilling legacy `initiative_survey_responses`/`event_survey_responses` into `dynamic_form_submissions` (destructive, unwarranted). Legacy surveys stay as hardcoded dashboards inside CRM > Forms tabs but are NOT manageable from Forms Management — this matches "do not remove existing form submissions" and "reuse existing dashboards".
- No File-upload field type added (would need storage bucket + RLS). Current supported types stay: short/long text, email, number, date, select, radio, checkbox_group, single_checkbox. Adding File requires a follow-up.
- Slug-history/redirect table not added; slug changes update the record and existing submissions remain linked by UUID (Part 3 acceptance).

Proceeding to implement all stages in one pass once approved.
