import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const source = readFileSync(new URL('../../public/cinematic/js/scroll-engine.js', import.meta.url), 'utf8');

function setup() {
  const instances = [];
  const ticks = new Set();
  const classes = new Set();
  const media = new Map();
  const matchMedia = query => {
    if (!media.has(query)) {
      const listeners = new Set();
      media.set(query, {
        matches: false,
        addEventListener: (_, fn) => listeners.add(fn),
        removeEventListener: (_, fn) => listeners.delete(fn),
        change(matches) { this.matches = matches; listeners.forEach(fn => fn()); },
        listeners,
      });
    }
    return media.get(query);
  };
  class Lenis {
    constructor(options) { this.options = options; instances.push(this); }
    destroy() { this.destroyed = true; }
    raf() {}
  }
  const window = {
    Lenis, matchMedia,
    gsap: { ticker: { add: fn => ticks.add(fn), remove: fn => ticks.delete(fn), lagSmoothing() {} } },
  };
  const document = {
    readyState: 'complete',
    removeEventListener() {},
    documentElement: { classList: { add: name => classes.add(name), remove: name => classes.delete(name) } },
  };
  const reload = () => runInNewContext(source, { window, document });
  reload();
  return { window, instances, ticks, classes, media, reload };
}

test('reinitializing the page destroys the old smoother and its ticker', () => {
  const app = setup();
  app.reload();
  assert.equal(app.instances.length, 2);
  assert.equal(app.instances[0].destroyed, true);
  assert.equal(app.window.saaeScroll, app.instances[1]);
  assert.equal(app.ticks.size, 1);
  for (const gate of app.media.values()) assert.equal(gate.listeners.size, 1);
});

test('unmounting destroys the smoother and cannot restart it through media changes', () => {
  const app = setup();
  const staleSync = [...app.media.values()][0].listeners.values().next().value;
  app.window.saaeScrollDestroy();
  assert.equal(app.window.saaeScroll, null);
  assert.equal(app.instances[0].destroyed, true);
  assert.equal(app.ticks.size, 0);
  assert.equal(app.classes.has('has-smooth-scroll'), false);
  for (const gate of app.media.values()) {
    assert.equal(gate.listeners.size, 0);
    gate.change(true);
    gate.change(false);
  }
  staleSync();
  assert.equal(app.instances.length, 1);
});

test('switching to touch or reduced motion returns scrolling to the browser', () => {
  for (const query of ['(pointer: coarse)', '(prefers-reduced-motion: reduce)']) {
    const app = setup();
    app.media.get(query).change(true);
    assert.equal(app.window.saaeScroll, null);
    assert.equal(app.instances[0].destroyed, true);
    assert.equal(app.ticks.size, 0);
    app.media.get(query).change(false);
    assert.equal(app.instances.length, 2);
    assert.equal(app.ticks.size, 1);
  }
});
