"use strict";
const fs=require("node:fs");
const test=require("node:test");
const assert=require("node:assert/strict");
const source=fs.readFileSync("star-gate-anomaly.js","utf8");
const css=fs.readFileSync("star-gate-anomaly.css","utf8");

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


test("Stage 2 reveals the authored ruins and tours gate, left map and fountain without moving Shion",()=>{
 assert.match(source,/async function futureFixationStage2\(\)/);
 assert.match(source,/v\.classList\.add\("visible"\)/);
 for(const line of ["……星門庭園……？","いや……","そんなはず……","……どうして……"])assert.ok(source.includes(line));
 for(const shot of ["sga-future-shot-gate","sga-future-shot-left","sga-future-shot-fountain","sga-future-shot-return"])assert.ok(source.includes(shot));
 assert.match(source,/Shion moved during Future Fixation Vision Stage 2/);
 assert.match(source,/await futureFixationStage1\(\);await futureFixationStage2\(\)/);
 assert.match(css,/sga-future-ruins/);
});


test("Stage 2 clears the Stage 1 blackout so ruins are visible",()=>{
 assert.match(css,/sga-future-shion-only:not\(.sga-future-ruins\) \.sga-future-blackout\{opacity:1\}/);
 assert.match(css,/sga-future-ruins \.sga-future-blackout\{opacity:0;pointer-events:none\}/);
});


test("Stage 2 keeps NPC actors suppressed while ruins reveal",()=>{
 assert.match(css,/sga-future-ruins~\\.scene-actor:not\\(\\[data-actor="shion"\\]\\)\\{opacity:0 !important\\}/);
 assert.match(source,/set\\("shiopon",0\\)/);
 assert.match(source,/set\\("lumiere",0\\)/);
});
