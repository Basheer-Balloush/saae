# Plan: Cloudflare Worker for `lms.aisyria.org` redirect

## What we want
- User visits `https://lms.aisyria.org`
- Browser address bar stays on `lms.aisyria.org`
- Content served is `aisyria.org/learning-management-system` (or the Lovable origin directly)
- Works for deep links like `lms.aisyria.org/courses/123`

## Why this works
Cloudflare Worker sits in front of Lovable. It intercepts the `lms.aisyria.org` request before Lovable's edge redirect fires, fetches the LMS page internally from the Lovable origin, and returns it without a 302 redirect.

## Steps to implement

### Step 1: Create Cloudflare account and add domain
1. Sign up at https://dash.cloudflare.com (free).
2. Click **Add a Site / Add Domain**.
3. Enter `aisyria.org`.
4. Choose the **Free plan**.
5. Cloudflare will scan your DNS and import existing records.

### Step 2: Add DNS records in Cloudflare
Keep your existing records, but make sure these are present:

| Type | Name | Value | Proxy status |
|------|------|-------|--------------|
| A | `lms` | `192.0.2.1` | Proxied (orange cloud) |
| A | `@` | `185.158.133.1` | DNS only (grey cloud) OR Proxied |
| A | `www` | `185.158.133.1` | DNS only (grey cloud) OR Proxied |

- For `lms` the IP value does not matter because the Worker will handle it; `192.0.2.1` is a dummy.
- For `@` and `www`, point them to the Lovable IP `185.158.133.1`.
- Orange cloud = proxied through Cloudflare. Grey cloud = DNS only (not proxied).
- You can keep `@` and `www` DNS-only if you want Lovable to handle the main site directly; this avoids any Cloudflare interference with the main domain.

### Step 3: Change nameservers at Hostinger
Cloudflare will give you two nameservers like:
- `adam.ns.cloudflare.com`
- `iris.ns.cloudflare.com`

1. Go to Hostinger hPanel → Domains → aisyria.org → DNS / Nameservers.
2. Change from Hostinger nameservers to Cloudflare's nameservers.
3. Wait for propagation (usually 15–60 minutes, can take up to 24 hours).
4. Cloudflare dashboard will show **Active** status.

### Step 4: Create the Cloudflare Worker
1. In Cloudflare dashboard, go to **Workers & Pages** → **Create**.
2. Choose **Create Worker**.
3. Name it, e.g. `lms-redirect`.
4. Replace the default code with:

```javascript
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Only handle lms.aisyria.org
    if (url.hostname !== 'lms.aisyria.org') {
      return fetch(request);
    }

    // Build target URL on Lovable origin
    const targetOrigin = 'https://saae.lovable.app';
    const targetPath = '/learning-management-system' + url.pathname + url.search;
    const targetUrl = targetOrigin + targetPath;

    // Clone request with new target URL and Host header
    const modifiedRequest = new Request(targetUrl, {
      method: request.method,
      headers: {
        ...Object.fromEntries(request.headers),
        'Host': 'saae.lovable.app',
      },
      body: request.body,
      redirect: 'manual',
    });

    let response = await fetch(modifiedRequest);

    // If Lovable returns a 301/302 to the primary domain, follow it manually
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('Location');
      if (location) {
        const locUrl = new URL(location, targetUrl);
        if (locUrl.hostname === 'saae.lovable.app' || locUrl.hostname === 'aisyria.org') {
          const rewrittenLoc = 'https://lms.aisyria.org' + locUrl.pathname + locUrl.search;
          return new Response(null, {
            status: response.status,
            headers: { 'Location': rewrittenLoc },
          });
        }
      }
    }

    // Rewrite response headers that contain the Lovable origin
    const responseHeaders = new Headers(response.headers);
    responseHeaders.delete('content-security-policy');

    // Optional: rewrite Set-Cookie domains if needed later
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  },
};
```

5. Click **Deploy**.

### Step 5: Attach Worker to `lms.aisyria.org`
1. Go to **Workers & Pages** → Your worker → **Triggers**.
2. Click **Add Custom Domain** or **Add Route**.
3. Add route: `lms.aisyria.org/*`
4. Save.

### Step 6: Test
1. Open `https://lms.aisyria.org` in an incognito window.
2. Address bar should stay on `lms.aisyria.org`.
3. Content should be the LMS page.
4. Try `https://lms.aisyria.org/learning-management-system` and other deep links.

## Important caveats

### Authentication / Cookies
If users log in via Supabase on `lms.aisyria.org`, the browser will set cookies for `lms.aisyria.org`. The Lovable app running at `saae.lovable.app` will also try to set cookies for `saae.lovable.app`. This can cause session conflicts.

Recommended fix:
- After this works, configure the Lovable/Supabase project to use the same session across both domains (custom domain as primary), or
- Restrict `lms.aisyria.org` to only public LMS content and keep login on `aisyria.org/learning-management-system`.

### SSL
Cloudflare will issue SSL automatically for `lms.aisyria.org` once the Worker route is active. Set SSL/TLS mode to **Full (strict)** or **Full** in Cloudflare dashboard.

### Performance
The Worker adds ~50ms latency per request. For static assets it will be cached by Cloudflare. For the first visit it may be slightly slower.

## What you need to do vs what I can prepare
- You must: create Cloudflare account, add domain, change Hostinger nameservers, create Worker, add route.
- I can prepare the Worker code and a checklist. I cannot access your Hostinger or Cloudflare accounts.

## Rollback plan
If anything breaks:
1. In Cloudflare, disable the Worker route.
2. In Hostinger, change nameservers back to Hostinger's original values.
3. The main site will continue working normally because DNS records are preserved.

## Expected result
`https://lms.aisyria.org` serves the LMS page directly while keeping the subdomain in the browser address bar.
