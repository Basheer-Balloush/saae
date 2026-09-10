/* SAAE hero journey — pure DOM dot grid, animejs style.
 *
 * Removal record (comment only, no code below uses them): the former WebGL
 * particle scene (SYRIA_RING, SYRIA_LAT0 via syria-outline.js, drawTree and
 * branch geometry via createJourney, THREE via three.module.min.js) is fully
 * disabled. This file imports nothing, draws on no canvas, and renders only
 * DOM dots using transform/opacity.
 *
 * Contract with the inline controller in index.html:
 *   - dispatches "saae:hero-ready" on #hero-sec with an instrument-like
 *     detail object { resize(), render(progress), setPointer(x, y, k),
 *     setBand(i), band } so the existing scrub loop keeps working.
 *   - render(progress) maps scroll progress to bands 0-4 and morphs the grid.
 *   - setBand(i) switches the grid shape directly (used by motion.js scrub).
 *   - Dots: 120 on desktop, 40 on small screens (max-width: 720px).
 *   - Entry stagger runs from the center outward; pointer motion adds a wave
 *     that also falls off from the pointer. Transform/opacity only.
 */
(() => {
  "use strict";

  var heroSection = document.getElementById("hero-sec");
  var grid = document.getElementById("anime-grid");
  if (!heroSection || !grid) return;

  var reduceQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  var mobileQuery = window.matchMedia("(max-width: 720px)");

  var GOLDEN = 2.399963;
  var CX = 0.5;
  var CY = 0.46;

  function mulberry32(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function clamp01(v) {
    return v < 0.02 ? 0.02 : v > 0.98 ? 0.98 : v;
  }

  /* Five grid shapes, in 0..1 coordinates:
     0 scattered, 1 cluster, 2 grid, 3 dense, 4 burst. */
  function buildLayouts(count, rand) {
    var scattered = [];
    var cluster = [];
    var even = [];
    var dense = [];
    var burst = [];
    var cols = count > 60 ? 12 : 8;
    var rows = Math.ceil(count / cols);
    var i, x, y, r, a;
    for (i = 0; i < count; i++) {
      scattered.push([0.03 + rand() * 0.94, 0.06 + rand() * 0.88]);
      x = CX + (rand() + rand() + rand() - 1.5) * 0.11;
      y = CY + (rand() + rand() + rand() - 1.5) * 0.11;
      cluster.push([clamp01(x), clamp01(y)]);
      x = (((i % cols) + 0.5) / cols) * 0.9 + 0.05;
      y = ((Math.floor(i / cols) + 0.5) / rows) * 0.84 + 0.08;
      even.push([clamp01(x), clamp01(y)]);
      x = CX + (rand() - 0.5) * 0.44;
      y = CY + (rand() - 0.5) * 0.4;
      dense.push([clamp01(x), clamp01(y)]);
      r = 0.07 + 0.4 * (i / count);
      a = i * GOLDEN;
      burst.push([clamp01(CX + r * Math.cos(a)), clamp01(CY + r * Math.sin(a) * 0.78)]);
    }
    return [scattered, cluster, even, dense, burst];
  }

  var dots = [];
  var layouts = [];
  var W = 0;
  var H = 0;
  var band = 0;
  var startTime = 0;
  var pointer = { x: 0.5, y: 0.5, k: 0 };
  var rafId = 0;

  function count() {
    return mobileQuery.matches ? 40 : 120;
  }

  function measure() {
    var rect = grid.getBoundingClientRect();
    W = Math.max(1, rect.width);
    H = Math.max(1, rect.height);
  }

  function clearDots() {
    grid.textContent = "";
    dots = [];
  }

  function build() {
    clearDots();
    measure();
    var n = count();
    var rand = mulberry32(20260908);
    layouts = buildLayouts(n, rand);
    var frag = document.createDocumentFragment();
    var order = [];
    var i;
    for (i = 0; i < n; i++) order.push(i);
    /* Stagger from the center: closest dots enter first. */
    order.sort(function (a, b) {
      var ax = layouts[0][a][0] - CX;
      var ay = layouts[0][a][1] - CY;
      var bx = layouts[0][b][0] - CX;
      var by = layouts[0][b][1] - CY;
      return ax * ax + ay * ay - (bx * bx + by * by);
    });
    for (i = 0; i < n; i++) {
      var el = document.createElement("span");
      el.className = "anime-dot" + (i % 9 === 4 ? " is-warm" : i % 9 === 8 ? " is-soft" : "");
      el.setAttribute("aria-hidden", "true");
      frag.appendChild(el);
      var p = layouts[band][i];
      dots.push({
        el: el,
        cx: p[0] * W, cy: p[1] * H,
        tx: p[0] * W, ty: p[1] * H,
        cs: 0, ts: 0.55 + rand() * 0.65,
        co: 0, to: 0.35 + rand() * 0.55,
        delay: reduceQuery.matches ? 0 : order.indexOf(i) * 14
      });
    }
    grid.appendChild(frag);
    startTime = performance.now();
    kick();
  }

  function retarget() {
    var i, d, p;
    for (i = 0; i < dots.length; i++) {
      d = dots[i];
      p = layouts[band][i];
      d.tx = p[0] * W;
      d.ty = p[1] * H;
    }
    kick();
  }

  function setBand(i) {
    i = Math.max(0, Math.min(4, i | 0));
    if (i === band && dots.length) return;
    band = i;
    if (!dots.length) return;
    if (reduceQuery.matches) {
      var d, p, k;
      for (k = 0; k < dots.length; k++) {
        d = dots[k];
        p = layouts[band][k];
        d.cx = d.tx = p[0] * W;
        d.cy = d.ty = p[1] * H;
        d.cs = d.ts;
        d.co = d.to;
        paint(d);
      }
      return;
    }
    retarget();
  }

  function paint(d) {
    d.el.style.transform = "translate3d(" + d.cx.toFixed(1) + "px," + d.cy.toFixed(1) + "px,0) scale(" + d.cs.toFixed(3) + ")";
    d.el.style.opacity = d.co.toFixed(3);
  }

  function tick(now) {
    rafId = 0;
    var t = now - startTime;
    var px = pointer.x * W;
    var py = pointer.y * H;
    var pk = reduceQuery.matches ? 0 : pointer.k;
    var settled = true;
    var i, d, dx, dy, dist, pull, wave, k2;
    for (i = 0; i < dots.length; i++) {
      d = dots[i];
      if (t < d.delay) {
        settled = false;
        continue;
      }
      k2 = reduceQuery.matches ? 1 : 0.14;
      wave = 0;
      if (pk > 0.01) {
        dx = d.cx - px;
        dy = d.cy - py;
        dist = Math.sqrt(dx * dx + dy * dy);
        wave = Math.max(0, 1 - dist / 190) * pk;
      }
      pull = wave * 26;
      var gx = d.tx;
      var gy = d.ty;
      if (wave > 0.01 && dist > 1) {
        gx += (dx / dist) * pull;
        gy += (dy / dist) * pull;
      }
      d.cx += (gx - d.cx) * k2;
      d.cy += (gy - d.cy) * k2;
      d.cs += ((d.ts * (1 + wave * 0.9)) - d.cs) * k2;
      d.co += ((Math.min(1, d.to + wave * 0.5)) - d.co) * k2;
      if (Math.abs(gx - d.cx) > 0.15 || Math.abs(gy - d.cy) > 0.15 ||
          Math.abs(d.ts - d.cs) > 0.004 || Math.abs(d.to - d.co) > 0.004) {
        settled = false;
      }
      paint(d);
    }
    if (!settled && !reduceQuery.matches) kick();
  }

  function kick() {
    if (!rafId && !reduceQuery.matches) rafId = requestAnimationFrame(tick);
    else if (reduceQuery.matches) {
      var i;
      for (i = 0; i < dots.length; i++) {
        dots[i].cx = dots[i].tx;
        dots[i].cy = dots[i].ty;
        dots[i].cs = dots[i].ts;
        dots[i].co = dots[i].to;
        paint(dots[i]);
      }
    }
  }

  var api = {
    get band() {
      return band;
    },
    setBand: setBand,
    /* Inline controller handshake: normalized pointer (-14..14, -8..8). */
    setPointer: function (x, y, k) {
      pointer.x = (x / 14) * 0.5 + 0.5;
      pointer.y = 0.5 - (y / 8) * 0.5;
      pointer.k = k || 0;
      kick();
    },
    resize: function () {
      measure();
      retarget();
      if (reduceQuery.matches) kick();
    },
    render: function (progress) {
      var p = Number(progress);
      if (!isFinite(p)) return;
      setBand(Math.min(4, Math.floor(Math.max(0, p) * 5)));
    }
  };

  window.saaeHero = api;

  var rebuildTimer = 0;
  function onViewportChange() {
    window.clearTimeout(rebuildTimer);
    rebuildTimer = window.setTimeout(function () {
      if ((mobileQuery.matches ? 40 : 120) !== dots.length) build();
      else api.resize();
    }, 180);
  }

  window.addEventListener("resize", onViewportChange, { passive: true });
  if (typeof mobileQuery.addEventListener === "function") {
    mobileQuery.addEventListener("change", onViewportChange);
  }
  if (typeof reduceQuery.addEventListener === "function") {
    reduceQuery.addEventListener("change", function () {
      startTime = performance.now() - 1e9;
      retarget();
    });
  }

  build();
  heroSection.dispatchEvent(new CustomEvent("saae:hero-ready", { detail: api }));
})();
