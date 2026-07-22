## Scope

Convert the two remaining CSV exports in the admin dashboard to real `.xlsx` workbooks, using the same `exceljs` library the enrollment-requests export already uses. Introduce one shared helper so all admin exports use consistent formatting, filenames, MIME type, and formula-injection protection.

## Discovery result

Every admin export entry point:

1. `src/components/admin/crm/InitiativeSurveyDashboard.tsx` — `downloadCSV` button "تنزيل CSV" → **CSV, needs conversion**.
2. `src/components/admin/crm/EventSurveyDashboard.tsx` — `downloadCSV` button "تنزيل CSV" → **CSV, needs conversion**.
3. `src/routes/learning-management-system.admin.enrollment-requests.tsx` — `exportXlsx` → **already `.xlsx` via `exceljs`**. Will be refactored to use the shared helper for consistency (same output, same filters, no behavior change).

No other admin export buttons, shared CSV utilities, server-side CSV routes, `text/csv` MIME usage, or CSV translation keys exist. `exceljs` is already a project dependency (pinned in `package.json` overrides). No new dependency needed.

Data scope today: both survey dashboards fetch all rows via `supabase` under existing admin RLS. Scope stays identical — no filters, sort, or pagination exist on those pages, so the export continues to cover the full authorized result set in the current `created_at DESC` order.

## Changes

### 1. New shared helper — `src/lib/admin-xlsx-export.ts`

Single typed utility used by every admin export.

- `exportRowsToXlsx<T>({ filenameBase, sheetName, rtl, columns, rows })`:
  - `columns: { header: string; key: string; width?: number; type?: "text" | "number" | "date" | "boolean"; get: (row: T) => unknown }[]`
  - Builds workbook with `exceljs`, adds one worksheet, bold header row, `views: [{ rightToLeft: rtl }]`, per-column width (default 22, cap 60), and number format `yyyy-mm-dd hh:mm` for date columns.
  - Writes cell values by declared type: numbers as numbers, booleans as `Yes/No` (or `نعم/لا` when `rtl`), dates as `Date` objects, arrays joined with `", "`, `null`/`undefined` as `""`, objects via `JSON.stringify` (last-resort — not used by current callers).
  - **Formula-injection guard** on every text cell: if the string starts with `=`, `+`, `-`, `@`, `\t`, or `\r`, prefix a single `'` and force `cell.value = { text: safe }` so Excel treats it as plain text. Numeric/date/boolean columns skip the guard so legitimate negatives stay numeric.
  - Header row emitted even when `rows.length === 0`.
  - Blob type `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`.
- `buildXlsxFilename(base: string)`: sanitizes `base` to `[A-Za-z0-9._-]`, appends `_YYYY-MM-DD_HH-mm.xlsx` in local time, returns `<base>_<ts>.xlsx`. Used for all admin exports.
- `triggerBlobDownload(blob, filename)`: shared anchor-click + `URL.revokeObjectURL` helper.

Kept small and typed; no server round-trip (matches existing client-side pattern under admin RLS).

### 2. `src/components/admin/crm/InitiativeSurveyDashboard.tsx`

- Replace `downloadCSV` with `exportXlsx` calling the shared helper.
- Add `exporting` state; disable button while running; toasts for success/empty/error in Arabic.
- Column config (order preserved from current CSV, headers switched to the Arabic labels already used in the visible table):
  1. التاريخ (`created_at`, date)
  2. الاسم (text)
  3. الهاتف (text — leading-zero safe)
  4. البريد (text)
  5. العنوان, الاختصاص, نمط الاشتراك (mapped through `SUB_LABEL`)
  6. مبلغ التبرّع (number)
  7. الوضع, الدافع
  8. الالتزام (number)
  9. الجهاز, الطريقة, العائق, الاهتمامات (array join), علاقته بالـAI, أدوات استخدمها, سمع من, ملاحظات
- Button label: "تنزيل Excel"; sheet name: "استبيان المبادرة"; filename base: `initiative-survey`.
- Empty-result: still generates a workbook with headers (spec requirement) and shows an info toast.

### 3. `src/components/admin/crm/EventSurveyDashboard.tsx`

- Same treatment: `exportXlsx` via shared helper, `exporting` state, disabled-while-running, toasts.
- Preserve current CSV column order and headers, but in Arabic to match the visible dashboard.
- Sheet name: "استبيان المشاريع"; filename base: `event-survey`.

### 4. `src/routes/learning-management-system.admin.enrollment-requests.tsx`

- Refactor `exportXlsx` to call the shared helper (columns include the current 7 base columns + dynamic form-field columns). Same query, same filter (`selectedCourseId`), same values.
- Filename: `enrollment-requests-<sanitized-course-slug>_<ts>.xlsx` via `buildXlsxFilename`; sheet name unchanged.
- Button label stays "تصدير Excel" / "Export Excel".
- Behavior otherwise identical (still disabled via `exporting`, still shows the same toasts).

## Explicit non-changes

- No changes to RLS, server functions, database, or public-site pages.
- No changes to LMS student/instructor exports (none exist).
- No changes to `AdminChatbotSection`, `LeadsView`, news/members/partners pages — none of them expose an export button.
- No new dependency (uses installed `exceljs`).

## Technical notes

- `exceljs` runs client-side; matches current architecture and stays under Cloudflare Workers' constraints (we never bundle it into SSR-only paths).
- Formula-injection guard uses `cell.value = { text: safe }` (ExcelJS string form) so the leading apostrophe stays literal in the cell, not visible.
- Dates use JS `Date` objects with `numFmt = "yyyy-mm-dd hh:mm"` so Excel treats them as real dates.
- Phones/IDs marked `type: "text"` prevent leading-zero loss.
- Column widths clamped between 12 and 60.

## Files changed

- `src/lib/admin-xlsx-export.ts` (new)
- `src/components/admin/crm/InitiativeSurveyDashboard.tsx`
- `src/components/admin/crm/EventSurveyDashboard.tsx`
- `src/routes/learning-management-system.admin.enrollment-requests.tsx` (refactor to shared helper)

## Verification

- `bunx tsgo --noEmit`.
- Manual smoke test on `/admin/crm/forms/initiative-survey` and `/admin/crm/forms/event-survey`: click export, confirm downloaded `.xlsx` opens without repair prompt, headers correct, Arabic renders, dates are real Excel dates, phone leading zeros preserved, `=SUM(1,1)` inserted into a free-text field appears as literal text.
- Re-test enrollment-requests export to confirm the refactor changed nothing user-visible.

## Assumptions

- The two survey dashboards intentionally have no filters/search/pagination today, so "export the full authorized result set" equals the current fetch — no new query surface needed.
- No test suite exists for these routes; no new tests added (matches project convention).
- Arabic-first labels for the survey exports match the dashboards' Arabic-only UI; enrollment-requests keeps its bilingual `ar` branch.
