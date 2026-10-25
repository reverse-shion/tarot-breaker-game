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
 if(!dialogueBusy)return;
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
 if(story!=="choice"||!owned||done)return;
 hidePrompt();story="intro";
 window.dispatchEvent(new Event("tarot-breaker:caritas-approach"));
 saySequence(INTRO,()=>{
   story="battle";battle=C.newGame();root.hidden=false;root.dataset.phase="battle";render();
 });
}
function setText(el,value){el.textContent=String(value);}
function render(){
 if(story!=="battle")return;
 const s=battle,reading=s.phase==="read",defeat=s.phase==="defeat";
 setText(ui.res,s.resonance+"/100");setText(ui.dark,s.dark+"/100");setText(ui.hp,s.hp+"/100");
 ui.resBar.style.width=s.resonance+"%";ui.darkBar.style.width=s.dark+"%";ui.hpBar.style.width=s.hp+"%";
 setText(ui.forecast,"次の攻撃："+(C.forecast(s)===24?"強":"通常"));
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
 ui.finale.hidden=!defeat;
 if(defeat){
  setText(ui.finaleText,"力尽きてしまった……\nもう一度、カードを読もう。");
  setText(ui.finaleNext,"やり直す");
 }
}
function choose(index,word){
 if(story!=="battle"||dialogueBusy||battle.phase!=="read")return;
 if(!once){once=true;try{sessionStorage.setItem(onceKey,"1");}catch(_){}}
 battle=C.select(battle,index,word);render();
}
function toast(message){
 clearTimeout(toastTimer);ui.toast.textContent=message;ui.toast.hidden=false;
 toastTimer=setTimeout(()=>{ui.toast.hidden=true;},2100);
}
function perform(kind){
 if(story!=="battle"||dialogueBusy||battle.phase!=="read")return;
 const previous=battle;
 if(kind==="read")battle=C.read(battle);
 if(kind==="defend")battle=C.defend(battle);
 if(kind==="skill")battle=C.skill(battle);
 if(previous===battle)return;
 const hpLoss=previous.hp-battle.hp,resGain=battle.resonance-previous.resonance,darkLoss=previous.dark-battle.dark;
 const values=[];
 if(resGain)values.push("共鳴＋"+resGain);
 if(darkLoss)values.push("闇−"+darkLoss);
 if(hpLoss)values.push("HP−"+hpLoss);
 if(values.length)toast(values.join("　"));
 if(battle.phase==="ending"){
   story="ending";root.hidden=true;clearTimeout(toastTimer);ui.toast.hidden=true;
   saySequence(C.ENDING,finish);return;
 }
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
   saySequence(lines,()=>{if(story==="battle")render();});
 }else render();
}
function retry(){
 if(story!=="battle"||battle.phase!=="defeat"||dialogueBusy)return;
 battle=C.newGame();render();
}
function finish(){
 if(done)return;
 done=true;story="complete";root.hidden=true;dialogue?.hide();
 clearTimeout(toastTimer);
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
 const beast=newEl("img","cb-beast");beast.src="./assets/events/hoshisuna/caritas/sg_rise_01.webp";beast.alt="カリタス";
 const angel=newEl("div","cb-angel");
 const hero=newEl("div","cb-hud hero");hero.append(newEl("div","","シオリエル"));
 const hr=newEl("div","cb-hud-row");hr.append(newEl("span","","HP"),ui.hp=newEl("span","","100/100"));
 ui.hpBar=newEl("i");const hb=newEl("div","cb-bar hp");hb.appendChild(ui.hpBar);hero.append(hr,hb);
 ui.forecast=newEl("div","cb-forecast","次の攻撃：通常");
 arena.append(enemy,beast,angel,hero,ui.forecast,newEl("div","cb-hero-name","シオン・シオリエル"));
 const narr=newEl("div","cb-narration");ui.speech=newEl("strong");ui.clue=newEl("small");narr.append(ui.speech,ui.clue);
 const ctr=newEl("div","cb-controls");cardBox=newEl("div","cb-cards");
 const line=newEl("div","cb-readline");ui.preview=newEl("div","cb-preview");ui.tactic=newEl("div","cb-tactic");line.append(ui.preview,ui.tactic);
 const actions=newEl("div","cb-actions");
 ui.read=newEl("button","cb-read","この読みを届ける");
 ui.defend=newEl("button","","防御");ui.skill=newEl("button","cb-skill","必殺技");
 ui.read.addEventListener("click",()=>perform("read"));ui.defend.addEventListener("click",()=>perform("defend"));ui.skill.addEventListener("click",()=>perform("skill"));
 actions.append(ui.read,ui.defend,ui.skill);ctr.append(cardBox,line,actions);frame.append(arena,narr,ctr);
 ui.toast=newEl("div","cb-toast");ui.toast.hidden=true;
 ui.guide=newEl("div","cb-tutorial");ui.guide.hidden=true;
 ui.finale=newEl("div","cb-finale");ui.finale.hidden=true;
 ui.finaleText=newEl("div","cb-finale-text");ui.finaleNext=newEl("button","","やり直す");
 ui.finaleNext.addEventListener("click",retry);ui.finale.append(ui.finaleText,ui.finaleNext);
 root.append(frame,ui.toast,ui.guide,ui.finale);document.body.appendChild(root);
 dialogue=window.TarotDialogueUI.create({
   mount:document.body,
   ids:{layer:"caritas-dialogue-layer",advance:"caritas-dialogue-advance",speaker:"caritas-dialogue-speaker",text:"caritas-dialogue-text"},
   onAdvance:advanceDialogue
 });
 dialogue.elements.layer.classList.add("caritas-dialogue");
 timer=setInterval(tick,160);
 window.addEventListener("pagehide",()=>{clearInterval(timer);clearTimeout(toastTimer);});
 tick();
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
window.CaritasEncounterDebug=Object.freeze({getState:()=>({story,done,armed,noticed,owned,dialogueBusy,battle:{...battle,words:[...battle.words]}})});
})();
