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


test("Stage 3 keeps current Shion translucent and anchors Future Shion diagonally in front",()=>{
 const stage3=source.slice(source.indexOf("async function futureFixationStage3"),source.indexOf("async function fadeNpc"));
 assert.match(source,/const FUTURE_VISION_CURRENT_SHION_OPACITY=\.55/);
 const stage2=source.slice(source.indexOf("async function futureFixationStage2"),source.indexOf("async function futureFixationStage3"));
 assert.match(stage2,/actorVisibility\?\.set\("shion",1-\(1-FUTURE_VISION_CURRENT_SHION_OPACITY\)\*progress\)/);
 assert.match(stage3,/opacity drifted before Future Fixation Vision Stage 3/);
 assert.doesNotMatch(stage3,/set\("shion",FUTURE_VISION_CURRENT_SHION_OPACITY\)/);
 assert.doesNotMatch(stage3,/vis\?\.set\("shion",0\)/);
 assert.match(source,/TarotActorScreenAnchor\?\.get\?\.\("shion"\)/);
 assert.match(source,/const FUTURE_SHION_OFFSET_X=\.45/);
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
   assert.ok(Math.abs(left+width/2-(anchor.x+anchor.width*.45))<1e-9);
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

test("Stage 3 turns the five approved Future Shion poses into Arcana anomaly story beats",()=>{
 const stage3=source.slice(source.indexOf("async function futureFixationStage3"),source.indexOf("async function fadeNpc"));
 const beats=["setShion(1)","setShion(2)","setShion(3)","setShion(4)","setShion(5)"];
 let last=-1;
 for(const beat of beats){const at=stage3.indexOf(beat);assert.ok(at>last,beat+" must remain in authored order");last=at}
 for(const line of ["……？","アルカナが……どうなっているんだ……？","……世界が、この未来を選んでいるのか？"])assert.ok(stage3.includes(line));
 const bed=stage3.indexOf("setCinematicSilence?.(false,240)");
 const silence=stage3.indexOf("setCinematicSilence?.(true,160)");
 assert.ok(bed>=0&&bed<silence,"Stage 3 needs an audible bed before the Arcana removes it");
 assert.equal((stage3.match(/replayClass\(uiFault,"show"\)/g)||[]).length,1);
 assert.equal((stage3.match(/replayClass\(worldFault,"show"\)/g)||[]).length,1);
 assert.match(stage3,/root\.classList\.add\("sga-arcana-corrupt"\)/);
 assert.match(stage3,/root\.classList\.add\("sga-arcana-absorb"\)/);
 assert.match(stage3,/root\.classList\.add\("sga-arcana-tug"\)/);
 assert.match(stage3,/replayClass\(arcana,"sga-arcana-flight"\)/);
 assert.match(stage3,/playFuturePressureTone\(1350\)/);
 assert.match(stage3,/future-fixation-arcana-anomaly-complete/);
 assert.doesNotMatch(stage3,/Re:カード|Re:Arcana|Anti Arcana|Etera|Arete|これは……私の選択じゃない|――選べ/);
 assert.doesNotMatch(stage3,/aura1|aura2|sga-cut|floating/);
});

test("Stage 3 keeps the anomaly card-side and one-shot instead of making it a character",()=>{
 assert.match(source,/arcanaBack:"\.\/assets\/tarot\/backs\/tarot-card-back\.webp"/);
 assert.match(source,/class="sga-arcana-anomaly"/);
 assert.match(source,/function positionFutureStage3Effects\(mode="check"\)/);
 assert.match(source,/const raised=mode==="raised"/);
 assert.match(source,/--sga-arcana-rise/);
 const anomalyCss=css.slice(css.indexOf("/* Future Fixation Vision Stage 3 — Arcana anomaly."),css.indexOf("@keyframes sgaSkyDown"));
 assert.match(anomalyCss,/sgaArcanaStain 1\.25s ease-out 1 forwards/);
 assert.match(anomalyCss,/sgaArcanaAbsorb 1\.05s ease-in 1 forwards/);
 assert.match(anomalyCss,/sgaArcanaFlight 1\.65s cubic-bezier\([^)]*\) 1 forwards/);
 assert.match(anomalyCss,/sgaUiFault \.16s steps\(2,end\) 1 both/);
 assert.match(anomalyCss,/sgaWorldRuleFault \.48s steps\(2,end\) 1 forwards/);
 assert.doesNotMatch(anomalyCss,/infinite|pulse|shake|flash/i);
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
 const visionClose=mount.indexOf('</div><img class="sga-shion"');
 assert.ok(visionClose>=0,"Future Shion must be a sibling after .sga-vision, not its child");
 assert.match(css,/\.sga-card-phase \.sga-shion\.visible \{ opacity:1; \}/);
});

test("Stage 3 settles once before the Arcana anomaly without floating or flashing",()=>{
 const stage3=source.slice(source.indexOf("async function futureFixationStage3"),source.indexOf("async function fadeNpc"));
 assert.match(stage3,/root\.classList\.add\("sga-card-phase","sga-future-shion-settle"\)/);
 assert.equal((source.match(/classList\.add\([^\n]*"sga-future-shion-settle"/g)||[]).length,1);
 const setPose=source.slice(source.indexOf("function setShion"),source.indexOf("function gateShell"));
 assert.doesNotMatch(setPose,/settle|animation/);
 const effect=css.slice(css.indexOf("/* Stage 3 only:"),css.indexOf(".sga-card {"));
 assert.match(effect,/animation:sgaFutureShionSettle \.7s ease-out 1 both/);
 assert.match(effect,/brightness\(1\.04\)/);
 assert.match(effect,/drop-shadow\(0 0 \.6px rgba\(245,245,248,\.14\)\) drop-shadow\(0 0 1px rgba\(209,202,226,\.10\)\)/);
 assert.doesNotMatch(effect,/infinite|pulse|transform|translate|blur\(|background|position:fixed|inset|gold/i);
 assert.ok(stage3.indexOf('root.classList.add("sga-card-phase","sga-future-shion-settle")') < stage3.indexOf("setShion(1)"));
 assert.doesNotMatch(stage3,/sga-cut|flash|aura|floating/);
});

test("Reduced motion keeps the static edge and uses only a short simple fade",()=>{
 const effect=css.slice(css.indexOf("/* Stage 3 only:"),css.indexOf(".sga-card {"));
 assert.match(effect,/@media \(prefers-reduced-motion: reduce\)[\s\S]*animation:sgaFutureShionFade \.18s linear 1 both/);
 const fade=effect.match(/@keyframes sgaFutureShionFade \{([\s\S]*?)\n\}/)[1];
 assert.match(fade,/from \{ opacity:0; \}/);
 assert.match(fade,/to \{ opacity:1; \}/);
 assert.doesNotMatch(fade,/filter|brightness|transform/);
});
