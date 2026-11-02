/* Caritas dialogue framing: protects original pixel size and main shared dialogue. */
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
const game=read('hoshisuna-main-game.js');
const event=read('caritas-battle-event.js');
const css=read('caritas-resonance-ux.css');
const shared=read('shared-dialogue.css');

test('map dialogue shifts only the Starroad camera; no actor or world scaling changes',()=>{
 const camera=game.slice(game.indexOf('function updateCamera(dt) {'),game.indexOf('function viewportOrigin()'));
 assert.match(camera,/hoshisunaIsolated && caritasConversationCamera/);
 assert.match(camera,/const caritasTop = 166\.6 \* scale\.y/);
 assert.match(camera,/const preferredOrigin = Math\.max\(0, player\.y - viewH \* 0\.29\)/);
 assert.match(camera,/followY = halfH \+ Math\.min\(safeOrigin, preferredOrigin\)/);
 const scoped=camera.slice(camera.indexOf('if (hoshisunaIsolated && caritasConversationCamera)'),camera.indexOf('const targetY = clamp('));
 assert.doesNotMatch(scoped,/camera\.zoom\s*=|DRAW_HEIGHT\s*=|SHIOPON_DRAW_HEIGHT\s*=/);
 assert.match(game,/if \(hoshisunaIsolated\) caritasConversationCamera = true;/);
 assert.match(game,/if \(hoshisunaIsolated\) caritasConversationCamera = false;/);
 assert.match(game,/const DRAW_HEIGHT = 78/);
 assert.match(game,/const SHIOPON_DRAW_HEIGHT = 76/);
});

test('upper-screen composition keeps Shion and Caritas above the bottom shared dialogue',()=>{
 const viewH=844,playerY=305,beastTop=166.6;
 const safe=Math.max(0,beastTop-Math.min(96,viewH*.13));
 const preferred=Math.max(0,playerY-viewH*.29);
 const origin=Math.min(safe,preferred);
 assert.ok(playerY-origin < viewH*.33,'Shion should remain in the upper third');
 assert.ok(beastTop-origin >= 40,'Caritas head must not be cropped');
 assert.ok(origin>0,'map background framing should actually change');
});

test('battle shared-dialogue reservation never shrinks actor-stage dimensions',()=>{
 assert.match(event,/const stageHeight=ui\.arena\.getBoundingClientRect\?\.\(\)\.height/);
 assert.match(event,/--cb-dialogue-stage-height/);
 assert.match(css,/flex:0 0 min\(var\(--cb-dialogue-stage-height,34dvh\),calc\(100dvh - var\(--cb-dialogue-space\)\)\)/);
 assert.doesNotMatch(css,/\.cb-angel\s*\{[^}]*transform:\s*scale\(/);
 assert.match(shared,/\.tb-dialogue-layer \{/);
 assert.match(event,/layer:document\.getElementById\("dialogue-layer"\)/);
});