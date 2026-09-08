// Generates reviewed SQL only. This script never updates the database.
import { createClient } from '@supabase/supabase-js';
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
const target = 'https://zkpuyhrmyslmstzwojvw.supabase.co';
assert.equal(process.env.SUPABASE_URL, target, 'Only the organization destination is supported');
assert(process.env.SUPABASE_SERVICE_ROLE_KEY, 'Set the destination server credential');
const client = createClient(target, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const oldHosts = new Set(['bcfctxfulwyrslingscm.supabase.co','orwgcemgwyqkkrfpxlbm.supabase.co','mtybiiqfwxoqvvvkxkkr.supabase.co']);
const columns = [
 ['initiative_donations','logo_url'], ['lms_courses','cover_url'], ['lms_instructors','avatar_url'],
 ['news','image_url'], ['news','images'], ['news','videos'], ['partners','logo_url'], ['partners','logo_light_url'],
];
const verified = new Set();
async function mapValue(value) {
 if (Array.isArray(value)) return Promise.all(value.map(mapValue));
 if (typeof value !== 'string') return value;
 let url; try { url = new URL(value); } catch { return value; }
 if (!oldHosts.has(url.hostname)) return value;
 assert(url.protocol === 'https:' && !url.username && !url.password && !url.port, 'Unexpected source URL shape; review manually');
 assert(url.pathname.startsWith('/storage/v1/object/public/'), 'Private/signed/non-storage URL requires manual review; no SQL generated');
 const next = target + url.pathname + url.search + url.hash;
 if (!verified.has(next)) {
   const response = await fetch(next, { method: 'HEAD', redirect: 'error', signal: AbortSignal.timeout(15_000) });
   assert(response.ok, `Destination object check failed (${response.status}); no SQL generated`);
   verified.add(next);
 }
 return next;
}
const quote = value => "'" + value.replaceAll("'", "''") + "'";
function literal(value) {
 if (value === null) return 'NULL';
 if (Array.isArray(value)) return 'ARRAY[' + value.map(literal).join(',') + ']::text[]';
 assert(typeof value === 'string', 'Unexpected column type');
 return quote(value);
}
let statements = [], counts = [];
for (const [table, column] of columns) {
 let changed = 0;
 const primaryKey = table === 'lms_instructors' ? 'user_id' : 'id';
 for (let offset = 0; ; offset += 500) {
   const { data, error } = await client.from(table).select(`${primaryKey},${column}`).order(primaryKey).range(offset, offset + 499);
   if (error) throw new Error(`Could not read ${table}.${column}: ${error.code}`);
   for (const row of data) {
     const previous = row[column], next = await mapValue(previous);
     if (JSON.stringify(previous) === JSON.stringify(next)) continue;
     assert(typeof row[primaryKey] === 'string' && /^[0-9a-f-]{36}$/i.test(row[primaryKey]), 'Expected UUID primary key');
     statements.push(`  UPDATE public."${table}" SET "${column}" = ${literal(next)} WHERE "${primaryKey}" = ${quote(row[primaryKey])}::uuid AND "${column}" IS NOT DISTINCT FROM ${literal(previous)};\n  GET DIAGNOSTICS affected = ROW_COUNT;\n  IF affected <> 1 THEN RAISE EXCEPTION 'Source value changed; regenerate the URL plan'; END IF;`);
     changed++;
   }
   if (data.length < 500) break;
 }
 counts.push({ table, column, changed });
}
const statementsText = statements.join('\n');
let delimiter; do { delimiter = '$saae_' + randomUUID().replaceAll('-', '') + '$'; } while (statementsText.includes(delimiter));
const sql = `-- Generated for zkpuyhrmyslmstzwojvw only. Public object existence checked before generation.\n-- Review before running. Old-value checks roll back the entire transaction on drift.\nBEGIN;\nSET LOCAL standard_conforming_strings = on;\nSET LOCAL statement_timeout = '60s';\nDO ${delimiter}\nDECLARE affected integer;\nBEGIN\n${statementsText}\nEND;\n${delimiter};\nCOMMIT;\n`;
await mkdir('../generated', { recursive: true, mode: 0o700 });
await writeFile('../generated/storage-url-fix.sql', sql, { mode: 0o600 });
await writeFile('../generated/storage-url-plan.json', JSON.stringify({ destination: target, generatedAt: new Date().toISOString(), fieldUpdates: statements.length, checkedObjects: verified.size, counts }, null, 2) + '\n', { mode: 0o600 });
console.log(`Prepared ${statements.length} field updates; checked ${verified.size} destination objects. Database unchanged.`);
console.log('Review ../generated/storage-url-fix.sql before applying it to the organization database.');
