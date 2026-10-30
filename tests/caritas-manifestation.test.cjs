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
 const seq=['saySequence(attempts>0?INTRO.slice(-1):INTRO,()=>','saySequence(SCOUT_REQUEST,scoutAhead)','Promise.resolve(manifestation.prepareLeft())','saySequence(SCOUT_REPORT,deployTarot)','saySequence(TAROT_DECLARATION,()=>','saySequence(SHIOPON_REPLY,()=>','manifestation.moveForward()', 'manifestation.faceFront()','saySequence(INVOCATION,()=>','manifestation.begin()','stage("manifestation",5500','manifestation.reveal()','saySequence(REVEAL,()=>','root.hidden=false','stage("engulfing",2600,beginBattle)'];
 // Walking is started while Shiopon's spoken reply is visible (parallel actions).
 assert.ok(start.includes(seq[0]));
 assert.ok(start.includes(seq[1]));
 assert.ok(start.includes(seq[2]));
 for(const v of seq.slice(3))assert.ok(start.includes(v),"missing ordered step "+v);
 assert.match(event,/const SHIOPON_REPLY=\[\["しおぽん","はい、シオンさん。"\]\]/);
 assert.match(event,/const TAROT_DECLARATION=\[\["シオン","タロット展開。"\]\]/);
 assert.match(event,/const SCOUT_REQUEST=\[/);
 assert.match(event,/あの子、なんだか苦しそうなの/);
 assert.match(event,/危険だ。近づくな/);
 assert.match(event,/少しだけ、確かめてくるの/);
 assert.match(event,/あの子のまわり、闇が/);
 assert.doesNotMatch(event.slice(event.indexOf("const SCOUT_REQUEST="),event.indexOf("const TAROT_DECLARATION=")),/カリタス/,"Shiopon must not know the child's name");
 assert.ok(start.indexOf("saySequence(SCOUT_REQUEST,scoutAhead)")>start.indexOf("Promise.resolve(manifestation.prepareLeft())"),"code invokes scouting only after speech callback");
 assert.match(start,/actor:"shiopon",target:CARITAS_GAZE/);
 assert.match(start,/abyss\?\.setPhase\?\.\("surging"\)/);
 assert.match(start,/abyss\?\.setPhase\?\.\("engulfed"\)/);
 assert.doesNotMatch(start,/actor:"shion",target:"shiopon"/,"Shion keeps Caritas in sight while chanting");
 assert.match(event,/const SHIOPON_CALL=\[\["シオン","いくぞ、しおぽん。"\]\]/);
 assert.match(event,/speaker==="しおぽん"\?"shiopon"/);
 assert.ok(start.indexOf("saySequence(INVOCATION,()=>")<start.indexOf("stage(\"manifestation\",5500"));
 assert.ok(start.indexOf("saySequence(REVEAL,()=>")<start.indexOf("root.hidden=false"));
});
test("world anchored Caritas Abyss starts thin and gains opaque pixel cells during Shiopon's approach",()=>{
 assert.match(game,/phase:"haze",opacity:\.13/);
 const fog=game.slice(game.indexOf("function paintCaritasMiasma("),game.indexOf("function drawActors()"));
 assert.match(fog,/950\.5\+125\/2/,"miasma must attach to Caritas' world position");
 assert.match(fog,/ctx\.fillRect\(px,py,step\*2,step\)/,"pixel cluster rendering, not CSS-only smoke");
 assert.match(fog,/opacity>\.35/,"purple accent appears only after darkening");
 assert.match(game,/paintCaritasMiasma\(\)/);
 assert.match(game,/\{haze:\.13,surging:\.88,engulfed:1,cleared:0\}/);
 assert.match(game,/window\.TarotHoshisunaAbyss=Object\.freeze/);
 assert.match(event,/abyss\?\.setPhase\?\.\("surging"\)/);
 assert.match(event,/abyss\?\.setPhase\?\.\("engulfed"\)/);
 assert.match(event,/TarotHoshisunaAbyss\?\.setPhase\?\.\("cleared"\)/);
});
test("tarot spread sits over the head and beside both arms without touching Shion",()=>{
 const vm=require("node:vm");
 const layout=game.slice(game.indexOf("function caritasTarotLayout("),
                         game.indexOf("function paintCaritasTarotSpread("));
 assert.match(layout,/const height=drawHeight\*\.34,width=height\*aspect,gap=9/);
 const sandbox={
   caritasTarotShionBounds:{topOffset:-66,leftOffset:-16,rightOffset:16},
   images:{},measureCaritasVisibleMapActor:()=>{throw new Error("cached bounds should be used");}
 };
 vm.runInNewContext(layout+"\nthis.cards=caritasTarotLayout({x:100,y:200,stageOffsetY:0},78,2/3)",sandbox);
 const [head,left,right]=sandbox.cards;
 const halfHeight=head.height/2,halfWidth=head.width/2;
 assert.equal(head.x,100);
 assert.ok(Math.abs((head.y+halfHeight)-(200-66-9))<1e-8,"head card has 9px gap above visible hair");
 assert.ok(Math.abs((left.x+halfWidth)-(100-16-9))<1e-8,"left card has 9px gap outside left arm");
 assert.ok(Math.abs((right.x-halfWidth)-(100+16+9))<1e-8,"right card has 9px gap outside right arm");
 assert.equal(left.y,right.y,"side cards must align at arm height");
 assert.ok(head.y<left.y,"top card must be above both arm cards");
 const painting=game.slice(game.indexOf("function paintCaritasTarotSpread("),
                          game.indexOf("// Invocation-only light:"));
 assert.match(painting,/shadowColor="rgba\(246,224,189,\.63\)"/);
 assert.match(painting,/shadowBlur=11\/camera\.zoom/);
 assert.match(painting,/ctx\.drawImage\(caritasTarotBack/);
});
test("one real world actor uses approved atlas and preserves foot position",()=>{
 assert.match(game,/TarotHoshisunaManifestation=Object\.freeze/);
 assert.match(game,/caritasShiorielAtlas=image/);
 assert.match(game,/\.\/assets\/sprites\/shioriel\/shioriel-four-directions\.webp/);
 assert.match(game,/image\.naturalWidth\/2,sh=image\.naturalHeight\/2/);
 assert.match(game,/drawCaritasInvocation\(entry\.actor\)/);
 assert.match(game,/if\s*\(hoshisunaIsolated\s*&&\s*caritasInvocation\.locked\)/);
 assert.match(game,/performStageCommand\(\{type:"move",actor:"shiopon",target:spot,duration:440,caritasSafe:true\}\)/);
 assert.match(game,/prepareLeft\(\)/);
 assert.match(event,/Promise\.resolve\(manifestation\.prepareLeft\(\)\)\.then\(prepared=>/);
 assert.doesNotMatch(event,/const leftArrival=/,"No early silent staging during Caritas dialogue");
 assert.match(event,/if\(!prepared\?\.completed\)/);
 assert.match(game,/shiopon\.dir="down"/);
 assert.match(game,/caritasSafeRoute\(from,candidate,true\)/);
 assert.match(game,/\{x:from\.x,y:from\.y-18\}/,"one deliberate step from the previously established position");
 assert.match(game,/caritasSafeCollision\(true\)\.segmentClear\(from,candidate\)/);
 assert.doesNotMatch(game.slice(game.indexOf("    moveForward(){"),game.indexOf("    faceFront(){")),/\{x:front\.x-64,y:front\.y-45\}/,"do not jump to the former distant target");
 assert.match(game,/caritasSafeCollision\(motion\.caritasCards\)\.segmentClear\(current,next\)/);
 const asset=path.join(root,"assets/sprites/shioriel/shioriel-four-directions.webp");
 assert.ok(fs.existsSync(asset),"Approved official sprite atlas must be copied into branch");
 const b=fs.readFileSync(asset);
 assert.equal(b.subarray(0,4).toString(),"RIFF");
 assert.equal(b.subarray(8,12).toString(),"WEBP");
 assert.doesNotMatch(event,/cb-manifest-fox|cb-manifest-shioriel/);
 assert.doesNotMatch(css,/cb-manifest-fox|cb-manifest-shioriel/);
});
test("Caritas-specific path avoids Shion, three card rectangles and map walls",()=>{
 const safe=game.slice(game.indexOf("function caritasSafeCollision("),
                       game.indexOf("// Invocation-only light:"));
 assert.match(safe,/collision\.segmentClear\(a,b\)/,"map geometry must remain authoritative");
 assert.match(safe,/refDistance\(p,shion\)>=ACTOR_COLLISION_DISTANCE\+8/);
 assert.match(safe,/cards\.every\(r=>p\.x<r\.left\|\|p\.x>r\.right/);
 assert.match(safe,/Math\.ceil\(refDistance\(a,b\)\/3\)/,"segment sampling prevents tunneling");
 assert.match(safe,/caritasTarotLayout\(player,DRAW_HEIGHT/,"the visible tarot footprint is used");
 assert.match(safe,/window\.TarotNavigation\.createNavigator\(blocked,12\)/);
 assert.match(game,/if\(motion\.caritasSafe&&!caritasSafeCollision\(motion\.caritasCards\)\.segmentClear\(current,next\)\)/);
 const api=game.slice(game.indexOf("if (hoshisunaIsolated) window.TarotHoshisunaManifestation="));
 assert.match(api,/const candidates=\[\s*\{x:front\.x-69,y:front\.y-12\}/);
 assert.match(api,/\{x:from\.x,y:from\.y-18\}/);
 assert.doesNotMatch(api,/legalStageRoute\("shiopon",from,candidate\)/);
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
 assert.match(html,/hoshisuna-main-game\.js\?v=caritas-facing-unblocked-v12/);
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
 assert.match(html,/hoshisuna-main-game\.js\?v=caritas-facing-unblocked-v12/);
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
 assert.match(game,/Object\.freeze\(\[800,500,500,500,230,230,240,350,370,380,600,800\]\)/);
 assert.match(game,/function drawCaritasOwnerTransformation\(actor,phase,t\)/);
 assert.match(game,/const elapsed=phase==="revealed"\?CARITAS_MANIFESTATION_DURATION_MS:/);
 assert.match(game,/ctx\.drawImage\(image,\(index%4\)\*CARITAS_OWNER_TILE,/);
 assert.match(game,/const x=actor\.x,y=actor\.y\+actor\.stageOffsetY\+actor\.visualOffsetY/);
 assert.match(game,/if\(caritasOwnerTransformationAtlas\)return drawCaritasOwnerTransformation\(actor,phase,t\)/);
 assert.match(game,/caritasOwnerTransformationAtlas=image/);
 assert.match(game,/ownerAnimationReady:!!caritasOwnerTransformationAtlas/);
 assert.match(game,/\[Caritas\] owner transformation unavailable/);
 assert.match(html,/caritas-facing-unblocked-v12/);
});

test("owner transformation keeps native Shiopon body height and finishes at Shion body height",()=>{
 const section=game.slice(game.indexOf("function measureCaritasVisibleMapActor("),
                          game.indexOf("function drawCaritasInvocation(actor)"));
 assert.match(section,/getImageData\(0,0,96,128\)/);
 assert.match(section,/SHIOPON_DRAW_HEIGHT\)/);
 assert.match(section,/DRAW_HEIGHT\)/);
 assert.match(section,/const bodyHeight=scale\.shioponHeight\*\(1-blend\)\+scale\.shionHeight\*blend/);
 assert.match(section,/const sourceBodyHeight=109\*\(1-blend\)\+113\*blend/);
 assert.match(section,/const height=CARITAS_OWNER_TILE\*bodyHeight\/sourceBodyHeight/);
 assert.match(section,/feetY-145\*height\/CARITAS_OWNER_TILE/);
 assert.doesNotMatch(section,/const height=112,width=112/);
 assert.match(html,/caritas-facing-unblocked-v12/);
});

test("opt-in transformation preview starts before battle without reading or rewriting saved dev checkpoint",()=>{
 assert.match(event,/const transformationReplay=params\.getAll\("preview"\)\.length===1&&params\.get\("preview"\)==="manifestation"/);
 assert.match(event,/const checkpointStore=transformationReplay\?replayStore:localStorage/);
 assert.match(event,/const result=S\.write\(checkpointStore,SAVE_KEY,expectedRaw,next\)/);
 assert.match(event,/if\(transformationReplay\)return false;\s*try\{\s*savedRaw=checkpointStore\.getItem\(SAVE_KEY\)/);
 assert.match(event,/if\(!transformationReplay\)window\.addEventListener\("storage"/);
 assert.doesNotMatch(event,/S\.write\(localStorage,SAVE_KEY/);
 assert.match(html,/caritas-battle-event\.js\?v=resonance-special-v15-scout-reason-v8/);
 assert.match(html,/hoshisuna-main-game\.js\?v=caritas-facing-unblocked-v12/);
});
test("transformation replay dev spawn stays walkable and keeps main Starroad entry unchanged",()=>{
 assert.match(game,/const transformationReplay = hoshisunaIsolated &&\s*params\.getAll\("preview"\)\.length === 1 && params\.get\("preview"\) === "manifestation"/);
 assert.match(game,/spawnRef = \{x:108,y:488\};/);
 assert.match(game,/if\(transformationReplay\)spawnRef = \{x:1088,y:331\};/);
 const shape=JSON.parse(fs.readFileSync(path.join(root,"assets/events/hoshisuna/map/starroad-collision.json"),"utf8"));
 const inside=(x,y,points)=>{
   let found=false;
   for(let i=0,j=points.length-1;i<points.length;j=i++){
     const a=points[i],b=points[j];
     if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])found=!found;
   }
   return found;
 };
 const walk=(x,y)=>shape.walkAreas.some(a=>a.type==="poly"&&inside(x,y,a.points));
 assert.ok(walk(1088,331),"Shion spawn must be on official Starroad");
 assert.ok(walk(1032,331),"Shiopon remains 56px behind on official walkable terrain");
 assert.ok(walk(1059,298),"Shiopon's first front-facing manifestation target remains accessible");
 assert.ok(!((1088>=934&&1088<=1092)&&(331>=150&&331<=272)),"spawn must not intersect Caritas body");
});
