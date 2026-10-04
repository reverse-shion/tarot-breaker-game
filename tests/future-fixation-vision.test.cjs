"use strict";
const fs=require("node:fs");
const test=require("node:test");
const assert=require("node:assert/strict");
const vm=require("node:vm");
const source=fs.readFileSync("star-gate-anomaly.js","utf8");
const css=fs.readFileSync("star-gate-anomaly.css","utf8");
const game=fs.readFileSync("game.js","utf8");

test("Future Fixation Stage 1 begins only after the locked camera return",()=>{
 const returned=source.indexOf("await camera.returnToPlayer(1350)");
 const fn=source.indexOf("async function futureFixationStage1()");
 assert.ok(returned>=0&&fn>returned);
 assert.match(source,/const FUTURE_STAGE1_DEV=DEV_MODE==="star-gate-full"/);
 const devChain=source.match(/if\(FUTURE_STAGE1_DEV\)\{([^}]*)\}return;/)?.[1]||"";
 assert.match(devChain,/^await futureFixationStage1\(\);await futureFixationStage2\(\);await futureFixationStage3\(\)$/);
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
 assert.match(stage2,/const progress=i\/20;[\s\S]*?vision\.setOpacity\(progress\)/);
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
 assert.match(game,/scale: 1[.]10/);
 assert.match(game,/offsetX: -72/);
 assert.match(game,/offsetY: -330/);
 assert.match(game,/r\.offsetX \* scale\.x/);
 assert.match(game,/world\.w \* r\.scale/);
 assert.ok(game.indexOf("drawVisionWorld();") < game.indexOf("drawActors();"));
 assert.match(game,/window\.TarotVisionWorld = Object\.freeze/);
 assert.match(game,/visionWorld\.opacity = clamp/);
});

test("Actor visibility is enforced by the final canvas composite",()=>{
 const effects=fs.readFileSync("scene-effects.js","utf8");
 assert.match(game,/if \(opacity <= 0\) continue/);
 assert.match(game,/drawMaskedActor\(ctx, entry\.actor, scale,[\s\S]*?paint, opacity\)/);
 assert.match(game,/ctx\.save\(\); ctx\.globalAlpha \*= opacity;[\s\S]*?paint\(ctx\)/);
 assert.match(effects,/function drawMaskedActor\(ctx,actor,scale,density,draw,opacity=1\)/);
 assert.match(effects,/draw\(paint\);[\s\S]*?ctx\.save\(\);ctx\.globalAlpha\*=Math\.max\(0,Math\.min\(1,Number\(opacity\)\|\|0\)\);ctx\.drawImage\(actorSurface/);
 assert.equal((effects.match(/ctx\.globalAlpha\*=Math\.max\(0,Math\.min\(1,Number\(opacity\)\|\|0\)\)/g)||[]).length,1);
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

test("Current Shion fades with the ruins reveal, not Future Shion arrival",()=>{
 const stage2=source.slice(source.indexOf("async function futureFixationStage2"),source.indexOf("async function futureFixationStage3"));
 const reveal=stage2.indexOf("vision.setOpacity(progress)");
 const fade=stage2.indexOf('actorVisibility?.set("shion",1-(1-FUTURE_VISION_CURRENT_SHION_OPACITY)*progress)');
 assert.ok(reveal>=0&&fade>reveal);
 assert.match(stage2,/for\(let i=1;i<=20;i\+\+\)\{[\s\S]*?vision\.setOpacity\(progress\);[\s\S]*?actorVisibility\?\.set\("shion",1-\(1-FUTURE_VISION_CURRENT_SHION_OPACITY\)\*progress\);[\s\S]*?await pause\(850\/20\)/);
});

test("Stage 2 remains isolated and Stage 3 starts only after Stage 2 returns",()=>{
 const stage2=source.slice(source.indexOf("async function futureFixationStage2"),source.indexOf("async function futureFixationStage3"));
 assert.doesNotMatch(stage2,/futureFixationStage3\(/);
 const run=source.slice(source.indexOf("async function run()"));
 const s1=run.indexOf("await futureFixationStage1()");
 const s2=run.indexOf("await futureFixationStage2()");
 const s3=run.indexOf("await futureFixationStage3()");
 assert.ok(s1>=0&&s1<s2&&s2<s3);
 assert.equal((run.match(/await futureFixationStage3\(\)/g)||[]).length,1);
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

test("Vision registration is immutable; reachable cinematic coverage is guarded per shot",()=>{
 const match=game.match(/const VISION_REGISTRATION = Object\.freeze\(\{[\s\S]*?scale: ([\d.]+),[\s\S]*?offsetX: (-?[\d.]+),[\s\S]*?offsetY: (-?[\d.]+)/);
 assert.ok(match);
 const s=Number(match[1]),x=Number(match[2]),y=Number(match[3]);
 assert.ok(s>0&&x<=0&&y<=0);
 assert.equal((game.match(/VISION_REGISTRATION\s*=/g)||[]).length,1);
});

test("Stage 2 camera tour guards every shot against world-edge exposure",()=>{
 const stage2=source.slice(source.indexOf("async function futureFixationStage2"),source.indexOf("async function fadeNpc"));
 assert.match(game,/isViewportInsideWorld\(\)/);
 assert.match(stage2,/camera\.isViewportInsideWorld\?\.\(\)===false/);
 for(const shot of ["gate","left","fountain","return"]) assert.match(stage2,new RegExp('verifyCoverage\\("'+shot+'"\\)'));
 assert.doesNotMatch(stage2,/allowOverscan:true/);
});


test("Stage 3 keeps current Shion translucent and moves Future Shion left toward the stair centre",()=>{
 const stage3=source.slice(source.indexOf("async function futureFixationStage3"),source.indexOf("async function fadeNpc"));
 assert.match(source,/const FUTURE_VISION_CURRENT_SHION_OPACITY=\.55/);
 const stage2=source.slice(source.indexOf("async function futureFixationStage2"),source.indexOf("async function futureFixationStage3"));
 assert.match(stage2,/actorVisibility\?\.set\("shion",1-\(1-FUTURE_VISION_CURRENT_SHION_OPACITY\)\*progress\)/);
 assert.match(stage3,/opacity drifted before Future Fixation Vision Stage 3/);
 assert.doesNotMatch(stage3,/set\("shion",FUTURE_VISION_CURRENT_SHION_OPACITY\)/);
 assert.doesNotMatch(stage3,/vis\?\.set\("shion",0\)/);
 assert.match(source,/TarotActorScreenAnchor\?\.get\?\.\("shion"\)/);
 assert.match(source,/const FUTURE_SHION_OFFSET_X=-1\.15/);
 assert.match(source,/const FUTURE_SHION_OFFSET_Y=\.30/);
 assert.match(source,/anchor\.x\+anchor\.width\*FUTURE_SHION_OFFSET_X-targetWidth\/2/);
 assert.match(source,/const futureFeetY=stage3\?anchor\.feetY\+anchor\.height\*FUTURE_SHION_OFFSET_Y:anchor\.feetY/);
 assert.match(source,/futureFeetY-targetHeight/);
 assert.match(source,/const FUTURE_SHION_VISUAL_SCALE=\.86/);
 assert.match(source,/const targetHeight=anchor\.height\*FUTURE_SHION_VISUAL_SCALE/);
 assert.match(source,/el\.naturalWidth\/el\.naturalHeight/);
 assert.match(source,/el\.style\.height=targetHeight\+"px"/);
 assert.match(source,/el\.style\.width=ratio\?targetHeight\*ratio\+"px":"auto"/);
 assert.doesNotMatch(source,/el\.style\.width=anchor\.width\+"px"/);
 assert.doesNotMatch(css,/\.sga-shion \{[^}]*left:50%[^}]*bottom:14%/s);
 assert.doesNotMatch(css,/\.sga-shion \{[^}]*clamp\(54px,11vw,82px\)/s);
 assert.match(game,/window\.TarotActorScreenAnchor = Object\.freeze/);
});

test("Actor visibility is owned by the single final scene composite",()=>{
 const effects=fs.readFileSync("scene-effects.js","utf8");
 assert.match(game,/drawMaskedActor\(ctx, entry\.actor, scale,[\s\S]*?paint, opacity\)/);
 assert.doesNotMatch(game,/const paintWithVisibility/);
 assert.match(effects,/function drawMaskedActor\(ctx,actor,scale,density,draw,opacity=1\)/);
 assert.match(effects,/ctx\.globalAlpha\*=Math\.max\(0,Math\.min\(1,Number\(opacity\)\|\|0\)\)/);
 assert.ok(effects.indexOf("draw(paint)") < effects.indexOf("ctx.globalAlpha*=Math.max"));
 assert.equal((effects.match(/ctx\.globalAlpha\*=Math\.max\(0,Math\.min\(1,Number\(opacity\)\|\|0\)\)/g)||[]).length,1);
});

test("Future Shion keeps its feet and aspect ratio across poses and scaled anchors",()=>{
 const align=source.slice(source.indexOf("const FUTURE_SHION_VISUAL_SCALE"),source.indexOf("function gateShell"));
 for(const anchor of [{x:195,feetY:350,width:64,height:80},{x:320,feetY:450,width:96,height:120}]){
  const classes=new Set();
  const el={style:{},complete:true,naturalWidth:512,naturalHeight:512,classList:{add:n=>classes.add(n)}};
  const context={root:{querySelector:()=>el,classList:{contains:()=>true}},window:{TarotActorScreenAnchor:{get:id=>{assert.equal(id,"shion");return anchor}}},ASSETS:{shion:["reach1","draw","check","raise","reach5"]}};
  vm.createContext(context);vm.runInContext(align,context);
  for(let n=1;n<=5;n++){
   vm.runInContext(`setShion(${n})`,context);
   const height=parseFloat(el.style.height),width=parseFloat(el.style.width),left=parseFloat(el.style.left),top=parseFloat(el.style.top);
   assert.equal(el.src,context.ASSETS.shion[n-1]);
   assert.equal(height,anchor.height*.86);
   assert.equal(width/height,el.naturalWidth/el.naturalHeight);
   assert.ok(Math.abs(top+height-(anchor.feetY+anchor.height*.30))<1e-9);
   assert.ok(Math.abs(left+width/2-(anchor.x+anchor.width*-1.15))<1e-9);
  }
  el.complete=false;let onload;
  el.addEventListener=(name,cb,options)=>{assert.equal(name,"load");assert.equal(options.once,true);onload=cb};
  vm.runInContext("setShion(1)",context);
  el.naturalWidth=256;el.naturalHeight=512;onload();
  assert.equal(parseFloat(el.style.width)/parseFloat(el.style.height),.5);
  assert.ok(Math.abs(parseFloat(el.style.top)+parseFloat(el.style.height)-(anchor.feetY+anchor.height*.30))<1e-9);
  // The shared pose helper must preserve the legacy event's horizontal layout.
  context.root.classList.contains=()=>false;el.complete=true;
  vm.runInContext("setShion(1)",context);
  assert.equal(parseFloat(el.style.left),anchor.x+anchor.width/2+Math.max(10,anchor.width*.28));
  assert.ok(Math.abs(parseFloat(el.style.top)+parseFloat(el.style.height)-anchor.feetY)<1e-9);
 }
});

test("Dual-presence composition does not alter approved ruins registration",()=>{
 assert.match(game,/scale: 1[.]10/);
 assert.match(game,/offsetX: -72/);
 assert.match(game,/offsetY: -330/);
});

test("Stage 3 v1.6 makes Arcana surge visibly precede Shion reaction and forced raise",()=>{
 const stage3=source.slice(source.indexOf("async function futureFixationStage3"),source.indexOf("async function fadeNpc"));
 const check=stage3.indexOf('await say("shion","……アルカナが……？")');
 const surgePos=stage3.indexOf("positionArcanaSurgeFromPose03()",check);
 const surge=stage3.indexOf('root.classList.add("sga-arcana-surge")',surgePos);
 const lead=stage3.indexOf("await pause(180)",surge);
 const jolt=stage3.indexOf('root.classList.add("sga-forced-raise-jolt")',lead);
 const breath=stage3.indexOf('await say("shion","……っ")',jolt);
 const raise=stage3.indexOf("crossfadeFutureShion(4,100,{liftOld:true})",breath);
 assert.ok(check>=0&&check<surgePos&&surgePos<surge&&surge<lead&&lead<jolt&&jolt<breath&&breath<raise);
 assert.doesNotMatch(stage3,/アルカナが……どうなっているんだ/);
 assert.doesNotMatch(stage3,/アルカナよ|答えてくれ/);
});

test("Stage 3 v1.6 surge is effect-only and never introduces a second card during pose 03",()=>{
 const mount=source.slice(source.indexOf("root.innerHTML="),source.indexOf("document.getElementById",source.indexOf("root.innerHTML=")));
 assert.match(mount,/class="sga-card-surge" aria-hidden="true"/);
 assert.doesNotMatch(mount,/sga-card-surge[^>]*><img/);
 assert.match(source,/const FUTURE_ARCANA_SURGE=Object\.freeze\(\{xRatio:\.506,yRatio:\.43,widthRatio:\.20,heightRatio:\.30\}\)/);
 assert.match(source,/function positionArcanaSurgeFromPose03\(\)/);
 const surgeCss=css.slice(css.indexOf("/* v1.5 Arcana surge"),css.indexOf(".sga-card{"));
 assert.match(surgeCss,/rgba\(5,1,9,\.72\)/);
 assert.match(surgeCss,/sgaArcanaUpflow \.46s ease-out 1 forwards/);
 assert.doesNotMatch(surgeCss,/particle|lightning|neon|magic-circle/i);
});

test("Stage 3 v1.6 bridges Arcana anomaly to the world hypothesis before the no-response hold",()=>{
 const stage3=source.slice(source.indexOf("async function futureFixationStage3"),source.indexOf("async function fadeNpc"));
 const omen=stage3.indexOf('root.classList.add("sga-world-omen")');
 const bridge=stage3.indexOf('await say("shion","……アルカナだけじゃない……")',omen);
 const bridgeHold=stage3.indexOf("await pause(300)",bridge);
 const hypothesis=stage3.indexOf('await say("shion","……世界が、この未来を選んでいるのか？")',bridgeHold);
 const silence=stage3.indexOf("await pause(750)",hypothesis);
 const black=stage3.indexOf('root.classList.add("sga-card-blackening")',silence);
 assert.ok(omen>=0&&omen<bridge&&bridge<bridgeHold&&bridgeHold<hypothesis&&hypothesis<silence&&silence<black);
 const noResponse=stage3.slice(hypothesis,black);
 assert.match(noResponse,/await pause\(750\)/);
 assert.doesNotMatch(noResponse,/worldFault|worldRift|sga-rift-|blackened|fracture|setCinematicSilence|sga-card-flight|classList\.add|classList\.remove/);
});

test("Stage 3 v1.6 mounts the stronger world-color-loss layer below Future Shion",()=>{
 const mount=source.slice(source.indexOf("root.innerHTML="),source.indexOf("document.getElementById",source.indexOf("root.innerHTML=")));
 assert.ok(mount.indexOf('class="sga-world-omen-layer"') < mount.indexOf('class="sga-shion sga-shion-main"'));
 assert.match(css,/\.sga-world-omen-layer\{[\s\S]*backdrop-filter:saturate\(\.82\) brightness\(\.92\)/);
 assert.match(css,/\.sga-world-omen \.sga-world-omen-layer\{opacity:\.74\}/);
});

test("Stage 3 v1.6 uses one-shot future-presence echo and a vertical forced-raise jolt",()=>{
 assert.match(source,/async function playFutureShionEntryEcho\(\)/);
 assert.match(source,/ghost\.classList\.add\("sga-future-entry-echo"\)/);
 const effect=css.slice(css.indexOf("/* Stage 3 only:"),css.indexOf(".sga-card{"));
 assert.match(effect,/sgaFutureEntryEcho \.5s ease-out 1 both/);
 assert.match(effect,/translate\(1\.5px,-1px\)/);
 assert.match(effect,/sgaForcedRaiseJolt \.15s ease-out 1/);
 assert.match(effect,/translateY\(-1px\)/);
 assert.doesNotMatch(effect,/infinite/);
});

test("Stage 3 v1.6 performs an atomic 04 -> 05 Arcana handoff without duplicate cards",()=>{
 const stage3=source.slice(source.indexOf("async function futureFixationStage3"),source.indexOf("async function fadeNpc"));
 const p3=stage3.indexOf("setShion(3)");
 const p4=stage3.indexOf("crossfadeFutureShion(4,100");
 const register=stage3.indexOf("registerFutureArcanaHandoff()");
 const handoff=stage3.indexOf("handoffArcanaFromPose04To05()");
 const hold=stage3.indexOf("await pause(100)",handoff);
 const flight=stage3.indexOf('replayClass(card,"sga-card-flight")',handoff);
 assert.ok(p3>=0&&p3<p4&&p4<register&&register<handoff&&handoff<hold&&hold<flight);
 assert.doesNotMatch(stage3,/crossfadeFutureShion\(5/);
 assert.doesNotMatch(stage3,/positionFutureStage3Card/);
 assert.match(stage3,/await pause\(350\)/);
 assert.match(stage3,/await pause\(1650\)/);
 assert.match(source,/const FUTURE_ARCANA_SOURCE_ANCHOR=Object\.freeze\(\{canvasWidth:512,canvasHeight:512,cardCenterX:180,cardCenterY:62\}\)/);
 assert.doesNotMatch(source,/xRatio:\.63,yRatio:\.20/);
 assert.match(source,/function registerFutureArcanaHandoff\(\)/);
 assert.match(source,/futureArcanaHandoff=Object\.freeze\(\{handoffX,handoffY,cardSize,flightX,flightY,rotation:FUTURE_ARCANA_LAYER\.rotation\}\)/);
 assert.match(source,/function handoffArcanaFromPose04To05\(\)/);
 assert.match(source,/const raf=window\.requestAnimationFrame\|\|\(\(fn\)=>fn\(\)\)/);
 assert.match(source,/raf\(\(\)=>\{[\s\S]*shion\.src=ASSETS\.shion\[4\];[\s\S]*card\.classList\.add\("sga-card-handoff-visible"\)/);
 const handoffFn=source.slice(source.indexOf("function handoffArcanaFromPose04To05"),source.indexOf("function positionWorldRiftFromCard"));
 assert.doesNotMatch(handoffFn,/alignFutureShion|style\.left|style\.top|style\.width|registerFutureArcanaHandoff/);
});

test("Stage 3 v1.6 keeps the independent Arcana hidden until pose 05 owns the card",()=>{
 const cardCss=css.slice(css.indexOf(".sga-card{"),css.indexOf("/* The word \"world\""));
 assert.match(cardCss,/opacity:0;[\s\S]*visibility:hidden/);
 assert.match(cardCss,/\.sga-card-handoff-visible\{[\s\S]*opacity:1;[\s\S]*visibility:visible/);
 assert.match(cardCss,/\.sga-card-handoff-visible \.aura1\{opacity:1\}/);
 assert.doesNotMatch(cardCss,/sga-card-attached|sga-card-detached|sga-card-corrupt|sga-card-absorb|sga-card-tug/);
 const stage3=source.slice(source.indexOf("async function futureFixationStage3"),source.indexOf("async function fadeNpc"));
 assert.doesNotMatch(stage3,/sga-card-attached|sga-card-detached|sga-card-corrupt|sga-card-absorb|sga-card-tug/);
});

test("Stage 3 v1.6 freezes pose-04 card geometry and flies only by relative transform",()=>{
 const registerFn=source.slice(source.indexOf("function registerFutureArcanaHandoff"),source.indexOf("function handoffArcanaFromPose04To05"));
 assert.match(registerFn,/handoffX=left\+width\*\(FUTURE_ARCANA_SOURCE_ANCHOR\.cardCenterX\/FUTURE_ARCANA_SOURCE_ANCHOR\.canvasWidth\)/);
 assert.match(registerFn,/handoffY=top\+height\*\(FUTURE_ARCANA_SOURCE_ANCHOR\.cardCenterY\/FUTURE_ARCANA_SOURCE_ANCHOR\.canvasHeight\)/);
 assert.match(registerFn,/const flightX=0/);
 assert.match(registerFn,/card\.style\.left=handoffX\+"px"/);
 assert.match(registerFn,/card\.style\.top=handoffY\+"px"/);
 assert.match(registerFn,/--sga-card-flight-x","0px"/);
 assert.match(registerFn,/--sga-card-flight-y/);
 const cardCss=css.slice(css.indexOf("/* v1.6:"),css.indexOf("/* v1.6 world color-loss:"));
 assert.match(cardCss,/sgaAuthoredCardFlight 1\.65s linear 1 forwards/);
 assert.match(cardCss,/translateY\(var\(--sga-card-flight-y\)\)/);
 assert.doesNotMatch(cardCss,/translate\(var\(--sga-card-flight-x/);
 assert.doesNotMatch(cardCss,/left:[^;]*animation|top:[^;]*animation/);
 assert.doesNotMatch(cardCss,/rotate\([^v]/);
});

test("Stage 3 v1.6 uses source-space pose-04 anchoring and removes guessed handoff ratios",()=>{
 assert.match(source,/FUTURE_ARCANA_SOURCE_ANCHOR=Object\.freeze\(\{canvasWidth:512,canvasHeight:512,cardCenterX:180,cardCenterY:62\}\)/);
 assert.doesNotMatch(source,/FUTURE_ARCANA_HANDOFF/);
 const registerFn=source.slice(source.indexOf("function registerFutureArcanaHandoff"),source.indexOf("function handoffArcanaFromPose04To05"));
 assert.match(registerFn,/cardCenterX\/FUTURE_ARCANA_SOURCE_ANCHOR\.canvasWidth/);
 assert.match(registerFn,/cardCenterY\/FUTURE_ARCANA_SOURCE_ANCHOR\.canvasHeight/);
 assert.match(registerFn,/const flightX=0/);
});

test("Stage 3 v1.6 card flight is strictly vertical and keeps launch left/top frozen",()=>{
 const stage3=source.slice(source.indexOf("async function futureFixationStage3"),source.indexOf("async function fadeNpc"));
 const handoff=stage3.indexOf("handoffArcanaFromPose04To05()");
 const hold=stage3.indexOf("await pause(100)",handoff);
 const flight=stage3.indexOf('replayClass(card,"sga-card-flight")',hold);
 assert.ok(handoff>=0&&handoff<hold&&hold<flight);
 const handoffFn=source.slice(source.indexOf("function handoffArcanaFromPose04To05"),source.indexOf("function positionWorldRiftFromCard"));
 assert.doesNotMatch(handoffFn,/style\.left|style\.top|style\.width|registerFutureArcanaHandoff/);
 const flightCss=css.slice(css.indexOf("@keyframes sgaAuthoredCardFlight"),css.indexOf("/* v1.6 world color-loss:"));
 assert.match(flightCss,/translateY\(var\(--sga-card-flight-y\)\)/);
 assert.doesNotMatch(flightCss,/translate\(var\(--sga-card-flight-x/);
});

test("Stage 3 v1.6 mounts a deterministic full-screen SVG World Rift with seven fixed lines",()=>{
 const mount=source.slice(source.indexOf("root.innerHTML="),source.indexOf("document.getElementById",source.indexOf("root.innerHTML=")));
 assert.match(mount,/class="sga-world-rift"/);
 assert.match(mount,/class="sga-world-rift-svg"/);
 assert.equal((mount.match(/data-rift="primary"/g)||[]).length,2);
 assert.equal((mount.match(/data-rift="major-/g)||[]).length,6);
 assert.equal((mount.match(/data-rift="minor-/g)||[]).length,6);
 const fn=source.slice(source.indexOf("function positionWorldRiftFromCard"),source.indexOf("function replayClass"));
 assert.doesNotMatch(fn,/Math\.random|random/);
 assert.match(fn,/const paths=Object\.freeze/);
 assert.match(css,/\.sga-world-rift\{[\s\S]*position:absolute;[\s\S]*inset:0;[\s\S]*width:100%;[\s\S]*height:100%;[\s\S]*z-index:18/);
});

test("Stage 3 v1.6 grows the world rift before Dialogue 04 and freezes it through the 750ms no-response hold",()=>{
 const stage3=source.slice(source.indexOf("async function futureFixationStage3"),source.indexOf("async function fadeNpc"));
 const overhead=stage3.indexOf("await pause(450)");
 const position=stage3.indexOf("positionWorldRiftFromCard()",overhead);
 const primary=stage3.indexOf('worldRift.classList.add("sga-rift-ready","sga-rift-primary-active")',position);
 const primaryHold=stage3.indexOf("await pause(220)",primary);
 const full=stage3.indexOf('worldRift.classList.add("sga-rift-full-active")',primaryHold);
 const omen=stage3.indexOf('root.classList.add("sga-world-omen")',full);
 const spread=stage3.indexOf("await pause(600)",omen);
 const bridge=stage3.indexOf('await say("shion","……アルカナだけじゃない……")',spread);
 const hypothesis=stage3.indexOf('await say("shion","……世界が、この未来を選んでいるのか？")',bridge);
 const silence=stage3.indexOf("await pause(750)",hypothesis);
 const black=stage3.indexOf('root.classList.add("sga-card-blackening")',silence);
 assert.ok(overhead>=0&&overhead<position&&position<primary&&primary<primaryHold&&primaryHold<full&&full<omen&&omen<spread&&spread<bridge&&bridge<hypothesis&&hypothesis<silence&&silence<black);
 const noResponse=stage3.slice(hypothesis,black);
 assert.doesNotMatch(noResponse,/classList\.add|classList\.remove|positionWorldRift|sga-card-flight|panTo\(|frameBounds\(|returnToPlayer\(/);
});

test("Stage 3 v1.6 makes world color loss clearly stronger without dimming Future Shion directly",()=>{
 const omenCss=css.slice(css.indexOf("/* v1.6 world color-loss:"),css.indexOf("/* The question receives no answer."));
 assert.match(omenCss,/saturate\(\.82\) brightness\(\.92\)/);
 assert.match(omenCss,/sga-world-omen \.sga-world-omen-layer\{opacity:\.74\}/);
 assert.match(omenCss,/sga-card-blackening \.sga-world-omen-layer[\s\S]*saturate\(\.78\) brightness\(\.90\)/);
 assert.doesNotMatch(omenCss,/sga-shion-main/);
});

test("Stage 3 v1.6 keeps authored dark-aura artwork and the later blackening contract",()=>{
 assert.match(source,/aura1:"\.\/assets\/sprites\/shion\/shion_card_dark_aura_01\.webp",aura2:"\.\/assets\/sprites\/shion\/shion_card_dark_aura_02\.webp"/);
 assert.doesNotMatch(source,/arcanaBack:"\.\/assets\/tarot\/backs\/tarot-card-back\.webp"/);
 assert.match(source,/class="sga-card" aria-hidden="true"><img class="aura1"/);
 const stage3=source.slice(source.indexOf("async function futureFixationStage3"),source.indexOf("async function fadeNpc"));
 const lineAt=stage3.indexOf('await say("shion","……世界が、この未来を選んでいるのか？")');
 const silenceAt=stage3.indexOf("await pause(750)",lineAt);
 const blackAt=stage3.indexOf('root.classList.add("sga-card-blackening")',lineAt);
 const riftAt=stage3.indexOf("positionWorldRiftFromCard()");
 assert.ok(riftAt>=0&&riftAt<lineAt&&lineAt<silenceAt&&silenceAt<blackAt);
 assert.match(stage3,/await pause\(800\)/);
 assert.match(stage3,/root\.classList\.add\("sga-card-blackened"\)/);
});

test("Stage 3 v1.6 separates Shion's hypothesis from blackening and the world fracture",()=>{
 const stage3=source.slice(source.indexOf("async function futureFixationStage3"),source.indexOf("async function fadeNpc"));
 const lineAt=stage3.indexOf("……世界が、この未来を選んでいるのか？");
 const blackAt=stage3.indexOf('root.classList.add("sga-card-blackening")');
 const riftFullAt=stage3.indexOf('worldRift.classList.add("sga-rift-full-active")');
 assert.ok(riftFullAt>=0&&riftFullAt<lineAt&&lineAt<blackAt);
 const betweenLineAndBlack=stage3.slice(lineAt,blackAt);
 assert.match(betweenLineAndBlack,/await pause\(750\)/);
 assert.doesNotMatch(betweenLineAndBlack,/worldRift|sga-rift-|blackened|setCinematicSilence|sga-world-omen/);
});

test("Stage 3 v1.6 removes the generic cue, UI glitch and temporary oscillator tone",()=>{
 assert.doesNotMatch(source,/sga-future-cue|sga-ui-anomaly|playFuturePressureTone|createOscillator|frequency\.setValueAtTime\(72/);
 const cardCss=css.slice(css.indexOf("/* v1.6:"),css.indexOf("@keyframes sgaSkyDown"));
 assert.doesNotMatch(cardCss,/sga-future-cue|sga-ui-anomaly|sgaFutureCue|sgaUiFault/);
});

test("Stage 3 ends the future with a fixed-camera black cut and restores the present garden",()=>{
 const stage3=source.slice(source.indexOf("async function futureFixationStage3"),source.indexOf("async function fadeNpc"));
 const rift=stage3.indexOf('worldRift.classList.add("sga-rift-primary-active")');
 const riftFull=stage3.indexOf('worldRift.classList.add("sga-rift-full-active")',rift);
 const finalHold=stage3.lastIndexOf("await pause(700)");
 const returnCall=stage3.indexOf("await restorePresentAfterFutureFixation(before)",rift);
 assert.ok(rift>=0&&rift<riftFull&&riftFull<finalHold&&finalHold<returnCall);
 assert.doesNotMatch(stage3.slice(rift,returnCall),/panTo\(|frameBounds\(|returnToPlayer\(|zoom/);

 const restore=source.slice(source.indexOf("async function restorePresentAfterFutureFixation"),source.indexOf("async function futureFixationStage3"));
 const blackOn=restore.indexOf('root.classList.add("sga-future-return-black")');
 const visionEnd=restore.indexOf("vision.end()");
 const worldReveal=restore.indexOf('gateShell()?.classList.remove("sga-future-world-hidden")');
 const visibilityReset=restore.indexOf("vis?.reset?.()");
 const presentClass=restore.indexOf('root.classList.add("sga-present-restored")');
 const blackOff=restore.indexOf('root.classList.remove("sga-future-return-black")');
 assert.ok(blackOn>=0&&blackOn<visionEnd&&visionEnd<worldReveal&&worldReveal<visibilityReset&&visibilityReset<presentClass&&presentClass<blackOff);
 assert.match(restore,/await pause\(220\)/);
 assert.match(restore,/await pause\(80\)/);
 assert.match(restore,/await pause\(260\)/);
 assert.match(restore,/await pause\(650\)/);
 assert.doesNotMatch(restore,/say\(/);
 assert.doesNotMatch(restore,/panTo\(|frameBounds\(|returnToPlayer\(/);
});

test("Present-return reaction changes facing only and restores Shion's original direction",()=>{
 const restore=source.slice(source.indexOf("async function restorePresentAfterFutureFixation"),source.indexOf("async function futureFixationStage3"));
 assert.match(restore,/flinchVectorForDir\(before\.dir\|\|current\.dir\|\|"down"\)/);
 assert.match(restore,/faceVectorForDir\(before\.dir\|\|current\.dir\|\|"down"\)/);
 assert.equal((restore.match(/type:"face"/g)||[]).length,2);
 assert.doesNotMatch(restore,/type:"move"|type:"step"|type:"approach"|teleport/);
 assert.match(restore,/if\(!samePoint\(before,after\)\)throw new Error\("Shion moved while returning from Future Fixation Vision"\)/);
 assert.match(restore,/setCinematicSilence\?\.\(false,300\)/);
 assert.match(restore,/future-fixation-return-complete/);
});

test("Stage 3 present return hides all future overlay actors before black clears",()=>{
 assert.match(css,/#star-gate-anomaly\.sga-future-return-black \.sga-future-blackout\{[\s\S]*opacity:1/);
 const returned=css.slice(css.indexOf("/* Stage 3 return:"),css.indexOf("/*",css.indexOf("/* Stage 3 return:")+5)>0?css.indexOf("/*",css.indexOf("/* Stage 3 return:")+5):undefined);
 assert.match(returned,/sga-present-restored \.sga-shion/);
 assert.match(returned,/sga-present-restored \.sga-world-omen-layer/);
 assert.match(returned,/sga-present-restored \.sga-card-surge/);
 assert.match(returned,/sga-present-restored \.sga-card/);
 assert.match(returned,/sga-present-restored \.sga-world-rift/);
 assert.match(returned,/opacity:0!important/);
 assert.match(returned,/visibility:hidden!important/);
 assert.doesNotMatch(returned,/white|#fff|rgb\(255/);
});

test("Stage 3 preserves current Shion world position and NPC isolation",()=>{
 const stage3=source.slice(source.indexOf("async function futureFixationStage3"),source.indexOf("async function fadeNpc"));
 assert.match(stage3,/vis\?\.set\("shiopon",0\);vis\?\.set\("lumiere",0\)/);
 assert.match(stage3,/if\(!samePoint\(before,after\)\)throw new Error\("Shion moved during Future Fixation Vision Stage 3"\)/);
 assert.doesNotMatch(stage3,/type:"move"|type:"step"|type:"approach"|teleport/);
});

test("Stage 3 asset order is reach draw check raise reach",()=>{
 assert.match(source,/shion:\["\.\/assets\/sprites\/shion\/shion_card_01_reach\.webp","\.\/assets\/sprites\/shion\/shion_card_02_draw\.webp","\.\/assets\/sprites\/shion\/shion_card_03_check\.webp","\.\/assets\/sprites\/shion\/shion_card_04_raise\.webp","\.\/assets\/sprites\/shion\/shion_card_05_reach\.webp"\]/);
});

test("Stage 3 Future Shion is not trapped inside the hidden legacy Vision overlay",()=>{
 const mount=source.slice(source.indexOf("root.innerHTML="),source.indexOf("document.getElementById",source.indexOf("root.innerHTML=")));
 const visionClose=mount.indexOf('</div><img class="sga-shion sga-shion-main"');
 assert.ok(visionClose>=0,"Future Shion must be a sibling after .sga-vision, not its child");
 assert.match(css,/\.sga-card-phase \.sga-shion\.visible \{ opacity:1; \}/);
});

test("Stage 3 settles once before the Arcana anomaly without floating or flashing",()=>{
 const stage3=source.slice(source.indexOf("async function futureFixationStage3"),source.indexOf("async function fadeNpc"));
 assert.match(stage3,/root\.classList\.add\("sga-card-phase","sga-future-shion-settle"\)/);
 assert.equal((source.match(/classList\.add\([^\n]*"sga-future-shion-settle"/g)||[]).length,1);
 const setPose=source.slice(source.indexOf("function setShion"),source.indexOf("function gateShell"));
 assert.doesNotMatch(setPose,/settle|animation/);
 const effect=css.slice(css.indexOf("/* Stage 3 only:"),css.indexOf(".sga-card{"));
 assert.match(effect,/animation:sgaFutureShionSettle \.7s ease-out 1 both/);
 assert.match(effect,/brightness\(1\.025\)/);
 assert.match(effect,/saturate\(\.94\)/);
 assert.match(effect,/drop-shadow\(0 0 \.9px rgba\(245,245,248,\.22\)\)/);
 assert.match(effect,/sgaFutureEntryEcho \.5s ease-out 1 both/);
 assert.doesNotMatch(effect,/infinite|pulse|position:fixed|gold/i);
 assert.ok(stage3.indexOf('root.classList.add("sga-card-phase","sga-future-shion-settle")') < stage3.indexOf("setShion(1)"));
 assert.doesNotMatch(stage3,/sga-cut|flash|floating/);
});

test("Reduced motion keeps the static edge and uses only a short simple fade",()=>{
 const effect=css.slice(css.indexOf("/* Stage 3 only:"),css.indexOf(".sga-card{"));
 assert.match(effect,/@media \(prefers-reduced-motion: reduce\)[\s\S]*animation:sgaFutureShionFade \.18s linear 1 both/);
 const fade=effect.match(/@keyframes sgaFutureShionFade \{([\s\S]*?)\n\}/)[1];
 assert.match(fade,/from \{ opacity:0; \}/);
 assert.match(fade,/to \{ opacity:1; \}/);
 assert.doesNotMatch(fade,/filter|brightness|transform/);
});
