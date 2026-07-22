## Root-cause evidence

Ran a runtime + DB inspection before planning code changes:

1. **Component state**: `NewsFormDialog` uses three independent slots — `imageUrl: string`, `images: string[]`, `videos: string[]` — each written only by its own handler (`handleCoverUpload` → `setImageUrl`; `handleGalleryUpload` → `setImages(prev => [...prev, ...urls])`; `handleVideoUpload` → `setVideos(prev => [...prev, ...urls])`). No cross-writes exist.
2. **Previews**: each field's preview reads only its own state slot.
3. **Submit payload** (`handleSubmit`, line 649): `image_url: imageUrl || null`, `images`, `videos` — each key sourced from its own state slot.
4. **DB persistence** — verified against production:
   ```
   news.image_url  →  always .../news-images/images/<uuid>.<ext>   (never a video URL)
   news.images     →  independent array (0..5 rows)
   news.videos     →  independent array (0..1 rows)
   ```
   Six most recent articles all show the correct field boundaries; no cross-field URL appears in any row.
5. **Reopen for Edit**: `initial?.image_url ?? ""`, `initial?.images ?? []`, `initial?.videos ?? []` each hydrate their own slot.
6. **Storage bucket `news-images`** — `file_size_limit: NULL`, `allowed_mime_types: NULL`. **There is no independent server-side MIME or size validation.** Any client-side validation we add is the only enforcement layer, not defense-in-depth.

**Classification: UI-state / progress-indicator bug, not a data-mapping bug.** Shared `uploading` boolean and shared `uploadPct` object cause the cover, gallery, and video buttons to all flip to "Uploading…" and the wrong progress bar to appear next to the wrong field during an in-flight upload — which reads as "my cover got assigned to gallery/video." State, payload, and persistence are already independent.

No handler or mapping fix is required for cross-field contamination because none was found. The changes below harden the UI/upload state so the perception bug disappears and adjacent robustness gaps are closed.

## Fix — all in `src/routes/admin.index.tsx`, `NewsFormDialog` component

Single file, no schema, no backend, no visual redesign.

### 1. Per-field upload lanes

Replace shared `uploading` + `uploadPct` with three independent sets:

```
coverUploading, galleryUploading, videoUploading    // booleans
coverPct,       galleryPct,       videoPct         // { pct, loaded, total, name } | null
coverError,     galleryError,     videoError       // string | null  (rendered inline next to that field)
```

Each field's button label ("Uploading…") and its `<UploadProgress>` read only its own state. `anyUploading = coverUploading || galleryUploading || videoUploading` is used only to disable Save.

### 2. Independent request-ID refs + stale-response guard

```
coverReqIdRef, galleryReqIdRef, videoReqIdRef    // useRef<number>(0)
```

Each handler captures `const myReq = ++ref.current` before awaiting the upload. On resolve, reject, and in `finally`, the handler commits state (URL/error/uploading=false/pct=null) **only** if `myReq === ref.current`. Older resolutions become no-ops — they cannot flip `uploading` back to `false`, wipe progress, or overwrite a newer URL.

### 3. Concurrent-upload policy per field

Deterministic: **serialize within a field, parallel across fields.** Cover is single-file so it just uses the stale guard. Gallery already iterates the FileList sequentially — keep that. Video: same sequential pattern as gallery. If the admin picks a new gallery/video batch while one is running, the new call bumps the req-id and the older loop's partial results are dropped (per §2). Cross-field concurrency stays allowed and independent.

### 4. Reliable input reset in every terminal state

Add per-input refs:

```
coverInputRef, galleryInputRef, videoInputRef    // useRef<HTMLInputElement>(null)
```

Reset the corresponding input's `value = ""` on: successful upload, upload failure, client-side validation rejection, and explicit Remove. Currently gallery/video reset inside `onChange`, but cover never does — that gap is closed. Result: re-picking the same filename after any terminal state retriggers `onChange`.

### 5. Unique identity per input

Every file input gets a unique `id`, `name`, `ref`, handler, preview state, and payload key:

| Field   | id            | name        | ref            | state        | payload key |
| ------- | ------------- | ----------- | -------------- | ------------ | ----------- |
| Cover   | `news-cover`  | `cover`     | coverInputRef  | `imageUrl`   | `image_url` |
| Gallery | `news-gallery`| `gallery[]` | galleryInputRef| `images`     | `images`    |
| Video   | `news-video`  | `video[]`   | videoInputRef  | `videos`     | `videos`    |

The `<Label>` elements next to each field get matching `htmlFor`.

### 6. Synchronous submit guard

Add `submitInFlightRef = useRef(false)`. `handleSubmit` returns immediately if `submitInFlightRef.current || anyUploading`. Set the ref true synchronously before the async work and clear it in `finally`. This blocks double-clicks that fire before React re-renders the `disabled` state.

### 7. Client-side validation (only enforcement layer — not defense-in-depth)

There is no server/bucket validation (confirmed above), so client validation is authoritative and must be explicit.

- **Cover / gallery**: MIME must be exactly one of `image/jpeg`, `image/png`, `image/webp`, `image/gif`; extension in `.jpg|.jpeg|.png|.webp|.gif`. Max size **10 MB** (same limit already used by other image uploads in the codebase — will confirm at implementation by re-reading `upload-with-progress.ts` and other image call sites; if a shared constant exists it is reused rather than duplicated).
- **Video**: MIME `video/mp4`, `video/webm`, `video/quicktime`; extension `.mp4|.webm|.mov`. Max size **200 MB** (same rationale — reuse an existing constant if one exists).

Rejections write to that field's `*Error` slot (rendered inline under the field), do not touch other fields' state, and reset that field's input via §4. **Storage-cleanup risk called out below.**

### 8. Gallery batch failure policy

**Retain successfully uploaded items; report the failing item.** Concretely: iterate the batch, push each resolved URL into a local `urls` array, and on the first rejection call `setImages(prev => [...prev, ...urls])` for what succeeded and set `galleryError` to name the failing file. This matches the existing "append" semantics and avoids silently discarding successful uploads.

### 9. Edit — unchanged vs removed distinction (preserved)

Keep the current semantics explicitly:

- Not touching the field → state remains the `initial.*` value → payload sends the same URL(s) → column unchanged.
- Clicking Remove on cover → `setImageUrl("")` → payload sends `image_url: null` → column cleared.
- Removing a gallery/video item → array without that item → payload sends the shorter array.

No sentinel value needed because empty string / empty array is a legitimate "removed" signal for this schema, and the initial-vs-current comparison is implicit in the state.

### 10. Storage cleanup (open risk — reported, not fixed here)

Orphaned Storage objects will accumulate from:

- Successful uploads on a form the admin then cancels (Save never fires).
- Cover replacement (old object stays in bucket after new one is set).
- Explicit Remove followed by Save (row column cleared, blob remains).
- Rapid re-selection where §2 discards a stale response after the file already reached Storage.

Not fixed in this pass because the spec forbids deleting a stored asset until the row update succeeds and mandates a keep-narrow diff. Recommended follow-up: a scheduled server function that reconciles `news-images` bucket against `news.image_url ∪ news.images ∪ news.videos` and deletes unreferenced objects older than 24 h. Track separately.

## Not changing

- DB schema, RLS, storage bucket config, `uploadToBucket`, or `uploadToSupabaseStorage`.
- Members / Partners forms (already isolated).
- Visual layout, labels, i18n, categories, other form fields.
- Public news pages.

## Verification

- `bun run build` (typecheck + Vite build) — required to pass.
- No repository test setup for these admin dialogs exists (no `*.test.tsx` alongside `admin.index.tsx` or in a `tests/` folder for it); adding a Vitest + RTL suite is out of scope for a narrow fix. Manual verification is authoritative:
  1. Cover-only upload — only cover UI reacts; gallery/video buttons stay idle.
  2. Gallery-only upload — same, inverse.
  3. Video-only upload — same, inverse.
  4. Cover + gallery + video in parallel — three progress bars advance independently, each in its own field's card.
  5. Rapid re-selection in each field — older response is dropped, newest URL wins, `uploading` ends only when the newest completes.
  6. Force an older request to finish after a newer one (throttle network in DevTools) — no state overwrite.
  7. Remove cover → re-select the same filename → `onChange` fires and uploads again.
  8. Trigger a validation rejection → re-select the same filename → `onChange` fires again.
  9. Double-click Save — network tab shows one `POST`/`PATCH` on `news`.
  10. Edit an existing article's text only → Save → row's `image_url` / `images` / `videos` unchanged in DB (verify with a psql SELECT before/after).
  11. Explicit Remove of cover on an existing article → Save → `image_url` becomes NULL in DB.
  12. Wrong-type file into cover input → inline error under cover; gallery/video selections retained.
  13. Oversized file → inline error under that field; other fields untouched.

## Risks

- **Storage cleanup**: as detailed in §10, this change does not delete orphaned blobs. That risk existed before and is unchanged, but it is now more visible because the stale-response guard can silently drop a successfully-uploaded object.
- **Behavioral risk to existing rows**: none. Payload keys and DB columns are unchanged; only in-component state plumbing is refactored.
- **Validation is the only layer**: the bucket has no MIME/size rules. If the admin console is ever bypassed (direct Storage API call with a valid session), the client-side rules do not apply. Adding bucket-level `file_size_limit` and `allowed_mime_types` is the correct hardening step and is recommended as a follow-up migration outside this narrow fix.
