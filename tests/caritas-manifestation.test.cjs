"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const root=path.resolve(__dirname,"..");
const event=fs.readFileSync(path.join(root,"caritas-battle-event.js"),"utf8");
const css=fs.readFileSync(path.join(root,"caritas-battle-event.css"),"utf8");
const html=fs.readFileSync(path.join(root,"hoshisuna-main.html"),"utf8");

test("first invocation stays on the map and has an explicit ordered handoff",()=>{
 const start=event.slice(event.indexOf("function start(){"),event.indexOf("function setText("));
 const ordered=[
  'target:{x:1013,y:210}',
  'saySequence(INTRO,()=>',
  'target:"shiopon"',
  'stage("manifest-focus",850',
  'saySequence(INVOCATION,()=>',
  'stage("manifestation",3900',
  'story="manifested"',
  'saySequence(REVEAL,()=>',
  'battle=C.newGame()',
  'stage("engulfing",2600,beginBattle)'
 ];
 let at=-1;
 for(const needle of ordered){
  const next=start.indexOf(needle,at+1);
  assert.ok(next>at,"missing or out-of-order step: "+needle);at=next;
 }
 assert.match(event,/const INTRO=\[/);
 assert.match(event,/const INVOCATION=\[/);
 assert.match(event,/const REVEAL=\[/);
 assert.ok(!event.slice(event.indexOf("const INTRO=["),event.indexOf("const INVOCATION=")).includes("シオリエル！"),
  "Invocation must be its own dialogue phase");
});

test("Shiopon and Shioriel are staged as consecutive forms, not two units",()=>{
 assert.match(event,/shiopon_idle\.png/);
 assert.match(event,/battle\/shioriel-battle\.webp/);
 assert.match(css,/data-phase="manifestation"/);
 assert.match(css,/@keyframes cb-manifest-fox-yield/);
 assert.match(css,/@keyframes cb-manifest-reveal/);
 assert.match(css,/52%,100%\{opacity:0/);
 assert.match(css,/0%,51%\{opacity:0/);
 assert.match(css,/data-phase="manifested".*cb-manifest-shioriel/);
 assert.match(css,/prefers-reduced-motion:reduce/);
 assert.match(css,/pointer-events:none/);
});

test("separate Dev scene leaves the production shared dialogue and combat intact",()=>{
 assert.match(event,/window\.TarotDialogueUI\.create/);
 assert.match(event,/ids:\{layer:"dialogue-layer",advance:"dialogue-advance",speaker:"dialogue-speaker",text:"dialogue-text"\}/);
 assert.match(event,/if\(!location\.pathname\.endsWith\("\/hoshisuna-main\.html"\)\|\|params\.get\("dev"\)!=="hoshisuna"\)return;/);
 assert.match(html,/caritas-battle-event\.css\?v=caritas-manifestation-v01/);
 assert.match(html,/caritas-battle-event\.js\?v=caritas-manifestation-v01/);
 const snapshot=JSON.parse(fs.readFileSync(path.join(root,"event-contracts.json"),"utf8"));
 assert.equal(snapshot.events["hoshisuna-caritas"].segments["caritas-heart-resonance"],"NOT TESTED");
});
