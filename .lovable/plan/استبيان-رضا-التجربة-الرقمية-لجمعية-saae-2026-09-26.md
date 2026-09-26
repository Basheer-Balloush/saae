# استبيان رضا التجربة الرقمية لجمعية SAAE

A full Arabic-first (RTL) feedback survey with a staff dashboard, built inside the current SAAE site so it reuses the existing admin login, roles and console instead of a second `/admin`.

## What visitors get
- New public page: `/feedback` (Arabic default, `?lang=en` switch).
- Header with official tree logo (full-color on white), title "شاركنا رأيك", subtitle, 4–6 min estimate, privacy line, step progress bar.
- 9 steps exactly as the brief: respondent info → general website (14) → content & sections (10) → learning platform (17, conditional) → Abu Al-Joud (12, conditional) → registration & contact (8, conditional) → accessibility (7) → overall (6) → written feedback + optional screenshot + optional contact request.
- Accessible 5-star control: shows value + Arabic meaning (ضعيف جداً … ممتاز), mouse/touch/keyboard (arrow keys, radiogroup), "لا ينطبق" where allowed, clear Arabic validation.
- Answers kept between steps and autosaved in the browser; review screen; consent checkbox; submit disabled while saving; branded thank-you screen with "العودة إلى موقع الجمعية" and "تعبئة استبيان جديد".
- Spam protection: hidden honeypot field + server-side rate limit per IP.

## What staff get (inside the existing admin console)
- New sidebar entry "استبيان التجربة الرقمية" at `/admin/feedback-survey`, protected by the existing admin login and `admin` role (no public sign-up, no hard-coded password; existing password reset reused).
- Overview: total / today / this week, averages (overall, website, platform, chatbot), recommendation score, completed vs abandoned.
- Charts with visible numbers: 1–5 distribution, per-section and per-question averages, daily/weekly/monthly trend, device, user type, governorate, services used, service comparison, lowest/highest 5 questions.
- Filters: date range, user type, governorate, device, frequency, service, rating, contact requested, has comments.
- Responses table (paginated, search, sort) → detail view with every answer, "لا ينطبق" shown, notes, screenshot, section averages, private internal note, status (جديد / قيد المراجعة / تم التواصل / مغلق).
- Comments page grouped into إعجاب / مشكلة / اقتراح / ميزة مطلوبة / ملاحظة عامة (by which text box it came from — no invented AI sentiment), low-rating (1–2) comments highlighted.
- CSV export (UTF-8 with BOM, numeric rating + Arabic label) for the filtered set.

## Brand
Teal #048090, green #698F3F, jet #2E2E2E, white/light tints, sparing green→teal gradient in headers and charts, Cairo font (Regular body, SemiBold/Bold labels, Black display), teal/green line icons, logo never stretched with clear space. No glassmorphism or neon. The uploaded logo and brand kit are used as assets/reference only.

## Technical details
- Database (one migration, GRANTs + RLS on every table):
  - `feedback_survey_submissions` (profile fields, services_used text[], overall/recommendation ratings, consent, contact fields, 5 note fields, screenshot_path, review_status enum, internal_admin_note, completed flag, survey_version).
  - `feedback_survey_answers` (submission_id, section_key, question_key, rating smallint CHECK 1–5 nullable, not_applicable bool, CHECK that exactly one is set).
  - `feedback_survey_rate_limits` (hashed IP, window counts).
  - Anon has no SELECT; only `has_role(auth.uid(),'admin')` may read/update/delete. Inserts go only through a server function (validated with zod, text trimmed/length-limited, honeypot + rate limit), so contact data never appears in any public query.
  - Private storage bucket `feedback-screenshots` (JPG/PNG/WebP, 5 MB): upload via server-issued signed upload URL; admins view via signed URLs.
- Question catalogue in one shared typed file (keys, sections, Arabic/English text, allows N/A, conditional rule) used by form, dashboard and export.
- Admin data via `requireSupabaseAuth` server functions that verify the admin role; charts with the existing chart library (recharts) plus text values.
- Logo: uploaded PNG saved as a real file in `public/` (CDN assets 404 on the Cloudflare deployment); Cairo loaded via `<link>` in the page head.
- Route `head()` with unique title/description/OG tags; reduced-motion respected; 44px targets; no RTL overflow. Verify with Playwright (mobile + desktop, AR/EN), submit a real test response, check dashboard values and CSV.
- Short doc section on granting the admin role to a staff account (existing role system).
