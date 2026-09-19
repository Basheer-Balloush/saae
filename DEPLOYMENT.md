# SAAE staging handoff — 8 September 2026

## Status

Prepared from the supplied `saae-main.zip`, preserving that snapshot and merging the prepared provider migration and latest role-interface fixes. Nothing was pushed to GitHub or deployed remotely during this merge. Production readiness still requires the live checks below.

- Email senders call Resend directly; website chat calls Google Gemini (or OpenRouter) directly; knowledge embeddings call OpenAI directly.
- The latest co-instructor removal fix uses the protected database RPC instead of a direct table delete.
- Runtime Lovable email/AI gateway calls were removed. The Lovable Vite build helper and unused locked dependencies were retained to avoid an unrelated dependency upgrade; these are not hosted email/AI connectors.
- Worker configuration targets `saae-organization-staging`, preserves dashboard variables, enables observability, and schedules no cron jobs.
- No database rows, user roles, stored image links, live domains, or remote credentials were changed by this merge.

## Isolated migration branch

These changes are intended for the existing `migration` branch only. Leave Lovable connected to `main`, and configure the staging Worker to deploy from `migration` after its build and runtime settings are ready. Do not merge into `main` or change the production domain until staging acceptance passes.

1. Confirm main has not changed since the ZIP was downloaded. If it has, merge the changes rather than overwriting newer work.
2. Put the contents of this `saae-main` folder at the repository root, not inside another `saae-main` folder. Do not upload the ZIP as the website.
3. Remove the existing tracked `.env` from the repository in the same reviewed commit. It was deliberately omitted from this delivery; copying files alone will NOT remove an old tracked `.env`. `.gitignore` does not untrack existing files.
4. Keep credentials in Cloudflare/Supabase settings, never in GitHub source or browser-prefixed variables. Example files contain placeholders only.

## Cloudflare Workers Builds

Repository: `Basheer-Balloush/saae`; staging deployment branch: `migration`; root: repository root. The Cloudflare branch setting must be changed separately; a Git commit does not change it.

| Setting | Value |
| --- | --- |
| Build command | `bun install --frozen-lockfile && npm run build:staging` |
| Deploy command | `npx wrangler deploy --config dist/server/wrangler.json --keep-vars` |
| Build variable `NODE_VERSION` | `24.14.0` |
| Build variable `BUN_VERSION` | `1.3.9` |
| Build variable `SKIP_DEPENDENCY_INSTALL` | `1` |
| Build variable `VITE_SUPABASE_URL` | `https://zkpuyhrmyslmstzwojvw.supabase.co` |
| Build variable `VITE_SUPABASE_PUBLISHABLE_KEY` | Organization project's public anon/publishable key |

The explicit install command uses the existing lockfile. A fresh install on Cloudflare's Linux build image remains to be verified by its first successful build. See Cloudflare's [build-image settings](https://developers.cloudflare.com/workers/ci-cd/builds/build-image/).

### Worker runtime settings (separate from build variables)

Use `.dev.vars.example` as the complete inventory. At minimum configure:

- `SUPABASE_URL`: organization project URL above.
- `SUPABASE_PUBLISHABLE_KEY`: same public key as the browser build.
- `SUPABASE_SERVICE_ROLE_KEY`: organization admin credential, stored as a secret.
- `SITE_URL`: `https://saae-organization-staging.saae-syria.workers.dev`.
- `AUTH_RATE_LIMIT_PEPPER`: random secret of at least 32 characters.
- Initially `EMAIL_DELIVERY_MODE=disabled`, `ENABLE_TRAINER_OUTBOX=false`, and `ENABLE_EMAIL_QUEUES=false`.
- Preserve the existing Bunny configuration if video features use it.

Never prefix Resend, OpenRouter, OpenAI, Supabase admin credentials, or other secrets with `VITE_`. Dashboard runtime variables alone do not supply the browser build configuration.

## Enable and test services safely

### Supabase and email

Confirm this is the organization project, and verify staging authentication redirect URLs, storage access, and existing role/RPC migrations. Previous migration records report those role migrations applied; this merge did not re-verify the live schema. Do not replay migrations blindly.

Configure a verified Resend sender domain, `RESEND_API_KEY` as a Worker secret, and `EMAIL_FROM`. Start with `EMAIL_DELIVERY_MODE=test` and `TEST_EMAIL_ALLOWLIST` containing only exact team-controlled recipients. Keep both queue/outbox flags false.

Supabase-native confirmation resends also need Supabase custom SMTP configured. Worker Resend configuration alone does not configure Supabase SMTP. Worker email test-mode restrictions do not govern emails sent independently by Supabase SMTP.

Test signup/confirmation, confirmation resend, password recovery, and representative transactional emails using test accounts. Verify links return to the intended staging site. Confirm actual delivery in Resend and the test inbox before considering live mode. Any separate queue/outbox activation requires its own review.

### AI and WhatsApp

Set either `GEMINI_API_KEY` (Google AI Studio) or `OPENROUTER_API_KEY` as a Worker secret and choose a matching `CHAT_MODEL` (`gemini-3.8-flash` for Google, `google/gemini-3.8-flash` for OpenRouter). Both keys reach the same OpenAI-compatible interface; Gemini is used when both are present. Set `OPENAI_API_KEY` for knowledge embeddings (`text-embedding-3-small`, 1536 dimensions). Test website chat, knowledge retrieval, failure handling, and response latency. Real provider calls were not made during local verification.

The supplied source contains WhatsApp `wa.me` links, not an automated WhatsApp bot implementation. Those links remain intact. Identify where the separate WhatsApp chatbot is hosted and how it authenticates before declaring that integration migrated.

## Verification completed locally

- TypeScript check passed.
- All 33 unit tests and 3 offline planner tests passed.
- Client and Worker builds passed, including after the final co-instructor fix.
- Browser-bundle checks passed across 209 files, including checks against configured private credential values and old provider destinations.
- A missing browser configuration correctly fails the build guard.
- Local Worker smoke checks: login and attendance returned 200; unconfigured chat, disabled queue, and disabled email preview returned 503; retired auth webhook returned 410. No live emails were sent by these checks.

Existing TanStack deprecation warnings and large-client-chunk warnings remain. One final build also reported sandbox denial writing Wrangler's user-level diagnostic log; the build exited successfully. No full browser end-to-end suite, lint pass, fresh Linux dependency install, or production load test was performed. Smoke tests preceded the final UI-only co-instructor correction; the complete build and unit tests were rerun afterward.

## Before production cutover

- Confirm a successful Git-triggered staging deployment with the expected commit and organization backend.
- Test student, instructor, co-instructor, and admin permissions, including unauthorized-access failures and co-instructor removal.
- Test login/recovery, course/enrollment flows, uploads/images, video, email, and real AI responses.
- Previous migration records identified 64 image-URL field values needing attention; their current live state has not been checked here. Do not blindly rewrite every URL. Verify affected images and storage permissions first.
- If staging shares the production database, test mutations still affect shared data. Use designated test accounts/data and avoid destructive tests.
- Confirm data synchronization/backups and a rollback plan before changing the production domain. Do not treat a passing build as a guarantee of zero issues.

The original input ZIP is unchanged. This source delivery excludes local credentials, dependencies, and build output. The Git commit records the migration differences against the latest main snapshot.
