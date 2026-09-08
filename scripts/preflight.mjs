import assert from 'node:assert/strict';
const expected = 'https://zkpuyhrmyslmstzwojvw.supabase.co';
const env = process.env;
function required(name) {
  assert(env[name] && !env[name].includes('REPLACE_'), `${name} must be configured`);
  return env[name];
}
function jwt(value) { try { return JSON.parse(Buffer.from(value.split('.')[1], 'base64url')); } catch { return null; } }
assert.equal(required('VITE_SUPABASE_URL'), expected, 'Browser destination must be the organization project');
assert.equal(required('SUPABASE_URL'), expected, 'Server destination must be the organization project');
assert.equal(required('VITE_SUPABASE_PUBLISHABLE_KEY'), required('SUPABASE_PUBLISHABLE_KEY'), 'Browser and server public keys differ');
const publicKey = env.VITE_SUPABASE_PUBLISHABLE_KEY;
assert(!publicKey.startsWith('sb_secret_'), 'Privileged key in browser configuration');
const publicJwt = jwt(publicKey);
assert(publicKey.startsWith('sb_publishable_') || publicJwt?.role === 'anon', 'Expected an anon or publishable browser key');
const adminKey = required('SUPABASE_SERVICE_ROLE_KEY');
assert(adminKey !== publicKey, 'Admin and public keys must differ');
assert(adminKey.startsWith('sb_secret_') || jwt(adminKey)?.role === 'service_role', 'Expected a server admin credential');
for (const key of [publicKey, adminKey]) {
  const claims = jwt(key);
  if (claims?.ref) assert.equal(claims.ref, 'zkpuyhrmyslmstzwojvw', 'Key belongs to another project');
}
const site = new URL(required('SITE_URL'));
assert(!site.username && !site.password && !site.search && !site.hash && site.pathname === '/', 'SITE_URL must be an origin');
assert(site.protocol === 'https:' || (site.hostname === 'localhost' && site.protocol === 'http:'), 'Invalid SITE_URL protocol');
assert(required('AUTH_RATE_LIMIT_PEPPER').length >= 32, 'Use a random pepper of at least 32 characters');
const mode = required('EMAIL_DELIVERY_MODE');
assert(['disabled', 'test', 'live'].includes(mode), 'Invalid email delivery mode');
for (const name of ['ENABLE_EMAIL_QUEUES', 'ENABLE_TRAINER_OUTBOX']) assert(['true','false'].includes(required(name)), `${name} must be true or false`);
if (mode !== 'disabled') { required('RESEND_API_KEY'); required('EMAIL_FROM'); }
if (mode === 'test') assert(required('TEST_EMAIL_ALLOWLIST').trim(), 'Set exact team-controlled test recipients');
if (env.ENABLE_EMAIL_QUEUES === 'true') required('QUEUE_PROCESS_SECRET');
for (const name of Object.keys(env).filter(name => name.startsWith('VITE_'))) {
  assert(!/(SECRET|SERVICE_ROLE|PASSWORD|RESEND|OPENAI|OPENROUTER|PEPPER)/.test(name), `Private setting has browser prefix: ${name}`);
}
console.log('Configuration checks passed for organization project zkpuyhrmyslmstzwojvw. No credentials printed.');
console.log(`Email mode: ${mode}; trainer outbox: ${env.ENABLE_TRAINER_OUTBOX}; PGMQ: ${env.ENABLE_EMAIL_QUEUES}.`);
console.log(`Chat: ${env.OPENROUTER_API_KEY && env.CHAT_MODEL ? 'configured; live test required' : 'not configured'}; embeddings: ${env.OPENAI_API_KEY ? 'configured; live test required' : 'not configured'}.`);
