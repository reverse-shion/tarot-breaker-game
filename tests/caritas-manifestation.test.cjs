"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const root=path.resolve(__dirname,"..");
const event=fs.readFileSync(path.join(root,"caritas-battle-event.js"),"utf8");
const css=fs.readFileSync(path.join(root,"caritas-battle-event.css"),"utf8");
const game=fs.readFileSync(path.join(root,"hoshisuna-main-game.js"),"utf8");
const html=fs.readFileSync(path.join(root,"hoshisuna-main.html"),"utf8");
test("actual map follower steps ahead, faces camera and then manifests before combat",()=>{
 const start=event.slice(event.indexOf("function start(){"),event.indexOf("function setText("));
 const seq=['saySequence(attempts>0?INTRO.slice(-1):INTRO,()=>','saySequence(SHIOPON_REPLY,()=>','manifestation.moveForward()', 'manifestation.faceFront()','saySequence(INVOCATION,()=>','manifestation.begin()','stage("manifestation",3900','manifestation.reveal()','saySequence(REVEAL,()=>','root.hidden=false','stage("engulfing",2600,beginBattle)'];
 // Walking is started while Shiopon's spoken reply is visible (parallel actions).
 assert.ok(start.includes(seq[0]));
 assert.ok(start.includes(seq[1]));
 assert.ok(start.includes(seq[2]));
 for(const v of seq.slice(3))assert.ok(start.includes(v),"missing ordered step "+v);
 assert.match(event,/const SHIOPON_REPLY=\[\["しおぽん","はい、シオンさん。"\]\]/);
 assert.match(event,/タロット展開。いくぞ、しおぽん。/);
 assert.match(event,/speaker==="しおぽん"\?"shiopon"/);
 assert.ok(start.indexOf("saySequence(INVOCATION,()=>")<start.indexOf("stage(\"manifestation\",3900"));
 assert.ok(start.indexOf("saySequence(REVEAL,()=>")<start.indexOf("root.hidden=false"));
});
test("one real world actor uses approved atlas and preserves foot position",()=>{
 assert.match(game,/TarotHoshisunaManifestation=Object\.freeze/);
 assert.match(game,/caritasShiorielAtlas=image/);
 assert.match(game,/\.\/assets\/sprites\/shioriel\/shioriel-four-directions\.webp/);
 assert.match(game,/image\.naturalWidth\/2,sh=image\.naturalHeight\/2/);
 assert.match(game,/drawCaritasInvocation\(entry\.actor\)/);
 assert.match(game,/if\s*\(hoshisunaIsolated\s*&&\s*caritasInvocation\.locked\)/);
 assert.match(game,/performStageCommand\(\{type:"move",actor:"shiopon",target:spot,duration:780\}\)/);
 assert.match(game,/shiopon\.dir="down"/);
 assert.match(game,/if\(!collision\.isWalkable\(candidate\.x,candidate\.y\)/);
 const asset=path.join(root,"assets/sprites/shioriel/shioriel-four-directions.webp");
 assert.ok(fs.existsSync(asset),"Approved official sprite atlas must be copied into branch");
 const b=fs.readFileSync(asset);
 assert.equal(b.subarray(0,4).toString(),"RIFF");
 assert.equal(b.subarray(8,12).toString(),"WEBP");
 assert.doesNotMatch(event,/cb-manifest-fox|cb-manifest-shioriel/);
 assert.doesNotMatch(css,/cb-manifest-fox|cb-manifest-shioriel/);
});
test("visible world-anchored starlight has colour, scale and non-strobing echoes",()=>{
 const draw=game.slice(game.indexOf("function drawCaritasInvocation(actor)"),
                       game.indexOf("function drawActors()"));
 assert.match(draw,/const echoes=\[\.18,\.43,\.69\]/,
  "three soft invocation pulses");
 assert.match(draw,/const palettes=\[\[211,152,255\],\[131,177,255\],\[255,220,155\]\]/,
  "violet, azure and star gold rather than white-only");
 assert.match(draw,/for\(let ring=0;ring<3;ring\+\+\)/,
  "three visible light rings");
 assert.match(draw,/for\(let k=0;k<24;k\+\+\)/,
  "star motes are readable on small screens");
 assert.match(draw,/ctx\.scale\(\.70,1\.20\)/,
  "soft broad violet-blue column surrounds the real actor");
 assert.match(draw,/const height=96\*/,
  "Shioriel is reduced by about nine percent from the former 105 world pixels");
 assert.doesNotMatch(draw,/fillStyle\s*=\s*["']#fff/i,
  "no full-screen white frame/flash");
});
test("returning fade resets Shiopon BEFORE the battle overlay is hidden",()=>{
 const ending=event.slice(event.indexOf("function beginEnding()"),event.indexOf("const newEl="));
 assert.match(ending,/TarotHoshisunaManifestation\?\.clear\?\.\(\);\s*stage\("returning",900,finish\)/);
 const finish=event.slice(event.indexOf("function finish(){"),event.indexOf("function init(){"));
 assert.ok(finish.indexOf("TarotHoshisunaManifestation?.clear?.()")>=0);
 assert.ok(finish.indexOf("TarotHoshisunaManifestation?.clear?.()")<finish.indexOf("root.hidden=true"),
  "must restore actor before revealing the original map canvas");
 const clear=game.slice(game.indexOf('    clear(){'),game.indexOf('    getState:()=>({phase:caritasInvocation.phase'));
 for(const reset of [
  'caritasInvocation.phase="idle"',
  'caritasInvocation.locked=false',
  'caritasInvocation.elapsed=0',
  'caritasInvocation.paused=false',
  'caritasInvocation.since=0',
  'shiopon.frame=0',
  'shiopon.followRoute=[]'
 ])assert.ok(clear.includes(reset),"incomplete return reset: "+reset);
 assert.match(clear,/faceShioponTowardPlayer\(\)/);
});
test("isolated main dialogue, combat and device cache retained",()=>{
 assert.match(event,/window\.TarotDialogueUI\.create/);
 assert.match(event,/ids:\{layer:"dialogue-layer",advance:"dialogue-advance",speaker:"dialogue-speaker",text:"dialogue-text"\}/);
 assert.match(event,/if\(!location\.pathname\.endsWith\("\/hoshisuna-main\.html"\)\|\|params\.get\("dev"\)!=="hoshisuna"\)return;/);
 assert.match(html,/caritas-battle-event\.css\?v=resonance-special-v15/);
 assert.match(html,/hoshisuna-main-game\.js\?v=caritas-owner-transformation-scaled-v2/);
 assert.match(html,/caritas-battle-core\.js\?v=written-reward-v1-20261029/);
 assert.match(html,/caritas-battle-event\.js\?v=resonance-special-v15/);
 const contract=JSON.parse(fs.readFileSync(path.join(root,"event-contracts.json"),"utf8"));
 assert.equal(contract.events["hoshisuna-caritas"].segments["caritas-heart-resonance"],"NOT TESTED");
});

test("pixel manifestation derives fragments and light silhouette from the official sprite images",()=>{
 const section=game.slice(game.indexOf("function prepareCaritasPixelManifestation()"),
                          game.indexOf("function drawActors()"));
 assert.match(section,/shioponImages\.idle\s*\|\|\s*shioponImages\.down/);
 assert.match(section,/caritasShiorielAtlas\.naturalWidth\/2/);
 assert.match(section,/getImageData\(0,0,96,128\)/);
 assert.match(section,/paintCaritasPixelFragments\(actor,t\)/);
 assert.match(section,/ctx\.drawImage\(fx\.source,f\.sx,f\.sy,f\.sw,f\.sh/);
 assert.match(section,/paintCaritasWingUnfold\(x,y,height,t\)/);
 assert.match(section,/fx\.silhouette/);
 assert.match(section,/\.rect\(x-100,shioTop-12,200,/);
 assert.match(section,/ctx\.clip\(\)/);
 assert.match(section,/if\(phase==="charging"&&t>\.83&&t<\.98\)/);
 assert.doesNotMatch(section,/new Image\(|\.src\s*=|fetch\(/);
});
test("manifestation is isolated, pauseable and cleans sprite particle resources on map return",()=>{
 const api=game.slice(game.indexOf('if (hoshisunaIsolated) window.TarotHoshisunaManifestation=Object.freeze'));
 assert.match(api,/caritasInvocation\.fx=caritasOwnerTransformationAtlas\?null:prepareCaritasPixelManifestation\(\)/);
 assert.match(api,/caritasInvocation\.fx=null/);
 assert.match(api,/pixelFragments:caritasInvocation\.fx\?\.fragments\.length/);
 assert.match(api,/caritasInvocation\.paused=document\.hidden/);
 assert.match(html,/hoshisuna-main-game\.js\?v=caritas-owner-transformation-scaled-v2/);
});

test("light cocoon and pixel wings maintain in-map continuity, character art intact",()=>{
 const drawing=game.slice(game.indexOf("function paintCaritasStarlightCocoon("),
                          game.indexOf("function drawActors()"));
 assert.match(drawing,/function paintCaritasStarlightCocoon\(x,y,t\)/);
 assert.match(drawing,/if\(phase==="charging"\)paintCaritasStarlightCocoon\(x,y,t\)/);
 assert.match(drawing,/ctx\.imageSmoothingEnabled=false/);
 assert.match(drawing,/Luminous pixel tiles fan outward/);
 assert.match(drawing,/stageOffsetY; do not apply the stage offset twice/);
 assert.match(drawing,/const formed=phase==="revealed"\?1:/);
 assert.match(drawing,/const revealEase=formed\*formed\*\(3-2\*formed\)/);
 assert.match(drawing,/ctx\.rect\(left-3,top\+height-visibleHeight-3,width\+6,visibleHeight\+8\)/);
 assert.match(drawing,/ctx\.drawImage\(image,0,0,sw,sh,left,top,width,height\)/);
 assert.doesNotMatch(drawing,/new Image\(|\.src\s*=|fetch\(/);
});

test("owner-supplied 12-frame WebP replaces the old manifestation, remains world-anchored",()=>{
 const asset=path.join(root,"assets/events/hoshisuna/battle/shiopon-shioriel-transformation-atlas.webp");
 assert.ok(fs.existsSync(asset),"Owner's transparent transformation atlas must be committed");
 const header=fs.readFileSync(asset);
 assert.equal(header.subarray(0,4).toString(),"RIFF");
 assert.equal(header.subarray(8,12).toString(),"WEBP");
 assert.match(game,/const CARITAS_OWNER_TILE = 160/);
 assert.match(game,/Object\.freeze\(\[700,150,140,150,160,220,200,150,160,160,220,1500\]\)/);
 assert.match(game,/function drawCaritasOwnerTransformation\(actor,phase,t\)/);
 assert.match(game,/const elapsed=phase==="revealed"\?3910:Math\.min\(3900,/);
 assert.match(game,/ctx\.drawImage\(image,\(frame%4\)\*CARITAS_OWNER_TILE,/);
 assert.match(game,/const x=actor\.x,y=actor\.y\+actor\.stageOffsetY\+actor\.visualOffsetY/);
 assert.match(game,/if\(caritasOwnerTransformationAtlas\)return drawCaritasOwnerTransformation\(actor,phase,t\)/);
 assert.match(game,/caritasOwnerTransformationAtlas=image/);
 assert.match(game,/ownerAnimationReady:!!caritasOwnerTransformationAtlas/);
 assert.match(game,/\[Caritas\] owner transformation unavailable/);
 assert.match(html,/caritas-owner-transformation-scaled-v2/);
});

test("owner transformation keeps native Shiopon body height and finishes at Shion body height",()=>{
 const section=game.slice(game.indexOf("function measureCaritasVisibleMapActor("),
                          game.indexOf("function drawCaritasInvocation(actor)"));
 assert.match(section,/getImageData\(0,0,96,128\)/);
 assert.match(section,/SHIOPON_DRAW_HEIGHT\)/);
 assert.match(section,/DRAW_HEIGHT\)/);
 assert.match(section,/const bodyHeight=scale\.shioponHeight\*\(1-blend\)\+scale\.shionHeight\*blend/);
 assert.match(section,/const sourceBodyHeight=109\*\(1-blend\)\+133\*blend/);
 assert.match(section,/const height=CARITAS_OWNER_TILE\*bodyHeight\/sourceBodyHeight/);
 assert.match(section,/feetY-145\*height\/CARITAS_OWNER_TILE/);
 assert.doesNotMatch(section,/const height=112,width=112/);
 assert.match(html,/caritas-owner-transformation-scaled-v2/);
});
