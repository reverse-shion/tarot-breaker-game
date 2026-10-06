/* Author-approved Aftermath v1.6; registered dev page only, never saved. */
(() => {
 'use strict';
 if(window.__TAROT_DEV_STAGE3__!==true)return;
 const LINES=Object.freeze([
  ["lumiere", "シ……オンさま……\nシオンさま！"],
  ["shion", "……リュミエール？"],
  ["shiopon", "シオンさま、大丈夫ぴょん？\nずっと呼んでたぴょん……"],
  ["shion", "今のは……\n……いや。今は、それより――"],
  ["shiopon", "……初めて、食べられたの。"],
  ["shiopon", "星の声が……食べられたの。"],
  ["shion", "食べられた？"],
  ["lumiere", "……私にも、初めての事で。"],
  ["lumiere", "少なくとも、安全を確かめるまでは星門は使わない方がよさそうです。"],
  ["lumiere", "アリエット様なら、きっと原因がわかるかもしれません。"],
  ["shion", "……そうだな。\nアリエットに相談しよう。"],
  ["lumiere", "では、私は先に星砂の準備をしてきます。\nお二人は、東側から来てください。"],
  ["shion", "分かった。頼む。"],
  ["shiopon", "リュミエール、またあとでね。"]
 ].map(line=>Object.freeze(line)));
 const NAMES={shion:'シオン',shiopon:'しおぽん',lumiere:'リュミエール'};
 let session=null,consumed=false;
 const alive=s=>session===s&&!s.controller.signal.aborted;
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
 function objective(s,text,notice=''){
  if(!s.panel||!s.objective||!s.notice){s.panel?.remove();s.panel=document.createElement('aside');s.panel.id='aftermath-status';s.objective=document.createElement('span');s.objective.id='aftermath-objective';s.notice=document.createElement('span');s.notice.id='aftermath-notice';s.panel.append(s.objective,s.notice);(document.getElementById('game-shell')||document.body).append(s.panel);}
  s.objective.textContent=text;s.notice.textContent=notice;s.panel.hidden=false;
 }
 async function say(s,index){
  if(document.hidden)await s.clock.wait(0);s.clock.assert();const [actor,text]=LINES[index];s.line=index+1;s.dialogues.push({id:`A${String(index+1).padStart(2,'0')}`,actor,text,time:s.clock.now()});
  await new Promise((resolve,reject)=>{s.resolveLine=resolve;const stop=()=>{s.resolveLine=null;reject(new Error('Aftermath cancelled'));};s.controller.signal.addEventListener('abort',stop,{once:true});s.resolveLine=()=>{s.controller.signal.removeEventListener('abort',stop);resolve();};s.ui.show({actor,speaker:NAMES[actor],text});});await s.clock.wait(0);s.clock.assert();
 }
 async function action(s,command){const task=s.scene.perform(command);if(task?.promise)await task.promise;await s.clock.wait(0);s.clock.assert();}
 async function flight(s){
  state(s,'LUMIERE_DEPARTURE');
  const position=s.scene.getState().actors.lumiere;s.flightRoute=[{x:position.x,y:position.y}];if(position.y<240)await action(s,{type:'move',actor:'lumiere',target:{x:position.x,y:245},duration:450});
  s.scene.face('lumiere',{x:s.scene.getState().actors.lumiere.x+100,y:s.scene.getState().actors.lumiere.y});
  s.scene.face('shion','lumiere');s.scene.face('shiopon','lumiere');
  const start={...s.scene.getState().actors.lumiere};s.flightRoute.push({x:start.x,y:start.y});const begin=s.clock.now();let previous=begin,x=start.x;
  while(alive(s)){
   await s.clock.wait(16);const now=s.clock.now();x+=140*(now-previous)/1000;previous=now;
   s.scene.flightPose({x,y:start.y},-8*Math.min(1,(now-begin)/300));
   const view=s.scene.getState();s.flight={elapsed:now-begin,x,y:start.y,rect:view.lumiereRect,viewport:view.viewport};
   if(view.lumiereRect&&view.lumiereRect.left>view.viewport.width){s.flightRoute.push({x,y:start.y});s.scene.setLumiereDeparted(true);return;}
  }
  s.clock.assert();
 }
 function releaseControl(s){
  s.scene.clearInput();
  const unlocked=s.scene.unlock(s.owner),view=s.scene.getState();
  if(unlocked!==true||view.owner!==null||view.inputSuspended!==false||view.npcSuspended!==false||view.following!==s.a0.following)
   throw new Error('Aftermath control return verification failed');
 }
 async function play(s){
  state(s,'INTRODUCTION');
  // The present reveal remains Shion-only for this beat; companions return only with the Aftermath dialogue.
  await s.clock.wait(300);
  s.scene.setActorVisibility?.('lumiere',1);s.scene.setActorVisibility?.('shiopon',1);s.scene.setActorVisibility?.('shion',1);
  s.scene.face('lumiere','shion');await say(s,0);await s.clock.wait(300);
  s.scene.face('shion','lumiere');await say(s,1);
  const peers=s.scene.getState().actors;
  if(Math.abs(peers.shiopon.x-peers.lumiere.x)<28&&Math.abs(peers.shiopon.y-peers.lumiere.y)<32&&Math.hypot(peers.shiopon.x-peers.shion.x,peers.shiopon.y-peers.shion.y)>48)
   await action(s,{type:'move',actor:'shiopon',target:{x:peers.shion.x-32,y:peers.shion.y+40},duration:400});
  s.scene.face('shiopon','shion');await say(s,2);await say(s,3);await s.clock.wait(250);state(s,'OBSERVATION');
  for(const actor of ['shion','shiopon','lumiere'])s.scene.face(actor,'gate');s.focus=true;s.scene.focusGate();await s.clock.wait(1000);await say(s,4);await say(s,5);await say(s,6);
  s.focus=false;s.scene.gameplayCamera();await say(s,7);await say(s,8);await say(s,9);
  s.scene.face('lumiere','shion');await say(s,10);await s.scene.moveAway();await s.clock.wait(0);s.clock.assert();
  state(s,'DECISION');await say(s,11);s.scene.face('shion','lumiere');await say(s,12);s.scene.face('shiopon','lumiere');await say(s,13);
  await flight(s);state(s,'RETURN_HOLD');await s.clock.wait(300);s.scene.gameplayCamera();releaseControl(s);
  if(s.scene.getState().lumiereEnabled!==false)throw new Error('Aftermath departure verification failed');
  s.ui.hide();s.ui.destroy();s.ui.elements.layer.remove();s.clock.dispose();removeListeners(s);
  s.completed=true;state(s,'COMPLETED');window.dispatchEvent(new CustomEvent('tarot-breaker:aftermath-ended',{detail:report(s)}));
 }
 function removeListeners(s){window.removeEventListener('keydown',s.keyGuard,true);window.removeEventListener('keyup',s.keyRelease,true);document.removeEventListener('visibilitychange',s.hidden);window.removeEventListener('resize',s.resize);}
 async function cancel(reason='cancelled'){
  const s=session;if(!s||s.completed||s.cancelled)return false;s.cancelled=true;s.reason=reason;s.ui?.hide();s.controller.abort();removeListeners(s);s.clock.dispose();s.scene.pause(false);
  s.ui?.destroy();s.ui?.elements.layer.remove();
  try{s.scene.lock(s.owner);await s.scene.restore(s.a0);document.getElementById('game-shell').classList.toggle('aftermath-weak-light',s.a0.weakLight);const verified=s.scene.verify(s.a0);if(verified===false||verified?.completed===false||verified?.ok===false)throw new Error('Aftermath A0 verification failed');releaseControl(s);s.restored=true;s.state='CANCELLED';objective(s,'','イベントを中断しました。再読み込みでやり直せます');}
  catch(error){s.error=String(error);s.state='RESTORE_FAILED';try{s.scene.lock(s.owner);}catch(lockError){s.lockError=String(lockError);}objective(s,'','画面を復元できませんでした。再読み込みしてください。');}
  window.dispatchEvent(new CustomEvent('tarot-breaker:aftermath-ended',{detail:report(s)}));return true;
 }
 function report(s){return s?{id:s.id,state:s.state,line:s.line,completed:!!s.completed,cancelled:!!s.cancelled,restored:!!s.restored,error:s.error,reason:s.reason,dialogues:s.dialogues,states:s.states,flight:s.flight,flightRoute:s.flightRoute,scene:s.scene.getState()}: {state:'NOT_STARTED',completed:false};}
 function start(reportValue){
  if(consumed||!eligible(reportValue))return false;const scene=window.TarotAftermathScene;if(!scene)return false;
  // The preceding notification is synchronous after Stage 3 cleanup/unlock.
  const a0=scene.capture();
  // Stage3 intentionally hands off with both companions hidden. Cancellation restores the stable post-event Garden.
  if(a0.visibility)a0.visibility={...a0.visibility,shion:1,shiopon:1,lumiere:1};
  a0.weakLight=document.getElementById('game-shell').classList.contains('aftermath-weak-light');consumed=true;
  const s=session={id:reportValue.id,owner:`aftermath:${reportValue.id}`,scene,a0,controller:new AbortController(),states:[],dialogues:[]};s.clock=aftermathClock(s.controller.signal);
  try{scene.lock(s.owner);scene.clearInput();document.getElementById('game-shell').classList.add('aftermath-weak-light');makeUi(s);
   s.keys=new Set();s.keyGuard=event=>{if(!['Enter',' ','Spacebar'].includes(event.key))return;if(document.hidden||event.repeat||s.keys.has(event.key)){event.preventDefault();event.stopImmediatePropagation();return;}s.keys.add(event.key);};s.keyRelease=event=>s.keys.delete(event.key);window.addEventListener('keydown',s.keyGuard,true);window.addEventListener('keyup',s.keyRelease,true);
   s.hidden=()=>{scene.pause(document.hidden);if(!document.hidden){scene.clearInput();if(s.focus)scene.focusGate();}};
   s.resize=()=>{if(!alive(s))return;scene.clearInput();if(s.focus)scene.focusGate();};document.addEventListener('visibilitychange',s.hidden);window.addEventListener('resize',s.resize);
   play(s).catch(error=>{if(!s.cancelled){s.error=String(error);cancel('error');}});return true;
  }catch(error){s.error=String(error);cancel('error');return false;}
 }
 window.addEventListener('tarot-breaker:stage3-session-ended',event=>start(event.detail));
 window.TarotStarGateAftermath=Object.freeze({getState:()=>report(session),cancel,dialogue:LINES});
})();
