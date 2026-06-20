# AI TOT Graduation Registration System

A complete bilingual (AR/EN) registration + approval + verification flow for the National AI Symposium event (25/6/2026, Damascus National Library).

## 1. Public landing page — `/ai-tot-graduation-registeration`

- Hero with event branding (AI Trainer Community, Ministry of Communications, Syrian Association for AI & Entrepreneurship).
- Event info: title "برنامج الندوة الوطنية السورية الأولى للذكاء الاصطناعي", venue "المكتبة الوطنية - دمشق", date 25/6/2026.
- Full agenda table (rendered from the uploaded image, all rows from 10:00 to 14:05).
- Single CTA button → opens registration form.
- Secondary button → home page (`/`).
- Bilingual toggle reuses existing `useLang`.

## 2. Registration form (modal/dialog)

Fields: full name, phone, specialization, email. Zod validation. On submit → insert into `event_registrations` with `status='pending'`. Show success state: "في انتظار موافقة الإدارة. ستصلك رسالة عبر البريد الإلكتروني والواتساب."

## 3. Database (one migration)

```sql
-- enum
create type event_registration_status as enum ('pending','approved','rejected');

-- registrations
create table public.event_registrations (
  id uuid pk default gen_random_uuid(),
  full_name text, phone text, email text, specialization text,
  status event_registration_status default 'pending',
  pin_code text,                          -- 3-digit, set on approval
  approved_at timestamptz, approved_by uuid,
  created_at, updated_at
);
-- unique partial index on pin_code where status='approved' for collision-free lookup

-- verifier accounts (separate from main auth, created by admin)
create table public.event_verifiers (
  id uuid pk, username text unique, password_hash text,
  created_by uuid, created_at, updated_at
);

-- RPC: verify_event_pin(username, password, pin) -> registrant info (security definer)
-- RPC: create_event_verifier(username, password) -> admin only
-- RPC: approve_event_registration(id) -> generates unique 3-digit pin, returns it
```

GRANTs + RLS on both tables; only admins can read/manage registrations & verifiers; anon can INSERT into `event_registrations` (public form).

## 4. Admin section — `/learning-management-system/admin/event-registrations`

New nav entry "تسجيلات تخريج TOT". Lists pending/approved/rejected registrations with:
- Approve button → calls RPC, generates PIN, sends email + WhatsApp link.
- Reject button.
- Sub-tab "حسابات التحقق" to create/list/delete verifier accounts (username + password).

## 5. Approval notifications

- **Email**: new template `event-approval.tsx`, sent via existing transactional email infra with PIN code.
- **WhatsApp**: `wa.me` deep link opened by admin on approval (or stored message text); since no Twilio setup, use click-to-chat link generated per-approval admin can click to forward.

## 6. PIN verification interface — `/ai-tot-verify`

- Standalone bilingual page with two states:
  1. Login form (verifier username + password) → calls RPC, stores session token in localStorage.
  2. After login: input field for 3-digit PIN → calls `verify_event_pin` RPC → shows registrant name, phone, email, specialization, or "PIN not found".
- Logout button.

## Technical details

- All DB writes via TanStack server functions (`*.functions.ts`) with `requireSupabaseAuth` for admin actions, anon-allowed for the public registration insert.
- Verifier auth: simple bcrypt-hashed password check inside SECURITY DEFINER RPC; no Supabase auth user is created for verifiers (per request: admin enters username/password directly).
- Email send uses existing `/lovable/email/transactional/send` route + new template.
- WhatsApp: render `https://wa.me/<phone>?text=<encoded>` — admin clicks to send from their own WhatsApp.
- All UI strings via existing i18n pattern (ar/en objects).

## File map

```
src/routes/ai-tot-graduation-registeration.tsx   (public landing)
src/routes/ai-tot-verify.tsx                      (verifier login + PIN check)
src/routes/learning-management-system.admin.event-registrations.tsx
src/components/event/RegistrationFormDialog.tsx
src/lib/event-registrations.functions.ts
src/lib/email-templates/event-approval.tsx
+ migration
```

Confirm to proceed?