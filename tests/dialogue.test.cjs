const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function bootDialogue() {
  const elements = {};
  const performed = [];
  const stageFinishes = [];
  const signals = [];
  let timerId = 0;
  const timers = new Map();

  class Element {
    constructor(id = '') {
      this.id = id;
      this.hidden = false;
      this.dataset = {};
      this.style = {};
      this.listeners = new Map();
      this.children = [];
      this.textContent = '';
      this.attributes = {};
      this.classList = { add() {}, remove() {}, contains() { return false; } };
    }
    append(...children) { for (const child of children) this.appendChild(child); }
    replaceChildren(...children) { this.children = []; for (const child of children) this.appendChild(child); }
    addEventListener(type, fn) {
      if (!this.listeners.has(type)) this.listeners.set(type, []);
      this.listeners.get(type).push(fn);
    }
    emit(type, extra = {}) {
      const event = {
        type,
        key: extra.key,
        preventDefault() {},
        stopPropagation() {},
        ...extra,
      };
      for (const fn of this.listeners.get(type) || []) fn(event);
      return event;
    }
    appendChild(child) {
      this.children.push(child);
      if (child.id) elements[child.id] = child;
    }
    setAttribute(key, value) {
      this.attributes[key] = value;
      if (key === 'hidden') this.hidden = true;
    }
    focus() {}
    get isConnected() { return true; }
    set innerHTML(html) {
      this._innerHTML = html;
      for (const id of ['dialogue-advance', 'dialogue-speaker', 'dialogue-text']) {
        const child = new Element(id);
        elements[id] = child;
        this.children.push(child);
      }
    }
  }

  for (const id of ['game-shell', 'map-layer', 'guide', 'reset', 'game']) {
    elements[id] = new Element(id);
  }

  const document = {
    getElementById: (id) => elements[id] || null,
    createElement: () => new Element(),
    createDocumentFragment: () => new Element(),
  };

  class WindowHarness {
    constructor() { this.listeners = new Map(); }
    addEventListener(type, fn) {
      if (!this.listeners.has(type)) this.listeners.set(type, []);
      this.listeners.get(type).push(fn);
    }
    dispatchEvent(event) {
      signals.push({ type: event.type, detail: event.detail });
      for (const fn of this.listeners.get(event.type) || []) fn(event);
      return true;
    }
    emit(type, extra = {}) {
      this.dispatchEvent({ type, preventDefault() {}, ...extra });
    }
  }

  const window = new WindowHarness();
  window.TarotControls = {
    createControls() {
      return {
        state: { suspended: false },
        suspend() { this.state.suspended = true; },
        resume() { this.state.suspended = false; },
        step(position) { return { ...position, dx: 0, dy: 0, moving: false }; },
      };
    },
  };
  window.TarotStage = {
    perform(command) {
      performed.push(command);
      if (command.type === 'face' || command.type === 'lookTarget') {
        return { promise: Promise.resolve(), finish() {}, cancel() {} };
      }
      let settled = false;
      let resolveAction;
      const promise = new Promise(resolve => { resolveAction = resolve; });
      const settle = (kind) => {
        if (settled) return;
        settled = true;
        stageFinishes.push({ command, kind });
        resolveAction();
      };
      return {
        promise,
        finish: () => settle('finish'),
        cancel: () => settle('cancel'),
      };
    },
  };

  let interactionStarts = 0;
  let interactionEnds = 0;
  window.addEventListener('tarot-breaker:interaction-start', () => interactionStarts++);
  window.addEventListener('tarot-breaker:interaction-end', () => interactionEnds++);

  const sandbox = vm.createContext({
    window,
    document,
    console,
    Event: class Event { constructor(type) { this.type = type; } },
    CustomEvent: class CustomEvent {
      constructor(type, options = {}) { this.type = type; this.detail = options.detail; }
    },
    queueMicrotask: (fn) => fn(),
    requestAnimationFrame: (fn) => { fn(); return 1; },
    cancelAnimationFrame() {},
    setTimeout: (fn) => { const id = ++timerId; timers.set(id, fn); return id; },
    clearTimeout: (id) => timers.delete(id),
    Math,
    JSON,
  });
  vm.runInContext(fs.readFileSync('shared-dialogue.js', 'utf8'), sandbox, { filename: 'shared-dialogue.js' });
  vm.runInContext(fs.readFileSync('dialogue.js', 'utf8'), sandbox, { filename: 'dialogue.js' });

  const controls = window.TarotControls.createControls();
  return {
    window,
    controls,
    elements,
    performed,
    stageFinishes,
    signals,
    starts: () => interactionStarts,
    ends: () => interactionEnds,
    timers,
  };
}

async function flush() {
  for (let i = 0; i < 8; i++) await Promise.resolve();
}

async function revealOpening(dialogue) {
  await flush();
  for (let guard = 0; guard < 24 && dialogue.getState().active && dialogue.getState().mode !== 'dialogue'; guard++) {
    if (dialogue.getState().mode === 'action') dialogue.advance();
    await flush();
  }
}

async function finishCurrentEvent(dialogue) {
  for (let guard = 0; guard < 500 && dialogue.getState().active; guard++) {
    const state = dialogue.getState();
    if (state.mode === 'dialogue' || state.mode === 'action') dialogue.advance();
    await flush();
  }
  assert.equal(dialogue.getState().active, false, 'event runner must reach its end');
}

test('Shiopon proximity starts once, stages the opening, then joins the party', async () => {
  const h = bootDialogue();
  h.controls.step({ x: 810, y: 850 }, 0.016, 155);
  let state = h.window.TarotDialogue.getState();
  assert.equal(state.active, true);
  assert.equal(state.eventId, 'shioponMeet');
  assert.equal(h.starts(), 1);
  assert.equal(h.elements['dialogue-layer'].hidden, true, 'empty dialogue box stays hidden during approach');

  await revealOpening(h.window.TarotDialogue);
  state = h.window.TarotDialogue.getState();
  assert.equal(state.mode, 'dialogue');
  assert.equal(h.elements['dialogue-speaker'].textContent, 'シオン');
  assert.equal(h.elements['dialogue-speaker'].textContent, 'シオン');
  assert.equal(h.elements['dialogue-layer'].hidden, false);
  assert.deepEqual(
    h.performed.slice(0, 2).map(command => command.type),
    ['approach', 'face'],
  );

  await finishCurrentEvent(h.window.TarotDialogue);
  state = h.window.TarotDialogue.getState();
  assert.equal(state.shioponDone, true);
  assert.equal(state.joined, true);
  assert.equal(state.joined, true);
  assert.equal(h.ends(), 1);
  assert.ok(h.signals.some(event => event.type === 'tarot-breaker:shiopon-follow-start'));

  h.controls.step({ x: 810, y: 850 }, 0.016, 155);
  assert.equal(h.starts(), 1, 'completed proximity event must not retrigger');
});

test('Lumiere event requires Shiopon completion and updates the objective once', async () => {
  const h = bootDialogue();
  h.controls.step({ x: 810, y: 250 }, 0.016, 155);
  assert.equal(h.window.TarotDialogue.getState().active, false);

  h.controls.step({ x: 810, y: 850 }, 0.016, 155);
  await revealOpening(h.window.TarotDialogue);
  await finishCurrentEvent(h.window.TarotDialogue);
  h.controls.step({ x: 810, y: 250 }, 0.016, 155);
  await revealOpening(h.window.TarotDialogue);
  let state = h.window.TarotDialogue.getState();
  assert.equal(state.eventId, 'lumiereGate');
  assert.equal(h.elements['dialogue-speaker'].textContent, 'しおぽん');

  await finishCurrentEvent(h.window.TarotDialogue);
  state = h.window.TarotDialogue.getState();
  assert.equal(state.lumiereDone, true);
  assert.equal(state.lumiereDone, true);
  assert.equal(h.starts(), 2);
  assert.equal(h.ends(), 2);

  h.controls.step({ x: 810, y: 250 }, 0.016, 155);
  assert.equal(h.starts(), 2, 'completed gate event must not retrigger');
});

test('event data combines multiline dialogue, looks, waits, steps and Shiopon bounce', () => {
  const h = bootDialogue();
  const events = h.window.TarotDialogue.events;
  const commands = [...events.shioponMeet, ...events.lumiereGate];
  const types = new Set(commands.map(command => command.type));
  for (const type of ['dialogue', 'face', 'approach', 'step', 'wait', 'bounce', 'signal']) {
    assert.ok(types.has(type), `missing ${type} command`);
  }
  assert.ok(commands.some(command => command.type === 'dialogue' && command.text.length > 20));
  assert.ok(events.shioponMeet.filter(command => command.type === 'dialogue').length >= 32);
  assert.ok(events.lumiereGate.filter(command => command.type === 'dialogue').length >= 36);
});

test('dialogue UI is shared, multiline and safe-area aware', () => {
  const css = fs.readFileSync('shared-dialogue.css', 'utf8');
  assert.match(css, /white-space:\s*pre-wrap/);
  assert.match(css, /safe-area-inset-bottom/);
  assert.match(css, /safe-area-inset-left/);
  assert.match(css, /data-state="acting"/);
  assert.doesNotMatch(css, /!important|#prologue/);
  for (const file of ['alenon.html', 'star-country-landing.html', 'star-country-landing-editor.html', 'index.html']) {
    const html = fs.readFileSync(file, 'utf8');
    assert.match(html, /shared-dialogue.css\?v=20260920-dialogue-ui-v3/);
    assert.match(html, /shared-dialogue.js\?v=20260920-dialogue-ui-v3/);
    for (const style of html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)) {
      assert.doesNotMatch(style[1], /tb-dialogue-|#prologue-(?:dialogue|speaker|line)|#dialogue-next/);
    }
  }
});

test('tap during wait or actor motion finishes only that action and playback stays ordered', async () => {
  const h = bootDialogue();
  const trace = (label) => {
    const state = h.window.TarotDialogue.getState();
    console.error('[DIALOGUE_TRACE]', label, JSON.stringify({
      active: state.active,
      eventId: state.eventId,
      mode: state.mode,
      actionType: state.actionType,
      stepIndex: state.stepIndex,
      lineIndex: state.lineIndex,
      speaker: h.elements['dialogue-speaker']?.textContent || '',
      layerHidden: h.elements['dialogue-layer']?.hidden,
      performed: h.performed.map(command => command.type),
      stageFinishes: h.stageFinishes.map(entry => ({ type: entry.command.type, kind: entry.kind })),
    }));
  };
  trace('boot');
  h.controls.step({ x: 810, y: 850 }, 0.016, 155);
  await flush();
  trace('after-trigger');
  assert.equal(h.window.TarotDialogue.getState().actionType, 'approach');
  h.window.TarotDialogue.advance();
  await flush();
  trace('after-approach-skip');
  assert.equal(h.stageFinishes[0].kind, 'finish');
  await revealOpening(h.window.TarotDialogue);
  trace('after-reveal-opening');
  assert.equal(h.elements['dialogue-speaker'].textContent, 'シオン');
  assert.equal(h.elements['dialogue-layer'].hidden, false);

  h.window.TarotDialogue.advance();
  await flush();
  trace('after-first-dialogue-advance');
  await revealOpening(h.window.TarotDialogue);
  trace('after-second-reveal');
  assert.equal(h.elements['dialogue-speaker'].textContent, 'しおぽん');
});

test('dialogue text preserves approved speech and relationship constraints', () => {
  const h = bootDialogue();
  const scripts = h.window.TarotDialogue.scripts;
  const all = [...scripts.shioponMeet, ...scripts.lumiereGate];
  const shion = all.filter(([speaker]) => speaker === 'シオン').map(([, text]) => text);
  const lumiere = all.filter(([speaker]) => speaker === 'リュミエール').map(([, text]) => text);

  assert.ok(shion.some(text => text.includes('感情と事実は混ぜない方がいい')));
  assert.ok(shion.every(text => !/(^|[^ァ-ヶ])私(?:は|が|も|、)/.test(text)));
  assert.ok(lumiere.some(text => text.includes('しおぽん様。')));
  assert.ok(lumiere.some(text => text.includes('シオン様も。')));
  assert.ok(lumiere.some(text => text.includes('少し、出すぎたことを言いました。')));
});

test('reset during a blocking action cancels stale playback and releases interaction', async () => {
  const h = bootDialogue();
  h.controls.step({ x: 810, y: 850 }, 0.016, 155);
  await flush();
  assert.equal(h.window.TarotDialogue.getState().mode, 'action');
  h.window.TarotDialogue.reset();
  await flush();
  assert.equal(h.window.TarotDialogue.getState().active, false);
  assert.equal(h.ends(), 1);
  assert.equal(h.stageFinishes.at(-1).kind, 'cancel');
  assert.equal(h.elements['dialogue-layer'].hidden, true);
});
