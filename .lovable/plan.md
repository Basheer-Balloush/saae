The issue is that the current code rewrites only the server request URL to `/learning-management-system`, but TanStack Router still hydrates in the browser using the visible URL `/`. On `lms.aisyria.org/`, the client therefore matches the normal homepage route after hydration, so it appears to redirect/render home.

Plan:
1. Add a small root-route `beforeLoad` host check that runs in the browser only for `lms.aisyria.org`.
2. If hostname is exactly `lms.aisyria.org` and pathname is exactly `/`, internally render/navigate the LMS route without affecting other domains.
3. Keep the existing server rewrite so the initial HTML is LMS content, but align client routing so hydration does not switch back to `/`.
4. Do not change any other domain behavior or LMS deep links.