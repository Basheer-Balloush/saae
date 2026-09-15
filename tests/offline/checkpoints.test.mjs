import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const source = readFileSync(new URL('../../public/cinematic/js/checkpoints.js', import.meta.url), 'utf8');

function setup({ reduced = false, loading = false, engine = true } = {}) {
  const listeners = [];
  const moves = [];
  const timers = new Map();
  let now = 100;
  let timerId = 0;
  class Element {
    constructor(tag = 'div', parentElement = null) {
      Object.assign(this, { tag, parentElement, overflowY: 'visible', scrollHeight: 100, clientHeight: 100 });
    }
    closest(selector) {
      return selector.split(',').map(value => value.trim()).includes(this.tag) ? this : this.parentElement?.closest(selector) ?? null;
    }
  }
  const body = new Element('body');
  const window = {
    scrollY: 0,
    innerHeight: 1000,
    matchMedia: () => ({ matches: reduced }),
    addEventListener: (type, fn, options = {}) => listeners.push({ type, fn, capture: Boolean(options.capture) }),
    removeEventListener: (type, fn) => {
      const index = listeners.findIndex(listener => listener.type === type && listener.fn === fn);
      if (index >= 0) listeners.splice(index, 1);
    },
    setTimeout: (fn, delay) => {
      timers.set(++timerId, { fn, at: now + delay });
      return timerId;
    },
    clearTimeout: id => timers.delete(id),
    cancelAnimationFrame() {},
    saaeScroll: engine ? { on() {}, scrollTo: (y, options) => moves.push({ y, options }) } : null,
  };
  window.saaeScrollDestroy = () => { window.saaeScroll = null; };
  const hero = { offsetHeight: 11000, getBoundingClientRect: () => ({ top: -window.scrollY }) };
  const context = {
    window, Element,
    document: {
      body,
      documentElement: { scrollHeight: 30000, classList: { contains: () => loading } },
      getElementById: id => id === 'hero-sec' ? hero : null,
      querySelector: () => null,
      querySelectorAll: () => [],
      addEventListener() {},
      removeEventListener() {},
    },
    performance: { now: () => now },
    getComputedStyle: node => ({ overflowY: node.overflowY }),
    clearTimeout: id => timers.delete(id),
    requestAnimationFrame: () => 1,
  };
  const reload = () => runInNewContext(source, context);
  reload();
  function send(type, properties = {}) {
    const event = {
      target: body, key: 'ArrowDown', deltaY: 100, deltaX: 0,
      defaultPrevented: false, repeat: false,
      preventDefault() { this.defaultPrevented = true; },
      stopPropagation() { this.stopped = true; },
      ...properties,
    };
    for (const capture of [true, false]) {
      if (!capture && event.stopped) break;
      listeners.filter(listener => listener.type === type && listener.capture === capture).forEach(listener => listener.fn(event));
    }
    return event;
  }
  const finish = () => {
    const move = moves.at(-1);
    window.scrollY = move.y;
    move.options.onComplete();
  };
  const advance = ms => {
    now += ms;
    for (const [id, timer] of timers) {
      if (timer.at <= now) { timers.delete(id); timer.fn(); }
    }
  };
  return { window, moves, send, finish, reload, advance, Element, body, listeners, timers };
}

test('desktop scroll keys start the same slightly faster journey immediately', () => {
  for (const key of ['ArrowDown', 'PageDown', ' ']) {
    const app = setup();
    assert.equal(app.send('keydown', { key }).defaultPrevented, true);
    assert.equal(app.moves.length, 1);
    assert.equal(app.moves[0].y, 2275);
    assert.equal(app.moves[0].options.duration, 3.8);
    assert.equal(app.moves[0].options.lock, false);
    assert.equal(app.window.saaeCheckpoints.journey().journeying, true);
  }
  const app = setup();
  assert.equal(app.send('wheel').defaultPrevented, true);
  assert.equal(app.moves[0].y, 2275);
});

test('upward keys and Shift+Space go to the preceding hero stop', () => {
  for (const properties of [{ key: 'ArrowUp' }, { key: 'PageUp' }, { key: ' ', shiftKey: true }]) {
    const app = setup();
    app.window.scrollY = 2275;
    assert.equal(app.send('keydown', properties).defaultPrevented, true);
    assert.equal(app.moves[0].y, 0);
  }
});

test('key repeats do not interrupt a journey or skip stops', () => {
  const app = setup();
  app.send('keydown');
  app.send('keydown', { repeat: true });
  assert.equal(app.moves.length, 1);
  assert.equal(app.window.saaeCheckpoints.journey().journeying, true);
  app.finish();
  app.send('keydown', { repeat: true });
  assert.equal(app.moves.length, 1);
  app.send('keydown');
  assert.equal(app.moves[1].y, 4060);
  app.finish();
  assert.equal(app.moves[2].y, 4568);
  assert.equal(app.moves[2].options.duration, 2);
});

test('native scrolling is preserved at the hero boundaries and below the hero', () => {
  for (const [y, key] of [[0, 'ArrowUp'], [9370, 'ArrowDown'], [12000, 'ArrowDown']]) {
    const app = setup();
    app.window.scrollY = y;
    assert.equal(app.send('keydown', { key }).defaultPrevented, false);
    assert.equal(app.moves.length, 0);
  }
});

test('typing, interactive controls, dialogs and nested scroll areas keep their keys', () => {
  for (const tag of ['input', 'textarea', 'select', '[contenteditable]', 'button', 'a', 'summary', '[role="slider"]', 'dialog', '[data-journey-free]']) {
    const app = setup();
    const target = new app.Element('span', new app.Element(tag, app.body));
    assert.equal(app.send('keydown', { target }).defaultPrevented, false, tag);
    assert.equal(app.moves.length, 0, tag);
  }
  const app = setup();
  const target = new app.Element('div', app.body);
  Object.assign(target, { overflowY: 'auto', scrollHeight: 300 });
  assert.equal(app.send('keydown', { target }).defaultPrevented, false);
  assert.equal(app.send('wheel', { target }).defaultPrevented, false);
});

test('reduced motion, loading, touch fallback and modified keys are not intercepted', () => {
  for (const options of [{ reduced: true }, { loading: true }, { engine: false }]) {
    const app = setup(options);
    assert.equal(app.send('keydown').defaultPrevented, false);
    assert.equal(app.send('wheel').defaultPrevented, false);
    assert.equal(app.moves.length, 0);
  }
  for (const properties of [{ ctrlKey: true }, { metaKey: true }, { shiftKey: true }, { key: 'Enter' }]) {
    const app = setup();
    assert.equal(app.send('keydown', properties).defaultPrevented, false);
    assert.equal(app.moves.length, 0);
  }
});

test('rerunning the script leaves only one keyboard journey handler', () => {
  const app = setup();
  app.reload();
  app.send('keydown');
  assert.equal(app.moves.length, 1);
  assert.equal(app.window.saaeCheckpoints.journey().journeying, true);
});

test('a journey whose completion never fires releases ownership on its deadline', () => {
  const app = setup();
  app.send('wheel');
  app.advance(4200);
  assert.equal(app.window.saaeCheckpoints.journey().journeying, false);
  assert.equal(app.moves.at(-1).options.immediate, true);
  assert.equal(app.window.saaeScroll, null);
  assert.equal(app.send('wheel').defaultPrevented, false);
  assert.equal(app.send('keydown').defaultPrevented, false);
  app.window.scrollY = 12000;
  assert.equal(app.send('wheel').defaultPrevented, false);
});

test('touch input immediately cancels auto-scroll without being prevented', () => {
  const app = setup();
  app.send('keydown');
  assert.equal(app.send('touchstart').defaultPrevented, false);
  assert.equal(app.window.saaeCheckpoints.journey().journeying, false);
  assert.equal(app.moves.at(-1).options.immediate, true);
  assert.equal(app.timers.size, 0);
});

test('page cleanup removes all journey handlers and cancels stale completions', () => {
  const app = setup();
  app.send('wheel');
  const staleCompletion = app.moves[0].options.onComplete;
  const staleLoadListeners = app.listeners.filter(listener => listener.type === 'load');
  app.window.saaeCheckpointsDestroy();
  assert.equal(app.listeners.length, 0);
  assert.equal(app.timers.size, 0);
  assert.equal(app.window.saaeCheckpoints, null);
  staleCompletion();
  staleLoadListeners.forEach(listener => listener.fn({}));
  assert.equal(app.send('wheel').defaultPrevented, false);
  assert.equal(app.moves.length, 2);
});
