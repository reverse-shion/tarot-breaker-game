/* Isolated Caritas combat-framing regression. Never change the main map. */
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const dir=path.join(__dirname,'..');
const read=name=>fs.readFileSync(path.join(dir,name),'utf8');
const scene=read('hoshisuna-main-game.js');
const canonical=read('game.js');
const event=read('caritas-battle-event.js');
const css=read('caritas-resonance-ux.css');
const shared=read('shared-dialogue.css');

test('only the battle UI receives the raised composition, not the map camera',()=>{
 assert.match(css,/v8: battle-only upper composition/);
 assert.match(css,/#caritas-event \.cb-shion-sprite\{bottom:18\.2%;\}/);
 assert.match(css,/#caritas-event \.cb-angel\{bottom:18%;\}/);
 assert.match(css,/#caritas-event \.cb-release\{top:12%;\}/);
 assert.match(css,/#caritas-event\[data-dark-cleared\] \.cb-abyss\{[\s\S]*?top:16%;/);
 assert.doesNotMatch(scene,/caritasConversationCamera|updateCaritasConversationCamera/);
 assert.match(scene,/const DRAW_HEIGHT = 78/);
 assert.match(scene,/const SHIOPON_DRAW_HEIGHT = 76/);
});

test('dialogue leaves combat grid and original figure dimensions intact',()=>{
 assert.match(event,/function frameCaritasDialogue\(\)/);
 assert.match(event,/dialogue\.elements\.button\.getBoundingClientRect/);
 assert.match(event,/const figures=\["\.cb-beast","\.cb-shion-sprite","\.cb-angel"\]/);
 assert.match(event,/--cb-dialogue-stage-shift/);
 assert.match(css,/v9 — Dialogue belongs OVER the unscaled combat stage/);
 assert.match(css,/transform:translate3d\(0,var\(--cb-dialogue-stage-shift,0px\),0\)/);
 assert.match(css,/display:grid!important;\s*height:100dvh;max-height:100dvh;/);
 assert.match(css,/#caritas-event\[data-dialogue-busy="true"\] \.cb-frame>\.cb-hud\{\s*display:grid!important;visibility:hidden!important/);
 assert.match(shared,/\.tb-dialogue-layer \{/);
 assert.match(event,/layer:document\.getElementById\("dialogue-layer"\)/);
 // No battle art dimensions, backgrounds, shared dialogue CSS, or map moved.
 const talk=css.slice(css.indexOf('/* v9 — Dialogue'));
 assert.doesNotMatch(talk,/transform:scale\(|\bzoom\s*:/);
 assert.doesNotMatch(scene,/caritasConversationCamera|updateCaritasConversationCamera/);
});