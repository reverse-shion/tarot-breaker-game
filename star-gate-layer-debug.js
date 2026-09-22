(()=>{"use strict";
const p=new URLSearchParams(location.search);
if(p.get("gateLayerDebug")!=="1")return;
function start(){
 const inner=document.querySelector(".scene-gate-inner-light");
 if(!inner)return;
 inner.style.setProperty("display","none","important");
 const box=document.createElement("div");
 box.style.cssText="position:fixed;z-index:999999;left:8px;top:8px;padding:8px 10px;background:rgba(0,0,0,.86);color:#fff;border:2px solid #ff3b30;border-radius:6px;font:12px/1.35 monospace;pointer-events:none";
 box.textContent="LAYER TEST 1\ninner-light.webp = HIDDEN\n門の青い光が残るか確認";
 document.body.appendChild(box);
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start,{once:true});else start();
})();