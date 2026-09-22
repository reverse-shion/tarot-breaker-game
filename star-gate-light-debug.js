(()=>{"use strict";
const p=new URLSearchParams(location.search);if(p.get("gateLightDebug")!=="1")return;
function start(){
 const host=document.querySelector(".scene-gate-inner-light");
 const img=host?.querySelector("img");
 if(!host||!img)return;
 host.style.outline="3px solid red";host.style.outlineOffset="0";
 img.style.outline="3px solid #ffe600";img.style.outlineOffset="-3px";
 const box=document.createElement("pre");
 box.id="gate-light-debug";
 box.style.cssText="position:fixed;z-index:999999;left:6px;top:6px;max-width:calc(100vw - 12px);margin:0;padding:8px;background:rgba(0,0,0,.88);color:#fff;border:2px solid #00e5ff;border-radius:6px;font:11px/1.3 monospace;white-space:pre-wrap;pointer-events:none";
 document.body.appendChild(box);
 const read=()=>{
  const hr=host.getBoundingClientRect(),ir=img.getBoundingClientRect(),hs=getComputedStyle(host),is=getComputedStyle(img);
  box.textContent=[
   "GATE INNER LIGHT DEBUG",
   "RED=host / YELLOW=webp",
   "host rect: "+hr.width.toFixed(1)+" x "+hr.height.toFixed(1)+" @ "+hr.x.toFixed(1)+","+hr.y.toFixed(1),
   "img rect:  "+ir.width.toFixed(1)+" x "+ir.height.toFixed(1)+" @ "+ir.x.toFixed(1)+","+ir.y.toFixed(1),
   "natural: "+img.naturalWidth+" x "+img.naturalHeight,
   "data: x="+host.dataset.worldX+" y="+host.dataset.worldY+" w="+host.dataset.worldW+" h="+host.dataset.worldH,
   "host css: w="+hs.width+" h="+hs.height+" overflow="+hs.overflow+" clip="+hs.clipPath,
   "img css: w="+is.width+" h="+is.height,
   "img transform: "+is.transform,
   "src: "+img.getAttribute("src"),
   "shell: "+document.getElementById("game-shell")?.className
  ].join("\n");
 };
 read();setInterval(read,100);
 new MutationObserver(read).observe(host,{attributes:true,subtree:true,attributeFilter:["class","style","data-world-x","data-world-y","data-world-w","data-world-h"]});
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start,{once:true});else start();
})();