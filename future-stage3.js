/* Stage 3 latter half: observation states only; no claim about their cause. */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.TarotFutureStage3=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const DIALOGUE=Object.freeze(['……？','……アルカナが……？','……っ','……違う。アルカナだけじゃない……','……これが……選ばれた未来、なのか。','……私は、今……何を……？','……いや。パメラの記憶を、探さなければ。']);
 const ASSETS=Object.freeze([
  {id:'small',path:'./assets/events/gate-vision/future-fixation-rift-01-small.webp',width:1024,height:1536,anchor:{x:520,y:775},viewportWidth:96/390,axis:'vertical, upper-left to lower-right branch'},
  {id:'medium',path:'./assets/events/gate-vision/future-fixation-rift-02-medium.webp',width:1024,height:1536,anchor:{x:535,y:760},viewportWidth:200/390,axis:'vertical, upper-left to lower-right branch'},
  {id:'large',path:'./assets/events/gate-vision/future-fixation-rift-03-large.webp',width:1024,height:1536,anchor:{x:535,y:765},viewportWidth:338/390,axis:'vertical, upper-left to lower-right branch'},
  {id:'vortex',path:'./assets/events/gate-vision/future-fixation-rift-04-vortex.webp',width:1024,height:1536,anchor:{x:510,y:820},viewportWidth:338/390,axis:'large branches into dark spiral throat'}
 ].map(x=>Object.freeze({...x,anchor:Object.freeze(x.anchor),rgbaBytes:x.width*x.height*4})));
 function aborted(){const e=new Error('Stage 3 interrupted');e.name='AbortError';return e;}
 function createClock(signal,{now=()=>performance.now(),raf=fn=>requestAnimationFrame(fn),cancel=id=>cancelAnimationFrame(id)}={}){
  const rawNow=now;let last=rawNow(),elapsed=0,hidden=typeof document!=='undefined'&&document.hidden;
  now=()=>{const value=rawNow();if(!hidden)elapsed+=Math.max(0,value-last);last=value;return elapsed;};
  const visibility=()=>{now();hidden=document.hidden;};
  if(typeof document!=='undefined')document.addEventListener('visibilitychange',visibility);
  const dispose=()=>{if(typeof document!=='undefined')document.removeEventListener('visibilitychange',visibility);};
  signal?.addEventListener('abort',dispose,{once:true});
  const assert=()=>{if(signal?.aborted)throw aborted();};
  function tween(duration,step=()=>{}){
   assert();const start=now();step(0);
   return new Promise((resolve,reject)=>{
    let id;const stop=()=>{cancel(id);signal?.removeEventListener('abort',stop);reject(aborted());};
    signal?.addEventListener('abort',stop,{once:true});
    const tick=()=>{try{assert();const p=Math.min(1,(now()-start)/duration);step(p);if(p<1)id=raf(tick);else{signal?.removeEventListener('abort',stop);resolve();}}catch(e){signal?.removeEventListener('abort',stop);reject(e);}};
    id=raf(tick);
   });
  }
  return {now,assert,tween,dispose,wait:duration=>duration>0?tween(duration):Promise.resolve().then(assert)};
 }
 function interpolate(points,p){
  for(let i=1;i<points.length;i++)if(p<=points[i][0]){const [x,a]=points[i-1],[y,b]=points[i];return a+(b-a)*(p-x)/(y-x);}
  return points.at(-1)[1];
 }
 async function coveredRestore(clock,minimum,restore,draw,{deadline=2000}={}){
  const start=clock.now();let ready=false,error,live=true;
  const context={alive:()=>live};
  Promise.resolve().then(()=>restore(context)).then(()=>{if(!live)throw aborted();return draw(context);}).then(()=>{if(live)ready=true;},e=>{error=e;});
  // Minimum hold and restoration deadline are separate; no network/decode here.
  try{
   while(!ready){if(error)throw error;if(clock.now()-start>=deadline)throw new Error('covered-restore-timeout');await clock.wait(Math.min(16,deadline-(clock.now()-start)));}
   if(error)throw error;
   await clock.wait(Math.max(0,minimum-(clock.now()-start)));
   return {elapsed:clock.now()-start,extended:clock.now()-start>minimum+17};
  }finally{live=false;}
 }
 async function run(a,clock){
  const state=name=>{clock.assert();a.state(name,clock.now());};
  const tween=(duration,from,to,visual)=>clock.tween(duration,p=>{a.audioLevel(from+(to-from)*p);visual?.(p);a.checkFixed?.();});
  const afterClose=async(duration,close)=>clock.wait(Math.max(0,duration-(clock.now()-close)));
  await a.prepare();clock.assert();a.lockGeometry();
  state('RIFT_SMALL');await tween(200,1,1,p=>a.rift('small',p,.96+.04*p));
  state('RIFT_SMALL_HOLD');await clock.wait(180);
  state('RIFT_MEDIUM');await tween(400,1,.95,p=>{a.rift('small',1-Math.min(1,p*4),1);a.rift('medium',Math.min(1,p*4),.98+.02*p);});
  state('WORLD_ANOMALY_RECOGNITION');let close=await a.say(DIALOGUE[3]);await afterClose(200,close);
  state('RIFT_LARGE');await tween(580,.95,.825,p=>{a.rift('medium',1-Math.min(1,p*580/120),1);a.rift('large',Math.min(1,p*580/120),.985+.015*p);});
  await clock.wait(350);state('FUTURE_REALIZATION');close=await a.say(DIALOGUE[4]);
  state('NO_RESPONSE');await afterClose(600,close);
  state('VORTEX_EMERGENCE');await tween(550,.825,.65,p=>{
   a.rift('large',interpolate([[0,1],[180/550,1],[370/550,.75],[1,.50]],p),1);
   a.rift('vortex',interpolate([[0,0],[180/550,.35],[370/550,.70],[1,1]],p),1);
  });
  state('WORLD_ABSORPTION');a.startAbsorption();
  await clock.tween(1050,p=>{const q=p<=300/1050?.1*p*1050/300:.1+.9*(p*1050-300)/750;
   a.absorb({scale:1-.1*q,opacity:1-.88*q,saturation:1-.70*q,contrast:1-.30*q});
   a.audioLevel(p<=300/1050?.65-.30*p*1050/300:.35-.225*(p*1050-300)/750);a.checkFixed?.();
  });
  state('FUTURE_WHITEOUT');await tween(340,.125,0,p=>{a.white(p);a.absorb({contrast:.70*(1-p),saturation:.30*(1-p)});});
  state('FULL_WHITE');a.pauseFutureAudio();
  state('FUTURE_RESTORE');const whiteHold=await coveredRestore(clock,240,ctx=>a.restoreFuture(ctx),ctx=>a.draw(ctx));a.recordHold?.('white',whiteHold);
  a.resumeFutureAudio();await tween(350,0,1,p=>a.white(1-p));
  await clock.wait(350);state('MEMORY_GAP');close=await a.say(DIALOGUE[5]);await afterClose(550,close);
  state('MISSION_RESUME');close=await a.say(DIALOGUE[6]);await afterClose(600,close);
  a.assertPresentPrepared();state('FUTURE_FADE');await tween(550,1,0,p=>a.black(p));
  state('BLACK_CUT');a.pauseFutureAudio();
  state('PRESENT_RESTORE');const blackHold=await coveredRestore(clock,180,ctx=>a.restorePresent(ctx),ctx=>a.draw(ctx));a.recordHold?.('black',blackHold);
  // Keep the blackout completely silent. First clear the black overlay,
  // then wait until the restored Garden has actually painted before any ordinary BGM resumes.
  await clock.tween(550,p=>a.black(1-p));
  state('PRESENT_VISIBLE');if(a.presentVisible)await a.presentVisible();
  a.resumePresentAudio();
  state('CONTROL_RETURN');a.returnControl();
 }
 return Object.freeze({DIALOGUE,ASSETS,createClock,coveredRestore,run,interpolate});
});
