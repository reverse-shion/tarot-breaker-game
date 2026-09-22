(() => {
"use strict";
const ASSETS={
 ruins:"./assets/events/gate-vision/ruins.webp",smoke:"./assets/events/gate-vision/smoke.webp",void:"./assets/events/gate-vision/void.webp",
 shion:["./assets/sprites/shion/shion_card_01_reach.webp","./assets/sprites/shion/shion_card_02_draw.webp","./assets/sprites/shion/shion_card_03_check.webp","./assets/sprites/shion/shion_card_04_raise.webp","./assets/sprites/shion/shion_card_05_reach.webp"],
 aura1:"./assets/sprites/shion/shion_card_dark_aura_01.webp",aura2:"./assets/sprites/shion/shion_card_dark_aura_02.webp"
};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let running=false,ui=null,root=null,resolveAdvance=null,interactionOwned=false;
function image(src){return new Promise((resolve,reject)=>{const i=new Image();i.onload=async()=>{try{if(i.decode)await i.decode()}catch{}resolve(i)};i.onerror=reject;i.src=src})}
async function preload(){await Promise.all(Object.values(ASSETS).flat().map(image))}
function mount(){
 if(root)return root;
 root=document.createElement("section");root.id="star-gate-anomaly";root.setAttribute("aria-hidden","true");
 root.innerHTML='<div class="sga-resonance"></div><div class="sga-vision"><div class="sga-pan"><img class="sga-ruins" src="'+ASSETS.ruins+'" alt=""><img class="sga-smoke" src="'+ASSETS.smoke+'" alt=""><img class="sga-smoke second" src="'+ASSETS.smoke+'" alt=""><img class="sga-void" src="'+ASSETS.void+'" alt=""></div><img class="sga-shion" alt=""><div class="sga-card"><img class="aura1" src="'+ASSETS.aura1+'" alt=""><img class="aura2" src="'+ASSETS.aura2+'" alt=""></div></div><div class="sga-cut"></div><div class="sga-impurity"></div>';
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
async function resonance(){
 root.classList.add("sga-normal");await pause(700);root.classList.remove("sga-normal");root.classList.add("sga-reversal");
 // No synthetic low-pitched reuse: the existing resonance asset has no authored
 // low/distorted variant, so reversal is expressed visually + by a short silence.
 await pause(760);
 await say("lumiere","……？");
}
async function vision(){
 const v=root.querySelector(".sga-vision"),pan=root.querySelector(".sga-pan"),card=root.querySelector(".sga-card");
 v.classList.add("visible");await pause(1000);pan.classList.add("reveal");await pause(2600);
 setShion(1);await pause(520);setShion(2);await pause(500);setShion(3);await pause(900);setShion(4);await pause(520);setShion(5);await pause(120);
 card.classList.add("visible");await pause(480);card.classList.add("ascend");await pause(1650);card.classList.add("transformed");await pause(1500);card.classList.add("floating");await pause(700);
 await say(null,"――選べ。");await pause(600);
 root.querySelector(".sga-cut").classList.add("show");await pause(260);v.classList.remove("visible");await pause(300);
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
 finally{resolveAdvance=null;ui?.hide();if(root){root.classList.remove("active","sga-normal","sga-reversal");root.setAttribute("aria-hidden","true")}running=false;const release=interactionOwned||window.TarotStarGateInteraction?.getState?.().promptLock===true;interactionOwned=false;if(release)window.dispatchEvent(new Event("tarot-breaker:interaction-end"));if(!success)window.dispatchEvent(new Event("tarot-breaker:star-gate-anomaly-abort"))}
}
window.addEventListener("tarot-breaker:star-gate-investigate",run);
window.TarotStarGateAnomaly=Object.freeze({start:run,getState:()=>({running})});
})();