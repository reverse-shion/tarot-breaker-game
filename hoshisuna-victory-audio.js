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
 const permitted=()=>!document.hidden&&window.TarotAudio?.enabled!==false;
 function pauseNative(){
  ++generation;playAttempt=null;music.muted=true;music.pause();
 }
 function stopVictory(){
  victory=false;openingPending=false;pauseNative();music.loop=true;
  try{music.currentTime=0;}catch(_){}
 }
 function seekOpening(){
  if(!victory)return false;
  if(Number.isFinite(music.readyState)&&music.readyState<1){openingPending=true;return false;}
  try{music.currentTime=0;openingPending=false;return true;}
  catch(_){openingPending=true;return false;}
 }
 function reveal(){
  if(!encounter||!victory||!permitted()||music.paused||playAttempt)return;
  if(openingPending&&!seekOpening())return;
  music.volume=VOLUME;music.muted=false;
 }
 function primeNative(){
  if(!encounter||(!combat&&!victory)||!permitted()||playAttempt)return;
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
 function gesture(){if(encounter&&(combat||victory))primeNative();}
 window.addEventListener('tarot-breaker:interaction-start',event=>{
  if(event.detail?.source===OWNER){encounter=true;combat=false;}
 });
 window.addEventListener('tarot-breaker:hoshisuna-battle-start',()=>{
  if(encounter&&!victory)combat=true;
 });
 window.addEventListener('tarot-breaker:hoshisuna-victory-start',beginVictory);
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
