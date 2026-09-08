import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
const planner = resolve('scripts/prepare-storage-url-fix.mjs');
const mock = resolve('tests/offline/mock-storage-api.mjs');
function run(kind, check) {
 const dir = mkdtempSync(resolve(tmpdir(), 'saae-plan-test-')); mkdirSync(resolve(dir, 'app'));
 try {
   const result = spawnSync(process.execPath, ['--import', mock, planner], { cwd: resolve(dir,'app'), encoding: 'utf8', env: { ...process.env, PLAN_CASE: kind, SUPABASE_URL: 'https://zkpuyhrmyslmstzwojvw.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'offline-test-key' } });
   check(result, dir);
 } finally { rmSync(dir, { recursive: true, force: true }); }
}
test('generates guarded SQL with correct instructor key and text-array escaping', () => run('ok', (result, dir) => {
 assert.equal(result.status, 0, result.stderr);
 const sql = readFileSync(resolve(dir,'generated/storage-url-fix.sql'),'utf8');
 assert(sql.includes('WHERE "user_id" ='));
 assert(sql.includes("unchanged '' $saae_url_fix$ text"));
 assert(sql.includes('IS NOT DISTINCT FROM'));
 assert(sql.includes('IF affected <> 1'));
 const delimiter = sql.match(/DO (\$saae_[a-f0-9]+\$)/)[1];
 assert.equal(sql.split(delimiter).length - 1, 2);
 assert(sql.includes('END;\n'+delimiter+';'));
 const plan = JSON.parse(readFileSync(resolve(dir,'generated/storage-url-plan.json'),'utf8'));
 assert.equal(plan.fieldUpdates,2); assert.equal(plan.checkedObjects,2);
}));
test('does not generate SQL when a replacement object is missing', () => run('missing', (result,dir) => {
 assert.notEqual(result.status,0); assert(!existsSync(resolve(dir,'generated/storage-url-fix.sql')));
}));
test('does not rewrite signed or private authentication URLs', () => run('private', (result,dir) => {
 assert.notEqual(result.status,0); assert(!existsSync(resolve(dir,'generated/storage-url-fix.sql')));
}));
