/* Caritas heart-resonance bridge; dev=hoshisuna only. Existing map owns movement. */
(function(){
"use strict";
const params=new URLSearchParams(location.search);
if(!location.pathname.endsWith("/hoshisuna-main.html")||params.get("dev")!=="hoshisuna")return;
const C=window.CaritasBattleCore;
if(!C){console.error("[Caritas] Battle core missing");return;}
const onceKey="tb:dev:caritas:word-guide-once";
const INTRO=[
 ["カリタス","……まさか、私がアビスに呑まれるとは……"],
 ["シオン","……大丈夫か。少し、話を聞かせてくれないか。"],
 ["カリタス","……この私が……なんと情けない……近づくでない。"],
 ["シオン","いくぞ、しおぽん。タロット展開。"],
 ["シオン","言の葉は鍵、星の光は道しるべ。\nステラン、ステラン、ステランーーー 来臨せよ、汝ーーシオリエル！"],
 ["シオリエル","シオン。恐れの奥に、まだ消えていない願いがある。"]
];
let root,inspect,cardBox,ui={},introIndex=0,story="idle",battle=C.newGame(),once=false,busy=false,done=false,timer=0,toastTimer=0,guideTimer=0;
const newEl=(tag,cls,text)=>{const el=document.createElement(tag);if(cls)el.className=cls;if(text!==undefined)el.textContent=text;return el;};
function near(){
 const a=window.TarotStage?.getState?.().actors?.shion;
 if(!a||!Number.isFinite(a.x)||!Number.isFinite(a.y))return false;
 // This is an outer interaction halo, not the collision footprint.
 return Math.hypot(Math.max(934-a.x,0,a.x-1092),Math.max(150-a.y,0,a.y-272))<88;
}
function tick(){
 if(!inspect)return;
 const visible=story==="idle"&&!done&&document.body.classList.contains("scene-ready")&&near();
 inspect.hidden=!visible;
}
function start(){
 if(busy||story!=="idle"||done||!near())return;
 busy=true;
 inspect.hidden=true;
 // Shared Garden owns all movement, following, input leases and camera.
 window.dispatchEvent(new CustomEvent("tarot-breaker:interaction-start",{detail:{owner:"hoshisuna-caritas"}}));
 window.dispatchEvent(new Event("tarot-breaker:caritas-approach"));
 story="intro";introIndex=0;root.hidden=false;root.dataset.phase="intro";showIntro();
}
function showIntro(){
 const d=INTRO[introIndex];ui.introName.textContent=d[0];ui.introText.textContent=d[1];
 ui.introNext.textContent=introIndex===INTRO.length-1?"タロットを読む":"次へ";
}
function advanceIntro(){
 if(story!=="intro")return;
 introIndex++;
 if(introIndex>=INTRO.length){story="battle";battle=C.newGame();root.dataset.phase="battle";render();return;}
 showIntro();
}
function setText(el,value){el.textContent=String(value);}
function render(){
 if(story!=="battle")return;
 const s=battle,reading=s.phase==="read",ending=s.phase==="ending",defeat=s.phase==="defeat";
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
   art.append(newEl("div","cb-symbol",card.mark),newEl("span","",card.name));
   section.append(art);
   const words=newEl("div","cb-words");
   for(const word of card.words){
     const btn=newEl("button","cb-word",word);btn.type="button";
     btn.setAttribute("aria-pressed",String(s.words[i]===word));btn.disabled=!reading;
     btn.addEventListener("click",()=>choose(i,word));
     words.appendChild(btn);
   }
   section.appendChild(words);cardBox.appendChild(section);
 }
 ui.read.disabled=!reading;ui.defend.disabled=!reading;
 ui.skill.disabled=!reading||s.used||s.resonance<33||s.dark>67;
 const showGuide=reading&&!once;
 ui.guide.hidden=!showGuide;
 if(showGuide)ui.guide.textContent="最初の一回だけ。\nカードの下の言葉をタップすると、読み方が変わるよ。";
 ui.finale.hidden=!ending&&!defeat;
 if(ending){
  const [name,line]=C.ENDING[s.endIndex]||["",""];
  setText(ui.finaleText,(name?name+"\n":"")+line);
  setText(ui.finaleNext,s.endIndex>=C.ENDING.length-1?"探索に戻る":"次へ");
 } else if(defeat){
  setText(ui.finaleText,"力尽きてしまった……\nもう一度、カードを読もう。");
  setText(ui.finaleNext,"やり直す");
 }
}
function choose(index,word){
 if(story!=="battle")return;
 if(!once){once=true;try{sessionStorage.setItem(onceKey,"1");}catch(_){}}
 battle=C.select(battle,index,word);render();
}
function toast(message){
 clearTimeout(toastTimer);ui.toast.textContent=message;ui.toast.hidden=false;
 toastTimer=setTimeout(()=>{ui.toast.hidden=true;},2300);
}
function perform(kind){
 if(story!=="battle"||battle.phase!=="read")return;
 const original=battle;
 if(kind==="read")battle=C.read(battle);
 if(kind==="defend")battle=C.defend(battle);
 if(kind==="skill")battle=C.skill(battle);
 if(original===battle)return;
 render();toast(battle.result||"");
}
function advanceFinale(){
 if(story!=="battle")return;
 if(battle.phase==="defeat"){battle=C.newGame();render();return;}
 if(battle.phase!=="ending")return;
 battle=C.next(battle);
 if(battle.phase==="complete"){finish();return;}
 render();
}
function finish(){
 if(done)return;
 done=true;story="complete";root.hidden=true;clearTimeout(toastTimer);clearTimeout(guideTimer);
 const creature=document.querySelector(".hoshi-caritas");
 if(creature)creature.hidden=true;
 document.body.classList.add("caritas-departed");
 // Turn off the NPC obstacle only after the creature has actually left.
 window.TarotHoshisunaCollision?.setActive?.(false);
 busy=false;
 window.dispatchEvent(new CustomEvent("tarot-breaker:interaction-end",{detail:{owner:"hoshisuna-caritas"}}));
 tick();
}
function init(){
 const shell=document.getElementById("game-shell");
 if(!shell||!document.getElementById("hoshisuna-caritas"))return;
 try{once=sessionStorage.getItem(onceKey)==="1";}catch(_){once=false;}
 inspect=newEl("button","","調べる");inspect.id="caritas-inspect";inspect.type="button";inspect.hidden=true;
 inspect.addEventListener("click",start);document.body.appendChild(inspect);
 root=newEl("section");root.id="caritas-event";root.hidden=true;root.dataset.phase="intro";
 root.setAttribute("aria-label","カリタス 心象共鳴");
 const intro=newEl("section","cb-intro");
 ui.introName=newEl("div","cb-intro-name");ui.introText=newEl("div","cb-intro-text");
 ui.introNext=newEl("button","cb-intro-next","次へ");ui.introNext.type="button";ui.introNext.addEventListener("click",advanceIntro);
 intro.append(ui.introName,ui.introText,ui.introNext);
 const frame=newEl("section","cb-frame");
 const arena=newEl("div","cb-arena");
 arena.append(newEl("div","cb-title","心象共鳴"));
 const enemy=newEl("div","cb-hud enemy");
 enemy.append(newEl("div","","カリタス"));
 const er=newEl("div","cb-hud-row");er.append(newEl("span","","共鳴"),ui.res=newEl("span","","0/100"));
 ui.resBar=newEl("i");const erb=newEl("div","cb-bar");erb.appendChild(ui.resBar);
 const dr=newEl("div","cb-hud-row");dr.append(newEl("span","","闇"),ui.dark=newEl("span","","100/100"));
 ui.darkBar=newEl("i");const drb=newEl("div","cb-bar dark");drb.appendChild(ui.darkBar);
 enemy.append(er,erb,dr,drb);
 const creature=newEl("img","cb-beast");creature.src="./assets/events/hoshisuna/caritas/sg_rise_01.webp";creature.alt="カリタス";
 const angel=newEl("div","cb-angel");
 const hero=newEl("div","cb-hud hero");hero.append(newEl("div","","シオリエル"));
 const hr=newEl("div","cb-hud-row");hr.append(newEl("span","","HP"),ui.hp=newEl("span","","100/100"));
 ui.hpBar=newEl("i");const hb=newEl("div","cb-bar hp");hb.appendChild(ui.hpBar);hero.append(hr,hb);
 ui.forecast=newEl("div","cb-forecast","次の攻撃：通常");
 arena.append(enemy,creature,angel,hero,ui.forecast,newEl("div","cb-hero-name","シオン・シオリエル"));
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
 ui.finaleText=newEl("div","cb-finale-text");ui.finaleNext=newEl("button","","次へ");
 ui.finaleNext.addEventListener("click",advanceFinale);
 ui.finale.append(ui.finaleText,ui.finaleNext);
 root.append(intro,frame,ui.toast,ui.guide,ui.finale);
 document.body.appendChild(root);
 timer=setInterval(tick,150);
 window.addEventListener("pagehide",()=>{clearInterval(timer);clearTimeout(toastTimer);});
 tick();
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
window.CaritasEncounterDebug=Object.freeze({getState:()=>({story,done,battle:{...battle,words:[...battle.words]}})});
})();
