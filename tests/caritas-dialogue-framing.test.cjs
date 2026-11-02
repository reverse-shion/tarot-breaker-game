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

test('battle dialogue uses original-size battlefield and shared dialogue rather than scaling characters',()=>{
 assert.match(event,/const stageHeight=ui\.arena\.getBoundingClientRect\?\.\(\)\.height/);
 assert.match(event,/--cb-dialogue-stage-height/);
 assert.match(css,/flex:0 0 min\(var\(--cb-dialogue-stage-height,34dvh\),calc\(100dvh - var\(--cb-dialogue-space\)\)\)/);
 assert.match(shared,/\.tb-dialogue-layer \{/);
 assert.match(event,/layer:document\.getElementById\("dialogue-layer"\)/);
 assert.doesNotMatch(css,/v8:[^]*?(?:transform:scale\(|zoom:)/);
});