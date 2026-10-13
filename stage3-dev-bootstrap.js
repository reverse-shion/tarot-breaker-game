/* Loads only the registered, in-memory Stage 3 checkpoint. */
(() => {
 'use strict';
 const q=new URLSearchParams(location.search);
 const route=q.get('dev')==='star-gate-from-lumiere';
 if(window.__TAROT_STAGE3_ENTRY_REJECTED__===true){
   document.body.dataset.enteringFromLanding='true';document.body.classList.add('scene-load-error');
   const error=document.getElementById('load-error');if(error){error.hidden=false;error.textContent='検証用の入口が競合しています。確認リンクを開き直してください。';}
   return;
 }
 if((!route&&q.get('dev')!=='star-gate-full')||q.getAll('dev').length!==1||q.has('entry')||q.has('from'))return;
 const recordBootError=value=>{
   const message=value?.message||value?.reason?.message||value?.reason||String(value||'unknown error');
   window.__lastGardenBootError=message;
   const node=document.getElementById('load-error');
   if(node&&!node.hidden)node.textContent='読み込み失敗: '+message;
 };
 window.addEventListener('error',event=>recordBootError(event.error||event.message));
 window.addEventListener('unhandledrejection',event=>recordBootError(event));
 window.__TAROT_DEV_STAGE3__=true;
 if(route)window.__TAROT_DEV_STAR_GATE_ROUTE__=true;
 document.body.dataset.enteringFromLanding='true';document.body.dataset.devEntry=q.get('dev');
 document.documentElement.dataset.devHarness=q.get('dev');
 // Early diagnostic: show on boot, even when Stage3/Aftermath never ends.
 if(q.get('returnDebug')==='1'&&q.getAll('returnDebug').length===1){
   const panel=document.createElement('pre');
   panel.id='tarot-return-diagnostic';panel.setAttribute('role','status');
   Object.assign(panel.style,{
     position:'fixed',left:'7px',right:'7px',
     bottom:'calc(env(safe-area-inset-bottom) + 7px)',
     margin:'0',padding:'8px 10px',boxSizing:'border-box',
     maxHeight:'33vh',overflow:'hidden',whiteSpace:'pre-wrap',wordBreak:'break-word',
     font:'11px/1.35 monospace',color:'#f7edc9',background:'rgba(8,13,29,.96)',
     border:'2px solid #f0d476',borderRadius:'6px',zIndex:'2147483647',
     pointerEvents:'none'
   });
   document.body.appendChild(panel);
   let lastEvent=null;
   window.addEventListener('tarot-breaker:stage3-session-ended',event=>{lastEvent=event.detail;});
   const read=(fn)=>{try{return fn()??null;}catch(error){return {error:'READ_ERROR '+String(error)};}};
   const refresh=()=>{
     if(!panel.isConnected)document.body.appendChild(panel);
     try{
       const active=read(()=>window.TarotStarGateAnomaly?.getState?.());
       const finished=read(()=>window.TarotStarGateAnomaly?.getLastResult?.())||lastEvent;
       const after=read(()=>window.TarotStarGateAftermath?.getState?.());
       const attempt=read(()=>window.TarotStarGateAftermath?.getDiagnostic?.());
       const camera=read(()=>window.TarotCinematicCamera?.getState?.());
       const eligibility=attempt?.eligibility||null;
       const failed=eligibility?Object.entries(eligibility).filter(([key,value])=>
         ['finiteId','completed','restored'].includes(key)?value!==true:
         ['running','consumed','vision','absorption','overlays'].includes(key)?!!value:
         ['error','reason','recoveryError'].includes(key)?!!value:
         key==='owner'?value!==null:false).map(([key,value])=>key+':'+String(value)).join(','):'';
       const error=String(attempt?.error||after?.error||finished?.error||window.__lastGardenBootError||'none');
       panel.textContent=[
         'RETURN CAMERA DEBUG v2 / BOOT ACTIVE',
         'STAGE3: '+(active?.running?'RUNNING':finished?'ENDED':'WAITING')
          +' | completed='+String(finished?.completed??'-')
          +' | restored='+String(finished?.restored??'-'),
         'CAMERA: '+(camera?.owned?'OWNED':'FREE')+' | zoom='+String(camera?.camera?.zoom??'-'),
         'HANDOFF: '+String(finished?.returnCameraHandoff??'-')
          +' | prepared='+String(finished?.returnCameraPrepared??'-'),
         'AFTERMATH: '+String(after?.state||'NOT_LOADED')
          +' | start='+String(attempt?.status||'NO_ATTEMPT')
          +' | line='+String(after?.line||'-'),
         'FAILED CHECKS: '+(failed||'none'),
         'START FAILURE: '+String(finished?.afterStartFailure?.status||'-'),
         'ERROR: '+error.slice(0,170)
       ].join('\n');
     }catch(error){panel.textContent='RETURN CAMERA DEBUG v2 / PANEL_ERROR\n'+String(error);}
   };
   refresh();window.setInterval(refresh,500);
 }
 const completedEvents=['alenon_prologue','landing_devil_memory','garden_shiopon_meet',...(route?[]:['garden_lumiere_gate'])];
 const state={landingMemoryDone:true,gardenStory:{shioponDone:true,lumiereDone:!route,joined:true},companion:{mode:'following'}};
 window.TarotJourney=Object.freeze({get:k=>state[k],set:(k,v)=>{state[k]=v;},reset:()=>{}});
 window.TarotStage3DevFixture=Object.freeze({context:Object.freeze({mapId:'star_gate_garden',spawnId:'south_gate',spawn:Object.freeze({x:810,y:route?400:177}),completedEvents:Object.freeze(completedEvents),companion:'joined_with_shion'})});
 const shell=document.getElementById('game-shell');
 // A's approved lower sky registration is unchanged; only its 514px upper extension is restored.
 const sky=shell.querySelector('.scene-farthest-sky');
 sky.classList.add('scene-farthest-sky--extended');sky.querySelector('img').src='./assets/maps/star-country-farthest-sky-background-extended.webp';
 shell.insertAdjacentHTML('beforeend',"<div class=\"scene-object scene-back scene-celestial-gate-light\" data-scene-object data-world-x=\"610\" data-world-y=\"-430\" data-world-w=\"380\" data-world-h=\"640\" aria-hidden=\"true\"><div class=\"sga-sequence-glowfloor\"></div><div class=\"sga-sequence-layer sga-sequence-l1\"><img src=\"./assets/events/gate-vision/celestial_gate_light_01.webp\" alt=\"\" draggable=\"false\" /></div><div class=\"sga-sequence-layer sga-sequence-l2\"><img src=\"./assets/events/gate-vision/celestial_gate_light_02.webp\" alt=\"\" draggable=\"false\" /></div><div class=\"sga-sequence-layer sga-sequence-l3\"><img src=\"./assets/events/gate-vision/celestial_gate_light_03.webp\" alt=\"\" draggable=\"false\" /></div><div class=\"sga-sequence-layer sga-sequence-l4\"><img src=\"./assets/events/gate-vision/celestial_gate_light_04.webp\" alt=\"\" draggable=\"false\" /></div><div class=\"sga-sequence-flash\"></div></div>\n<div class=\"scene-object scene-back scene-dark-energy-rise\" data-scene-object data-world-x=\"640\" data-world-y=\"-300\" data-world-w=\"320\" data-world-h=\"510\" aria-hidden=\"true\"><div class=\"sga-dark-afterglow\"></div><img class=\"sga-dark-energy-frame\" src=\"./assets/events/gate-vision/dark_energy_rise_01.webp\" alt=\"\" draggable=\"false\" /><img class=\"sga-dark-energy-frame-next\" src=\"./assets/events/gate-vision/dark_energy_rise_02.webp\" alt=\"\" draggable=\"false\" /><img class=\"sga-dark-energy-frame-third\" src=\"./assets/events/gate-vision/dark_energy_rise_03.webp\" alt=\"\" draggable=\"false\" /><img class=\"sga-dark-energy-frame-fourth\" src=\"./assets/events/gate-vision/dark_energy_rise_04.webp\" alt=\"\" draggable=\"false\" /></div>\n<div class=\"scene-object scene-back sga-sky-flow\" data-scene-object data-world-x=\"640\" data-world-y=\"-430\" data-world-w=\"320\" data-world-h=\"270\" aria-hidden=\"true\"><div class=\"sga-energy-column\" aria-hidden=\"true\"></div><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div>\n      <div class=\"scene-object scene-front sga-gate-fx\" data-scene-object data-world-x=\"520\" data-world-y=\"-163.33333333333331\" data-world-w=\"560\" data-world-h=\"373.3333333333333\" aria-hidden=\"true\">\n        <svg class=\"sga-sephirot-network\" viewBox=\"0 0 1536 1024\" preserveAspectRatio=\"none\" aria-hidden=\"true\">\n          <g class=\"sga-sephirot-paths\">\n            <path d=\"M768 0 L768 162 L665 234 L665 331 L665 462 L768 543 L768 630\" />\n            <path d=\"M768 162 L871 234 L871 331 L871 462 L768 543\" />\n            <path d=\"M768 162 L768 331 L768 543\" />\n          </g>\n          <g class=\"sga-sephirot-nodes\">\n            <circle data-order=\"0\" cx=\"768\" cy=\"162\" r=\"45\" />\n            <circle data-order=\"1\" cx=\"665\" cy=\"234\" r=\"45\" />\n            <circle data-order=\"1\" cx=\"871\" cy=\"234\" r=\"45\" />\n            <circle data-order=\"2\" cx=\"665\" cy=\"331\" r=\"45\" />\n            <circle data-order=\"2\" cx=\"768\" cy=\"331\" r=\"45\" />\n            <circle data-order=\"2\" cx=\"871\" cy=\"331\" r=\"45\" />\n            <circle data-order=\"3\" cx=\"665\" cy=\"462\" r=\"45\" />\n            <circle data-order=\"3\" cx=\"871\" cy=\"462\" r=\"45\" />\n            <circle data-order=\"4\" cx=\"768\" cy=\"543\" r=\"45\" />\n            <circle data-order=\"5\" cx=\"768\" cy=\"630\" r=\"45\" />\n          </g>\n        </svg>\n        <div class=\"sga-gate-sparkles\" aria-hidden=\"true\"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div>\n      </div>\n");
 const gate=shell.querySelector('.scene-star-gate');gate.querySelector('img')?.classList.add('scene-star-gate-normal');
 const anomaly=document.createElement('img');anomaly.className='scene-star-gate-anomaly';anomaly.src='./assets/events/gate-vision/garden-star-gate.webp';anomaly.alt='';gate.append(anomaly);
 // Existing production Progress observer must not see a production backend.
 window.TarotGardenDevTransit=Object.freeze({ok:true,context:window.TarotStage3DevFixture.context,projection:Object.freeze({gardenStory:state.gardenStory})});
 document.write('<link rel="stylesheet" href="./star-gate-anomaly.css?v=stage3-v192"><link rel="stylesheet" href="./future-stage3.css?v=stage3-v192"><link rel="stylesheet" href="./star-gate-interaction.css?v=front-integration"><link rel="stylesheet" href="./star-gate-aftermath.css?v=aftermath-v13">');
 document.write('<script src="./dev-checkpoints.js?v=stage3-v192" defer><\/script><script src="./future-stage3.js?v=stage3-v192" defer><\/script><script src="./future-vision-audio.js?v=audio-v1" defer><\/script><script src="./star-gate-anomaly.js?v=stage3-v192" defer><\/script><script src="./star-gate-interaction.js?v=front-integration" defer><\/script><script src="./star-gate-aftermath.js?v=aftermath-v13" defer><\/script>');
 if(route)document.write('<script src="./star-gate-route.js?v=lumiere-route-v1" defer><\/script>');
 // Isolated, explicitly opted-in editor. No event animation or production entry.
 if(q.get('gateDebug')==='inner-light'&&q.getAll('gateDebug').length===1){
   document.documentElement.dataset.gateLightDebug='on';
   document.write('<link rel="stylesheet" href="./star-gate-inner-light-debug.css?v=1"><script src="./star-gate-inner-light-debug.js?v=1" defer><\/script>');
 }
})();
