"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const source = fs.readFileSync("public-continue-title.js", "utf8");
const html = fs.readFileSync("index.html", "utf8");
const css = fs.readFileSync("game.css", "utf8");

class FakeElement {
  constructor(id, {hidden=false, disabled=false} = {}) {
    this.id = id;
    this.hidden = hidden;
    this.disabled = disabled;
    this.dataset = {};
    this.textContent = "";
    this.attrs = {};
    this.listeners = {};
    this.children = new Map();
    this.focused = false;
    const classes = new Set();
    this.classList = {
      add: (...names) => names.forEach(name => classes.add(name)),
      remove: (...names) => names.forEach(name => classes.delete(name)),
      contains: name => classes.has(name),
    };
  }
  querySelector(selector) { return this.children.get(selector) || null; }
  setAttribute(name, value) { this.attrs[name] = String(value); }
  addEventListener(type, listener, options) {
    (this.listeners[type] ||= []).push({
      listener,
      capture: options === true || Boolean(options?.capture),
    });
  }
  focus() { this.focused = true; }
  click() {
    if (this.disabled) return;
    const event = {
      type: "click",
      target: this,
      defaultPrevented: false,
      immediateStopped: false,
      propagationStopped: false,
      preventDefault() { this.defaultPrevented = true; },
      stopPropagation() { this.propagationStopped = true; },
      stopImmediatePropagation() {
        this.immediateStopped = true;
        this.propagationStopped = true;
      },
    };
    const handlers = this.listeners.click || [];
    for (const phase of [true, false]) {
      for (const entry of handlers.filter(item => item.capture === phase)) {
        if (event.immediateStopped) return event;
        entry.listener(event);
      }
    }
    return event;
  }
}

function harness(initialAssessment) {
  let assessment = initialAssessment;
  let navigated = null;
  let launched = 0;
  const windowListeners = {};
  const documentListeners = {};

  const screen = new FakeElement("start-screen");
  const start = new FakeElement("start", {disabled:true});
  const startJp = new FakeElement("start-jp");
  const startEn = new FakeElement("start-en");
  start.children.set(".title-screen__choice-jp", startJp);
  start.children.set(".title-screen__choice-en", startEn);

  const elements = {
    "start-screen": screen,
    start,
    continue: new FakeElement("continue", {hidden:true,disabled:true}),
    "continue-note": new FakeElement("continue-note"),
    "title-retry": new FakeElement("title-retry", {hidden:true}),
    "new-game-confirm": new FakeElement("new-game-confirm", {hidden:true}),
    "new-game-confirm-accept": new FakeElement("new-game-confirm-accept"),
    "new-game-confirm-cancel": new FakeElement("new-game-confirm-cancel"),
  };

  const h = {
    console,
    URLSearchParams,
    location: {search:"", href:""},
    CustomEvent: class CustomEvent {
      constructor(type, init={}) { this.type=type; Object.assign(this, init); }
    },
    document: {
      getElementById: id => elements[id] || null,
      addEventListener: (type, listener) => (documentListeners[type] ||= []).push(listener),
    },
    addEventListener: (type, listener) => (windowListeners[type] ||= []).push(listener),
    dispatchEvent: () => {},
    TarotRuntimeEntry: {
      navigate(url) { navigated = url; return {ok:true}; },
    },
    TarotPublicContinue: {
      createController({navigate}) {
        return {
          inspect: () => assessment,
          launch() {
            launched += 1;
            if (!assessment.ok) return assessment;
            navigate(assessment.url || "./alenon.html?entry=continue");
            return assessment;
          },
        };
      },
    },
  };
  h.window = h;
  vm.createContext(h);
  vm.runInContext(source, h, {filename:"public-continue-title.js"});

  return {
    h, elements, startJp, startEn,
    setAssessment(value) { assessment = value; },
    get navigated() { return navigated; },
    get launched() { return launched; },
    fireWindow(type) { for (const fn of windowListeners[type] || []) fn({type}); },
  };
}

test("Title markup uses Japanese-first world-design labels and no legacy TOUCH TO START", () => {
  assert.match(html, /物語をはじめる/);
  assert.match(html, />BEGIN</);
  assert.match(html, /つづきから/);
  assert.match(html, />CONTINUE</);
  assert.match(source, /setStartLabel\("はじめから", "NEW GAME", "new-game"\)/);
  assert.match(html, /物語を、はじめから選び直しますか？/);
  assert.match(html, /現在の進行データはリセットされます。/);
  assert.doesNotMatch(html, /TOUCH TO START/);
  assert.doesNotMatch(html, /id="continue"[^>]*style=/);
});

test("Title menu renders generated frame artwork without CSS-built symbols", () => {
  assert.match(html, /title-screen__frame title-screen__frame--continue/);
  assert.match(html, /title-screen__frame title-screen__frame--newgame/);
  assert.doesNotMatch(html, /title-screen__plaque/);
  assert.doesNotMatch(html, /title-screen__emblem/);
  assert.match(css, /assets\/ui\/title\/continue-frame\.webp/);
  assert.match(css, /assets\/ui\/title\/newgame-fra\.webp/);
  assert.match(css, /\.title-screen__choice \{[\s\S]*min-height: 68px;[\s\S]*border-radius: 999px;[\s\S]*touch-action: manipulation/);
  assert.match(css, /\.title-screen__choice \{[\s\S]*aspect-ratio: 1920 \/ 368/);
  assert.match(css, /\.title-screen__frame \{[\s\S]*background-size: contain/);
  assert.doesNotMatch(css, /\.title-screen__frame \{[\s\S]{0,260}background-size: 100% 100%/);
  assert.match(css, /\.title-screen__background\{[\s\S]*object-fit:cover/);
  assert.doesNotMatch(css, /animation:\s*title-continue-glint/);
  assert.match(css, /title-frame-soft-glow 3\.2s/);
  assert.match(css, /title-selection-bloom \.28s/);
  assert.match(css, /\.title-screen__choice::before[\s\S]*rgba\(1,6,16,\.68\)/);
  assert.match(css, /translateY\(2px\) scale\(\.995\)/);
  assert.match(css, /prefers-reduced-motion/);
  assert.match(css, /env\(safe-area-inset-bottom\)/);
  assert.match(css, /\.title-screen__confirm-panel/);
});

test("NO_SAVE shows only 物語をはじめる / BEGIN and allows the existing New Game handler", () => {
  const t = harness({ok:false,status:"none"});
  const {start, continue:cont, "title-retry":retry, "new-game-confirm":confirm} = t.elements;
  assert.equal(t.elements["start-screen"].dataset.titleMode, "new");
  assert.equal(t.startJp.textContent, "物語をはじめる");
  assert.equal(t.startEn.textContent, "BEGIN");
  assert.equal(cont.hidden, true);
  assert.equal(retry.hidden, true);

  let existingNewGameCalls = 0;
  start.addEventListener("click", () => { existingNewGameCalls += 1; });
  start.disabled = false;
  start.click();

  assert.equal(existingNewGameCalls, 1);
  assert.equal(confirm.hidden, true);
});

test("CONTINUE_AVAILABLE shows Continue first and requires confirmation before New Game", () => {
  const t = harness({
    ok:true,
    status:"valid",
    url:"./star-country-landing.html?entry=continue",
    context:{mapId:"star_country_landing",spawnId:"pad_ground"},
  });
  const {start, continue:cont, "title-retry":retry, "new-game-confirm":confirm,
    "new-game-confirm-accept":accept, "new-game-confirm-cancel":cancel} = t.elements;

  assert.equal(t.elements["start-screen"].dataset.titleMode, "continue");
  assert.equal(cont.hidden, false);
  assert.equal(cont.disabled, false);
  assert.equal(t.startJp.textContent, "はじめから");
  assert.equal(t.startEn.textContent, "NEW GAME");
  assert.equal(retry.hidden, true);

  let existingNewGameCalls = 0;
  start.addEventListener("click", () => { existingNewGameCalls += 1; });
  start.disabled = false;

  start.click();
  assert.equal(existingNewGameCalls, 0);
  assert.equal(confirm.hidden, false);

  cancel.click();
  assert.equal(confirm.hidden, true);
  assert.equal(existingNewGameCalls, 0);

  start.click();
  assert.equal(confirm.hidden, false);
  accept.click();
  assert.equal(confirm.hidden, true);
  assert.equal(existingNewGameCalls, 1);
});

test("valid Continue still launches through the existing Public Continue controller", () => {
  const t = harness({
    ok:true,
    status:"valid",
    url:"./alenon.html?entry=continue",
    context:{mapId:"alenon",spawnId:"pad_return"},
  });
  t.elements.start.disabled = false;
  t.elements.continue.click();

  assert.equal(t.launched, 1);
  assert.equal(t.navigated, "./alenon.html?entry=continue");
  assert.equal(t.elements.continue.disabled, true);
  assert.equal(t.elements.start.disabled, true);
});

test("invalid save is not auto-reset; it exposes RETRY and a confirmed New Game path", () => {
  const t = harness({ok:false,status:"invalid"});
  assert.equal(t.elements["start-screen"].dataset.titleMode, "error");
  assert.equal(t.elements.continue.hidden, true);
  assert.equal(t.elements["title-retry"].hidden, false);
  assert.equal(t.elements["continue-note"].textContent, "セーブデータを確認できませんでした");
  assert.equal(t.startJp.textContent, "はじめから");
  assert.equal(t.startEn.textContent, "NEW GAME");

  t.setAssessment({
    ok:true,
    status:"valid",
    url:"./index.html?entry=continue",
    context:{mapId:"star_gate_garden",spawnId:"south_gate"},
  });
  t.elements["title-retry"].click();
  assert.equal(t.elements["start-screen"].dataset.titleMode, "continue");
  assert.equal(t.elements.continue.hidden, false);
});
