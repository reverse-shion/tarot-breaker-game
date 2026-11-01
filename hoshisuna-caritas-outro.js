/* Caritas: existing 16-frame map sprite rise and quiet fade-out.
 * Presentation only. Does not alter dialogue, combat, save or shared map coordinates.
 */
(function(){
 'use strict';
 const BASE='./assets/events/hoshisuna/caritas/';
 const FRAMES=Array.from({length:16},(_,i)=>BASE+'sg_rise_'+String(i+1).padStart(2,'0')+'.webp');
 const FRAME_ENDS=[320,510,700,890,1070,1250,1430,1600,1770,1950,2130,2310,2500,2690,2900,3200];
 const RISE_MS=FRAME_ENDS[FRAME_ENDS.length-1];
 const FADE_MS=1800;
 let img=null,playing=false,clock=0,token=0,ready=false,preloaded=[];
 const reduce=()=>!!window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
 function target(){return img||(img=document.getElementById('hoshisuna-caritas'));}
 function preload(){
  if(ready)return;
  ready=true;
  if(typeof Image==='undefined')return;
  preloaded=FRAMES.map(src=>{const image=new Image();image.decoding='async';image.src=src;return image;});
 }
 function animate(duration,paint){
  const generation=++token;
  return new Promise(resolve=>{
   let elapsed=0,last=null;
   const tick=now=>{
    if(generation!==token){resolve(false);return;}
    if(last!==null&&!document.hidden)elapsed+=Math.max(0,Math.min(80,now-last));
    last=now;
    const progress=Math.min(1,elapsed/duration);
    paint(progress);
    if(progress>=1){resolve(true);return;}
    window.requestAnimationFrame(tick);
   };
   window.requestAnimationFrame(tick);
  });
 }
 function rise(){
  const el=target();
  if(!el)return Promise.resolve(false);
  playing=true;preload();
  el.style.opacity='1';
  el.src=FRAMES[0];
  if(reduce()){el.src=FRAMES[15];return Promise.resolve(true);}
  let current=0;
  return animate(RISE_MS,p=>{
   const elapsed=p*RISE_MS;
   let index=FRAME_ENDS.findIndex(end=>elapsed<end);
   if(index<0)index=15;
   if(index!==current){current=index;el.src=FRAMES[index];}
  }).then(ok=>{if(ok)el.src=FRAMES[15];return ok;});
 }
 function stand(){
  const el=target();if(!el)return false;
  ++token;playing=true;el.style.opacity='1';el.src=FRAMES[15];return true;
 }
 function fade(){
  const el=target();if(!el)return Promise.resolve(false);
  stand();
  if(reduce()){el.style.opacity='0';return Promise.resolve(true);}
  // The creature stays world-anchored: opacity alone changes, never scene layout.
  return animate(FADE_MS,p=>{const smooth=p*p*(3-2*p);el.style.opacity=String(1-smooth);})
   .then(ok=>{if(ok)el.style.opacity='0';return ok;});
 }
 function reset(){
  ++token;playing=false;const el=target();
  if(el){el.style.opacity='';el.src=FRAMES[0];}
 }
 function init(){
  if(!target())return;
  preload();
  if(clock)return;
  clock=setInterval(()=>{
   if(playing||document.hidden||document.body.classList.contains('caritas-departed'))return;
   const p=performance.now()%5200;
   const src=p>4250&&p<4510?FRAMES[1]:FRAMES[0];
   if(img.src.split('/').pop()!==src.split('/').pop())img.src=src;
  },180);
 }
 window.TarotHoshisunaCaritasOutro=Object.freeze({preload,rise,stand,fade,reset,frames:FRAMES});
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();