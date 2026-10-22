/* Scene DATA adapter only. Game movement, actors and camera remain in main game.js. */
(function(root){"use strict";
const layout=root.TarotSceneLayout, REF=layout?.referenceSize;
if(!layout||REF?.width!==1448||REF?.height!==1086)throw new Error("Hoshisuna shared scene layout missing");
layout.solidBases.splice(0);
layout.occluders.splice(0);
layout.activeOccluders=()=>[];
let purple=[];
layout.foregroundReady=fetch("./assets/events/hoshisuna/map/starroad-collision.json",{cache:"no-store"}).then(async r=>{
 if(!r.ok)throw new Error("Starroad depth data unavailable");
 const data=await r.json();
 if(data.referenceSize?.width!==1448||data.referenceSize?.height!==1086)throw new Error("Starroad depth dimensions mismatch");
 purple=(data.behindForegroundAreas||[]).filter(a=>a.type==="poly"&&a.points?.length>=3);
});
layout.paintBackground=function(ctx){ctx.clearRect(0,0,1448,1086);};
layout.paintForeground=function(ctx,image){
 ctx.clearRect(0,0,1448,1086);
 for(const area of purple){
  ctx.save();layout.trace(ctx,area.points);ctx.clip();ctx.drawImage(image,0,0,1448,1086);ctx.restore();
 }
};
})(window);
