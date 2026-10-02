#!/usr/bin/env node
/*
 * Shrinks images already stored in Supabase Storage.
 *
 * Every visitor downloads these files, so their size is the project's egress
 * bill. Each image is re-encoded as WebP at most 1600px on its longest edge and
 * written back to the SAME path, so no database row or page link has to change;
 * only the bytes and the content type change.
 *
 *   SUPABASE_SERVICE_ROLE_KEY=... node --env-file=.env scripts/compress-storage-images.mjs
 *   ... node --env-file=.env scripts/compress-storage-images.mjs --apply        # actually write
 *   ... node --env-file=.env scripts/compress-storage-images.mjs --min-kb 500   # only the big ones
 *
 * Without --apply it only reports what it would do. The project URL comes from
 * SUPABASE_URL, or VITE_SUPABASE_URL in .env.
 */
import sharp from "sharp";

const URL_BASE = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL)?.replace(/\/+$/, "");
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL_BASE || !KEY) {
  console.error(
    "Set SUPABASE_SERVICE_ROLE_KEY (Supabase → Project Settings → API keys), and SUPABASE_URL or VITE_SUPABASE_URL.",
  );
  process.exit(1);
}
const args = process.argv.slice(2);
const APPLY = args.includes("--apply");
// Read the value only when the flag is there: indexOf(-1) + 1 would pick up the
// first argument ("--apply"), which made every size comparison NaN and false.
const MIN_BYTES =
  (args.includes("--min-kb") ? Number(args[args.indexOf("--min-kb") + 1]) : 200) * 1024;
if (!(MIN_BYTES > 0)) {
  console.error("--min-kb needs a positive number, e.g. --min-kb 500");
  process.exit(1);
}
const BUCKETS = args.includes("--bucket")
  ? [args[args.indexOf("--bucket") + 1]]
  : ["news-images", "lms-media", "internship-covers"];
const COMPRESSIBLE = /\.(png|jpe?g)$/i;

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
      body: JSON.stringify({
        prefix,
        limit: 100,
        offset,
        sortBy: { column: "name", order: "asc" },
      }),
    });
    if (!res.ok) throw new Error(`list ${bucket}: ${res.status} ${await res.text()}`);
    const page = await res.json();
    if (!page.length) break;
    for (const entry of page) {
      const path = prefix ? `${prefix}/${entry.name}` : entry.name;
      // A folder comes back without metadata; walk into it.
      if (!entry.id && !entry.metadata) found.push(...(await listAll(bucket, path)));
      else
        found.push({ path, size: entry.metadata?.size ?? 0, type: entry.metadata?.mimetype ?? "" });
    }
    if (page.length < 100) break;
  }
  return found;
}

const kb = (n) => `${Math.round(n / 1024)} KB`;
let before = 0;
let after = 0;
let changed = 0;

for (const bucket of BUCKETS) {
  let files;
  try {
    files = await listAll(bucket);
  } catch (error) {
    console.error(`skipping ${bucket}: ${error.message}`);
    continue;
  }
  // A rewritten file keeps its .png/.jpg name but is stored as image/webp; skipping
  // those makes a second run harmless instead of re-encoding (and degrading) them.
  const targets = files.filter(
    (f) => COMPRESSIBLE.test(f.path) && f.type !== "image/webp" && f.size > MIN_BYTES,
  );
  console.log(`\n${bucket}: ${targets.length} of ${files.length} files above ${kb(MIN_BYTES)}`);

  for (const file of targets) {
    const res = await api(
      `object/${bucket}/${file.path.split("/").map(encodeURIComponent).join("/")}`,
    );
    if (!res.ok) {
      console.error(`  ! download ${file.path}: ${res.status}`);
      continue;
    }
    let bytes;
    try {
      // Same limits as uploads (src/lib/image-compress.ts): longest edge at most
      // 1600px, never enlarged, quality 82. rotate() applies the EXIF orientation
      // before it is dropped, so phone photos stay upright.
      bytes = await sharp(Buffer.from(await res.arrayBuffer()))
        .rotate()
        .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
        .webp({ quality: 82 })
        .toBuffer();
    } catch {
      console.error(`  ! could not encode ${file.path}`);
      continue;
    }
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
    const put = await api(
      `object/${bucket}/${file.path.split("/").map(encodeURIComponent).join("/")}`,
      {
        method: "PUT",
        headers: {
          "content-type": "image/webp",
          "cache-control": "max-age=31536000",
          "x-upsert": "true",
        },
        body: bytes,
      },
    );
    if (!put.ok) console.error(`  ! upload ${file.path}: ${put.status} ${await put.text()}`);
  }
}

console.log(
  `\n${changed} files ${APPLY ? "rewritten" : "would change"}: ${kb(before)} → ${kb(after)}` +
    (before ? ` (${Math.round(100 - (after / before) * 100)}% smaller)` : ""),
);
if (!APPLY && changed) console.log("Nothing was written. Re-run with --apply to write these back.");
