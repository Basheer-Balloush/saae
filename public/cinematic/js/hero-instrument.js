/* SAAE tree story.
 * The opening keeps the official logo's existing dot sampling and entrance.
 * Scroll then moves the camera through the roots, trunk and three branch
 * endpoints. The tree stays intact until the initiative fruit gathers its
 * dots and unfolds into the geographic Syria network.
 * tree-story.js owns traced logo paths and the six root / three fruit accents.
 * The five shader slots are retained for compatibility; slots 0–3 share the
 * tree and slot 4 carries the country. Camera motion does the storytelling.
 */
import { fruitContentMask } from "./fruit-content.js";
import { communityMask, COMMUNITY_ICONS } from "./community-content.js";
import * as THREE from "./three.module.min.js";
import { SYRIA_RING, SYRIA_LAT0 } from "./syria-outline.js";
import { treeStoryState, createTreeStory, FRUITS } from "./tree-story.js";
import { createSyriaNetwork } from "./syria-network.js";

const TREE_URL = "../images/initiative-tree.svg";

const TIERS = {
  /* One pitch for every shape, so the whole journey is drawn on a single dot
     matrix at a single density. Shapes then differ only in how many dots they
     claim: the tree a few thousand, the country several times that.

     Forcing every shape to the same COUNT instead was tried and is wrong in
     both directions at once. Sized for the country, thousands of dots land
     sub-pixel apart in the tree's thin strokes and additive blending saturates
     them into a white smear; sized for the tree, the country thins out into
     scattered confetti. Equal density is the thing that has to hold. */
  high: { ground: 0.105, shape: 0.118, rays: 72, dpr: 2.0 },
  mid:  { ground: 0.130, shape: 0.145, rays: 54, dpr: 1.75 },
  low:  { ground: 0.170, shape: 0.190, rays: 38, dpr: 1.5 }
};

/* The lattice overfills the frame on purpose. A field with visible edges reads
   as a grey panel dropped on the page; a field that runs off every edge reads
   as the surface the page is drawn on. */
const FIELD_W = 48;
const FIELD_H = 25;

/* Every shape is drawn inside a box offset from world centre, so it sits in the
   lane opposite the caption card. */
const SUBJECT_X = 5.4;
const SUBJECT_H = 16.2;

/* Keep geography on a single plane: raising cities toward a perspective
   camera shifts their screen positions relative to the national outline. */
const RELIEF = 0;

/* A central reveal seed, not a highlighted city or a network hub. */
const ORIGIN_LON = 38.5;
const ORIGIN_LAT = 35.0;

const clamp01 = x => Math.max(0, Math.min(1, x));
/* Smootherstep, not smoothstep. Both start and end at rest, but smoothstep
   still has a jerk at each end -- its ACCELERATION jumps from zero to full the
   instant a window opens, which is what makes a transition feel like it starts
   abruptly however long you give it. 6t^5-15t^4+10t^3 has zero first AND
   second derivative at both ends, so a beat eases into moving and eases out of
   it. Same endpoints, same reversibility, softer shoulders. */
const smooth = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * t * (t * (t * 6 - 15) + 10); };

function token(name, fallback) {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return new THREE.Color(v || fallback);
}

function loadImage(url) {
  return new Promise((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = () => rej(new Error("cannot load " + url));
    i.src = url;
  });
}

function maskFromCanvas(canvas) {
  const x = canvas.getContext("2d", { willReadFrequently: true });
  const w = canvas.width, h = canvas.height;
  const d = x.getImageData(0, 0, w, h).data;
  const a = new Float32Array(w * h);
  for (let i = 0, p = 3; i < a.length; i++, p += 4) a[i] = d[p] / 255;
  return { a, w, h, aspect: w / h };
}

function alphaOf(image, w, h) {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  c.getContext("2d", { willReadFrequently: true }).drawImage(image, 0, 0, w, h);
  return maskFromCanvas(c);
}

/* A number is a quantity you read at a glance. An earlier version lit the whole
   lattice for the million and it was, correctly, called incomprehensible. */
function textMask(text, sizePx) {
  const family = getComputedStyle(document.body).fontFamily || "Arial, sans-serif";
  const font = "700 " + sizePx + "px " + family;
  const c = document.createElement("canvas");
  let x = c.getContext("2d", { willReadFrequently: true });
  x.font = font;
  c.width = Math.ceil(x.measureText(text).width) + Math.round(sizePx * 0.2);
  c.height = Math.round(sizePx * 1.28);
  /* Resizing a canvas resets its context, so the font is set again after. */
  x = c.getContext("2d", { willReadFrequently: true });
  x.font = font;
  x.textAlign = "center";
  x.textBaseline = "middle";
  x.fillStyle = "#fff";
  x.fillText(text, c.width / 2, c.height / 2);
  return maskFromCanvas(c);
}

function syriaMask(ring, heightPx) {
  const k = Math.cos(SYRIA_LAT0 * Math.PI / 180);
  const proj = ring.map(([lon, lat]) => [lon * k, lat]);
  const xs = proj.map(p => p[0]), ys = proj.map(p => p[1]);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  /* The canvas takes the country's own aspect ratio. Forcing a fixed canvas
     onto the field once stretched Syria sideways by about a third. */
  const aspect = (maxX - minX) / (maxY - minY);
  const pad = 0.03;
  const h = heightPx;
  const w = Math.round(heightPx * aspect);
  const toX = x => ((x - minX) / (maxX - minX) * (1 - pad * 2) + pad) * w;
  const toY = y => (1 - ((y - minY) / (maxY - minY) * (1 - pad * 2) + pad)) * h;

  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const x = c.getContext("2d", { willReadFrequently: true });
  x.fillStyle = "#fff";
  x.beginPath();
  proj.forEach(([px, py], i) => (i ? x.lineTo(toX(px), toY(py)) : x.moveTo(toX(px), toY(py))));
  x.closePath();
  x.fill();
  const mask = maskFromCanvas(c);
  mask.outline = proj.map(([px, py]) => [toX(px), toY(py)]);
  mask.project = (lon, lat) => [toX(lon * k), toY(lat)];
  return mask;
}

/* Average the mask over the cell instead of point-sampling it. Point sampling a
   fine branch either hits or misses, which is what makes a lattice look ragged;
   averaging gives each cell a coverage value, so edges read smooth. */
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

/* ---- Shapes as lists of lattice cells -----------------------------------
 *
 * Every shape must hand back the SAME number of dots, because the same dots
 * carry through all five. Sampling each shape at one shared pitch will not do
 * that: the tree covers a fraction of its box and the country covers most of
 * its own, so at equal pitch the country outnumbers the tree several times
 * over. Padding the tree would stack six dots per cell and thicken it into a
 * blob; thinning the country would punch holes in it.
 *
 * So each shape gets its OWN pitch, solved for. Sample, count, scale the pitch
 * by sqrt(count / wanted), sample again. Two rounds land within a few percent.
 * Each shape is then internally a regular grid at the density that suits it,
 * which is what keeps the dot-matrix look while the counts match exactly.
 */
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

/* Every shape is expanded to the same K, the largest shape's own cell count,
   because one buffer of dots has to serve all five. A shape with fewer cells
   than K lights exactly its own cells: the surplus dots are parked on top of a
   neighbour at zero weight, invisible, and fly out from there when a later
   shape needs them. Nothing is stacked, nothing is thinned, and the density
   stays equal everywhere.

   Correspondence is by angle around each shape's own centroid. A dot in the
   crown of the tree becomes a dot in the top of the numeral and then the north
   of the country, so the change reads as one thing turning into another rather
   than as noise resolving into a picture. The sort also gives the stagger its
   meaning: consecutive indices are neighbours, so a delay that rises with
   index sweeps around the shape instead of sparkling at random. */
function expand(flat, K, keyOf) {
  const n = flat.length / 3;
  let cx = 0, cy = 0;
  for (let i = 0; i < n; i++) { cx += flat[i * 3]; cy += flat[i * 3 + 1]; }
  cx /= n; cy /= n;

  const order = new Array(n);
  for (let i = 0; i < n; i++) {
    order[i] = [Math.atan2(flat[i * 3 + 1] - cy, flat[i * 3] - cx), i];
  }
  order.sort((a, b) => a[0] - b[0]);

  /* Each shape reveals in an order that suits what it is, rather than every
     shape sweeping round by angle. A line drawn along its own length reads as
     a line being drawn; a country filling outward from one point reads as
     something spreading from that point. Angle ordering still governs which
     dot goes where between shapes -- that is what keeps the morph coherent --
     but it no longer governs WHEN. */
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
    const slot = Math.min(n - 1, Math.floor(i * n / K));
    const src = order[slot][1];
    out[i * 4] = flat[src * 3];
    out[i * 4 + 1] = flat[src * 3 + 1];
    /* One dot per real cell carries the weight; the rest ride along dark. */
    out[i * 4 + 2] = (i === Math.ceil(slot * K / n)) ? flat[src * 3 + 2] : 0;
    out[i * 4 + 3] = (keys[src] - kmin) / span;
  }
  return out;
}

/* ---- The flight ---------------------------------------------------------
 *
 * Each dot carries five positions and travels between them. uPhase runs 0 to 4
 * across the journey with a plateau at each whole number, so a shape is held,
 * then transformed, then held.
 *
 * Three things make the transformation read as motion rather than as a
 * dissolve, and all three come from the reference:
 *
 *   stagger  every dot has its own delay. Because dots are indexed by angle
 *            around the shape, a rising delay sweeps the change around the
 *            shape instead of sparkling at random. Nothing ever moves all at
 *            once.
 *   arc      dots travel along a curve, lifted off the plane and bowed
 *            sideways, so the field opens into depth mid-flight instead of
 *            sliding flat.
 *   arrival  a dot in flight is smaller and dimmer than a dot at rest, so the
 *            shape sharpens as it lands. Arrival is the accent.
 */
const FLIGHT_VERT = `
  /* xy position, z weight, w the dot's place in THIS shape's reveal order. */
  attribute vec4 aS0, aS1, aS2, aS3, aS4;
  /* The numeral counts, so its slot is two frames of the counter and a blend
     between them. aS2 is the frame the count is leaving, aN2 the one it is
     arriving at. Everything else in the scene has exactly one shape per beat. */
  attribute vec4 aN2, aContent;
  /* The community the field is moving TO, while uSwap runs 0 to 1. Browsing
     from one community to the next is a move between two pictograms, so the
     dots go straight from one to the other; the tree is not on that path. */
  attribute vec4 aContentB;
  attribute vec2 aRand;

  uniform float uPhase, uStagger, uArc, uIdle, uPixelRatio, uDotScale, uHold, uBurst, uNum;
  uniform float uRelief, uTreeCollapse;
  /* x: strength, y: where the wave is in world y, z: how wide the band is. */
  uniform vec3 uRootPulse;
  uniform vec2 uFruit, uContentOrigin;
  uniform float uContentMix, uSwap;
  /* How much of the learning screen's progress bar has filled, 0 to 1, or -1
     when the shape on screen has no bar in it. */
  uniform float uFill;
  /* The bar's interior in world space: x0, x1, y0, y1. */
  uniform vec4  uFillRect;
  uniform vec2  uCentre;
  uniform vec4  uCalm;
  uniform vec3  uPointer;
  /* Signed, roughly -1 to 1 at a hard flick. The page's spring has always
     carried a velocity and has never done anything with it. */
  uniform float uVelocity;
  /* Every shape is two toned and grades along its OWN reveal key, so colour
     travels through a beat instead of sitting on it: the mark is green where
     it is rooted and light where it reaches, a pathway brightens as it draws,
     the country runs white at its origin and green at its border. One hue for
     the whole journey was the flattest thing about the old finale. */
  uniform vec3  uA0, uA1, uA2, uA3, uA4;
  uniform vec3  uB0, uB1, uB2, uB3, uB4;
  uniform vec3  uRim;

  varying vec3  vColor;
  varying float vAlpha;

  vec4 pickPos(float i) {
    vec4 r = aS0;
    r = mix(r, aS1, step(0.5, i));
    r = mix(r, mix(aS2, aN2, uNum), step(1.5, i));
    r = mix(r, aS3, step(2.5, i));
    r = mix(r, aS4, step(3.5, i));
    if (i < 3.5) r.xy = mix(r.xy, uFruit + (r.xy-uFruit)*0.018, uTreeCollapse);
    return r;
  }
  vec3 pickCol(float i, vec4 sh) {
    vec3 lo = uA0, hi = uB0;
    lo = mix(lo, uA1, step(0.5, i)); hi = mix(hi, uB1, step(0.5, i));
    lo = mix(lo, uA2, step(1.5, i)); hi = mix(hi, uB2, step(1.5, i));
    lo = mix(lo, uA3, step(2.5, i)); hi = mix(hi, uB3, step(2.5, i));
    lo = mix(lo, uA4, step(3.5, i)); hi = mix(hi, uB4, step(3.5, i));
    vec3 c = mix(lo, hi, sh.w);
    /* The country takes a third stop. White at the origin, turquoise through
       the middle distance, green at the rim, so the land reads as light that
       arrived from somewhere and cooled on the way rather than as a slab of
       one colour.

       Its grade is pulled well forward of the others. Distance from the origin
       is not spread evenly over a country: most of the land sits at a middle
       distance, so a straight grade spent almost the whole map in one mid tone
       and never reached its far stop at all. */
    float g = sh.w;
    vec3 land = mix(lo, hi, smoothstep(0.015, 0.34, g));
    land = mix(land, uRim, smoothstep(0.26, 0.78, g) * 0.9);
    c = mix(c, land, step(3.5, i));
    return c;
  }

  /* Only the country stands off the plane. It rises as a shallow dome, highest
     at the origin and level at the border, with a low ripple across it so the
     surface has a grain rather than a polished bulge. The perspective camera
     does the rest: dots near the core sit nearer and draw larger, which is what
     makes the land read as a form instead of a sticker. The border keeps
     registering with the fill because the rim is exactly where the dome is
     flat. */
  float reliefOf(float i, vec4 sh) {
    float w = sh.w;
    float dome = (1.0 - w) * (1.0 - w);
    float grain = sin(sh.x * 0.85 + 0.7) * cos(sh.y * 1.05 - 0.4) * (1.0 - w);
    return step(3.5, i) * uRelief * (dome + grain * 0.20);
  }

  void main() {
    float i0 = floor(uPhase);
    float i1 = min(i0 + 1.0, 4.0);
    float raw = uPhase - i0;

    vec4 a = pickPos(i0);
    vec4 b = pickPos(i1);

    /* The stagger is taken from the shape being BUILT, so the arriving shape
       draws itself in its own order: a track extends along its length, the
       country floods outward from its origin. A pinch of per-dot noise stops
       whole ranks moving in perfect lockstep. */
    float delay = (b.w * 0.92 + aRand.y * 0.08) * uStagger;
    float t = clamp((raw - delay) / max(1e-4, 1.0 - uStagger), 0.0, 1.0);
    t = t * t * (3.0 - 2.0 * t);

    vec3 pos = vec3(mix(a.xy, b.xy, t), 0.0);
    float lift = mix(reliefOf(i0, a), reliefOf(i1, b), t);
    pos.z += lift;
    float weight = mix(a.z, b.z, t);

    /* The arc. Perpendicular to the dot's own path, so a shape blooms outward
       through the change rather than shearing in one direction. */
    float bow = sin(t * 3.14159265) * uArc;
    vec2 d = b.xy - a.xy;
    float len = max(length(d), 0.0001);
    vec2 perp = vec2(-d.y, d.x) / len;
    float side = aRand.y * 2.0 - 1.0;
    pos.xy += perp * bow * side * 0.42 * min(len, 6.0);
    pos.z += bow * (1.4 + side * 0.6);

    // Use the same particle identities to dissolve the branch into its fruit,
    // assemble the content, then retrace the movement back into the tree.
    float contentT = 0.0;
    float contentFlight = 0.0;
    if (uContentMix > 0.0) {
      /* Where this dot is going. While uSwap runs, that is a point travelling
         between two pictograms -- so the whole content target moves, and the
         path below carries the field to wherever it has got to.

         The swap used to be done by the OTHER route: hold aContent still,
         wind uContentMix back down toward zero, change the buffer at the
         bottom, wind it up again. But uContentMix is the road from the tree to
         a pictogram, so winding it down is literally a trip back to the tree,
         and every change of community made the whole field fly home and come
         back. Fine for arriving; wrong for browsing. */
      vec4 target = aContent;
      float swapArc = 0.0;
      if (uSwap > 0.0) {
        /* The same per-dot lag the arrival uses, so a swap sweeps around the
           shape rather than every dot leaving at once. */
        float sLag = aRand.x * 0.35;
        float sT = clamp((uSwap - sLag) / (1.0 - sLag), 0.0, 1.0);
        sT = sT * sT * (3.0 - 2.0 * sT);
        target = mix(aContent, aContentB, sT);
        swapArc = sin(sT * 3.14159265);
      }

      float lag = aRand.y * 0.27;
      contentT = clamp((uContentMix-lag)/(1.0-lag),0.0,1.0);
      contentT = contentT*contentT*(3.0-2.0*contentT);
      float gather = smoothstep(0.0,0.46,contentT);
      float unfold = smoothstep(0.34,1.0,contentT);
      float theta = aRand.x*6.2831853 + contentT*3.14159265;
      vec2 cloud = uContentOrigin + vec2(cos(theta),sin(theta))*(0.15+aRand.y*0.8);
      pos.xy = mix(mix(pos.xy,cloud,gather),target.xy,unfold);
      /* A shallow bow across the swap, perpendicular to the dot's own path, so
         one pictogram blooms into the next instead of sliding into it. Same
         device the beat transitions use, a third of the size: this is a
         change of subject, not a change of chapter. */
      vec2 sd = aContentB.xy - aContent.xy;
      vec2 sPerp = vec2(-sd.y, sd.x) / max(length(sd), 0.0001);
      pos.xy += sPerp * swapArc * (aRand.y - 0.5) * 0.5 * min(length(sd), 3.0) * unfold;
      contentFlight = sin(contentT*3.14159265);
      pos.z += contentFlight*(aRand.y-.5)*1.4 + swapArc * (aRand.y - .5) * 0.7 * unfold;
      /* A progress bar that is a picture of a progress bar is a contradiction,
         so this one fills. Its dots are identified by where they are GOING --
         a thin band in the middle of the drawing, well clear of the rounded
         box around it -- and the ones past the fill edge simply do not arrive.
         Because contentT scales the change, a dot that is not wanted yet fades
         out along its own flight path rather than popping. */
      float arrive = target.z;
      if (uFill >= 0.0
          && target.y > uFillRect.z && target.y < uFillRect.w
          && target.x > uFillRect.x && target.x < uFillRect.y) {
        arrive *= step((target.x - uFillRect.x) / max(uFillRect.y - uFillRect.x, 1e-5), uFill);
      }
      weight = mix(weight,arrive,contentT);
    }

    /* The entrance. Dots start thrown outward past the frame and are drawn in
       on the same stagger the transformations use, so the first thing the page
       does is the same move it will keep doing. */
    float burst = clamp((uBurst - a.w * 0.45) / 0.55, 0.0, 1.0);
    burst = burst * burst;
    vec2 away = normalize(pos.xy - uCentre + vec2(0.0001));
    pos.xy += away * burst * 15.0;
    pos.z -= burst * 5.0;

    /* Keep the living tree, but let assembled letters settle. The old .022
       drift exceeded the content lattice's .018 spacing and broke strokes. */
    float contentRest = smoothstep(0.75, 1.0, contentT);
    float idleAmplitude = mix(0.022, 0.0025, contentRest);
    float ph = aRand.y * 6.2831853;
    pos.x += sin(uIdle + ph) * idleAmplitude * (1.0 - smoothstep(3.0, 4.0, uPhase));
    pos.y += cos(uIdle * 0.87 + ph * 1.7) * idleAmplitude * (1.0 - smoothstep(3.0, 4.0, uPhase));

    float warm = 0.0;
    if (uPointer.z > 0.001) {
      float pd = distance(pos.xy, uPointer.xy);
      warm = uPointer.z * exp(-pd * pd * 0.05);
    }

    /* Lean into the scroll. A square point sprite cannot be drawn as a streak,
       so speed is read the way a camera reads it: the dot grows and dims
       together, which is what motion blur is. Fast flick and the field blooms
       into haze; stop and it snaps back to points. Zero at rest, so a parked
       scroll position always renders the same frame. */
    // Preserve crisp reading while scrolling through a hold; keep flight blur.
    float speed = clamp(abs(uVelocity), 0.0, 1.0) * (1.0 - contentRest * 0.9);

    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    vec4 clip = projectionMatrix * mv;

    vColor = mix(pickCol(i0, a), pickCol(i1, b), t);
    vColor = mix(vColor, mix(uB0, vec3(.92,1.0,1.0),aRand.y*.35),contentT);

    /* In flight: smaller, dimmer. At rest: full. Arrival is the accent. */
    float flying = sin(t * 3.14159265);
    float settled = (1.0 - flying * 0.55) * (1.0-contentFlight*.28);

    /* weight is 0 for a dot this shape does not claim, so it is simply not
       there. It is parked on a neighbour and flies out when a later shape
       needs it. */
    float on = smoothstep(0.0, 0.35, weight);
    vAlpha = on * (0.55 + weight * 0.45) * settled + warm * 0.35 * on;
    /* A little more light where the land stands highest, so the dome is read
       by brightness as well as by size. */
    vAlpha *= 1.0 + lift * 0.055;

    vec2 ndc = clip.xy / max(clip.w, 0.0001);
    float inCalm = 1.0 - smoothstep(uCalm.z * 0.55, uCalm.z,
                    length((ndc - uCalm.xy) * vec2(1.0, 1.35)));
    vAlpha *= 1.0 - inCalm * uCalm.w;
    vAlpha *= uHold;
    vAlpha *= 1.0 - speed * 0.42;

    /* Light rising out of the roots.

       Six static rings sat on the root tips as markers, from when the scroll
       stepped through the communities one at a time and one root had to be lit
       to say which. Nothing picks a root any more, so they marked nothing and
       simply read as blue dots stuck onto the drawing.

       What replaces them is the thing they were standing in for: a band of
       light that climbs out of the roots and up into the trunk, so the roots
       are visibly feeding the tree rather than being labelled. It is a
       function of the dot's own height, so it costs one exp() per dot and no
       geometry at all. */
    float rootBand = 0.0;
    if (uRootPulse.x > 0.0) {
      float d = (pos.y - uRootPulse.y) / max(uRootPulse.z, 0.001);
      rootBand = exp(-d * d * 5.5) * uRootPulse.x * on;
    }
    vAlpha += rootBand * 1.15;

    gl_Position = clip;
    gl_PointSize = uDotScale * uPixelRatio
                 * (0.3 + on * (0.85 + min(weight, 2.2) * 0.62)) * settled
                 * (1.0 + rootBand * 0.55)
                 /* Content dots sit two to three times closer together than
                    any other shape's, so they have to be correspondingly
                    smaller or the strokes merge back into the blobs the
                    density was meant to cure. */
                 * (27.0 / max(-mv.z, 1.0)) * (1.0-contentT*.62)
                 * (1.0 + speed * 0.85);
  }
`;

const DOT_FRAG = `
  precision mediump float;
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float r = length(uv) * 2.0;
    /* A hard disc with one pixel of edge. No falloff: falloff is exactly what
       turned an earlier version into dust. */
    float d = 1.0 - smoothstep(0.72, 1.0, r);
    if (d <= 0.001) discard;
    gl_FragColor = vec4(vColor, d * vAlpha);
  }
`;

/* The ground never moves laterally. A ring crosses it each time a shape lands,
   driven by scroll rather than by the clock, so scrubbing back retraces it. */
const GROUND_VERT = `
  attribute float aRadius;
  uniform float uPixelRatio, uDotScale, uRingR, uRingAmp, uIdle;
  uniform vec4  uCalm;
  uniform vec3  uPointer, uColor;
  varying vec3  vColor;
  varying float vAlpha;
  void main() {
    float ring = exp(-pow((aRadius - uRingR) * 1.7, 2.0)) * uRingAmp;

    vec3 pos = position;
    pos.z += ring * 1.1 + sin(uIdle * 0.6 + aRadius * 1.4) * 0.05;

    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    vec4 clip = projectionMatrix * mv;

    float warm = 0.0;
    if (uPointer.z > 0.001) {
      float pd = distance(pos.xy, uPointer.xy);
      warm = uPointer.z * exp(-pd * pd * 0.05);
    }

    vColor = uColor;
    vAlpha = 0.10 + ring * 0.55 + warm * 0.35;

    vec2 ndc = clip.xy / max(clip.w, 0.0001);
    float inCalm = 1.0 - smoothstep(uCalm.z * 0.55, uCalm.z,
                    length((ndc - uCalm.xy) * vec2(1.0, 1.35)));
    vAlpha *= 1.0 - inCalm * uCalm.w;

    gl_Position = clip;
    gl_PointSize = uDotScale * uPixelRatio * (0.85 + ring * 1.3 + warm * 0.5)
                 * (27.0 / max(-mv.z, 1.0));
  }
`;

const LINE_FRAG = `
  precision mediump float;
  uniform vec3 uColor, uColor2;
  uniform float uWeight;
  varying float vAlpha;
  varying float vAlong;
  void main() {
    gl_FragColor = vec4(mix(uColor, uColor2, vAlong), vAlpha * uWeight);
  }
`;

const BORDER_VERT = `
  attribute float aAlong;
  uniform float uReveal, uFade;
  uniform vec4 uCalm;
  varying float vAlpha;
  varying float vAlong;
  void main() {
    vec4 clip = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    vec2 ndc = clip.xy / max(clip.w, 0.0001);
    float inCalm = 1.0 - smoothstep(uCalm.z * 0.55, uCalm.z,
                    length((ndc - uCalm.xy) * vec2(1.0, 1.35)));
    vAlpha = smoothstep(aAlong - 0.04, aAlong, uReveal) * uFade
           * (1.0 - inCalm * uCalm.w * 0.7);
    vAlong = aAlong;
    gl_Position = clip;
  }
`;

function pickTier() {
  const mem = navigator.deviceMemory || 4;
  const cores = navigator.hardwareConcurrency || 4;
  if (window.matchMedia("(pointer: coarse)").matches) return (cores <= 4 || mem <= 3) ? "low" : "mid";
  if (cores >= 8 && mem >= 8) return "high";
  return (cores <= 2 || mem <= 2) ? "low" : "mid";
}

async function createScene(canvas) {
  let gl = null;
  try {
    gl = canvas.getContext("webgl2", { alpha: true, antialias: true, powerPreference: "high-performance" });
  } catch (_) { gl = null; }
  if (!gl) throw new Error("no WebGL2 context");

  /* The phone homepage runs the same scene in a centred, portrait layout: no
     caption lane beside the subject, the tree in the middle of the screen, the
     light tier, and a lattice tall enough to fill a phone. */
  const centred = canvas.closest("[data-hero-layout='centred']") !== null;
  const tierName = centred ? "low" : pickTier();
  const tier = TIERS[tierName];
  const PITCH = tier.shape;

  const treeImage = await loadImage(new URL(TREE_URL, import.meta.url).href);
  const treeAlpha = alphaOf(treeImage, 512, Math.round(512 * treeImage.naturalHeight / treeImage.naturalWidth));
  const syria = syriaMask(SYRIA_RING, 620);

  /* The numeral is rasterised in the page's own face, so it waits for the
     webfont rather than falling back to Arial on a cold load. */
  try { await document.fonts.ready; } catch (_) { /* no font loading API */ }
  await Promise.all([
    document.fonts.load('600 44px Cairo', 'Damascus'),
    document.fonts.load('600 44px Cairo', 'دمشق حلب الحسكة القامشلي'),
    document.fonts.load('900 50px Cairo', 'متدرّب شريك مجتمعات مستخدم سوري للذكاء الاصطناعي'),
    document.fonts.load('900 143px Cairo', '1,000,000')
  ]).catch(() => {});


  const box = (w, h) => ({
    x0: SUBJECT_X - w / 2, x1: SUBJECT_X + w / 2,
    y0: -h / 2, y1: h / 2, w, h
  });
  const treeBox = box(SUBJECT_H * 1.10 * (treeAlpha.w / treeAlpha.h), SUBJECT_H * 1.10);

  const mapBox = box(SUBJECT_H * 1.19 * syria.aspect, SUBJECT_H * 1.19);

  const mapToWorld = (px, py) => [
    mapBox.x0 + (px / (syria.w - 1)) * mapBox.w,
    mapBox.y1 - (py / (syria.h - 1)) * mapBox.h
  ];
  /* Needed before the shapes are expanded: the country's reveal order is
     distance from this point. */
  const [ox, oy] = mapToWorld(...syria.project(ORIGIN_LON, ORIGIN_LAT));

  /* ---- beat 1, the mark ---- */
  const R0 = sampleShape(treeBox, PITCH, (x, y, u, v, cu, cv) => {
    const c = coverage(treeAlpha, u, v, cu, cv);
    return c > 0.28 ? c : 0;
  });

  const R1 = R0, R2 = R0, R3 = R0;
  const numFrames = [R0, R0];
  const NUM_FRAMES = 2;

  /* ---- beat 5, the country ---- */
  const R4 = sampleShape(mapBox, PITCH, (x, y, u, v, cu, cv) => {
    const c = coverage(syria, u, v, cu, cv);
    return c > 0.5 ? 1 : 0;
  });

  /* An even, restrained field keeps every region equally present and lets
     city beacons and traveling light read clearly above the dots. */
  for (let i = 0; i < R4.length; i += 3) R4[i + 2] = 0.46;

  /* K is the largest shape's own cell count: one buffer has to serve all five,
     and the country claims the most. The counter's frames are measured too, so
     a wide one can never overrun the buffer everything shares. */
  const RAW = [R0, R1, R2, R3, R4];
  /* The floor exists for the fruit pictograms, which are the only shapes that
     have to render TYPE. The geometric shapes read fine at the country's
     natural density; letterforms do not, and the pictograms were being held to
     a budget set by a shape that has no small detail in it. Dots above a
     shape's own count are parked at zero weight and never drawn, so the floor
     costs the other four nothing but buffer and buys the type another step of
     resolution. Keep it modest: this is one draw call shared with the ground
     lattice. */
  const K = Math.max(22000, ...RAW.concat(numFrames).map(r => r.length / 3));

  /* What each shape's reveal follows. This is the whole difference between a
     shape appearing and a shape being drawn. */
  const KEYS = [
    (x, y) => y,                            // the mark grows from its roots up
    (x, y) => y,
    (x, y) => y,
    (x, y) => y,
    (x, y) => Math.hypot(x - ox, y - oy)    // the country floods from the origin
  ];
  const [S0, S1, S2, S3, S4] = RAW.map((r, i) => expand(r, K, KEYS[i]));
  /* Every counter frame gets the same treatment as any other shape, and the
     same reveal key, so a frame can be dropped straight into the numeral slot. */
  const numShapes = numFrames.map(r => expand(r, K, KEYS[2]));

  const fruitWorld = FRUITS.map(([x,y]) => new THREE.Vector2(
    treeBox.x0+x/301.81*treeBox.w, treeBox.y1-y/339*treeBox.h));
  const fruitShapes = {};
  /* x0, x1, y0, y1 of the learning screen's progress bar, in world units. */
  const fillRect = new THREE.Vector4(0, 0, 0, 0);
  for (const lang of ["en","ar"]) {
    fruitShapes[lang] = fruitWorld.map((centre,index) => {
      const mask = fruitContentMask(index,lang);
      const w = 8.0, h = w/mask.aspect;
      const area = { x0:centre.x-w/2, x1:centre.x+w/2,
        y0:centre.y-h/2, y1:centre.y+h/2, w,h };
      /* This loop only ever makes the lattice COARSER, so wherever it starts is
         the finest it can ever be. It started at .065 and exited on the first
         pass, which meant every pictogram was drawn at .065 while 14,305 dots
         were available and fewer than 1,700 were being used -- six percent of
         the budget. One dot spanned about eight mask pixels, so a three-pixel
         glyph stroke mostly fell between dots and the type came apart into
         beads.

         It starts fine now and coarsens only if it genuinely overflows, which
         is what the loop was for. Each mask settles two to three times denser
         in each direction, so a stroke is several dots wide instead of a
         fraction of one, and the shapes are drawn rather than implied. */
      /* The progress bar's world rectangle, worked out here because this is
         where the mask-to-world mapping lives: scanCells reads the mask at
         u = (x - x0)/w with v measured DOWN from the top, so a mask pixel maps
         to x0 + (px/mw)*w across and y1 - (py/mh)*h down. Padded by a fortieth
         of a world unit, which is a third of the gap to the rounded box that
         surrounds the bar, so the test cannot catch the box's own strokes. */
      if (mask.fillBar) {
        const b = mask.fillBar, pad = .025;
        fillRect.set(
          area.x0 + (b.x0 / mask.w) * area.w - pad,
          area.x0 + (b.x1 / mask.w) * area.w + pad,
          area.y1 - (b.y1 / mask.h) * area.h - pad,
          area.y1 - (b.y0 / mask.h) * area.h + pad);
      }
      let pitch=.018, raw;
      do {
        raw=sampleShape(area,pitch,(x,y,u,v,cu,cv)=>{
          const weight=coverage(mask,u,v,cu,cv);
          return weight>.25?Math.max(.44,weight*.55):0;
        });
        pitch*=1.15;
      } while(raw.length/3>K);
      return expand(raw,K,(x,y)=>x);
    });
  }

  /* ---- the communities -------------------------------------------------
     The roots beat used to hand the community cards to the SCROLL: a step
     function over progress picked one of six, so browsing them meant scrubbing
     the page, you could not go back without scrolling back, and each one got
     whatever fraction of a second your wheel happened to give it. Eight
     communities cannot be read that way at all.

     The field now gathers out of the roots into ONE community's pictogram and
     holds it, and which one is the reader's choice rather than the scroll
     position's. That is the whole reason it can be drawn properly: a shape
     nobody is rushing past can afford to be a shape.

     Sampled on demand and cached, keyed by icon name so card order never
     matters. Eight masks at the full lattice density is
     real work and real memory, and a visitor who never presses the button
     should not pay for seven pictograms they will not see. */
  const communityWorld = new THREE.Vector2(
    treeBox.x0 + 151 / 301.81 * treeBox.w,
    treeBox.y1 - 302 / 339 * treeBox.h);
  const communityCache = new Map();
  const COMMUNITY_COUNT = COMMUNITY_ICONS.length;

  function communityShape(indexOrIcon) {
    const key = typeof indexOrIcon === "string" ? indexOrIcon : (COMMUNITY_ICONS[indexOrIcon] || COMMUNITY_ICONS[0]);
    const hit = communityCache.get(key);
    if (hit) return hit;
    const mask = communityMask(key);
    const w = 8.0, h = w / mask.aspect;
    const area = { x0: communityWorld.x - w / 2, x1: communityWorld.x + w / 2,
                   y0: communityWorld.y - h / 2, y1: communityWorld.y + h / 2, w, h };
    let pitch = .018, raw;
    do {
      raw = sampleShape(area, pitch, (x, y, u, v, cu, cv) => {
        const weight = coverage(mask, u, v, cu, cv);
        return weight > .25 ? Math.max(.44, weight * .55) : 0;
      });
      pitch *= 1.15;
    } while (raw.length / 3 > K);
    const built = expand(raw, K, (x, y) => x);
    communityCache.set(key, built);
    return built;
  }

  /* aRand.x is the dot's place in the stagger sweep, and it is its index, not a
     random number: indices are ordered by angle, so the change travels around
     the shape. aRand.y only breaks the arc's symmetry. */
  const aRand = new Float32Array(K * 2);
  for (let i = 0; i < K; i++) {
    aRand[i * 2] = i / (K - 1);
    const h = Math.sin(i * 12.9898) * 43758.5453;
    aRand[i * 2 + 1] = h - Math.floor(h);
  }

  const renderer = new THREE.WebGLRenderer({ canvas, context: gl, alpha: true, antialias: true });
  renderer.setClearColor(0x000000, 0);
  renderer.setClearAlpha(0);
  const dpr = Math.min(window.devicePixelRatio || 1, tier.dpr);
  renderer.setPixelRatio(dpr);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 300);
  const calm = new THREE.Vector4(-0.52, 0.0, 0.82, 0.62);
  const pointer = new THREE.Vector3();

  /* Lift the identity's petrol and teal for additive dots on a dark ground.
     The tree keeps its geometry; only its root-to-crown gradient changes. */
  const C = {
    root: token("--petrol", "#048090").lerp(token("--teal-lift", "#b8e8f0"), .30),
    reach: token("--saae-turquoise-lift", "#77e0e8"),
    laneA: token("--saae-turquoise-lift", "#77e0e8"),
    laneB: token("--teal-lift", "#b8e8f0"),
    numA: token("--teal-lift", "#b8e8f0"),
    numB: token("--paper", "#fefdfc"),
    modA: token("--saae-turquoise-lift", "#77e0e8"),
    modB: token("--paper", "#fefdfc"),
    core: token("--paper", "#fefdfc"),
    land: token("--saae-turquoise-lift", "#77e0e8"),
    rim: token("--olive-lift", "#a8cf7e"),
    tree: token("--saae-turquoise-lift", "#77e0e8"),
    lane: token("--teal-lift", "#b8e8f0"),
    paper: token("--paper", "#fefdfc"),
    ground: token("--teal", "#227f8c")
  };

  /* ---- the ground lattice ---- */
  const fieldW = centred ? 28 : FIELD_W;
  const fieldH = centred ? 52 : FIELD_H;
  const gCols = Math.round(fieldW / tier.ground) + 1;
  const gRows = Math.round(fieldH / tier.ground) + 1;
  const gCount = gCols * gRows;
  const gPos = new Float32Array(gCount * 3);
  const gRad = new Float32Array(gCount);
  for (let r = 0; r < gRows; r++) {
    for (let c = 0; c < gCols; c++) {
      const i = r * gCols + c;
      const x = (c / (gCols - 1) - 0.5) * fieldW + SUBJECT_X;
      const y = (0.5 - r / (gRows - 1)) * fieldH;
      gPos[i * 3] = x; gPos[i * 3 + 1] = y; gPos[i * 3 + 2] = 0;
      gRad[i] = Math.hypot(x - SUBJECT_X, y);
    }
  }
  const groundGeo = new THREE.BufferGeometry();
  groundGeo.setAttribute("position", new THREE.BufferAttribute(gPos, 3));
  groundGeo.setAttribute("aRadius", new THREE.BufferAttribute(gRad, 1));
  groundGeo.boundingSphere = new THREE.Sphere(new THREE.Vector3(SUBJECT_X, 0, 0), 90);
  const groundU = {
    uPixelRatio: { value: dpr }, uDotScale: { value: 1.5 },
    uRingR: { value: -9 }, uRingAmp: { value: 0 }, uIdle: { value: 0 },
    uCalm: { value: calm }, uPointer: { value: pointer }, uColor: { value: C.ground }
  };
  const ground = new THREE.Points(groundGeo, new THREE.ShaderMaterial({
    uniforms: groundU, vertexShader: GROUND_VERT, fragmentShader: DOT_FRAG,
    transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending
  }));
  ground.frustumCulled = false;
  scene.add(ground);

  /* ---- the flight ---- */
  const flightGeo = new THREE.BufferGeometry();
  /* position is required by three.js but unused by this shader: the vertex
     shader derives every position from the five shape attributes. */
  flightGeo.setAttribute("position", new THREE.BufferAttribute(S0, 4));
  flightGeo.setAttribute("aS0", new THREE.BufferAttribute(S0, 4));
  flightGeo.setAttribute("aS1", new THREE.BufferAttribute(S1, 4));
  flightGeo.setAttribute("aS3", new THREE.BufferAttribute(S3, 4));
  flightGeo.setAttribute("aS4", new THREE.BufferAttribute(S4, 4));
  /* The two counter frames the numeral slot is currently between. These are
     the only buffers in the scene that are ever rewritten after build, and
     they are rewritten only when the count crosses into a new frame. */
  const numA = new THREE.BufferAttribute(new Float32Array(numShapes[0]), 4);
  const numB = new THREE.BufferAttribute(new Float32Array(numShapes[1]), 4);
  numA.setUsage(THREE.DynamicDrawUsage);
  numB.setUsage(THREE.DynamicDrawUsage);
  flightGeo.setAttribute("aS2", numA);
  flightGeo.setAttribute("aN2", numB);
  const contentAttribute = new THREE.BufferAttribute(new Float32Array(fruitShapes.en[0]),4);
  contentAttribute.setUsage(THREE.DynamicDrawUsage);
  flightGeo.setAttribute("aContent",contentAttribute);
  /* The pictogram being moved TO during a community swap. It holds a copy of
     aContent whenever nothing is swapping, so the shader's mix is a no-op and
     costs one lerp per dot rather than a branch. */
  const contentNextAttribute = new THREE.BufferAttribute(new Float32Array(fruitShapes.en[0]),4);
  contentNextAttribute.setUsage(THREE.DynamicDrawUsage);
  flightGeo.setAttribute("aContentB",contentNextAttribute);
  let contentKey = "en:0";
  flightGeo.setAttribute("aRand", new THREE.BufferAttribute(aRand, 2));
  flightGeo.boundingSphere = new THREE.Sphere(new THREE.Vector3(SUBJECT_X, 0, 0), 90);
  const flightU = {
    uPhase: { value: 0 }, uStagger: { value: 0.62 }, uArc: { value: 1 },
    uNum: { value: 0 },
    uIdle: { value: 0 }, uHold: { value: 1 }, uBurst: { value: 1 },
    uCentre: { value: new THREE.Vector2(SUBJECT_X, 0) },
    uPixelRatio: { value: dpr }, uDotScale: { value: 2.15 },
    uCalm: { value: calm }, uPointer: { value: pointer },
    uVelocity: { value: 0 },
    uRelief: { value: RELIEF },
    uRootPulse: { value: new THREE.Vector3(0, 0, 1) },
    uContentMix: { value: 0 }, uSwap: { value: 0 },
    uFill: { value: -1 }, uFillRect: { value: new THREE.Vector4(0, 0, 0, 0) },
    uContentOrigin: { value: fruitWorld[0].clone() },
    uTreeCollapse: { value: 0 }, uFruit: { value: new THREE.Vector2() },
    uA0: { value: C.root }, uB0: { value: C.reach },
    uA1: { value: C.laneA }, uB1: { value: C.laneB },
    uA2: { value: C.numA }, uB2: { value: C.numB },
    uA3: { value: C.root }, uB3: { value: C.reach },
    uA4: { value: C.land }, uB4: { value: C.land },
    uRim: { value: C.rim }
  };
  const flight = new THREE.Points(flightGeo, new THREE.ShaderMaterial({
    uniforms: flightU, vertexShader: FLIGHT_VERT, fragmentShader: DOT_FRAG,
    transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending
  }));
  flight.frustumCulled = false;
  scene.add(flight);

  /* ---- the country ---- */
  const outline = syria.outline.map(([x, y]) => mapToWorld(x, y));
  const segs = outline.length;
  const bPos = new Float32Array(segs * 6), bAlong = new Float32Array(segs * 2);
  for (let i = 0; i < segs; i++) {
    const a = outline[i], b = outline[(i + 1) % segs];
    bPos.set([a[0], a[1], 0.0, b[0], b[1], 0.0], i * 6);
    bAlong[i * 2] = i / segs; bAlong[i * 2 + 1] = (i + 1) / segs;
  }
  const borderGeo = new THREE.BufferGeometry();
  borderGeo.setAttribute("position", new THREE.BufferAttribute(bPos, 3));
  borderGeo.setAttribute("aAlong", new THREE.BufferAttribute(bAlong, 1));
  borderGeo.boundingSphere = new THREE.Sphere(new THREE.Vector3(SUBJECT_X, 0, 0), 90);
  const borderU = {
    uReveal: { value: 0 }, uFade: { value: 0 }, uCalm: { value: calm },
    uWeight: { value: 1.0 },
    /* One colour, not two. aAlong is the perimeter parameter, so a grade
       along it would put a seam wherever the ring closes; an outline wants to
       be one clean line anyway. */
    uColor: { value: C.paper }, uColor2: { value: C.paper }
  };
  const border = new THREE.LineSegments(borderGeo, new THREE.ShaderMaterial({
    uniforms: borderU, vertexShader: BORDER_VERT, fragmentShader: LINE_FRAG,
    transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending
  }));
  border.frustumCulled = false;
  scene.add(border);

  const network = createSyriaNetwork(
    scene, (lon, lat) => mapToWorld(...syria.project(lon, lat)), C.reach, dpr
  );

  const treeToWorld = ([x,y]) => new THREE.Vector3(
    treeBox.x0 + x/301.81*treeBox.w, treeBox.y1-y/339*treeBox.h, 0);
  const story = createTreeStory(scene, treeToWorld, C.reach);
  const lastFruit = treeToWorld(FRUITS[2]);
  flightU.uFruit.value.set(lastFruit.x,lastFruit.y);
  let selectedRoot = COMMUNITY_ICONS[0];
  /* What is currently BUILT into the buffer, which lags the selection for as
     long as the swap takes: the old pictogram scatters, the new one gathers,
     and the exchange happens at the bottom of that dip where there is nothing
     on screen to jump. Icon names, so card order never matters. */
  let communityShown = COMMUNITY_ICONS[0];
  let communitySwitchAt = 0;
  /* Long enough to read as one shape becoming another rather than a cut, short
     enough that pressing next eight times is not a chore. The card flip beside
     it is 750; the field arrives first on purpose, because the field is what
     the eye is on. */
  const COMMUNITY_SWAP_MS = 620;

  let pointerStrength = 0, breathPinned = false;
  /* Where the centred layout's headline sits, so the dots behind it can quieten. */
  const centredCalm = { y: 0.45, w: 0 };
  /* The page's own spring measures this and used to discard it. */
  let scrollSpeed = 0;
  let entranceStart = 0, entrancePinned = false, entranceFrame = 0, lastProgress = 0;
  let idleFrame = 0, idleRunning = false, seen = null;
  const ENTRANCE_MS = 2200;

  const entranceValue = () => {
    if (entrancePinned) return 1;
    if (!entranceStart) return 0;
    return clamp01((performance.now() - entranceStart) / ENTRANCE_MS);
  };
  /* Arabic puts the caption on the right, so the camera slides the other way.
     It is a slide, not a mirror: mirroring would give a backwards numeral and a
     flipped country. */
  const laneSign = () => (document.documentElement.dir === "rtl" ? -1 : 1);

  /* Preserve the approved finale phase; fruit content uses its own reversible blend. */
  /* Tied to the collapse, not to a bare number: the tree hands the field over
     to the country exactly as it starts folding in. When the collapse moved
     and this did not, there was a stretch where the shape slot had already
     changed and nothing on screen had. */
  function phaseOf(p) { return p < .836 ? 0 : 3 + treeStoryState(p).map; }

  function resize() {
    const w2 = canvas.clientWidth || window.innerWidth;
    const h2 = canvas.clientHeight || window.innerHeight;
    camera.aspect = w2 / h2;
    camera.fov = h2 > w2 ? 54 : 38;
    camera.updateProjectionMatrix();
    renderer.setSize(w2, h2, false);
    const r = Math.min(window.devicePixelRatio || 1, tier.dpr);
    flightU.uPixelRatio.value = r;
    groundU.uPixelRatio.value = r;
    renderer.setPixelRatio(r);
    network.resize(r);
  }

  function render(progress) {
    const p = clamp01(progress);
    lastProgress = p;
    const sign = laneSign();
    const ph = phaseOf(p);

    const state = treeStoryState(p);

    /* The community pictogram owns the field between the roots settling and
       the first fruit journey starting. It opens after the roots have arrived
       and is gone before the camera leaves for the first fruit, so it never
       competes with either. */
    const communityMix = smooth(.150, .205, p) * (1 - smooth(.285, .318, p));
    const communityOn = communityMix > .0015;
    /* Browsing the eight is a move between pictograms, not a trip home.

       The first one is built out of the tree -- that is what communityMix does
       as it opens, and it is the right entrance: the communities ARE the roots,
       and the shape should say so once. Every one after it is reached from the
       one before, directly. What used to happen instead was that each switch
       dipped communityMix toward zero, which is the road back to the tree, so
       the field flew home and came out again eight times over. The dip is gone;
       the swap is a separate value that never touches the road from the tree. */
    let swap = 0;
    if (!communityOn || breathPinned) {
      /* Off screen, or pinned for a measurement: take the selection instantly
         rather than leaving a half-finished swap parked in the buffer. */
      if (communityShown !== selectedRoot) communityShown = selectedRoot;
      communitySwitchAt = 0;
    } else if (communitySwitchAt) {
      swap = clamp01((performance.now() - communitySwitchAt) / COMMUNITY_SWAP_MS);
      if (swap >= 1) {
        /* Arrived. The destination becomes the origin, and the next swap
           starts from here rather than from the tree. */
        communityShown = selectedRoot;
        communitySwitchAt = 0;
        swap = 0;
      }
    } else if (communityShown !== selectedRoot) {
      communityShown = selectedRoot;
    }
    /* One value feeds the camera fit, the shader blend and the push-in,
       whichever of the two contents is speaking. It no longer carries the
       switch: a swap holds the field fully assembled the whole way across. */
    const contentMix = communityOn ? communityMix : state.content;
    /* The roots step back while their own pictogram is up: six markers behind
       a drawn shape is two things asking to be read at once. */
    state.roots *= 1 - communityMix;

    const focus = treeToWorld(state.focus);
    const halfFov = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    // Fit both dimensions, including short, wide windows. Leave a clear lane
    // for the caption and mirror the placement (not the lettering) in RTL.
    const contentFitZoom = Math.max(
      8.0 / (camera.aspect * .54 * 2 * halfFov),
      (8.0 * 560 / 960) / (.76 * 2 * halfFov));
    /* A slow push-in across the hold: two percent closer between the frame
       assembling and the frame dissolving. It is small enough that nobody
       will name it and large enough that the shot is never actually still,
       which is the difference between a camera holding and a page frozen.
       Driven by scroll like everything else here, so it runs backwards. */
    const push = 1 - 0.02 * state.hold * state.content;
    const storyZoom = (state.zoom + Math.max(0, contentFitZoom-state.zoom)*contentMix) * push;
    const halfHeight = storyZoom * halfFov;
    // Translate parallel to the logo so branches keep their shape while the camera travels.
    const contentLane = .30 + .12 * contentMix;
    const storyX = focus.x - sign * halfHeight * camera.aspect * contentLane;
    const openingX = sign > 0 ? 0 : SUBJECT_X * 2;
    let camX = openingX + (storyX-openingX)*state.entry;
    let camY = focus.y*state.entry;
    let camZ = storyZoom;
    const viewH = Math.max(mapBox.h / .83, (mapBox.w+3.6)/(camera.aspect*.65));
    const mapZ = viewH/(2*Math.tan(THREE.MathUtils.degToRad(camera.fov/2)));
    const mapX = SUBJECT_X-sign*viewH*camera.aspect*.15;
    camX += (mapX-camX)*state.mapCamera;
    camY *= 1-state.mapCamera;
    camZ += (mapZ-camZ)*state.mapCamera;
    if (centred) {
      /* Portrait phones. There is no lane beside the subject for the caption,
         so the caption takes the top of the screen and every subject -- tree,
         pictogram, country -- is centred across the width and raised into the
         space above it. The tree is fitted to the width; a pictogram or the
         country fills most of it. */
      /* The subject takes the upper part of the screen and the caption the
         lower. Negative lowers the camera, which raises the subject; the
         close-ups and pictograms rise further to clear the taller captions. */
      const LOWERED = -.2 - .14 * Math.max(state.entry, contentMix);
      const treeFit = Math.max(1, (treeBox.w * 1.3) / (2 * halfFov * camera.aspect * 29.6));
      const treeZ = state.zoom * treeFit;
      const contentZ = 8.0 / (camera.aspect * .84 * 2 * halfFov);
      const storyZ = (treeZ + (contentZ - treeZ) * contentMix) * push;
      const mapViewH = Math.max(mapBox.h / .8, (mapBox.w + 3.4) / (camera.aspect * .9));
      const mapZC = mapViewH / (2 * halfFov);
      const storyY = focus.y * state.entry + storyZ * halfFov * LOWERED;
      const mapY = -mapViewH * .5 * .3;
      camX = focus.x + (SUBJECT_X - focus.x) * state.mapCamera;
      camY = storyY + (mapY - storyY) * state.mapCamera;
      camZ = storyZ + (mapZC - storyZ) * state.mapCamera;
    }
    camera.position.set(camX,camY,camZ);
    camera.lookAt(camX,camY,0);

    const entrance = entranceValue();
    flightU.uPhase.value = ph;
    flightU.uHold.value = entrance;
    flightU.uBurst.value = 1 - entrance;
    flightU.uIdle.value = breathPinned ? 0 : performance.now() / 1000;
    flightU.uPointer.value.set(pointer.x, pointer.y, pointerStrength);
    /* Pinned with the breath: it is the one value in this shader that is not a
       function of scroll position, so it is the one that would stop the audit's
       scrub comparison landing on identical pixels. */
    flightU.uVelocity.value = breathPinned ? 0 : scrollSpeed;

    flightU.uTreeCollapse.value = state.collapse;

    /* Drive the rising light. The sweep is on the clock rather than on scroll
       because it is ambient -- it should breathe while the reader sits still,
       which scroll-driven motion by definition cannot. Pinned with the rest of
       the idle motion when the harness asks for a still frame, so it can never
       make the reversibility check disagree with itself. */
    {
      const rootLow = treeBox.y1 - 344 / 339 * treeBox.h;
      const rootHigh = treeBox.y1 - 150 / 339 * treeBox.h;
      const t = breathPinned ? 0.34 : (performance.now() / 1000) * 0.26;
      const f = t - Math.floor(t);
      flightU.uRootPulse.value.set(
        state.roots * Math.sin(Math.PI * f) * 0.85 * entrance,
        rootLow + (rootHigh - rootLow) * f,
        treeBox.h * 0.085);
    }
    const contentLanguage = document.documentElement.lang === "ar" ? "ar" : "en";
    const nextContentKey = communityOn
      ? `community:${communityShown}`
      : `${contentLanguage}:${state.contentIndex}`;
    /* Not while a swap is running. The origin buffer is the shape the swap is
       travelling FROM, and after a restart that is a blend of two pictograms
       which answers to no key -- rewriting it from `communityShown` would snap
       the field back to a shape the reader has already watched leave. The write
       lands on the frame the swap ends, which is the frame it is wanted. */
    if (nextContentKey !== contentKey && !communitySwitchAt) {
      contentAttribute.array.set(communityOn
        ? communityShape(communityShown)
        : fruitShapes[contentLanguage][state.contentIndex]);
      contentAttribute.needsUpdate = true;
      contentKey = nextContentKey;
      /* Nothing is swapping at the moment the current shape changes, so the
         destination buffer holds the same thing and the shader's mix is inert
         whatever uSwap happens to be. */
      if (!communitySwitchAt) {
        contentNextAttribute.array.set(contentAttribute.array);
        contentNextAttribute.needsUpdate = true;
      }
    }
    flightU.uContentMix.value = contentMix;
    flightU.uSwap.value = swap;
    /* The bar fills across the HOLD of the learning beat -- the stretch where
       the screen is assembled and the reader is looking at it, about nine
       hundred pixels of scroll. state.hold is a pure function of scroll
       position, so the bar fills going down and empties going back up, like
       everything else in this scene.

       It reaches full at .82 of the hold rather than at the end, so the bar is
       visibly COMPLETE for a moment before the shape dissolves. A progress bar
       that only ever arrives at the instant it leaves has not really finished
       in front of anyone. */
    flightU.uFill.value = (!communityOn && state.contentIndex === 0 && contentMix > 0)
      ? clamp01(state.hold / .82)
      : -1;
    flightU.uFillRect.value.copy(fillRect);
    flightU.uContentOrigin.value.copy(communityOn ? communityWorld : fruitWorld[state.contentIndex]);
    story.update(state, breathPinned ? 0 : performance.now()/1000, entrance);

    const ring = { r: -9, amp: 0 };
    groundU.uRingR.value = ring.r;
    groundU.uRingAmp.value = ring.amp * entrance;
    groundU.uIdle.value = breathPinned ? 0 : performance.now() / 1000;

    flightU.uRelief.value = RELIEF;
    borderU.uFade.value = smooth(.925, .955, p) * entrance * 0.65;
    borderU.uReveal.value = smooth(.925, .97, p);
    network.update(.80 + smooth(.935,.995,p)*.20, entrance, performance.now() / 1000, breathPinned,
      document.documentElement.lang);

    if (centred) calm.set(0, centredCalm.y, 0.95, centredCalm.w);
    else calm.set(-0.52 * sign, 0.0, 0.82, 0.62);
    renderer.render(scene, camera);
  }

  /* The scene is never still, so it needs its own frame loop for the moments
     the page is not scrolling. The page still drives progress; this only
     repaints the last progress so the idle drift and any running entrance keep
     moving.

     It parks whenever motion is pinned, whenever the tab is hidden, and
     whenever the hero has scrolled off screen. A hero that renders forever
     while nobody is looking at it is a battery bug, and the loop it replaced
     was careful to park. */
  let onScreen = true;
  function idleWanted() {
    return onScreen && !breathPinned && !document.hidden;
  }
  function startIdle() {
    if (idleRunning || !idleWanted()) return;
    idleRunning = true;
    const step = () => {
      if (!idleRunning) return;
      if (!idleWanted()) { stopIdle(); return; }
      render(lastProgress);
      idleFrame = requestAnimationFrame(step);
    };
    idleFrame = requestAnimationFrame(step);
  }
  function stopIdle() {
    idleRunning = false;
    cancelAnimationFrame(idleFrame);
    idleFrame = 0;
  }

  function dispose() {
    stopIdle();
    if (seen) seen.disconnect();
    document.removeEventListener("visibilitychange", onVisibility);
    cancelAnimationFrame(entranceFrame);
    [groundGeo, flightGeo, borderGeo].forEach(g => g.dispose());
    [ground, flight, border].forEach(o => o.material.dispose());
    network.dispose();
    story.dispose();
    renderer.dispose();
  }

  seen = new IntersectionObserver(entries => {
    onScreen = entries.some(e => e.isIntersecting);
    if (onScreen) startIdle(); else stopIdle();
  }, { threshold: 0 });
  seen.observe(canvas);
  const onVisibility = () => { if (document.hidden) stopIdle(); else startIdle(); };
  document.addEventListener("visibilitychange", onVisibility, { passive: true });

  resize();

  return {
    render, resize, dispose, setBand() {},
    communities: COMMUNITY_COUNT,
    setCommunity(indexOrIcon) {
      const next = typeof indexOrIcon === "string"
        ? (COMMUNITY_ICONS.includes(indexOrIcon) ? indexOrIcon : COMMUNITY_ICONS[0])
        : (COMMUNITY_ICONS[Math.max(0, Math.min(COMMUNITY_COUNT - 1, indexOrIcon | 0))] || COMMUNITY_ICONS[0]);
      if (next === selectedRoot) return;

      /* A press that lands mid-swap.

         The field is somewhere between two pictograms and neither buffer holds
         what is on screen, so starting a new swap from `aContent` would snap
         backwards to a shape the reader has already watched leave. Both shapes
         are on the CPU, and so is the swap's own progress, so the frame that is
         actually showing can simply be computed and written into the origin
         buffer -- and the new swap starts from exactly where the eye is. */
      if (communitySwitchAt) {
        const t = clamp01((performance.now() - communitySwitchAt) / COMMUNITY_SWAP_MS);
        const eased = t * t * (3 - 2 * t);
        const from = contentAttribute.array, to = contentNextAttribute.array;
        for (let i = 0; i < from.length; i++) from[i] += (to[i] - from[i]) * eased;
        contentAttribute.needsUpdate = true;
      }

      selectedRoot = next;
      contentNextAttribute.array.set(communityShape(next));
      contentNextAttribute.needsUpdate = true;
      communitySwitchAt = performance.now();
    },
    setCalm(y, w) { centredCalm.y = y; centredCalm.w = Math.max(0, Math.min(1, w)); },
    setPointer(x, y, s) { pointerStrength = s; if (s > 0) pointer.set(x, y, 0); },
    /* Signed, and expected in roughly -1..1; the page normalises its own
       spring velocity before it gets here because only the page knows what
       counts as fast for the length of hero it is running. */
    setVelocity(v) { scrollSpeed = Math.max(-1, Math.min(1, v)); },
    tier: tierName, points: gCount + K, flightPoints: K, cols: gCols, rows: gRows,
    rays: network.links, cities: network.count,
    pinBreath(on) {
      breathPinned = !!on;
      entrancePinned = !!on;
      if (on) stopIdle(); else startIdle();
    },
    startEntrance() {
      if (entranceStart) return;
      entranceStart = performance.now();
      startIdle();
    },
    snapshot(progress) {
      render(progress);
      const w2 = renderer.domElement.width, h2 = renderer.domElement.height;
      const buf = new Uint8Array(w2 * h2 * 4);
      const ctx = renderer.getContext();
      ctx.readPixels(0, 0, w2, h2, ctx.RGBA, ctx.UNSIGNED_BYTE, buf);
      let hash = 0x811c9dc5, lit = 0, bright = 0;
      for (let i = 0; i < buf.length; i += 4) {
        if (buf[i + 3] > 8) lit++;
        if (buf[i] + buf[i + 1] + buf[i + 2] > 300) bright++;
        for (let k = 0; k < 4; k++) { hash ^= buf[i + k]; hash = Math.imul(hash, 0x01000193); }
      }
      return { hash: (hash >>> 0).toString(16), lit, bright, pixels: w2 * h2, size: w2 + "x" + h2 };
    },
    framing(which) {
      const shape = { tree: S0, lane: S1, count: S2, block: S3, map: S4,
        content: contentAttribute.array }[which] || S0;
      const v = new THREE.Vector3();
      let inFrame = 0, minX = 9, maxX = -9, minY = 9, maxY = -9, sumX = 0;
      camera.updateMatrixWorld();
      for (let i = 0; i < K; i++) {
        /* stride 4: xy, weight, reveal key. Indexing this by 3 silently
           mixes the components of neighbouring dots and reports nonsense. */
        v.set(shape[i * 4], shape[i * 4 + 1], 0).project(camera);
        if (Math.abs(v.x) <= 1 && Math.abs(v.y) <= 1) inFrame++;
        minX = Math.min(minX, v.x); maxX = Math.max(maxX, v.x);
        minY = Math.min(minY, v.y); maxY = Math.max(maxY, v.y);
        sumX += v.x;
      }
      return {
        cells: K, inFrame: inFrame / K,
        widthNdc: maxX - minX, heightNdc: maxY - minY, centreX: sumX / K,
        leftNdc: minX, rightNdc: maxX, topNdc: maxY, bottomNdc: minY
      };
    }
  };
}

const STATIC_GATES = [
  "(max-width: 720px)",
  "(orientation: portrait) and (max-width: 1024px)",
  "(orientation: portrait) and (pointer: coarse)",
  "(orientation: landscape) and (pointer: coarse) and (max-height: 560px)",
  "(prefers-reduced-motion: reduce)"
];

(async function boot() {
  const canvas = document.getElementById("hero-canvas");
  const heroSection = document.getElementById("hero-sec");
  if (!canvas || !heroSection) return;
  /* The phone page asks for the centred layout and takes the scene on phones;
     only reduced motion keeps it static there. */
  const gates = heroSection.dataset.heroLayout === "centred"
    ? ["(prefers-reduced-motion: reduce)"]
    : STATIC_GATES;
  if (gates.some(q => window.matchMedia(q).matches)) return;

  let instance = null;
  try {
    instance = await createScene(canvas);
  } catch (error) {
    console.warn("SAAE hero scene unavailable:", error);
    return;
  }

  canvas.addEventListener("webglcontextlost", event => {
    event.preventDefault();
    instance.dispose();
    document.documentElement.removeAttribute("data-hero");
    window.saaeHero = null;
  });

  window.saaeHero = instance;
  document.documentElement.setAttribute("data-hero", "live");
  heroSection.dispatchEvent(new CustomEvent("saae:hero-ready", { detail: instance }));
})();
