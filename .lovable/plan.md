## Goal

When a visitor opens `https://lms.aisyria.org/`, serve the `/learning-management-system` page **without changing the URL in the browser** (no visible redirect). The address bar stays `lms.aisyria.org/`.

This replaces the current behavior, which 302-redirects to `aisyria.org/learning-management-system` (URL changes).

## Approach: internal URL rewrite at the server edge

The only way to keep the subdomain visible while serving different content is an **internal rewrite** (not a redirect). The server sees `/` but routes as if the path were `/learning-management-system`.

### Step 1 — Replace the redirect middleware in `src/start.ts`

Current `lmsSubdomainRedirectMiddleware` returns `Response.redirect(...)` — change to an in-place URL rewrite:

- Read `x-forwarded-host` / `host` header.
- If host is `lms.aisyria.org`:
  - If pathname is `/` (or doesn't already start with `/learning-management-system`), construct a **new `Request`** with the same method, headers, and body, but with the URL's pathname rewritten to `/learning-management-system` (preserve query + hash).
  - Pass the rewritten request forward so the TanStack router matches the LMS route and renders its HTML, but the browser never sees a 3xx — it just gets the LMS page at `/`.
- All other hosts: `return next()` unchanged.

Technical note: TanStack request middleware exposes `request` in the handler args. The rewrite is done by mutating the URL on a cloned `Request` and re-dispatching via the same handler chain (or by directly invoking the router's SSR handler with the rewritten request). Exact wiring will be verified during implementation.

### Step 2 — Remove the client-side redirect script in `src/routes/__root.tsx`

The inline `lmsRedirect` script in `RootShell` does `location.replace('/learning-management-system...')`, which forces the URL to change in the browser. Remove it so the URL stays `lms.aisyria.org/`.

### Step 3 — Remove the `beforeLoad` redirect in `__root.tsx`

The `beforeLoad` hook also throws `redirect({ to: "/learning-management-system" })` for `lms.aisyria.org`. Remove it — the server rewrite handles routing, and we don't want the client router to navigate away from `/`.

### Step 4 — Ensure internal links from the LMS still work

The LMS routes (`/learning-management-system/courses/...`, etc.) are linked with absolute paths inside the app. On `lms.aisyria.org`, clicking those would still show `/learning-management-system/...` in the URL — which contradicts "keep subdomain clean."

**Question for you:** do you want the clean URL **only on the homepage** (`lms.aisyria.org/` → shows LMS home, but inner pages show `/learning-management-system/...`)? Or should **every** LMS page on the subdomain hide the `/learning-management-system` prefix (e.g. `lms.aisyria.org/courses/123` instead of `lms.aisyria.org/learning-management-system/courses/123`)?

The second option is much bigger work: it requires path stripping on every request from the subdomain plus matching Link rewrites in the LMS components. The first option is what your message literally describes ("if pathname is `/`, redirect to `/learning-management-system`") and matches the plan above.

## Files to change

- `src/start.ts` — swap redirect for rewrite
- `src/routes/__root.tsx` — remove `lmsRedirect` inline script and `beforeLoad` redirect

## Risks

- Server-side rewrite must run before TanStack's router resolves the route, otherwise the `/` route renders instead of LMS. The middleware order in `requestMiddleware` will place the rewrite first.
- If a future feature needs to detect the original path (`/`), it will see the rewritten path (`/learning-management-system`). Acceptable for this use case.
