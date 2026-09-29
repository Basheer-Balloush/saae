# SAAE platform

The web platform of the Syrian Association for AI & Entrepreneurship. One app serves three products:

- **Public website:** home, about, partners, news, communities, the One Million initiative and contact. The cinematic pages are HTML files rendered by `CinematicPage`, with their CSS and JS served from `public/cinematic/`.
- **LMS** (`/learning-management-system`): the course catalogue, player, quizzes, certificates, internships, instructor area and LMS admin console.
- **AMS** (`/attendance-management-system`): attendance, also installable as a phone web app.

The admin areas (`/admin`, the LMS admin and AMS) share one design system: the `cx-*` classes in `src/components/console/`. Every screen supports English and Arabic (RTL).

**Stack:** TanStack Start and Router, React 19, Tailwind v4, shadcn/ui, Supabase (Postgres, Auth, Storage), Cloudflare Workers, Bunny Stream, Resend.

## Run it

```bash
bun install
cp .env.example .env        # ask the owner for real values; never commit .env
bun run dev                 # http://localhost:8080
```

Local development talks to the **live** database. Look, but don't submit, enrol, approve or delete anything.

| Script                                                | What it does                                                   |
| ----------------------------------------------------- | -------------------------------------------------------------- |
| `bun run dev`                                         | Development server                                             |
| `bun run build`                                       | Production build (checks the environment first)                |
| `bun run typecheck`                                   | TypeScript check                                               |
| `bun run lint`                                        | ESLint                                                         |
| `bun run format`                                      | Prettier (see `.prettierignore` for the protected files)       |
| `bun run test:unit` / `test:integration` / `test:e2e` | Tests                                                          |
| `bun run test:plans`                                  | Offline checks                                                 |
| `bun run check:bundle`                                | Checks that no server secret reaches the browser bundle        |
| `bun run build:staging`                               | typecheck + unit tests + offline checks + build + bundle check |

## Folder map

```
src/
├── routes/                 One file per URL. The file path IS the web address.
│   ├── admin/              /admin/*            (route.tsx = the folder's layout)
│   ├── learning-management-system/   /learning-management-system/*
│   ├── attendance-management-system/ /attendance-management-system/*
│   ├── news/  initiative/  api/  lovable/     (lovable/email/* are live webhook URLs)
│   └── about.tsx, partners.tsx, …             single-page addresses
├── features/               Everything that belongs to ONE product area
│   ├── website/            public site: cinematic/, home/, layout/ (navbar), motion/ (animation
│   │                       pieces), initiative/, communities/, partners/, profile-card/, lib/, media.ts
│   ├── chat/               Abu Al-Joud assistant (widget + lib/)
│   ├── crm/                leads, forms, surveys (FormBuilder, SurveyView, … + lib/)
│   ├── feedback-survey/    the /feedback survey: admin view, StarRating, lib/
│   ├── attendance/         AMS screens, layout/, hooks/, lib/
│   └── lms/                LMS core: skin/, catalog/, player/, quiz/, hooks/, lib/, FileUploader
│       ├── console/        LMS admin console
│       ├── course-editor/  course editor tabs
│       ├── course-feedback/ course feedback forms, prompt and results (+ lib/)
│       ├── instructors/    accreditation logic (lib/)
│       ├── internships/    internships (shared UI helpers + lib/)
│       └── certificates/   certificate PDF and email (lib/)
├── components/             UI shared by MORE THAN ONE area
│   ├── ui/                 shadcn primitives (+ lms-portal-skin, which the dialogs use)
│   ├── console/            admin design system (ConsoleShell, cx-* styles, DraftNotice)
│   ├── layout/             the Footer shared by the public site and the LMS
│   ├── common/             small shared widgets (upload-progress)
│   └── app/                mounted once in __root (RouteProgress, ScrollToHash, error fallback)
├── lib/                    Shared infrastructure only
│   ├── i18n/  auth/  email/ (delivery, queue, templates/)
│   └── utils, safe-error, image-url, upload-with-progress, form-draft, scheduled-jobs.server, …
├── hooks/                  Hooks used by more than one area (useAuth, useLmsAuth, useConfirm, useFormDraft)
├── integrations/supabase/  Supabase clients and generated types (do not edit types.ts)
├── assets/                 Images imported by code (brand/, ministries/, partner-*.png)
├── server.ts  start.ts  router.tsx  styles.css
└── routeTree.gen.ts        Generated. Never edit by hand.
```

Outside `src/`:

- `public/`: static files served as-is (cinematic CSS/JS/images, LMS CSS, AMS icons).
- `supabase/`: database migrations and functions.
- `tests/`: unit, integration, e2e, db and offline tests.
- `scripts/`: build and maintenance scripts.
- `docs/`: documentation.

### Where does a new file go?

Ask these questions in order and stop at the first "yes":

| #   | Question                                     | If yes, it goes in                                                          |
| --- | -------------------------------------------- | --------------------------------------------------------------------------- |
| 1   | Does it define a web address?                | `src/routes/…` (keep the page thin; put the UI in a feature)                |
| 2   | Is it a shadcn primitive?                    | `src/components/ui/`                                                        |
| 3   | Does it belong to one product area?          | `src/features/<area>/` (UI at the root or in a sub-folder, logic in `lib/`) |
| 4   | Is it UI used by two or more areas?          | `src/components/<group>/`                                                   |
| 5   | Is it non-UI code used by two or more areas? | `src/lib/`                                                                  |
| 6   | Is it a hook?                                | Used by one area: `features/<area>/hooks/`. Used by several: `src/hooks/`.  |

A feature may import from another feature (for example the LMS console uses `lms/catalog/EnrollmentFormDialog`). Inside the LMS, sub-areas (`console/`, `course-editor/`, …) build on the LMS core, and the core never imports from a sub-area. Never create an import circle. When two areas start sharing something, move it to `components/` or `lib/`.

## Conventions

- **`*.functions.ts`:** TanStack server functions (`createServerFn`). The browser calls them.
- **`*.server.ts`:** server-only code. Never import it from client code; `bun run check:bundle` enforces this.
- **Routes:** a file's path is its URL. Renaming or moving a route file changes a live address, so don't, unless you mean to. The legacy files marked `// Legacy URL` only redirect old links; keep them.
- **Cinematic pages:** the HTML lives in `src/features/website/cinematic/html/`; the CSS and JS they load live in `public/cinematic/` and are referenced by exact path.
- **Private profile cards (`/profile/<secret-link>`):** stored only encrypted in the `private_cards` table (`features/website/lib/profile-card-crypto.ts`), decrypted on the server with the Cloudflare secret `PROFILE_CARD_SECRET`. Never put card details in code, `public/`, or commit messages, and never load analytics on those pages.
- **`src/assets/partner-*.png`:** these must keep their names and location. They are loaded by filename pattern, and partner rows in the database store these paths.
- **Unused code:** run `bunx knip@5` (configured in `knip.json`). Files in `public/` are referenced from HTML/CSS strings, so check those with `git grep` instead.
- **Languages:** every user-facing string needs English and Arabic, and layouts must work in RTL.

## Docs

- `docs/PROJECT-DOCUMENTATION.md`: full technical reference.
- `docs/admin/admin-operations.md`: admin console operations.
- `docs/deployment.md`: deployment and staging.
- `docs/operations/`: runbooks.
- `docs/cleanup-notes.md`: the 2026-09 restructure: what changed, and what was kept on purpose.
