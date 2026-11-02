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

test('stage 1 retains a fixed battle, status strip and command grid throughout dialogue',()=>{
 assert.match(event,/const statusBand=newEl\("div","cb-status-band"\)/);
 assert.match(event,/statusBand\.append\(hero\)/);
 assert.match(event,/arena\.prepend\(enemy\)/);
 assert.match(event,/frame\.append\(arena,statusBand,ctr\)/);
 assert.match(css,/v10 — STAGE 1 \/ FIXED COMBAT \+ HUD BAND \+ COMMAND FIELD/);
 const stage1=css.slice(css.indexOf('/* v10 — STAGE 1'));
 assert.match(stage1,/grid-template-areas:"battle" "status" "command"!important/);
 assert.match(stage1,/grid-template-rows:minmax\(0,1fr\) clamp\(60px,8dvh,70px\) clamp\(225px,40dvh,350px\)!important/);
 assert.match(stage1,/transform:none!important;transition:none!important/);
 assert.match(stage1,/\.cb-status-band/);
 assert.match(stage1,/background:url\('\.\/assets\/events\/hoshisuna\/battle\/cave-bg\.webp'\) center 56% \/ cover no-repeat!important/);
 assert.match(stage1,/#game-shell:has\(#caritas-event:not\(\[hidden\]\)\[data-phase="battle"\]\[data-dialogue-busy="true"\]\) #dialogue-layer/);
 assert.match(stage1,/\[data-composing="true"\] \.cb-frame/);
 assert.doesNotMatch(event,/frameCaritasDialogue|dialogueStageShift|lastReadingStageHeight|--cb-dialogue-stage-shift|--cb-dialogue-stage-height/);
 assert.match(shared,/\.tb-dialogue-layer \{/);
 assert.match(event,/layer:document\.getElementById\("dialogue-layer"\)/);
 assert.doesNotMatch(scene,/caritasConversationCamera|updateCaritasConversationCamera/);
});
