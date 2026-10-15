/* Normal-route observer. The existing Garden Progress instance owns durable state. */
(() => {
 'use strict';
 if(window.__TAROT_PUBLIC_STAR_GATE__!==true||window.__TAROT_DEV_STAGE3__===true)return;
 const EVENT='garden_star_gate_anomaly',ROUTE_KNOWN='garden_star_sand_route_known';
 let sessionCompleted=false,persisted=false,error=null,restored=false,consumedId=null;
 const progress=()=>window.TarotStarGateProgress;
 function current(){
  try{return progress()?.getCurrentState?.()?.state||null;}catch{return null;}
 }
 function done(){return sessionCompleted||current()?.completedEvents?.includes(EVENT)===true;}
 function canInvestigate(){
  const state=current(),story=window.TarotDialogue?.getState?.();
  return !!(state&&state.checkpoint.mapId==='star_gate_garden'&&
   state.companion==='joined_with_shion'&&state.completedEvents.includes('garden_lumiere_gate')&&
   story&&story.shioponDone===true&&story.lumiereDone===true&&story.joined===true&&!story.active&&!done());
 }
 // The independent Star Sand fact is written only after the validated final
 // Aftermath saved Star Gate completion. Also migrates verified older saves:
 // those players already heard the C16 Star Sand decision in their completed run.
 function ensureRouteKnown(){
  const state=current();
  if(!state?.completedEvents?.includes(EVENT))return false;
  if(state.completedEvents.includes(ROUTE_KNOWN))return true;
  try{
   const written=progress()?.completeEvent(ROUTE_KNOWN,{mapId:'star_gate_garden',spawnId:'south_gate'});
   if(!written?.persisted)throw new Error(written?.reason||'route-knowledge-write-unavailable');
   const loaded=window.TarotProgressCore.createProgress().load();
   if(loaded.status!=='valid'||!loaded.state.completedEvents.includes(ROUTE_KNOWN)||
      !loaded.state.completedEvents.includes(EVENT)||loaded.state.checkpoint.mapId!=='star_gate_garden')
     throw new Error('route-knowledge-readback-failed');
   return true;
  }catch(e){console.warn('[Star Sand Progress]',String(e));return false;}
 }
 function prepareRestoration(){
  if(!done())return Promise.resolve();
  return new Promise((resolve,reject)=>{
   const image=new Image();let settled=false;
   const finish=(e)=>{if(settled)return;settled=true;clearTimeout(timer);image.onload=image.onerror=null;e?reject(e):resolve();};
   const timer=setTimeout(()=>finish(new Error('Completed Star Gate image deadline')),10000);
   image.onload=async()=>{try{await image.decode();if(!image.naturalWidth||!image.naturalHeight)throw new Error('Completed Star Gate image unavailable');finish();}catch(e){finish(e);}};
   image.onerror=()=>finish(new Error('Completed Star Gate image failed'));
   image.src='./assets/events/gate-vision/gate-void.webp';
  });
 }
 function restoreCompleted(){
  if(!done()||restored)return false;
  const scene=window.TarotAftermathScene;
  if(!scene||scene.getState().owner!==null||window.TarotCinematicCamera?.getState?.().owned)return false;
  if(window.TarotStarGateAnomaly?.restoreCompletedGate?.()!==true)throw new Error('Completed Star Gate restoration unavailable');
  scene.setLumiereDeparted(true);
  if(scene.getState().lumiereEnabled!==false)throw new Error('Completed Lumiere departure restoration failed');
  ensureRouteKnown();
  restored=true;return true;
 }
 function observe(event){
  const actual=window.TarotStarGateAftermath?.getState?.(),report=event.detail;
  const stage=window.TarotStarGateAnomaly?.getState?.();
  if(!report||!actual||!Number.isFinite(report.id)||report.id!==actual.id||report.id!==stage?.id||report.id===consumedId||sessionCompleted)return;
  if(['state','completed','cancelled','error','reason'].some(key=>report[key]!==actual[key]))return;
  if(actual.state!=='COMPLETED'||actual.completed!==true||actual.cancelled||actual.error||actual.reason||
     !stage.completed||!stage.restored||stage.running||stage.error||stage.reason||stage.recoveryError||stage.audioReleased!==true)return;
  const scene=window.TarotAftermathScene?.getState?.(),camera=window.TarotCinematicCamera?.getState?.();
  if(!scene||scene.owner!==null||scene.inputSuspended!==false||scene.npcSuspended!==false||
     scene.lumiereEnabled!==false||scene.following!==true||!camera||camera.owned)return;
  // Session consumption is independent of storage success and never owns gameplay locks.
  consumedId=report.id;sessionCompleted=true;
  try{
   const result=progress()?.completeEvent(EVENT,{mapId:'star_gate_garden',spawnId:'south_gate'});
   if(!result?.persisted)throw new Error(result?.reason||'completion-write-unavailable');
   // Independent durable readback, rather than trusting the writer's memory.
   const loaded=window.TarotProgressCore.createProgress().load();
   if(loaded.status!=='valid'||!loaded.state.completedEvents.includes(EVENT)||
      loaded.state.checkpoint.mapId!=='star_gate_garden'||loaded.state.companion!=='joined_with_shion')throw new Error('completion-readback-failed');
   persisted=true;
   ensureRouteKnown();
  }catch(e){error=String(e);console.warn('[Star Gate Progress]',error);}
 }
 window.addEventListener('tarot-breaker:aftermath-ended',observe);
 window.TarotStarGatePublic=Object.freeze({canInvestigate,prepareRestoration,restoreCompleted,
  getState:()=>({completed:done(),sessionCompleted,persisted,error,restored,consumedId})});
})();
