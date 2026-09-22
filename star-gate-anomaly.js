(() => {
"use strict";
const ASSETS={
 ruins:"./assets/events/gate-vision/ruins.webp",smoke:"./assets/events/gate-vision/smoke.webp",void:"./assets/events/gate-vision/void.webp",
 shion:["./assets/sprites/shion/shion_card_01_reach.webp","./assets/sprites/shion/shion_card_02_draw.webp","./assets/sprites/shion/shion_card_03_check.webp","./assets/sprites/shion/shion_card_04_raise.webp","./assets/sprites/shion/shion_card_05_reach.webp"],
 aura1:"./assets/sprites/shion/shion_card_dark_aura_01.webp",aura2:"./assets/sprites/shion/shion_card_dark_aura_02.webp"
};
const GATE_BOUNDS=Object.freeze({left:520,top:-163.33333333333331,right:1080,bottom:210});
const CINEMATIC_SKY_OVERSCAN=Object.freeze({x:0,y:-480,w:1448,h:528});
const OVERSCAN_COVERAGE=Object.freeze({minimumTopSafety:80,mainSceneTop:0});
const GATE_STATES=Object.freeze(["sga-sky-descent","sga-normal-flow","sga-resonance-complete","sga-anomaly-flicker","sga-anomaly","sga-reverse-gate","sga-reverse-flow","sga-anomaly-rest"]);
class StarGateOverscanCoverageError extends Error{constructor(){super("Star Gate cinematic framing or sky overscan coverage failed");this.name="StarGateOverscanCoverageError"}}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let running=false,ui=null,root=null,resolveAdvance=null,interactionOwned=false;
function image(src){return new Promise((resolve,reject)=>{const i=new Image();i.onload=async()=>{try{if(i.decode)await i.decode()}catch{}resolve(i)};i.onerror=reject;i.src=src})}
async function preload(){await Promise.all(Object.values(ASSETS).flat().map(image))}
function mount(){
 if(root)return root;
 root=document.createElement("section");root.id="star-gate-anomaly";root.setAttribute("aria-hidden","true");
 root.innerHTML='<div class="sga-dim"></div><div class="sga-vision"><div class="sga-pan"><img class="sga-ruins" src="'+ASSETS.ruins+'" alt=""><img class="sga-smoke" src="'+ASSETS.smoke+'" alt=""><img class="sga-smoke second" src="'+ASSETS.smoke+'" alt=""><img class="sga-void" src="'+ASSETS.void+'" alt=""></div><img class="sga-shion" alt=""><div class="sga-card"><img class="aura1" src="'+ASSETS.aura1+'" alt=""><img class="aura2" src="'+ASSETS.aura2+'" alt=""></div></div><div class="sga-cut"></div><div class="sga-impurity"></div>';
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
 const shionStart=window.TarotStage?.getState?.().actors?.shion||camera.getState().player;
 gateShell()?.classList.add("sga-sequence-active");
 setGateState(null);
 const framed=await camera.frameBounds(GATE_BOUNDS,1550,{padding:18,minZoom:.54,topInset:44});
 const framedState=camera.getState();
 if(!framed?.completed||!gateIsFramed(framedState)||!overscanCoversViewport(framedState))throw new StarGateOverscanCoverageError();
 await pause(800);
 setGateState("sga-sky-descent");await pause(1050);
 setGateState("sga-normal-flow");await pause(1320);
 setGateState("sga-resonance-complete");await pause(700);
 setGateState("sga-anomaly-flicker");await pause(1180);
 setGateState("sga-anomaly");await pause(480);
 setGateState("sga-reverse-gate");await pause(1100);
 setGateState("sga-reverse-flow");await pause(1150);
 setGateState("sga-anomaly-rest");await pause(650);
 const returned=await camera.returnToPlayer(1350);if(!returned?.completed)throw new Error("Cinematic camera return interrupted");
 camera.release();gateShell()?.classList.remove("sga-sequence-active");await pause(220);
 const shionEnd=window.TarotStage?.getState?.().actors?.shion||camera.getState().player;
 if(!samePoint(shionStart,shionEnd))throw new Error("Shion moved during Star Gate cinematic");
 await say("lumiere","……？");
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
  const p=window.TarotProgressCore?.createProgress?.();if(!p)return;
  const loaded=p.load();if(loaded.status!=="valid"||!p.isEventCompleted("garden_lumiere_gate")||p.isEventCompleted("garden_star_gate_anomaly"))return;
  // The choice prompt already owns the interaction lock. Keep one continuous
  // lock across prompt -> cinematic; direct/debug starts acquire it here.
  const promptLocked=window.TarotStarGateInteraction?.getState?.().promptLock===true;
  if(!promptLocked){window.dispatchEvent(new Event("tarot-breaker:interaction-start"));interactionOwned=true}
  await preload();mount();root.classList.add("active");root.setAttribute("aria-hidden","false");
  await resonance();await vision();await aftermath();complete();success=true;
 }catch(e){console.error("Star Gate anomaly aborted",e)}
 finally{resolveAdvance=null;ui?.hide();window.TarotCinematicCamera?.release?.();window.TarotActorVisibility?.reset?.();cleanupGateState({preserveFinal:success});if(root){root.className="";root.classList.add("active");root.classList.remove("active");root.setAttribute("aria-hidden","true")}running=false;const release=interactionOwned||window.TarotStarGateInteraction?.getState?.().promptLock===true;interactionOwned=false;if(release)window.dispatchEvent(new Event("tarot-breaker:interaction-end"));if(!success)window.dispatchEvent(new Event("tarot-breaker:star-gate-anomaly-abort"))}
}
window.addEventListener("tarot-breaker:star-gate-investigate",run);
window.TarotStarGateAnomaly=Object.freeze({start:run,getState:()=>({running})});
})();
