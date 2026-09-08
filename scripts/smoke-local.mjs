import assert from 'node:assert/strict';
const origin = process.argv[2] ?? 'http://localhost:4173';
assert(['localhost','127.0.0.1'].includes(new URL(origin).hostname), 'This script only tests a local Worker');
const checks = [
  ['GET','/learning-management-system/login',200],
  ['GET','/attendance-management-system',200],
  ['POST','/api/chat',503],
  ['POST','/lovable/email/queue/process',503],
  ['POST','/lovable/email/auth/webhook',410],
  ['POST','/lovable/email/auth/preview',503],
];
for (const [method, path, expected] of checks) {
  const response = await fetch(origin + path, { method, ...(method === 'POST' ? { headers: { 'Content-Type': 'application/json' }, body: '{}' } : {}), signal: AbortSignal.timeout(30_000) });
  assert.equal(response.status, expected, `${method} ${path}`);
  if (method === 'GET') { const html = await response.text(); assert(html.includes('<html'), `Missing rendered HTML: ${path}`); }
  console.log(`${method} ${path}: ${response.status}`);
}
console.log('Local smoke tests passed with providers and email jobs disabled.');
