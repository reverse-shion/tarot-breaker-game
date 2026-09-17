(()=>{
  "use strict";

  const params=new URLSearchParams(location.search);
  if(params.get("fountainEditor")!=="1")return;

  const STORAGE_KEY="tarot-breaker:fountain-position-v2";
  const DEFAULT={x:-11,y:12,scale:1.16};
  const ANCHOR={x:800,y:510.5};
  const SCALE_MIN=0.5;
  const SCALE_MAX=1.8;
  const PARTS=[
    [".scene-fountain-base",625,388,350,245],
    [".scene-fountain-water",650,409,300,176],
    [".scene-fountain-crystal",708,333,184,230],
    [".scene-fountain-glow",650,318,300,250],
    [".scene-fountain-sparkle",640,358,320,220],
  ];

  function finite(value,fallback){if(value===null||value===""||typeof value==="undefined")return fallback;const n=Number(value);return Number.isFinite(n)?n:fallback}
  function clamp(value,min,max){return Math.max(min,Math.min(max,value))}
  function signed(value){const n=Math.round(value);return `${n>=0?"+":""}${n}`}
  function percent(value){return `${Math.round(value*1000)/10}%`}

  let saved={};
  try{saved=JSON.parse(localStorage.getItem(STORAGE_KEY)||"{}")||{}}catch(_){saved={}}

  let state={
    x:Math.round(finite(params.get("fountainX"),finite(saved.x,DEFAULT.x))),
    y:Math.round(finite(params.get("fountainY"),finite(saved.y,DEFAULT.y))),
    scale:clamp(finite(params.get("fountainScale"),finite(saved.scale,DEFAULT.scale)),SCALE_MIN,SCALE_MAX),
  };
  state.scale=Math.round(state.scale*1000)/1000;
  let step=1;

  const style=document.createElement("style");
  style.textContent=`
    #fountain-editor-panel{position:fixed;left:10px;bottom:calc(10px + env(safe-area-inset-bottom));z-index:100002;width:min(360px,calc(100vw - 20px));box-sizing:border-box;padding:10px 11px 11px;border:1px solid rgba(220,238,255,.55);border-radius:16px;background:rgba(15,20,42,.9);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);color:#fff;font:600 13px/1.3 system-ui,-apple-system,sans-serif;box-shadow:0 8px 30px rgba(0,0,0,.35);touch-action:manipulation}
    #fountain-editor-panel .fe-head{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:8px}
    #fountain-editor-panel .fe-title{font-size:14px;letter-spacing:.02em}
    #fountain-editor-panel .fe-value{font-variant-numeric:tabular-nums;color:#cfeaff;background:rgba(255,255,255,.08);padding:4px 8px;border-radius:9px}
    #fountain-editor-panel .fe-row{display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-top:7px}
    #fountain-editor-panel .fe-label{min-width:42px;color:#c8d1e2;font-size:12px}
    #fountain-editor-panel button{appearance:none;border:1px solid rgba(255,255,255,.28);background:rgba(255,255,255,.1);color:#fff;border-radius:10px;min-height:38px;padding:7px 10px;font:700 13px/1 system-ui,-apple-system,sans-serif}
    #fountain-editor-panel button:active{background:rgba(160,215,255,.25)}
    #fountain-editor-panel button[data-active="1"]{background:rgba(110,196,255,.28);border-color:#9edcff}
    #fountain-editor-panel .fe-arrows{display:grid;grid-template-columns:repeat(3,44px);grid-template-rows:repeat(2,38px);gap:5px}
    #fountain-editor-panel .fe-arrows button{padding:0;font-size:18px}
    #fountain-editor-panel .fe-up{grid-column:2}.fe-left{grid-column:1;grid-row:2}.fe-down{grid-column:2;grid-row:2}.fe-right{grid-column:3;grid-row:2}
    #fountain-editor-panel .fe-scale-value{min-width:62px;text-align:center;font-variant-numeric:tabular-nums;color:#dff7ff}
    #fountain-editor-panel .fe-note{margin-top:7px;color:#c8d1e2;font-weight:500;font-size:11px}
    #fountain-editor-hitbox{position:fixed;z-index:100001;border:2px dashed #8de0ff;border-radius:14px;background:rgba(85,205,255,.07);box-sizing:border-box;touch-action:none;cursor:grab;pointer-events:auto}
    #fountain-editor-hitbox:active{cursor:grabbing;background:rgba(85,205,255,.14)}
    #fountain-editor-hitbox::before{content:"噴水をドラッグ";position:absolute;left:50%;top:-27px;transform:translateX(-50%);white-space:nowrap;background:rgba(13,24,45,.9);border:1px solid rgba(141,224,255,.8);border-radius:8px;color:#dff7ff;padding:4px 7px;font:700 11px/1 system-ui,-apple-system,sans-serif}
    #fountain-editor-resize{position:absolute;right:-12px;bottom:-12px;width:28px;height:28px;border-radius:50%;border:2px solid #dff7ff;background:#2c9ed0;box-shadow:0 3px 12px rgba(0,0,0,.35);touch-action:none;cursor:nwse-resize}
    #fountain-editor-resize::before,#fountain-editor-resize::after{content:"";position:absolute;background:#fff;border-radius:2px;left:7px;right:7px;height:2px;transform:rotate(-45deg);transform-origin:center}
    #fountain-editor-resize::before{bottom:8px}#fountain-editor-resize::after{bottom:13px}
  `;
  document.head.appendChild(style);

  const panel=document.createElement("section");
  panel.id="fountain-editor-panel";
  panel.innerHTML=`
    <div class="fe-head"><div class="fe-title">噴水位置・サイズ調整</div><output class="fe-value">X -11 / Y +12</output></div>
    <div class="fe-row">
      <div class="fe-arrows">
        <button type="button" class="fe-up" data-dx="0" data-dy="-1">↑</button>
        <button type="button" class="fe-left" data-dx="-1" data-dy="0">←</button>
        <button type="button" class="fe-down" data-dx="0" data-dy="1">↓</button>
        <button type="button" class="fe-right" data-dx="1" data-dy="0">→</button>
      </div>
      <div>
        <div class="fe-row" style="margin-top:0"><button type="button" data-step="1" data-active="1">1px</button><button type="button" data-step="5">5px</button><button type="button" data-step="10">10px</button></div>
        <div class="fe-row"><span class="fe-label">サイズ</span><button type="button" data-scale="-0.05">−5%</button><button type="button" data-scale="-0.01">−1%</button><output class="fe-scale-value">116%</output><button type="button" data-scale="0.01">+1%</button><button type="button" data-scale="0.05">+5%</button></div>
        <div class="fe-row"><button type="button" data-action="save">保存</button><button type="button" data-action="copy">値をコピー</button><button type="button" data-action="reset">正式位置に戻す</button></div>
      </div>
    </div>
    <div class="fe-note">枠をドラッグ＝移動。右下の丸ハンドルをドラッグ＝拡大縮小。正式基準は X -11 / Y +12 / 116% です。</div>
  `;
  document.body.appendChild(panel);

  const valueOut=panel.querySelector(".fe-value");
  const scaleOut=panel.querySelector(".fe-scale-value");
  const hitbox=document.createElement("div");
  hitbox.id="fountain-editor-hitbox";
  const resizeHandle=document.createElement("div");
  resizeHandle.id="fountain-editor-resize";
  hitbox.appendChild(resizeHandle);
  document.body.appendChild(hitbox);

  function updateUrl(){
    const url=new URL(location.href);
    url.searchParams.set("fountainEditor","1");
    url.searchParams.set("fountainX",String(state.x));
    url.searchParams.set("fountainY",String(state.y));
    url.searchParams.set("fountainScale",state.scale.toFixed(3).replace(/0+$/,"").replace(/\.$/,""));
    history.replaceState(null,"",url);
  }

  function apply(){
    const s=state.scale;
    for(const [selector,x,y,w,h] of PARTS){
      const node=document.querySelector(selector);if(!node)continue;
      const scaledX=ANCHOR.x+state.x+(x-ANCHOR.x)*s;
      const scaledY=ANCHOR.y+state.y+(y-ANCHOR.y)*s;
      node.dataset.worldX=String(scaledX);
      node.dataset.worldY=String(scaledY);
      node.dataset.worldW=String(w*s);
      node.dataset.worldH=String(h*s);
      node.dataset.positionRevision="fountain-editor-v3";
    }
    valueOut.textContent=`X ${signed(state.x)} / Y ${signed(state.y)}`;
    scaleOut.textContent=percent(state.scale);
    updateUrl();
    window.TarotSceneEffects?.refreshCamera?.();
  }

  function move(dx,dy){state.x=Math.round(state.x+dx);state.y=Math.round(state.y+dy);apply()}
  function setScale(next){state.scale=Math.round(clamp(next,SCALE_MIN,SCALE_MAX)*1000)/1000;apply()}

  panel.addEventListener("pointerdown",e=>e.stopPropagation());
  panel.addEventListener("click",async e=>{
    const button=e.target.closest("button");if(!button)return;
    if(button.dataset.step){step=Number(button.dataset.step)||1;panel.querySelectorAll("[data-step]").forEach(b=>b.dataset.active=b===button?"1":"0");return}
    if(button.dataset.scale){setScale(state.scale+(Number(button.dataset.scale)||0));return}
    if(button.dataset.dx||button.dataset.dy){move((Number(button.dataset.dx)||0)*step,(Number(button.dataset.dy)||0)*step);return}
    const action=button.dataset.action;
    if(action==="reset"){state={...DEFAULT};apply();return}
    if(action==="save"){
      localStorage.setItem(STORAGE_KEY,JSON.stringify(state));
      const old=button.textContent;button.textContent="保存済み";setTimeout(()=>button.textContent=old,900);return;
    }
    if(action==="copy"){
      const text=`FOUNTAIN_OFFSET_X = ${state.x}; FOUNTAIN_OFFSET_Y = ${state.y}; FOUNTAIN_SCALE = ${state.scale};`;
      try{await navigator.clipboard.writeText(text);const old=button.textContent;button.textContent="コピー済み";setTimeout(()=>button.textContent=old,900)}catch(_){prompt("この値をコピーしてください",text)}
    }
  });

  let drag=null;
  hitbox.addEventListener("pointerdown",e=>{
    if(e.target===resizeHandle)return;
    e.preventDefault();e.stopPropagation();
    const rect=document.querySelector(".scene-fountain-base")?.getBoundingClientRect();
    if(!rect||rect.width<2||rect.height<2)return;
    drag={type:"move",id:e.pointerId,startX:e.clientX,startY:e.clientY,startState:{...state},worldPerPxX:(350*state.scale)/rect.width,worldPerPxY:(245*state.scale)/rect.height};
    hitbox.setPointerCapture?.(e.pointerId);
  },{passive:false});
  hitbox.addEventListener("pointermove",e=>{
    if(!drag||drag.type!=="move"||e.pointerId!==drag.id)return;e.preventDefault();e.stopPropagation();
    state.x=Math.round(drag.startState.x+(e.clientX-drag.startX)*drag.worldPerPxX);
    state.y=Math.round(drag.startState.y+(e.clientY-drag.startY)*drag.worldPerPxY);
    apply();
  },{passive:false});

  resizeHandle.addEventListener("pointerdown",e=>{
    e.preventDefault();e.stopPropagation();
    const rect=document.querySelector(".scene-fountain-base")?.getBoundingClientRect();
    if(!rect||rect.width<2||rect.height<2)return;
    drag={type:"scale",id:e.pointerId,startX:e.clientX,startY:e.clientY,startScale:state.scale,startW:rect.width,startH:rect.height};
    resizeHandle.setPointerCapture?.(e.pointerId);
  },{passive:false});
  resizeHandle.addEventListener("pointermove",e=>{
    if(!drag||drag.type!=="scale"||e.pointerId!==drag.id)return;e.preventDefault();e.stopPropagation();
    const rx=(e.clientX-drag.startX)/Math.max(40,drag.startW);
    const ry=(e.clientY-drag.startY)/Math.max(40,drag.startH);
    const factor=1+(rx+ry)/2;
    setScale(drag.startScale*factor);
  },{passive:false});

  function endDrag(e){
    if(!drag||e.pointerId!==drag.id)return;e.preventDefault();e.stopPropagation();
    const target=drag.type==="scale"?resizeHandle:hitbox;
    drag=null;
    if(target.hasPointerCapture?.(e.pointerId))target.releasePointerCapture(e.pointerId);
  }
  for(const type of ["pointerup","pointercancel"]){hitbox.addEventListener(type,endDrag,{passive:false});resizeHandle.addEventListener(type,endDrag,{passive:false})}

  function trackHitbox(){
    const base=document.querySelector(".scene-fountain-base");
    const rect=base?.getBoundingClientRect();
    if(rect&&rect.width>4&&rect.height>4){
      hitbox.hidden=false;
      hitbox.style.left=`${rect.left}px`;hitbox.style.top=`${rect.top}px`;hitbox.style.width=`${rect.width}px`;hitbox.style.height=`${rect.height}px`;
    }else hitbox.hidden=true;
    requestAnimationFrame(trackHitbox);
  }

  function waitForScene(){
    if(window.TarotSceneEffects?.refreshCamera){apply();trackHitbox();return}
    setTimeout(waitForScene,50);
  }

  function autoStart(){
    const start=document.getElementById("start");
    if(!start)return;
    if(!start.disabled){start.click();return}
    setTimeout(autoStart,100);
  }

  window.TarotFountainEditor=Object.freeze({getState:()=>({...state}),apply:()=>apply()});
  waitForScene();
  autoStart();
})();