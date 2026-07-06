# Real upload progress bars, site-wide

Supabase's JS `storage.upload()` does not report progress. To show real percentages we need to bypass it and POST the file via `XMLHttpRequest` (the only browser API that emits real upload progress events) to the Supabase Storage REST endpoint, using the current session token. Bunny video uploads (tus) already report progress — we'll only standardize the UI.

## What gets built

1. **`src/lib/upload-with-progress.ts`** — a shared helper:
   - `uploadToSupabaseStorage({ bucket, path, file, upsert, onProgress })`
   - Uses `XMLHttpRequest` → `POST {SUPABASE_URL}/storage/v1/object/{bucket}/{path}` with `Authorization: Bearer <session token>` and `apikey`.
   - Emits `onProgress(percent, loaded, total)` on `xhr.upload.progress`.
   - Returns `{ path, publicUrl }` (public URL from `supabase.storage.from().getPublicUrl`).
   - Handles `upsert`, error parsing (returns Supabase error messages), and abort.

2. **`src/components/ui/upload-progress.tsx`** — reusable UI:
   - `<UploadProgress percent={n} label="..." />` — animated bar + "45%" number + KB/MB counter.
   - Small inline variant and a full-width variant.

3. **Wire it into every upload site-wide**, replacing the current `supabase.storage.from(...).upload(...)` calls and showing the bar next to the button:
   - LMS course cover (`learning-management-system.instructor.courses.$id.tsx` → `uploadCover`)
   - LMS lesson attachments (same file → `uploadAttachments`)
   - LMS video upload (tus, `uploadVideo`) — already has progress, just switch to the new `<UploadProgress>` component
   - LMS enrollment form file field (`EnrollmentFormDialog.tsx` → `handleFile`)
   - LMS generic `FileUploader.tsx` (used by assignments/submissions)
   - LMS instructor profile avatar / instructor edit dialog (`AdminInstructorEditDialog.tsx`, `learning-management-system.instructor.profile.tsx`) if they upload
   - Trainer application files (`learning-management-system.trainer-apply.tsx`)
   - News image upload + Partners logo upload in admin (`admin.*` news / partners screens)
   - Any other `supabase.storage.*.upload(` call — I'll grep and cover them all in one pass.

4. **Behavior**
   - Percent starts at 0, updates live, jumps to 100 when the server confirms.
   - Button becomes disabled + shows the bar during upload; toast on success/failure stays as-is.
   - Multi-file uploads (attachments, trainer app) show a per-file bar in a list.

## Out of scope
- No changes to Storage buckets, RLS, or DB schema.
- No changes to Bunny tus internals — just the progress UI.

## Technical notes
- XHR is required; `fetch` has no upload progress in browsers.
- Auth token is read from `supabase.auth.getSession()` right before the request.
- Endpoint: `POST /storage/v1/object/{bucket}/{encodeURIComponent(path)}` with header `x-upsert: true` when needed.
