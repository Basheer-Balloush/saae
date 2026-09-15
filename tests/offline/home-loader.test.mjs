import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const source = readFileSync(new URL('../../public/cinematic/js/home-inline.js', import.meta.url), 'utf8');
// Exercise the production loader in isolation from the expensive hero renderer.
const start = source.indexOf('      const siteLoader = document.getElementById("site-loader");');
const end = source.indexOf('      /* A reload part-way down', start);
assert(start >= 0 && end > start);
const loaderSource = `(() => { ${source.slice(start, end)} })();`;

function setup() {
  const classes = new Set(['site-loading']);
  const loaderClasses = new Set();
  const classList = values => ({
    add: (...names) => names.forEach(name => values.add(name)),
    remove: (...names) => names.forEach(name => values.delete(name)),
    contains: name => values.has(name),
  });
  const loader = { isConnected: true, classList: classList(loaderClasses), style: { setProperty() {} } };
  const listeners = new Map();
  const timers = new Map();
  const errors = [];
  let now = 0;
  let id = 0;
  const window = {
    addEventListener(type, fn) {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type).add(fn);
    },
    removeEventListener: (type, fn) => listeners.get(type)?.delete(fn),
    setTimeout: (fn, delay) => { timers.set(++id, { fn, at: now + delay }); return id; },
    clearTimeout: id => timers.delete(id),
  };
  runInNewContext(loaderSource, {
    window,
    document: {
      documentElement: { classList: classList(classes) },
      getElementById: name => name === 'site-loader' ? loader : { setAttribute() {} },
    },
    video: { addEventListener() {}, removeEventListener() {} },
    reducedMotion: { matches: false },
    isStaticExperience: () => false,
    clamp: (value, min, max) => Math.min(max, Math.max(min, value)),
    lastPaintedProgress: 0,
    easedProgress: 0,
    paintHero: () => { throw new Error('renderer failed'); },
    schedulePagePaint() {},
  });
  const send = (type, key = 'ArrowDown') => {
    const event = { key, defaultPrevented: false, preventDefault() { this.defaultPrevented = true; } };
    listeners.get(type)?.forEach(fn => fn(event));
    return event;
  };
  const advance = until => {
    while (true) {
      const next = [...timers].sort((a, b) => a[1].at - b[1].at)[0];
      if (!next || next[1].at > until) break;
      const [id, timer] = next;
      timers.delete(id);
      now = timer.at;
      try { timer.fn(); } catch (error) { errors.push(error); }
    }
    now = until;
  };
  return { classes, loaderClasses, loader, send, advance, errors };
}

test('a renderer failure during loader dismissal cannot leave scrolling locked', () => {
  const app = setup();
  assert.equal(app.send('wheel').defaultPrevented, true);
  app.advance(9300);
  assert.equal(app.errors.length, 1);
  assert.equal(app.errors[0].message, 'renderer failed');
  assert.equal(app.classes.has('site-loading'), false);
  for (const type of ['wheel', 'touchmove', 'keydown']) assert.equal(app.send(type).defaultPrevented, false);
  app.advance(10000);
  assert.equal(app.loaderClasses.has('is-hidden'), true);
});

test('detached loading-screen handlers never intercept the replacement page', () => {
  const app = setup();
  app.loader.isConnected = false;
  for (const type of ['wheel', 'touchmove', 'keydown']) assert.equal(app.send(type).defaultPrevented, false);
});

test('the independent loading fallback makes any remaining input handler inert', () => {
  const app = setup();
  app.classes.delete('site-loading');
  for (const type of ['wheel', 'touchmove', 'keydown']) assert.equal(app.send(type).defaultPrevented, false);
});
