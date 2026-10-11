/* Present-return scenario v1.6: calls under black -> changed-gate fear -> free companion check. */
(() => {
 'use strict';
 if(window.__TAROT_DEV_STAGE3__!==true)return;

 const INDIVIDUAL=Object.freeze({
  shiopon:Object.freeze([
   Object.freeze(['shiopon','シオンさん……大丈夫なの？']),
   Object.freeze(['shion','ああ……。しおぽんは、何ともないか？']),
   Object.freeze(['shiopon','しおぽんは大丈夫なの。']),
   Object.freeze(['shiopon','でも……星の声が、急に聞こえなくなったの。']),
   Object.freeze(['shion','今もか？']),
   Object.freeze(['shiopon','……まだ、はっきり聞き取れないの。']),
   Object.freeze(['shiopon','何か……いつもと違うの。']),
   Object.freeze(['shiopon','もう少しだけ、耳を澄ませてみるの。'])
  ]),
  lumiere:Object.freeze([
   Object.freeze(['lumiere','シオン様……先ほどのこと、覚えていらっしゃいますか？']),
   Object.freeze(['shion','俺は……どうなっていた？']),
   Object.freeze(['lumiere','星門を見つめたまま、お呼びしてもお返事がなくて……。']),
   Object.freeze(['shion','……そうだったのか。']),
   Object.freeze(['lumiere','まだ、何が起きたのかは分かりません。']),
   Object.freeze(['lumiere','星門の様子を、もう少し確かめてみます。']),
   Object.freeze(['lumiere','まだ安全とは言い切れません。少しお待ちください。'])
  ])
 });
 const REPEAT=Object.freeze({
  shiopon:Object.freeze(['shiopon','もう少しだけ、耳を澄ませてみるの。']),
  lumiere:Object.freeze(['lumiere','星門の様子を、もう少し確かめてみます。'])
 });
 // Approved return dialogue, spoken after present fade-in.
 const RETURN=Object.freeze([
  Object.freeze(["shion","……二人とも……どうしたんだ？"]),
  Object.freeze(["shiopon","……よかったの。シオンさん……。"]),
  Object.freeze(["shion","……星門……。"]),
  Object.freeze(["shion","……胸騒ぎがする。"]),
  Object.freeze(["shion","まるで……何かを訴えているみたいだ。"]),
  Object.freeze(["shion","……でも、何を……？"]),
  Object.freeze(["shion","……こんな星門、見たことがない。"]),
  Object.freeze(["shion","リュミエール……元に戻せるのか？"]),
  Object.freeze(["lumiere","……分かりません。"]),
  Object.freeze(["lumiere","……あの光が、こんな闇に染まるなんて……。"]),
  Object.freeze(["shiopon","……怖いの。"]),
  Object.freeze(["shiopon","……いつもは、あんなに優しい光なのに……。"]),
  Object.freeze(["lumiere","……私も、怖いです。"]),
  Object.freeze(["lumiere","……こんなふうに、星門を恐れる日が来るなんて……。"])
 ]);
 const GROUP=Object.freeze([
  Object.freeze(['shion','さっき……何か、見えたんだ。']),
  Object.freeze(['shion','でも、思い出そうとすると……ぼやける。']),
  Object.freeze(['shiopon','……シオンさん。']),
  Object.freeze(['shiopon','さっき、星の声が聞こえなくなったって言ったけど……。']),
  Object.freeze(['shiopon','ただ、途切れたんじゃないの。']),
  Object.freeze(['shiopon','星の声が……食べられたの。']),
  Object.freeze(['shion','……食べられた？']),
  Object.freeze(['shiopon','……うん。そんな感じがしたの。']),
  Object.freeze(['shiopon','こんなの、初めてなの。']),
  Object.freeze(['lumiere','……私にも、初めてのことです。']),
  Object.freeze(['lumiere','安全が確かめられるまで、星門は使わない方がよさそうです。']),
  Object.freeze(['shion','……ああ。今はやめておこう。']),
  Object.freeze(['lumiere','お城のアリエット様に、お知らせしましょう。']),
  Object.freeze(['lumiere','何か、ご存じかもしれません。']),
  Object.freeze(['shion','そうだな……アリエットなら、何か分かるかもしれない。']),
  Object.freeze(['shion','……星砂を使おう。あそこから地上へ降りられる。']),
  Object.freeze(['shion','普段は使わない道だが……今は、あそこを使うしかない。']),
  Object.freeze(['shion','地上に降りたら、街を抜けて城へ戻ろう。']),
  Object.freeze(['shion','何があるか分からない。慎重に進むぞ。']),
  Object.freeze(['lumiere','分かりました。私は先に、星砂の準備をしてまいります。']),
  Object.freeze(['lumiere','起動に時間がかかりますので。']),
  Object.freeze(['shion','頼む。俺たちも向かう。']),
  Object.freeze(['shion','しおぽん、行こう。東の通路だ。']),
  Object.freeze(['shiopon','……うん。']),
  Object.freeze(['shiopon','一緒に、確かめに行くの。'])
 ]);
 const NAMES={shion:'シオン',shiopon:'しおぽん',lumiere:'リュミエール'};
 const TALK_RADIUS=68;
 let session=null,consumed=false;
 const alive=s=>session===s&&!s.controller.signal.aborted;
 const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);

 function waitVisible(signal){
  if(signal.aborted)return Promise.reject(new Error('Aftermath cancelled'));
  if(!document.hidden)return Promise.resolve();
  return new Promise((resolve,reject)=>{
   const cleanup=()=>{document.removeEventListener('visibilitychange',shown);signal.removeEventListener('abort',stopped);};
   const shown=()=>{if(!document.hidden){cleanup();resolve();}};
   const stopped=()=>{cleanup();reject(new Error('Aftermath cancelled'));};
   document.addEventListener('visibilitychange',shown);signal.addEventListener('abort',stopped,{once:true});shown();
  });
 }
 function aftermathClock(signal){
  const clock=window.TarotFutureStage3.createClock(signal);
  return {...clock,wait:async duration=>{await clock.wait(duration);await waitVisible(signal);clock.assert();}};
 }
 function state(s,name){s.state=name;s.states.push({name,time:s.clock.now()});window.dispatchEvent(new CustomEvent('tarot-breaker:aftermath-state',{detail:{id:s.id,name}}));}
 function eligible(report){return !!(report&&Number.isFinite(report.id)&&report.scene&&report.completed===true&&report.restored===true&&!report.running&&!report.error&&!report.reason&&!report.recoveryError&&!report.scene?.owner&&!report.scene?.vision&&!report.scene?.absorption&&!document.querySelector('#star-gate-anomaly.active,.sga-v192-white,.sga-v192-black,.sga-arcana-detail'));}
 function makeUi(s){
  const mount=document.getElementById('game-shell');
  s.ui=window.TarotDialogueUI.create({mount,ids:{layer:'aftermath-dialogue',advance:'aftermath-advance',speaker:'aftermath-speaker',text:'aftermath-text'},
   wait:ms=>s.clock.wait(ms).catch(()=>{}),onAdvance:()=>{if(!alive(s)||document.hidden)return;const next=s.resolveLine;s.resolveLine=null;s.ui.hide();next?.();}});
 }
 function tappedActor(s,event){
  if(!alive(s)||s.state!=='CHECK_COMPANIONS'||document.hidden||event.isPrimary===false)return null;
  const actor=s.scene.hitTestActor?.(event.clientX,event.clientY);
  if(!actor||!['shiopon','lumiere'].includes(actor))return null;
  const view=s.scene.getState();
  return distance(view.actors.shion,view.actors[actor])<=TALK_RADIUS+8?actor:null;
 }
 function installTalkInput(s){
  const canvas=document.getElementById('game');if(!canvas)return;
  s.talkCanvas=canvas;
  s.talkDown=event=>{
   const actor=tappedActor(s,event);if(!actor)return;
   s.pendingTalk={pointerId:event.pointerId,actor};event.preventDefault?.();event.stopImmediatePropagation?.();
  };
  s.talkUp=event=>{
   const pending=s.pendingTalk;s.pendingTalk=null;
   if(!pending||pending.pointerId!==event.pointerId)return;
   const actor=tappedActor(s,event);
   if(actor!==pending.actor)return;
   event.preventDefault?.();event.stopImmediatePropagation?.();talk(actor);
  };
  s.talkCancel=event=>{if(s.pendingTalk?.pointerId===event.pointerId)s.pendingTalk=null;};
  canvas.addEventListener('pointerdown',s.talkDown,true);
  canvas.addEventListener('pointerup',s.talkUp,true);
  canvas.addEventListener('pointercancel',s.talkCancel,true);
 }
 function removeTalkInput(s){
  if(!s?.talkCanvas)return;
  s.talkCanvas.removeEventListener('pointerdown',s.talkDown,true);
  s.talkCanvas.removeEventListener('pointerup',s.talkUp,true);
  s.talkCanvas.removeEventListener('pointercancel',s.talkCancel,true);
  s.pendingTalk=null;s.talkCanvas=null;
 }
 function objective(s,text,notice=''){
  if(!s.panel||!s.objective||!s.notice){s.panel?.remove();s.panel=document.createElement('aside');s.panel.id='aftermath-status';s.objective=document.createElement('span');s.objective.id='aftermath-objective';s.notice=document.createElement('span');s.notice.id='aftermath-notice';s.panel.append(s.objective,s.notice);(document.getElementById('game-shell')||document.body).append(s.panel);}
  s.objective.textContent=text;s.notice.textContent=notice;s.panel.hidden=false;
 }
 async function sayLine(s,id,entry){
  if(document.hidden)await s.clock.wait(0);s.clock.assert();const [actor,text]=entry;s.line=id;s.dialogues.push({id,actor,text,time:s.clock.now()});
  await new Promise((resolve,reject)=>{s.resolveLine=resolve;const stop=()=>{s.resolveLine=null;reject(new Error('Aftermath cancelled'));};s.controller.signal.addEventListener('abort',stop,{once:true});s.resolveLine=()=>{s.controller.signal.removeEventListener('abort',stop);resolve();};s.ui.show({actor,speaker:NAMES[actor],text});});await s.clock.wait(0);s.clock.assert();
 }
 async function sayBlock(s,prefix,lines){for(let i=0;i<lines.length;i++)await sayLine(s,`${prefix}${String(i+1).padStart(2,'0')}`,lines[i]);}
 async function action(s,command){const task=s.scene.perform(command);if(task?.promise)await task.promise;await s.clock.wait(0);s.clock.assert();}
 async function flight(s){
  state(s,'LUMIERE_DEPARTURE');
  const position=s.scene.getState().actors.lumiere;
  s.flightRoute=[{x:position.x,y:position.y}];
  s.scene.face('lumiere',{x:position.x+120,y:position.y-100});
  s.scene.face('shion','lumiere');s.scene.face('shiopon','lumiere');
  const start={...s.scene.getState().actors.lumiere};
  s.flightRoute.push({x:start.x,y:start.y});
  const begin=s.clock.now();let previous=begin,x=start.x,y=start.y;
  while(alive(s)){
   await s.clock.wait(16);
   const now=s.clock.now(),dt=(now-previous)/1000;previous=now;
   x+=128*dt;y-=86*dt;
   const lift=-18*Math.min(1,(now-begin)/420);
   s.scene.flightPose({x,y},lift);
   const view=s.scene.getState();
   s.flight={elapsed:now-begin,x,y,rect:view.lumiereRect,viewport:view.viewport};
   if(view.lumiereRect&&(view.lumiereRect.left>view.viewport.width+8||view.lumiereRect.bottom<-8)){
    s.flightRoute.push({x,y});s.scene.setLumiereDeparted(true);return;
   }
  }
  s.clock.assert();
 }
 function releaseControl(s,expectedFollowing=s.scene.getState().following){
  s.scene.clearInput();const unlocked=s.scene.unlock(s.owner),view=s.scene.getState();
  if(unlocked!==true||view.owner!==null||view.inputSuspended!==false||view.npcSuspended!==false||view.following!==expectedFollowing)throw new Error('Aftermath control return verification failed');
 }
 function lockForDialogue(s){s.scene.lock(s.owner);s.scene.clearInput();}
 async function opening(s){
  state(s,'RETURN_RECOGNITION');
  window.dispatchEvent(new CustomEvent('tarot-breaker:shiopon-follow-stop'));
  // Reassert the formation staged during full black. No movement or camera pan.
  s.returnFormation=s.scene.placeReturnFormation?.();
  s.scene.setActorVisibility?.('shion',1);
  s.scene.setActorVisibility?.('shiopon',1);
  s.scene.setActorVisibility?.('lumiere',1);
  s.scene.face('shiopon','shion');
  s.scene.face('lumiere','shion');
  await s.scene.gameplayCamera();

  state(s,'SHION_DAZED');await s.clock.wait(700);
  // The two calls already played under black; do not replay them here.
  s.scene.face('shion','shiopon');await s.clock.wait(180);
  state(s,'SHION_RESPONDS');
  await sayLine(s,'R01',RETURN[0]);
  await sayLine(s,'R02',RETURN[1]);

  // Shock is carried by the approved corrupted inner light and actors' gazes.
  // Keep fixed world positions and retain Lumiere's existing idle hover.
  state(s,'GATE_UNEASE');
  s.scene.face('shion','gate');await s.clock.wait(700);
  await sayLine(s,'R03',RETURN[2]);await s.clock.wait(240);
  await sayLine(s,'R04',RETURN[3]);
  await sayLine(s,'R05',RETURN[4]);
  await sayLine(s,'R06',RETURN[5]);
  await s.clock.wait(280);
  await sayLine(s,'R07',RETURN[6]);

  s.scene.face('shion','lumiere');await s.clock.wait(180);
  await sayLine(s,'R08',RETURN[7]);
  await sayLine(s,'R09',RETURN[8]);
  s.scene.face('lumiere','gate');await s.clock.wait(220);
  await sayLine(s,'R10',RETURN[9]);

  s.scene.face('shiopon','gate');await s.clock.wait(240);
  await sayLine(s,'R11',RETURN[10]);
  await sayLine(s,'R12',RETURN[11]);
  await s.clock.wait(300);
  await sayLine(s,'R13',RETURN[12]);
  await s.clock.wait(200);
  await sayLine(s,'R14',RETURN[13]);

  // Three silent silhouettes facing the changed gate, then an invitation to
  // question each companion. No repeat of the later group Gate focus.
  state(s,'GATE_SILENCE');
  s.scene.face('shion','gate');await s.clock.wait(680);
  s.scene.face('shion','shiopon');await s.clock.wait(220);
  releaseControl(s,false);
  state(s,'CHECK_COMPANIONS');
 }
 async function individualConversation(s,actor){
  if(s.checked.has(actor)){
   await sayLine(s,`R-${actor}`,REPEAT[actor]);
   releaseControl(s,false);state(s,'CHECK_COMPANIONS');return;
  }
  if(actor==='shiopon'){
   s.scene.face('shion','shiopon');s.scene.face('shiopon','shion');
   for(let i=0;i<6;i++)await sayLine(s,`S${String(i+1).padStart(2,'0')}`,INDIVIDUAL.shiopon[i]);
   // Shiopon turns back to the anomaly while trying to listen to the star voice.
   s.scene.face('shiopon','gate');await s.clock.wait(260);
   await sayLine(s,'S07',INDIVIDUAL.shiopon[6]);await s.clock.wait(320);
   await sayLine(s,'S08',INDIVIDUAL.shiopon[7]);
  }else{
   s.scene.face('shion','lumiere');s.scene.face('lumiere','shion');
   for(let i=0;i<5;i++)await sayLine(s,`L${String(i+1).padStart(2,'0')}`,INDIVIDUAL.lumiere[i]);
   // Lumiere checks the Star Gate itself before giving a safety assessment.
   s.scene.face('lumiere','gate');await s.clock.wait(260);
   await sayLine(s,'L06',INDIVIDUAL.lumiere[5]);await s.clock.wait(260);
   await sayLine(s,'L07',INDIVIDUAL.lumiere[6]);
  }
  s.checked.add(actor);
  if(s.checked.size<2){releaseControl(s,false);state(s,'CHECK_COMPANIONS');return;}
  await groupConversation(s);
 }
 async function groupConversation(s){
  state(s,'GROUP_START');

  // Shion looks back at the Gate before trying to describe the fragment he remembers.
  s.scene.face('shion','gate');await s.clock.wait(320);
  await sayLine(s,'C01',GROUP[0]);await s.clock.wait(260);
  await sayLine(s,'C02',GROUP[1]);await s.clock.wait(420);

  // Shiopon pulls Shion's attention back, then searches for words.
  s.scene.face('shiopon','shion');s.scene.face('shion','shiopon');s.scene.face('lumiere','shiopon');
  await sayLine(s,'C03',GROUP[2]);await s.clock.wait(220);
  await sayLine(s,'C04',GROUP[3]);await sayLine(s,'C05',GROUP[4]);
  await s.clock.wait(650);
  await sayLine(s,'C06',GROUP[5]);
  await s.clock.wait(700);
  await sayLine(s,'C07',GROUP[6]);
  await sayLine(s,'C08',GROUP[7]);
  await sayLine(s,'C09',GROUP[8]);

  // All three compare their observations against the still-corrupted Gate.
  state(s,'GATE_CONFIRMATION');
  for(const actor of ['shion','shiopon','lumiere'])s.scene.face(actor,'gate');
  s.focus=true;await s.scene.focusGate();await s.clock.wait(900);
  await sayLine(s,'C10',GROUP[9]);
  await sayLine(s,'C11',GROUP[10]);
  await sayLine(s,'C12',GROUP[11]);

  s.focus=false;await s.scene.gameplayCamera();
  s.scene.face('lumiere','shion');s.scene.face('shion','lumiere');
  await sayLine(s,'C13',GROUP[12]);await sayLine(s,'C14',GROUP[13]);
  await s.clock.wait(300);
  await sayLine(s,'C15',GROUP[14]);

  // Route decision: Shion turns east before naming the Star Sand route.
  state(s,'ROUTE_DECISION');
  const shion=s.scene.getState().actors.shion;
  s.scene.face('shion',{x:shion.x+100,y:shion.y});
  await s.clock.wait(320);
  await sayLine(s,'C16',GROUP[15]);
  await sayLine(s,'C17',GROUP[16]);
  await sayLine(s,'C18',GROUP[17]);
  await s.clock.wait(220);
  await sayLine(s,'C19',GROUP[18]);

  s.scene.face('lumiere','shion');s.scene.face('shion','lumiere');
  await sayLine(s,'C20',GROUP[19]);await sayLine(s,'C21',GROUP[20]);
  await sayLine(s,'C22',GROUP[21]);

  await flight(s);
  state(s,'POST_DEPARTURE');
  s.scene.face('shion','shiopon');s.scene.face('shiopon','shion');
  await sayLine(s,'C23',GROUP[22]);
  await sayLine(s,'C24',GROUP[23]);
  await s.clock.wait(260);
  await sayLine(s,'C25',GROUP[24]);

  state(s,'RETURN_HOLD');await s.clock.wait(500);await s.scene.gameplayCamera();
  window.dispatchEvent(new CustomEvent('tarot-breaker:shiopon-follow-start'));
  releaseControl(s,true);
  if(s.scene.getState().lumiereEnabled!==false)throw new Error('Aftermath departure verification failed');
  s.ui.hide();s.ui.destroy();s.ui.elements.layer.remove();s.clock.dispose();removeListeners(s);
  s.completed=true;state(s,'COMPLETED');window.dispatchEvent(new CustomEvent('tarot-breaker:aftermath-ended',{detail:report(s)}));
 }
 async function talk(actor){
  const s=session;if(!s||s.completed||s.cancelled||s.state!=='CHECK_COMPANIONS'||!['shiopon','lumiere'].includes(actor))return false;
  const view=s.scene.getState();if(distance(view.actors.shion,view.actors[actor])>TALK_RADIUS+8)return false;
  lockForDialogue(s);state(s,`TALK_${actor.toUpperCase()}`);
  try{await individualConversation(s,actor);return true;}catch(error){if(!s.cancelled){s.error=String(error);await cancel('error');}return false;}
 }
 function removeListeners(s){removeTalkInput(s);window.removeEventListener('keydown',s.keyGuard,true);window.removeEventListener('keyup',s.keyRelease,true);document.removeEventListener('visibilitychange',s.hidden);window.removeEventListener('resize',s.resize);}
 async function cancel(reason='cancelled'){
  const s=session;if(!s||s.completed||s.cancelled)return false;s.cancelled=true;s.reason=reason;s.ui?.hide();s.controller.abort();removeListeners(s);s.clock.dispose();s.scene.pause(false);s.ui?.destroy();s.ui?.elements.layer.remove();
  try{s.scene.lock(s.owner);await s.scene.restore(s.a0);document.getElementById('game-shell').classList.toggle('aftermath-weak-light',s.a0.weakLight);const verified=s.scene.verify(s.a0);if(verified===false||verified?.completed===false||verified?.ok===false)throw new Error('Aftermath A0 verification failed');releaseControl(s,s.a0.following);s.restored=true;s.state='CANCELLED';objective(s,'','イベントを中断しました。再読み込みでやり直せます');}
  catch(error){s.error=String(error);s.state='RESTORE_FAILED';try{s.scene.lock(s.owner);}catch(lockError){s.lockError=String(lockError);}objective(s,'','画面を復元できませんでした。再読み込みしてください。');}
  window.dispatchEvent(new CustomEvent('tarot-breaker:aftermath-ended',{detail:report(s)}));return true;
 }
 function report(s){return s?{id:s.id,state:s.state,line:s.line,completed:!!s.completed,cancelled:!!s.cancelled,restored:!!s.restored,error:s.error,reason:s.reason,checked:[...s.checked],dialogues:s.dialogues,states:s.states,flight:s.flight,flightRoute:s.flightRoute,scene:s.scene.getState()}: {state:'NOT_STARTED',completed:false};}
 function start(reportValue){
  if(consumed||!eligible(reportValue))return false;const scene=window.TarotAftermathScene;if(!scene)return false;
  const a0=scene.capture();if(a0.visibility)a0.visibility={...a0.visibility,shion:1,shiopon:1,lumiere:1};a0.weakLight=document.getElementById('game-shell').classList.contains('aftermath-weak-light');consumed=true;
  const s=session={id:reportValue.id,owner:`aftermath:${reportValue.id}`,scene,a0,controller:new AbortController(),states:[],dialogues:[],checked:new Set()};s.clock=aftermathClock(s.controller.signal);
  try{
   scene.lock(s.owner);scene.clearInput();const shell=document.getElementById('game-shell');if(!shell.classList.contains('sga-anomaly-rest'))shell.classList.add('aftermath-weak-light');makeUi(s);installTalkInput(s);
   s.keys=new Set();s.keyGuard=event=>{if(!['Enter',' ','Spacebar'].includes(event.key))return;if(document.hidden||event.repeat||s.keys.has(event.key)){event.preventDefault();event.stopImmediatePropagation();return;}s.keys.add(event.key);};s.keyRelease=event=>s.keys.delete(event.key);window.addEventListener('keydown',s.keyGuard,true);window.addEventListener('keyup',s.keyRelease,true);
   s.hidden=()=>{scene.pause(document.hidden);if(document.hidden)s.pendingTalk=null;else{scene.clearInput();if(s.focus)scene.focusGate();}};
   s.resize=()=>{if(!alive(s))return;scene.clearInput();if(s.focus)scene.focusGate();};document.addEventListener('visibilitychange',s.hidden);window.addEventListener('resize',s.resize);
   opening(s).catch(error=>{if(!s.cancelled){s.error=String(error);cancel('error');}});return true;
  }catch(error){s.error=String(error);cancel('error');return false;}
 }
 window.addEventListener('tarot-breaker:stage3-session-ended',event=>start(event.detail));
 window.TarotStarGateAftermath=Object.freeze({getState:()=>report(session),cancel,talk,returnDialogue:RETURN,individual:INDIVIDUAL,group:GROUP});
})();