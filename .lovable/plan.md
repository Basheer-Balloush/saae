I found the reason: `https://lms.aisyria.org/` currently returns a server-level `302` redirect to `https://aisyria.org/` before the app code can run. That means the in-app redirect to `/learning-management-system` never gets a chance to execute.

Plan:

1. Fix the domain routing layer
   - Make sure `lms.aisyria.org` is attached as a direct custom domain for this same project, not configured as a redirect/alias to `aisyria.org`.
   - Remove any external DNS/CDN page rule, redirect rule, or forwarding rule that sends `lms.aisyria.org` to `aisyria.org`.

2. Keep the app-level redirect as fallback
   - Keep the root route logic so when the app receives `lms.aisyria.org/`, it redirects to `/learning-management-system`.
   - If needed, simplify the app logic to use a safer server/client host detector that does not break production builds.

3. Verify after publishing/config update
   - Check that `https://lms.aisyria.org/` returns a redirect to `https://lms.aisyria.org/learning-management-system` or directly loads that page.
   - Confirm `https://aisyria.org/` still loads the normal homepage.