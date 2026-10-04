(() => {
"use strict";
const ASSETS={
 ruins:"./assets/events/gate-vision/ruins.webp",smoke:"./assets/events/gate-vision/smoke.webp",void:"./assets/events/gate-vision/void.webp",
 shion:["./assets/sprites/shion/shion_card_01_reach.webp","./assets/sprites/shion/shion_card_02_draw.webp","./assets/sprites/shion/shion_card_03_check.webp","./assets/sprites/shion/shion_card_04_raise.webp","./assets/sprites/shion/shion_card_05_reach.webp"],
 aura1:"./assets/sprites/shion/shion_card_dark_aura_01.webp",aura2:"./assets/sprites/shion/shion_card_dark_aura_02.webp",
 anomalyGate:"https://raw.githubusercontent.com/reverse-shion/tarot-breaker-game/main/assets/events/gate-vision/garden-star-gate.webp",
 darkEnergy:["https://raw.githubusercontent.com/reverse-shion/tarot-breaker-game/main/assets/events/gate-vision/dark_energy_rise_01.webp","https://raw.githubusercontent.com/reverse-shion/tarot-breaker-game/main/assets/events/gate-vision/dark_energy_rise_02.webp","https://raw.githubusercontent.com/reverse-shion/tarot-breaker-game/main/assets/events/gate-vision/dark_energy_rise_03.webp","https://raw.githubusercontent.com/reverse-shion/tarot-breaker-game/main/assets/events/gate-vision/dark_energy_rise_04.webp"],
 celestialLight:["https://raw.githubusercontent.com/reverse-shion/tarot-breaker-game/main/assets/events/gate-vision/celestial_gate_light_01.webp","https://raw.githubusercontent.com/reverse-shion/tarot-breaker-game/main/assets/events/gate-vision/celestial_gate_light_02.webp","https://raw.githubusercontent.com/reverse-shion/tarot-breaker-game/main/assets/events/gate-vision/celestial_gate_light_03.webp","https://raw.githubusercontent.com/reverse-shion/tarot-breaker-game/main/assets/events/gate-vision/celestial_gate_light_04.webp"]
};
const GATE_BOUNDS=Object.freeze({left:520,top:-163.33333333333331,right:1080,bottom:210});
const CINEMATIC_SKY_OVERSCAN=Object.freeze({x:0,y:-480,w:1448,h:640});
const OVERSCAN_COVERAGE=Object.freeze({minimumTopSafety:80,mainSceneTop:0});
const GATE_STATES=Object.freeze(["sga-sky-descent","sga-normal-flow","sga-resonance-complete","sga-anomaly-flicker","sga-anomaly","sga-reverse-gate","sga-reverse-flow","sga-skyward-release","sga-anomaly-rest","sga-dark-frame-01","sga-dark-frame-02","sga-dark-frame-03","sga-dark-frame-04","sga-dark-frame-rise","sga-dark-afterglow","sga-celestial-frame-01","sga-celestial-frame-02","sga-celestial-frame-03","sga-celestial-frame-04"]);
class StarGateOverscanCoverageError extends Error{constructor(){super("Star Gate cinematic framing or sky overscan coverage failed");this.name="StarGateOverscanCoverageError"}}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const DEV_MODE=new URLSearchParams(location.search).get("dev");
const DEV_HARNESS=["star-gate-full","star-gate-camera","future-fixation-stage1"].includes(DEV_MODE);
const FUTURE_STAGE1_DEV=DEV_MODE==="star-gate-full";
let running=false,ui=null,root=null,resolveAdvance=null,interactionOwned=false;
function image(src){return new Promise((resolve,reject)=>{const i=new Image();i.onload=async()=>{try{if(i.decode)await i.decode()}catch{}resolve(i)};i.onerror=reject;i.src=src})}
async function preload(){await Promise.all(Object.values(ASSETS).flat().map(image))}
function mount(){
 if(root)return root;
 root=document.createElement("section");root.id="star-gate-anomaly";root.setAttribute("aria-hidden","true");
 root.innerHTML='<div class="sga-future-blackout" aria-hidden="true"></div><div class="sga-dim"></div><div class="sga-vision"><div class="sga-pan"><img class="sga-ruins" src="'+ASSETS.ruins+'" alt=""><img class="sga-smoke" src="'+ASSETS.smoke+'" alt=""><img class="sga-smoke second" src="'+ASSETS.smoke+'" alt=""><img class="sga-void" src="'+ASSETS.void+'" alt=""></div></div><div class="sga-world-omen-layer" aria-hidden="true"></div><img class="sga-shion sga-shion-main" alt=""><img class="sga-shion sga-shion-transition" aria-hidden="true" alt=""><div class="sga-card-surge" aria-hidden="true"></div><div class="sga-card" aria-hidden="true"><img class="aura1" src="'+ASSETS.aura1+'" alt=""><img class="aura2" src="'+ASSETS.aura2+'" alt=""></div><div class="sga-world-rift" aria-hidden="true"><svg class="sga-world-rift-svg" viewBox="0 0 1 1" preserveAspectRatio="none" aria-hidden="true"><g class="sga-rift-edges"><path class="sga-rift-line sga-rift-edge sga-rift-primary" data-rift="primary" pathLength="1"/><path class="sga-rift-line sga-rift-edge sga-rift-major" data-rift="major-left" pathLength="1"/><path class="sga-rift-line sga-rift-edge sga-rift-major" data-rift="major-right" pathLength="1"/><path class="sga-rift-line sga-rift-edge sga-rift-major" data-rift="major-lower" pathLength="1"/><path class="sga-rift-line sga-rift-edge sga-rift-minor" data-rift="minor-left" pathLength="1"/><path class="sga-rift-line sga-rift-edge sga-rift-minor" data-rift="minor-right" pathLength="1"/><path class="sga-rift-line sga-rift-edge sga-rift-minor" data-rift="minor-lower" pathLength="1"/></g><g class="sga-rift-cores"><path class="sga-rift-line sga-rift-core sga-rift-primary" data-rift="primary" pathLength="1"/><path class="sga-rift-line sga-rift-core sga-rift-major" data-rift="major-left" pathLength="1"/><path class="sga-rift-line sga-rift-core sga-rift-major" data-rift="major-right" pathLength="1"/><path class="sga-rift-line sga-rift-core sga-rift-major" data-rift="major-lower" pathLength="1"/><path class="sga-rift-line sga-rift-core sga-rift-minor" data-rift="minor-left" pathLength="1"/><path class="sga-rift-line sga-rift-core sga-rift-minor" data-rift="minor-right" pathLength="1"/><path class="sga-rift-line sga-rift-core sga-rift-minor" data-rift="minor-lower" pathLength="1"/></g></svg></div><div class="sga-cut"></div><div class="sga-impurity"></div>';
 document.getElementById("game-shell")?.appendChild(root);return root;
}
function makeUi(){
 if(ui)return ui;
 ui=window.TarotDialogueUI.create({mount:document.getElementById("game-shell"),ids:{layer:"anomaly-dialogue-layer",advance:"anomaly-dialogue-advance",speaker:"anomaly-dialogue-speaker",text:"anomaly-dialogue-text"},onAdvance:()=>{if(ui.isTyping())ui.revealAll();else if(resolveAdvance){const r=resolveAdvance;resolveAdvance=null;r()}}});
 return ui;
}
async function say(actor,text){
 const names={shion:"シオン",shiopon:"しおぽん",lumiere:"リュミエール"};
 const d=makeUi();d.show({speaker:actor?names[actor]:"",text,actor:actor||""});d.setState("dialogue");
 await new Promise(r=>resolveAdvance=r);d.hide();await sleep(100);
}
async function pause(ms){await sleep(ms)}
const FUTURE_VISION_CURRENT_SHION_OPACITY=.55;
// The card-pose source fills more of its 512px canvas than the playable Shion
// frame does. Match the visible silhouette, not the raw image canvas height.
const FUTURE_SHION_VISUAL_SCALE=.86;
const FUTURE_SHION_OFFSET_X=-1.15;
const FUTURE_SHION_OFFSET_Y=.30;
// Pose 04 is authored on a fixed 512x512 source canvas.
// Handoff position is derived from the painted Arcana's source-space center,
// never from a guessed percentage of Future Shion's displayed silhouette.
const FUTURE_ARCANA_SOURCE_ANCHOR=Object.freeze({canvasWidth:512,canvasHeight:512,cardCenterX:180,cardCenterY:62});
const FUTURE_ARCANA_LAYER=Object.freeze({widthRatio:.62,rotation:0});
const FUTURE_ARCANA_SURGE=Object.freeze({xRatio:.506,yRatio:.43,widthRatio:.20,heightRatio:.30});
let futureArcanaHandoff=null;
function alignFutureShionElement(el){
 const anchor=window.TarotActorScreenAnchor?.get?.("shion");
 if(!el||!anchor)return false;
 const stage3=root.classList.contains("sga-future-shion-settle");
 const gap=Math.max(10,anchor.width*.28);
 const targetHeight=anchor.height*FUTURE_SHION_VISUAL_SCALE;
 const futureFeetY=stage3?anchor.feetY+anchor.height*FUTURE_SHION_OFFSET_Y:anchor.feetY;
 const place=()=>{
   const ratio=el.naturalWidth>0&&el.naturalHeight>0?el.naturalWidth/el.naturalHeight:null;
   const targetWidth=ratio?targetHeight*ratio:anchor.width*FUTURE_SHION_VISUAL_SCALE;
   el.style.left=(stage3?anchor.x+anchor.width*FUTURE_SHION_OFFSET_X-targetWidth/2:anchor.x+anchor.width/2+gap)+"px";
   el.style.bottom="auto";
   el.style.height=targetHeight+"px";
   el.style.width=ratio?targetHeight*ratio+"px":"auto";
   el.style.top=(futureFeetY-targetHeight)+"px";
 };
 if(el.complete&&el.naturalWidth>0)place();else el.addEventListener("load",place,{once:true});
 return true;
}
function alignFutureShion(){
 return alignFutureShionElement(root?.querySelector(".sga-shion-main")||root?.querySelector(".sga-shion"));
}
function setShion(n){
 const el=root.querySelector(".sga-shion-main")||root.querySelector(".sga-shion");
 el.src=ASSETS.shion[n-1];alignFutureShionElement(el);el.classList.add("visible");
}
async function crossfadeFutureShion(n,duration=110,{liftOld=false}={}){
 const main=root.querySelector(".sga-shion-main"),ghost=root.querySelector(".sga-shion-transition");
 if(!main||!ghost){setShion(n);await pause(duration);return}
 if(liftOld){
  main.classList.add("sga-pose-lift");
  await pause(140);
 }
 ghost.src=main.src;
 alignFutureShionElement(ghost);
 ghost.style.opacity="1";
 ghost.style.transform=liftOld?"translateY(-2px)":"none";
 ghost.style.filter=liftOld?"brightness(.93)":"";
 main.src=ASSETS.shion[n-1];
 alignFutureShionElement(main);
 main.classList.add("visible");
 main.style.transition="none";
 main.style.opacity="0";
 main.style.transform=liftOld?"translateY(-2px)":"none";
 main.classList.remove("sga-pose-lift");
 void main.offsetWidth;
 main.style.transition="opacity "+duration+"ms ease, transform 120ms ease-out";
 ghost.style.transition="opacity "+duration+"ms ease";
 main.style.opacity="1";
 main.style.transform="none";
 ghost.style.opacity="0";
 await pause(duration);
 main.style.transition="";
 main.style.opacity="";
 main.style.transform="";
 ghost.style.transition="";
 ghost.style.opacity="";
 ghost.style.transform="";
 ghost.style.filter="";
 ghost.removeAttribute("src");
}
async function playFutureShionEntryEcho(){
 const main=root?.querySelector(".sga-shion-main"),ghost=root?.querySelector(".sga-shion-transition");
 if(!main||!ghost)return;
 ghost.src=main.src;
 alignFutureShionElement(ghost);
 ghost.classList.add("sga-future-entry-echo");
 await pause(500);
 ghost.classList.remove("sga-future-entry-echo");
 ghost.removeAttribute("src");
}
function positionArcanaSurgeFromPose03(){
 const shion=root?.querySelector(".sga-shion-main"),surge=root?.querySelector(".sga-card-surge");
 if(!shion||!surge)return false;
 const left=parseFloat(shion.style.left),top=parseFloat(shion.style.top),width=parseFloat(shion.style.width),height=parseFloat(shion.style.height);
 if(![left,top,width,height].every(Number.isFinite)||width<=0||height<=0)
  throw new Error("Future Shion pose 03 rectangle unavailable for Arcana surge");
 surge.style.left=(left+width*FUTURE_ARCANA_SURGE.xRatio)+"px";
 surge.style.top=(top+height*FUTURE_ARCANA_SURGE.yRatio)+"px";
 surge.style.width=(width*FUTURE_ARCANA_SURGE.widthRatio)+"px";
 surge.style.height=(height*FUTURE_ARCANA_SURGE.heightRatio)+"px";
 return true;
}
function positionArcanaSurgeFromHandoff(){
 const surge=root?.querySelector(".sga-card-surge");
 if(!surge||!futureArcanaHandoff)return false;
 surge.style.left=futureArcanaHandoff.handoffX+"px";
 surge.style.top=futureArcanaHandoff.handoffY+"px";
 surge.style.width=Math.max(44,futureArcanaHandoff.cardSize*1.50)+"px";
 surge.style.height=Math.max(72,futureArcanaHandoff.cardSize*2.20)+"px";
 return true;
}
function registerFutureArcanaHandoff(){
 const shion=root?.querySelector(".sga-shion-main")||root?.querySelector(".sga-shion");
 const card=root?.querySelector(".sga-card");
 if(!shion||!card)return false;
 const left=parseFloat(shion.style.left),top=parseFloat(shion.style.top),width=parseFloat(shion.style.width),height=parseFloat(shion.style.height);
 if(![left,top,width,height].every(Number.isFinite)||width<=0||height<=0)
  throw new Error("Future Shion pose 04 rectangle unavailable for Arcana handoff");

 const handoffX=left+width*(FUTURE_ARCANA_SOURCE_ANCHOR.cardCenterX/FUTURE_ARCANA_SOURCE_ANCHOR.canvasWidth);
 const handoffY=top+height*(FUTURE_ARCANA_SOURCE_ANCHOR.cardCenterY/FUTURE_ARCANA_SOURCE_ANCHOR.canvasHeight);
 const cardSize=Math.max(42,Math.min(62,width*FUTURE_ARCANA_LAYER.widthRatio));
 const viewportHeight=root?.clientHeight||window.innerHeight||844;
 const minFinalY=Math.max(cardSize/2+10,28);
 const desiredLift=Math.max(72,height*.55);
 const finalY=Math.max(minFinalY,Math.min(viewportHeight*.22,handoffY-desiredLift));
 const flightX=0;
 const flightY=finalY-handoffY;

 // Freeze launch geometry from pose 04. Pose 05 and the flight may not
 // recalculate or rewrite left/top/width after this point.
 futureArcanaHandoff=Object.freeze({handoffX,handoffY,cardSize,flightX,flightY,rotation:FUTURE_ARCANA_LAYER.rotation});
 card.style.transition="none";
 card.style.left=handoffX+"px";
 card.style.top=handoffY+"px";
 card.style.bottom="auto";
 card.style.width=cardSize+"px";
 card.style.setProperty("--sga-card-flight-x","0px");
 card.style.setProperty("--sga-card-flight-y",flightY+"px");
 card.style.setProperty("--sga-card-rotation",FUTURE_ARCANA_LAYER.rotation+"deg");
 return true;
}
function handoffArcanaFromPose04To05(){
 const shion=root?.querySelector(".sga-shion-main");
 const card=root?.querySelector(".sga-card");
 if(!shion||!card||!futureArcanaHandoff)throw new Error("Arcana handoff is not registered from pose 04");
 const raf=window.requestAnimationFrame||((fn)=>fn());
 return new Promise(resolve=>{
  raf(()=>{
   // Atomic ownership transfer: pose 04's painted card disappears in the same
   // rendering turn that pose 05 and the already-positioned independent card appear.
   // Do not realign Shion or rewrite card geometry here.
   shion.src=ASSETS.shion[4];
   shion.classList.add("visible");
   card.classList.add("sga-card-handoff-visible");
   root.classList.add("sga-card-handed-off");
   resolve();
  });
 });
}
function positionWorldRiftFromCard(){
 const card=root?.querySelector(".sga-card"),rift=root?.querySelector(".sga-world-rift");
 if(!card||!rift)return false;
 const startX=parseFloat(card.style.left),startY=parseFloat(card.style.top);
 const flightY=parseFloat(card.style.getPropertyValue("--sga-card-flight-y"))||-110;
 if(![startX,startY,flightY].every(Number.isFinite))return false;
 const width=root?.clientWidth||window.innerWidth||390;
 const height=root?.clientHeight||window.innerHeight||844;
 const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
 const ox=clamp(startX/width,.06,.94);
 const oy=clamp((startY+flightY)/height,.055,.34);
 const point=(x,y)=>clamp(x,0,1).toFixed(4)+" "+clamp(y,0,1).toFixed(4);
 const path=(points)=>"M "+points.map(([x,y])=>point(x,y)).join(" L ");
 const paths=Object.freeze({
  primary:path([[ox,oy],[ox+.008,oy-.026],[ox-.005,oy-.062],[ox+.012,oy-.105],[ox-.006,.012]]),
  "major-left":path([[ox-.005,Math.max(.018,oy-.062)],[ox*.58,.12],[.28,.21],[.045,.30]]),
  "major-right":path([[ox+.012,Math.max(.018,oy-.105)],[ox+(1-ox)*.34,.11],[.72,.20],[.965,.27]]),
  "major-lower":path([[ox,oy],[ox*.62,Math.min(.48,oy+.13)],[.34,.40],[.075,.55]]),
  "minor-left":path([[.28,.21],[.22,.115],[.14,.068]]),
  "minor-right":path([[.72,.20],[.82,.135],[.91,.18]]),
  "minor-lower":path([[.34,.40],[.49,.485],[.64,.455]])
 });
 for(const [name,d] of Object.entries(paths)){
  rift.querySelectorAll('[data-rift="'+name+'"]').forEach(el=>el.setAttribute("d",d));
 }
 rift.style.setProperty("--sga-rift-origin-x",(ox*100).toFixed(2)+"%");
 rift.style.setProperty("--sga-rift-origin-y",(oy*100).toFixed(2)+"%");
 return true;
}
function replayClass(el,className){if(!el)return;el.classList.remove(className);void el.offsetWidth;el.classList.add(className)}
function gateShell(){return document.getElementById("game-shell")}
function setGateState(state){const shell=gateShell();if(!shell)return;shell.classList.remove(...GATE_STATES);if(state)shell.classList.add(state)}
function cleanupGateState({preserveFinal=false}={}){const shell=gateShell();if(!shell)return;shell.classList.remove("sga-sequence-active",...GATE_STATES);if(preserveFinal)shell.classList.add("sga-anomaly-rest")}
function samePoint(a,b){return Math.abs(a.x-b.x)<.001&&Math.abs(a.y-b.y)<.001}
function darkEnergyFrame(n){
 const el=document.querySelector(".sga-dark-energy-frame");
 if(!el)throw new Error("Dark energy sprite layer unavailable");
 el.src=ASSETS.darkEnergy[n-1];
}
async function playCelestialGateLight(){
 const shell=gateShell();
 const layers=[...document.querySelectorAll(".sga-sequence-layer")];
 if(!shell||layers.length!==4)throw new Error("Celestial four-stage sequence unavailable");
 const phase=async(state,hold,overlap=0,flash=false)=>{
   setGateState(state);
   if(overlap)shell.classList.add("sga-sequence-overlap");
   if(flash){
     shell.classList.remove("sga-sequence-flash-on");
     void shell.offsetWidth;
     shell.classList.add("sga-sequence-flash-on");
   }
   if(overlap){
     await pause(overlap);
     shell.classList.remove("sga-sequence-overlap");
     await pause(Math.max(0,hold-overlap));
   }else await pause(hold);
   if(flash)shell.classList.remove("sga-sequence-flash-on");
 };
 await pause(150);
 await phase("sga-celestial-frame-01",600);
 await phase("sga-celestial-frame-02",850,200);
 await phase("sga-celestial-frame-03",730,180,true);
 await phase("sga-celestial-frame-04",650,150,true);
}
async function playDarkEnergyReverse(){
 const shell=gateShell(),el=document.querySelector(".sga-dark-energy-frame");
 if(!shell||!el)throw new Error("Dark energy reverse-flow unavailable");
 darkEnergyFrame(1);setGateState("sga-dark-frame-01");await pause(600);
 setGateState("sga-dark-frame-02");shell.classList.add("sga-dark-01-02-overlap");await pause(200);
 shell.classList.remove("sga-dark-01-02-overlap");await pause(400);
 setGateState("sga-dark-frame-03");shell.classList.add("sga-dark-02-03-overlap");await pause(180);
 shell.classList.remove("sga-dark-02-03-overlap");await pause(420);
 setGateState("sga-dark-frame-04");shell.classList.add("sga-dark-03-04-overlap");await pause(150);
 shell.classList.remove("sga-dark-03-04-overlap");await pause(450);
 setGateState("sga-dark-frame-rise");
 await pause(850);
 setGateState("sga-dark-afterglow");
 await pause(360);
}
function gateIsFramed(state){
 const {origin,camera,viewport,scale}=state||{};if(!origin||!camera||!viewport||!scale)return false;
 const left=(GATE_BOUNDS.left*scale.x-origin.x)*camera.zoom;
 const right=(GATE_BOUNDS.right*scale.x-origin.x)*camera.zoom;
 const top=(GATE_BOUNDS.top*scale.y-origin.y)*camera.zoom;
 const bottom=(GATE_BOUNDS.bottom*scale.y-origin.y)*camera.zoom;
 return left>=-1&&right<=viewport.width+1&&top>=-1&&bottom<=viewport.height+1;
}
function overscanCoversViewport(state){
 const {origin,camera,viewport,scale}=state||{};
 const values=[origin?.y,scale?.y,camera?.zoom,viewport?.height];
 if(!values.every(Number.isFinite)||scale.y<=0||camera.zoom<=0||viewport.height<=0)return false;
 const viewportTop=origin.y/scale.y;
 const viewportBottom=(origin.y+viewport.height/camera.zoom)/scale.y;
 const overscanBottom=CINEMATIC_SKY_OVERSCAN.y+CINEMATIC_SKY_OVERSCAN.h;
 const topSafety=viewportTop-CINEMATIC_SKY_OVERSCAN.y;
 return viewportTop>=CINEMATIC_SKY_OVERSCAN.y&&viewportTop<=overscanBottom&&topSafety>=OVERSCAN_COVERAGE.minimumTopSafety&&viewportBottom>=OVERSCAN_COVERAGE.mainSceneTop;
}
async function resonance(){
 const camera=window.TarotCinematicCamera;if(!camera)throw new Error("Cinematic camera unavailable");
 const stage=window.TarotStage;
 const shionStart=stage?.getState?.().actors?.shion||camera.getState().player;
 const lumiereStart=stage?.getState?.().actors?.lumiere;
 if(!stage||!lumiereStart)throw new Error("Lumiere stage state unavailable");
 const faceGate=stage.perform({type:"face",actor:"lumiere",target:"gate"});
 const faced=await faceGate.promise;
 const lumiereFaced=stage.getState().actors.lumiere;
 if(!faced?.completed||!samePoint(lumiereStart,lumiereFaced))throw new Error("Lumiere moved while facing Star Gate");
 await pause(220);
 gateShell()?.classList.add("sga-sequence-active");
 setGateState(null);
 const framed=await camera.frameBounds(GATE_BOUNDS,1550,{padding:14,minZoom:.48});
 const framedState=camera.getState();
 if(!framed?.completed||!gateIsFramed(framedState)||!overscanCoversViewport(framedState))throw new StarGateOverscanCoverageError();
 await pause(800);
 await playCelestialGateLight();
 setGateState("sga-normal-flow");await pause(520);
 setGateState("sga-resonance-complete");await pause(1200);
 await say("shion","……星門は、特におかしくないな。");
 await pause(400);
 setGateState("sga-anomaly-flicker");await pause(720);
 const lumiereDuringAnomaly=stage.getState().actors.lumiere;
 if(!samePoint(lumiereStart,lumiereDuringAnomaly))throw new Error("Lumiere moved during Star Gate anomaly");
 setGateState("sga-anomaly");await pause(480);
 setGateState("sga-reverse-gate");await pause(520);
 await playDarkEnergyReverse();
 setGateState("sga-anomaly-rest");await pause(700);
 await say("lumiere","……？");
 const returned=await camera.returnToPlayer(1350);if(!returned?.completed)throw new Error("Cinematic camera return interrupted");
 camera.release();gateShell()?.classList.remove("sga-sequence-active");await pause(220);
 const shionEnd=window.TarotStage?.getState?.().actors?.shion||camera.getState().player;
 if(!samePoint(shionStart,shionEnd))throw new Error("Shion moved during Star Gate cinematic");
}
async function futureFixationStage1(){
 const stage=window.TarotStage;
 const before=stage?.getState?.().actors?.shion;
 if(!before)throw new Error("Shion stage state unavailable before Future Fixation Vision");
 // False safety: the existing camera return must be fully visible before reality disconnects.
 await pause(900);
 root.classList.add("sga-future-stage1","sga-future-blink-1");await pause(100);
 root.classList.remove("sga-future-blink-1");await pause(150);
 root.classList.add("sga-future-blink-2");await pause(150);
 root.classList.remove("sga-future-blink-2");await pause(200);
 window.TarotAudio?.setCinematicSilence?.(true,200);
 root.classList.add("sga-future-black");await pause(500);
 // Keep the world actor at its exact world coordinate; visibility is the only actor mutation.
 window.TarotActorVisibility?.set("shiopon",0);
 window.TarotActorVisibility?.set("lumiere",0);
 window.TarotActorVisibility?.set("shion",0);
 gateShell()?.classList.add("sga-future-world-hidden");
 root.classList.add("sga-future-shion-only");
 // Orientation only: keep the verified world coordinate locked.
 const face=(dx,dy)=>stage.perform({type:"face",actor:"shion",target:{x:before.x+dx,y:before.y+dy}});
 face(0,1);
 root.classList.remove("sga-future-black");
 const vis=window.TarotActorVisibility;
 if(vis){for(let i=1;i<=12;i++){vis.set("shion",i/12);await pause(500/12)}}else await pause(500);
 await say("shion","……？");await pause(250);
 face(-1,0);await pause(350);
 face(1,0);await pause(350);
 face(0,1);await pause(250);
 await say("shion","なんだ……？");
 await say("shion","リュミエール……？");await pause(500);
 await say("shion","……ここは、どこだ？");
 const after=stage.getState().actors.shion;
 if(!samePoint(before,after))throw new Error("Shion moved during Future Fixation Vision Stage 1");
 window.dispatchEvent(new CustomEvent("tarot-breaker:future-fixation-stage1-complete",{detail:{checkpoint:true}}));
}

async function futureFixationStage2(){
 const stage=window.TarotStage;
 const camera=window.TarotCinematicCamera;
 const vision=window.TarotVisionWorld;
 const before=stage?.getState?.().actors?.shion;
 if(!before)throw new Error("Shion stage state unavailable before Future Fixation Vision Stage 2");
 if(!camera||!vision)throw new Error("Future Fixation Vision world/camera API unavailable");
 // Actor isolation remains owned by the canvas renderer for the entire vision.
 const actorVisibility=window.TarotActorVisibility;
 actorVisibility?.set("shiopon",0);
 actorVisibility?.set("lumiere",0);
 // Load the authored ruins into the same 1448x1086 reference world as the garden.
 // No viewport cover, CSS translation or actor relocation is permitted.
 await vision.begin(ASSETS.ruins);
 root.classList.add("sga-future-ruins");
 // The current Shion becomes an observer as the ruined future itself appears.
 // Fade the completed actor composite from 1.0 to 0.55 in lockstep with the
 // 850ms Vision World reveal; Future Shion does not own this transition.
 for(let i=1;i<=20;i++){
  const progress=i/20;
  vision.setOpacity(progress);
  actorVisibility?.set("shion",1-(1-FUTURE_VISION_CURRENT_SHION_OPACITY)*progress);
  await pause(850/20);
 }
 await say("shion","……星門庭園……？");await pause(350);
 await say("shion","いや……");
 await say("shion","そんなはず……");await pause(450);
 // Real camera tour over the Vision World. Overscan is deliberately disabled
 // so no shot can reveal pixels outside the reference world.
 const verifyCoverage=(shot)=>{
  if(camera.isViewportInsideWorld?.()===false)throw new Error(`Future Fixation Vision camera coverage failed: ${shot}`);
 };
 await camera.panTo("gate",900,{allowOverscan:false});verifyCoverage("gate");await pause(700);
 await camera.panTo({x:430,y:500},950,{allowOverscan:false});verifyCoverage("left");await pause(500);
 await camera.panTo("fountain",950,{allowOverscan:false});verifyCoverage("fountain");await pause(900);
 await say("shion","……どうして……");
 await camera.returnToPlayer(900);verifyCoverage("return");await pause(600);
 const after=stage.getState().actors.shion;
 if(!samePoint(before,after))throw new Error("Shion moved during Future Fixation Vision Stage 2");
 window.dispatchEvent(new CustomEvent("tarot-breaker:future-fixation-stage2-complete",{detail:{checkpoint:true}}));
}

function faceVectorForDir(dir){
 return dir==="up"?{x:0,y:-1}:dir==="left"?{x:-1,y:0}:dir==="right"?{x:1,y:0}:{x:0,y:1};
}
function flinchVectorForDir(dir){
 return dir==="up"?{x:1,y:0}:dir==="right"?{x:0,y:1}:dir==="down"?{x:-1,y:0}:{x:0,y:-1};
}
async function restorePresentAfterFutureFixation(before){
 const stage=window.TarotStage;
 const vis=window.TarotActorVisibility;
 const vision=window.TarotVisionWorld;
 if(!stage||!vision)throw new Error("Present-world restore API unavailable after Future Fixation Vision");

 // Cut to black first. Nothing in the future is allowed to disappear visibly.
 root.classList.add("sga-future-return-black");
 await pause(220);

 // Restore the authored present garden behind the blackout. No camera movement.
 vision.end();
 gateShell()?.classList.remove("sga-future-world-hidden");
 vis?.reset?.();
 root.classList.add("sga-present-restored");
 const rift=root.querySelector(".sga-world-rift");
 rift?.classList.remove("sga-rift-ready","sga-rift-primary-active","sga-rift-full-active");
 await pause(80);

 // Reveal the present in place.
 root.classList.remove("sga-future-return-black");
 await pause(260);

 // Let the return land before Shion reacts. No dialogue.
 await pause(650);

 // A short startled body response using facing only: world coordinates stay fixed.
 const current=stage.getState().actors.shion;
 const flinch=flinchVectorForDir(before.dir||current.dir||"down");
 const original=faceVectorForDir(before.dir||current.dir||"down");
 await stage.perform({type:"face",actor:"shion",target:{x:before.x+flinch.x,y:before.y+flinch.y}}).promise;
 await pause(140);
 await stage.perform({type:"face",actor:"shion",target:{x:before.x+original.x,y:before.y+original.y}}).promise;
 await pause(220);

 // Sound returns only after the player has had a silent beat in the present.
 window.TarotAudio?.setCinematicSilence?.(false,300);
 await pause(250);

 const after=stage.getState().actors.shion;
 if(!samePoint(before,after))throw new Error("Shion moved while returning from Future Fixation Vision");
 window.dispatchEvent(new CustomEvent("tarot-breaker:future-fixation-return-complete",{detail:{checkpoint:true}}));
}

async function futureFixationStage3(){
 const stage=window.TarotStage;
 const before=stage?.getState?.().actors?.shion;
 if(!before)throw new Error("Shion stage state unavailable before Future Fixation Vision Stage 3");
 const vis=window.TarotActorVisibility;
 vis?.set("shiopon",0);vis?.set("lumiere",0);
 if(vis&&Math.abs(vis.getState().shion-FUTURE_VISION_CURRENT_SHION_OPACITY)>1e-6)
  throw new Error("Current Shion opacity drifted before Future Fixation Vision Stage 3");

 futureArcanaHandoff=null;
 const card=root.querySelector(".sga-card");
 const surge=root.querySelector(".sga-card-surge");
 const worldRift=root.querySelector(".sga-world-rift");
 if(!card||!surge||!worldRift)throw new Error("Future Fixation Stage 3 anomaly layers unavailable");

 root.classList.add("sga-card-phase","sga-future-shion-settle");
 window.TarotAudio?.setCinematicSilence?.(false,240);

 // SEQUENCE 01 — Future Shion is visually distinct, but this effect never moves him.
 setShion(1);
 const entryEcho=playFutureShionEntryEcho();
 await pause(760);
 await entryEcho;
 await say("shion","……？");await pause(180);
 setShion(2);await pause(520);
 setShion(3);await pause(560);

 // SEQUENCE 02 — pose 03 has already completed the act of checking the Arcana.
 window.TarotAudio?.setCinematicSilence?.(true,160);
 await pause(720);
 await say("shion","……アルカナが……？");
 await pause(260);

 // SEQUENCE 03 — Arcana acts first. Effect-only dark-purple stain/upflow;
 // the independent card remains fully hidden.
 positionArcanaSurgeFromPose03();
 root.classList.add("sga-arcana-surge");
 await pause(180);

 // SEQUENCE 04 — only now does the force reach Shion.
 root.classList.add("sga-forced-raise-jolt");
 await say("shion","……っ");
 root.classList.remove("sga-forced-raise-jolt");

 // SEQUENCE 05 — forced raise: 03 is pulled ~2px upward, then 04 settles back.
 root.classList.add("sga-arcana-surge-transfer");
 await crossfadeFutureShion(4,100,{liftOld:true});

 // Pose 04 alone owns the visible card. Freeze its launch point once.
 registerFutureArcanaHandoff();
 positionArcanaSurgeFromHandoff();
 root.classList.remove("sga-arcana-surge-transfer");
 root.classList.add("sga-arcana-pressure");
 await pause(350);

 // Final pressure increase before the card escapes; Shion otherwise holds still.
 root.classList.add("sga-arcana-pressure-peak");
 await pause(120);

 // SEQUENCE 07 — atomic 04 -> 05 handoff. Never display two cards.
 await handoffArcanaFromPose04To05();
 root.classList.remove("sga-arcana-surge","sga-arcana-pressure","sga-arcana-pressure-peak","sga-arcana-surge-transfer");

 // SEQUENCE 08 — empty hand registers.
 await pause(100);

 // SEQUENCE 09 — card rises from the frozen pose-04 hand point, transform only.
 replayClass(card,"sga-card-flight");
 await pause(1650);

 // SEQUENCE 10 — overhead stop. Hold the completed vertical flight before
 // any world response so the isolated Arcana composition can register.
 await pause(450);

 // PRIMARY_RIFT — the same vertical axis continues from hand -> Arcana -> space.
 positionWorldRiftFromCard();
 worldRift.classList.add("sga-rift-ready","sga-rift-primary-active");
 await pause(220);

 // FULL_WORLD_RIFT / WORLD_COLOR_LOSS — branches spread across the visible
 // world before Shion speaks. This is spatial failure, not another building collapse.
 worldRift.classList.add("sga-rift-full-active");
 root.classList.add("sga-world-omen");
 await pause(600);

 await say("shion","……アルカナだけじゃない……");
 await pause(300);
 await say("shion","……世界が、この未来を選んでいるのか？");

 // NO_RESPONSE — the already-visible rift does not grow, flash, move or answer.
 await pause(750);

 // SEQUENCE 11 — Arcana blackening resumes independently. Existing rift cores
 // deepen through CSS only; no new branches are introduced.
 root.classList.add("sga-card-blackening");
 await pause(800);
 root.classList.add("sga-card-blackened");
 await pause(500);

 // FINAL_FUTURE_FRAME — hold the full world-failure composition before the cut.
 await pause(700);

 window.dispatchEvent(new CustomEvent("tarot-breaker:future-fixation-arcana-anomaly-complete",{detail:{checkpoint:true}}));

 // SEQUENCE 13 — black cut -> present -> silent beat -> current Shion reaction.
 await restorePresentAfterFutureFixation(before);

 const after=stage.getState().actors.shion;
 if(!samePoint(before,after))throw new Error("Shion moved during Future Fixation Vision Stage 3");
 window.dispatchEvent(new CustomEvent("tarot-breaker:future-fixation-stage3-complete",{detail:{checkpoint:true}}));
}
async function fadeNpc(actorId,duration=360){
 const vis=window.TarotActorVisibility;if(!vis)return;
 const steps=12;for(let i=1;i<=steps;i++){vis.set(actorId,1-i/steps);await pause(duration/steps)}
}
async function vision(){
 const v=root.querySelector(".sga-vision"),pan=root.querySelector(".sga-pan"),card=root.querySelector(".sga-card");
 await Promise.all([fadeNpc("shiopon"),fadeNpc("lumiere")]);
 root.classList.add("sga-darken");await pause(650);
 v.classList.add("visible");root.classList.add("sga-vision-mode");await pause(850);
 pan.classList.add("survey-fountain");await pause(1300);
 pan.classList.add("survey-upper");await pause(1600);
 pan.classList.add("survey-gate");await pause(1700);
 // Only now transition from the normal-size world Shion to the cinematic pose layer.
 window.TarotActorVisibility?.set("shion",0);
 root.classList.add("sga-card-phase");setShion(1);await pause(520);setShion(2);await pause(500);setShion(3);await pause(900);setShion(4);await pause(520);setShion(5);await pause(120);
 card.classList.add("visible");await pause(480);card.classList.add("ascend");await pause(1650);card.classList.add("transformed");await pause(1500);card.classList.add("floating");await pause(700);
 await say(null,"――選べ。");await pause(600);
 root.querySelector(".sga-cut").classList.add("show");await pause(260);v.classList.remove("visible");root.classList.remove("sga-vision-mode","sga-darken");window.TarotActorVisibility?.reset();await pause(300);
}
async function aftermath(){
 root.querySelector(".sga-impurity").classList.add("visible");
 await say("shiopon","……シオンさん？");await say("shion","……今のは……。");await say("shiopon","……え？");await say("lumiere","離れてください。");
 try{await window.TarotStage?.perform?.({type:"approach",actor:"lumiere",target:"shion",distance:48,duration:520})?.promise}catch{}
 await say("shion","星門の拒絶？");await say("lumiere","……いいえ。拒絶ではありません。");await say("shion","共鳴が足りない？");await say("lumiere","それも違います。");await pause(420);
 await say("lumiere","星門の故障とも……違う。");await say("shion","だったら、これは何？");await pause(500);await say("lumiere","……わかりません。");await pause(650);
 await say("lumiere","少なくとも、私の知る星門の異常には……当てはまりません。");await say("shiopon","……シオンさん。");await say("shion","どうした？");await say("shiopon","声が……変なの。");await say("shion","声？");await say("shiopon","うん……。");await pause(420);await say("shiopon","ひとつ……すごく遠くなった気がする。");await pause(500);
 await say("lumiere","……アリエット様のところへ。");await say("shion","アリエット？");await say("lumiere","星界の声について、私より深く聞き取れる方です。");
}
function complete(){
 const p=window.TarotProgressCore?.createProgress?.();if(!p)throw new Error("Progress unavailable");
 const out=p.completeEvent("garden_star_gate_anomaly",{mapId:"star_gate_garden",spawnId:"south_gate"});
 if(!out.state)throw new Error("Progress completion failed");
 window.dispatchEvent(new Event("tarot-breaker:star-gate-anomaly-complete"));
}
async function run(){
 if(running)return;running=true;let success=false;
 try{
  if(!DEV_HARNESS){
   const p=window.TarotProgressCore?.createProgress?.();if(!p)throw new Error("Progress unavailable");
   const loaded=p.load();if(loaded.status!=="valid")throw new Error("Progress invalid at Star Gate start");
   if(p.isEventCompleted("garden_star_gate_anomaly"))return;
   if(!p.isEventCompleted("garden_lumiere_gate"))throw new Error("Lumiere gate prerequisite missing at Star Gate start");
  }
  const promptLocked=window.TarotStarGateInteraction?.getState?.().promptLock===true;
  if(!promptLocked){window.dispatchEvent(new Event("tarot-breaker:interaction-start"));interactionOwned=true}
  await preload();mount();root.classList.add("active");root.setAttribute("aria-hidden","false");
  await resonance();
  if(DEV_HARNESS){success=true;window.dispatchEvent(new CustomEvent("tarot-breaker:star-gate-sequence-complete",{detail:{checkpoint:true}}));if(FUTURE_STAGE1_DEV){await futureFixationStage1();await futureFixationStage2();await futureFixationStage3()}return;}
  await vision();await aftermath();complete();success=true;
 }catch(e){console.error("Star Gate anomaly aborted",e)}
 finally{resolveAdvance=null;ui?.hide();window.TarotCinematicCamera?.release?.();window.TarotActorVisibility?.reset?.();window.TarotVisionWorld?.end?.();gateShell()?.classList.remove("sga-future-world-hidden");window.TarotAudio?.setCinematicSilence?.(false,200);cleanupGateState({preserveFinal:success});if(root){root.className="";root.classList.add("active");root.classList.remove("active");root.setAttribute("aria-hidden","true")}running=false;const release=interactionOwned||window.TarotStarGateInteraction?.getState?.().promptLock===true;interactionOwned=false;if(release)window.dispatchEvent(new Event("tarot-breaker:interaction-end"));if(!success)window.dispatchEvent(new Event("tarot-breaker:star-gate-anomaly-abort"))}
}
window.addEventListener("tarot-breaker:star-gate-investigate",run);
window.TarotStarGateAnomaly=Object.freeze({start:run,getState:()=>({running})});
})();
