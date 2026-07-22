# Dynamic Form Builder

Enables admins to create bilingual (AR/EN) forms without code changes. Each published form is reachable at a stable `/forms/<slug>` public URL. Reuses the existing admin auth (`requireAdminBeforeLoad` + `has_role('admin')`), the CRM > Forms module, shadcn/ui components, i18n via `useLang`, and RTL/LTR conventions already in the project.

## Data model (new tables)

**`dynamic_forms`**
- `id uuid PK`
- `slug text UNIQUE NOT NULL` (lowercase alphanumeric + hyphens; server-enforced)
- `name_ar text NOT NULL`, `name_en text NOT NULL`
- `description_ar text`, `description_en text`
- `submit_label_ar text NOT NULL`, `submit_label_en text NOT NULL`
- `status text NOT NULL DEFAULT 'draft' CHECK IN ('draft','published')`
- `fields jsonb NOT NULL DEFAULT '[]'` — ordered array of field configs (stable `id` per field)
- `created_by uuid REFERENCES auth.users`, `created_at`, `updated_at`

**`dynamic_form_submissions`**
- `id uuid PK`
- `form_id uuid REFERENCES dynamic_forms(id) ON DELETE CASCADE`
- `values jsonb NOT NULL` — `{ <fieldId>: value }` keyed by stable field id
- `field_snapshot jsonb NOT NULL` — copy of the form's `fields` at submit time, so historical submissions stay readable if the form is later edited
- `submitted_at timestamptz DEFAULT now()`
- `user_agent text`, `ip inet` (best-effort metadata)

## Field types (minimal coherent set)

`short_text`, `long_text`, `email`, `number`, `select` (options[]), `radio` (options[]), `checkbox_group` (options[]), `single_checkbox` (consent), `date`. Each field: `{ id, type, label_ar, label_en, required, placeholder_ar?, placeholder_en?, options?: [{value,label_ar,label_en}] }`. Validated both client-side (zod) and via a Postgres trigger before insert.

## Slug rules

- Normalize to `[a-z0-9-]+`, no leading/trailing/duplicate hyphens.
- Reserved list: `admin`, `api`, `auth`, `learning-management-system`, `attendance-management-system`, `contact`, `about`, `news`, `communities`, `initiative-survey`, `event-survey`, `one-million-initiative`, `one-million-initiative-home`, `one-million-initiative-donors`, `registration`, `resources`, `super-admin`, `sitemap.xml`, `forms`.
- Uniqueness enforced by DB unique index + server-side check with clear AR/EN error.
- Auto-suggested from English name; editable.
- On published-form slug change: modal warns "existing links will break" and requires confirmation.

## Access control

- **Admin write/read all**: server functions using `requireSupabaseAuth` + `has_role(auth.uid(),'admin')` check. RLS: admins can SELECT/INSERT/UPDATE/DELETE via `has_role`.
- **Public read published only**: RLS policy `TO anon, authenticated USING (status = 'published')` on `dynamic_forms`.
- **Public insert submissions**: RLS policy on `dynamic_form_submissions` allowing INSERT only when the referenced form is published; server function validates payload against field spec.
- **Submissions read**: admin only.

## Files

**New (migration + server fns + admin UI + public page):**
- `supabase/migrations/*` — the two tables, RLS, GRANTs, slug-normalization + validation triggers.
- `src/lib/dynamic-forms.ts` — shared types, zod schemas, slug normalizer, reserved-slug list, field validator.
- `src/lib/dynamic-forms.functions.ts` — `listForms`, `getFormById`, `getFormBySlug` (public), `createForm`, `updateForm`, `deleteForm`, `submitForm` (public), `listSubmissions` (admin).
- `src/components/admin/crm/DynamicFormsList.tsx` — list in Forms tab bar with "Create form" button.
- `src/components/admin/crm/DynamicFormBuilder.tsx` — create/edit form (bilingual meta, slug editor with published-change warning dialog, drag-to-reorder fields, per-field editor for each type).
- `src/components/admin/crm/DynamicFormSubmissions.tsx` — table + detail view + xlsx export via existing `admin-xlsx-export.ts`.
- `src/routes/admin.crm.forms.new.tsx` — create page.
- `src/routes/admin.crm.forms.$formSlug.edit.tsx` — edit page.
- `src/routes/forms.$slug.tsx` — public bilingual form renderer + submit + success/error states + notFound for draft/missing.

**Modified:**
- `src/lib/admin-forms-registry.tsx` — extend registry so DB-backed dynamic forms auto-populate the CRM > Forms tabs (query on mount; static entries remain for `initiative-survey` and `event-survey`).
- `src/routes/admin.crm.forms.tsx` — render dynamic-forms list + "Create form" CTA alongside static tabs; keep existing tab logic.
- `src/routes/admin.crm.forms.$formSlug.tsx` — when slug is not a static entry, resolve from DB and render `DynamicFormSubmissions` + "Edit form" affordance.
- `src/components/admin/AdminSidebar.tsx` — no changes needed (Forms group already lists static entries; dynamic ones appear as tabs inside `/admin/crm/forms`).

## Verification

- `tsgo` typecheck.
- Manual: create draft → confirm `/forms/<slug>` returns notFound; publish → confirm loads; submit → confirm row appears in admin submissions; edit field labels → confirm old submissions still render via `field_snapshot`; attempt duplicate/reserved/unsafe slug → clear error; attempt non-admin access to admin routes → redirect.

## Out of scope / assumptions

- No slug-history redirect table (project has none for courses/articles either); the confirmation dialog documents the break.
- Drag-reorder uses simple up/down buttons (no new dependency) unless a DnD lib is already present.
- The two existing hard-coded surveys (`initiative-survey`, `event-survey`) remain code-based; new forms use the dynamic system.
