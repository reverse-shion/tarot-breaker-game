/* Author-approved present-return scenario v1.3; registered dev page only, never saved. */
(() => {
 'use strict';
 if(window.__TAROT_DEV_STAGE3__!==true)return;

 const INDIVIDUAL=Object.freeze({
  shiopon:Object.freeze([
   Object.freeze(['shiopon','シオンさん。大丈夫なの？']),
   Object.freeze(['shion','ああ。しおぽんは？']),
   Object.freeze(['shiopon','星の声が、途中で聞こえなくなったの。']),
   Object.freeze(['shion','今も？']),
   Object.freeze(['shiopon','……うまく、言えないの。'])
  ]),
  lumiere:Object.freeze([
   Object.freeze(['lumiere','シオン様。ご無事でよかった。']),
   Object.freeze(['shion','何か分かったか？']),
   Object.freeze(['lumiere','まだ、何が起きたのかは。']),
   Object.freeze(['lumiere','もう少し、確かめさせてください。'])
  ])
 });
 const REPEAT=Object.freeze({
  shiopon:Object.freeze(['shiopon','うまく言えなくて……ごめんね、シオンさん。']),
  lumiere:Object.freeze(['lumiere','星門の様子を、もう少し確かめてみます。'])
 });
 const GROUP=Object.freeze([
  Object.freeze(['shion','二人とも、聞いてくれ。']),
  Object.freeze(['shion','さっき、何か見えた気がする。']),
  Object.freeze(['shion','……だめだ。思い出せない。']),
  Object.freeze(['shiopon','さっき、聞こえなくなったって言ったけど……。']),
  Object.freeze(['shiopon','ただ聞こえないのとは、違うの。']),
  Object.freeze(['shiopon','星の声が……食べられたの。']),
  Object.freeze(['lumiere','……私にも、分かりません。']),
  Object.freeze(['lumiere','安全を確かめるまでは、星門は使わない方がよさそうです。']),
  Object.freeze(['lumiere','お城のアリエット様に、お知らせしましょう。']),
  Object.freeze(['lumiere','何か、ご存じかもしれません。']),
  Object.freeze(['shion','星砂で地上に降りよう。']),
  Object.freeze(['shion','そこから街を抜けて、歩いて城へ戻る。']),
  Object.freeze(['lumiere','では、私は先に星砂の準備をしてまいります。']),
  Object.freeze(['lumiere','起動に時間がかかりますので。']),
  Object.freeze(['shion','頼む。こちらも向かう。']),
  Object.freeze(['shion','しおぽん、行こう。']),
  Object.freeze(['shiopon','……うん。'])
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
  const position=s.scene.getState().actors.lumiere;s.flightRoute=[{x:position.x,y:position.y}];if(position.y<240)await action(s,{type:'move',actor:'lumiere',target:{x:position.x,y:245},duration:450});
  s.scene.face('lumiere',{x:s.scene.getState().actors.lumiere.x+100,y:s.scene.getState().actors.lumiere.y});s.scene.face('shion','lumiere');s.scene.face('shiopon','lumiere');
  const start={...s.scene.getState().actors.lumiere};s.flightRoute.push({x:start.x,y:start.y});const begin=s.clock.now();let previous=begin,x=start.x;
  while(alive(s)){
   await s.clock.wait(16);const now=s.clock.now();x+=140*(now-previous)/1000;previous=now;s.scene.flightPose({x,y:start.y},-8*Math.min(1,(now-begin)/300));
   const view=s.scene.getState();s.flight={elapsed:now-begin,x,y:start.y,rect:view.lumiereRect,viewport:view.viewport};
   if(view.lumiereRect&&view.lumiereRect.left>view.viewport.width){s.flightRoute.push({x,y:start.y});s.scene.setLumiereDeparted(true);return;}
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
  // Stop follow first, then place the companions while hidden so no normal wander/follow
  // update can immediately undo the authored return formation.
  window.dispatchEvent(new CustomEvent('tarot-breaker:shiopon-follow-stop'));
  s.returnFormation=s.scene.placeReturnFormation?.();
  s.scene.setActorVisibility?.('shion',1);s.scene.setActorVisibility?.('shiopon',1);s.scene.setActorVisibility?.('lumiere',1);
  s.scene.face('shion',{x:s.scene.getState().actors.shion.x,y:s.scene.getState().actors.shion.y+100});
  s.scene.face('shiopon','shion');s.scene.face('lumiere','shion');
  s.scene.gameplayCamera();releaseControl(s,false);state(s,'CHECK_COMPANIONS');
 }
 async function individualConversation(s,actor){
  if(s.checked.has(actor)){await sayLine(s,`R-${actor}`,REPEAT[actor]);releaseControl(s,false);state(s,'CHECK_COMPANIONS');return;}
  if(actor==='shiopon'){s.scene.face('shion','shiopon');s.scene.face('shiopon','shion');}
  else{s.scene.face('shion','lumiere');s.scene.face('lumiere','shion');}
  await sayBlock(s,actor==='shiopon'?'S':'L',INDIVIDUAL[actor]);s.checked.add(actor);
  if(s.checked.size<2){releaseControl(s,false);state(s,'CHECK_COMPANIONS');return;}
  await groupConversation(s);
 }
 async function groupConversation(s){
  state(s,'GROUP_START');
  s.scene.face('shion','shiopon');s.scene.face('shiopon','shion');s.scene.face('lumiere','shion');
  await sayLine(s,'C01',GROUP[0]);await s.clock.wait(400);
  s.scene.face('shion','gate');await sayLine(s,'C02',GROUP[1]);await s.clock.wait(700);await sayLine(s,'C03',GROUP[2]);
  s.scene.face('shiopon','gate');await sayLine(s,'C04',GROUP[3]);await sayLine(s,'C05',GROUP[4]);await s.clock.wait(700);s.scene.face('shion','shiopon');s.scene.face('lumiere','shiopon');await sayLine(s,'C06',GROUP[5]);
  state(s,'GATE_CONFIRMATION');for(const actor of ['shion','shiopon','lumiere'])s.scene.face(actor,'gate');s.focus=true;s.scene.focusGate();await s.clock.wait(900);s.scene.face('lumiere','shiopon');await sayLine(s,'C07',GROUP[6]);
  s.focus=false;s.scene.gameplayCamera();s.scene.face('lumiere','shion');await sayLine(s,'C08',GROUP[7]);await sayLine(s,'C09',GROUP[8]);await sayLine(s,'C10',GROUP[9]);
  state(s,'ROUTE_DECISION');s.scene.face('shion','lumiere');await sayLine(s,'C11',GROUP[10]);await sayLine(s,'C12',GROUP[11]);await sayLine(s,'C13',GROUP[12]);await sayLine(s,'C14',GROUP[13]);await sayLine(s,'C15',GROUP[14]);
  await flight(s);state(s,'POST_DEPARTURE');s.scene.face('shion','shiopon');s.scene.face('shiopon','shion');await sayLine(s,'C16',GROUP[15]);await sayLine(s,'C17',GROUP[16]);
  state(s,'RETURN_HOLD');await s.clock.wait(600);s.scene.gameplayCamera();
  if(s.a0.following)window.dispatchEvent(new CustomEvent('tarot-breaker:shiopon-follow-start'));else window.dispatchEvent(new CustomEvent('tarot-breaker:shiopon-follow-stop'));
  releaseControl(s,s.a0.following);
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
 window.TarotStarGateAftermath=Object.freeze({getState:()=>report(session),cancel,talk,individual:INDIVIDUAL,group:GROUP});
})();