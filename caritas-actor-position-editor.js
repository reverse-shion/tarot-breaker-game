/* Caritas camera-only position editor: opt-in ?editor=actors in A02 preview.
 * No modification to battle model, save, dialogue or animation controller. */
(function(){
 'use strict';
 const qs=new URLSearchParams(location.search);
 if(qs.get('editor')!=='actors'||qs.get('camera')!=='a02'||qs.get('dev')!=='hoshisuna')return;
 const NEW_SHIORIEL='https://raw.githubusercontent.com/reverse-shion/tarot-breaker-game/a107c393f74d06017b201e8f89fd2f8c836d5fbd/assets/battle/character/shioriel.webp';
 const KEY='tb.caritas.actor-editor.a02.v1';
 const defaults={shioriel:{x:1.35,y:7,h:61.5,w:41.5},shion:{x:1.57,y:8.5,h:51.5,w:28}};
 const clone=o=>JSON.parse(JSON.stringify(o));
 const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
 let settings=clone(defaults),selected='shioriel',enabled=true,drag=null,showNew=true;
 try{const old=JSON.parse(localStorage.getItem(KEY)||'null');
   if(old&&old.version===1)for(const name of Object.keys(defaults))
     for(const field of Object.keys(defaults[name]))if(Number.isFinite(old[name]?.[field]))
       settings[name][field]=clamp(old[name][field],field==='x'?.85:field==='y'?0:8,field==='x'?1.95:field==='y'?35:65);
   if(old&&old.version===1)showNew=old.showNew!==false;
 }catch(_){}
 const el=(tag,cls,text)=>{const node=document.createElement(tag);if(cls)node.className=cls;if(text)node.textContent=text;return node;};
 function start(){
  const root=document.getElementById('caritas-event');
  const world=root?.querySelector('.cb-battle-world');
  const arena=root?.querySelector('.cb-arena');
  const actors={shioriel:world?.querySelector('.cb-angel'),shion:world?.querySelector('.cb-shion-sprite')};
  if(!root||!world||!arena||!actors.shion||!actors.shioriel)return false;
  const bar=el('div','cb-aeditor-bar');
  bar.setAttribute('aria-label','キャラクター配置エディタ');
  const toggle=el('button','cb-aeditor-toggle','配置エディタ');
  toggle.type='button';toggle.setAttribute('aria-expanded','true');
  const panel=el('section','cb-aeditor-panel');
  panel.setAttribute('aria-label','立ち位置とサイズの調整');
  panel.innerHTML='<div class="cb-aeditor-head"><strong>バトル配置エディタ</strong><button type="button" data-action="hide">閉じる</button></div><div class="cb-aeditor-tabs"><button type="button" data-actor="shioriel">シオリエル</button><button type="button" data-actor="shion">シオン</button></div><label class="cb-aeditor-art"><input type="checkbox" data-new-art checked> 新しいシオリエル画像を表示</label><div class="cb-aeditor-fields"></div><div class="cb-aeditor-actions"><button type="button" data-action="reset">初期位置</button><button type="button" data-action="copy">設定値をコピー</button></div><div class="cb-aeditor-message" role="status" aria-live="polite">キャラクターを指で動かせます。保存はこの端末だけです。</div>';
  bar.append(toggle,panel);document.body.append(bar);root.dataset.actorEditor='true';
  const controls=panel.querySelector('.cb-aeditor-fields');
  const fields=[['x','左右位置',.85,1.95,.01],['y','足元の高さ',0,35,.5],['h','表示高さ',8,65,.5],['w','表示幅',8,65,.5]];
  const inputs={};
  for(const [key,label,min,max,step] of fields){
    const row=el('label','cb-aeditor-field'),heading=el('span','cb-aeditor-field-name');
    heading.textContent=label;
    const output=el('output','cb-aeditor-value');
    const input=el('input','');input.type='range';input.min=min;input.max=max;input.step=step;
    row.append(heading,output,input);controls.append(row);
    inputs[key]={input,output};
    input.addEventListener('input',()=>{settings[selected][key]=Number(input.value);apply();save();updateFields()});
  }
  function freezeCamera(){
   const width=arena.getBoundingClientRect().width;
   if(width>0)world.style.setProperty('transform','translate3d('+(-.8*width)+'px,0px,0px) scale(1)','important');
   world.style.setProperty('transition','none','important');
  }
  function apply(){
   const unit=arena.getBoundingClientRect().width;
   if(!unit)return;
   freezeCamera();
   for(const [name,actor] of Object.entries(actors)){
    const s=settings[name];
    actor.style.setProperty('left',(s.x*unit-s.w/200*arena.getBoundingClientRect().height)+'px','important');
    actor.style.setProperty('bottom',s.y+'%','important');
    actor.style.setProperty('width','calc(var(--cb-world-height) * '+(s.w/100)+')','important');
    actor.style.setProperty('height',s.h+'%','important');
    actor.style.setProperty('pointer-events','auto','important');
    actor.style.setProperty('touch-action','none','important');
    actor.dataset.actorEditorSelect=name===selected?'true':'false';
   }
   if(showNew)actors.shioriel.style.setProperty('background-image','url("'+NEW_SHIORIEL+'")','important');
   else actors.shioriel.style.setProperty('background-image',"url('./assets/battle/camera/shioriel.webp')",'important');
  }
  function save(){try{localStorage.setItem(KEY,JSON.stringify({version:1,...settings,showNew}));}catch(_){}}
  function updateFields(){
   panel.querySelectorAll('[data-actor]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.actor===selected)));
   for(const [key,obj] of Object.entries(inputs)){
    obj.input.value=settings[selected][key];
    obj.output.textContent=(key==='x'?settings[selected][key].toFixed(2):settings[selected][key].toFixed(1))+(key==='x'?' ×画面幅':'%');
   }
   panel.querySelector('[data-new-art]').checked=showNew;
  }
  function select(name){selected=name;updateFields();apply();}
  panel.querySelectorAll('[data-actor]').forEach(b=>b.addEventListener('click',()=>select(b.dataset.actor)));
  panel.querySelector('[data-new-art]').addEventListener('change',e=>{showNew=e.target.checked;apply();save()});
  const msg=panel.querySelector('.cb-aeditor-message');
  const setMessage=t=>msg.textContent=t;
  function setVisible(value){
   enabled=value;panel.hidden=!value;toggle.setAttribute('aria-expanded',String(value));
   root.dataset.actorEditor=value?'true':'false';
   if(value)apply();
  }
  toggle.addEventListener('click',()=>setVisible(!enabled));
  panel.querySelector('[data-action="hide"]').addEventListener('click',()=>setVisible(false));
  panel.querySelector('[data-action="reset"]').addEventListener('click',()=>{settings=clone(defaults);save();updateFields();apply();setMessage('初期位置に戻しました。')});
  panel.querySelector('[data-action="copy"]').addEventListener('click',async()=>{
    const data=JSON.stringify({version:1,source:'Caritas A02 editor',shioriel:settings.shioriel,shion:settings.shion,showNew},null,2);
    try{await navigator.clipboard.writeText(data);setMessage('設定値をコピーしました。ここに貼ればゲームへ反映できます。')}
    catch(_){const box=el('textarea');box.value=data;panel.append(box);box.select();setMessage('下のテキストを選択してコピーしてください。')}
  });
  for(const [name,actor] of Object.entries(actors)){
   actor.addEventListener('pointerdown',event=>{
    if(!enabled||event.button>0)return;
    select(name);event.preventDefault();event.stopPropagation();
    const scale=arena.getBoundingClientRect().width / Math.max(1,arena.offsetWidth);
    drag={id:event.pointerId,name,startX:event.clientX,startY:event.clientY,x:settings[name].x,y:settings[name].y,scale};
    actor.setPointerCapture?.(event.pointerId);
   });
   actor.addEventListener('pointermove',event=>{
    if(!drag||drag.id!==event.pointerId||drag.name!==name)return;
    event.preventDefault();
    const width=arena.getBoundingClientRect().width||390,height=arena.getBoundingClientRect().height||330;
    settings[name].x=clamp(drag.x+(event.clientX-drag.startX)/width,.85,1.95);
    settings[name].y=clamp(drag.y-(event.clientY-drag.startY)/height*100,0,35);
    apply();updateFields();
   });
   const end=event=>{if(drag?.id===event.pointerId){drag=null;save();setMessage('位置を端末に保存しました。')}};
   actor.addEventListener('pointerup',end);actor.addEventListener('pointercancel',end);
  }
  const observer=typeof ResizeObserver==='function'?new ResizeObserver(()=>{if(enabled)apply()}):null;
  observer?.observe(arena);
  updateFields();apply();
  return true;
 }
 let tries=0;
 const ready=()=>{if(start())return;if(++tries<50)setTimeout(ready,250)};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready,{once:true});else ready();
})();
