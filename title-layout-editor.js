(() => {
  "use strict";
  const params=new URLSearchParams(location.search);
  if(params.get("titleEditor")!=="1") return;
  const targets={
    continueFrame:{label:"つづきから：枠",el:()=>document.querySelector("#continue .title-screen__frame")},
    continueText:{label:"つづきから：文字",el:()=>document.querySelector("#continue .title-screen__choice-copy")},
    newFrame:{label:"はじめから：枠",el:()=>document.querySelector("#start .title-screen__frame")},
    newText:{label:"はじめから：文字",el:()=>document.querySelector("#start .title-screen__choice-copy")}
  };
  const state={};
  for(const k of Object.keys(targets)) state[k]={x:0,y:0,scale:1};
  let active="continueFrame";
  const css=document.createElement("style");
  css.textContent=`
  .tb-title-editor{position:fixed;z-index:99999;left:8px;right:auto;top:max(8px,env(safe-area-inset-top));bottom:auto;width:min(330px,46vw);background:rgba(3,7,18,.90);color:#fff;border:1px solid #7f93ad;border-radius:10px;padding:8px;font:12px/1.2 system-ui,sans-serif;max-height:45vh;overflow:auto}
  .tb-title-editor select,.tb-title-editor button,.tb-title-editor input{font:inherit}
  .tb-title-editor__row{display:flex;gap:6px;align-items:center;margin:6px 0;flex-wrap:wrap}
  .tb-title-editor button{min-width:42px;min-height:34px;border:1px solid #71839d;border-radius:7px;background:#101a2d;color:#fff}
  .tb-title-editor input[type=range]{flex:1;min-width:120px}
  .tb-title-editor output{min-width:52px;text-align:right}
  .tb-title-editor textarea{width:100%;height:58px;font:11px/1.3 ui-monospace,monospace}
  `;
  document.head.appendChild(css);
  const panel=document.createElement("div"); panel.className="tb-title-editor";
  panel.innerHTML=`
   <div class="tb-title-editor__row"><strong>Title Layout Editor</strong><select id="tbe-target"></select><button id="tbe-reset">Reset</button><button id="tbe-move">右へ</button></div>
   <div class="tb-title-editor__row"><span>X</span><button data-nudge="x:-1">−1</button><button data-nudge="x:1">+1</button><input id="tbe-x" type="range" min="-120" max="120" step="1"><output id="tbe-xo"></output></div>
   <div class="tb-title-editor__row"><span>Y</span><button data-nudge="y:-1">−1</button><button data-nudge="y:1">+1</button><input id="tbe-y" type="range" min="-120" max="120" step="1"><output id="tbe-yo"></output></div>
   <div class="tb-title-editor__row"><span>Size</span><button data-nudge="scale:-0.01">−</button><button data-nudge="scale:0.01">+</button><input id="tbe-s" type="range" min="0.65" max="1.35" step="0.01"><output id="tbe-so"></output></div>
   <textarea id="tbe-output" readonly aria-label="調整値"></textarea>
   <div class="tb-title-editor__row"><button id="tbe-copy">調整値をコピー</button><button id="tbe-hide">エディタを隠す</button></div>`;
  document.body.appendChild(panel);
  const sel=panel.querySelector("#tbe-target");
  Object.entries(targets).forEach(([k,v])=>{const o=document.createElement("option");o.value=k;o.textContent=v.label;sel.appendChild(o)});
  const x=panel.querySelector("#tbe-x"),y=panel.querySelector("#tbe-y"),s=panel.querySelector("#tbe-s");
  const xo=panel.querySelector("#tbe-xo"),yo=panel.querySelector("#tbe-yo"),so=panel.querySelector("#tbe-so"),out=panel.querySelector("#tbe-output");
  function apply(k){
    const el=targets[k].el(); if(!el)return;
    const v=state[k]; el.style.transform=`translate(${v.x}px,${v.y}px) scale(${v.scale})`;
    el.style.transformOrigin="center center";
  }
  function sync(){
    const v=state[active]; x.value=v.x;y.value=v.y;s.value=v.scale;xo.value=v.x+"px";yo.value=v.y+"px";so.value=Math.round(v.scale*100)+"%";
    out.value=Object.entries(state).map(([k,v])=>`${k}: x=${v.x}px y=${v.y}px scale=${v.scale.toFixed(2)}`).join("\n");
  }
  function change(prop,val){state[active][prop]=val;apply(active);sync()}
  sel.onchange=()=>{active=sel.value;sync()};
  x.oninput=()=>change("x",Number(x.value)); y.oninput=()=>change("y",Number(y.value)); s.oninput=()=>change("scale",Number(s.value));
  panel.querySelectorAll("[data-nudge]").forEach(b=>b.onclick=()=>{const [p,d]=b.dataset.nudge.split(":");change(p,+(state[active][p]+Number(d)).toFixed(2))});
  panel.querySelector("#tbe-reset").onclick=()=>{state[active]={x:0,y:0,scale:1};apply(active);sync()};
  panel.querySelector("#tbe-copy").onclick=async()=>{try{await navigator.clipboard.writeText(out.value);panel.querySelector("#tbe-copy").textContent="コピー済み"}catch(e){out.select()}};
  let dock="left"; panel.querySelector("#tbe-move").onclick=()=>{dock=dock==="left"?"right":"left";panel.style.left=dock==="left"?"8px":"auto";panel.style.right=dock==="right"?"8px":"auto";panel.querySelector("#tbe-move").textContent=dock==="left"?"右へ":"左へ"};
  panel.querySelector("#tbe-hide").onclick=()=>panel.remove();
  sync();
})();