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
 assert.match(game,/const VISION_REGISTRATION = Object\.freeze/);
 assert.match(game,/scale: 1\.27/);
 assert.match(game,/offsetX: -111/);
 assert.match(game,/offsetY: -280/);
 assert.match(game,/r\.offsetX \* scale\.x/);
 assert.match(game,/world\.w \* r\.scale/);
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

test("Stage 1 Shion orientation is front-left-right-front without movement",()=>{
 const stage1=source.slice(source.indexOf("async function futureFixationStage1"),source.indexOf("async function futureFixationStage2"));
 assert.match(stage1,/const face=\(dx,dy\)=>stage\.perform\(\{type:"face",actor:"shion",target:\{x:before\.x\+dx,y:before\.y\+dy\}\}\)/);
 const front1=stage1.indexOf("face(0,1)");
 const line=stage1.indexOf('await say("shion","……？")');
 const left=stage1.indexOf("face(-1,0)");
 const right=stage1.indexOf("face(1,0)");
 const front2=stage1.indexOf("face(0,1)",front1+1);
 assert.ok(front1>=0&&front1<line&&line<left&&left<right&&right<front2);
 assert.doesNotMatch(stage1,/type:"move"|type:"step"|type:"approach"/);
});

test("Vision registration is immutable and covers the full reference world",()=>{
 const match=game.match(/const VISION_REGISTRATION = Object\.freeze\(\{[\s\S]*?scale: ([\d.]+),[\s\S]*?offsetX: (-?[\d.]+),[\s\S]*?offsetY: (-?[\d.]+)/);
 assert.ok(match);
 const s=Number(match[1]),x=Number(match[2]),y=Number(match[3]);
 assert.ok(x<=0&&y<=0);
 assert.ok(x+1448*s>=1448);
 assert.ok(y+1086*s>=1086);
 assert.equal((game.match(/VISION_REGISTRATION\s*=/g)||[]).length,1);
});
