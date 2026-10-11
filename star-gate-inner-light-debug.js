/* TAROT BREAKER — dev-only, on-device Gate void aperture editor.
 * Activated exclusively by ?dev=star-gate-full&gateDebug=inner-light.
 * Nothing is persisted to game progress; final numbers require explicit review.
 */
(()=>{
 'use strict';
 const query=new URLSearchParams(location.search);
 if(query.get('dev')!=='star-gate-full'||query.getAll('dev').length!==1||
    query.get('gateDebug')!=='inner-light'||query.getAll('gateDebug').length!==1||
    query.has('entry')||query.has('from')||window.__TAROT_DEV_STAGE3__!==true)return;
 const STORAGE='tarot-breaker:gate-void-aperture-debug-v1';
 const SOURCE='./assets/events/gate-vision/gate-void.webp';
 const SOURCE_RECT=Object.freeze({left:620,top:140,width:296,height:595});
 // Identical to the event's locked final-rest fit. Reset returns to these approved values.
 const APPROVED_VOID_FIT=Object.freeze({left:26.627,top:-2.3,width:46.746,height:74.8});
 const FIELDS=Object.freeze([
  {key:'left',label:'左右',min:-50,max:140},
  {key:'top',label:'上下',min:-50,max:150},
  {key:'width',label:'横幅',min:5,max:180},
  {key:'height',label:'高さ',min:5,max:200}
 ]);
 const shell=document.getElementById('game-shell');
 const light=shell?.querySelector('.scene-gate-inner-light');
 const frame=shell?.querySelector('.scene-star-gate');
 const img=light?.querySelector('img');
 if(!shell||!light||!frame||!img)return;
 const clamp=(x,min,max)=>Math.min(max,Math.max(min,x));
 const round=n=>Math.round(n*1000)/1000;
 const message=label=>{if(status)status.textContent=label;};
 let status=null,values={},baseline={},panel,guide,rectGuide,dragFrame,resizeGrip,reveal,viewMode='overview',guidesOn=true;
 let moved=null,sceneReady=false,started=false;
 function calculateBaseline(){
  const g=frame.dataset,l=light.dataset;
  const geo=['worldX','worldY','worldW','worldH'].map(k=>Number(g[k]));
  const inner=['worldX','worldY','worldW','worldH'].map(k=>Number(l[k]));
  if(![...geo,...inner].every(Number.isFinite)||geo[2]<=0||geo[3]<=0||inner[2]<=0||inner[3]<=0)throw Error('星門の座標が取得できません');
  // Keep geometry validation above, but never silently reset to the pre-calibration fit.
  return {...APPROVED_VOID_FIT};
 }
 function validValues(obj){
  return !!obj&&FIELDS.every(f=>typeof obj[f.key]==='number'&&
    Number.isFinite(obj[f.key])&&obj[f.key]>=f.min&&obj[f.key]<=f.max);
 }
 function apply(){
  if(!validValues(values))return;
  for(const f of FIELDS)img.style.setProperty('--sga-void-'+f.key,round(values[f.key])+'%');
  if(panel)for(const f of FIELDS){
   const output=panel.querySelector('[data-value="'+f.key+'"]');
   const slider=panel.querySelector('[data-range="'+f.key+'"]');
   if(output)output.textContent=round(values[f.key]).toFixed(3)+'%';
   if(slider)slider.value=values[f.key];
  }
  updateGuide();
 }
 function change(key,value){
  const f=FIELDS.find(item=>item.key===key);
  if(!f||!Number.isFinite(value))return;
  values[key]=round(clamp(value,f.min,f.max));apply();
  message('変更中（まだゲーム本編には反映されていません）');
 }
 function loadSaved(){
  try{const v=JSON.parse(localStorage.getItem(STORAGE)||'null');
   if(validValues(v)){values={...v};apply();message('端末内の保存値を読み込みました');}
   else message('保存値がありません');
  }catch{message('保存値を読み込めません');}
 }
 function copyValue(){
  const payload={
   image:SOURCE,units:'percent-of-inner-light-parent',
   left:values.left,top:values.top,width:values.width,height:values.height,
   cssVariables:Object.fromEntries(FIELDS.map(f=>['--sga-void-'+f.key,round(values[f.key])+'%']))
  };
  return JSON.stringify(payload,null,2);
 }
 function setRect(el,r){
  Object.assign(el.style,{left:r.left+'px',top:r.top+'px',width:r.width+'px',height:r.height+'px'});
 }
 function updateGuide(){
  if(!guide||!sceneReady)return;
  const ir=img.getBoundingClientRect(),fr=frame.getBoundingClientRect();
  if(!(ir.width>0&&fr.width>0))return;
  setRect(dragFrame,ir);
  setRect(rectGuide,{
   left:fr.left+SOURCE_RECT.left/1536*fr.width,
   top:fr.top+SOURCE_RECT.top/1024*fr.height,
   width:SOURCE_RECT.width/1536*fr.width,
   height:SOURCE_RECT.height/1024*fr.height
  });
  guide.classList.toggle('is-hidden',!guidesOn||panel?.hidden);
 }
 function track(){if(!started)return;updateGuide();requestAnimationFrame(track);}
 async function frameScene(mode){
  viewMode=mode;
  if(!window.TarotCinematicCamera)return;
  const bounds=mode==='close'?
   {left:615,top:-190,right:985,bottom:265}:
   {left:470,top:-200,right:1130,bottom:510};
  const result=await window.TarotCinematicCamera.frameBounds(bounds,0,{padding:18,minZoom:.28,topInset:25});
  if(result?.completed)message(mode==='close'?'拡大表示：調整してください':'全体表示：星門を確認してください');
 }
 function buildUI(){
  panel=document.createElement('section');panel.id='gate-light-debug-panel';
  panel.setAttribute('aria-label','星門内光・実機調整');
  const rows=FIELDS.map(f=>'<div class="gld-field">'+
    '<div class="gld-fieldhead"><label for="gld-'+f.key+'">'+f.label+' / '+f.key+'</label><output data-value="'+f.key+'"></output></div>'+
    '<input id="gld-'+f.key+'" data-range="'+f.key+'" type="range" min="'+f.min+'" max="'+f.max+'" step="0.1" />'+
    '<div class="gld-nudges">'+[-1,-.5,.5,1].map(n=>'<button type="button" data-key="'+f.key+'" data-delta="'+n+'">'+(n>0?'+':'')+n+'</button>').join('')+'</div></div>').join('');
  panel.innerHTML='<header><strong>星門内光 DEBUG</strong><button type="button" data-action="hide">UIを隠す</button></header>'+
   '<p class="gld-sub">星門全体を見ながら数値調整。水色の枠をドラッグで移動、右下の丸で拡大・縮小できます。</p>'+
   '<div class="gld-toolbar"><button type="button" data-action="overview">全体</button><button type="button" data-action="close">拡大</button><button type="button" data-action="guides">枠線ON/OFF</button></div>'+
   rows+'<div class="gld-toolbar"><button type="button" data-action="reset">初期値</button><button type="button" data-action="save">端末保存</button><button type="button" data-action="load">読込</button><button type="button" data-action="copy">値をコピー</button></div>'+
   '<div class="gld-status" role="status" aria-live="polite"></div><textarea class="gld-export" readonly hidden aria-label="コピーできない場合はここから値を選択"></textarea>';
  reveal=document.createElement('button');reveal.id='gate-light-debug-reveal';reveal.type='button';reveal.hidden=true;reveal.textContent='調整UIを開く';
  document.body.append(panel,reveal);
  status=panel.querySelector('.gld-status');
  guide=document.createElement('div');guide.id='gate-light-debug-guides';
  rectGuide=document.createElement('div');rectGuide.className='gld-aperture';
  dragFrame=document.createElement('div');dragFrame.className='gld-drag';
  resizeGrip=document.createElement('div');resizeGrip.className='gld-resize';resizeGrip.setAttribute('aria-label','内光の幅と高さを調整');
  dragFrame.appendChild(resizeGrip);guide.append(rectGuide,dragFrame);document.body.appendChild(guide);
  function setHidden(hidden){panel.hidden=hidden;reveal.hidden=!hidden;updateGuide();}
  reveal.addEventListener('click',()=>setHidden(false));
  panel.addEventListener('pointerdown',e=>e.stopPropagation());
  panel.addEventListener('click',async e=>{
   const btn=e.target.closest('button');if(!btn)return;
   e.preventDefault();e.stopPropagation();
   if(btn.dataset.key){change(btn.dataset.key,values[btn.dataset.key]+Number(btn.dataset.delta));return;}
   const a=btn.dataset.action;
   if(a==='hide'){setHidden(true);return;}
   if(a==='overview'||a==='close'){await frameScene(a);return;}
   if(a==='guides'){guidesOn=!guidesOn;updateGuide();return;}
   if(a==='reset'){values={...baseline};apply();message('現在の基準値へ戻しました');return;}
   if(a==='save'){try{localStorage.setItem(STORAGE,JSON.stringify(values));message('この端末に保存しました（ゲーム本編には未反映）');}catch{message('端末保存に失敗しました');}return;}
   if(a==='load'){loadSaved();return;}
   if(a==='copy'){
    const data=copyValue(),area=panel.querySelector('.gld-export');
    area.hidden=false;area.value=data;
    try{if(!navigator.clipboard?.writeText)throw Error('clipboard unavailable');
      await navigator.clipboard.writeText(data);message('値をコピーしました。チャットに貼り付けてください');
    }catch{area.focus();area.select();message('コピー不可：下のテキストを長押ししてコピーしてください');}
   }
  });
  panel.addEventListener('input',e=>{const key=e.target.dataset.range;if(key)change(key,Number(e.target.value));});
  function startDrag(e,kind){
   if(!guidesOn||panel.hidden)return;
   e.preventDefault();e.stopPropagation();
   const parent=light.getBoundingClientRect();
   if(!parent.width||!parent.height)return;
   moved={id:e.pointerId,kind,x:e.clientX,y:e.clientY,values:{...values},pw:parent.width,ph:parent.height};
   const target=kind==='size'?resizeGrip:dragFrame;target.setPointerCapture?.(e.pointerId);
  }
  dragFrame.addEventListener('pointerdown',e=>startDrag(e,'move'));
  resizeGrip.addEventListener('pointerdown',e=>startDrag(e,'size'));
  const pointerMove=e=>{
   if(!moved||e.pointerId!==moved.id)return;
   e.preventDefault();e.stopPropagation();
   const dx=(e.clientX-moved.x)/moved.pw*100,dy=(e.clientY-moved.y)/moved.ph*100;
   if(moved.kind==='move'){
    values.left=round(clamp(moved.values.left+dx,-50,140));
    values.top=round(clamp(moved.values.top+dy,-50,150));
   }else{
    values.width=round(clamp(moved.values.width+dx,5,180));
    values.height=round(clamp(moved.values.height+dy,5,200));
   }
   apply();message('画面上で調整中（ゲーム本編には未反映）');
  };
  const end=e=>{if(moved&&e.pointerId===moved.id){moved=null;e.stopPropagation();}};
  for(const el of [dragFrame,resizeGrip]){
   el.addEventListener('pointermove',pointerMove,{passive:false});
   el.addEventListener('pointerup',end);el.addEventListener('pointercancel',end);
  }
  window.addEventListener('resize',()=>{if(sceneReady)frameScene(viewMode);});
 }
 function showError(error){
  if(!panel)buildUI();
  message('デバッグ起動失敗：'+(error?.message||String(error)));
 }
 function readyToStart(){
  return document.body.classList.contains('scene-ready')&&
   !!window.TarotStage3Scene?.getState?.().presentPrepared&&!!window.TarotCinematicCamera&&
   !!window.TarotSceneEffects&&light.dataset.worldX!==undefined&&frame.dataset.worldX!==undefined;
 }
 async function start(){
  if(started)return;
  started=true;
  try{
   window.TarotStage3Scene.lock('gate-inner-light-debug');
   window.TarotActorVisibility?.set('shion',0);
   window.TarotActorVisibility?.set('shiopon',0);
   window.TarotActorVisibility?.set('lumiere',0);
   baseline=calculateBaseline();values={...baseline};
   if(!light.hasAttribute('data-sga-normal-src'))light.setAttribute('data-sga-normal-src',img.getAttribute('src'));
   img.src=SOURCE;
   if(img.decode)try{await img.decode();}catch{}
   if(!img.naturalWidth)throw Error('gate-void.webp が読み込めません');
   // Reuse the same authored rest image, gate frame and animation-free CSS as the game.
   shell.classList.add('sga-anomaly-rest');
   buildUI();sceneReady=true;apply();
   await frameScene('overview');
   track();
  }catch(error){showError(error);}
 }
 // Wait for the actual loaded Garden; never start or modify a story event.
 let tries=0;
 function wait(){
  if(readyToStart()){start();return;}
  if(document.body.classList.contains('scene-load-error')){showError(Error('庭園のロードに失敗しました'));return;}
  if(++tries>=400){showError(Error('庭園の描画を待ってタイムアウトしました'));return;}
  setTimeout(wait,50);
 }
 wait();
})();
