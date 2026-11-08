/* A v0.2 presentation sandbox. No model, dialogue, timer or save ownership. */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.CaritasBattleCamera=api;
})(typeof window!=='undefined'?window:this,function(){
 'use strict';
 const SPECIAL=new Set(['selecting','special','purifying','purified']);
 function stateFor({phase='battle',special='',waiting=false,speaker=null,tactical=false}={}){
  if(SPECIAL.has(phase)||['FACE_CUTIN','DUAL_INCANTATION','TECHNIQUE_ART','PURIFICATION','CARITAS_REPLY'].includes(special))return 'SPECIAL';
  // Frame the recipient, not Caritas, on tactical counter-hit.
  if(tactical&&phase==='enemy-turn')return 'COUNTER_HIT';
  if(waiting||['word-strike','written-light','enemy-turn'].includes(phase)||speaker==='カリタス'||speaker==='星獣')return 'REACTION';
  return 'READING';
 }
 function framing(mode,width,height){
  const scale=mode==='SPECIAL'?1/1.85:1;
  return {x:mode==='READING'||mode==='COUNTER_HIT'?-.80*width:mode==='REACTION'?-.03*width:0,
   y:mode==='SPECIAL'?height*(1-scale)*.75:0,scale};
 }
 function createController({paint,measure,freeze=()=>null}){
  let requested='READING',shown='',locked=false,size={width:390,height:330},frozen=null;
  function apply(instant=false){
   if(locked)return;
   const next=measure();
   if(next.width>0&&next.height>0)size=next;
   paint({mode:requested,...framing(requested,size.width,size.height),...size,instant:instant||shown===''});
   shown=requested;
  }
  return Object.freeze({
   update(value){const next=stateFor(value);if(next!==requested){requested=next;apply(value?.short===true);}},
   resize(){
    // ResizeObserver may fire during dialogue/control layout transitions without
    // any battlefield dimension change. Repainting then would snap a live pan.
    if(locked)return;
    const next=measure();
    if(next.width>0&&next.height>0&&
       (Math.abs(next.width-size.width)>.5||Math.abs(next.height-size.height)>.5))apply(true);
   },
   focus(){if(locked)return;frozen=freeze();locked=true;paint({mode:'INPUT_LOCK',...size,frozen,instant:true});},
   blur(){if(!locked)return;locked=false;frozen=null;apply(true);},
   getState:()=>({requested,shown,locked,...size})
  });
 }
 function mount({root,arena,input,actors,frame,statusBand}){
  const params=new URLSearchParams(location.search);
  if(!location.pathname.endsWith('/hoshisuna-main.html')||params.get('dev')!=='hoshisuna'||params.getAll('camera').length!==1||params.get('camera')!=='a02')return null;
  root.dataset.cameraLayout='a02';
  const world=document.createElement('div');world.className='cb-battle-world';
  const background=document.createElement('div');background.className='cb-world-background';
  background.setAttribute('aria-hidden','true');world.append(background,...actors);arena.append(world);
  const viewport=window.visualViewport;
  let closingTimer=0,focused=false,closing=false,fullHeight=viewport?.height||window.innerHeight;
  const set=(name,value)=>{if(root.style.getPropertyValue(name)!==value)root.style.setProperty(name,value);};
  const controller=createController({
   measure:()=>{const rect=arena.getBoundingClientRect();return {width:rect.width,height:rect.height};},
   freeze:()=>window.getComputedStyle(world).transform,
   paint:view=>{
    root.dataset.camera=view.mode;
    // A single travelling camera; smooth the pan rather than cutting scenes.
    world.style.transitionDuration=view.instant?'0s':view.mode==='COUNTER_HIT'?'0.23s':'1.25s';
    if(view.mode==='INPUT_LOCK'){
     // Snapshot even an in-flight pan; no actor-coordinate or camera changes
     // are allowed during IME/keyboard viewport scrolling.
     if(view.frozen&&view.frozen!=='none')world.style.transform=view.frozen;
     return;
    }
    set('--cb-world-width',view.width*2.2+'px');set('--cb-world-height',view.height+'px');
    set('--cb-camera-unit',view.width+'px');
    world.style.transform=`translate3d(${view.x}px,${view.y}px,0) scale(${view.scale})`;
   }
  });
  function sync(){
   const height=viewport?.height||window.innerHeight,top=viewport?.offsetTop||0;
   if(!focused&&!closing)fullHeight=height;
   set('--cb-camera-visible-height',height+'px');set('--cb-camera-visible-top',top+'px');
   if(closing&&height>=fullHeight*.88)finishClosing();
   root.dataset.cameraCompact=String((focused||closing)&&height<350);
   set('--cb-camera-crop',(height<350?0:Math.min(96,height*.22))+'px');
   // Layout, including viewport offset, settles before these measurements.
   const band=statusBand.getBoundingClientRect(),bounds=frame.getBoundingClientRect();
   set('--cb-camera-command-top',Math.max(0,band.bottom-bounds.top)+'px');
   if(!focused&&!closing)controller.resize();
  }
  function finishClosing(){
   closing=false;clearTimeout(closingTimer);root.dataset.cameraInput='false';controller.blur();
  }
  function onFocus(){
   clearTimeout(closingTimer);closing=false;
   controller.focus();focused=true;root.dataset.cameraInput='true';sync();
  }
  function onBlur(){
   focused=false;closing=true;
   // Safari may report blur before its keyboard-closing resize. Keep the
   // frozen composition until it settles; hardware keyboards need a fallback.
   closingTimer=setTimeout(()=>{finishClosing();sync();},700);sync();
  }
  input.addEventListener('focus',onFocus);input.addEventListener('blur',onBlur);
  viewport?.addEventListener('resize',sync);viewport?.addEventListener('scroll',sync);
  window.addEventListener('resize',sync);window.addEventListener('pageshow',sync);
  const observer=typeof ResizeObserver==='function'?new ResizeObserver(sync):null;
  observer?.observe(arena);observer?.observe(statusBand);
  controller.resize();sync();
  return Object.freeze({update:controller.update,getState:controller.getState});
 }
 return Object.freeze({stateFor,framing,createController,mount});
});
