# Migrating this project to an external (self-owned) Supabase project

This project currently runs on **Lovable Cloud**, which is Supabase managed by Lovable.
A Lovable Cloud project cannot be "switched" to an external Supabase project in place —
the migration is a copy of schema + data + files + config into a Supabase project you own,
followed by pointing the app's environment variables at it.

---

## 0. What you need first

- A Supabase account and a new empty project (choose a region close to your users).
- From that project's dashboard, note:
  - Project URL (`https://<ref>.supabase.co`)
  - `anon` / publishable key
  - `service_role` / secret key
  - Database connection string + password
- The Supabase CLI installed locally (`npm i -g supabase`) and Postgres client tools (`psql`, `pg_dump`).

> Note: the Lovable Cloud database password and service-role key are **not** available to you,
> so a direct `pg_dump` of the current database is not possible from your machine.
> Schema is rebuilt from the migration files in this repo; data is exported through the
> Cloud SQL editor / table export.

---

## 1. Recreate the schema

The full schema history lives in `supabase/migrations/` (174 files, chronologically named).
Applied in order they reproduce every table, enum, function, trigger, RLS policy and grant.

```bash
supabase link --project-ref <your-new-ref>
supabase db push          # applies supabase/migrations in order
```

If `db push` complains about the migration journal, apply them directly instead:

```bash
for f in supabase/migrations/*.sql; do
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$f"
done
```

Enable required extensions first if push fails on them:

```sql
create extension if not exists "pgcrypto";
create extension if not exists "vector";   -- used by the AI assistant knowledge base
create extension if not exists "pg_net";
create extension if not exists "pg_cron";
```

Verify afterwards: table count, `has_role`/`is_lms_admin` functions exist, RLS enabled on
every `public` table, and grants present for `authenticated` / `service_role`.

## 2. Move the data

Order matters because of foreign keys. Suggested batches:

1. `user_roles`, `lms_user_profiles`, `crm_contacts`
2. `lms_courses`, `lms_sections`, `lms_lessons`, `lms_instructors`, `lms_course_*`
3. `lms_enrollments`, `lms_enrollment_requests`, `lms_quizzes`, `lms_quiz_questions`, `lms_quiz_attempts`, `lms_answers`
4. `ams_*`, `internship_*`, `trainer_*`, `initiative_*`, `crm_*`, `news`, `partners`, `members`
5. Log/queue tables last (`email_send_log`, `lms_audit_events`, `lms_outbox_jobs`) — or skip them.

Export each table as CSV from the Cloud backend's table view (or `copy (select …) to stdout with csv header`
in the SQL editor) and import with `\copy` into the new project. Keep all `id` values unchanged.

Disable triggers during the load if timestamps/audit rows get duplicated:

```sql
alter table public.<t> disable trigger user;
-- \copy …
alter table public.<t> enable trigger user;
```

## 3. Move the auth users

This is the hard part: `auth.users` password hashes are not exportable without the Cloud
service-role key. Two realistic paths:

- **Re-invite (recommended).** Recreate users with the Admin API on the new project using the same
  `id` values (so all your `user_id` foreign keys keep working), then send password-reset emails.
  ```ts
  await admin.auth.admin.createUser({ id, email, email_confirm: true, user_metadata })
  ```
- **Fresh signup.** Users register again; you lose the link to existing rows unless you re-map ids.

Also reconfigure in the new project's Auth settings: site URL, redirect URLs
(`https://aisyria.org`, `https://www.aisyria.org`, preview URLs), email templates,
and the Google provider (client id/secret) if you keep social login.

## 4. Move storage

Recreate the 8 buckets with the same names and public/private flags, re-apply the storage
policies from the migration files, then copy objects bucket by bucket (download from the old
project's storage view, upload with the new project's service key). Paths must stay identical
because they are stored in the database rows.

## 5. Repoint the app

Update the environment variables (Cloud/hosting env, and `.env` locally):

| Variable | New value |
| --- | --- |
| `VITE_SUPABASE_URL` / `SUPABASE_URL` | `https://<your-ref>.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` / `SUPABASE_PUBLISHABLE_KEY` | new anon/publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | new service-role key |
| `VITE_SUPABASE_PROJECT_ID` / `SUPABASE_PROJECT_ID` | `<your-ref>` |

Other secrets stay the same and must be re-added on the new host:
`LOVABLE_API_KEY`, `RESEND_API_KEY`, `AUTH_RATE_LIMIT_PEPPER`,
`BUNNY_STREAM_LIBRARY_ID`, `BUNNY_STREAM_API_KEY`, `BUNNY_STREAM_CDN_HOSTNAME`,
`BUNNY_STREAM_TOKEN_KEY`, `BUNNY_WEBHOOK_SECRET`.

Regenerate types afterwards: `supabase gen types typescript --linked > src/integrations/supabase/types.ts`.

> On Lovable, `src/integrations/supabase/client.ts`, `client.server.ts`, `auth-middleware.ts`,
> `types.ts` and the Supabase `.env` entries are managed automatically and always point at
> Lovable Cloud. To run against your own project you must host the app yourself
> (export to GitHub, deploy to Cloudflare/Vercel/Netlify) and set the variables there.

## 6. Re-create scheduled / external wiring

- `pg_cron` jobs and any `pg_net` calls that hit `/api/public/*` endpoints — update the host URL.
- Bunny Stream webhook URL → new deployment domain.
- Any external service calling your public API routes.

## 7. Verify before cutover

- Sign in as student, instructor and admin.
- Course catalogue, enrolment request, quiz attempt + submission, certificate.
- Attendance system, CRM registration link, internship application, contact form email.
- Video upload and playback (Bunny), AI assistant answer (uses `vector`).
- Row counts per table old vs new.

Then switch DNS / deployment to the new build and keep the Cloud project read-only for a
couple of weeks as a fallback.
