(()=>{
  "use strict";

  const params=new URLSearchParams(location.search);
  if(params.get("waterfallEditor")!=="1")return;

  const STORAGE_KEY="tarot-breaker:waterfall-position-v3";
  const DEFAULT={x:5,y:43};
  const REF={w:1448,h:1086};
  const EDIT_RECT={x:250,y:40,w:950,h:700};

  function finite(value,fallback){
    if(value===null||value===""||typeof value==="undefined")return fallback;
    const n=Number(value);return Number.isFinite(n)?n:fallback;
  }
  function signed(value){const n=Math.round(value);return `${n>=0?"+":""}${n}`}

  let saved={};
  try{saved=JSON.parse(localStorage.getItem(STORAGE_KEY)||"{}")||{}}catch(_){saved={}}
  let state={
    x:Math.round(finite(params.get("waterfallX"),finite(saved.x,DEFAULT.x))),
    y:Math.round(finite(params.get("waterfallY"),finite(saved.y,DEFAULT.y))),
  };
  let step=1;

  const style=document.createElement("style");
  style.textContent=`
    #waterfall-editor-panel{position:fixed;left:10px;bottom:calc(10px + env(safe-area-inset-bottom));z-index:100012;width:min(350px,calc(100vw - 20px));box-sizing:border-box;padding:10px 11px 11px;border:1px solid rgba(220,238,255,.55);border-radius:16px;background:rgba(15,20,42,.9);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);color:#fff;font:600 13px/1.3 system-ui,-apple-system,sans-serif;box-shadow:0 8px 30px rgba(0,0,0,.35);touch-action:manipulation}
    #waterfall-editor-panel .we-head{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:8px}
    #waterfall-editor-panel .we-title{font-size:14px;letter-spacing:.02em}
    #waterfall-editor-panel .we-value{font-variant-numeric:tabular-nums;color:#cfeaff;background:rgba(255,255,255,.08);padding:4px 8px;border-radius:9px}
    #waterfall-editor-panel .we-row{display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-top:7px}
    #waterfall-editor-panel button{appearance:none;border:1px solid rgba(255,255,255,.28);background:rgba(255,255,255,.1);color:#fff;border-radius:10px;min-height:38px;padding:7px 10px;font:700 13px/1 system-ui,-apple-system,sans-serif}
    #waterfall-editor-panel button:active{background:rgba(160,215,255,.25)}
    #waterfall-editor-panel button[data-active="1"]{background:rgba(110,196,255,.28);border-color:#9edcff}
    #waterfall-editor-panel .we-arrows{display:grid;grid-template-columns:repeat(3,44px);grid-template-rows:repeat(2,38px);gap:5px}
    #waterfall-editor-panel .we-arrows button{padding:0;font-size:18px}
    #waterfall-editor-panel .we-up{grid-column:2}.we-left{grid-column:1;grid-row:2}.we-down{grid-column:2;grid-row:2}.we-right{grid-column:3;grid-row:2}
    #waterfall-editor-panel .we-note{margin-top:7px;color:#c8d1e2;font-weight:500;font-size:11px}
    #waterfall-editor-hitbox{position:fixed;z-index:100010;border:2px dashed rgba(141,224,255,.78);border-radius:14px;background:rgba(85,205,255,.035);box-sizing:border-box;pointer-events:none}
    #waterfall-editor-hitbox::before{content:"滝の調整範囲（操作は透過）";position:absolute;left:10px;top:8px;white-space:nowrap;background:rgba(13,24,45,.78);border:1px solid rgba(141,224,255,.5);border-radius:8px;color:#dff7ff;padding:4px 7px;font:700 10px/1 system-ui,-apple-system,sans-serif}
    #waterfall-editor-handle{position:fixed;z-index:100011;min-width:98px;height:38px;padding:0 12px;border:1px solid #a8eaff;border-radius:12px;background:rgba(29,123,170,.94);color:white;box-shadow:0 5px 16px rgba(0,0,0,.32);font:700 12px/1 system-ui,-apple-system,sans-serif;touch-action:none;cursor:grab;pointer-events:auto}
    #waterfall-editor-handle:active{cursor:grabbing;background:rgba(39,148,197,.98)}
  `;
  document.head.appendChild(style);

  const panel=document.createElement("section");
  panel.id="waterfall-editor-panel";
  panel.innerHTML=`
    <div class="we-head"><div class="we-title">滝位置調整</div><output class="we-value">X +5 / Y +43</output></div>
    <div class="we-row">
      <div class="we-arrows">
        <button type="button" class="we-up" data-dx="0" data-dy="-1">↑</button>
        <button type="button" class="we-left" data-dx="-1" data-dy="0">←</button>
        <button type="button" class="we-down" data-dx="0" data-dy="1">↓</button>
        <button type="button" class="we-right" data-dx="1" data-dy="0">→</button>
      </div>
      <div>
        <div class="we-row" style="margin-top:0"><button type="button" data-step="1" data-active="1">1px</button><button type="button" data-step="5">5px</button><button type="button" data-step="10">10px</button></div>
        <div class="we-row"><button type="button" data-action="save">保存</button><button type="button" data-action="copy">値をコピー</button><button type="button" data-action="reset">正式位置に戻す</button></div>
      </div>
    </div>
    <div class="we-note">水色の範囲はタップ操作を遮りません。正式基準は X +5 / Y +43 です。滝は「滝を動かす」をドラッグするか矢印で調整できます。</div>
  `;
  document.body.appendChild(panel);
  const valueOut=panel.querySelector(".we-value");

  const hitbox=document.createElement("div");
  hitbox.id="waterfall-editor-hitbox";
  document.body.appendChild(hitbox);

  const handle=document.createElement("button");
  handle.id="waterfall-editor-handle";
  handle.type="button";
  handle.textContent="滝を動かす";
  handle.setAttribute("aria-label","滝をドラッグして位置調整");
  document.body.appendChild(handle);

  function updateUrl(){
    const url=new URL(location.href);
    url.searchParams.set("waterfallEditor","1");
    url.searchParams.set("waterfallX",String(state.x));
    url.searchParams.set("waterfallY",String(state.y));
    history.replaceState(null,"",url);
  }

  function apply(){
    document.querySelectorAll(".scene-waterfall").forEach(layer=>{
      layer.style.left=`${state.x}px`;
      layer.style.top=`${state.y}px`;
      layer.dataset.positionRevision="waterfall-editor-v3";
    });
    valueOut.textContent=`X ${signed(state.x)} / Y ${signed(state.y)}`;
    updateUrl();
    window.TarotSceneEffects?.refreshCamera?.();
  }
  function move(dx,dy){state.x=Math.round(state.x+dx);state.y=Math.round(state.y+dy);apply()}

  panel.addEventListener("pointerdown",e=>e.stopPropagation());
  panel.addEventListener("click",async e=>{
    const button=e.target.closest("button");if(!button)return;
    if(button.dataset.step){step=Number(button.dataset.step)||1;panel.querySelectorAll("[data-step]").forEach(b=>b.dataset.active=b===button?"1":"0");return}
    if(button.dataset.dx||button.dataset.dy){move((Number(button.dataset.dx)||0)*step,(Number(button.dataset.dy)||0)*step);return}
    const action=button.dataset.action;
    if(action==="reset"){state={...DEFAULT};apply();return}
    if(action==="save"){
      localStorage.setItem(STORAGE_KEY,JSON.stringify(state));
      const old=button.textContent;button.textContent="保存済み";setTimeout(()=>button.textContent=old,900);return;
    }
    if(action==="copy"){
      const text=`WATERFALL_OFFSET_X = ${state.x}; WATERFALL_OFFSET_Y = ${state.y};`;
      try{await navigator.clipboard.writeText(text);const old=button.textContent;button.textContent="コピー済み";setTimeout(()=>button.textContent=old,900)}catch(_){prompt("この値をコピーしてください",text)}
    }
  });

  let drag=null;
  handle.addEventListener("pointerdown",e=>{
    e.preventDefault();e.stopPropagation();
    const layer=document.querySelector(".scene-waterfall");
    const rect=layer?.getBoundingClientRect();
    if(!rect||rect.width<2||rect.height<2)return;
    drag={id:e.pointerId,startX:e.clientX,startY:e.clientY,startState:{...state},worldPerPxX:REF.w/rect.width,worldPerPxY:REF.h/rect.height};
    handle.setPointerCapture?.(e.pointerId);
  },{passive:false});
  handle.addEventListener("pointermove",e=>{
    if(!drag||e.pointerId!==drag.id)return;
    e.preventDefault();e.stopPropagation();
    state.x=Math.round(drag.startState.x+(e.clientX-drag.startX)*drag.worldPerPxX);
    state.y=Math.round(drag.startState.y+(e.clientY-drag.startY)*drag.worldPerPxY);
    apply();
  },{passive:false});
  function endDrag(e){
    if(!drag||e.pointerId!==drag.id)return;
    e.preventDefault();e.stopPropagation();
    drag=null;
    if(handle.hasPointerCapture?.(e.pointerId))handle.releasePointerCapture(e.pointerId);
  }
  handle.addEventListener("pointerup",endDrag,{passive:false});
  handle.addEventListener("pointercancel",endDrag,{passive:false});

  function trackOverlay(){
    const layer=document.querySelector(".scene-waterfall");
    const rect=layer?.getBoundingClientRect();
    if(rect&&rect.width>4&&rect.height>4){
      const left=rect.left+(EDIT_RECT.x/REF.w)*rect.width;
      const top=rect.top+(EDIT_RECT.y/REF.h)*rect.height;
      const width=(EDIT_RECT.w/REF.w)*rect.width;
      const height=(EDIT_RECT.h/REF.h)*rect.height;
      hitbox.hidden=false;
      hitbox.style.left=`${left}px`;
      hitbox.style.top=`${top}px`;
      hitbox.style.width=`${width}px`;
      hitbox.style.height=`${height}px`;

      const handleW=112;
      const handleH=38;
      const hx=Math.max(8,Math.min(window.innerWidth-handleW-8,left+width-handleW-8));
      const hy=Math.max(8,Math.min(window.innerHeight-handleH-8,top+8));
      handle.hidden=false;
      handle.style.left=`${hx}px`;
      handle.style.top=`${hy}px`;
    }else{
      hitbox.hidden=true;
      handle.hidden=true;
    }
    requestAnimationFrame(trackOverlay);
  }

  function waitForScene(){
    if(document.querySelector(".scene-waterfall")&&window.TarotSceneEffects){apply();trackOverlay();return}
    setTimeout(waitForScene,50);
  }
  function autoStart(){
    const start=document.getElementById("start");if(!start)return;
    if(!start.disabled){start.click();return}
    setTimeout(autoStart,100);
  }

  window.TarotWaterfallEditor=Object.freeze({getState:()=>({...state}),apply:()=>apply()});
  waitForScene();
  autoStart();
})();