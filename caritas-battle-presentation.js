/* Presentation only: the committed battle model remains the sole meter authority. */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.CaritasBattlePresentation=api;
})(typeof window!=='undefined'?window:this,function(){
 'use strict';
 const base='./assets/battle/caritas/';
 const images=Object.freeze({
  closed:base+'caritas-01_closed.webp',notice:base+'caritas-02_notice.webp',
  guarded:base+'caritas-03_guarded.webp',hesitate:base+'caritas-04_hesitate.webp',
  resolve:base+'caritas-05_resolve.webp',resist:base+'caritas-06_resist.webp',
  accept:base+'caritas-07_accept.webp',relief:base+'caritas-08_relief.webp',
  normal:'./assets/events/hoshisuna/battle/caritas-battle.webp'
 });
 function derive({dark=100,phase='battle',special='',speaking=false,response='',finisher=false}={}){
  const amount=Number.isFinite(dark)?Math.max(0,Math.min(100,dark)):100;
  // Zero always wins over every attack/dialogue/purification animation, including reload.
  if(amount===0)return {pose:'normal',src:images.normal,darkness:0};
  let pose=amount>=86?'closed':amount>=71?'guarded':amount>=56?'resist':amount>=36?'hesitate':amount>=16?'notice':'resolve';
  if(finisher)pose='resolve';
  if(speaking&&response)pose=({'癒し':'accept','願い':'notice','希望':'resolve',written:'accept'})[response]||pose;
  if(phase==='word-strike')pose='guarded';
  if(phase==='enemy-turn')pose='resist';
  // The beast finally relaxes during the release, but remains invaded until the real zero commit.
  if(phase==='purifying'||special==='PURIFICATION')pose='relief';
  return {pose,src:images[pose],darkness:Math.round((.18+.76*amount/100)*1000)/1000};
 }
 function createView({root,beast,veil,ImageClass=typeof Image==='undefined'?null:Image}){
  const cache=new Map();let latest=null,shown=images.normal;
  function paint(){
   if(!latest)return;
   root.dataset.caritasPose=latest.pose;
   root.dataset.darkCleared=String(latest.darkness===0);
   root.style.setProperty('--cb-darkness',String(latest.darkness));
   // Leave a decoded image in place until the requested pose is ready. Async
   // completions always repaint LATEST, never the state that started the fetch.
   const target=latest.pose==='normal'?images.normal:cache.get(latest.src)==='ready'?latest.src:shown;
   if(target!==shown){beast.src=target;shown=target;}
   veil.style.setProperty('--cb-caritas-mask','url("'+shown+'")');
  }
  function update(state){latest=derive(state);paint();return latest;}
  for(const src of Object.values(images)){
   cache.set(src,'loading');
   if(!ImageClass){cache.set(src,'failed');continue;}
   const img=new ImageClass();img.decoding='async';
   img.onerror=()=>{cache.set(src,'failed');};
   img.onload=async()=>{
    try{
     if(img.decode)await img.decode();
     if(!img.naturalWidth)throw Error('empty-caritas-image');
     cache.set(src,'ready');paint();
    }catch(_){cache.set(src,'failed');}
   };
   img.src=src;
  }
  return Object.freeze({update});
 }
 return Object.freeze({images,derive,createView});
});
