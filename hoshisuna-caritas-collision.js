/* Starroad-only Caritas footprint exclusion; never changes shared navigation.js. */
(function(root,factory){
  const api=factory();
  if(typeof module==="object"&&module.exports)module.exports=api;
  else root.TarotHoshisunaCollision=api;
})(typeof window==="object"?window:this,function(){
  "use strict";
  // Includes clearance around the displayed 125x96 sprite.
  const BOUNDS=Object.freeze({left:934,right:1092,top:150,bottom:272});
  const EPS=0.5;
  const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
  const inside=(x,y)=>x>=BOUNDS.left&&x<=BOUNDS.right&&y>=BOUNDS.top&&y<=BOUNDS.bottom;
  // Rectangle clipping: blocks paths that cross the body even when both ends are outside.
  function crossesBody(a,b){
    if(!a||!b||![a.x,a.y,b.x,b.y].every(Number.isFinite))return true;
    if(inside(a.x,a.y)||inside(b.x,b.y))return true;
    const dx=b.x-a.x,dy=b.y-a.y;
    let low=0,high=1;
    for(const [p,q] of [
      [-dx,a.x-BOUNDS.left],[dx,BOUNDS.right-a.x],
      [-dy,a.y-BOUNDS.top],[dy,BOUNDS.bottom-a.y]
    ]){
      if(Math.abs(p)<1e-12){if(q<0)return false;continue;}
      const t=q/p;
      if(p<0)low=Math.max(low,t);
      else high=Math.min(high,t);
      if(low>high)return false;
    }
    return true;
  }
  function wrap(base){
    if(!base||typeof base.isWalkable!=="function"||typeof base.segmentClear!=="function"||
       typeof base.nearestWalkable!=="function")throw new TypeError("Missing shared collision");
    const isWalkable=(x,y)=>base.isWalkable(x,y)&&!inside(x,y);
    function nearestWalkable(p){
      const candidate=base.nearestWalkable(p);
      if(!candidate)return null;
      if(isWalkable(candidate.x,candidate.y))return candidate;
      const x=clamp(candidate.x,BOUNDS.left,BOUNDS.right);
      const y=clamp(candidate.y,BOUNDS.top,BOUNDS.bottom);
      // The four outward projections keep taps on Caritas outside its collision body.
      const options=[
        {x:BOUNDS.left-EPS,y},{x:BOUNDS.right+EPS,y},
        {x,y:BOUNDS.top-EPS},{x,y:BOUNDS.bottom+EPS}
      ].filter(q=>isWalkable(q.x,q.y));
      options.sort((a,b)=>Math.hypot(a.x-p.x,a.y-p.y)-Math.hypot(b.x-p.x,b.y-p.y));
      return options[0]||null;
    }
    return {
      ...base,isWalkable,nearestWalkable,
      segmentClear(a,b){return base.segmentClear(a,b)&&!crossesBody(a,b);}
    };
  }
  return {BOUNDS,inside,crossesBody,wrap};
});
