#!/usr/bin/env node
/* Precomputes the phone hero's two heavy shapes -- the tree (S0) and the
 * country (S4) -- into public/cinematic/points/hero-phone.bin, so a phone
 * does not rasterise, sample and sort them at load. hero-instrument.js loads
 * the file for the centred (phone) layout and falls back to computing them
 * itself if the file is missing or does not match.
 *
 *   node scripts/generate-hero-phone-points.mjs
 *
 * Re-run it after changing initiative-tree.svg, syria-outline.js, the low
 * tier's shape pitch or the dot floor, then copy the printed hash into
 * PHONE_POINTS_EXPECTED in hero-instrument.js. Until then the phone falls
 * back to the runtime path: safe, only slower.
 *
 * coverage, scanCells, sampleShape and expand are copied from
 * hero-instrument.js and must stay identical to it. Needs `sharp` (already in
 * node_modules as a dependency of the build) to rasterise the SVG.
 *
 * File layout, little-endian:
 *   0  "SAAE"          magic
 *   4  u32 version     1
 *   8  u32 hash        FNV-1a of the inputs (see inputsHash)
 *  12  u32 K           dots per shape
 *  16  u32 treeW       tree mask size the boxes were built from
 *  20  u32 treeH
 *  24  u32 syriaW      country mask size
 *  28  u32 syriaH
 *  32  f32[K*4] S0     tree: x, y, weight, reveal key
 *  ..  f32[K*4] S4     country
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const { SYRIA_RING, SYRIA_LAT0 } = await import(join(root, "public/cinematic/js/syria-outline.js"));

/* Must match hero-instrument.js: the low tier's shape pitch (the phone's),
   the dot floor, the subject box, and the origin of the country's reveal. */
const VERSION = 1;
const PITCH = 0.19;
const K_FLOOR = 22000;
const SUBJECT_X = 5.4;
const SUBJECT_H = 16.2;
const ORIGIN_LON = 38.5;
const ORIGIN_LAT = 35.0;
/* The browser reports the viewBox-only SVG as 133x150, and the scene
   rasterises it 512 wide at that ratio. */
const TREE_W = 512;
const TREE_H = Math.round((512 * 150) / 133);
const SYRIA_H = 620;

const svg = readFileSync(join(root, "public/cinematic/images/initiative-tree.svg"));

function inputsHash() {
  let h = 0x811c9dc5;
  const feed = (text) => {
    for (let i = 0; i < text.length; i++) {
      h ^= text.charCodeAt(i);
      h = Math.imul(h, 0x01000193) >>> 0;
    }
  };
  feed(svg.toString("utf8"));
  feed(JSON.stringify(SYRIA_RING));
  feed(String(SYRIA_LAT0));
  feed([VERSION, PITCH, K_FLOOR, SUBJECT_X, SUBJECT_H, ORIGIN_LON, ORIGIN_LAT, TREE_W, TREE_H, SYRIA_H].join(","));
  return h >>> 0;
}

/* ---- copied from hero-instrument.js ---- */
function coverage(mask, u, v, cellU, cellV) {
  let sum = 0, n = 0;
  for (let sy = -1; sy <= 1; sy++) {
    for (let sx = -1; sx <= 1; sx++) {
      const px = Math.round((u + sx * cellU * 0.33) * (mask.w - 1));
      const py = Math.round((v + sy * cellV * 0.33) * (mask.h - 1));
      n++;
      if (px < 0 || py < 0 || px >= mask.w || py >= mask.h) continue;
      sum += mask.a[py * mask.w + px];
    }
  }
  return sum / n;
}
function scanCells(box, pitch, test, collect) {
  const cols = Math.max(2, Math.round(box.w / pitch));
  const rows = Math.max(2, Math.round(box.h / pitch));
  let n = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const u = (c + 0.5) / cols, v = (r + 0.5) / rows;
      const weight = test(box.x0 + u * box.w, box.y1 - v * box.h, u, v, 1 / cols, 1 / rows);
      if (weight <= 0.001) continue;
      n++;
      if (collect) collect.push(box.x0 + u * box.w, box.y1 - v * box.h, weight);
    }
  }
  return n;
}
function sampleShape(box, pitch, test) {
  const flat = [];
  scanCells(box, pitch, test, flat);
  return flat;
}
function expand(flat, K, keyOf) {
  const n = flat.length / 3;
  let cx = 0, cy = 0;
  for (let i = 0; i < n; i++) { cx += flat[i * 3]; cy += flat[i * 3 + 1]; }
  cx /= n; cy /= n;
  const order = new Array(n);
  for (let i = 0; i < n; i++) order[i] = [Math.atan2(flat[i * 3 + 1] - cy, flat[i * 3] - cx), i];
  order.sort((a, b) => a[0] - b[0]);
  const keys = new Float32Array(n);
  let kmin = Infinity, kmax = -Infinity;
  for (let i = 0; i < n; i++) {
    const k = keyOf(flat[i * 3], flat[i * 3 + 1]);
    keys[i] = k;
    if (k < kmin) kmin = k;
    if (k > kmax) kmax = k;
  }
  const span = Math.max(1e-6, kmax - kmin);
  const out = new Float32Array(K * 4);
  for (let i = 0; i < K; i++) {
    const slot = Math.min(n - 1, Math.floor((i * n) / K));
    const src = order[slot][1];
    out[i * 4] = flat[src * 3];
    out[i * 4 + 1] = flat[src * 3 + 1];
    out[i * 4 + 2] = i === Math.ceil((slot * K) / n) ? flat[src * 3 + 2] : 0;
    out[i * 4 + 3] = (keys[src] - kmin) / span;
  }
  return out;
}
/* ---- end of the copy ---- */

/* The country's projection, as syriaMask/syriaProjection compute it. */
function syriaProjection(ring, heightPx) {
  const k = Math.cos((SYRIA_LAT0 * Math.PI) / 180);
  const proj = ring.map(([lon, lat]) => [lon * k, lat]);
  const xs = proj.map((p) => p[0]), ys = proj.map((p) => p[1]);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const aspect = (maxX - minX) / (maxY - minY);
  const pad = 0.03;
  const h = heightPx;
  const w = Math.round(heightPx * aspect);
  const toX = (x) => ((x - minX) / (maxX - minX) * (1 - pad * 2) + pad) * w;
  const toY = (y) => (1 - ((y - minY) / (maxY - minY) * (1 - pad * 2) + pad)) * h;
  return {
    w, h, aspect,
    outline: proj.map(([px, py]) => [toX(px), toY(py)]),
    project: (lon, lat) => [toX(lon * k), toY(lat)],
  };
}

/* The filled country, scanline by scanline at pixel centres (even-odd; the
   ring does not cross itself, so it is the canvas's fill). */
function syriaMaskFromOutline(proj) {
  const { w, h, outline } = proj;
  const a = new Float32Array(w * h);
  for (let py = 0; py < h; py++) {
    const y = py + 0.5;
    const xs = [];
    for (let i = 0; i < outline.length; i++) {
      const [x1, y1] = outline[i];
      const [x2, y2] = outline[(i + 1) % outline.length];
      if ((y1 <= y && y2 > y) || (y2 <= y && y1 > y)) xs.push(x1 + ((y - y1) / (y2 - y1)) * (x2 - x1));
    }
    xs.sort((p, q) => p - q);
    for (let i = 0; i + 1 < xs.length; i += 2) {
      const from = Math.max(0, Math.ceil(xs[i] - 0.5));
      const to = Math.min(w - 1, Math.floor(xs[i + 1] - 0.5));
      for (let px = from; px <= to; px++) a[py * w + px] = 1;
    }
  }
  return { a, w, h };
}

const { data } = await sharp(svg, { density: 300 })
  .resize(TREE_W, TREE_H, { fit: "fill" })
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });
const treeAlpha = { a: new Float32Array(TREE_W * TREE_H), w: TREE_W, h: TREE_H };
for (let i = 0; i < treeAlpha.a.length; i++) treeAlpha.a[i] = data[i * 4 + 3] / 255;

const syria = syriaProjection(SYRIA_RING, SYRIA_H);
const syriaAlpha = syriaMaskFromOutline(syria);

const box = (w, h) => ({ x0: SUBJECT_X - w / 2, x1: SUBJECT_X + w / 2, y0: -h / 2, y1: h / 2, w, h });
const treeBox = box(SUBJECT_H * 1.1 * (TREE_W / TREE_H), SUBJECT_H * 1.1);
const mapBox = box(SUBJECT_H * 1.19 * syria.aspect, SUBJECT_H * 1.19);
const mapToWorld = (px, py) => [
  mapBox.x0 + (px / (syria.w - 1)) * mapBox.w,
  mapBox.y1 - (py / (syria.h - 1)) * mapBox.h,
];
const [ox, oy] = mapToWorld(...syria.project(ORIGIN_LON, ORIGIN_LAT));

const R0 = sampleShape(treeBox, PITCH, (x, y, u, v, cu, cv) => {
  const c = coverage(treeAlpha, u, v, cu, cv);
  return c > 0.28 ? c : 0;
});
const R4 = sampleShape(mapBox, PITCH, (x, y, u, v, cu, cv) => {
  const c = coverage(syriaAlpha, u, v, cu, cv);
  return c > 0.5 ? 1 : 0;
});
for (let i = 0; i < R4.length; i += 3) R4[i + 2] = 0.46;

const K = Math.max(K_FLOOR, R0.length / 3, R4.length / 3);
const S0 = expand(R0, K, (x, y) => y);
const S4 = expand(R4, K, (x, y) => Math.hypot(x - ox, y - oy));

const hash = inputsHash();
const header = Buffer.alloc(32);
header.write("SAAE", 0, "ascii");
header.writeUInt32LE(VERSION, 4);
header.writeUInt32LE(hash, 8);
header.writeUInt32LE(K, 12);
header.writeUInt32LE(TREE_W, 16);
header.writeUInt32LE(TREE_H, 20);
header.writeUInt32LE(syria.w, 24);
header.writeUInt32LE(syria.h, 28);
const body = Buffer.concat([
  header,
  Buffer.from(S0.buffer, S0.byteOffset, S0.byteLength),
  Buffer.from(S4.buffer, S4.byteOffset, S4.byteLength),
]);

const outDir = join(root, "public/cinematic/points");
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, "hero-phone.bin"), body);
const manifest = {
  version: VERSION, hash: `0x${hash.toString(16).padStart(8, "0")}`, K,
  tree: { w: TREE_W, h: TREE_H, cells: R0.length / 3 },
  syria: { w: syria.w, h: syria.h, cells: R4.length / 3 },
  bytes: body.length,
};
writeFileSync(join(outDir, "hero-phone.manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify(manifest));
console.log(`PHONE_POINTS_EXPECTED = ${manifest.hash}`);
