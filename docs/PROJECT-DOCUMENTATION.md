# SAAE Digital Platform
## Complete technical and operational documentation

**Organization:** Syrian Association for AI & Entrepreneurship (SAAE)

**Document status:** Current implementation reference

**Last reviewed:** 3 September 2026

**Audience:** Project owners, administrators, instructors, developers, operators, and maintainers

---

## 1. Executive summary

The SAAE Digital Platform is a bilingual Arabic/English web application for the Syrian Association for AI & Entrepreneurship. It combines:

- The public SAAE website and organization information.
- A Learning Management System (LMS) for courses, enrollment, learning content, quizzes, assignments, certificates, internships, trainer applications, and instructor workflows.
- An Attendance Management System (AMS) for onsite course sessions, registrants, and attendance.
- An administrator portal for content, users, LMS operations, chatbot knowledge, surveys, CRM leads, registration links, internships, reviews, and analytics.
- A CRM layer for individual/company leads, contact records, notes, dynamic forms, submissions, feedback, and enrollment-related data.
- A public AI assistant restricted to documented SAAE information, with bilingual responses, retrieval-augmented knowledge, lead capture, conversation persistence, and rate limiting.

The application is a TanStack Start v1 project using React 19, TypeScript, Vite, TanStack Router, TanStack Query, Tailwind CSS v4, Radix UI primitives, Framer Motion, and a Lovable Cloud database/auth/storage backend. Production deployment targets Cloudflare Workers through the Cloudflare Vite integration.

The repository is the source of truth for application code and migrations. Runtime data, auth users, secrets, storage objects, and deployed backend state are not fully represented in source control.

---

## 2. Important boundaries and operating assumptions

### 2.1 Backend terminology

Lovable Cloud provides the project’s database, authentication, storage, and backend services. The underlying implementation uses the generated database client and SQL migrations. Application documentation refers to this as **Lovable Cloud/backend**.

### 2.2 Source-controlled versus runtime-controlled state

**Source controlled:**

- React components, routes, hooks, server functions, translations, styles, tests, migrations, deployment configuration, and email templates.
- Generated database types are present for development but are treated as generated output.

**Runtime controlled:**

- Auth users and sessions.
- User roles and profile rows.
- Database rows created through the app.
- Storage objects.
- Secret values and third-party account configuration.
- Deployed domain/DNS state.
- Current database migration application state.

### 2.3 Security principles

- Roles are stored separately in `public.user_roles`; privilege is not inferred from a profile field or browser storage.
- Admin route guards and server-side authorization checks are both used.
- Protected server functions use authenticated middleware and user-scoped database access.
- Privileged database access is server-only.
- Public API routes validate input and must verify external signatures or equivalent authorization before writes.
- Secrets are read server-side and are never embedded in client code.
- The browser must not be trusted for quiz scores, enrollment state, roles, applicant workflow fields, or other privileged values.
- All public-schema tables created by migrations require explicit database grants, RLS, and policies.

---

## 3. Technology stack

### 3.1 Runtime and application framework

| Area | Technology | Purpose |
|---|---|---|
| UI | React 19 | Component-based interface |
| Full-stack framework | TanStack Start v1 | SSR, server functions, route handlers |
| Routing | TanStack Router | File-based, type-safe routing |
| Data synchronization | TanStack Query | Query caching, loaders, mutations |
| Build tool | Vite 7 | Development and production bundling |
| Language | TypeScript | Static typing |
| Styling | Tailwind CSS v4 | Utility styling and theme tokens |
| UI primitives | Radix UI | Accessible dialogs, menus, forms, tabs, tables, etc. |
| Animation | Framer Motion | Route transitions and selected UI motion |
| Forms | React Hook Form + Zod | Form state and validation |
| Notifications | Sonner | Toast feedback |
| Charts | Recharts | Admin analytics and visualizations |
| Icons | lucide-react | Iconography |
| Dates | date-fns | Date formatting and calculations |
| Spreadsheet export | ExcelJS | XLSX generation in the browser |
| Video | HLS.js, tus-js-client | Video playback and direct upload support |
| Mobile support | Capacitor 8 packages | Optional Android/iOS packaging and device APIs |

### 3.2 Project scripts

```text
bun run dev          Start Vite development server
bun run build        Build for production
bun run build:dev    Development-mode production build
bun run preview      Serve a built app locally
bun run lint         Run ESLint
bun run format       Format the repository with Prettier
bun run test         Run unit tests
bun run test:unit    Run tests/unit
bun run test:integration  Run integration tests (self-skipping without credentials)
bun run test:e2e     Run Playwright end-to-end tests
bun run typecheck    Run tsgo, falling back to tsc
bun run check        Typecheck + lint + unit tests
```

### 3.3 Application bootstrap

- `src/router.tsx` creates a TanStack Router with a new QueryClient, five-minute query freshness, thirty-minute garbage collection, disabled focus/reconnect refetching, intent preloading, and short pending-state thresholds.
- `src/routes/__root.tsx` owns the HTML shell, global metadata, theme/language providers, query provider, toasts, route transitions, scroll restoration, form validation messaging, assistant visibility rules, and the router outlet.
- `src/start.ts` installs request error handling and the client-side auth bearer middleware used by protected server functions.
- `src/server.ts` wraps the TanStack server entry and normalizes catastrophic SSR errors into a branded 500 page.
- `src/routeTree.gen.ts` is generated by the TanStack file-route plugin and must not be edited manually.

---

## 4. Deployment and hosting

### 4.1 Cloudflare Worker configuration

`wrangler.jsonc` configures:

- Worker name: `tanstack-start-app`.
- `compatibility_date`: `2025-09-24`.
- `nodejs_compat` compatibility flag.
- Entry point: `src/server.ts`.

`vite.config.ts` delegates the standard TanStack/Vite/Tailwind/Cloudflare configuration to `@lovable.dev/vite-tanstack-config` and changes the TanStack server entry to `server` so the SSR wrapper is used.

### 4.2 Domains and routing

The application has a primary public domain and configured preview/published environments. An LMS subdomain was considered for redirecting to `/learning-management-system`; application code contains a root-only hostname redirect for `lms.aisyria.org`, but DNS and proxy configuration must exist before application code can run. Cloudflare DNS/redirect rules are an infrastructure concern and can fail before the Worker receives a request.

Recommended domain troubleshooting sequence:

1. Confirm the hostname has a single valid DNS record.
2. Confirm the record is proxied only when the origin/proxy arrangement supports it.
3. Avoid pointing a proxied record at a prohibited or self-referential Cloudflare address.
4. Use a Cloudflare redirect rule matching the hostname when the redirect must occur at the edge.
5. Test both the root hostname and deep paths after DNS propagation.

### 4.3 SSR and error behavior

Server functions and SSR may throw `Response` objects for unauthorized access. The request middleware preserves those status responses. Unexpected errors are logged server-side and returned as a branded HTML error page. The server wrapper also detects framework-generated JSON bodies representing swallowed SSR HTTP errors and replaces them with the same branded page.

---

## 5. Design system and localization

### 5.1 Visual system

The SAAE brand system is implemented in `src/styles.css`:

- Primary brand direction: teal blue with asparagus green support and jet-black text/surfaces.
- Semantic CSS tokens are used for backgrounds, foregrounds, cards, popovers, primary/secondary actions, muted content, borders, rings, sidebars, charts, footer colors, and shadows.
- Light and dark token sets are defined.
- Cairo is the primary font, with Noto Sans Arabic and system fallbacks.
- Shared type tokens cover display, H1/H2/H3, body, small, and caption scales.
- Tailwind v4 utilities are generated from the source tree and semantic theme tokens.
- `shadow-soft`, `shadow-lift`, gradient utilities, chat scrolling, and RTL typography utilities are provided globally.

### 5.2 Theme behavior

`src/lib/theme.tsx` provides `ThemeProvider` and `useTheme()`.

- Theme values: `light` or `dark`.
- Persistence key: `saae-theme`.
- The root shell applies the persisted theme before hydration through a small initialization script to reduce flash.
- Theme changes toggle the `dark` class on the document element.

### 5.3 Language and direction behavior

`src/lib/i18n.tsx` provides `LanguageProvider` and `useLang()`.

- Supported languages: `ar` and `en`.
- Persistence key: `saae-lang`.
- Default language in the provider: Arabic.
- Arabic sets `dir="rtl"`; English sets `dir="ltr"`.
- The provider updates document language and direction on changes.
- Public, LMS, AMS, admin, quiz, internship, auth, and email surfaces contain bilingual strings in their respective translation modules.

### 5.4 Accessibility and interaction conventions

The UI uses Radix primitives and shared components for dialogs, alerts, inputs, labels, selects, tabs, menus, tables, progress, and toast feedback. Familiar icons come from Lucide. Form validation is centralized at the root with localized browser-invalid feedback. The application uses responsive layouts and explicit mobile behavior for the navigation and administrative surfaces.

---

## 6. Route architecture

Routes live in `src/routes`. The filename determines the route ID; dynamic segments use `$name`, folders/dots map to slashes, and layout routes render `<Outlet />`. The route tree is generated automatically.

### 6.1 Public website routes

| URL | File | Purpose |
|---|---|---|
| `/` | `index.tsx` | Home page with news, LMS CTA, initiative CTA, partners, achievements, communities, footer |
| `/about` | `about.tsx` | Bilingual organizational information and members |
| `/contact` | `contact.tsx` | Public contact form and map |
| `/news` | `news.index.tsx` | News listing |
| `/news/$id` | `news.$id.tsx` | News article, media, related stories |
| `/communities/$key` | `communities.$key.tsx` | Community detail pages with validated community key |
| `/resources/ai-tools` | `resources.ai-tools.tsx` | Static curated AI tools directory |
| `/registration` | `registration.tsx` | Legacy redirect to LMS |
| `/forms/$slug` | `forms.$slug.tsx` | Published dynamic form renderer |
| `/event-survey` | `event-survey.tsx` | Startup/project event survey |
| `/event-signup/$token` | `event-signup.$token.tsx` | Token-scoped public signup |
| `/join/$token` | `join.$token.tsx` | Token-scoped CRM registration link form |
| `/initiative-survey` | `initiative-survey.tsx` | One Million Initiative survey |
| `/international-business-bridge` | `international-business-bridge.tsx` | Static conference/event page |
| `/initiative/claim` | `initiative.claim.tsx` | Initiative seat claim and account sign-in flow |
| `/one-million-initiative` | `one-million-initiative.tsx` | Initiative public entry/compatibility page |
| `/one-million-initiative/home` | `one-million-initiative-home.tsx` | Initiative home experience |
| `/one-million-initiative/donors` | `one-million-initiative-donors.tsx` | Initiative donor view |
| `/super-admin` | `super-admin.tsx` | Admin entry/stub with admin guard |
| `/sitemap.xml` | `sitemap[.]xml.ts` | Server-generated sitemap with static and database-backed URLs |

Public forms and token links use Zod validation, server functions, rate limiting where applicable, duplicate detection, and noindex metadata for private/token-scoped pages.

### 6.2 LMS routes

The LMS layout is `learning-management-system.tsx`. It supplies the LMS navbar, main content region, footer, and sign-out behavior.

| URL family | Files / purpose |
|---|---|
| `/learning-management-system` | LMS layout and entry |
| `/learning-management-system/` | LMS home/catalog entry (`learning-management-system.index.tsx`) |
| `/learning-management-system/catalog` | Catalog, category filters, search, URL state |
| `/learning-management-system/courses/$id` | Public course detail, enrollment and access flow |
| `/learning-management-system/instructors/$id` | Instructor profile/detail |
| `/learning-management-system/login` | LMS sign-in |
| `/learning-management-system/signup` | Student/instructor account creation |
| `/learning-management-system/forgot-password` | Password recovery request |
| `/learning-management-system/reset-password` | Password reset completion |
| `/learning-management-system/verify` | Email verification/confirmation state |
| `/learning-management-system/profile` | Student profile |
| `/learning-management-system/student` | Student layout |
| `/learning-management-system/student/requests` | Student enrollment requests |
| `/learning-management-system/student/player/$courseId` | Enrolled course player |
| `/learning-management-system/student/quiz/$courseId` | Quiz list, taking, result, and review modes |
| `/learning-management-system/certificate/$id` | Certificate view |
| `/learning-management-system/internships` | Public internship listing |
| `/learning-management-system/internships/$slug` | Internship detail |
| `/learning-management-system/internships/$slug/apply` | Internship application |
| `/learning-management-system/trainer-apply` | Trainer application entry |
| `/learning-management-system/instructor` | Instructor layout |
| `/learning-management-system/instructor/courses/$id` | Instructor course editor and quiz administration |
| `/learning-management-system/instructor/assignments/$courseId` | Instructor assignment management |
| `/learning-management-system/instructor/quiz-results/$courseId` | Instructor quiz results |
| `/learning-management-system/instructor/profile` | Instructor profile |
| `/learning-management-system/admin` | LMS admin layout and role gate |
| `/learning-management-system/admin/` | LMS admin dashboard |
| `/learning-management-system/admin/analytics` | LMS analytics |
| `/learning-management-system/admin/attendance-link` | LMS/AMS course linking |
| `/learning-management-system/admin/coupons` | Coupon management |
| `/learning-management-system/admin/enrollment-requests` | Enrollment registration administration/export |
| `/learning-management-system/admin/internships` | Internship administration |
| `/learning-management-system/admin/internships/new` | Create internship |
| `/learning-management-system/admin/internships/$id/edit` | Edit internship |
| `/learning-management-system/admin/internships/$id/signups` | Internship signups |
| `/learning-management-system/admin/internships/$id/applications` | Application list |
| `/learning-management-system/admin/internships/$id/applications/$appId` | Application detail and CV review |
| `/learning-management-system/admin/reviews` | Course review administration |
| `/learning-management-system/admin/trainer-applications` | Trainer application administration |
| `/learning-management-system/admin/users` | LMS user/role administration |

### 6.3 AMS routes

| URL | File | Purpose |
|---|---|---|
| `/attendance-management-system` | `attendance-management-system.tsx` | AMS layout |
| `/attendance-management-system/` | `attendance-management-system.index.tsx` | Attendance dashboard |
| `/attendance-management-system/login` | `attendance-management-system.login.tsx` | AMS sign-in |

The instructor dashboard exposes attendance navigation for onsite courses and passes the linked AMS course identifier. The AMS service worker is registered only in secure, top-level, non-preview contexts and is scoped to `/attendance-management-system/`.

### 6.4 Admin and CRM routes

| URL family | Purpose |
|---|---|
| `/admin` | Admin shell and legacy CMS page |
| `/admin/login` | Admin sign-in |
| `/admin/dashboard` | Admin launcher |
| `/admin/members` | Members management |
| `/admin/partners` | Partners management |
| `/admin/chatbot` | Chat conversations, knowledge, feedback operations |
| `/admin/initiative` | Initiative donations, settings, waitlist, courses |
| `/admin/event-survey` | Legacy redirect into CRM form submissions |
| `/admin/initiative-survey` | Legacy redirect into CRM form submissions |
| `/admin/crm` | CRM layout |
| `/admin/crm/leads` | Lead navigation |
| `/admin/crm/leads/individuals` | Individual lead list, filtering, notes, export |
| `/admin/crm/leads/individuals/$leadId` | Individual lead detail |
| `/admin/crm/leads/companies` | Company lead list, filtering, notes, export |
| `/admin/crm/leads/companies/$leadId` | Company lead detail |
| `/admin/crm/contacts` | Legacy contact redirect |
| `/admin/crm/contacts/$contactId` | Legacy CRM contact detail |
| `/admin/crm/students` | LMS student rollup |
| `/admin/crm/forms` | Form submission navigation |
| `/admin/crm/forms/$formSlug` | Static survey dashboard or dynamic form submissions |
| `/admin/crm/registration-links` | Registration-link CRUD |
| `/admin/crm/registration-links/$id` | Registration-link submissions/detail |
| `/admin/crm/feedback` | Chat feedback management |
| `/admin/forms` | Dynamic form builder layout |
| `/admin/forms/` | Dynamic form list |
| `/admin/forms/new` | Create dynamic form |
| `/admin/forms/$formId/edit` | Edit dynamic form |

Admin pages use a combination of `requireAdminBeforeLoad`, `ssr: false` where browser auth state is needed, and server-side `assertAdmin`/role checks in mutations and data functions.

### 6.5 Email and API routes

| URL | Purpose |
|---|---|
| `/api/chat` | Public streaming assistant endpoint with validation, persistence, retrieval, tools, and rate limiting |
| `/api/public/bunny-webhook` | Bunny video status webhook; signature/secret protected |
| `/lovable/email/auth/preview` | Auth email preview endpoint |
| `/lovable/email/auth/webhook` | Auth email event handler |
| `/lovable/email/queue/process` | Transactional email queue processor |
| Email preview routes | Render React Email templates for operational verification |

---

## 7. Product modules

### 7.1 Public site

Core components include:

- `Navbar`: responsive navigation, language and theme controls, mobile menu.
- `Footer`: contact details, social links, quick links, and footer actions.
- `FeaturedNews`: home news carousel and fallback refresh.
- `Partners`: partner logo list.
- `Achievements`: static impact metrics.
- `Communities`: specialized community cards.
- `LmsCta` and `InitiativeCta`: entry points into the LMS and initiative.
- `LogoParticles`: canvas/particle visual used in selected hero areas.
- `AssistantFab`, `AssistantChatModal`, `AssistantFeedbackForm`: public assistant experience.

News supports bilingual titles/excerpts, images, galleries, videos, categories, publication state, home-page visibility, related content, and SEO metadata.

### 7.2 LMS catalog and course detail

The catalog supports:

- Published course listing.
- Search and category filters.
- URL-synchronized filter state.
- Course status, level, delivery mode, pricing, registration counts, and ended-state presentation.
- Online and onsite delivery modes.
- Course detail with sections/lessons, instructor information, reviews, enrollment state, and course-specific actions.

Course access is authorization-aware. Public course detail can be viewed without enrollment, while learning content, video playback, progress, quizzes, assignments, and certificates require the relevant authenticated/enrolled/instructor/admin state.

### 7.3 LMS authentication and account lifecycle

`src/lib/lms-auth.functions.ts` and `src/lib/lms-auth-email.server.ts` support:

- Bilingual student and instructor signup.
- Arabic full-name validation requirements.
- Password policy (`PASSWORD_MIN` and `PASSWORD_MAX`).
- Duplicate account handling and safe error mapping.
- Role assignment for LMS students and instructor requests.
- Server-controlled email confirmation mode.
- Localized confirmation emails via the Resend connector gateway.
- Confirmation resend with rate limiting and enumeration-safe responses.
- Password reset email flow.

Current operational setting: `public.lms_settings.email_confirmation_required = true`. New LMS accounts must confirm by email before sign-in. The documented temporary-off procedure is in `docs/operations/lms-email-confirmation-toggle.md`; changing the setting does not retroactively unconfirm accounts created while confirmation was disabled.

### 7.4 LMS enrollment, payments, and pricing

Enrollment uses server-side functions/RPCs rather than trusting direct client inserts. Relevant flows include:

- Free-course enrollment.
- Paid-course checkout.
- Coupon validation and application.
- Enrollment requests and form responses.
- Admin approval/registration operations.
- Real registration counts.
- Dual pricing display and strikethrough original pricing where applicable.
- Transactional enrollment approval email.

Commerce is present in the schema and code, but the historical Phase 0 baseline recorded no payment rows; verify live payment configuration before treating paid checkout as production-active.

### 7.5 LMS learning player and video

The player loads course sections and lessons, tracks lesson progress, and supports lesson content/media.

Bunny Stream integration:

1. An authenticated instructor/admin calls `createBunnyUpload` for an owned lesson.
2. The server creates the Bunny video object and returns TUS upload credentials.
3. The browser uploads bytes directly to Bunny using `tus-js-client`.
4. The client calls `setLessonBunnyVideo`, which stores the Bunny identifier and marks the lesson as processing.
5. Bunny webhook or instructor/admin refresh updates readiness.
6. Enrolled students, instructors, or admins call `getBunnyPlayback` and receive a short-lived signed iframe embed URL.

Direct raw CDN access is intentionally avoided when Bunny direct URL access is blocked. Video status values include processing, ready, and failed states.

### 7.6 Quizzes

Quizzes are available for online and onsite courses; quiz availability is not gated by attendance.

Instructor capabilities:

- Create multiple quizzes per course.
- Link a quiz to a specific LMS section and/or AMS session.
- Give each quiz an instructor-defined title; the student-facing default derives from the linked session name.
- Add questions from both the top and bottom of the builder to speed up large quiz creation.
- Set pass score and maximum attempts.
- Delete quizzes through a destructive action.

Student behavior:

- Course page uses “Quizzes,” not “Final test.”
- A quiz list shows session-derived names, status, score, and attempts.
- Status values include Not Taken, Passed, and Failed.
- Passed quizzes are permanently review-only.
- Failed quizzes can be retaken while attempts remain.
- Failed quizzes with no attempts remaining are review-only.
- Taking a quiz loads only the selected quiz’s questions.
- Submission persists the real attempt and score, shows the result immediately, and returns the learner to the course card flow.
- Review mode shows the student answer, correct/incorrect state, and correct answer without allowing edits/submission.

Authoritative quiz behavior is enforced in the database functions, including `lms_get_quiz_for_attempt`, `lms_get_quiz_review`, `lms_list_course_quizzes`, and `lms_submit_quiz_v2`. The browser result state is not the source of truth.

### 7.7 Assignments and certificates

Assignments include instructor panels, learner submissions, file upload support, and trainer scoring-related UI where applicable. Certificate issuance is backed by eligibility logic and a certificate email function. Certificates have a dedicated public/authenticated viewing route.

### 7.8 LMS internships

Public and admin internship features cover:

- Internship listing, detail, and applications.
- Cover/media and private applicant file storage.
- Application status and lifecycle.
- Admin application lists and detail pages.
- CV/file review.
- Signup links for targeted internship recruitment.
- Admin deletion and management actions.

Sensitive applicant files use private storage buckets and owner/admin authorization. Applicant-controlled fields are separated from evaluator/admin fields; applicants cannot tamper with status, decision, evaluator, or admin notes.

### 7.9 Trainer application and instructor lifecycle

Trainer applications support:

- Public application entry.
- Draft/submit behavior.
- Evidence file attachment/replacement/removal.
- Scored workflow and phase weights.
- Approval/rejection transitions.
- Admin review and accreditation.
- Instructor profile behavior and approved-instructor cleanup protections.
- Approval and reinstructor email notifications.

Scoring constants are maintained in `src/lib/trainer-scoring.ts`; final score and phase minimum rules are domain logic and are covered by unit tests.

### 7.10 Attendance Management System

AMS is a separate route family with its own roles (`attendance_user`, `attendance_admin`) and access helpers. It supports:

- AMS course/session management.
- Registrants.
- Session attendance.
- Completion/attendance marking.
- LMS course linking.
- Instructor dashboard attendance entry for onsite LMS courses.
- LMS/AMS account creation email support.
- PWA/service-worker support outside preview environments.

The LMS instructor page passes the linked AMS course identifier into the attendance system. Online courses do not receive the onsite attendance action.

### 7.11 Admin and CRM

The admin portal manages:

- News, members, partners, and content uploads.
- LMS users and enrollment requests.
- LMS reviews and trainer applications.
- Internships and applicant details.
- Course/attendance links and analytics.
- Coupons and operational settings.
- AI chatbot conversations, feedback, and knowledge documents.
- Individual/company leads, notes, statuses, and exports.
- Contacts and identities.
- Dynamic forms, statuses, fields, and submissions.
- Tokenized CRM registration links.

The XLSX export helper sanitizes formula-like cell values to reduce spreadsheet formula injection and generates timestamped filenames.

### 7.12 Dynamic forms and registration links

Dynamic forms define field types, validation, published/hidden/archived states, reserved-slug protection, and public submission. The server validates the form configuration and submission payload. Deletion is protected by submission-count safety checks.

CRM registration links:

- Are created and managed by admins.
- Resolve publicly by token.
- Accept lead information and store the source as a registration link.
- Use rate limiting and duplicate-safe handling.
- Have a public URL helper and an admin submission detail view.

---

## 8. AI assistant and knowledge retrieval

### 8.1 Public assistant

`src/routes/api/chat.ts` is a public streaming API route used by the assistant modal.

- Uses the AI SDK and OpenAI-compatible provider wrapper.
- Sends requests through the Lovable AI Gateway.
- Uses the configured Gemini model selected in the route.
- Restricts assistant behavior to SAAE documentation and captured knowledge.
- Responds in the user’s language.
- Collects individual/company lead information conversationally and submits it through tools when complete.
- Persists conversations and messages server-side.
- Rebuilds trusted prior history from the database rather than trusting fabricated client assistant messages.
- Retrieves relevant knowledge-base chunks using embeddings and `match_chat_chunks`.
- Applies a similarity threshold before adding retrieved context.
- Limits requests to 15 per minute and 120 per hour per IP/session key, per running instance.
- Validates message count, role, content size, and last-message direction.

The in-memory limiter is instance-local; it is not a globally coordinated distributed quota. Production operators should monitor the endpoint and consider an external/shared limiter if abuse volume or multi-instance consistency requires it.

### 8.2 Admin chatbot tools

`AdminChatbotSection` and `admin-chat.functions.ts` support:

- Conversation statistics.
- Conversation listing and message inspection.
- Conversation deletion.
- Knowledge document/text management.
- Chat feedback listing, handling, and deletion.

Knowledge retrieval uses the vector extension and server-only embeddings calls. The public client cannot call the protected vector matching function directly.

---

## 9. Database and persistence model

### 9.1 Database inventory

The current backend inventory recorded approximately:

- 87 public base tables.
- 203 public RLS policies.
- 76 non-internal triggers.
- 8 storage buckets.
- 219+ public functions across the migration history/inventory.

The older `.lovable/phase0-baseline.md` is a historical audit snapshot and reports lower counts from the earlier cutover. Use the live backend schema and latest applied migrations for current runtime truth.

### 9.2 Roles and authorization tables

Important authorization primitives:

- `public.app_role` enum.
- `public.user_roles` separate role table.
- `public.has_role` security-definer helper.
- `public.has_lms_role` and `public.is_lms_admin` LMS helpers.
- `public.has_ams_access` AMS helper.
- Route-level admin guards and server-function `assertAdmin` helpers.

Known roles include `admin`, `user`, `attendance_user`, `attendance_admin`, `lms_student`, `lms_instructor`, and `lms_admin`.

### 9.3 Main data domains

**Public site:**

- `news`
- `members`
- `partners`
- `contact_messages`
- `individual_leads`
- `company_leads`
- `chat_conversations`
- `chat_messages`
- `chat_feedback`
- Chat knowledge/chunk tables

**CRM/forms:**

- `crm_contacts`
- `crm_contact_identities`
- `crm_notes`
- `crm_registration_links`
- `dynamic_forms`
- Dynamic form fields/submissions
- `event_survey_responses`
- `initiative_survey_responses`

**LMS catalog/content:**

- `lms_courses`
- `lms_categories` and course-category links
- `lms_instructors`
- `lms_course_instructors`
- `lms_sections`
- `lms_lessons`
- `lms_reviews`
- Course settings/metadata tables

**LMS learner/commercial:**

- `lms_enrollments`
- `lms_enrollment_requests`
- Enrollment form responses
- `lms_payments`
- `lms_coupons`
- Progress tables
- `lms_certificates`

**LMS quizzes/assignments:**

- `lms_quizzes`
- `lms_quiz_questions`
- `lms_quiz_attempts`
- `lms_assignments`
- `lms_submissions`
- Assignment attempt/scoring support tables

**LMS people/workflows:**

- `lms_user_profiles`
- `lms_active_sessions`
- `trainer_applications`
- `trainer_application_files`
- `trainer_application_audit`
- Internship opportunities, applications, files, signup links, and submissions

**AMS:**

- `ams_courses`
- `ams_sessions`
- `ams_registrants`
- Attendance records and linked LMS identifiers

**Operations/email/audit:**

- `lms_settings`
- Email queue/send log/state/suppression/unsubscribe tables
- `lms_audit_events`
- Rate-limit and operational support tables

### 9.4 Key persistence rules

- Public table creation migrations must include grants before RLS/policies.
- User-facing writes should go through validated server functions or security-definer RPCs where the operation spans multiple tables or changes authorization state.
- Time/data-dependent validation uses triggers rather than immutable CHECK constraints.
- Course/instructor deletion has cascade risk; archival/soft-state workflows are preferred over destructive deletes.
- Quiz attempts represent real submitted attempts only; frontend state does not increment attempt count.
- Enrollment, quiz, trainer, applicant, and role-sensitive fields are protected by database authorization in addition to UI controls.

### 9.5 Storage buckets

| Bucket | Visibility | Typical use |
|---|---|---|
| `news-images` | Public | Public news images |
| `lms-media` | Public | Public LMS media |
| `lms-private` | Private | Instructor/student private LMS assets |
| `lms-assignments` | Private | Assignment files/submissions |
| `chat-knowledge` | Private | Chatbot knowledge documents |
| `trainer-applications` | Private | Trainer evidence |
| `internship-private` | Private | Internship applicant files |
| `internship-covers` | Private | Internship cover assets |

### 9.6 Extensions and database services

The inventory includes PostgreSQL extensions/services for:

- `plpgsql`
- `pgcrypto`
- `uuid-ossp`
- `pg_stat_statements`
- `vector`
- `pg_net`
- `pg_cron`
- `pgmq`
- `supabase_vault`

Some are used for IDs, secure functions, embeddings/RAG, queueing, scheduled work, or operational inspection.

---

## 10. Server functions and authorization model

### 10.1 Server function pattern

Client-callable server functions live in `src/lib/*.functions.ts` and use `createServerFn` from `@tanstack/react-start`. Server-only helpers use `.server.ts` filenames and are not imported directly by client components.

Protected functions use:

```text
.middleware([requireSupabaseAuth])
```

and receive authenticated context with the user ID and user-scoped database client. The auth-attacher middleware in `src/start.ts` adds the bearer token for client-originated calls.

### 10.2 Representative function groups

- LMS auth and email confirmation.
- LMS profile and user operations.
- Catalog/search/course access.
- Enrollment and checkout.
- Certificates and email.
- Quiz retrieval, submission, list, and review.
- Assignments and submissions.
- Internship public/admin/application workflows.
- Trainer applications, scoring, accreditation, and emails.
- AMS registrants, linking, and email.
- CRM contacts, leads, notes, registration links, and exports.
- Dynamic forms and submissions.
- Initiative donations, seats, settings, waitlist, and payments.
- Admin chatbot knowledge/conversations/feedback.
- Audit logging and email queue processing.
- Bunny Stream upload, playback, status, and webhook support.

### 10.3 Public server functions

Public functions are intentionally unauthenticated where the product requires public forms or public catalogue data. They must use narrow validation, safe error responses, rate limiting where appropriate, and no privileged client. Token-scoped links are not a substitute for validating link state and input.

---

## 11. Third-party integrations

### 11.1 Lovable AI Gateway

Used by:

- Public assistant streaming chat.
- Embeddings for knowledge retrieval.

Endpoint wrapper: `src/lib/ai-gateway.ts`.

Required server secret: `LOVABLE_API_KEY`.

No AI key is exposed to the browser.

### 11.2 Resend through connector gateway

Used for:

- LMS signup confirmation.
- LMS password recovery.
- Enrollment approval.
- Certificate issuance.
- Trainer approval/reinstructor messages.
- AMS account creation.
- Auth/webhook and queue-driven transactional emails.

Email templates are implemented with React Email in `src/lib/email-templates/`. The connector gateway URL is used server-side. Required secret names include `LOVABLE_API_KEY` and `RESEND_API_KEY`.

### 11.3 Bunny Stream

Used for instructor video upload, secure playback, status refresh, and webhook-based readiness updates. Browser upload uses TUS; playback uses signed iframe embed URLs; API keys and token keys are server-only.

Required secret names:

- `BUNNY_STREAM_LIBRARY_ID`
- `BUNNY_STREAM_API_KEY`
- `BUNNY_STREAM_CDN_HOSTNAME`
- `BUNNY_STREAM_TOKEN_KEY`
- `BUNNY_WEBHOOK_SECRET`

### 11.4 Maps

Google Maps link/embed usage appears in the public and LMS footers/contact surfaces. The app uses a configured maps link rather than storing a private maps credential in source.

### 11.5 Social and external links

The site links to SAAE social profiles on Facebook, Instagram, and LinkedIn. These are presentation links and do not represent authenticated API integrations.

### 11.6 Cloudflare

Cloudflare is used for Worker deployment/runtime compatibility and may be used for DNS, proxying, redirect rules, and custom domains. DNS failures such as NXDOMAIN, Error 1000, or Error 522 happen before application routing and must be diagnosed at the DNS/origin/proxy layer.

### 11.7 Capacitor

Capacitor packages for Android, iOS, browser, keyboard, preferences, splash screen, and status bar are installed. Native project directories are not currently present in the repository inventory, so native packaging requires a separate generation/build step and platform configuration review.

### 11.8 Browser/platform APIs

- Service workers for the AMS PWA experience.
- Local/session storage for theme, language, admin sidebar state, and scroll restoration.
- Web Crypto-compatible hashing through server-side Node-compatible crypto for Bunny signatures.
- File chooser/upload APIs for media and private evidence.

---

## 12. Environment and secret contract

Never place secret values in source control or documentation. Configure them through the project’s secret management/deployment environment.

### 12.1 Client/runtime configuration names

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

### 12.2 Server database/auth names

- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

The service-role key is server-only and is not available for client code. Ordinary user-scoped reads should use the authenticated context rather than the admin client.

### 12.3 AI/email names

- `LOVABLE_API_KEY`
- `RESEND_API_KEY`
- `AUTH_RATE_LIMIT_PEPPER`

### 12.4 Video names

- `BUNNY_STREAM_LIBRARY_ID`
- `BUNNY_STREAM_API_KEY`
- `BUNNY_STREAM_CDN_HOSTNAME`
- `BUNNY_STREAM_TOKEN_KEY`
- `BUNNY_WEBHOOK_SECRET`

### 12.5 Configuration validation checklist

- Confirm client publishable configuration exists before browser auth starts.
- Confirm server database configuration exists before server functions access the backend.
- Confirm Resend credentials before enabling confirmation or transactional email workflows.
- Confirm all Bunny values before enabling video upload/playback.
- Confirm AI credentials before enabling assistant/RAG features.
- Verify environment names, not values, in logs and runbooks.

---

## 13. Authentication and user journeys

### 13.1 Admin login

1. User visits `/admin/login`.
2. Email/password is validated.
3. Auth sign-in occurs.
4. `useAuth` resolves session and checks the separate `user_roles` table.
5. The user is admitted only if they have `admin` or the relevant admin role.
6. Guarded routes run server-side authorization again for mutations.

### 13.2 LMS student/instructor signup

1. User submits bilingual signup form.
2. Server validates name, email, password, language, and instructor intent.
3. Server checks rate limits and duplicate state.
4. Server creates the account and role/workflow records.
5. When confirmation is required, a localized confirmation email is sent through the transactional email path.
6. User confirms and then signs in.

### 13.3 Public course to enrollment

1. Visitor opens public course detail.
2. The page shows public course information.
3. Enrollment action evaluates authentication, enrollment, course status, delivery mode, and price.
4. Free courses use the enrollment flow; paid courses use checkout/payment flow.
5. Form answers and registration details are persisted.
6. Admin/instructor dashboards reflect the real registration data.

### 13.4 Student quiz journey

1. Enrolled student opens the course player or course card action.
2. Student opens “Quizzes.”
3. The system lists all quizzes linked to the course with session-derived names and persisted result summaries.
4. Student chooses an available quiz or review-only quiz.
5. The server returns quiz-specific questions and authoritative attempt state.
6. A submission is scored and persisted by the server.
7. The result view shows score, status, attempt count, and review option.
8. Passed or exhausted quizzes cannot be edited/submitted again.

### 13.5 Instructor onsite attendance journey

1. Instructor opens the LMS instructor dashboard.
2. An onsite course shows the attendance action.
3. The action opens AMS with the linked course identifier.
4. Instructor selects a session and records attendance.
5. AMS persistence and completion behavior determine the authoritative attendance state.

---

## 14. Testing and verification

### 14.1 Test layout

| Location | Coverage |
|---|---|
| `tests/unit` | Pure domain and authorization logic |
| `tests/integration` | RPC/RLS behavior against a real backend; self-skips without integration variables |
| `tests/e2e` | Critical Arabic/English browser journeys; opt-in |
| `tests/db` | SQL-oriented authorization checks and database contract cases |

Current tracked tests include:

- Audit-event unit and integration behavior.
- Internship lifecycle rules.
- Profile-file validation.
- Admin internship application SQL checks.

### 14.2 Recommended release checks

```bash
bun run typecheck
bun run lint
bun run test:unit
bun run test:integration
bun run test:e2e
bun run build
```

Integration tests require environment variables and must not point at production data unless the test is explicitly designed for that environment. Tests should assert authorization outcomes and persisted identity/ownership, not merely a missing error.

### 14.3 Browser verification targets

At minimum, verify:

- Public home, catalog, course detail, and contact form.
- Arabic and English switching with correct RTL/LTR direction.
- Signup confirmation and resend behavior.
- Free and paid enrollment paths in a safe environment.
- Quiz list, take, submit, pass lock, failed retake, exhausted review, and answer review.
- Instructor quiz creation from both top and bottom controls.
- Onsite instructor attendance link and AMS login.
- Internship applicant list, detail, and private CV/file behavior.
- Admin registration export with names/details and no user ID column.
- CRM registration link resolution and submission.
- Chat streaming, rate-limit response, feedback, and admin knowledge management.

---

## 15. Operations runbook

### 15.1 Email confirmation toggle

The authoritative setting is `public.lms_settings.email_confirmation_required`.

- `true`: signup creates an unconfirmed account path and sends localized confirmation email.
- `false`: signup creates confirmed accounts for immediate sign-in and skips signup confirmation email.
- The setting is read server-side and fails closed to required confirmation if the lookup is missing or invalid.
- The exact temporary disable/re-enable commands and history are documented in `docs/operations/lms-email-confirmation-toggle.md`.

### 15.2 User deletion

Deleting an auth user does not justify assuming every related record was removed. After a deletion, inspect:

- `user_roles`.
- `lms_user_profiles`.
- LMS instructor/profile records.
- Enrollment/registration ownership.
- Trainer/internship application ownership where applicable.
- Storage objects and private files.

Do not expose user email lists or secret query output in tickets or logs.

### 15.3 Quiz troubleshooting

Check in order:

1. Course enrollment and role.
2. Quiz row, linked session/section, question count, pass score, and max attempts.
3. Persisted `lms_quiz_attempts` rows for the student/quiz.
4. RPC result and error message.
5. RLS/grants for quiz and attempt tables.
6. Browser state only after server data is verified.

An attempts count must equal persisted real submissions, not quiz opens or failed client requests.

### 15.4 Video troubleshooting

Check:

1. All Bunny server secrets exist.
2. Lesson has `video_provider='bunny'` and a valid `video_uid`.
3. Upload finished at Bunny.
4. Webhook secret/path is correct, or run status refresh.
5. `video_status` and `video_ready` are consistent.
6. Playback caller is enrolled, instructor, or admin.
7. Signed embed URL has not expired.

### 15.5 Database/migration troubleshooting

- Apply schema changes through the Lovable Cloud migration workflow.
- Never manually edit generated client types as a substitute for migrations.
- For each new public table, confirm grants appear before RLS/policies in the same migration.
- Avoid modifying managed auth/storage schemas.
- Use triggers for rules involving current time or other data.
- If a Data API error provides a grant hint, apply the exact required grant through a migration.

### 15.6 Cloudflare/domain troubleshooting

- `ERR_NAME_NOT_RESOLVED`: DNS record absent or not propagated.
- Error 1000: DNS resolves to a prohibited/self-referential Cloudflare address.
- Error 522: Cloudflare cannot establish a connection to the configured origin.
- Redirect before app: the edge/domain configuration is handling the request before TanStack Start.

Keep DNS, proxy, redirect rule, and app hostname logic conceptually separate when debugging.

---

## 16. Known limitations and maintenance notes

- The AI endpoint’s rate limiter is in-memory and instance-local.
- Some public pages intentionally use direct browser database reads for public content or survey dashboards; review any new privileged query before copying this pattern.
- The root layout contains broad shared behavior, so changes to providers, route transitions, or global metadata can affect every route.
- The generated route tree and generated backend client files must not be hand-edited.
- Cloudflare/preview/published domain behavior can differ from localhost because proxying and deployment layers run before application routing.
- Capacitor dependencies are installed, but native platform folders were not present in the current repository inventory.
- The Phase 0 baseline is historical; do not use its counts as current production counts.
- Public content and social links are partly code/configuration driven while catalog, news, CRM, LMS, and operations data are database driven.
- Any new route with meaningful content should define its own title, description, Open Graph title/description, and Twitter card metadata; absolute hero images may be added at the leaf route only.

---

## 17. Repository map

```text
.
├── docs/operations/                  Operational runbooks
├── public/                           Favicon, PWA/AMS assets, robots, llms
├── src/
│   ├── components/
│   │   ├── admin/                    Admin chrome, chatbot, CRM
│   │   ├── ams/                      Attendance UI
│   │   ├── initiative/               Initiative dialogs/cards
│   │   ├── lms/                      LMS course, quiz, internship, file UI
│   │   ├── site/                     Public website and assistant
│   │   └── ui/                       Shared Radix/shadcn-style primitives
│   ├── hooks/                        Auth, mobile, confirmation, access hooks
│   ├── integrations/                 Generated backend clients/auth middleware
│   ├── lib/                          Server functions, domain logic, i18n, email
│   ├── routes/                       TanStack file routes
│   ├── routeTree.gen.ts              Generated route tree; do not edit
│   ├── router.tsx                    Query client and router setup
│   ├── server.ts                     SSR entry/error wrapper
│   ├── start.ts                      Start middleware/auth attachment
│   └── styles.css                    Tailwind v4 tokens and global styles
├── supabase/migrations/              Database schema, grants, RLS, functions
├── tests/                            Unit, integration, e2e, and DB checks
├── vite.config.ts                    Lovable TanStack/Vite configuration
├── wrangler.jsonc                    Cloudflare Worker configuration
└── package.json                      Scripts and dependencies
```

---

## 18. Maintainer checklist

Before merging a feature:

- [ ] Read every file being changed first.
- [ ] Keep route IDs aligned with filenames.
- [ ] Create referenced route files in the same change as links.
- [ ] Keep server-only modules out of the client graph.
- [ ] Validate inputs with Zod at the server boundary.
- [ ] Use authenticated context for ordinary user-scoped database access.
- [ ] Add RLS, explicit grants, and policies for every new public table.
- [ ] Keep roles in the separate role table.
- [ ] Add Arabic/English strings and verify RTL/LTR layout.
- [ ] Add route-specific metadata for new content routes.
- [ ] Keep UI actions based on authoritative persisted state.
- [ ] Add unit/integration/e2e coverage when an authorization or lifecycle boundary changes.
- [ ] Run typecheck, lint, targeted tests, and build.
- [ ] Inspect build/runtime logs and verify the live preview for user-facing changes.
- [ ] Never include secret values in source, documentation, screenshots, or logs.

---

## 19. Source references

Primary implementation references:

- `src/routes/__root.tsx`
- `src/router.tsx`
- `src/start.ts`
- `src/server.ts`
- `src/styles.css`
- `src/lib/i18n.tsx`
- `src/lib/theme.tsx`
- `src/lib/lms-auth-email.server.ts`
- `src/lib/bunny-stream.functions.ts`
- `src/routes/api/chat.ts`
- `src/lib/crm.functions.ts`
- `src/lib/dynamic-forms.functions.ts`
- `src/lib/trainer-application.functions.ts`
- `src/lib/lms-internships-*.ts`
- `src/lib/ams-*.ts`
- `docs/operations/lms-email-confirmation-toggle.md`
- `supabase/migrations/*.sql`
- `tests/unit/*`, `tests/integration/*`, and `tests/db/*`

This document intentionally describes secret names and operational contracts, but never secret values.
