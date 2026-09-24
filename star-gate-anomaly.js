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
const FUTURE_STAGE1_DEV=DEV_MODE==="future-fixation-stage1";
let running=false,ui=null,root=null,resolveAdvance=null,interactionOwned=false;
function image(src){return new Promise((resolve,reject)=>{const i=new Image();i.onload=async()=>{try{if(i.decode)await i.decode()}catch{}resolve(i)};i.onerror=reject;i.src=src})}
async function preload(){await Promise.all(Object.values(ASSETS).flat().map(image))}
function mount(){
 if(root)return root;
 root=document.createElement("section");root.id="star-gate-anomaly";root.setAttribute("aria-hidden","true");
 root.innerHTML='<div class="sga-future-blackout" aria-hidden="true"></div><div class="sga-dim"></div><div class="sga-vision"><div class="sga-pan"><img class="sga-ruins" src="'+ASSETS.ruins+'" alt=""><img class="sga-smoke" src="'+ASSETS.smoke+'" alt=""><img class="sga-smoke second" src="'+ASSETS.smoke+'" alt=""><img class="sga-void" src="'+ASSETS.void+'" alt=""></div><img class="sga-shion" alt=""><div class="sga-card"><img class="aura1" src="'+ASSETS.aura1+'" alt=""><img class="aura2" src="'+ASSETS.aura2+'" alt=""></div></div><div class="sga-cut"></div><div class="sga-impurity"></div>';
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
function setShion(n){const el=root.querySelector(".sga-shion");el.src=ASSETS.shion[n-1];el.classList.add("visible")}
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
 root.classList.add("sga-future-shion-only");
 window.TarotActorVisibility?.set("shion",1);
 await pause(500);
 await say("shion","……？");await pause(400);
 await say("shion","なんだ……？");
 await say("shion","リュミエール……？");await pause(500);
 await say("shion","……ここは、どこだ？");
 const after=stage.getState().actors.shion;
 if(!samePoint(before,after))throw new Error("Shion moved during Future Fixation Vision Stage 1");
 window.dispatchEvent(new CustomEvent("tarot-breaker:future-fixation-stage1-complete",{detail:{checkpoint:true}}));
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
  if(DEV_HARNESS){
   if(FUTURE_STAGE1_DEV)await futureFixationStage1();
   success=true;window.dispatchEvent(new CustomEvent("tarot-breaker:star-gate-sequence-complete",{detail:{checkpoint:true,futureStage1:FUTURE_STAGE1_DEV}}));return;
  }
  await vision();await aftermath();complete();success=true;
 }catch(e){console.error("Star Gate anomaly aborted",e)}
 finally{resolveAdvance=null;ui?.hide();window.TarotCinematicCamera?.release?.();window.TarotActorVisibility?.reset?.();cleanupGateState({preserveFinal:success});if(root){root.className="";root.classList.add("active");root.classList.remove("active");root.setAttribute("aria-hidden","true")}running=false;const release=interactionOwned||window.TarotStarGateInteraction?.getState?.().promptLock===true;interactionOwned=false;if(release)window.dispatchEvent(new Event("tarot-breaker:interaction-end"));if(!success)window.dispatchEvent(new Event("tarot-breaker:star-gate-anomaly-abort"))}
}
window.addEventListener("tarot-breaker:star-gate-investigate",run);
window.TarotStarGateAnomaly=Object.freeze({start:run,getState:()=>({running})});
})();
