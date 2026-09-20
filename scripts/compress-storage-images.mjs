#!/usr/bin/env node
/*
 * Shrinks images already stored in Supabase Storage.
 *
 * Every visitor downloads these files, so their size is the project's egress
 * bill. Each image is re-encoded as WebP at most 1600px on its longest edge and
 * written back to the SAME path, so no database row or page link has to change;
 * only the bytes and the content type change.
 *
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/compress-storage-images.mjs
 *   ... node scripts/compress-storage-images.mjs --apply        # actually write
 *   ... node scripts/compress-storage-images.mjs --min-kb 500   # only the big ones
 *
 * Without --apply it only reports what it would do. Needs cwebp:  brew install webp
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const URL_BASE = process.env.SUPABASE_URL?.replace(/\/+$/, "");
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL_BASE || !KEY) {
  console.error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (Cloudflare → Settings → Runtime variables).");
  process.exit(1);
}
const args = process.argv.slice(2);
const APPLY = args.includes("--apply");
const MIN_BYTES = Number(args[args.indexOf("--min-kb") + 1] || 200) * 1024;
const BUCKETS = args.includes("--bucket")
  ? [args[args.indexOf("--bucket") + 1]]
  : ["news-images", "lms-media", "internship-covers"];
const COMPRESSIBLE = /\.(png|jpe?g)$/i;

try {
  execFileSync("cwebp", ["-version"], { stdio: "ignore" });
} catch {
  console.error("cwebp is not installed. Run: brew install webp");
  process.exit(1);
}

const api = (path, init = {}) =>
  fetch(`${URL_BASE}/storage/v1/${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${KEY}`, apikey: KEY, ...(init.headers || {}) },
  });

async function listAll(bucket, prefix = "") {
  const found = [];
  for (let offset = 0; ; offset += 100) {
    const res = await api(`object/list/${bucket}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ prefix, limit: 100, offset, sortBy: { column: "name", order: "asc" } }),
    });
    if (!res.ok) throw new Error(`list ${bucket}: ${res.status} ${await res.text()}`);
    const page = await res.json();
    if (!page.length) break;
    for (const entry of page) {
      const path = prefix ? `${prefix}/${entry.name}` : entry.name;
      // A folder comes back without metadata; walk into it.
      if (!entry.id && !entry.metadata) found.push(...(await listAll(bucket, path)));
      else found.push({ path, size: entry.metadata?.size ?? 0, type: entry.metadata?.mimetype ?? "" });
    }
    if (page.length < 100) break;
  }
  return found;
}

const kb = (n) => `${Math.round(n / 1024)} KB`;
const work = mkdtempSync(join(tmpdir(), "saae-img-"));
let before = 0;
let after = 0;
let changed = 0;

try {
  for (const bucket of BUCKETS) {
    let files;
    try {
      files = await listAll(bucket);
    } catch (error) {
      console.error(`skipping ${bucket}: ${error.message}`);
      continue;
    }
    const targets = files.filter((f) => COMPRESSIBLE.test(f.path) && f.size > MIN_BYTES);
    console.log(`\n${bucket}: ${targets.length} of ${files.length} files above ${kb(MIN_BYTES)}`);

    for (const file of targets) {
      const res = await api(`object/${bucket}/${file.path.split("/").map(encodeURIComponent).join("/")}`);
      if (!res.ok) {
        console.error(`  ! download ${file.path}: ${res.status}`);
        continue;
      }
      const source = join(work, "in");
      const target = join(work, "out.webp");
      writeFileSync(source, Buffer.from(await res.arrayBuffer()));
      try {
        execFileSync("cwebp", ["-quiet", "-q", "82", "-resize", "1600", "0", source, "-o", target]);
      } catch {
        console.error(`  ! could not encode ${file.path}`);
        continue;
      }
      const bytes = readFileSync(target);
      // Re-encoding a small or already efficient image can make it bigger.
      if (bytes.length >= file.size) {
        console.log(`  = ${file.path} (${kb(file.size)}) already efficient`);
        continue;
      }
      before += file.size;
      after += bytes.length;
      changed += 1;
      console.log(`  ${APPLY ? "→" : "·"} ${file.path}  ${kb(file.size)} → ${kb(bytes.length)}`);
      if (!APPLY) continue;
      const put = await api(`object/${bucket}/${file.path.split("/").map(encodeURIComponent).join("/")}`, {
        method: "PUT",
        headers: { "content-type": "image/webp", "cache-control": "max-age=31536000", "x-upsert": "true" },
        body: bytes,
      });
      if (!put.ok) console.error(`  ! upload ${file.path}: ${put.status} ${await put.text()}`);
    }
  }
} finally {
  rmSync(work, { recursive: true, force: true });
}

console.log(
  `\n${changed} files ${APPLY ? "rewritten" : "would change"}: ${kb(before)} → ${kb(after)}` +
    (before ? ` (${Math.round(100 - (after / before) * 100)}% smaller)` : ""),
);
if (!APPLY && changed) console.log("Nothing was written. Re-run with --apply to write these back.");
