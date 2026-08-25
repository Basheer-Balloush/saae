# Fix internship applicant View and CV review

## Confirmed current state
- The existing **View** action already routes to a dedicated applicant detail page; the Applications table, filters, search, pagination, and Excel export can remain unchanged.
- Applications store immutable submission snapshots for full name, email, phone, organization, biography, assigned admin, status, submission/withdrawal dates, attempt number, and a CV file reference. Per-opportunity answers, course snapshots, certificate snapshots, notes, and status history are stored in related tables.
- The public application form submits the LMS profile snapshot plus the opportunity's configured additional questions; it does not collect separate education/address/link fields unless admins add them as opportunity questions. The detail view should therefore render the snapshot and every stored answer rather than inventing fields.
- CVs already exist: all 9 current applications have a CV reference. The referenced files are stored in the private `internship-private` bucket, mostly as PDFs. Admin-only database and storage policies already protect application data and CV files.
- The backend detail RPC already assembles the profile snapshot, answers, courses, certificates, notes, history, assignment, and CV metadata. The current UI renders most of this data, but its CV section only opens a short-lived signed URL in a new tab and has no inline preview, explicit download path, persistent error state, or broken-file fallback.

## Implementation
1. **Harden the admin detail boundary**
   - Keep the existing authenticated server functions and admin-only RPC/storage checks.
   - Extend the CV URL response with the stored MIME type and filename needed for safe preview/download decisions.
   - Keep private bucket/path values server-side and continue issuing short-lived signed URLs only after the admin check.

2. **Make the existing detail page the complete View experience**
   - Preserve the dedicated detail-page pattern already used by the LMS admin.
   - Present every captured snapshot field, all dynamic application answers, status, assigned admin, submission metadata, notes, courses, certificates, and status history with localized Arabic/English labels and existing RTL/LTR behavior.
   - Keep long values fully readable with wrapping and preserve the current status, assignment, and notes controls.

3. **Add a robust CV/Resume section**
   - Fetch the signed CV URL when the detail page loads and show a localized loading state.
   - For PDFs, render an inline preview in a stable responsive frame.
   - Always show a dedicated Download CV action when a file is available; non-PDF files receive download-only treatment.
   - Show explicit localized states for no uploaded CV and for signing/loading/preview failures, with Retry and Download/Open fallback where possible.
   - Revoke/replace stale preview state when navigating or retrying so one applicant's document cannot appear for another.

4. **Regression and access verification**
   - Verify multiple internship applications, including one with stored answers/courses and one without optional data.
   - Verify PDF preview and download, simulated missing-CV rendering, and broken/failed file rendering.
   - Verify direct unauthenticated/non-admin access cannot retrieve profile or CV data.
   - Confirm the Applications table behavior and layout are unchanged.
   - Run targeted tests, TypeScript checking, lint, production build, and desktop/mobile RTL/LTR browser checks.

## Scope
No new applicant fields, tables, workflow, sidebar section, or Applications-table changes. No changes to unrelated LMS, auth, payments, or opportunity-management behavior.
