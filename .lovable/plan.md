
Scope: `src/components/admin/crm/LeadsView.tsx` and one new server function in `src/lib/crm.functions.ts`. Applies to both Individual and Company lead lists. No DB migration, no new dependency, no changes outside CRM Leads.

## 1. Remove Source filter

- Delete the Source `<Input>` block from the toolbar.
- Remove `source` from `SearchParams`, from the `useSearch` reads, and from `filters` passed to `listIndividualLeads` / `listCompanyLeads`.
- Keep the server-side `source` handling and Excel export `source` column untouched (data preserved).
- Reset (see #4) also strips any legacy `?source=` param from the URL.

## 2. Translate lead statuses

- Add a small reusable helper in `LeadsView.tsx`:
  ```ts
  const STATUS_LABELS = {
    ar: { new: "جديد", contacted: "تم التواصل", qualified: "مؤهل", converted: "تم التحويل", archived: "مؤرشف" },
    en: { new: "New", contacted: "Contacted", qualified: "Qualified", converted: "Converted", archived: "Archived" },
  } as const;
  const statusLabel = (s: LeadStatusT, lang: "ar" | "en") => STATUS_LABELS[lang][s];
  ```
- Use it in:
  - Toolbar Status `<Select>` items (`STATUSES.map` currently renders raw `s`).
  - Inline `StatusSelect` items (raw `s`) and the trigger's displayed value (currently shows raw key via `<SelectValue />`).
- Stored values remain the same enum (`new`/`contacted`/…). Excel export continues to write the raw value (unchanged).

## 3. Notes column

UI (both `IndividualsTable` and `CompaniesTable`):
- Insert a new `<th>` "Notes / الملاحظات" immediately before the Actions column and a matching `<td>` per row.
- Cell content:
  - Show latest note text clamped to 2 lines (`line-clamp-2 whitespace-pre-wrap text-xs text-muted-foreground`).
  - If missing → muted `—`.
  - When present and text is truncated OR longer than the preview, render a "More / عرض المزيد" text button (`variant="link" size="sm"`) that opens the note dialog.
- Adjust the empty-state `colSpan` from 7 to 8.

Note dialog:
- New `<Dialog>` bound to `viewNoteId` state.
- Content: full note body inside a scrollable container (`max-h-[60vh] overflow-y-auto whitespace-pre-wrap`).
- Accessible: `DialogTitle` ("Note / الملاحظة"), keyboard closable (built-in).

Efficient batched fetch:
- Add a new server function `listLatestNotesForContacts` in `src/lib/crm.functions.ts` (auth + admin gated):
  - Input: `{ contactIds: string[] }` (max 200).
  - Query: `crm_notes.select("contact_id, body, created_at").in("contact_id", ids).order("created_at", { ascending: false })` — single query.
  - Reduce server-side to the latest per `contact_id` and return `{ notes: Record<contactId, { body, created_at }> }`.
- In `LeadsView`, after `reload()` sets `rows`, collect distinct `contact_id`s and call once. Store map in local state `latestNotes`.
- After `saveNote()` succeeds, refetch the map for that lead's `contact_id` (or just re-invoke the batch for currently visible rows) so the row preview updates immediately without full list reload.

## 4. Reset Filters button

- Add an outlined "Reset / إعادة تعيين" button in the toolbar, positioned before the Export button.
- Click handler:
  1. `setQInput("")` (prevents the 300 ms debounce from re-writing the old search).
  2. `nav({ to: <current route>, search: {}, replace: true })` — clears q, status, source (legacy), from, to, page.
- Disabled when no filters active: computed as `!q && !status && !from && !to && page === 1 && !qInput`.
- Preserve toolbar responsiveness (existing `flex-wrap`).

## Non-goals / preserved behavior

- Pagination, Excel export, New Lead dialog, status update RPC, chat viewer, add-note flow — all unchanged.
- Detail page (`LeadDetail.tsx`) untouched.
- No database migration; reuses existing `crm_notes` table and RLS.
- RTL/LTR handled by existing `start`/`end` utilities; new button/dialog follow the same pattern.

## Verification

- `bun run lint` and `bun run build` after changes.
- Manual: switch language AR/EN, confirm status labels update in filter and row selects; add a note and see the row preview refresh; click Reset with active filters and confirm URL + inputs clear; confirm Notes column shows `—` for leads without notes and opens the dialog for long ones.
