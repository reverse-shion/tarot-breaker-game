/* Caritas: main shared dialogue -> main official interaction choice -> tarot battle. */
(function(){
"use strict";
const params=new URLSearchParams(location.search);
if(!location.pathname.endsWith("/hoshisuna-main.html")||params.get("dev")!=="hoshisuna")return;
// Explicit preview URL only. The ordinary ?dev=hoshisuna encounter keeps all
// previously saved battle resume semantics; replay never reads or writes them.
const transformationReplay=params.getAll("preview").length===1&&params.get("preview")==="manifestation";
const C=window.CaritasBattleCore, S=window.CaritasSpecialState;
const CARD_IMAGES=Object.freeze({月:"./assets/tarot/major/18-the-moon.webp",力:"./assets/tarot/major/08-strength.webp",星:"./assets/tarot/major/17-the-star.webp"});
if(!C){console.error("[Caritas] Battle core missing");return;}
const onceKey="tb:dev:caritas:word-guide-once";
const OWNER="hoshisuna_caritas_prompt";
const APPROACH_RADIUS=88,REARM_RADIUS=145;
const CARITAS_GAZE=Object.freeze({x:1013,y:210});
const faceCaritas=()=>window.TarotStage?.perform?.({type:"face",actor:"shion",target:CARITAS_GAZE});
// Latest approved Caritas encounter dialogue (2026-10-31).
// Each row is one official shared-main dialogue window. Preserve character wording.
const NOTICE=[
 ["シオン","……しおぽん、待て。星獣がいる。"],
 ["シオン","滅多に星の国に来ないのに……何か様子がおかしい。"],
 ["シオン","黒紫の靄が……体を覆っている。"]
];
const INSPECT_CHOICE="星獣を包む黒紫の靄が揺れている。……調べてみるか？";
const INTRO=[
 ["カリタス","く、苦しい……アビスが体を侵蝕するなぞとは……"],
 ["シオン","あの星獣、言葉が話せるぞ、しおぽん。"],
 ["しおぽん","ほんとなの！？"],
 ["カリタス","アビス……どうしてだ……この世の理が崩れたとでもいうのか。"],
 ["カリタス","まさか……"],
 ["カリタス","二人とも近づくでない。"],
 ["カリタス","今の私は何をするか分からんぞ！"]
];
// Shiopon's protective move is his own decision after warning, never silent staging.
const SCOUT_REQUEST=[
 ["しおぽん","アビスが喰べてる？ そんな事って……"],
 ["しおぽん","シオンさん。あの子、なんだか苦しそうなの。"],
 ["しおぽん","……助けなきゃ。"],
 ["シオン","待て、しおぽん。あの黒い靄……危険だ。近づくな。"],
 ["しおぽん","でも……あの子、喰べられて声が消えちゃいそうなの。"],
 ["しおぽん","確かめてくるの！"],
 ["シオン","……しおぽん！"]
];
const SCOUT_REPORT=[
 ["しおぽん","……っ！闇が広がる！"],
 ["シオン","まずい……このままじゃ、あの星獣が呑まれる。"],
 ["シオン","……何とか助けないと。"]
];
const TAROT_DECLARATION=[["シオン","タロット展開！！"]];
const SHIOPON_CALL=[["シオン","いくぞ、しおぽん。"]];
const SHIOPON_REPLY=[["しおぽん","はい、シオンさん。"]];
const INVOCATION=[
 ["シオン","言の葉は鍵、星の光は道しるべ。"],
 ["シオン","ステラン、ステラン、ステランーーー 来臨せよ、汝ーーシオリエル！"]
];
const REVEAL=[["シオリエル","シオン。星獣が完全に喰べられる前に、闇から解き放つ。"]];
let root,prompt,dialogue,cardBox,ui={},story="idle",battle=C.newGame();
 const aiSessionId=(globalThis.crypto?.randomUUID?.()||"00000000-0000-4000-8000-"+Math.random().toString(16).slice(2).padEnd(12,"0"));
 let aiLastState=null,aiBusy=false,aiPendingRequest=null,aiPendingText="";
const AI_CALL_LIMIT=3;
let aiCalls=0,aiPanelOpen=false,aiRetryAt=0;
let once=false,busy=false,done=false,armed=true,noticed=false,owned=false,dialogueBusy=false;
let dialogueLines=[],dialogueIndex=0,afterDialogue=null,timer=0,toastTimer=0;
let cinematicTimer=0,cinematicCallback=null,remaining=0,startedAt=0,pageAway=false;
let modalIndex=-1,readingOpen=false,committing=false,visualBattle=null,attempts=0;
let firstWrittenDelivered=false;
const SAVE_KEY="tb:dev:hoshisuna:caritas-full-reading-v1",SAVE_VERSION=15;
// In-memory revision-aware storage for author preview. The real dev battle
// checkpoint is untouched, including when preview reaches combat.
let replaySavedRaw=null;
const replayStore=Object.freeze({
 getItem:key=>key===SAVE_KEY?replaySavedRaw:null,
 setItem:(key,value)=>{if(key!==SAVE_KEY)throw Error("invalid-replay-key");replaySavedRaw=String(value);}
});
const checkpointStore=transformationReplay?replayStore:localStorage;
const runId=()=>globalThis.crypto?.randomUUID?.()||"caritas-"+Date.now()+"-"+Math.random().toString(36).slice(2);
let record=S.create(battle,runId()),savedRaw=null,saveBlocked=false,recovery=false,retrySave=null;
const specialLocked=()=>record.special.committed||saveBlocked||recovery;
function getBattleView(){return visualBattle||battle;}
function recoveryScreen(){
 cancelSpecialEffect();
 recovery=true;saveBlocked=true;busy=true;lock();root.hidden=false;story="recovery";root.dataset.phase=story;
 dialogue?.hide();dialogueBusy=false;
 showSaveProblem("戦闘記録を確認できません。結果の重複を防ぐため、進行を停止しました。",null,true);
}
function showSaveProblem(message,retry,corrupt=false){
 root.dataset.saveError="true";ui.saveProblem.replaceChildren();ui.saveProblem.hidden=false;
 ui.saveProblem.append(newEl("p","",message));
 const button=newEl("button","",corrupt?"もう一度読み込む":"再試行");button.type="button";
 button.addEventListener("click",()=>{if(corrupt){location.reload();return;}retry?.();});ui.saveProblem.append(button);
 if(corrupt){const title=newEl("button","","タイトルへ戻る");title.addEventListener("click",()=>{location.href="./index.html";});ui.saveProblem.append(title);}
 else if(!record.special.committed&&(story==="selecting"||["read","finisher"].includes(battle.phase))){const back=newEl("button","","戻る");back.addEventListener("click",()=>{saveBlocked=false;root.dataset.saveError="false";ui.saveProblem.hidden=true;retrySave=null;if(story!=="selecting"){committing=false;readingOpen=true;render();}});ui.saveProblem.append(back);}
}
function persist(next,onSuccess,expectedRaw=savedRaw){
 try{
  if(recovery||expectedRaw!==savedRaw)return false;
  const result=S.write(checkpointStore,SAVE_KEY,expectedRaw,next);
  record=result.record;savedRaw=result.raw;root.dataset.saveError="false";saveBlocked=false;retrySave=null;ui.saveProblem.hidden=true;
  onSuccess?.();return true;
 }catch(error){
  if(error.message==="revision-conflict"){recoveryScreen();return false;}
  saveBlocked=true;retrySave=()=>persist(next,onSuccess,expectedRaw);
  showSaveProblem("戦闘記録を保存できません。進行を止めています。",retrySave);return false;
 }
}
function checkpoint(){
 return persist({...record,version:SAVE_VERSION,battle,firstWrittenDelivered,aiCalls,aiConfirmedCalls:aiCalls});
}
function clearCheckpoint(onSuccess){
 // Only legacy retreat/dialogue paths use this receipt; special DONE is retained.
 return persist({...record,battle:null,firstWrittenDelivered,aiCalls,aiConfirmedCalls:aiCalls},onSuccess);
}
function restoreCheckpoint(){
 // Dedicated preview starts before the first encounter on every page load.
 // Existing localStorage data is not inspected, reset or overwritten.
 if(transformationReplay)return false;
 try{
  savedRaw=checkpointStore.getItem(SAVE_KEY);if(!savedRaw)return false;
  const data=JSON.parse(savedRaw);record=S.migrate(data,runId());
  firstWrittenDelivered=record.firstWrittenDelivered;aiCalls=record.aiCalls;
  if(!record.battle)return false;
  battle=record.battle;visualBattle=null;readingOpen=false;attempts=1;noticed=true;busy=true;lock();root.hidden=false;story="battle";root.dataset.phase="battle";
  if(record.special.committed){playSpecialSequence();return true;}
  if(battle.phase==="ending"){render();beginEnding();}
  else if(battle.phase==="defeat"){render();beginRetreat();}
  else render();return true;
 }catch(_){recoveryScreen();return true;}
}
function commitSpecialSelection(cardId,playbackMode){
 if(specialLocked()||story!=="selecting"||dialogueBusy||aiBusy||committing||suspended())return;
 const next=S.commit({...record,battle,firstWrittenDelivered,aiCalls,aiConfirmedCalls:aiCalls},cardId,playbackMode);
 return persist(next,()=>{battle=record.battle;playSpecialSequence();});
}
function transitionSpecial(nextPhase,options){
 if(saveBlocked||recovery||!record.special.committed)return false;
 const next=S.transition(record,nextPhase,options);
 return persist(next,()=>{battle=record.battle;playSpecialSequence();});
}
function applySpecialResolution(){
 if(record.special.phase!=="PURIFICATION"||record.special.resolutionApplied)return;
 return transitionSpecial("CARITAS_REPLY");
}
// Source art stays intact. CSS frames only the faces; technique art can be added
// later through this isolated encounter's optional same-origin image slot.
const CUTINS={shion:"./assets/battle/cutins/shion-cutin.webp",shioriel:"./assets/battle/cutins/shioriel-cutin.webp"};
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
 pauseSpecialEffect();
 window.TarotHoshisunaManifestation?.pause?.();
 if(cinematicTimer){clearTimeout(cinematicTimer);cinematicTimer=0;remaining=Math.max(0,remaining-(performance.now()-startedAt));}
 root.dataset.paused="true";
}
function resumeCinematic(){
 resumeSpecialEffect();
 if(suspended())return;
 window.TarotHoshisunaManifestation?.resume?.();
 root.dataset.paused="false";
 if(!cinematicTimer)armCinematic();
}
function beginBattle(){
 preloadSpecialArt();
 story="battle";root.dataset.phase="battle";modalIndex=-1;readingOpen=false;committing=false;
 checkpoint();render();
 if(!once){once=true;try{sessionStorage.setItem(onceKey,"1");}catch(_){}toast("月・力・星のカードをタップして意味を選ぼう");}
}
const TECHNIQUES=Object.freeze({
 '18-the-moon':{name:'月',meaning:'分からない想いと向き合う',title:'星幻迷宮',chant:'星幻迷宮──アストラル・ミラージュ！！',reading:'アストラル・ミラージュ',art:'./assets/battle/special/shioriel-18-astral-mirage.webp',shion:'俺には、まだ分からないことがある。だからこそ、お前の言葉を聞きたい。',shioriel:'シオン。見えない想いにも、光は届く。',reply:'……まだ言葉にできぬものがある。だが……隠すしかないと決めなくてもよいのかもしれぬ。'},
 '08-strength':{name:'力',meaning:'弱さを責めず向き合い方を選ぶ',title:'星獣咆哮',chant:'星獣咆哮──アストラル・ブレイヴ！！',reading:'アストラル・ブレイヴ',art:'./assets/battle/special/shioriel-08-astral-brave.webp',shion:'俺は、誰かを責めるためにここへ来たわけじゃない。どう向き合うか、一緒に考えたい！',shioriel:'シオン。その意志に、星の力を重ねよう。',reply:'……強さとは、耐えることだけだと思っていた。……今は、別の向き合い方も探してみたい。'},
 '17-the-star':{name:'星',meaning:'未来を決めつけず希望を探す',title:'星望祈願',chant:'星望祈願──アストラル・グリモワール！！',reading:'アストラル・グリモワール',art:'./assets/battle/special/shioriel-17-astral-grimoire.webp',shion:'お前の明日を、俺が決めるつもりはない。もし望むなら、次の一歩を共に探そう！',shioriel:'シオン。その願いを、星の光に託そう。',reply:'……この先がどうなるかは、まだ分からぬ。……それでも、次の一歩は私が選ぼう。'}
});
let selectedCard=null,shortPlayback=false,effectGeneration=0,activeEffect=null;
const preloaded=new Map();
function preloadSpecialArt(){
 for(const [id,tech] of Object.entries(TECHNIQUES)){
  if(preloaded.has(id))continue;
  const state={status:'loading',image:null};preloaded.set(id,state);
  if(typeof Image==='undefined'){state.status='failed';continue;}
  const img=new Image();state.image=img;img.decoding='async';
  img.onerror=()=>{state.status='failed';};
  img.onload=async()=>{try{if(img.decode)await img.decode();if(img.naturalWidth<=0)throw Error('empty-image');if(state.status!=='failed')state.status='ready';}catch(_){state.status='failed';}};
  img.src=tech.art;
 }
}
function cancelSpecialEffect(){
 effectGeneration++;
 if(activeEffect){clearTimeout(activeEffect.timer);activeEffect.animation?.cancel?.();activeEffect=null;}
}
// The watchdog counts visible time only. WAAPI finished is the normal completion
// signal; missing completion events use the same generation/phase-checked finish.
function runSpecialEffect(el,duration,callback,kind='hold'){
 cancelSpecialEffect();const generation=effectGeneration,phase=record.special.phase;
 const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
 const job={generation,phase,elapsed:0,last:performance.now(),timer:0,animation:null};activeEffect=job;
 const valid=()=>activeEffect===job&&effectGeneration===generation&&record.special.phase===phase&&!saveBlocked&&!recovery;
 function complete(){if(!valid()||suspended())return;cancelSpecialEffect();callback();}
 if(el?.animate&&!reduced&&kind!=='hold'){
  // Begin at full viewport coverage, then slowly push in; the same lifecycle handles pause/reload.
  const frames=kind==='art'?[{transform:'scale(1)'},{transform:'scale(1.08)'}]:kind==='purify'?[{opacity:0,transform:'scale(.8)'},{opacity:1,transform:'scale(1.1)'}]:[{opacity:0,transform:'translateX(-1.5vw)'},{opacity:1,transform:'translateX(0)'}];
  job.animation=el.animate(frames,{duration,fill:'forwards',easing:'ease-in-out'});
  job.animation.finished.then(complete,()=>{});
  if(suspended())job.animation.pause();
 }
 function watch(){
  if(!valid())return;
  const now=performance.now();if(!suspended())job.elapsed+=Math.max(0,now-job.last);job.last=now;
  if(job.elapsed>=duration+(job.animation?160:0)){complete();return;}
  job.timer=setTimeout(watch,Math.min(32,Math.max(1,duration-job.elapsed)));
 }
 job.resume=()=>{if(!job.timer)job.timer=setTimeout(watch,1);};
 job.timer=setTimeout(watch,Math.min(32,duration));
}
function pauseSpecialEffect(){
 if(!activeEffect||!activeEffect.timer)return;
 const job=activeEffect;job.elapsed+=Math.max(0,performance.now()-job.last);job.last=performance.now();
 clearTimeout(job.timer);job.timer=0;job.animation?.pause?.();
}
function resumeSpecialEffect(){
 if(suspended()||!activeEffect)return;
 // Recreate only a missing-event watchdog; retain animation currentTime.
 const job=activeEffect;job.last=performance.now();job.animation?.play?.();
 if(job.resume)job.resume();
}
function specialVisibleWait(ms,callback){
 cancelSpecialEffect();const phase=record.special.phase,generation=effectGeneration;
 const job={phase,generation,elapsed:0,last:performance.now(),timer:0};activeEffect=job;
 const tick=()=>{
  if(activeEffect!==job||generation!==effectGeneration||record.special.phase!==phase||saveBlocked||recovery)return;
  const now=performance.now();if(!suspended())job.elapsed+=now-job.last;job.last=now;
  const ready=preloaded.get(record.special.cardId)?.status;
  if(!suspended()&&(ready!=='loading'||job.elapsed>=ms)){cancelSpecialEffect();callback(ready==='ready');return;}
  job.timer=setTimeout(tick,Math.min(32,Math.max(1,ms-job.elapsed)));
 };
 job.resume=()=>{if(!job.timer)job.timer=setTimeout(()=>{job.timer=0;tick();},1);};
 job.timer=setTimeout(tick,1);
}
function openSpecialSelection(){
 if(specialLocked()||story!=='battle'||battle.phase!=='finisher'||battle.resonance!==100||battle.used||!C.canSkill(battle)||dialogueBusy||aiBusy||committing||suspended())return;
 story='selecting';root.dataset.phase=story;selectedCard=null;shortPlayback=false;render();renderSpecialSelection();
}
function renderSpecialSelection(){
 ui.selection.replaceChildren();ui.selection.hidden=false;ui.selection.append(newEl('h2','','どのカードの言葉を届けますか？'));
 const row=newEl('div','cb-special-cards');
 for(const [id,t] of Object.entries(TECHNIQUES)){
  const btn=newEl('button','cb-special-card');btn.type='button';btn.setAttribute('aria-pressed',String(selectedCard===id));
  const img=newEl('img');img.src=CARD_IMAGES[t.name];img.alt=t.name;btn.append(img,newEl('span','',t.name));
  btn.addEventListener('click',()=>{if(specialLocked()||story!=='selecting'||suspended())return;selectedCard=id;shortPlayback=false;renderSpecialSelection();});row.append(btn);
 }
 ui.selection.append(row);
 const tech=TECHNIQUES[selectedCard];ui.selection.append(newEl('p','cb-special-meaning',tech?tech.meaning+'／'+tech.title+'（'+tech.reading+'）':'カードを選んでください'));
 if(tech&&record.seenTechniques[selectedCard]===true){
  const label=newEl('label','cb-special-short'),input=newEl('input');input.type='checkbox';input.checked=shortPlayback;
  input.addEventListener('change',()=>{if(!specialLocked()&&story==='selecting')shortPlayback=input.checked;});label.append(input,newEl('span','','演出を短縮'));ui.selection.append(label);
 }
 const back=newEl('button','','戻る');back.type='button';back.addEventListener('click',()=>{if(specialLocked()||story!=='selecting')return;story='battle';root.dataset.phase=story;ui.selection.hidden=true;render();});
 const confirm=newEl('button','','このカードの言葉を届ける');confirm.type='button';confirm.disabled=!tech;
 confirm.addEventListener('click',()=>{if(!selectedCard||specialLocked()||story!=='selecting')return;commitSpecialSelection(selectedCard,shortPlayback?'short':'normal');});ui.selection.append(back,confirm);
}
function playSpecialSequence(){
 cancelSpecialEffect();dialogue?.hide();dialogueBusy=false;dialogueLines=[];afterDialogue=null;
 const p=record.special.phase,t=TECHNIQUES[record.special.cardId],short=record.special.playbackMode==='short';
 ui.selection.hidden=true;ui.artPlayback.hidden=true;root.dataset.special=p;root.dataset.card=record.special.cardId;
 document.body.classList.add('caritas-special-active');committing=true;visualBattle=null;
 if(p==='DONE'){returnToMap();return;}
 story='special';root.dataset.phase='special';render();
 const linePhases={SHION_LINE:['シオン',t.shion,'SHIORIEL_LINE'],SHIORIEL_LINE:['シオリエル',t.shioriel,'DUAL_INCANTATION'],DUAL_INCANTATION:['シオン＆シオリエル',t.chant,'ART_PLAYBACK'],CARITAS_REPLY:['カリタス',t.reply,'FAREWELL'],FAREWELL:['カリタス','……世話になった。','RETURNING']};
 if(linePhases[p]){
  const [speaker,text,next]=linePhases[p];
  saySequence([[speaker,text]],()=>transitionSpecial(next));
  if(['SHION_LINE','SHIORIEL_LINE','DUAL_INCANTATION'].includes(p))runSpecialEffect(ui.cutin,short?120:600,()=>{},'entry');
 }else if(p==='ART_PLAYBACK'){
  // Shared dialogue is hidden before any art frame becomes visible.
  root.dataset.artReady='loading';ui.artPlayback.hidden=false;ui.artImage.hidden=true;ui.artBackdrop.hidden=true;
  specialVisibleWait(1200,ready=>{
   if(ready){ui.artImage=preloaded.get(record.special.cardId).image;ui.artImage.className='cb-special-foreground';ui.artImage.alt=t.title+'の必殺技イラスト';ui.artImage.hidden=false;ui.artBackdrop.src=t.art;ui.artBackdrop.hidden=false;ui.artPlayback.replaceChildren(ui.artBackdrop,ui.artImage);}
   root.dataset.artReady=String(ready);
   runSpecialEffect(ui.artImage,short?600:2600,()=>transitionSpecial('PURIFICATION',{imageDisplayed:ready&&ui.artImage.naturalWidth>0}),'art');
  });
 }else if(p==='PURIFICATION'){playPurification(short);}
 else if(p==='RETURNING'){runSpecialEffect(null,900,()=>transitionSpecial('DONE'));}
}
function playPurification(short){root.style.setProperty?.('--cb-purification',short?'450ms':'1100ms');runSpecialEffect(ui.release,short?450:1100,applySpecialResolution,'purify');}
function returnToMap(){
 if(record.special.phase!=='DONE'||!record.special.completed)return;
 document.body.classList.remove('caritas-special-active');finish();
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
 dialogue.show({speaker,text,actor:speaker==="シオン"?"shion":speaker==="シオリエル"?"shioriel":speaker==="しおぽん"?"shiopon":speaker==="シオン＆シオリエル"?"shion-shioriel":"caritas"});
 // The shared controller's instant reveal invalidates its own RAF token in
 // reduced-motion mode. Repair visibility only for this encounter instance.
 if(window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches){
  dialogue.elements.layer.classList.add('visible');dialogue.elements.button.classList.add('visible');
 }
}
function saySequence(lines,callback){
 if(!dialogue||!lines?.length)throw new Error("Caritas dialogue not ready");
 dialogueLines=lines;dialogueIndex=0;afterDialogue=callback;dialogueBusy=true;
 currentLine();
}
function advanceDialogue(){
 if(!dialogueBusy||suspended()||saveBlocked||recovery||story==="choice")return;
 dialogueIndex++;
 if(dialogueIndex<dialogueLines.length){currentLine();return;}
 dialogue.hide();dialogueBusy=false;dialogueLines=[];
 const callback=afterDialogue;afterDialogue=null;callback?.();
}
function showPrompt(){
 if(story!=="choice")return;
 // Main uses a standalone, official interaction panel for choices;
 // no extra dialogue window or encounter-specific positioning.
 dialogue.hide();dialogueBusy=false;dialogueLines=[];afterDialogue=null;
 prompt.hidden=false;prompt.classList.add("visible");
}
function hidePrompt(){
 prompt.classList.remove("visible");prompt.hidden=true;
 dialogue.hide();dialogueBusy=false;dialogueLines=[];afterDialogue=null;
}
function notice(){
 if(story!=="idle"||!armed||!sceneReady()||busy)return;
 busy=true;noticed=true;story="notice";lock();
 faceCaritas(); // face the creature on the very FIRST startled line
 saySequence(NOTICE,()=>{story="choice";showPrompt();});
}
function offerAgain(){
 if(story!=="idle"||!armed||busy)return;
 busy=true;story="choice";lock();faceCaritas();showPrompt();
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
 faceCaritas();
 window.dispatchEvent(new Event("tarot-breaker:caritas-approach"));
 const manifestation=window.TarotHoshisunaManifestation;
 const abyss=window.TarotHoshisunaAbyss;
 function recover(reason){
   console.error("[Caritas] map manifestation failed:",reason);
   manifestation?.clear?.();abyss?.setPhase?.("edge");root.hidden=true;story="choice";showPrompt();
 }
 function deployTarot(){
   saySequence(TAROT_DECLARATION,()=>{
     abyss?.setPhase?.("engulfed");
     if(!manifestation?.deployCards?.()){recover("tarot card back not ready");return;}
     stage("tarot-deploy",650,()=>{
       saySequence(SHIOPON_CALL,()=>{
         story="intro";
         let lineDone=false,moveDone=false,failed=null,continued=false;
         const whenReady=()=>{
           if(!lineDone||continued)return;
           if(failed){continued=true;recover(failed);return;}
           if(!moveDone)return;
           continued=true;
           manifestation.faceFront();
           // Eyes stay on the threatened child for the entire chant.
           faceCaritas();
           story="invocation";
           saySequence(INVOCATION,()=>{
             // Shion continues to face Caritas through the transformation.
             faceCaritas();
             if(!manifestation.begin()){recover("map atlas not ready");return;}
             stage("manifestation",5500,()=>{
               if(!manifestation.reveal()){recover("reveal interrupted");return;}
               story="manifested";root.dataset.phase="manifested";render();
               saySequence(REVEAL,()=>{
                 battle=C.newGame();visualBattle=null;aiCalls=0;aiRetryAt=0;aiPanelOpen=false;aiPendingRequest=null;aiPendingText="";record={...S.create(battle,runId()),revision:record.revision,seenTechniques:record.seenTechniques,firstWrittenDelivered};attempts++;root.hidden=false;stage("engulfing",2600,beginBattle);
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
     });
   });
 }
 function scoutAhead(){
   if(!manifestation?.prepareLeft||!manifestation?.moveForward||!manifestation?.faceFront){
     recover("map actor service unavailable");return;
   }
   // Shiopon moves voluntarily after Shion explicitly warns him not to.
   // The invaded outline erupts while Shiopon approaches the danger.
   abyss?.setPhase?.("surge");
   Promise.resolve(manifestation.prepareLeft()).then(prepared=>{
     if(story!=="intro"||!owned||done)return;
     if(!prepared?.completed){recover(prepared?.reason||"scouting route blocked");return;}
     abyss?.setPhase?.("engulfed");
     // On arrival, keep eyes on the child, not the empty walkway.
     window.TarotStage?.perform?.({type:"face",actor:"shiopon",target:CARITAS_GAZE});
     saySequence(SCOUT_REPORT,deployTarot);
   }).catch(error=>recover(error?.message||"scouting walk failed"));
 }
 saySequence(attempts>0?INTRO.slice(-1):INTRO,()=>{
   saySequence(SCOUT_REQUEST,scoutAhead);
 });
}
function setText(el,value){el.textContent=String(value);}
function render(){
 const s=battle,visible=getBattleView(),reading=story==="battle"&&s.phase==="read"&&!dialogueBusy&&!committing&&!specialLocked();
 const finisher=story==="battle"&&s.phase==="finisher"&&!dialogueBusy&&!committing&&!aiBusy&&!specialLocked();
 root.dataset.readingOpen=String(readingOpen&&reading&&!committing);
 ui.readingIntro.hidden=!(story==="battle"&&s.phase==="read"&&!readingOpen&&!dialogueBusy&&!committing);
 ui.controls.hidden=story==="battle"&&s.phase==="read"&&!readingOpen;
 if(story==="battle"&&s.phase==="finisher")ui.controls.hidden=false;
 const displayedDark=visible.dark;
 setText(ui.res,visible.resonance+"/100");setText(ui.dark,displayedDark+"/100");setText(ui.hp,visible.hp+"/100");
 setText(ui.mood,"心象："+C.STATES[C.stateFor(s.dark)]);
 ui.resBar.style.width=visible.resonance+"%";ui.darkBar.style.width=displayedDark+"%";ui.hpBar.style.width=visible.hp+"%";
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
  ui.aiInput.disabled=!reading||aiBusy||s.aiInsightTurn===s.turn;
  ui.aiSend.disabled=!reading||aiBusy||aiCalls>=AI_CALL_LIMIT||Date.now()<aiRetryAt||s.aiInsightTurn===s.turn||!(ui.aiInput.value||"").trim();
  ui.aiSend.textContent=s.aiInsightTurn===s.turn?"このリーディングでは届け済み":aiBusy?"読み解いています…":aiCalls>=AI_CALL_LIMIT?"この戦闘では届け済み（3回）":Date.now()<aiRetryAt?"再接続まで少しお待ちください":"自分の言葉を届ける（残り"+(AI_CALL_LIMIT-aiCalls)+"回）";
  ui.aiBody.hidden=!aiPanelOpen;
  root.dataset.writingOpen=String(aiPanelOpen&&readingOpen&&reading);
  ui.writingHint.textContent=s.aiInsightTurn===s.turn?"言葉は届いています。カードを選んで次の一歩へ。":
   "ひと言でも大丈夫。長さや上手さで特典は変わりません。";
  ui.writingReward.textContent=s.aiInsightTurn===s.turn?"この読みの特典は受け取り済み":
   firstWrittenDelivered?"届けると共鳴＋25（上限100）":"初めて届けると共鳴＋50（次回から＋25／上限100）";
  ui.aiToggle.setAttribute("aria-expanded",String(aiPanelOpen));
  ui.aiToggle.textContent=aiPanelOpen?"自分の言葉を閉じる ▲":"自分の言葉で届ける ▼";
  ui.aiPanel.hidden=!(story==="battle"&&s.phase==="read"&&readingOpen);
 }
 ui.read.textContent=finisher?"対話で解放":"この言葉を届ける";
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
 if(specialLocked())return;
 if(story!=="battle"||battle.phase!=="read"||!readingOpen||dialogueBusy||aiBusy||committing||suspended())return;
 once=true;ui.guide.hidden=true;modalIndex=i;render();
 ui.modalWords.querySelector(".cb-modal-word")?.focus?.({preventScroll:true});
}
function closeCard(){
 if(specialLocked())return;if(modalIndex<0)return;modalIndex=-1;render();}
function choose(index,word){
 if(specialLocked())return;
 if(modalIndex!==index||story!=="battle"||dialogueBusy||committing||suspended()||battle.phase!=="read")return;
 if(!once){once=true;try{sessionStorage.setItem(onceKey,"1");}catch(_){}}
 battle=C.select(battle,index,word);modalIndex=-1;render();
}
function toast(message){
 clearTimeout(toastTimer);ui.toast.textContent=message;ui.toast.hidden=false;
 toastTimer=setTimeout(()=>{ui.toast.hidden=true;},2100);
}
async function sendAiReading(){
 if(specialLocked())return;
 if(suspended()||!readingOpen||aiBusy||committing||dialogueBusy||story!=="battle"||battle.phase!=="read"||battle.aiInsightTurn===battle.turn||modalIndex>=0)return;
 if(aiCalls>=AI_CALL_LIMIT){toast("この戦闘のAI読み取りは3回までです");return;}
 const reading=(ui.aiInput.value||"").trim();
 if(!reading||reading.length>700){toast("ひと言から700文字までで入力してね");return;}
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
  if(specialLocked()||story!=="battle"||battle.phase!=="read"||battle.turn!==requestTurn)return;
  const before=battle;
  ui.aiInput.blur(); // Dismiss the keyboard before the unchanged shared dialogue.
  aiPanelOpen=false;ui.aiResult.textContent="";
  committing=true;
  // No reward, first-use receipt or API allowance is consumed until words are delivered.
  saySequence([["シオン",data.shion],["カリタス",data.caritas]],()=>{
   if(story!=="battle"||battle!==before){committing=false;render();return;}
   battle=C.applyWrittenReading(before,Array.isArray(data.understandingIds)?data.understandingIds:[],!firstWrittenDelivered);
   if(battle===before){committing=false;render();return;}
   const pendingBattle=battle;battle=before;
   const completeDelivery=()=>{
   battle=record.battle;firstWrittenDelivered=record.firstWrittenDelivered;aiCalls=record.aiCalls;
   const gain=battle.resonance-before.resonance,relief=before.dark-battle.dark;
   aiLastState=null;aiPendingRequest=null;aiPendingText="";
   ui.aiInput.value="";
   // Display original player words safely and briefly; never store the reading text.
   setText(ui.writtenQuote,reading.length>84?reading.slice(0,84)+"…":reading);
   setText(ui.writtenGain,"あなたの言葉が、星の力に変わった");
   visualBattle=before;readingOpen=false;
   stage("written-light",1400,()=>{
    visualBattle=null;committing=false;story="battle";root.dataset.phase="battle";
    setText(ui.writtenQuote,"");render();
    toast("言葉が届いた　共鳴＋"+gain+(relief>0?"　闇−"+relief:"")+(battle.phase==="finisher"?"　必殺技が使えます":""));
   });
   };
   persist({...record,battle:pendingBattle,firstWrittenDelivered:true,aiCalls:aiCalls+1,aiConfirmedCalls:aiCalls+1},completeDelivery);
  });
  render();
 }catch(error){
  ui.aiResult.textContent="通信できません。文章とAIの利用回数は保持しています。 "+(error.name==="AbortError"?"応答が時間切れになりました。":error.message);
  aiRetryAt=Date.now()+8000;
  setTimeout(()=>{if(root&&!root.hidden)render();},8100);
 }
 finally{clearTimeout(timer);aiBusy=false;render();}
}
function perform(kind){
 if(specialLocked())return;
 if(story!=="battle"||dialogueBusy||aiBusy||committing||suspended()||modalIndex>=0)return;
 if(battle.phase==="finisher"&&["skill","dialogue"].includes(kind)){
  if(kind==="skill"){openSpecialSelection();return;}
  const next=C.finish(battle,kind);if(next===battle)return;
  committing=true;
  persist({...record,battle:next},()=>{battle=record.battle;
  saySequence([["シオン",C.preview({...battle,words:battle.lastReading||battle.words})+"\nこの言葉を、君に届けたい。"]],()=>{committing=false;beginEnding();});
  });return;
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
   persist({...record,battle:next},()=>{battle=record.battle; // One committed attack, never replayed after reload.
   visualBattle=previous; // Do not reveal the hit while Shioriel is attacking.
   stage("word-strike",1050,()=>applyOutcome(previous,next,p));
   });
 });
}
function applyOutcome(previous,next,p){
 battle=next;visualBattle={...next,hp:previous.hp};story="battle";root.dataset.phase="battle";readingOpen=false;
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
 visualBattle=null;story="battle";root.dataset.phase="battle";
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
 clearCheckpoint(()=>{
 clearTimeout(cinematicTimer);cinematicCallback=null;clearTimeout(toastTimer);
 window.TarotHoshisunaManifestation?.clear?.();
 window.TarotHoshisunaAbyss?.setPhase?.("edge");
 dialogue?.hide();root.hidden=true;ui.modal.hidden=true;
 battle=C.newGame();visualBattle=null;modalIndex=-1;committing=false;
 story="idle";busy=false;armed=false;noticed=true;unlock();
 // Re-offer the *inspection choice* shortly after withdrawal, never auto-restart battle.
 setTimeout(()=>{if(story==="idle"&&!done){armed=true;tick();}},1300);
 });
}
function finish(){
 if(done)return;
 if(!record.special.completed){clearCheckpoint(completeMapReturn);return;}
 completeMapReturn();
}
function completeMapReturn(){
 if(done)return;
 // Clear canvas actor and hostile miasma before exposing the world map.
 window.TarotHoshisunaManifestation?.clear?.();
 window.TarotHoshisunaAbyss?.setPhase?.("cleared");
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
 if(!window.TarotDialogueUI?.bind){console.error("[Caritas] Shared main dialogue unavailable");return;}
 try{once=sessionStorage.getItem(onceKey)==="1";}catch(_){once=false;}
 prompt=newEl("aside");prompt.id="star-gate-interaction-choice";prompt.hidden=true;prompt.setAttribute("aria-label","獣の異変");
 const promptText=newEl("div","",INSPECT_CHOICE);promptText.id="star-gate-interaction-text";
 const options=newEl("div","star-gate-interaction-actions");
 const inspect=newEl("button","","調べる");inspect.type="button";inspect.id="caritas-interaction-inspect";
 const leaveBtn=newEl("button","","離れる");leaveBtn.type="button";
 inspect.addEventListener("click",start);leaveBtn.addEventListener("click",leave);
 options.append(inspect,leaveBtn);prompt.append(promptText,options);shell.appendChild(prompt);
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
 const release=newEl("div","cb-release");ui.release=release;release.setAttribute("aria-hidden","true");
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
 const introHint=newEl("p","cb-reading-start-hint","三枚の解釈を選んで届けよう。自分の言葉を添えると、共鳴がさらに満ちます。");
 const introButton=newEl("button","cb-reading-start-button","リーディングを始める");introButton.type="button";
 introButton.addEventListener("click",()=>{if(specialLocked()||story!=="battle"||battle.phase!=="read"||committing||dialogueBusy)return;readingOpen=true;render();});
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
 ui.aiInput.placeholder="ひと言でも大丈夫。カリタスに何を伝えたい？";
 ui.aiInput.setAttribute("aria-describedby","cb-writing-hint cb-writing-reward");label.append(ui.aiInput);
 ui.writingHint=newEl("p","cb-writing-hint");ui.writingHint.id="cb-writing-hint";
 ui.writingReward=newEl("p","cb-writing-reward");ui.writingReward.id="cb-writing-reward";
 ui.aiSend=newEl("button","cb-ai-send","自分の言葉を届ける");ui.aiSend.type="button";
 ui.aiSend.addEventListener("click",sendAiReading);
 ui.aiInput.addEventListener("input",()=>{ui.aiSend.disabled=specialLocked()||story!=="battle"||battle.phase!=="read"||aiBusy||aiCalls>=AI_CALL_LIMIT||Date.now()<aiRetryAt||battle.aiInsightTurn===battle.turn||!(ui.aiInput.value||"").trim();});
 ui.aiResult=newEl("div","cb-ai-result");ui.aiResult.setAttribute("aria-live","polite");
 ui.aiToggle=newEl("button","cb-ai-toggle","自分の言葉で届ける ▼");ui.aiToggle.type="button";ui.aiToggle.setAttribute("aria-expanded","false");
 ui.aiBody=newEl("div","cb-ai-body");ui.aiBody.hidden=true;
 ui.aiToggle.addEventListener("click",()=>{
  if(specialLocked()||story!=="battle"||battle.phase!=="read"||committing||dialogueBusy||aiBusy||suspended())return;
  aiPanelOpen=!aiPanelOpen;ui.aiBody.hidden=!aiPanelOpen;
  ui.aiToggle.setAttribute("aria-expanded",String(aiPanelOpen));
  ui.aiToggle.textContent=aiPanelOpen?"自分の言葉を閉じる ▲":"自分の言葉で届ける ▼";
  render();
  if(aiPanelOpen)ui.aiPanel.scrollIntoView({block:"nearest",behavior:"smooth"});
 });
 ui.aiBody.append(ui.writingHint,label,ui.aiSend,ui.aiResult);ui.aiPanel.append(ui.aiToggle,ui.writingReward,ui.aiBody);
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
 const cutin=newEl("div","cb-cutin");ui.cutin=cutin;cutin.setAttribute("aria-label","シオンとシオリエルの必殺技");
 for(const [actor,name] of [["shion","シオン"],["shioriel","シオリエル"]]){
   const panel=newEl("div","cb-cut-panel cb-cut-"+actor);
   const face=newEl("img","cb-cut-face");face.src=CUTINS[actor];face.alt=name;face.draggable=false;
   // These hidden-at-boot img elements start loading before any battle action.
   face.addEventListener("error",()=>{face.hidden=true;});
   panel.append(face);cutin.append(panel);
 }
 cutin.append(newEl("div","cb-cut-title","必殺技"));
 const technique=newEl("div","cb-technique");technique.setAttribute("aria-hidden","true");
 technique.append(newEl("div","cb-technique-ray"),newEl("div","cb-technique-ring"));
 ui.selection=newEl("div","cb-special-selection");ui.selection.hidden=true;ui.selection.setAttribute("role","dialog");ui.selection.setAttribute("aria-modal","true");ui.selection.setAttribute("aria-label","どのカードの言葉を届けますか？");
 ui.artPlayback=newEl("div","cb-special-art");ui.artPlayback.hidden=true;
 ui.artBackdrop=newEl("img","cb-special-backdrop");ui.artBackdrop.alt="";
 ui.artImage=newEl("img","cb-special-foreground");ui.artImage.alt="必殺技イラスト";
 ui.artPlayback.append(ui.artBackdrop,ui.artImage);
 const written=newEl("div","cb-written-light");written.setAttribute("aria-live","polite");
 ui.writtenQuote=newEl("p","cb-written-quote");ui.writtenGain=newEl("p","cb-written-gain");
 written.append(newEl("div","cb-written-ring"),ui.writtenQuote,ui.writtenGain);
 ui.saveProblem=newEl("div","cb-save-problem");ui.saveProblem.hidden=true;
 root.append(ui.selection,ui.artPlayback,ui.saveProblem,frame,written,ui.readingIntro,ui.toast,ui.guide,ui.finale,cutin,technique,ui.modal);shell.appendChild(root);
 dialogue=window.TarotDialogueUI.bind({
   // Bind original main/Alenon DOM, never create an encounter-specific frame.
   layer:document.getElementById("dialogue-layer"),
   button:document.getElementById("dialogue-advance"),
   speaker:document.getElementById("dialogue-speaker"),
   text:document.getElementById("dialogue-text"),
   next:document.getElementById("dialogue-next"),
   onAdvance:advanceDialogue
 });
 preloadSpecialArt();
 if(!restoreCheckpoint())render();
 if(!transformationReplay)window.addEventListener("storage",event=>{if(event.key===SAVE_KEY&&event.newValue!==savedRaw)recoveryScreen();});
 timer=setInterval(tick,160);
 document.addEventListener("visibilitychange",()=>{if(suspended())pauseCinematic();else resumeCinematic();});
 window.addEventListener("pagehide",()=>{pageAway=true;pauseCinematic();clearInterval(timer);timer=0;clearTimeout(toastTimer);ui.toast.hidden=true;});
 window.addEventListener("pageshow",()=>{pageAway=false;if(!timer&&!done)timer=setInterval(tick,160);resumeCinematic();tick();});
 tick();
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
window.CaritasEncounterDebug=Object.freeze({getState:()=>({story,done,armed,noticed,owned,transformationReplay,dialogueBusy,readingOpen,committing,cinematicPending:!!cinematicCallback,special:{...record.special},saveBlocked,recovery,revision:record.revision,battle:{...battle,words:[...battle.words]}})});
})();
