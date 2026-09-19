import assert from 'node:assert/strict';

// The organization-project assertions only apply to the Cloudflare Workers
// staging build. On Lovable (publish/preview builds) the platform injects the
// Lovable Cloud URL/keys, so enforcing the org ref there would break publish.
const isOrgBuild = process.env.STAGING_ORG_BUILD === '1'
  || process.env.CF_PAGES === '1'
  || process.env.CLOUDFLARE_BUILD === '1';

if (isOrgBuild) {
  const expectedRef = 'zkpuyhrmyslmstzwojvw';
  assert.equal(process.env.VITE_SUPABASE_URL, `https://${expectedRef}.supabase.co`,
    'Set VITE_SUPABASE_URL to the organization project in Cloudflare Builds environment variables.');
  const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? '';
  let claims;
  try { claims = JSON.parse(Buffer.from(key.split('.')[1], 'base64url')); } catch { /* opaque publishable key */ }
  assert(key.startsWith('sb_publishable_') || claims?.role === 'anon',
    'Set VITE_SUPABASE_PUBLISHABLE_KEY to an organization publishable/anon key, never a secret key.');
  if (claims?.ref) assert.equal(claims.ref, expectedRef, 'Public key belongs to a different Supabase project.');
  console.log('Public build configuration targets organization Supabase; no credential values printed.');
} else {
  console.log('Non-Cloudflare build (Lovable): skipping organization Supabase assertions.');
}
for (const [name, value] of Object.entries(process.env)) {
  if (!name.startsWith('VITE_')) continue;
  assert(!/(SECRET|SERVICE_ROLE|PASSWORD|RESEND|OPENAI|OPENROUTER|PEPPER)/i.test(name),
    `Private variable must not have a VITE_ prefix: ${name}`);
  assert(!value?.startsWith('sb_secret_'), `Privileged key in browser variable: ${name}`);
}
console.log('No credential values printed.');
