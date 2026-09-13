const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function bootDialogue() {
  const elements = {};

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
    }
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
  Object.assign(elements['map-layer'], {
    naturalWidth: 1448,
    naturalHeight: 1086,
  });
  elements['map-layer'].style.transform = 'translate3d(0px,0px,0) scale(1)';
  elements['map-layer'].style.width = '1448px';
  elements['map-layer'].style.height = '1086px';

  const document = {
    getElementById: (id) => elements[id] || null,
    createElement: () => new Element(),
  };

  class WindowHarness {
    constructor() { this.listeners = new Map(); }
    addEventListener(type, fn) {
      if (!this.listeners.has(type)) this.listeners.set(type, []);
      this.listeners.get(type).push(fn);
    }
    dispatchEvent(event) {
      for (const fn of this.listeners.get(event.type) || []) fn(event);
      return true;
    }
    emit(type, extra = {}) {
      for (const fn of this.listeners.get(type) || []) fn({ type, preventDefault() {}, ...extra });
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

  let interactionStarts = 0;
  let interactionEnds = 0;
  window.addEventListener('tarot-breaker:interaction-start', () => interactionStarts++);
  window.addEventListener('tarot-breaker:interaction-end', () => interactionEnds++);

  const sandbox = vm.createContext({
    window,
    document,
    console,
    Event: class Event { constructor(type) { this.type = type; } },
    queueMicrotask: (fn) => fn(),
    Math,
    JSON,
    parseFloat,
  });
  vm.runInContext(fs.readFileSync('dialogue.js', 'utf8'), sandbox, { filename: 'dialogue.js' });

  const controls = window.TarotControls.createControls();
  return {
    window,
    controls,
    elements,
    starts: () => interactionStarts,
    ends: () => interactionEnds,
  };
}

function finishCurrentEvent(dialogue) {
  const state = dialogue.getState();
  const total = dialogue.scripts[state.eventId].length;
  for (let i = state.lineIndex; i < total; i++) dialogue.advance();
}

test('Shiopon proximity starts once, pauses interaction, then joins the party', () => {
  const h = bootDialogue();
  h.controls.step({ x: 810, y: 850 }, 0.016, 155);
  let state = h.window.TarotDialogue.getState();
  assert.equal(state.active, true);
  assert.equal(state.eventId, 'shioponMeet');
  assert.equal(h.starts(), 1);
  assert.equal(h.elements['dialogue-speaker'].textContent, 'シオン');
  assert.equal(h.elements['dialogue-text'].textContent, 'しおぽん、何してるんだ？');

  finishCurrentEvent(h.window.TarotDialogue);
  state = h.window.TarotDialogue.getState();
  assert.equal(state.active, false);
  assert.equal(state.shioponDone, true);
  assert.equal(state.joined, true);
  assert.equal(state.objective, '星門へ向かう');
  assert.equal(h.ends(), 1);

  h.controls.step({ x: 810, y: 850 }, 0.016, 155);
  assert.equal(h.starts(), 1, 'completed proximity event must not retrigger');
});

test('Lumiere event requires Shiopon completion and updates the objective once', () => {
  const h = bootDialogue();
  h.controls.step({ x: 810, y: 250 }, 0.016, 155);
  assert.equal(h.window.TarotDialogue.getState().active, false);

  h.controls.step({ x: 810, y: 850 }, 0.016, 155);
  finishCurrentEvent(h.window.TarotDialogue);
  h.controls.step({ x: 810, y: 250 }, 0.016, 155);
  let state = h.window.TarotDialogue.getState();
  assert.equal(state.active, true);
  assert.equal(state.eventId, 'lumiereGate');
  assert.equal(h.elements['dialogue-speaker'].textContent, 'しおぽん');

  finishCurrentEvent(h.window.TarotDialogue);
  state = h.window.TarotDialogue.getState();
  assert.equal(state.lumiereDone, true);
  assert.equal(state.objective, '星門の様子を確かめる');
  assert.equal(h.starts(), 2);
  assert.equal(h.ends(), 2);

  h.controls.step({ x: 810, y: 250 }, 0.016, 155);
  assert.equal(h.starts(), 2, 'completed gate event must not retrigger');
});

test('dialogue text preserves core speech constraints from the approved script', () => {
  const h = bootDialogue();
  const scripts = h.window.TarotDialogue.scripts;
  const all = [...scripts.shioponMeet, ...scripts.lumiereGate];
  const shion = all.filter(([speaker]) => speaker === 'シオン').map(([, text]) => text);
  const lumiere = all.filter(([speaker]) => speaker === 'リュミエール').map(([, text]) => text);

  assert.ok(shion.includes('オレを待ってたんじゃないの？'));
  assert.ok(shion.every((text) => !/(^|[^ァ-ヶ])私(?:は|が|も|、)/.test(text)));
  assert.ok(lumiere.includes('しおぽん様。'));
  assert.ok(lumiere.includes('シオン様も。'));
  assert.ok(lumiere.includes('今のは、少し先を言いすぎました。'));
});
