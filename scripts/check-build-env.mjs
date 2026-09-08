import assert from 'node:assert/strict';

const expectedRef = 'zkpuyhrmyslmstzwojvw';
assert.equal(process.env.VITE_SUPABASE_URL, `https://${expectedRef}.supabase.co`,
  'Set VITE_SUPABASE_URL to the organization project in Cloudflare Builds environment variables.');
const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? '';
let claims;
try { claims = JSON.parse(Buffer.from(key.split('.')[1], 'base64url')); } catch { /* opaque publishable key */ }
assert(key.startsWith('sb_publishable_') || claims?.role === 'anon',
  'Set VITE_SUPABASE_PUBLISHABLE_KEY to an organization publishable/anon key, never a secret key.');
if (claims?.ref) assert.equal(claims.ref, expectedRef, 'Public key belongs to a different Supabase project.');
for (const [name, value] of Object.entries(process.env)) {
  if (!name.startsWith('VITE_')) continue;
  assert(!/(SECRET|SERVICE_ROLE|PASSWORD|RESEND|OPENAI|OPENROUTER|PEPPER)/i.test(name),
    `Private variable must not have a VITE_ prefix: ${name}`);
  assert(!value?.startsWith('sb_secret_'), `Privileged key in browser variable: ${name}`);
}
console.log('Public build configuration targets organization Supabase; no credential values printed.');
