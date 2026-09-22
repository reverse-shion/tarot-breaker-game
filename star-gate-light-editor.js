(()=>{const p=new URLSearchParams(location.search);if(p.get("dev")!=="star-gate-light-editor")return;
const el=document.querySelector(".scene-gate-inner-light");if(!el)return;
let x=+(el.dataset.worldX||620),y=+(el.dataset.worldY||-163.3333333333),w=+(el.dataset.worldW||360),h=+(el.dataset.worldH||373.3333333333);
const panel=document.createElement("div");panel.style.cssText="position:fixed;z-index:99999;left:10px;top:10px;background:#080b18e8;color:white;padding:10px;border:1px solid #8fdcff;border-radius:8px;font:14px monospace;max-width:calc(100vw - 20px)";
panel.innerHTML='<b>STAR GATE LIGHT EDITOR</b><br><span id="sgle-v"></span><br><button id="sgle-copy">値をコピー</button><small style="display:block;margin-top:5px">光をドラッグ=移動 / 右下の□=サイズ変更</small>';
document.body.append(panel);
const handle=document.createElement("div");handle.style.cssText="position:absolute;right:-10px;bottom:-10px;width:24px;height:24px;background:#fff;border:3px solid #27c7ff;box-sizing:border-box;z-index:20;touch-action:none";el.append(handle);
el.style.outline="2px dashed #27c7ff";el.style.overflow="visible";el.style.touchAction="none";
const val=panel.querySelector("#sgle-v");
function apply(){el.dataset.worldX=x;el.dataset.worldY=y;el.dataset.worldW=w;el.dataset.worldH=h;el.style.left=x+"px";el.style.top=y+"px";el.style.width=w+"px";el.style.height=h+"px";val.textContent="x="+x.toFixed(1)+" y="+y.toFixed(1)+" w="+w.toFixed(1)+" h="+h.toFixed(1)}
apply();
let mode=null,sx=0,sy=0,ox=0,oy=0,ow=0,oh=0;
function start(e,m){mode=m;sx=e.clientX;sy=e.clientY;ox=x;oy=y;ow=w;oh=h;e.preventDefault();e.stopPropagation();el.setPointerCapture?.(e.pointerId)}
el.addEventListener("pointerdown",e=>{if(e.target===handle)return;start(e,"move")});handle.addEventListener("pointerdown",e=>start(e,"size"));
el.addEventListener("pointermove",e=>{if(!mode)return;const dx=e.clientX-sx,dy=e.clientY-sy;if(mode==="move"){x=ox+dx;y=oy+dy}else{w=Math.max(40,ow+dx);h=Math.max(40,oh+dy)}apply();e.preventDefault()});
el.addEventListener("pointerup",()=>mode=null);el.addEventListener("pointercancel",()=>mode=null);
panel.querySelector("#sgle-copy").onclick=()=>navigator.clipboard?.writeText('data-world-x="'+x.toFixed(1)+'" data-world-y="'+y.toFixed(1)+'" data-world-w="'+w.toFixed(1)+'" data-world-h="'+h.toFixed(1)+'"');
})();