/* Caritas: map discovery -> main-style choice -> shared dialogue -> tarot battle. */
(function(){
"use strict";
const params=new URLSearchParams(location.search);
if(!location.pathname.endsWith("/hoshisuna-main.html")||params.get("dev")!=="hoshisuna")return;
const C=window.CaritasBattleCore;
if(!C){console.error("[Caritas] Battle core missing");return;}
const onceKey="tb:dev:caritas:word-guide-once";
const OWNER="hoshisuna_caritas_prompt";
const APPROACH_RADIUS=88,REARM_RADIUS=145;
const NOTICE=[["シオン","……待て。あの獣の様子が妙だ。\n黒紫の光が……体を覆っている。"]];
const INTRO=[
 ["カリタス","……まさか、私がアビスに呑まれるとは……"],
 ["シオン","……大丈夫か。少し、話を聞かせてくれないか。"],
 ["カリタス","……この私が……なんと情けない……近づくでない。"],
 ["シオン","いくぞ、しおぽん。タロット展開。"],
 ["シオン","言の葉は鍵、星の光は道しるべ。\nステラン、ステラン、ステランーーー 来臨せよ、汝ーーシオリエル！"],
 ["シオリエル","シオン。恐れの奥に、まだ消えていない願いがある。"]
];
let root,prompt,dialogue,cardBox,ui={},story="idle",battle=C.newGame();
let once=false,busy=false,done=false,armed=true,noticed=false,owned=false,dialogueBusy=false;
let dialogueLines=[],dialogueIndex=0,afterDialogue=null,timer=0,toastTimer=0;
let cinematicTimer=0,cinematicCallback=null,remaining=0,startedAt=0,pageAway=false;
// Source art stays intact. CSS frames only the faces; technique art can be added
// later through this isolated encounter's optional same-origin image slot.
const CUTINS={shion:"./assets/sprites/shion/shion_card_03_check.webp",shioriel:"./assets/events/hoshisuna/cutins/shioriel-reference.png"};
const FAREWELL=[C.ENDING.find(line=>line[0]==="カリタス"&&line[1]==="……世話になった。")];
const suspended=()=>pageAway||document.hidden;
function armCinematic(){
 if(!cinematicCallback||suspended())return;
 startedAt=performance.now();
 cinematicTimer=setTimeout(()=>{
   cinematicTimer=0;
   if(suspended()){remaining=Math.max(0,remaining-(performance.now()-startedAt));return;}
   const next=cinematicCallback;cinematicCallback=null;remaining=0;next();
 },remaining);
}
function stage(name,duration,next){
 clearTimeout(cinematicTimer);cinematicTimer=0;
 story=name;root.dataset.phase=name;render();
 cinematicCallback=next;remaining=duration;armCinematic();
}
function pauseCinematic(){
 if(cinematicTimer){clearTimeout(cinematicTimer);cinematicTimer=0;remaining=Math.max(0,remaining-(performance.now()-startedAt));}
 root.dataset.paused="true";
}
function resumeCinematic(){
 if(suspended())return;
 root.dataset.paused="false";
 if(!cinematicTimer)armCinematic();
}
function beginBattle(){story="battle";root.dataset.phase="battle";render();}
function beginEnding(){
 clearTimeout(toastTimer);ui.toast.hidden=true;
 stage("purifying",2600,()=>{
   stage("purified",1100,()=>{
     story="farewell";root.dataset.phase="farewell";
     saySequence(FAREWELL,()=>stage("returning",900,finish));
   });
 });
}
const newEl=(tag,cls,text)=>{const el=document.createElement(tag);if(cls)el.className=cls;if(text!==undefined)el.textContent=text;return el;};
function distanceToCaritas(){
 const a=window.TarotStage?.getState?.().actors?.shion;
 if(!a||!Number.isFinite(a.x)||!Number.isFinite(a.y))return Number.POSITIVE_INFINITY;
 return Math.hypot(Math.max(934-a.x,0,a.x-1092),Math.max(150-a.y,0,a.y-272));
}
function sceneReady(){
 return document.body.classList.contains("scene-ready")&&!document.hidden&&
  !window.TarotDialogue?.getState?.().active&&!done;
}
function lock(){
 if(owned)return;
 owned=true;
 window.dispatchEvent(new CustomEvent("tarot-breaker:interaction-start",{detail:{source:OWNER}}));
}
function unlock(){
 if(!owned)return;
 owned=false;
 window.dispatchEvent(new CustomEvent("tarot-breaker:interaction-end",{detail:{source:OWNER}}));
}
function currentLine(){
 if(!dialogueBusy)return;
 const [speaker,text]=dialogueLines[dialogueIndex]||["",""];
 dialogue.show({speaker,text,actor:speaker==="シオン"?"shion":speaker==="シオリエル"?"shioriel":"caritas"});
 dialogue.elements.button.focus({preventScroll:true});
}
function saySequence(lines,callback){
 if(!dialogue||!lines?.length)throw new Error("Caritas dialogue not ready");
 dialogueLines=lines;dialogueIndex=0;afterDialogue=callback;dialogueBusy=true;
 currentLine();
}
function advanceDialogue(){
 if(!dialogueBusy||suspended())return;
 dialogueIndex++;
 if(dialogueIndex<dialogueLines.length){currentLine();return;}
 dialogue.hide();dialogueBusy=false;dialogueLines=[];
 const callback=afterDialogue;afterDialogue=null;callback?.();
}
function showPrompt(){
 if(story!=="choice")return;
 prompt.hidden=false;prompt.classList.add("visible");
 prompt.querySelector("#caritas-interaction-inspect")?.focus({preventScroll:true});
}
function hidePrompt(){
 prompt.classList.remove("visible");prompt.hidden=true;
}
function notice(){
 if(story!=="idle"||!armed||!sceneReady()||busy)return;
 busy=true;noticed=true;story="notice";lock();
 saySequence(NOTICE,()=>{story="choice";showPrompt();});
}
function offerAgain(){
 if(story!=="idle"||!armed||busy)return;
 busy=true;story="choice";lock();showPrompt();
}
function tick(){
 if(story!=="idle"||done||!sceneReady())return;
 const distance=distanceToCaritas();
 if(distance>=REARM_RADIUS){armed=true;return;}
 if(distance<=APPROACH_RADIUS&&armed){
   if(noticed)offerAgain();
   else notice();
 }
}
function leave(){
 if(story!=="choice")return;
 hidePrompt();armed=false;busy=false;story="idle";unlock();
}
function start(){
 if(story!=="choice"||!owned||done||suspended())return;
 hidePrompt();story="intro";
 window.dispatchEvent(new Event("tarot-breaker:caritas-approach"));
 saySequence(INTRO,()=>{
   battle=C.newGame();root.hidden=false;
   stage("engulfing",2600,beginBattle);
 });
}
function setText(el,value){el.textContent=String(value);}
function render(){
 const s=battle,reading=story==="battle"&&s.phase==="read",defeat=s.phase==="defeat";
 const displayedDark=["purified","farewell","returning"].includes(story)?0:s.dark;
 setText(ui.res,s.resonance+"/100");setText(ui.dark,displayedDark+"/100");setText(ui.hp,s.hp+"/100");
 ui.resBar.style.width=s.resonance+"%";ui.darkBar.style.width=displayedDark+"%";ui.hpBar.style.width=s.hp+"%";
 setText(ui.forecast,"次の攻撃："+(C.forecast(s)===24?"強攻撃 24":"通常攻撃 12"));
 const stage=C.STAGES[Math.min(s.step,2)];
 setText(ui.speech,stage.speech);setText(ui.clue,stage.clue);
 setText(ui.preview,C.preview(s));setText(ui.tactic,C.TACTICS[s.words[2]].name);
 cardBox.replaceChildren();
 for(let i=0;i<C.CARDS.length;i++){
  const card=C.CARDS[i],section=newEl("section","cb-card");
  section.append(newEl("div","cb-role",card.role));
  const art=newEl("div","cb-card-art");
  art.append(newEl("div","cb-symbol",card.mark),newEl("span","",card.name));section.append(art);
  const words=newEl("div","cb-words");
  for(const word of card.words){
   const btn=newEl("button","cb-word",word);btn.type="button";
   btn.setAttribute("aria-pressed",String(s.words[i]===word));btn.disabled=!reading||dialogueBusy;
   btn.addEventListener("click",()=>choose(i,word));words.appendChild(btn);
  }
  section.append(words);cardBox.append(section);
 }
 ui.read.disabled=!reading||dialogueBusy;ui.defend.disabled=!reading||dialogueBusy;
 ui.skill.disabled=!reading||dialogueBusy||s.used||s.resonance<33||s.dark>67;
 const showGuide=reading&&!once&&!dialogueBusy;
 ui.guide.hidden=!showGuide;
 if(showGuide)ui.guide.textContent="最初の一回だけ。\nカードの下の言葉をタップすると、読み方が変わるよ。";
 ui.finale.hidden=!(defeat&&story==="battle");
 if(defeat){
  setText(ui.finaleText,"力尽きてしまった……\nもう一度、カードを読もう。");
  setText(ui.finaleNext,"やり直す");
 }
}
function choose(index,word){
 if(story!=="battle"||dialogueBusy||suspended()||battle.phase!=="read")return;
 if(!once){once=true;try{sessionStorage.setItem(onceKey,"1");}catch(_){}}
 battle=C.select(battle,index,word);render();
}
function toast(message){
 clearTimeout(toastTimer);ui.toast.textContent=message;ui.toast.hidden=false;
 toastTimer=setTimeout(()=>{ui.toast.hidden=true;},2100);
}
function perform(kind){
 if(story!=="battle"||dialogueBusy||suspended()||battle.phase!=="read")return;
 const previous=battle;
 const next=kind==="read"?C.read(previous):kind==="defend"?C.defend(previous):kind==="skill"?C.skill(previous):previous;
 if(previous===next)return;
 if(kind==="skill"){
   clearTimeout(toastTimer);ui.toast.hidden=true;
   stage("cutin",1700,()=>stage("technique",1500,()=>resolveTurn(previous,next,kind)));
   return;
 }
 resolveTurn(previous,next,kind);
}
// Core settles HP once; this is a presentation-only enemy phase.
function resolveTurn(previous,next,kind){
 const damage=Math.max(0,previous.hp-next.hp);
 if(damage>0){
  const raw=C.forecast(previous);
  battle=next;
  root.dataset.counter=raw===24?"heavy":"normal";
  root.dataset.ward=kind==="defend"?"true":"false";
  setText(ui.enemyCall,raw===24?"カリタスの強攻撃！":"カリタスの攻撃！");
  setText(ui.enemyDamage,(kind==="defend"?"防御・75%軽減　":"")+"シオリエル HP −"+damage);
  stage("enemy-turn",1050,()=>applyOutcome(previous,next,kind));
  return;
 }
 applyOutcome(previous,next,kind);
}
function applyOutcome(previous,next,kind){
 battle=next;story="battle";root.dataset.phase="battle";
 const hpLoss=previous.hp-battle.hp,resGain=battle.resonance-previous.resonance,darkLoss=previous.dark-battle.dark;
 const values=[];
 if(resGain)values.push("共鳴＋"+resGain);
 if(darkLoss)values.push("闇−"+darkLoss);
 if(hpLoss)values.push("HP−"+hpLoss);
 if(values.length)toast(values.join("　"));
 const tactical=C.TACTICS[previous.words[2]],stage=previous.step;
 let lines=[];
 if(kind==="read"&&C.points(previous)>=2){
   lines=[["シオン",tactical.speeches[stage]],["カリタス",tactical.replies[stage]]];
 }else if(kind==="read"){
   lines=[["カリタス","……すまぬ。今は、まだその言葉を受け取れぬ。"]];
 }else if(kind==="skill"){
   lines=[["シオリエル","シオン。言葉は、届いている。"]];
 }
 if(lines.length){
   dialogueBusy=true;render();
   saySequence(lines,()=>{if(battle.phase==="ending")beginEnding();else render();});
 }else if(battle.phase==="ending")beginEnding();else render();
}
function retry(){
 if(story!=="battle"||battle.phase!=="defeat"||dialogueBusy||suspended())return;
 battle=C.newGame();root.dataset.phase="battle";render();
}
function finish(){
 if(done)return;
 done=true;story="complete";root.hidden=true;dialogue?.hide();
 clearTimeout(toastTimer);clearTimeout(cinematicTimer);cinematicCallback=null;
 const creature=document.querySelector(".hoshi-caritas");
 if(creature)creature.hidden=true;
 document.body.classList.add("caritas-departed");
 // Only the isolated Starroad footprint changes. Shared navigation is untouched.
 window.TarotHoshisunaCollision?.setActive?.(false);
 busy=false;unlock();
}
function init(){
 const shell=document.getElementById("game-shell");
 if(!shell||!document.getElementById("hoshisuna-caritas"))return;
 if(!window.TarotDialogueUI?.create){console.error("[Caritas] Shared main dialogue unavailable");return;}
 try{once=sessionStorage.getItem(onceKey)==="1";}catch(_){once=false;}
 prompt=newEl("aside");prompt.id="caritas-interaction-choice";prompt.hidden=true;prompt.setAttribute("aria-label","獣の異変");
 const txt=newEl("div","", "獣を包む黒紫の光が揺れている。……調べてみるか？");txt.id="caritas-interaction-text";
 const options=newEl("div","star-gate-interaction-actions");
 const inspect=newEl("button","","調べる");inspect.type="button";inspect.id="caritas-interaction-inspect";
 const leaveBtn=newEl("button","","離れる");leaveBtn.type="button";
 inspect.addEventListener("click",start);leaveBtn.addEventListener("click",leave);
 options.append(inspect,leaveBtn);prompt.append(txt,options);shell.appendChild(prompt);
 root=newEl("section");root.id="caritas-event";root.hidden=true;root.dataset.phase="battle";
 root.setAttribute("aria-label","カリタス 心象共鳴");
 const frame=newEl("section","cb-frame");const arena=newEl("div","cb-arena");
 arena.append(newEl("div","cb-title","心象共鳴"));
 const enemy=newEl("div","cb-hud enemy");enemy.append(newEl("div","","カリタス"));
 const er=newEl("div","cb-hud-row");er.append(newEl("span","","共鳴"),ui.res=newEl("span","","0/100"));
 ui.resBar=newEl("i");const erb=newEl("div","cb-bar");erb.appendChild(ui.resBar);
 const dr=newEl("div","cb-hud-row");dr.append(newEl("span","","闇"),ui.dark=newEl("span","","100/100"));
 ui.darkBar=newEl("i");const drb=newEl("div","cb-bar dark");drb.appendChild(ui.darkBar);
 enemy.append(er,erb,dr,drb);
 const beast=newEl("img","cb-beast");beast.src="./assets/events/hoshisuna/battle/caritas-battle.webp";beast.alt="カリタス";
 const veil=newEl("div","cb-abyss");veil.setAttribute("aria-hidden","true");
 for(let i=0;i<5;i++)veil.append(newEl("i"));
 const release=newEl("div","cb-release");release.setAttribute("aria-hidden","true");
 const angel=newEl("div","cb-angel");
 const hero=newEl("div","cb-hud hero");hero.append(newEl("div","","シオリエル"));
 const hr=newEl("div","cb-hud-row");hr.append(newEl("span","","HP"),ui.hp=newEl("span","","100/100"));
 ui.hpBar=newEl("i");const hb=newEl("div","cb-bar hp");hb.appendChild(ui.hpBar);hero.append(hr,hb);
 ui.forecast=newEl("div","cb-forecast","次の攻撃：通常");
 const shion=newEl("div","cb-shion-sprite");shion.setAttribute("role","img");shion.setAttribute("aria-label","シオン");
 const counter=newEl("div","cb-enemy-turn");
 ui.enemyCall=newEl("strong","cb-enemy-call");
 ui.enemyDamage=newEl("span","cb-enemy-damage");
 counter.append(ui.enemyCall,ui.enemyDamage);
 arena.append(enemy,beast,veil,release,shion,angel,hero,ui.forecast,
  counter);
 const narr=newEl("div","cb-narration");ui.speech=newEl("strong");ui.clue=newEl("small");narr.append(ui.speech,ui.clue);
 const ctr=newEl("div","cb-controls");cardBox=newEl("div","cb-cards");
 const line=newEl("div","cb-readline");ui.preview=newEl("div","cb-preview");ui.tactic=newEl("div","cb-tactic");line.append(ui.preview,ui.tactic);
 const actions=newEl("div","cb-actions");
 ui.read=newEl("button","cb-read","この読みを届ける");
 ui.defend=newEl("button","cb-defend","防御");ui.defend.setAttribute("aria-label","防御・次の攻撃を75パーセント軽減");ui.skill=newEl("button","cb-skill","必殺技");
 ui.read.addEventListener("click",()=>perform("read"));ui.defend.addEventListener("click",()=>perform("defend"));ui.skill.addEventListener("click",()=>perform("skill"));
 actions.append(ui.read,ui.defend,ui.skill);ctr.append(cardBox,line,actions);frame.append(arena,narr,ctr);
 ui.toast=newEl("div","cb-toast");ui.toast.hidden=true;
 ui.guide=newEl("div","cb-tutorial");ui.guide.hidden=true;
 ui.finale=newEl("div","cb-finale");ui.finale.hidden=true;
 ui.finaleText=newEl("div","cb-finale-text");ui.finaleNext=newEl("button","","やり直す");
 ui.finaleNext.addEventListener("click",retry);ui.finale.append(ui.finaleText,ui.finaleNext);
 const cutin=newEl("div","cb-cutin");cutin.setAttribute("aria-label","シオンとシオリエルの必殺技");
 for(const [actor,name] of [["shion","シオン"],["shioriel","シオリエル"]]){
   const panel=newEl("div","cb-cut-panel cb-cut-"+actor);
   const face=newEl("img","cb-cut-face");face.src=CUTINS[actor];face.alt=name;face.draggable=false;
   // These hidden-at-boot img elements start loading before any battle action.
   face.addEventListener("error",()=>{face.hidden=true;});
   panel.append(face,newEl("span","cb-cut-name",name));cutin.append(panel);
 }
 cutin.append(newEl("div","cb-cut-title","必殺技"));
 const technique=newEl("div","cb-technique");technique.setAttribute("aria-hidden","true");
 technique.append(newEl("div","cb-technique-ray"),newEl("div","cb-technique-ring"));
 // Set data-caritas-technique-art on game-shell when the dedicated art is ready.
 // Absent/failed optional art keeps the light effect and never stalls the event.
 const techniqueSource=shell.dataset.caritasTechniqueArt;
 if(techniqueSource&&/^\.\/assets\/[^?#]+\.(?:png|webp|jpe?g)$/i.test(techniqueSource)){
   const art=newEl("img","cb-technique-art");art.alt="";art.hidden=true;
   art.addEventListener("load",()=>{art.hidden=false;});art.addEventListener("error",()=>{art.hidden=true;});art.src=techniqueSource;technique.append(art);
 }
 root.append(frame,ui.toast,ui.guide,ui.finale,cutin,technique);shell.appendChild(root);
 dialogue=window.TarotDialogueUI.create({
   // Exactly the Garden main dialogue mount and element IDs. The battle UI
   // also lives in the same shell so its stacking order stays predictable.
   mount:shell,
   ids:{layer:"dialogue-layer",advance:"dialogue-advance",speaker:"dialogue-speaker",text:"dialogue-text"},
   onAdvance:advanceDialogue
 });
 timer=setInterval(tick,160);
 document.addEventListener("visibilitychange",()=>{if(suspended())pauseCinematic();else resumeCinematic();});
 window.addEventListener("pagehide",()=>{pageAway=true;pauseCinematic();clearInterval(timer);timer=0;clearTimeout(toastTimer);ui.toast.hidden=true;});
 window.addEventListener("pageshow",()=>{pageAway=false;if(!timer&&!done)timer=setInterval(tick,160);resumeCinematic();tick();});
 tick();
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
window.CaritasEncounterDebug=Object.freeze({getState:()=>({story,done,armed,noticed,owned,dialogueBusy,cinematicPending:!!cinematicCallback,battle:{...battle,words:[...battle.words]}})});
})();
