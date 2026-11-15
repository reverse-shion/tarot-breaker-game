/* Caritas victory cue: native one-shot after successful purification.
 * Prewarm muted media only on a genuine combat gesture for iPhone Safari.
 * Field BGM remains silent until the actual map handoff. */
(() => {
 'use strict';
 if(typeof Audio!=='function')return;
 const OWNER='hoshisuna_caritas_prompt';
 const SOURCE='./assets/battle/bgm/Courage%20to%20Begin%20Again.m4a';
 const VOLUME=0.42;
 const music=new Audio(SOURCE);
 music.preload='auto';
 music.loop=true; // silent prewarm does not end during a long reading
 music.muted=true;
 music.volume=VOLUME;
 music.setAttribute('playsinline','');
 let encounter=false,combat=false,victory=false,openingPending=false;
 let playAttempt=null,generation=0;
 let fading=null,fadeFrame=0,fadeBuffer=null,fadeBufferRequested=false,fadeContext=null;
 const platform=window.navigator?.platform||'';
 const needsBufferedFade=/iPhone|iPad|iPod/.test(platform)||
  (platform==='MacIntel'&&window.navigator?.maxTouchPoints>1);
 function prepareFadeBuffer(){
  const Decoder=window.OfflineAudioContext||window.webkitOfflineAudioContext;
  if(!needsBufferedFade||!Decoder||fadeBufferRequested)return;
  fadeBufferRequested=true;
  // Offline decoding leaves the known-good native victory transport connected.
  // Limit transient stereo PCM memory while keeping the original music asset.
  fetch(SOURCE).then(response=>{
   if(!response.ok)throw Error('Victory fade buffer unavailable');
   return response.arrayBuffer();
  }).then(bytes=>new Decoder(2,1,24000).decodeAudioData(bytes))
   .then(buffer=>{fadeBuffer=buffer;}).catch(()=>{});
 }
 function stopFadeBuffer(){
  if(!fading?.source)return;
  fading.source.stop();
  fading.source=null;
 }
 function stopFade(){
  if(fadeFrame)cancelAnimationFrame(fadeFrame);
  fadeFrame=0;stopFadeBuffer();fading=null;
 }
 function playBufferedFade(fade){
  const Context=window.AudioContext||window.webkitAudioContext;
  if(!fadeBuffer||!Context)return;
  try{
   fadeContext ||= new Context();
   const context=fadeContext;
   Promise.resolve(context.resume()).then(()=>{
    if(fading!==fade||!permitted()||music.paused||music.muted||context.state!=='running')return;
    const left=fade.duration-(performance.now()-fade.startedAt);
    const offset=music.currentTime;
    if(left<100||!Number.isFinite(offset)||offset<0||offset>=fadeBuffer.duration)return;
    const source=context.createBufferSource(),gain=context.createGain(),now=context.currentTime;
    source.buffer=fadeBuffer;
    gain.gain.setValueAtTime(music.volume,now);
    gain.gain.linearRampToValueAtTime(0,now+left/1000);
    gain.connect(context.destination);
    source.connect(gain);
    source.onended=()=>{source.disconnect();gain.disconnect();if(fade.source===source)fade.source=null;};
    source.start(now,offset,left/1000);
    fade.source=source;
    // Switch only after the independent tail has started, within the light.
    cancelAnimationFrame(fadeFrame);fadeFrame=0;
    music.muted=true;music.pause();
   }).catch(()=>{});
  }catch(_){}
 }
 function fadeVictory(event){
  if(event.detail?.source!==OWNER||!victory||fading)return;
  const duration=Number(event.detail.duration);
  if(!Number.isFinite(duration)||duration<=0)return;
  const fade=fading={duration,startedAt:performance.now(),source:null};
  if(music.paused||music.muted||music.ended)return;
  const from=music.volume;
  const step=now=>{
   const progress=Math.max(0,Math.min(1,(now-fade.startedAt)/duration));
   music.volume=from*(1-progress);
   fadeFrame=progress<1?requestAnimationFrame(step):0;
  };
  fadeFrame=requestAnimationFrame(step);
  playBufferedFade(fade);
 }
 const permitted=()=>!document.hidden&&window.TarotAudio?.enabled!==false;
 function pauseNative(){
  ++generation;playAttempt=null;stopFadeBuffer();music.muted=true;music.pause();
 }
 function stopVictory(){
  stopFade();victory=false;openingPending=false;pauseNative();music.loop=true;
  try{music.currentTime=0;}catch(_){}
 }
 function seekOpening(){
  if(!victory)return false;
  if(Number.isFinite(music.readyState)&&music.readyState<1){openingPending=true;return false;}
  try{music.currentTime=0;openingPending=false;return true;}
  catch(_){openingPending=true;return false;}
 }
 function reveal(){
  if(!encounter||!victory||!permitted()||music.paused||playAttempt||fading)return;
  if(openingPending&&!seekOpening())return;
  music.volume=VOLUME;music.muted=false;
 }
 function primeNative(){
  if(!encounter||(!combat&&!victory)||!permitted()||playAttempt||(victory&&music.ended))return;
  if(!music.paused){reveal();return;}
  const token=++generation;
  let result;
  try{result=music.play();}catch(error){result=Promise.reject(error);}
  const attempt=Promise.resolve(result);playAttempt=attempt;
  attempt.then(()=>{
   if(generation!==token)return;
   playAttempt=null;
   if(!encounter||!permitted()){pauseNative();return;}
   reveal();
  },()=>{
   if(generation!==token)return;
   playAttempt=null;music.muted=true; // retry on next real gesture
  });
 }
 function beginVictory(event){
  if(event.detail?.source!==OWNER||!encounter||victory)return;
  combat=false;victory=true;music.loop=false;openingPending=true;
  seekOpening();
  if(!music.paused)reveal();else primeNative();
 }
 function gesture(){
  if(!encounter||(!combat&&!victory)||!permitted()||fading)return;
  primeNative();prepareFadeBuffer();
 }
 window.addEventListener('tarot-breaker:interaction-start',event=>{
  if(event.detail?.source===OWNER){encounter=true;combat=false;}
 });
 window.addEventListener('tarot-breaker:hoshisuna-battle-start',()=>{
  if(encounter&&!victory)combat=true;
 });
 window.addEventListener('tarot-breaker:hoshisuna-victory-start',beginVictory);
 window.addEventListener('tarot-breaker:hoshisuna-victory-fade',fadeVictory);
 window.addEventListener('tarot-breaker:hoshisuna-victory-stop',event=>{
  if(event.detail?.source===OWNER)stopVictory();
 });
 window.addEventListener('tarot-breaker:interaction-end',event=>{
  if(event.detail?.source!==OWNER)return;
  encounter=false;combat=false;stopVictory();
 });
 music.addEventListener('loadedmetadata',()=>{if(openingPending)reveal();});
 music.addEventListener('canplay',()=>{if(openingPending)reveal();});
 music.addEventListener('ended',()=>{music.muted=true;});
 music.addEventListener('error',()=>console.warn('[Hoshisuna] victory BGM unavailable; verify Opus/.m4a Safari compatibility:',SOURCE));
 window.addEventListener('pointerdown',gesture,{capture:true,passive:true});
 window.addEventListener('touchstart',gesture,{capture:true,passive:true});
 window.addEventListener('keydown',gesture,true);
 window.addEventListener('pagehide',pauseNative);
 document.addEventListener('visibilitychange',()=>{if(document.hidden)pauseNative();});
})();
