"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const anomaly = fs.readFileSync("star-gate-anomaly.js", "utf8");
const interaction = fs.readFileSync("star-gate-interaction.js", "utf8");
const registry = fs.readFileSync("route-registry.js", "utf8");
const html = fs.readFileSync("index.html", "utf8");
const css = fs.readFileSync("star-gate-anomaly.css", "utf8");
const game = fs.readFileSync("game.js", "utf8");

test("anomaly is registered behind Lumiere completion", () => {
  assert.match(registry, /garden_star_gate_anomaly/);
  assert.ok(registry.includes('requires: Object.freeze(["garden_lumiere_gate"])'));
});

test("interaction requires canonical Lumiere progress and suppresses completed anomaly", () => {
  assert.ok(interaction.includes('isEventCompleted("garden_lumiere_gate")'));
  assert.ok(interaction.includes('isEventCompleted("garden_star_gate_anomaly")'));
  assert.ok(!interaction.includes("state?.lumiereDone"));
});

test("vision assets and independent card layers are preloaded", () => {
  for (const asset of [
    "assets/events/gate-vision/ruins.webp",
    "assets/events/gate-vision/smoke.webp",
    "assets/events/gate-vision/void.webp",
    "shion_card_05_reach.webp",
    "shion_card_dark_aura_01.webp",
    "shion_card_dark_aura_02.webp",
  ]) assert.ok(anomaly.includes(asset), asset);
  assert.ok(anomaly.includes("Promise.all"));
  assert.ok(anomaly.includes('class="sga-card"'));
});

test("approved ambiguity and aftermath dialogue remain exact", () => {
  for (const line of [
    "――選べ。",
    "星門の拒絶？",
    "……いいえ。拒絶ではありません。",
    "星門の故障とも……違う。",
    "……わかりません。",
    "ひとつ……すごく遠くなった気がする。",
    "……アリエット様のところへ。",
    "星界の声について、私より深く聞き取れる方です。",
  ]) assert.ok(anomaly.includes(line), line);
});

test("progress completes only after aftermath and runtime is wired", () => {
  assert.ok(anomaly.includes('completeEvent("garden_star_gate_anomaly"'));
  assert.ok(anomaly.indexOf("await aftermath()") < anomaly.indexOf("complete();success=true"));
  assert.ok(html.includes("star-gate-anomaly.js"));
  assert.ok(html.includes("star-gate-anomaly.css"));
});

test("event owns interaction cleanup", () => {
  assert.ok(anomaly.includes("interaction-start"));
  assert.ok(anomaly.includes("finally{"));
  assert.ok(anomaly.includes("interaction-end"));
  assert.ok(anomaly.includes("cleanupGateState({preserveFinal:success})"));
});

test("landing restores completed Devil memory into the legacy trigger guard", () => {
  const landing = fs.readFileSync("star-country-landing.html", "utf8");
  const restore = landing.indexOf('isEventCompleted("landing_devil_memory")');
  const guard = landing.indexOf('let devilEventStarted = window.TarotJourney?.get("landingMemoryDone") === true');
  assert.ok(restore >= 0);
  assert.ok(guard > restore);
  assert.ok(landing.slice(restore, guard).includes('TarotJourney?.set("landingMemoryDone", true)'));
});

test("next-event unlock uses durable Progress after explicit Lumiere completion handoff", () => {
  const bridge = fs.readFileSync("garden-progress-observer.js", "utf8");
  const dialogue = fs.readFileSync("dialogue.js", "utf8");
  assert.ok(dialogue.includes('"garden_lumiere_gate"'));
  assert.ok(dialogue.includes('"tarot-breaker:story-event-complete"'));
  assert.ok(bridge.includes("progress.completeEvent(eventId, checkpoint)"));
  assert.ok(interaction.includes('isEventCompleted("garden_lumiere_gate")'));
  assert.ok(!interaction.includes("state?.lumiereDone"));
});

test("gate choice requires close approach and owns the movement lock", () => {
  assert.match(interaction, /const ACTIVE_RADIUS = 46;/);
  assert.match(interaction, /garden_star_gate_prompt/);
  assert.match(interaction, /tarot-breaker:interaction-start/);
  assert.match(interaction, /hidePrompt\(\{ unlock: false \}\)/);
  assert.match(interaction, /tarot-breaker:interaction-end/);
});

test("anomaly validates durable Progress before starting and keeps one continuous interaction lock", () => {
  assert.match(anomaly, /const loaded=p\.load\(\);if\(loaded\.status!=="valid"/);
  assert.match(anomaly, /promptLock===true/);
  assert.match(anomaly, /if\(!promptLocked\)/);
  assert.match(anomaly, /const release=interactionOwned\|\|/);
});

test("reversal does not synthesize an unauthored low resonance sound", () => {
  assert.doesNotMatch(anomaly, /playbackRate\s*=|se\.volume\s*=/);
});

test("card ascent hands off to floating without removing ascent state", () => {
  assert.doesNotMatch(anomaly, /classList\.remove\("ascend"\)/);
  assert.match(css, /@keyframes sgaFloat[\s\S]*?from \{ transform:translate3d\(-50%,-38vh/);
});

test("cinematic contract keeps the existing post-reaction survey and actor visibility", () => {
  assert.match(game, /TarotCinematicCamera/);
  assert.match(game, /returnToPlayer/);
  assert.match(game, /TarotActorVisibility/);
  assert.match(anomaly, /fadeNpc\("shiopon"\)/);
  assert.match(anomaly, /fadeNpc\("lumiere"\)/);
  assert.match(anomaly, /survey-fountain/);
  assert.match(anomaly, /survey-upper/);
  assert.match(anomaly, /survey-gate/);
  assert.ok(anomaly.indexOf("survey-gate") < anomaly.indexOf("setShion(1)"));
});

test("gate framing uses measured artwork bounds and cinematic-only overscan zoom", () => {
  assert.match(anomaly, /GATE_BOUNDS=Object\.freeze\(\{left:520,top:-163\.33333333333331,right:1080,bottom:210\}\)/);
  assert.match(anomaly, /camera\.frameBounds\(GATE_BOUNDS,1550/);
  assert.match(game, /frameBounds\(bounds = \{\}, duration = 1200/);
  assert.match(game, /cinematicCamera\.owned && cinematicCamera\.allowOverscan/);
  assert.match(game, /if \(cinematicCamera\.owned\) return;/);
  assert.match(game, /normalCameraZoom/);
  assert.match(game, /camera\.zoom = normalCameraZoom/);
  assert.match(anomaly, /gateIsFramed\(camera\.getState\(\)\)/);
});

test("Sephirot overlay aligns ten authored gate nodes instead of a synthetic center glow", () => {
  const circles = [...html.matchAll(/<circle data-order="[0-5]" cx="\d+" cy="\d+" r="45" \/>/g)];
  assert.equal(circles.length, 10);
  assert.ok(html.includes('viewBox="0 0 1536 1024"'));
  assert.ok(html.includes('class="sga-sephirot-paths"'));
  assert.doesNotMatch(anomaly, /class="sga-sephirot"/);
});

test("normal, anomaly, and reverse states are distinct and ordered before Lumiere reaction", () => {
  const resonanceStart = anomaly.indexOf("async function resonance");
  const order = [
    'setGateState("sga-sky-descent")',
    'setGateState("sga-normal-flow")',
    'setGateState("sga-resonance-complete")',
    'setGateState("sga-anomaly-flicker")',
    'setGateState("sga-anomaly")',
    'setGateState("sga-reverse-gate")',
    'setGateState("sga-reverse-flow")',
    'setGateState("sga-anomaly-rest")',
    'say("lumiere","……？")',
  ].map(token => anomaly.indexOf(token, resonanceStart));
  for (const index of order) assert.ok(index >= 0);
  for (let i = 1; i < order.length; i += 1) assert.ok(order[i] > order[i - 1]);
});

test("reverse flow changes particle direction and anomaly retains reduced sparkle", () => {
  assert.match(css, /@keyframes sgaSkyDown/);
  assert.match(css, /@keyframes sgaSkyUp/);
  assert.match(css, /@keyframes sgaPathDown/);
  assert.match(css, /@keyframes sgaPathUp/);
  assert.match(css, /#game-shell\.sga-reverse-gate \.sga-sephirot-nodes circle/);
  assert.match(css, /#game-shell\.sga-reverse-flow \.sga-sky-flow i/);
  assert.match(css, /#game-shell\.sga-anomaly-rest \.sga-gate-sparkles i/);
  assert.match(css, /\.sga-anomaly-rest \.sga-gate-sparkles i:nth-child\(8\)[\s\S]*?opacity: 0/);
  assert.match(css, /\.sga-anomaly-rest \.scene-gate-inner-light > img[\s\S]*?opacity: \.52 !important/);
});

test("front-half never completes Progress and guards Shion coordinates", () => {
  const resonance = anomaly.slice(anomaly.indexOf("async function resonance"), anomaly.indexOf("async function fadeNpc"));
  assert.doesNotMatch(resonance, /completeEvent|complete\(\)/);
  assert.match(resonance, /samePoint\(shionStart,shionEnd\)/);
  assert.ok(anomaly.indexOf('say("lumiere","……？")') < anomaly.indexOf("await vision()"));
});
