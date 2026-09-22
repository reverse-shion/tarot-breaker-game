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
const cloudCss = fs.readFileSync("cloud-motion-fix.css", "utf8");

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

test("gate contact offers investigate or leave and safely hands the movement lock to anomaly", () => {
  assert.match(interaction, /const ACTIVE_RADIUS = 46;/);
  assert.match(interaction, /star-gate-interaction-choice/);
  assert.match(interaction, /星門を調べる/);
  assert.match(interaction, /離れる/);
  assert.match(interaction, /garden_star_gate_prompt/);
  assert.match(interaction, /tarot-breaker:interaction-start/);
  assert.match(interaction, /hidePrompt\(\{ unlock: false \}\)/);
  assert.match(interaction, /if \(!active \|\| !promptLock \|\| !progressReady\(\)\) return false/);
  assert.doesNotMatch(interaction, /if \(!canInteract\(\)\) return false/);
  assert.match(interaction, /tarot-breaker:interaction-end/);
  assert.match(html, /star-gate-interaction\.css\?v=star-gate-anomaly-v1-3/);
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
  assert.match(anomaly, /const framedState=camera\.getState\(\)/);
  assert.match(anomaly, /gateIsFramed\(framedState\)/);
});

test("cinematic sky overscan reuses authored sky and overlaps the main scene", () => {
  const farthest = html.indexOf('class="scene-world-layer scene-back scene-farthest-sky"');
  const overscan = html.indexOf('class="scene-object scene-back sga-cinematic-sky-overscan"');
  const starSky = html.indexOf('class="scene-world-layer scene-back scene-star-sky"');
  assert.ok(farthest >= 0 && overscan > farthest && starSky > overscan);
  assert.match(html, /sga-cinematic-sky-overscan[^>]*data-world-y="-480"[^>]*data-world-h="640"[^>]*>[\s\S]*?star-country-farthest-sky-background\.webp/);
  assert.match(anomaly, /CINEMATIC_SKY_OVERSCAN=Object\.freeze\(\{x:0,y:-480,w:1448,h:640\}\)/);
  const rule = css.match(/\.sga-cinematic-sky-overscan \{[\s\S]*?\n\}/)?.[0] || "";
  assert.doesNotMatch(rule, /background:\s*(?:radial|linear)-gradient/);
  assert.match(css, /\.sga-cinematic-sky-overscan > img[\s\S]*?object-fit:\s*cover/);
  assert.match(rule, /mask-image:\s*linear-gradient\(to bottom/);
  assert.match(rule, /transparent 100%/);
  assert.match(css, /#game-shell\.sga-sequence-active \.sga-cinematic-sky-overscan \{[\s\S]*?opacity:\s*1;[\s\S]*?visibility:\s*visible/);
});

test("gate inner light is fitted to the portal opening and is not squeezed during anomaly", () => {
  const preview = fs.readFileSync("scene-preview41-fix.js", "utf8");
  assert.match(preview, /const INNER_LIGHT_W = 224;/);
  assert.match(preview, /const INNER_LIGHT_H = 318;/);
  assert.doesNotMatch(css, /scaleX\(\.84\)/);
  assert.match(css, /@keyframes sgaGateSourceCharge/);
  assert.match(css, /@keyframes sgaGateSourceRelease/);
});

test("framed camera state must satisfy the immutable 80px overscan coverage contract", () => {
  assert.match(anomaly, /OVERSCAN_COVERAGE=Object\.freeze\(\{minimumTopSafety:80,mainSceneTop:0\}\)/);
  for (const field of ["origin?.y", "scale?.y", "camera?.zoom", "viewport?.height"])
    assert.ok(anomaly.includes(field), field);
  assert.match(anomaly, /const viewportTop=origin\.y\/scale\.y/);
  assert.match(anomaly, /const viewportBottom=\(origin\.y\+viewport\.height\/camera\.zoom\)\/scale\.y/);
  assert.match(anomaly, /topSafety>=OVERSCAN_COVERAGE\.minimumTopSafety/);
  assert.match(anomaly, /viewportBottom>=OVERSCAN_COVERAGE\.mainSceneTop/);
  assert.match(anomaly, /!gateIsFramed\(framedState\)\|\|!overscanCoversViewport\(framedState\)/);
  assert.match(anomaly, /throw new StarGateOverscanCoverageError\(\)/);
  assert.match(anomaly, /this\.name="StarGateOverscanCoverageError"/);
});

test("supported viewport matrix keeps at least 204px above the framed viewport", () => {
  const viewports = [[320, 568], [375, 812], [390, 844], [430, 932], [768, 1024], [1024, 768]];
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const origins = viewports.map(([width, height]) => {
    const normalZoom = clamp(Math.min(width / 620, height / 560), 1, 1.22);
    const fitZoom = Math.min((width - 28) / 560, (height - 28) / (210 - (-163.33333333333331)), normalZoom);
    const zoom = clamp(fitZoom, Math.min(.48, normalZoom), normalZoom);
    const renderedHeight = (210 - (-163.33333333333331)) * zoom;
    const topInset = clamp((height - renderedHeight) * .12, 14, Math.max(14, height * .12));
    return -163.33333333333331 - topInset / zoom;
  });
  const requiredTop = Math.min(...origins);
  const margin = requiredTop - (-480);
  assert.ok(Math.abs(requiredTop - (-275.78520653218055)) < 1e-9, requiredTop);
  assert.ok(margin >= 204, margin);
});

test("overscan preserves the authored cloud policy and anomaly timings", () => {
  assert.doesNotMatch(css, /\.scene-cloud-main/);
  assert.match(cloudCss, /\.scene-cloud-main-track\s*\{[\s\S]*?64s linear infinite !important/);
  assert.equal((html.match(/class="scene-cloud-copy"/g) || []).length, 3);
  for (const token of [
    "camera.frameBounds(GATE_BOUNDS,1550",
    "await pause(800)",
    'setGateState("sga-sky-descent");await pause(1050)',
    'setGateState("sga-normal-flow");await pause(1320)',
    'setGateState("sga-resonance-complete");await pause(700)',
    'setGateState("sga-anomaly-flicker");await pause(1180)',
    'setGateState("sga-anomaly");await pause(480)',
    'setGateState("sga-reverse-gate");await pause(1100)',
    'setGateState("sga-reverse-flow");await pause(1050)',
    'setGateState("sga-skyward-release");await pause(1050)',
    'setGateState("sga-anomaly-rest");await pause(500)',
    "camera.returnToPlayer(1350)",
  ]) assert.ok(anomaly.includes(token), token);
  assert.equal([...html.matchAll(/<circle data-order="[0-5]" cx="\d+" cy="\d+" r="45" \/>/g)].length, 10);
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
    'setGateState("sga-skyward-release")',
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


test("reverse energy grows from the gate into a dedicated skyward release before Shion POV return", () => {
  assert.match(html, /class="sga-energy-column"/);
  assert.match(css, /#game-shell\.sga-reverse-flow \.sga-energy-column[\s\S]*?sgaColumnRise/);
  assert.match(css, /#game-shell\.sga-skyward-release \.sga-energy-column[\s\S]*?sgaColumnRelease/);
  assert.match(css, /@keyframes sgaColumnRise/);
  assert.match(css, /@keyframes sgaColumnRelease/);
  const release = anomaly.indexOf('setGateState("sga-skyward-release")');
  const rest = anomaly.indexOf('setGateState("sga-anomaly-rest")');
  const cameraReturn = anomaly.indexOf("camera.returnToPlayer(1350)");
  const reaction = anomaly.indexOf('say("lumiere","……？")');
  assert.ok(release >= 0 && release < rest && rest < cameraReturn && cameraReturn < reaction);
});
