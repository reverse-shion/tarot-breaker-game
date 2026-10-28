/* Caritas: map discovery -> main-style choice -> shared dialogue -> tarot battle. */
(function(){
"use strict";
const params=new URLSearchParams(location.search);
if(!location.pathname.endsWith("/hoshisuna-main.html")||params.get("dev")!=="hoshisuna")return;
const C=window.CaritasBattleCore;
const CARD_IMAGES=Object.freeze({月:"./assets/tarot/major/18-the-moon.webp",力:"./assets/tarot/major/08-strength.webp",星:"./assets/tarot/major/17-the-star.webp"});
if(!C){console.error("[Caritas] Battle core missing");return;}
const onceKey="tb:dev:caritas:word-guide-once";
const OWNER="hoshisuna_caritas_prompt";
const APPROACH_RADIUS=88,REARM_RADIUS=145;
const NOTICE=[["シオン","……待て。あの獣の様子が妙だ。\n黒紫の光が……体を覆っている。"]];
const INTRO=[
 ["カリタス","……まさか、私がアビスに呑まれるとは……"],
 ["シオン","……大丈夫か。少し、話を聞かせてくれないか。"],
 ["カリタス","……この私が……なんと情けない……近づくでない。"],
 ["シオン","タロット展開。いくぞ、しおぽん。"]
];
const SHIOPON_REPLY=[["しおぽん","はい、シオンさん。"]];
const INVOCATION=[["シオン","言の葉は鍵、星の光は道しるべ。\nステラン、ステラン、ステランーーー 来臨せよ、汝ーーシオリエル！"]];
const REVEAL=[["シオリエル","シオン。恐れの奥に、まだ消えていない願いがある。"]];
let root,prompt,dialogue,cardBox,ui={},story="idle",battle=C.newGame();
 const aiSessionId=(globalThis.crypto?.randomUUID?.()||"00000000-0000-4000-8000-"+Math.random().toString(16).slice(2).padEnd(12,"0"));
 let aiLastState=null,aiBusy=false,aiPendingRequest=null,aiPendingText="";
const AI_CALL_LIMIT=3;
let aiCalls=0,aiPanelOpen=false,aiRetryAt=0;
let once=false,busy=false,done=false,armed=true,noticed=false,owned=false,dialogueBusy=false;
let dialogueLines=[],dialogueIndex=0,afterDialogue=null,timer=0,toastTimer=0;
let cinematicTimer=0,cinematicCallback=null,remaining=0,startedAt=0,pageAway=false;
let modalIndex=-1,readingOpen=false,committing=false,attempts=0;
const SAVE_KEY="tb:dev:hoshisuna:caritas-full-reading-v1",SAVE_VERSION=14;
function checkpoint(){
 try{localStorage.setItem(SAVE_KEY,JSON.stringify({version:SAVE_VERSION,battle,aiCalls,aiConfirmedCalls:aiCalls}));}catch(_){}
}
function clearCheckpoint(){try{localStorage.removeItem(SAVE_KEY);}catch(_){}}
function restoreCheckpoint(){
 try{
  const raw=localStorage.getItem(SAVE_KEY);if(!raw)return false;
  const data=JSON.parse(raw),s=data.battle;
  if(data.version!==SAVE_VERSION||!s||!["read","finisher","ending","defeat"].includes(s.phase)||
    !Number.isInteger(s.turn)||s.turn<0||s.turn>1000||
    !["hp","dark","resonance"].every(k=>Number.isInteger(s[k])&&s[k]>=0&&s[k]<=100)||
    !Array.isArray(s.cards)||s.cards.length!==3||!Array.isArray(s.words)||s.words.length!==3){
    clearCheckpoint();return false;
  }
  battle=s;readingOpen=false;aiCalls=Number.isInteger(data.aiConfirmedCalls)?Math.max(0,Math.min(AI_CALL_LIMIT,data.aiConfirmedCalls)):0;attempts=1;noticed=true;busy=true;lock();root.hidden=false;story="battle";root.dataset.phase="battle";
  if(s.phase==="ending"){render();beginEnding();}
  else if(s.phase==="defeat"){render();beginRetreat();}
  else render();
  return true;
 }catch(_){clearCheckpoint();return false;}
}
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
 window.TarotHoshisunaManifestation?.pause?.();
 if(cinematicTimer){clearTimeout(cinematicTimer);cinematicTimer=0;remaining=Math.max(0,remaining-(performance.now()-startedAt));}
 root.dataset.paused="true";
}
function resumeCinematic(){
 if(suspended())return;
 window.TarotHoshisunaManifestation?.resume?.();
 root.dataset.paused="false";
 if(!cinematicTimer)armCinematic();
}
function beginBattle(){
 story="battle";root.dataset.phase="battle";modalIndex=-1;readingOpen=false;committing=false;
 checkpoint();render();
 if(!once){once=true;try{sessionStorage.setItem(onceKey,"1");}catch(_){}toast("月・力・星のカードをタップして意味を選ぼう");}
}
function beginEnding(){
 clearTimeout(toastTimer);ui.toast.hidden=true;
 stage("purifying",2600,()=>{
   stage("purified",1100,()=>{
     story="farewell";root.dataset.phase="farewell";
     saySequence(FAREWELL,()=>{
       // Restore the real Shiopon sprite while the battle screen still covers the map.
       // The reveal cannot leave a one-frame afterimage during the return fade.
       window.TarotHoshisunaManifestation?.clear?.();
       stage("returning",900,finish);
     });
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
 dialogue.show({speaker,text,actor:speaker==="シオン"?"shion":speaker==="シオリエル"?"shioriel":speaker==="しおぽん"?"shiopon":"caritas"});
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
 window.TarotStage?.perform?.({type:"face",actor:"shion",target:{x:1013,y:210}});
 window.dispatchEvent(new Event("tarot-breaker:caritas-approach"));
 const manifestation=window.TarotHoshisunaManifestation;
 function recover(reason){
   console.error("[Caritas] map manifestation failed:",reason);
   manifestation?.clear?.();root.hidden=true;story="choice";showPrompt();
 }
 saySequence(attempts>0?INTRO.slice(-1):INTRO,()=>{
   if(!manifestation?.moveForward||!manifestation?.faceFront){
     recover("map actor service unavailable");return;
   }
   // Shiopon speaks while the existing follower walks in front of Shion.
   let lineDone=false,moveDone=false,failed=null,continued=false;
   const whenReady=()=>{
     if(!lineDone||continued)return;
     if(failed){continued=true;recover(failed);return;}
     if(!moveDone)return;
     continued=true;
     manifestation.faceFront();
     window.TarotStage?.perform?.({type:"face",actor:"shion",target:"shiopon"});
     story="invocation";
     saySequence(INVOCATION,()=>{
       if(!manifestation.begin()){recover("map atlas not ready");return;}
       stage("manifestation",3900,()=>{
         if(!manifestation.reveal()){recover("reveal interrupted");return;}
         story="manifested";root.dataset.phase="manifested";render();
         saySequence(REVEAL,()=>{
           battle=C.newGame();aiCalls=0;aiRetryAt=0;aiPanelOpen=false;aiPendingRequest=null;aiPendingText="";attempts++;root.hidden=false;stage("engulfing",2600,beginBattle);
         });
       });
     });
   };
   saySequence(SHIOPON_REPLY,()=>{lineDone=true;whenReady();});
   Promise.resolve(manifestation.moveForward()).then(result=>{
     if(result?.completed)moveDone=true;
     else failed=result?.reason||"no safe position ahead of Shion";
     whenReady();
   }).catch(error=>{failed=error?.message||"walk failed";whenReady();});
 });
}
function setText(el,value){el.textContent=String(value);}
function render(){
 const s=battle,reading=story==="battle"&&s.phase==="read"&&!dialogueBusy&&!committing;
 const finisher=story==="battle"&&s.phase==="finisher"&&!dialogueBusy&&!committing;
 root.dataset.readingOpen=String(readingOpen&&reading&&!committing);
 ui.readingIntro.hidden=!(story==="battle"&&s.phase==="read"&&!readingOpen&&!dialogueBusy&&!committing);
 ui.controls.hidden=story==="battle"&&s.phase==="read"&&!readingOpen;
 if(story==="battle"&&s.phase==="finisher")ui.controls.hidden=false;
 const displayedDark=["purified","farewell","returning"].includes(story)?0:s.dark;
 setText(ui.res,s.resonance+"/100");setText(ui.dark,displayedDark+"/100");setText(ui.hp,s.hp+"/100");
 setText(ui.mood,"心象："+C.STATES[C.stateFor(s.dark)]);
 ui.resBar.style.width=s.resonance+"%";ui.darkBar.style.width=displayedDark+"%";ui.hpBar.style.width=s.hp+"%";
 root.dataset.mood=C.stateFor(s.dark);
 const p=C.predict(s),idx=C.stateFor(s.dark)==="closed"?0:C.stateFor(s.dark)==="storm"?1:2;
 setText(ui.speech,C.STAGES[idx].speech);setText(ui.clue,C.STAGES[idx].clue);
 cardBox.replaceChildren();
 for(let i=0;i<s.cards.length;i++){
  const card=s.cards[i],section=newEl("section","cb-card");
  section.append(newEl("div","cb-role",card.role));
  const btn=newEl("button","cb-card-button");btn.type="button";btn.disabled=!reading||!readingOpen;
  btn.setAttribute("aria-label",card.name+"を開いて意味を選ぶ");
  btn.setAttribute("aria-pressed",String(!!s.words[i]));
  const art=newEl("div","cb-card-art"),image=newEl("img","cb-card-image");
  image.src=CARD_IMAGES[card.name]||"";image.alt=card.name+"のタロットカード";
  image.loading="eager";image.decoding="async";art.append(image);btn.append(art);
  btn.addEventListener("click",()=>openCard(i));
  section.append(btn,newEl("div","cb-chosen",s.words[i]?C.READING_OPTIONS[s.words[i]].title:"タップして読む"));
  cardBox.append(section);
 }
 if(p){
  const darkLabel=p.darkBucket==="大きく"?"大きく減少":p.darkBucket==="通常"?"減少":p.darkBucket==="わずかに"?"わずかに減少":"変化なし";
  const resLabel=p.resBucket==="大きく"?"大きく上昇":p.resBucket==="通常"?"上昇":p.resBucket==="わずかに"?"わずかに上昇":"変化なし";
  setText(ui.preview,p.dark===s.dark?"闇：解放":"闇："+darkLabel+"（"+p.dark+"）");
  setText(ui.tactic,"月 "+p.power+" × 力 "+p.force.toFixed(2)+" ／ 星 貫通"+Math.round(100*p.penetration)+"%　"+(s.resonance+p.resonance===100?"共鳴MAX":"共鳴＋"+p.resonance)+"　"+(!p.hasCounter?"反撃なし":"反撃−"+p.damage));
 }else{
  setText(ui.preview,"選択 "+s.words.filter(Boolean).length+"/3　月→力→星");setText(ui.tactic,"");
 }
 if(ui.aiInput){
  ui.aiInput.disabled=!reading||aiBusy;
  ui.aiSend.disabled=!reading||aiBusy||aiCalls>=AI_CALL_LIMIT||Date.now()<aiRetryAt||s.aiInsightTurn===s.turn||(ui.aiInput.value||"").trim().length<8;
  ui.aiSend.textContent=aiBusy?"読み解いています…":aiCalls>=AI_CALL_LIMIT?"AI読み取りは3回まで（使用済み）":Date.now()<aiRetryAt?"再接続まで少しお待ちください":"AIに言葉を届ける（残り"+(AI_CALL_LIMIT-aiCalls)+"回）";
  ui.aiBody.hidden=!aiPanelOpen;
  ui.aiToggle.setAttribute("aria-expanded",String(aiPanelOpen));
  ui.aiToggle.textContent=aiPanelOpen?"AIの自由記述を閉じる ▲":"AIで自分の言葉を届ける ▼";
  ui.aiPanel.hidden=!(story==="battle"&&s.phase==="read"&&readingOpen);
 }
 ui.read.textContent=finisher?"対話で解放":"この読みを届ける";
 ui.read.disabled=!((reading&&readingOpen&&!!p)||finisher);
 ui.skill.disabled=!finisher||!C.canSkill(s);
 ui.finisher.hidden=!(story==="battle"&&s.phase==="finisher");
 if(!ui.finisher.hidden)setText(ui.finisher,"共鳴MAX　対話か必殺技で解放！");
 // Show a single short toast instead of an overlay that obscures the card row.
 ui.guide.hidden=true;
 ui.finale.hidden=true;
 const show=modalIndex>=0&&reading&&readingOpen;
 ui.modal.hidden=!show;
 if(show){
  const card=s.cards[modalIndex];
  ui.modalTitle.textContent=card.name+" — "+({COMPASS:"いま、自分はどこに立っている？",TRIGGER:"そこから、どんな行動を選ぶ？",ROUTE:"相手へ、どう届ける？"})[card.role];
  ui.modalImage.src=CARD_IMAGES[card.name]||"";
  ui.modalImage.alt=card.name+"のタロットカード";
  ui.modalWords.replaceChildren();
  for(const word of card.words){
   const option=C.READING_OPTIONS[word];
   const btn=newEl("button","cb-modal-word");btn.type="button";
   btn.append(newEl("strong","cb-modal-word-title",option.title),newEl("span","cb-modal-word-desc",option.text));
   btn.setAttribute("aria-label",option.title);
   btn.setAttribute("aria-pressed",String(s.words[modalIndex]===word));
   btn.addEventListener("click",()=>choose(modalIndex,word));
   ui.modalWords.append(btn);
  }
 }
}
function openCard(i){
 if(story!=="battle"||battle.phase!=="read"||!readingOpen||dialogueBusy||aiBusy||committing||suspended())return;
 once=true;ui.guide.hidden=true;modalIndex=i;render();
 ui.modalWords.querySelector(".cb-modal-word")?.focus?.({preventScroll:true});
}
function closeCard(){if(modalIndex<0)return;modalIndex=-1;render();}
function choose(index,word){
 if(modalIndex!==index||story!=="battle"||dialogueBusy||committing||suspended()||battle.phase!=="read")return;
 if(!once){once=true;try{sessionStorage.setItem(onceKey,"1");}catch(_){}}
 battle=C.select(battle,index,word);modalIndex=-1;render();
}
function toast(message){
 clearTimeout(toastTimer);ui.toast.textContent=message;ui.toast.hidden=false;
 toastTimer=setTimeout(()=>{ui.toast.hidden=true;},2100);
}
async function sendAiReading(){
 if(aiBusy||committing||dialogueBusy||story!=="battle"||battle.phase!=="read"||battle.aiInsightTurn===battle.turn||modalIndex>=0)return;
 if(aiCalls>=AI_CALL_LIMIT){toast("この戦闘のAI読み取りは3回までです");return;}
 const reading=(ui.aiInput.value||"").trim();
 if(reading.length<8||reading.length>700){toast("8〜700文字で入力してね");return;}
 if(Date.now()<aiRetryAt){toast("AIの再接続には少し時間をあけてください");return;}
 if(reading!==aiPendingText){aiPendingRequest=globalThis.crypto?.randomUUID?.()||String(Date.now())+"-"+aiSessionId;aiPendingText=reading;}
 const requestTurn=battle.turn;
 aiBusy=true;render();
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000);
 try{
  const configured=window.TAROBRE_CARITAS_API_URL;
  if(typeof configured!=="string"||!/^https:\/\/[^\s]+$/.test(configured))throw Error("AI接続先が未設定です");
  const endpoint=configured;
  const response=await fetch(endpoint,{method:"POST",signal:controller.signal,
   headers:{"Content-Type":"application/json"},
   body:JSON.stringify({reading,turn:Math.min(2,Math.max(0,battle.turn)),sessionId:aiSessionId,requestId:aiPendingRequest})});
  if(!response.ok){
   const detail=await response.json().catch(()=>({}));
   const code=typeof detail.error==="string"?detail.error:"";
   const messages={
    ai_upstream_quota:"Gemini側の利用上限に達しています。",
    ai_model_unavailable:"指定されたAIモデルは現在利用できません。",
    ai_upstream_auth:"Gemini APIキーの権限を確認する必要があります。",
    ai_empty_response:"AIの返答が空でした。",
    ai_invalid_json:"AIの返答を読み取れませんでした。",
    ai_unavailable:"AIの応答を取得できませんでした。",
    ai_invalid_response:"AIの返答形式に問題が発生しました。",
    ai_temporarily_disabled:"現在AI機能を停止しています。",
    ai_not_configured:"AIのサーバー設定が完了していません。",
    origin_denied:"ゲームの接続元が許可されていません。"
   };
   const message=response.status===429?"AIの利用が集中しています。":messages[code]||(response.status===401||response.status===403?"AIへのアクセスが拒否されました。":"AIに接続できませんでした。");
   ui.aiResult.textContent=message+" AIの利用回数は減りません。カードを選ぶ通常の読みは続けられます。";
   aiRetryAt=Date.now()+8000;
   setTimeout(()=>{if(root&&!root.hidden)render();},8100);
   return;
  }
  const data=await response.json();
  if(typeof data.shion!=="string"||!data.shion.trim()||typeof data.caritas!=="string"||!data.caritas.trim())throw Error("応答が不正です");
  // Only the same unresolved battle turn is allowed to receive the dialogue/bonus.
  if(story!=="battle"||battle.phase!=="read"||battle.turn!==requestTurn)return;
  const before=battle;
  battle=C.applyAiInsight(battle,Array.isArray(data.understandingIds)?data.understandingIds:[]);
  aiCalls++;checkpoint(); // Charge only a successful, usable Gemini reply.
  const gain=battle.resonance-before.resonance,relief=before.dark-battle.dark;
  aiLastState=null;aiPendingRequest=null;aiPendingText="";
  ui.aiInput.blur(); // Dismiss the iPhone keyboard before the cinematic dialogue.
  aiPanelOpen=false;ui.aiResult.textContent="";
  // Reuse the existing main-game speaker/name-coloured dialogue, never plain AI text.
  saySequence([["シオン",data.shion],["カリタス",data.caritas]],()=>{
   render();
   if(gain>0||relief>0){
    ui.resBar.parentElement.classList.add("cb-ai-meter-flash");
    ui.darkBar.parentElement.classList.add("cb-ai-meter-flash");
    setTimeout(()=>{
     ui.resBar?.parentElement?.classList.remove("cb-ai-meter-flash");
     ui.darkBar?.parentElement?.classList.remove("cb-ai-meter-flash");
    },1200);
    toast("心象共鳴＋"+gain+"　闇侵食−"+relief);
   }else{
    toast("言葉は届いた。次はカードの意味から、もう一歩考えてみよう");
   }
  });
 }catch(error){
  ui.aiResult.textContent="通信できません。文章とAIの利用回数は保持しています。 "+(error.name==="AbortError"?"応答が時間切れになりました。":error.message);
  aiRetryAt=Date.now()+8000;
  setTimeout(()=>{if(root&&!root.hidden)render();},8100);
 }
 finally{clearTimeout(timer);aiBusy=false;render();}
}
function perform(kind){
 if(story!=="battle"||dialogueBusy||aiBusy||committing||suspended()||modalIndex>=0)return;
 if(battle.phase==="finisher"&&["skill","dialogue"].includes(kind)){
  const next=C.finish(battle,kind);if(next===battle)return;
  committing=true;battle=next;checkpoint();
  if(kind==="skill"){
   stage("cutin",1700,()=>stage("technique",1500,()=>{committing=false;beginEnding();}));
  }else{
   saySequence([["シオン",C.preview({...battle,words:battle.lastReading||battle.words})+"\nこの言葉を、君に届けたい。"]],()=>{committing=false;beginEnding();});
  }
  return;
 }
 if(kind!=="read"||battle.phase!=="read"||!readingOpen)return;
 const previous=battle,p=C.predict(previous);
 if(!p)return;
 // Dialogue MUST complete before the battle model is mutated or any hit occurs.
 // The selected three full meanings become one Shion reading in the main shared
 // dialogue UI (three short pages, never duplicated keyword recitation).
 committing=true;modalIndex=-1;readingOpen=false;render();
 const pages=C.readingPages(previous).map(line=>["シオン",line]);
 if(pages.length!==3){committing=false;readingOpen=true;render();return;}
 saySequence(pages,()=>{
   if(story!=="battle"||battle.turn!==previous.turn)return;
   const next=C.read(previous);
   battle=next;checkpoint(); // One committed attack, never replayed after reload.
   stage("word-strike",1050,()=>applyOutcome(previous,next,p));
 });
}
function applyOutcome(previous,next,p){
 battle=next;story="battle";root.dataset.phase="battle";readingOpen=false;
 // Show the impact and both meters BEFORE Caritas reacts. Counterattack follows.
 render();
 const values=["闇−"+p.dark,"共鳴＋"+p.resonance];
 if(values.length)toast(values.join("　"));
 saySequence([["カリタス",C.reaction(previous,p)]],()=>{
   if(p.hasCounter&&p.damage>0){
     root.dataset.counter="normal";root.dataset.ward="false";
     setText(ui.enemyCall,"カリタスの反撃！");
     setText(ui.enemyDamage,"シオリエル HP −"+p.damage);
     stage("enemy-turn",1050,finalizeTurn);
   }else finalizeTurn();
 });
}
function finalizeTurn(){
 story="battle";root.dataset.phase="battle";
 if(battle.phase==="defeat"){beginRetreat();return;}
 if(battle.phase==="ending"){beginEnding();return;}
 committing=false;readingOpen=false;checkpoint();render();
}
function beginRetreat(){
 if(story==="retreat"||story==="returning")return;
 committing=true;modalIndex=-1;story="retreat";root.dataset.phase="retreat";render();
 saySequence([["シオン","……これ以上は危険だ。一度撤退だ、シオリエル！"],
  ["シオリエル","……承知した、シオン。"]],()=>{
   window.TarotHoshisunaManifestation?.clear?.();
   stage("returning",900,finishRetreat);
 });
}
function finishRetreat(){
 clearTimeout(cinematicTimer);cinematicCallback=null;clearTimeout(toastTimer);
 window.TarotHoshisunaManifestation?.clear?.();
 dialogue?.hide();root.hidden=true;ui.modal.hidden=true;
 clearCheckpoint();battle=C.newGame();modalIndex=-1;committing=false;
 story="idle";busy=false;armed=false;noticed=true;unlock();
 // Re-offer the *inspection choice* shortly after withdrawal, never auto-restart battle.
 setTimeout(()=>{if(story==="idle"&&!done){armed=true;tick();}},1300);
}
function finish(){
 if(done)return;
 // Clear canvas actor first, THEN expose the world map.
 window.TarotHoshisunaManifestation?.clear?.();
 done=true;story="complete";root.hidden=true;dialogue?.hide();clearCheckpoint();
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
 const dr=newEl("div","cb-hud-row");dr.append(newEl("span","","闇侵食"),ui.dark=newEl("span","","100/100"));
 ui.darkBar=newEl("i");const drb=newEl("div","cb-bar dark");drb.appendChild(ui.darkBar);
 ui.mood=newEl("div","cb-mood","心象：閉ざす");enemy.append(dr,drb,ui.mood);
 const beast=newEl("img","cb-beast");beast.src="./assets/events/hoshisuna/battle/caritas-battle.webp";beast.alt="カリタス";
 const veil=newEl("div","cb-abyss");veil.setAttribute("aria-hidden","true");
 for(let i=0;i<5;i++)veil.append(newEl("i"));
 const release=newEl("div","cb-release");release.setAttribute("aria-hidden","true");
 const angel=newEl("div","cb-angel");
 const hero=newEl("div","cb-hud hero");hero.append(newEl("div","","シオリエル"));
 const hr=newEl("div","cb-hud-row");hr.append(newEl("span","","HP"),ui.hp=newEl("span","","100/100"));
 ui.hpBar=newEl("i");const hb=newEl("div","cb-bar hp");hb.appendChild(ui.hpBar);
 const rr=newEl("div","cb-hud-row");rr.append(newEl("span","","共鳴"),ui.res=newEl("span","","0/100"));
 ui.resBar=newEl("i");const rb=newEl("div","cb-bar resonance");rb.appendChild(ui.resBar);
 hero.append(hr,hb,rr,rb);
 const shion=newEl("div","cb-shion-sprite");shion.setAttribute("role","img");shion.setAttribute("aria-label","シオン");
 const counter=newEl("div","cb-enemy-turn");
 ui.enemyCall=newEl("strong","cb-enemy-call");ui.enemyDamage=newEl("span","cb-enemy-damage");
 counter.append(ui.enemyCall,ui.enemyDamage);
 arena.append(enemy,beast,veil,release,shion,angel,hero,counter);
 const narr=newEl("div","cb-narration");ui.speech=newEl("strong");ui.clue=newEl("small");narr.append(ui.speech,ui.clue);
 const ctr=newEl("div","cb-controls");ui.controls=ctr;cardBox=newEl("div","cb-cards");
 ui.readingIntro=newEl("div","cb-reading-start");
 const introTitle=newEl("strong","cb-reading-start-title","カリタスの心象を読み解く");
 const introHint=newEl("p","cb-reading-start-hint","月は現在地、力は行動、星は届け方。三枚のカードを読み、ひとつの言葉にする。");
 const introButton=newEl("button","cb-reading-start-button","リーディングを始める");introButton.type="button";
 introButton.addEventListener("click",()=>{if(story!=="battle"||battle.phase!=="read"||committing||dialogueBusy)return;readingOpen=true;render();});
 ui.readingIntro.append(introTitle,introHint,introButton);
 const line=newEl("div","cb-readline");ui.preview=newEl("div","cb-preview");ui.tactic=newEl("div","cb-tactic");line.append(ui.preview,ui.tactic);
 ui.finisher=newEl("div","cb-finisher");ui.finisher.hidden=true;
 const actions=newEl("div","cb-actions");
 ui.read=newEl("button","cb-read","この言葉を届ける");ui.skill=newEl("button","cb-skill","必殺技");
 ui.read.addEventListener("click",()=>perform(battle.phase==="finisher"?"dialogue":"read"));
 ui.skill.addEventListener("click",()=>perform("skill"));
 ui.aiPanel=newEl("div","cb-ai-panel");
 const label=newEl("label","cb-ai-label","月・力・星から感じたことを、自分の言葉で");
 ui.aiInput=newEl("textarea","cb-ai-input");ui.aiInput.rows=3;ui.aiInput.maxLength=700;
 ui.aiInput.placeholder="カリタスに何を伝えたい？";label.append(ui.aiInput);
 ui.aiSend=newEl("button","cb-ai-send","AIに言葉を届ける（試作）");ui.aiSend.type="button";
 ui.aiSend.addEventListener("click",sendAiReading);
 ui.aiInput.addEventListener("input",()=>{ui.aiSend.disabled=aiBusy||aiCalls>=AI_CALL_LIMIT||Date.now()<aiRetryAt||battle.aiInsightTurn===battle.turn||(ui.aiInput.value||"").trim().length<8;});
 ui.aiResult=newEl("div","cb-ai-result");ui.aiResult.setAttribute("aria-live","polite");
 ui.aiToggle=newEl("button","cb-ai-toggle","AIで自分の言葉を届ける ▼");ui.aiToggle.type="button";ui.aiToggle.setAttribute("aria-expanded","false");
 ui.aiBody=newEl("div","cb-ai-body");ui.aiBody.hidden=true;
 ui.aiToggle.addEventListener("click",()=>{
  aiPanelOpen=!aiPanelOpen;ui.aiBody.hidden=!aiPanelOpen;
  ui.aiToggle.setAttribute("aria-expanded",String(aiPanelOpen));
  ui.aiToggle.textContent=aiPanelOpen?"AIの自由記述を閉じる ▲":"AIで自分の言葉を届ける ▼";
  if(aiPanelOpen)ui.aiPanel.scrollIntoView({block:"nearest",behavior:"smooth"});
 });
 ui.aiBody.append(label,ui.aiSend,ui.aiResult);ui.aiPanel.append(ui.aiToggle,ui.aiBody);
 actions.append(ui.read,ui.skill);ctr.append(cardBox,ui.aiPanel,line,ui.finisher,actions);frame.append(arena,narr,ctr);
 ui.toast=newEl("div","cb-toast");ui.toast.hidden=true;
 ui.guide=newEl("div","cb-tutorial");ui.guide.hidden=true;
 ui.finale=newEl("div","cb-finale");ui.finale.hidden=true;
 ui.modal=newEl("div","cb-card-overlay");ui.modal.hidden=true;ui.modal.setAttribute("role","dialog");
 ui.modal.setAttribute("aria-modal","true");ui.modal.setAttribute("aria-label","カードの解釈");
 const shade=newEl("button","cb-card-shade");shade.type="button";shade.setAttribute("aria-label","カードを閉じる");
 shade.addEventListener("click",closeCard);
 const panel=newEl("div","cb-card-panel");
 const close=newEl("button","cb-modal-close","× 閉じる");close.type="button";close.addEventListener("click",closeCard);
 ui.modalTitle=newEl("div","cb-modal-title");ui.modalImage=newEl("img","cb-modal-image");ui.modalWords=newEl("div","cb-modal-words");
 panel.append(close,ui.modalTitle,ui.modalImage,ui.modalWords);ui.modal.append(shade,panel);
 document.addEventListener("keydown",e=>{if(e.key==="Escape"&&modalIndex>=0){e.preventDefault();closeCard();}});
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
 root.append(frame,ui.readingIntro,ui.toast,ui.guide,ui.finale,cutin,technique,ui.modal);shell.appendChild(root);
 dialogue=window.TarotDialogueUI.create({
   // Exactly the Garden main dialogue mount and element IDs. The battle UI
   // also lives in the same shell so its stacking order stays predictable.
   mount:shell,
   ids:{layer:"dialogue-layer",advance:"dialogue-advance",speaker:"dialogue-speaker",text:"dialogue-text"},
   onAdvance:advanceDialogue
 });
 if(!restoreCheckpoint())render();
 timer=setInterval(tick,160);
 document.addEventListener("visibilitychange",()=>{if(suspended())pauseCinematic();else resumeCinematic();});
 window.addEventListener("pagehide",()=>{pageAway=true;pauseCinematic();clearInterval(timer);timer=0;clearTimeout(toastTimer);ui.toast.hidden=true;});
 window.addEventListener("pageshow",()=>{pageAway=false;if(!timer&&!done)timer=setInterval(tick,160);resumeCinematic();tick();});
 tick();
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
window.CaritasEncounterDebug=Object.freeze({getState:()=>({story,done,armed,noticed,owned,dialogueBusy,readingOpen,committing,cinematicPending:!!cinematicCallback,battle:{...battle,words:[...battle.words]}})});
})();
