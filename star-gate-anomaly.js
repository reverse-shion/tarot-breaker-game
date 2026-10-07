(() => {
"use strict";
if(!window.__TAROT_DEV_STAGE3__ || new URLSearchParams(location.search).get("dev")!=="star-gate-full")return;
const ASSETS={
 cardNormal:"./assets/tarot/backs/tarot-card-back.webp",
 shionCheckRe:"./assets/events/star-gate/future-fixation/shion/shion_card_03_check_re.webp",
 cardDetail:"./assets/events/star-gate/future-fixation/card/arcana-transformed-detail.png",
 sky:"./assets/maps/star-country-farthest-sky-background-extended.webp",
 ruins:"./assets/events/gate-vision/ruins.webp",smoke:"./assets/events/gate-vision/smoke.webp",void:"./assets/events/gate-vision/void.webp",
 shion:["./assets/sprites/shion/shion_card_01_reach.webp","./assets/sprites/shion/shion_card_02_draw.webp","./assets/sprites/shion/shion_card_03_check.webp","./assets/sprites/shion/shion_card_04_raise.webp","./assets/sprites/shion/shion_card_05_reach.webp"],
 aura1:"./assets/sprites/shion/shion_card_dark_aura_01.webp",aura2:"./assets/sprites/shion/shion_card_dark_aura_02.webp",
 anomalyGate:"./assets/events/gate-vision/garden-star-gate.webp",
 darkEnergy:["./assets/events/gate-vision/dark_energy_rise_01.webp","./assets/events/gate-vision/dark_energy_rise_02.webp","./assets/events/gate-vision/dark_energy_rise_03.webp","./assets/events/gate-vision/dark_energy_rise_04.webp"],
 celestialLight:["./assets/events/gate-vision/celestial_gate_light_01.webp","./assets/events/gate-vision/celestial_gate_light_02.webp","./assets/events/gate-vision/celestial_gate_light_03.webp","./assets/events/gate-vision/celestial_gate_light_04.webp"]
};
const GATE_BOUNDS=Object.freeze({left:520,top:-163.33333333333331,right:1080,bottom:210});
const CINEMATIC_SKY_OVERSCAN=Object.freeze({x:0,y:-480,w:1448,h:640});
const OVERSCAN_COVERAGE=Object.freeze({minimumTopSafety:80,mainSceneTop:0});
const GATE_STATES=Object.freeze(["sga-sky-descent","sga-normal-flow","sga-resonance-complete","sga-anomaly-flicker","sga-anomaly","sga-reverse-gate","sga-reverse-flow","sga-skyward-release","sga-anomaly-rest","sga-dark-frame-01","sga-dark-frame-02","sga-dark-frame-03","sga-dark-frame-04","sga-dark-frame-rise","sga-dark-afterglow","sga-celestial-frame-01","sga-celestial-frame-02","sga-celestial-frame-03","sga-celestial-frame-04"]);
class StarGateOverscanCoverageError extends Error{constructor(){super("Star Gate cinematic framing or sky overscan coverage failed");this.name="StarGateOverscanCoverageError"}}
const sleep=ms=>session?session.clock.wait(ms):new Promise(r=>setTimeout(r,ms));
const DEV_MODE=new URLSearchParams(location.search).get("dev");
const DEV_HARNESS=["star-gate-full","star-gate-camera","future-fixation-stage1"].includes(DEV_MODE);
const FUTURE_STAGE1_DEV=DEV_MODE==="star-gate-full";
let running=false,ui=null,root=null,resolveAdvance=null,interactionOwned=false;
let session=null,sessionId=0,lastResult=null;
const preparedImages=new Map();
function image(src){
 if(preparedImages.has(src))return Promise.resolve(preparedImages.get(src));
 return new Promise((resolve,reject)=>{const current=session;const i=new Image();i.onload=async()=>{try{if(i.decode)await i.decode();if(!i.naturalWidth)throw new Error("Invalid decoded image");current?.clock.assert();preparedImages.set(src,i);resolve(i)}catch(e){reject(e)}};i.onerror=()=>reject(new Error("Asset failed: "+src));i.src=src});
}
async function preload(){
 const current=session;let completed=false,error;
 const sky=document.querySelector(".scene-farthest-sky--extended > img");
 const skyDecoded=sky?.decode?sky.decode().then(()=>{current.clock.assert();if(!sky.naturalWidth||!sky.naturalHeight)throw new Error("Extended sky decode failed");}):Promise.reject(new Error("Extended sky decode unavailable"));
 Promise.all([skyDecoded,...[...Object.values(ASSETS).flat(),...window.TarotFutureStage3.ASSETS.map(a=>a.path)].map(image)]).then(()=>completed=true,e=>error=e);
 const start=current.clock.now();
 while(!completed){current.clock.assert();if(error)throw error;if(current.clock.now()-start>=10000)throw new Error("Stage 3 preload deadline");await current.clock.wait(16);}
 for(const a of window.TarotFutureStage3.ASSETS){const i=preparedImages.get(a.path);if(i.naturalWidth!==a.width||i.naturalHeight!==a.height)throw new Error("Asset registration mismatch: "+a.id);}
}
function mount(){
 if(root)return root;
 root=document.createElement("section");root.id="star-gate-anomaly";root.setAttribute("aria-hidden","true");
 root.innerHTML='<div class="sga-future-blackout" aria-hidden="true"></div><div class="sga-dim"></div><div class="sga-vision"><div class="sga-pan"><img class="sga-ruins" src="'+ASSETS.ruins+'" alt=""><img class="sga-smoke" src="'+ASSETS.smoke+'" alt=""><img class="sga-smoke second" src="'+ASSETS.smoke+'" alt=""><img class="sga-void" src="'+ASSETS.void+'" alt=""></div></div><div class="sga-world-omen-layer" aria-hidden="true"></div><div class="sga-future-composition" aria-hidden="true"><div class="sga-future-shion-frame"><img class="sga-shion sga-shion-main" alt=""><img class="sga-shion sga-shion-transition" aria-hidden="true" alt=""><div class="sga-card-surge" aria-hidden="true"></div></div><div class="sga-future-card-frame"><div class="sga-card" aria-hidden="true"><img class="aura1" src="'+ASSETS.aura1+'" alt=""><img class="aura2" src="'+ASSETS.aura2+'" alt=""></div></div></div><div class="sga-cut"></div><div class="sga-impurity"></div>';
 document.getElementById("game-shell")?.appendChild(root);return root;
}
// Alpha bounds measured from the unchanged source images; preserve aspect ratios.
const ARCANA_DETAIL_REGISTRATION=Object.freeze({
 normal:{width:1024,height:1536,bounds:{left:98,top:46,right:920,bottom:1458}},
 re:{width:853,height:1280,bounds:{left:48,top:26,right:805,bottom:1247}}
});
async function showArcanaDetail(){
 const current=session;current.clock.assert();
 const normal=preparedImages.get(ASSETS.cardNormal),re=preparedImages.get(ASSETS.cardDetail);
 for(const [image,key] of [[normal,'normal'],[re,'re']]){
  const registration=ARCANA_DETAIL_REGISTRATION[key];
  if(!image||image.naturalWidth!==registration.width||image.naturalHeight!==registration.height)throw new Error("Arcana detail not decoded or registration mismatch: "+key);
 }
 if(!preparedImages.get(ASSETS.shionCheckRe)?.naturalWidth)throw new Error("Re pose03 not decoded");
 const layer=document.createElement("div");layer.className="sga-arcana-detail";layer.setAttribute("aria-hidden","true");
 const frame=document.createElement("div");frame.className="sga-arcana-detail-frame";layer.appendChild(frame);
 const k=Math.min((innerWidth-48)/853,(innerHeight-48)/1280);
 Object.assign(frame.style,{width:853*k+"px",height:1280*k+"px"});
 const images={};
 for(const [key,prepared] of [['normal',normal],['re',re]]){
  const card=prepared.cloneNode();card.className="sga-arcana-detail-image "+key;card.alt="";
  const r=ARCANA_DETAIL_REGISTRATION[key],rb=ARCANA_DETAIL_REGISTRATION.re.bounds;
  const scale=k*(rb.bottom-rb.top)/(r.bounds.bottom-r.bounds.top);
  Object.assign(card.style,{
   width:r.width*scale+"px",height:r.height*scale+"px",
   left:((rb.left+rb.right)/2*k-(r.bounds.left+r.bounds.right)/2*scale)+"px",
   top:((rb.top+rb.bottom)/2*k-(r.bounds.top+r.bounds.bottom)/2*scale)+"px",
   opacity:key==='normal'?'1':'0'
  });
  frame.appendChild(card);images[key]=card;
 }
 // A restrained black-purple contamination sits only on the entering edge.
 // It is a stain/front, not a full-card smoke aura or a magical ring.
 const contamination=document.createElement("div");
 contamination.className="sga-arcana-contamination";
 contamination.setAttribute("aria-hidden","true");
 frame.appendChild(contamination);
 // Re:Arcana starts completely hidden. It will eat in from the outer edge with a soft mask,
 // never from a clean circular wipe or a hard-edged clip.
 const setErosionMask=p=>{
  const progress=Math.max(0,Math.min(1,p));
  const advance=-10+120*progress;
  const solid=Math.max(0,Math.min(100,advance-7));
  const mid=Math.max(0,Math.min(100,advance+1));
  const feather=Math.max(0,Math.min(100,advance+11));
  const clear=Math.max(0,Math.min(100,advance+15));
  const mask='linear-gradient(103deg,rgba(0,0,0,1) 0%,rgba(0,0,0,1) '+solid.toFixed(2)+'%,rgba(0,0,0,.72) '+mid.toFixed(2)+'%,rgba(0,0,0,.22) '+feather.toFixed(2)+'%,rgba(0,0,0,0) '+clear.toFixed(2)+'%)';
  images.re.style.webkitMaskImage=mask;images.re.style.maskImage=mask;
 };
 setErosionMask(0);
 document.body.appendChild(layer);
 current.cardDetail={source:ASSETS.cardDetail,normalSource:ASSETS.cardNormal,startedAt:current.clock.now(),duration:4840,phases:[],pulses:[],registration:ARCANA_DETAIL_REGISTRATION};
 const phase=name=>{current.clock.assert();current.cardDetail.phase=name;current.cardDetail.phases.push({name,time:current.clock.now()});};
 const pulseSpecs=[
  {duration:210,gap:90,scale:.012,mist:.09},
  {duration:230,gap:100,scale:.018,mist:.17},
  {duration:260,gap:0,scale:.026,mist:.28}
 ];
 try{
  phase('NORMAL_HOLD');await current.clock.wait(550);

  // Three finite, increasingly legible pulses make the Arcana feel wrong before it is eaten.
  // The motion is intentionally small: the player should feel a beat, not see a zoom effect.
  phase('MICRO_ANOMALY');current.futureAudio?.arcanaAnomalyStart?.();
  for(let i=0;i<pulseSpecs.length;i++){
   const spec=pulseSpecs[i],number=i+1;
   current.cardDetail.pulses.push({number,time:current.clock.now(),scale:spec.scale,mist:spec.mist});
   current.futureAudio?.arcanaPulse?.(number);
   await current.clock.tween(spec.duration,p=>{
    const beat=Math.sin(Math.PI*p);
    const scale=1+spec.scale*beat;
    frame.style.transform='scale('+scale.toFixed(4)+')';
    images.normal.style.filter='brightness('+(1-.055*number*beat).toFixed(3)+') saturate('+(1-.035*number*beat).toFixed(3)+')';
    contamination.style.opacity=String(Math.max(.035,spec.mist*(.42+.58*beat)));
    contamination.style.transform='translateX('+(-5+number*1.5).toFixed(2)+'%) scaleX('+(1+.10*beat).toFixed(3)+')';
   });
   frame.style.transform='scale(1)';
   contamination.style.opacity=String(spec.mist);
   if(spec.gap)await current.clock.wait(spec.gap);
  }
  images.normal.style.filter='brightness(.95) saturate(.92)';

  // Re markings eat inward from the same contaminated card edge. The feathered
  // black-purple front travels with the rewrite so the pulse and erosion read as one event.
  phase('EDGE_EROSION');current.futureAudio?.arcanaInfectionStart?.();
  images.re.style.opacity='1';
  await current.clock.tween(1600,p=>{
   setErosionMask(p);
   images.normal.style.filter='brightness('+( .95-.16*p).toFixed(3)+') saturate('+( .92-.58*p).toFixed(3)+') contrast('+(1+.035*p).toFixed(3)+')';
   images.re.style.filter='brightness('+( .73+.10*p).toFixed(3)+') saturate('+( .48+.18*p).toFixed(3)+') contrast(1.045)';
   const front=-4+72*p;
   contamination.style.left=front.toFixed(2)+'%';
   contamination.style.opacity=String((.28*(1-p)+.08*Math.sin(Math.PI*p)).toFixed(3));
   contamination.style.transform='scaleX('+(1+.08*Math.sin(Math.PI*p)).toFixed(3)+')';
   current.futureAudio?.arcanaInfection?.(p);
  });

  // Cleanup is atomic but visually continuous: by this point the soft erosion front has already
  // consumed the whole card. No blackout and no silent gap are inserted at the switch.
  phase('RE_COMPLETE');
  frame.style.transform='scale(1)';
  contamination.style.opacity='0';
  images.normal.style.opacity='0';
  images.re.style.opacity='1';
  images.re.style.webkitMaskImage='none';images.re.style.maskImage='none';
  images.re.style.filter='brightness(.86) saturate(.72) contrast(1.04)';
  frame.classList.add('sga-rewrite-push','sga-re-residual');
  current.futureAudio?.arcanaRewrite?.();
  const main=root.querySelector('.sga-shion-main');main.src=ASSETS.shionCheckRe;

  // Give the player time to actually inspect the changed Arcana before the world answers.
  phase('RE_HOLD');await current.clock.wait(1800);current.clock.assert();
  root.classList.add('sga-rewrite-world-tension');
 }finally{layer.remove();current.cardDetail.endedAt=current.clock.now();}
}
function makeUi(){
 if(ui)return ui;
 ui=window.TarotDialogueUI.create({mount:document.getElementById("game-shell"),ids:{layer:"anomaly-dialogue-layer",advance:"anomaly-dialogue-advance",speaker:"anomaly-dialogue-speaker",text:"anomaly-dialogue-text"},onAdvance:()=>{if(ui.isTyping())ui.revealAll();else if(resolveAdvance){const r=resolveAdvance;resolveAdvance=null;r()}}});
 return ui;
}
async function say(actor,text){
 const current=session;current?.clock.assert();
 const names={shion:"シオン",shiopon:"しおぽん",lumiere:"リュミエール"};
 const d=makeUi();d.show({speaker:actor?names[actor]:"",text,actor:actor||""});d.setState("dialogue");
 await new Promise((resolve,reject)=>{
  const stop=()=>{resolveAdvance=null;d.hide();reject(new DOMException("Interrupted","AbortError"));};
  current?.controller.signal.addEventListener('abort',stop,{once:true});
  resolveAdvance=()=>{current?.controller.signal.removeEventListener('abort',stop);resolve();};
 });
 current?.clock.assert();d.hide();const closed=current?current.clock.now():performance.now();
 if(current)current.dialogues.push({text,closed});
 await sleep(100);return closed;
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
 return new Promise((resolve,reject)=>{
  raf(()=>{
   try{session?.clock.assert();}catch(e){reject(e);return;}
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
 const primary="M "+[
  point(ox,oy),
  point(ox+.008,oy-.026),
  point(ox-.005,oy-.062),
  point(ox+.012,oy-.105),
  point(ox-.006,.012)
 ].join(" L ");
 rift.querySelectorAll('[data-rift="primary"]').forEach(el=>el.setAttribute("d",primary));
 rift.style.setProperty("--sga-rift-origin-x",(ox*100).toFixed(2)+"%");
 rift.style.setProperty("--sga-rift-origin-y",(oy*100).toFixed(2)+"%");
 return true;
}
async function runWorldLossPrelude(worldLoss){
 if(!worldLoss)return;
 worldLoss.classList.add("sga-world-loss-active","sga-loss-left-active");
 window.TarotAudio?.setCinematicLevel?.(.82,360);
 await pause(500);

 worldLoss.classList.add("sga-loss-bottom-active");
 window.TarotAudio?.setCinematicLevel?.(.65,380);
 await pause(500);
}
async function continueWorldLossAfterRecognition(worldLoss){
 if(!worldLoss)return;
 worldLoss.classList.add("sga-loss-right-active");
 root.classList.add("sga-rift-recede");
 window.TarotAudio?.setCinematicLevel?.(.45,380);
 await pause(500);

 worldLoss.classList.add("sga-loss-center-active");
 window.TarotAudio?.setCinematicLevel?.(.28,420);
 await pause(550);
}
function prepareFinalCompositionReframe(){
 const shionFrame=root?.querySelector(".sga-future-shion-frame");
 const cardFrame=root?.querySelector(".sga-future-card-frame");
 const shion=root?.querySelector(".sga-shion-main");
 const card=root?.querySelector(".sga-card");
 if(!shionFrame||!cardFrame||!shion||!card)return false;
 const viewportWidth=root?.clientWidth||window.innerWidth||390;
 const viewportHeight=root?.clientHeight||window.innerHeight||844;
 const cardLeft=parseFloat(card.style.left),cardTop=parseFloat(card.style.top);
 const flightY=parseFloat(card.style.getPropertyValue("--sga-card-flight-y"))||-110;
 const shionLeft=parseFloat(shion.style.left),shionTop=parseFloat(shion.style.top);
 const shionWidth=parseFloat(shion.style.width),shionHeight=parseFloat(shion.style.height);
 if(![cardLeft,cardTop,flightY,shionLeft,shionTop,shionWidth,shionHeight].every(Number.isFinite))return false;

 const cardX=cardLeft;
 const cardY=cardTop+flightY;
 const shionX=shionLeft+shionWidth/2;
 const shionY=shionTop+shionHeight/2;
 const cardTargetX=viewportWidth*.50;
 const cardTargetY=viewportHeight*.41;
 const shionTargetX=viewportWidth*.50;
 const shionTargetY=viewportHeight*.59;

 cardFrame.style.setProperty("--sga-reframe-x",(cardTargetX-cardX)+"px");
 cardFrame.style.setProperty("--sga-reframe-y",(cardTargetY-cardY)+"px");
 shionFrame.style.setProperty("--sga-reframe-x",(shionTargetX-shionX)+"px");
 shionFrame.style.setProperty("--sga-reframe-y",(shionTargetY-shionY)+"px");
 return true;
}
async function playFinalCompositionReframe(){
 if(!prepareFinalCompositionReframe())throw new Error("Future Fixation final composition reframe unavailable");
 root.classList.add("sga-final-reframe");
 await pause(650);
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
 const analytic=viewportTop>=CINEMATIC_SKY_OVERSCAN.y&&viewportTop<=overscanBottom&&topSafety>=OVERSCAN_COVERAGE.minimumTopSafety&&viewportBottom>=OVERSCAN_COVERAGE.mainSceneTop;
 // World-coordinate overscan alone cannot prove the raster is present or covers the frame.
 const sky=document.querySelector('.scene-farthest-sky--extended > img');
 if(!analytic||!sky?.complete||!sky.naturalWidth||!sky.naturalHeight)return false;
 const rect=sky.getBoundingClientRect();
 const mainTop=(OVERSCAN_COVERAGE.mainSceneTop*scale.y-origin.y)*camera.zoom;
 return rect.left<=1&&rect.right>=viewport.width-1&&rect.top<=1&&rect.bottom>=Math.min(viewport.height,Math.max(0,mainTop))-1;

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
 session.clock.assert();const framedState=camera.getState();
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
 session.audio.pause();session.futureAudio?.pause('ENTRY_BLACK');
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
  if(i===1)session.futureAudio?.ruinsVisible();
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
 await camera.panTo("gate",900,{allowOverscan:false});session.clock.assert();verifyCoverage("gate");await pause(700);
 await camera.panTo({x:430,y:500},950,{allowOverscan:false});session.clock.assert();verifyCoverage("left");await pause(500);
 await camera.panTo("fountain",950,{allowOverscan:false});session.clock.assert();verifyCoverage("fountain");await pause(900);
 await say("shion","……どうして……");
 await camera.returnToPlayer(900);session.clock.assert();verifyCoverage("return");await pause(600);
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
 rift?.classList.remove("sga-rift-ready","sga-rift-primary-active");
 const loss=root.querySelector(".sga-world-loss");
 loss?.classList.remove("sga-world-loss-active","sga-loss-left-active","sga-loss-bottom-active","sga-loss-right-active","sga-loss-center-active","sga-loss-gate-active");
 root.classList.remove("sga-rift-recede","sga-future-void-frame","sga-last-light-lost","sga-gate-remains","sga-final-reframe");
 for(const frame of root.querySelectorAll(".sga-future-shion-frame,.sga-future-card-frame")){
  frame.style.removeProperty("--sga-reframe-x");
  frame.style.removeProperty("--sga-reframe-y");
 }
 await pause(80);

 // Reveal the present in place. Audio begins returning shortly after the image,
 // so the present world itself becomes the release.
 root.classList.remove("sga-future-return-black");
 await pause(150);
 window.TarotAudio?.setCinematicSilence?.(false,400);
 await pause(500);

 // A short startled body response using facing only: world coordinates stay fixed.
 const current=stage.getState().actors.shion;
 const flinch=flinchVectorForDir(before.dir||current.dir||"down");
 const original=faceVectorForDir(before.dir||current.dir||"down");
 await stage.perform({type:"face",actor:"shion",target:{x:before.x+flinch.x,y:before.y+flinch.y}}).promise;
 await pause(140);
 await stage.perform({type:"face",actor:"shion",target:{x:before.x+original.x,y:before.y+original.y}}).promise;
 await pause(220);

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
 if(!card||!surge)throw new Error("Future Fixation Stage 3 anomaly layers unavailable");

 root.classList.add("sga-card-phase","sga-future-shion-settle");
 // Future tracks retain ownership; the ordinary BGM stays paused.

 // SEQUENCE 01 — Future Shion is visually distinct, but this effect never moves him.
 setShion(1);
 const entryEcho=playFutureShionEntryEcho();
 await pause(760);
 await entryEcho;
 await say("shion","……？");await pause(180);
 setShion(2);await pause(520);
 setShion(3);await pause(560);
 session.r0={pose:3,source:ASSETS.shionCheckRe,audio:session.audio.capture(),actorOpacity:vis?.getState().shion};

 await showArcanaDetail();

 // SEQUENCE 02 — Re:Arcana holds still first. 650ms after the rewrite the world answers
 // with one restrained 720ms desaturation pulse; it must remain below the later Rift.
 await pause(720);
 root.classList.remove('sga-rewrite-world-tension');
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
 session.scene.freezeCamera();session.fixed=actorGeometry(5);
 root.classList.remove("sga-arcana-surge","sga-arcana-pressure","sga-arcana-pressure-peak","sga-arcana-surge-transfer");

 // SEQUENCE 08 — empty hand registers.
 await pause(100);

 // SEQUENCE 09 — card rises from the frozen pose-04 hand point, transform only.
 replayClass(card,"sga-card-flight");
 await pause(1650);

 // SEQUENCE 10 — overhead stop. The Arcana is the only new movement.
 await pause(450);

 await runStage3Latter(before);

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
function actorGeometry(pose){
 const node=root.querySelector('.sga-shion-main'),r=node.getBoundingClientRect(),scale=r.height/512;
 const foot=pose===3?{x:256,y:503}:{x:256,y:496};
 return {left:r.left,top:r.top,width:r.width,height:r.height,scale,footX:r.left+foot.x*scale,footY:r.top+foot.y*scale};
}
function arcanaGeometry(){const card=root.querySelector('.sga-card'),r=card?.getBoundingClientRect();let rotation=0;
 for(let n=card;n&&n!==document.body;n=n.parentElement){const value=getComputedStyle(n).transform;if(value&&value!=='none'){const matrix=new DOMMatrixReadOnly(value);rotation+=Math.atan2(matrix.b,matrix.a)*180/Math.PI;}}
 return r?{x:r.left+r.width/2,y:r.top+r.height/2,width:r.width,height:r.height,rotation}:null;}
function assertGeometry(a,b,keys){for(const k of keys)if(Math.abs(a[k]-b[k])>1)throw new Error('Fixed geometry changed: '+k);}
async function runStage3Latter(before){
 const current=session,scene=current.scene,audio=current.audio,main=root.querySelector('.sga-shion-main');
 const card=root.querySelector('.sga-card');
 if(!current.fixed)current.fixed=actorGeometry(5);
 current.arcana=arcanaGeometry();scene.freezeCamera();
 const bounds=root.getBoundingClientRect(),anchor={x:current.arcana.x-bounds.left,y:current.arcana.y-bounds.top};
 const rifts=document.createElement('div');rifts.className='sga-future-rift';
 const nodes={};for(const registration of window.TarotFutureStage3.ASSETS){
  const img=document.createElement('img');img.className='rift-'+registration.id;img.alt='';img.src=registration.path;
  const width=bounds.width*registration.viewportWidth,height=width*1.5,k=width/registration.width;
  Object.assign(img.style,{width:width+'px',height:height+'px',left:(anchor.x-registration.anchor.x*k)+'px',top:(anchor.y-registration.anchor.y*k)+'px'});
  img.style.setProperty('--wound-x',registration.anchor.x*k+'px');img.style.setProperty('--wound-y',registration.anchor.y*k+'px');
  rifts.append(img);nodes[registration.id]=img;
 }root.append(rifts);
 const white=document.createElement('div'),black=document.createElement('div');white.className='sga-v192-white';black.className='sga-v192-black';document.body.append(white,black);
 let surface=null,backgroundValues={scale:1,opacity:1,saturation:1,contrast:1};
 const safeResume=(snapshot,label)=>{audio.resume(snapshot).then(ok=>{if(!ok)current.audioFailures.push(label);});};
 const presentReady=()=>{if(!current.p0||current.p0.mapId!=='star_gate_garden'||!Number.isFinite(current.p0.player.x)||!preparedImages.get(ASSETS.ruins)||!current.scene.getState().owner||!current.scene.getState().presentPrepared)throw new Error('P0 not prepared');};
 const adapter={
  state(name,time){current.states.push({name,time});current.phase=name;window.dispatchEvent(new CustomEvent('tarot-breaker:stage3-state',{detail:{name,time}}));},
  async prepare(){
   current.clock.assert();if(!current.r0||!preparedImages.get(current.r0.source))throw new Error('R0 preparation missing');
   surface=scene.prepareBackground({anchor});current.surface={width:surface.width,height:surface.height,dpr:scene.getState().viewport.dpr,rgbaBytes:surface.width*surface.height*4,bounds:surface.stage3Preparation.bounds};
   // DOM images use already loaded and decoded resources; await initial paint before effects.
   await scene.waitDraw();current.clock.assert();
  },
  lockGeometry(){assertGeometry(current.fixed,actorGeometry(5),['left','top','width','height','footX','footY']);},
  checkFixed(){if(current.phase==='FULL_WHITE'||current.phase==='FUTURE_RESTORE'||current.phase==='MEMORY_GAP'||current.phase==='MISSION_RESUME'||current.phase==='FUTURE_FADE'||current.phase==='BLACK_CUT'||current.phase==='PRESENT_RESTORE')return;
   assertGeometry(current.fixed,actorGeometry(5),['left','top','width','height','footX','footY']);assertGeometry(current.arcana,arcanaGeometry(),['x','y','width','height','rotation']);},
  rift(id,opacity,scale){const n=nodes[id];n.style.opacity=String(opacity);n.style.visibility=opacity>0?'visible':'hidden';n.style.transform='scale('+scale+')';},
  say:text=>say('shion',text),audioLevel:k=>current.futureAudio?.setLevel(k),
  startAbsorption(){scene.activateAbsorption(surface);},
  absorb(values){Object.assign(backgroundValues,values);surface.style.transform='scale('+backgroundValues.scale+')';surface.style.opacity=String(backgroundValues.opacity);surface.style.filter='saturate('+backgroundValues.saturation+') contrast('+backgroundValues.contrast+')';},
  white:k=>{white.style.opacity=String(k);},black:k=>{black.style.opacity=String(k);},
  pauseFutureAudio(){current.futureAudio?.pause(current.phase);audio.pause();},
  async restoreFuture(ctx){
   current.clock.assert();scene.removeAbsorption();rifts.remove();card.remove();
   root.classList.remove('sga-card-handed-off');main.src=current.r0.source;
   // Preserve the actual rendered feet and common source scale, not image-box size.
   const fixed=current.fixed;main.style.width=(512*fixed.scale)+'px';main.style.height=(512*fixed.scale)+'px';
   main.style.left=(fixed.footX-bounds.left-256*fixed.scale)+'px';main.style.top=(fixed.footY-bounds.top-503*fixed.scale)+'px';main.style.transform='none';
   await scene.waitDraw();current.clock.assert();if(!ctx.alive())throw new Error('R1 restoration expired');const restored=actorGeometry(3);
   assertGeometry(fixed,restored,['footX','footY','scale']);current.r1=restored;
   if(root.querySelector('.sga-card')||document.querySelector('[data-stage3-background]'))throw new Error('R1 layers remained');
  },
  draw:ctx=>scene.waitDraw(ctx),recordHold:(which,result)=>current.holds.push({which,...result}),
  resumeFutureAudio(){current.futureAudio?.resumeWhite();},
  assertPresentPrepared:presentReady,
  async restorePresent(ctx){current.clock.assert();root.classList.add('sga-present-restored');await scene.restore(current.p0,ctx);current.clock.assert();if(!ctx.alive())throw new Error("P0 restoration expired");
   if(!scene.verify(current.p0).completed)throw new Error('P0 verification failed');
   // Restore P0 under full black, then keep the companions visually absent until Aftermath begins.
   const visibility=window.TarotActorVisibility;
   visibility?.set('shion',1);visibility?.set('shiopon',0);visibility?.set('lumiere',0);
   current.presentIsolation=true;current.restored=true;await preparePresentAudio(current);},
  async presentVisible(){await scene.waitDraw();current.clock.assert();},
  resumePresentAudio(){
   current.futureAudio?.pause('PRESENT');
   audio.setBase(current.p0.audio.base);
   audio.setLevel(0);
   safeResume(current.p0.audio,'P0');
   // Fade only after the Garden has painted; this is non-blocking so control can return immediately.
   audio.tweenCoefficient(current.p0.audio.coefficient,320,false);
  },
  presentAudioLevel:p=>audio.setLevel(p*current.p0.audio.coefficient),
  returnControl(){
   const stageState=window.TarotStage?.getState?.(),visibility=window.TarotActorVisibility?.getState?.(),sceneState=scene.getState();
   const player=stageState?.actors?.shion;
   if(!player||!samePoint(current.p0.player,player)||sceneState.vision||sceneState.absorption||
     visibility?.shion!==1||visibility?.shiopon!==0||visibility?.lumiere!==0)throw new Error('Unsafe control return');
   current.restored=true;
  }
 };
 await window.TarotFutureStage3.run(adapter,current.clock);
}
async function preparePresentAudio(current){
 current.clock.assert();
 // Retain the original ordinary source/position, silently seek under black.
 // Actual play remains owned by resumePresentAudio at the existing reveal cue.
 current.audio.setBase(current.p0.audio.base);current.audio.setLevel(0);
 try{if(!await current.audio.resume({...current.p0.audio,playing:false}))current.audioFailures.push('P0-prepare');}
 catch(e){current.audioFailures.push('P0-prepare: '+String(e));}
}
async function recoverPresent(current){
 current.restored=false;
 resolveAdvance=null;ui?.hide();current.futureAudio?.dispose();current.audio?.pause();window.TarotStage?.cancelAll();
 for(const n of document.querySelectorAll('.sga-v192-white'))n.remove();
 let black=document.querySelector('.sga-v192-black');if(!black){black=document.createElement('div');black.className='sga-v192-black';document.body.append(black);}black.style.opacity='1';
 const recoveryClock=window.TarotFutureStage3.createClock(null);
 // Hidden time does not consume the restoration deadline or unseen dialogue.
 while(document.hidden)await new Promise(resolve=>document.addEventListener('visibilitychange',resolve,{once:true}));
 try{
  root?.classList.add('sga-present-restored');root?.querySelector('.sga-future-rift')?.remove();
  await window.TarotFutureStage3.coveredRestore(recoveryClock,180,ctx=>current.scene.restore(current.p0,ctx),ctx=>current.scene.waitDraw(ctx));
  if(!current.scene.verify(current.p0).completed)throw new Error('P0 recovery verification failed');
  // Recovery obeys the same contract as the normal path: prepare silently under black,
  // reveal and paint the Garden, then resume ordinary BGM.
  current.audio.setBase(current.p0.audio.base);current.audio.setLevel(0);
  if(!await current.audio.resume({...current.p0.audio,playing:false}))current.audioFailures.push('P0-recovery-prepare');
  await recoveryClock.tween(550,p=>{black.style.opacity=String(1-p);});
  await current.scene.waitDraw();
  current.audio.resume(current.p0.audio).then(ok=>{if(!ok)current.audioFailures.push('P0-recovery');});
  current.audio.tweenCoefficient(current.p0.audio.coefficient,320,false);
  current.restored=true;
 }catch(e){current.recoveryError=String(e);black.remove();showRecovery(current);}finally{recoveryClock.dispose();}
}
function showRecovery(current){
 const panel=document.createElement('section');panel.className='sga-recovery';panel.setAttribute('role','alert');
 const message=document.createElement('p');message.textContent='現在の画面を復元できませんでした。';
 const retry=document.createElement('button');retry.type='button';retry.textContent='復帰を再試行';
 const title=document.createElement('a');title.href='./index.html';title.textContent='タイトルへ戻る';
 panel.append(message,retry,title);document.body.append(panel);
 retry.addEventListener('click',async()=>{retry.disabled=true;panel.remove();await recoverPresent(current);if(current.restored){releasePresentation();current.scene.unlock(current.id);current.audio?.release();lastResult=report(current);window.dispatchEvent(new CustomEvent("tarot-breaker:stage3-session-ended",{detail:lastResult}));}});
 title.addEventListener('click',()=>{current.audio?.pause();current.audio?.release();releasePresentation();});
}

async function run(){
 if(running||(session&&!session.restored))return;running=true;
 const current=session={id:++sessionId,controller:new AbortController(),states:[],dialogues:[],holds:[],audioFailures:[],restored:false};
 current.clock=window.TarotFutureStage3.createClock(current.controller.signal);
 current.scene=window.TarotStage3Scene;

 const viewport={width:innerWidth,height:innerHeight};
 const interrupt=reason=>{if(current.controller.signal.aborted)return;current.reason=reason;current.scene?.freezeCamera();current.controller.abort();ui?.hide();window.TarotStage?.cancelAll();};
 const hidden=()=>{if(document.hidden)interrupt('background');};
 const resized=()=>{if(innerWidth!==viewport.width||innerHeight!==viewport.height)interrupt('viewport');};
 document.addEventListener('visibilitychange',hidden);window.addEventListener('resize',resized);
 try{
 current.p0=current.scene.capture();current.audio=window.TarotAudio.beginEventSession();current.p0.audio=current.audio.capture();
 current.scene.lock(current.id);current.audio.setBase(.16);
 current.futureAudio=window.TarotFutureVisionAudio?.create({clock:current.clock,signal:current.controller.signal,failures:current.audioFailures,id:current.id});
  await preload();current.clock.assert();mount();root.className='active sga-v192';root.setAttribute('aria-hidden','false');
  await resonance();current.clock.assert();
  // P0 was captured once before all presentation/audio/visibility changes.
  await futureFixationStage1();await futureFixationStage2();await futureFixationStage3();
  current.completed=true;
 }catch(e){current.error=String(e);console.warn('Stage 3 interrupted',e);current.scene?.freezeCamera();current.controller.abort();await recoverPresent(current);}
 finally{
  document.removeEventListener('visibilitychange',hidden);window.removeEventListener('resize',resized);
  resolveAdvance=null;ui?.hide();current.futureAudio?.dispose();current.clock.dispose();
  if(current.restored){releasePresentation({preserveGateAnomaly:!!current.completed});current.scene.unlock(current.id);current.audio?.release();}
  running=false;lastResult=report(current);window.dispatchEvent(new CustomEvent('tarot-breaker:stage3-session-ended',{detail:lastResult}));
 }
}
function releasePresentation({preserveGateAnomaly=false}={}){
 if(root){root.remove();root=null;}
 for(const n of document.querySelectorAll('.sga-v192-white,.sga-v192-black,.sga-arcana-detail'))n.remove();
 // Successful completion retains the exact pre-Future blackout anomaly-rest gate; recovery still clears it.
 cleanupGateState({preserveFinal:preserveGateAnomaly});gateShell()?.classList.remove('sga-future-world-hidden','sga-sequence-overlap','sga-sequence-flash-on','sga-dark-01-02-overlap','sga-dark-02-03-overlap','sga-dark-03-04-overlap');
}
function report(current){return {id:current.id,running,completed:!!current.completed,restored:current.restored,error:current.error,recoveryError:current.recoveryError,reason:current.reason,
 futureAudio:current.futureAudio?.getState(),states:current.states,dialogues:current.dialogues,holds:current.holds,audioFailures:current.audioFailures,cardDetail:current.cardDetail,surface:current.surface,
 p0:current.p0,fixed:current.fixed,arcana:current.arcana,r1:current.r1,scene:current.scene.getState()};}
window.addEventListener("tarot-breaker:star-gate-investigate",run);
window.TarotStarGateAnomaly=Object.freeze({start:run,cancel:()=>{session?.scene?.freezeCamera();session?.controller.abort();ui?.hide();window.TarotStage?.cancelAll();},getState:()=>session?report(session):{running:false},getLastResult:()=>lastResult});
})();
