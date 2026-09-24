"use strict";
const fs=require("node:fs");
const test=require("node:test");
const assert=require("node:assert/strict");
const source=fs.readFileSync("star-gate-anomaly.js","utf8");
const css=fs.readFileSync("star-gate-anomaly.css","utf8");
const game=fs.readFileSync("game.js","utf8");

test("Future Fixation Stage 1 begins only after the locked camera return",()=>{
 const returned=source.indexOf("await camera.returnToPlayer(1350)");
 const fn=source.indexOf("async function futureFixationStage1()");
 assert.ok(returned>=0&&fn>returned);
 assert.match(source,/const FUTURE_STAGE1_DEV=DEV_MODE==="star-gate-full"/);
 assert.match(source,/if\(FUTURE_STAGE1_DEV\)\{await futureFixationStage1\(\);await futureFixationStage2\(\)\}/);
});

test("Stage 1 preserves Shion world position and uses dark, not white, interruption",()=>{
 assert.match(source,/Shion moved during Future Fixation Vision Stage 1/);
 assert.match(source,/samePoint\(before,after\)/);
 assert.match(css,/sga-future-blink-1/);
 assert.match(css,/background:#000/);
 assert.doesNotMatch(css,/sga-future-blackout[^}]*background:\s*white/i);
});

test("Stage 1 keeps the authored current-Shion dialogue and nonpersistent audio silence",()=>{
 for(const line of ["……？","なんだ……？","リュミエール……？","……ここは、どこだ？"])assert.ok(source.includes(line));
 assert.match(source,/setCinematicSilence\?\.\(true,200\)/);
 assert.match(source,/sga-future-world-hidden/);
});



test("Stage 2 uses a world-coordinate Vision layer and real camera tour",()=>{
 const stage2=source.slice(source.indexOf("async function futureFixationStage2"),source.indexOf("async function fadeNpc"));
 assert.match(stage2,/await vision\.begin\(ASSETS\.ruins\)/);
 assert.match(stage2,/vision\.setOpacity\(i\/20\)/);
 assert.match(stage2,/camera\.panTo\("gate",900,\{allowOverscan:false\}\)/);
 assert.match(stage2,/camera\.panTo\(\{x:430,y:500\},950,\{allowOverscan:false\}\)/);
 assert.match(stage2,/camera\.panTo\("fountain",950,\{allowOverscan:false\}\)/);
 assert.match(stage2,/camera\.returnToPlayer\(900\)/);
 assert.doesNotMatch(stage2,/sga-future-shot-/);
 assert.match(stage2,/Shion moved during Future Fixation Vision Stage 2/);
 for(const line of ["……星門庭園……？","いや……","そんなはず……","……どうして……"])assert.ok(stage2.includes(line));
});

test("Vision World renders against the garden reference world before actors",()=>{
 assert.match(game,/ctx\.drawImage\(visionWorld\.image, 0, 0, world\.w, world\.h\)/);
 assert.ok(game.indexOf("drawVisionWorld();") < game.indexOf("drawActors();"));
 assert.match(game,/window\.TarotVisionWorld = Object\.freeze/);
 assert.match(game,/visionWorld\.opacity = clamp/);
});

test("Actor visibility is enforced by the canvas renderer",()=>{
 assert.match(game,/if \(opacity <= 0\) continue/);
 assert.match(game,/target\.globalAlpha \*= opacity/);
 const stage2=source.slice(source.indexOf("async function futureFixationStage2"),source.indexOf("async function fadeNpc"));
 assert.match(stage2,/actorVisibility\?\.set\("shiopon",0\)/);
 assert.match(stage2,/actorVisibility\?\.set\("lumiere",0\)/);
 assert.doesNotMatch(css,/sga-future-ruins~\.scene-actor/);
});

test("Blackout releases before current Shion fades in",()=>{
 const stage1=source.slice(source.indexOf("async function futureFixationStage1"),source.indexOf("async function futureFixationStage2"));
 assert.ok(stage1.indexOf('classList.remove("sga-future-black")') < stage1.indexOf('vis.set("shion",i/12)'));
 assert.doesNotMatch(css,/sga-future-shion-only:not\(\.sga-future-ruins\) \.sga-future-blackout\{opacity:1\}/);
});

test("Stage 2 preserves scope and does not start Stage 3",()=>{
 assert.match(source,/await futureFixationStage1\(\);await futureFixationStage2\(\)/);
 assert.doesNotMatch(source,/await futureFixationStage3\(\)/);
});
