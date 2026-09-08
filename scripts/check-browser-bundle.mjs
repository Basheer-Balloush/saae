import { readdir, readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  return (await Promise.all(entries.map(e => e.isDirectory() ? walk(`${dir}/${e.name}`) : [`${dir}/${e.name}`]))).flat();
}
const files = (await walk('dist/client')).filter(file => /\.(js|html|json|map)$/.test(file));
assert(files.length > 0, 'Build first');
const data = (await Promise.all(files.map(file => readFile(file, 'utf8')))).join('\n');
assert(data.includes('zkpuyhrmyslmstzwojvw.supabase.co'), 'Organization URL is missing from browser build');
for (const old of ['bcfctxfulwyrslingscm.supabase.co', 'orwgcemgwyqkkrfpxlbm.supabase.co', 'mtybiiqfwxoqvvvkxkkr.supabase.co', 'connector-gateway.lovable.dev', 'ai.gateway.lovable.dev']) assert(!data.includes(old), `Unexpected old endpoint: ${old}`);
for (const name of ['SUPABASE_SERVICE_ROLE_KEY','OPENAI_API_KEY','OPENROUTER_API_KEY','RESEND_API_KEY','AUTH_RATE_LIMIT_PEPPER','QUEUE_PROCESS_SECRET','EMAIL_PREVIEW_SECRET','BUNNY_STREAM_API_KEY','BUNNY_STREAM_TOKEN_KEY','BUNNY_WEBHOOK_SECRET']) {
  const secret = process.env[name];
  if (secret && secret.length >= 8) assert(!data.includes(secret), `Private value was included in browser build: ${name}`);
}
for (const match of data.matchAll(/eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g)) {
  let claims; try { claims = JSON.parse(Buffer.from(match[0].split('.')[1], 'base64url')); } catch { continue; }
  assert(claims.role !== 'service_role', 'A privileged JWT was found in the browser build');
}
console.log(`Browser bundle passed destination and credential checks (${files.length} files).`);
