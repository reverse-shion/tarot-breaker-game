(() => {"use strict";
const GATE_BOUNDS=Object.freeze({left:520,top:-163.33333333333331,right:1080,bottom:210});
let running=false;
async function run(){
 if(running)return; running=true;
 try{
  window.dispatchEvent(new Event("tarot-breaker:interaction-start"));
  const camera=window.TarotCinematicCamera;
  if(!camera)throw new Error("Cinematic camera unavailable");
  const result=await camera.frameBounds(GATE_BOUNDS,1550,{padding:14,minZoom:.48});
  if(!result?.completed)throw new Error("Star Gate camera framing interrupted");
  window.dispatchEvent(new CustomEvent("tarot-breaker:star-gate-camera-framed",{detail:Object.freeze({segment:"star-gate-camera"})}));
 }catch(e){console.error("[Star Gate Camera Checkpoint]",e);window.dispatchEvent(new Event("tarot-breaker:interaction-end"));running=false;}
}
window.addEventListener("tarot-breaker:star-gate-investigate",run);
window.TarotStarGateCameraCheckpoint=Object.freeze({start:run,getState:()=>({running})});
})();
