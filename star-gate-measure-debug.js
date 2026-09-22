(()=>{"use strict";
const p=new URLSearchParams(location.search);if(p.get("gateMeasure")!=="1")return;
function start(){
 const gate=document.querySelector(".scene-star-gate");
 const light=document.querySelector(".scene-gate-inner-light");
 const img=light?.querySelector("img");
 if(!gate||!light||!img)return;
 gate.style.setProperty("outline","3px solid #00ff66","important");
 light.style.setProperty("outline","3px solid #ff3b30","important");
 img.style.setProperty("outline","3px solid #ffe600","important");
 const box=document.createElement("pre");
 box.style.cssText="position:fixed;z-index:999999;left:6px;top:6px;max-width:calc(100vw - 12px);margin:0;padding:8px;background:rgba(0,0,0,.88);color:#fff;border:2px solid #00e5ff;border-radius:6px;font:10.5px/1.3 monospace;white-space:pre-wrap;pointer-events:none";
 document.body.appendChild(box);
 const fmt=(r)=>r.x.toFixed(1)+","+r.y.toFixed(1)+" "+r.width.toFixed(1)+"x"+r.height.toFixed(1)+" B="+r.bottom.toFixed(1);
 const read=()=>{
   const gr=gate.getBoundingClientRect(),lr=light.getBoundingClientRect(),ir=img.getBoundingClientRect();
   box.textContent=[
    "GATE MEASURE 2",
    "GREEN=gate / RED=light host / YELLOW=webp",
    "gate : "+fmt(gr),
    "light: "+fmt(lr),
    "img  : "+fmt(ir),
    "world gate : x="+gate.dataset.worldX+" y="+gate.dataset.worldY+" w="+gate.dataset.worldW+" h="+gate.dataset.worldH,
    "world light: x="+light.dataset.worldX+" y="+light.dataset.worldY+" w="+light.dataset.worldW+" h="+light.dataset.worldH,
    "top delta(light-gate): "+(lr.top-gr.top).toFixed(1),
    "bottom delta(light-gate): "+(lr.bottom-gr.bottom).toFixed(1),
    "natural: "+img.naturalWidth+"x"+img.naturalHeight,
    "shell: "+document.getElementById("game-shell")?.className
   ].join("\n");
 };
 read();setInterval(read,100);
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start,{once:true});else start();
})();