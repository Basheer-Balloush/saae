## Corrected final plan

### Verified state (unchanged from prior revision)
- 34 individual_leads + 2 company_leads, 0 NULL `contact_id`.
- `crm_contact_identities` has `UNIQUE (identity_type, identity_value)`.
- Existing DB triggers `individual_leads_link_contact` / `company_leads_link_contact` already call `public.crm_upsert_contact(...)` on INSERT — so DB-side auto-linking exists but we still need a race-safe path for admin updates.
- RLS on all touched tables is admin-only via `has_role(auth.uid(),'admin')`.
- Status enum `crm_lead_status`: new/contacted/qualified/converted/archived.

---

### 1. Sidebar (`AdminSidebar.tsx`)
CRM group renders exactly:
- Leads → `/admin/crm/leads`
- LMS Students → `/admin/crm/students`
- Form submissions → `/admin/crm/forms`

Remove Contacts / Individual leads / Company leads entries. `crm_contacts` layer and `/admin/crm/contacts/*` routes remain reachable internally.

### 2. Routing
- `/admin/crm/` → redirect `/admin/crm/leads/individuals`.
- `/admin/crm/leads` layout with Individuals / Companies switch (existing).
- `/admin/crm/leads/individuals` and `/admin/crm/leads/companies` (existing lists).
- **NEW** `/admin/crm/leads/individuals/$leadId` and `/admin/crm/leads/companies/$leadId` (detail pages, per-record URL preserved).
- `/admin/crm/contacts` → redirect to `/admin/crm/leads/individuals`.
- `/admin/crm/contacts/$contactId` → **kept** (existing detail route + component unchanged). Reachable from lead detail via a "View contact profile" link.

### 3. Migration (required — for true transactional integrity)

Single migration `crm_leads_txn_rpcs.sql`:

**a. `public.crm_resolve_or_conflict(email text, phone text)`** — SECURITY DEFINER, admin-only.
Returns `{ contact_id uuid, conflict text }`. Normalizes with `crm_normalize_email`/`crm_normalize_phone`, then:
- Look up `email_contact := (SELECT contact_id FROM crm_contact_identities WHERE identity_type='email' AND identity_value = _email)` (independent).
- Look up `phone_contact` the same way (independent).
- Rules:
  - both null → `contact_id = NULL, conflict = NULL`
  - only one found → return that `contact_id`
  - both found and equal → return it
  - both found and different → return `contact_id = NULL, conflict = 'identity_conflict'` with both `contact_id`s in a second OUT param
  - only one side identity exists but the other value is present → return the found `contact_id` (no auto-attach; identity attachment happens explicitly in the create RPC below)

**b. `public.crm_create_individual_lead_tx(payload jsonb)`** — SECURITY DEFINER, admin-only. Wraps everything in a single transaction:
1. `assert has_role(auth.uid(),'admin')`.
2. Enforce **payload check**: `full_name` present AND at least one of `email`/`phone` present. Raise `missing_contact_method` otherwise.
3. Call `crm_resolve_or_conflict`. If `conflict = 'identity_conflict'` and payload does not include `override_conflict = true`, raise `identity_conflict` with both contact IDs (client surfaces a dialog for admin choice).
4. If `contact_id IS NULL`: `INSERT INTO crm_contacts (...) RETURNING id` — using payload's display_name/organization/status/contact_type='individual'. Set `created_by = auth.uid()`.
5. `INSERT INTO crm_contact_identities (contact_id, identity_type, identity_value)` for each present identity `ON CONFLICT (identity_type, identity_value) DO NOTHING`. Then re-select: if a conflicting row now points to a different `contact_id`, raise `identity_conflict` (loses cleanly — the transaction rolls back, no orphan contact stays because the whole tx is rolled back).
6. `INSERT INTO individual_leads (full_name, email, phone, specialty, work_field, address, short_description, source, status, contact_id, created_by) VALUES (..., v_contact_id, auth.uid()) RETURNING id`.
7. Return `jsonb_build_object('lead_id', v_lead, 'contact_id', v_contact_id)`.

The existing `individual_leads_link_contact` BEFORE-INSERT trigger sees `NEW.contact_id IS NOT NULL` and no-ops — no double linking.

**c. `public.crm_create_company_lead_tx(payload jsonb)`** — same shape; requires `company_name` + (`contact_email` OR `contact_phone`); `contact_type='company'`.

**d. `public.crm_update_individual_lead_tx(_lead_id uuid, payload jsonb)`** — SECURITY DEFINER, admin-only, single tx:
1. Assert admin. Load current row `FOR UPDATE`.
2. Apply patch to allowed columns (name, email, phone, specialty, work_field, address, short_description, source, status).
3. If `email` or `phone` changed AND the new value is non-null:
   - Call `crm_resolve_or_conflict` on the new pair.
   - If it resolves to a **different existing contact**, raise `identity_conflict` and roll back. Admin must explicitly re-link via a separate flow (out of scope for this pass — surfaced as an error).
   - If it resolves to `NULL` (no existing identity), insert the identity row `ON CONFLICT DO NOTHING` scoped to the current `contact_id`. **Do NOT overwrite `crm_contacts.primary_email/primary_phone/display_name/organization`** — canonical profile stays untouched (per correction #4). Only the lead row carries the new value.
4. `UPDATE individual_leads SET ... WHERE id = _lead_id`. Return updated row.

**e. `public.crm_update_company_lead_tx`** — analogous.

**f. `public.crm_set_lead_status_tx(_lead_type text, _lead_id uuid, _status crm_lead_status)`** — SECURITY DEFINER, admin-only, single tx:
1. Assert admin.
2. `UPDATE individual_leads|company_leads SET status = _status, updated_at = now() WHERE id = _lead_id RETURNING contact_id`.
3. **Do NOT mirror to `crm_contacts.status`** (per correction #3). Contact status is a separate, admin-managed field kept on the `crm_contacts` row itself and edited only from `/admin/crm/contacts/$contactId`. Documented in code + UI copy: "Lead status is per-lead. Contact profile status is separate and reflects overall relationship." No aggregation rule is added in this pass.
4. Return `{ ok: true, contact_id }`.

**g. `public.crm_add_lead_note_tx(_lead_type text, _lead_id uuid, _body text)`** — SECURITY DEFINER, admin-only:
1. Assert admin. Trim body; reject empty.
2. Resolve `contact_id` from the lead row. It is never NULL (existing trigger guarantees it on insert; new create RPC guarantees it).
3. `INSERT INTO crm_notes (contact_id, author_id, body) VALUES (v_contact_id, auth.uid(), _body) RETURNING id`.
4. Return `{ note_id, contact_id }`.

Grants: `GRANT EXECUTE ON FUNCTION ... TO authenticated;` for each. Each function starts with an explicit admin check so anon/non-admins get `forbidden`.

RLS on `individual_leads`/`company_leads`/`crm_notes` unchanged — SECURITY DEFINER bypasses RLS but the admin check inside each RPC guards writes.

### 4. Notes model = contact-level (documented, not changed)

`crm_notes.contact_id` is the only FK. **A note added from lead A appears on every other lead sharing the same contact and on `/admin/crm/contacts/$contactId`.** This is intentional (matches existing schema). The UI labels the section **"Contact history (shared across all leads for this contact)"** in AR + EN so admins are not surprised. Per-lead notes would need `crm_notes.lead_id` + type discriminator + RLS update — **not implemented in this pass; reported as an available follow-up**.

### 5. Activity timeline (correction #7)

On the lead detail page, timeline = union of:
- `crm_notes` for the resolved `contact_id`.
- `dynamic_form_submissions` **only where `contact_id = <same contact_id>`** — never inferred from name/email string matches.
- The originating lead itself (`created_at`).
- Chat conversation link when `individual_leads.conversation_id` / `company_leads.conversation_id` is set.

Sorted desc.

### 6. Server functions (`src/lib/crm.functions.ts`) — client-facing wrappers

All admin-gated via `requireSupabaseAuth` + `assertAdmin`. Each wraps the corresponding RPC via `context.supabase.rpc(...)`; no multi-statement business logic in JS:

- `listIndividualLeads({ search?, status?, source?, from?, to?, limit?, offset? })` — paginated server-side (ilike over full_name/email/phone/specialty/work_field). Returns `{ rows, total }`.
- `listCompanyLeads(...)` — ilike over company_name/contact_name/contact_email/contact_phone/work_field.
- `getIndividualLead({ leadId })` / `getCompanyLead({ leadId })` — returns lead row + linked `crm_contacts` snapshot + shared notes + timeline (per rules above) + conversation_id.
- `createIndividualLead(payload)` → RPC `crm_create_individual_lead_tx`. Surfaces `identity_conflict` with both contact ids so the UI can prompt.
- `createCompanyLead(payload)` → RPC `crm_create_company_lead_tx`.
- `updateIndividualLead({ leadId, patch })` → RPC `crm_update_individual_lead_tx`.
- `updateCompanyLead({ leadId, patch })` → RPC `crm_update_company_lead_tx`.
- `setLeadStatus({ leadType, leadId, status })` → RPC `crm_set_lead_status_tx`.
- `addLeadNote({ leadType, leadId, body })` → RPC `crm_add_lead_note_tx`.
- `listLeadNotes({ leadType, leadId })` — SELECT via contact_id (RLS admin-only already applies).
- `exportIndividualLeads(filters)` / `exportCompanyLeads(filters)` — **unpaginated** query with same filters, hard cap 10 000; if exceeded, return error asking admin to narrow filters. Never exports the current page only.

`admin-chat.functions.ts` loses its `listLeads` export (only LeadsView called it); chat fns stay chat-only.

### 7. LeadsView rewrite (`src/components/admin/crm/LeadsView.tsx`)

Preserved: Individuals/Companies segmented switch, per-variant distinct columns, per-variant filters.

Added:
- Toolbar: search (debounced 300 ms, server-side), Status Select, Source Select, from/to date range, Export xlsx, "New lead" button.
- Row actions: inline Status Select (calls `setLeadStatus`, optimistic + revert on error), Edit (opens `LeadFormDialog`), Add note (opens `LeadNoteDialog`), View chat (existing), View details (nav to new detail route).
- Server-side pagination (limit 50, offset).
- Export → calls export server fn, streams filtered result (cap 10 000), builds xlsx client-side via existing formula-injection-safe helper. Filename `leads-{variant}-{yyyy-mm-dd}.xlsx`.
- All labels bilingual through existing `T` map (ar+en), RTL-aware.

### 8. Lead detail page (`src/components/admin/crm/LeadDetail.tsx`, one component, `variant` prop)

Sections:
- Header: back link, name/company, per-lead Status Select, Edit button, View Chat (when conversation_id present, reuses existing dialog).
- Contact information (variant-specific fields).
- **"Contact history — shared across all leads for this contact"** panel: notes list + Add Note textarea (empty-body prevented; disabled while saving).
- Activity timeline (per rules in section 5).
- "View contact profile" link → `/admin/crm/contacts/$contactId` for the aggregate view (unchanged component).

### 9. Dialogs

- `LeadFormDialog.tsx` — variant-aware create/edit:
  - Client-side validation enforces the same rule as the RPC: individual requires `full_name` + (`email` OR `phone`); company requires `company_name` + (`contact_email` OR `contact_phone`). If missing → block submit with inline errors, preserve entered values.
  - On `identity_conflict` from server: modal shows "Email points to contact A, phone to contact B" with links to open each and no auto-resolution.
  - Variant flip allowed only during create.
- `LeadNoteDialog.tsx` — multiline note, submit disabled while saving/empty, existing notes shown labeled as contact-level history.

### 10. Data preservation
No table dropped, no column removed, no records deleted, no merging. Existing DB triggers stay intact so any legacy insert path continues to auto-create contacts.

### 11. Permissions
Server fns: `requireSupabaseAuth` + `assertAdmin` (existing helper). RPCs: `admin` check inside each `SECURITY DEFINER` function. RLS unchanged on tables.

---

### Files
- MIG: `supabase/migrations/*_crm_leads_txn_rpcs.sql` (7 RPCs above + grants).
- Edit: `AdminSidebar.tsx`, `admin.crm.index.tsx`, `admin.crm.contacts.tsx` (redirect), `LeadsView.tsx`, `crm.functions.ts` (new server fns), `admin-chat.functions.ts` (drop `listLeads`).
- Add: `admin.crm.leads.individuals.$leadId.tsx`, `admin.crm.leads.companies.$leadId.tsx`, `LeadDetail.tsx`, `LeadFormDialog.tsx`, `LeadNoteDialog.tsx`.

### Verification
Type-check, then manual: create with only email (allowed), create with neither (blocked), duplicate email → link into existing contact, split email/phone across two existing contacts → identity_conflict surface, edit changes email → conflict blocks + lead stays intact, status change persists on lead only, note added on lead A shows on lead B for same contact, export honors filters and exceeds page size, hit `/admin/crm/contacts/$contactId` legacy URL → still works.

### Open follow-ups (not in this pass)
- Per-lead notes (schema change).
- Explicit "merge conflicting contacts" / "update canonical contact profile from lead" admin flows.
- Aggregation rule for `crm_contacts.status`.
