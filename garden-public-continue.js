/* Production Garden Continue adapter. Import has no browser/storage/navigation effects. */
(function(root,factory){
  const common=typeof module==="object"&&module.exports;
  const api=factory(
    common?require("./progress.js"):root.TarotProgressCore,
    common?require("./progress-resume.js"):root.TarotProgressResume,
    common?require("./public-continue.js"):root.TarotPublicContinue,
    common?require("./garden-resume.js"):root.TarotGardenResume
  );
  if(common) module.exports=api; else root.TarotGardenPublicContinue=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(core,resume,publicContinue,gardenResume){
  "use strict";
  const MAP_ID="star_gate_garden";
  const SPAWN_ID="south_gate";
  const JOURNEY_KEY="tarot-breaker:map-journey-v1";
  const copy=value=>JSON.parse(JSON.stringify(value));

  function receive({search,storage,diagnostic}={}){
    if(!publicContinue?.validateEntry?.(search||""))
      return Object.freeze({ok:false,reason:"invalid-public-entry"});
    const progress=core.createProgress({storage,diagnostic});
    const resolved=resume.resolveContinue(progress.load());
    if(!resolved.ok) return resolved;
    if(resolved.context.mapId!==MAP_ID||resolved.context.spawnId!==SPAWN_ID)
      return Object.freeze({ok:false,reason:"not-garden"});
    const projected=gardenResume.projectResolved(resolved);
    if(!projected.ok) return projected;
    return Object.freeze({...projected,progress,definition:Object.freeze({id:"public-continue-garden"})});
  }

  function sameContext(a,b){
    return !!a&&!!b&&a.mapId===b.mapId&&a.spawnId===b.spawnId&&a.companion===b.companion&&
      JSON.stringify(a.completedEvents)===JSON.stringify(b.completedEvents);
  }

  function revalidate(session,options={}){
    if(!session?.ok) return Object.freeze({ok:false,reason:"missing-public-session"});
    const fresh=receive(options);
    if(!fresh.ok) return fresh;
    if(!sameContext(session.context,fresh.context))
      return Object.freeze({ok:false,reason:"stale-save"});
    return fresh;
  }

  function projectJourney(session,{journey,storage}={}){
    if(!session?.ok||!journey||typeof journey.set!=="function"||!storage||typeof storage.getItem!=="function")
      return Object.freeze({ok:false,reason:"journey-unavailable"});
    try{
      const p=session.projection;
      journey.set("landingMemoryDone",p.landingMemoryDone===true);
      journey.set("gardenStory",copy(p.gardenStory));
      journey.set("companion",p.companion?copy(p.companion):null);
      const raw=storage.getItem(JOURNEY_KEY);
      if(raw===null) return Object.freeze({ok:false,reason:"journey-write-unavailable"});
      const restored=JSON.parse(raw);
      if(restored?.landingMemoryDone!==true||
         JSON.stringify(restored?.gardenStory)!==JSON.stringify(p.gardenStory)||
         JSON.stringify(restored?.companion??null)!==JSON.stringify(p.companion??null))
        return Object.freeze({ok:false,reason:"journey-restore-mismatch"});
      return Object.freeze({ok:true});
    }catch(_){return Object.freeze({ok:false,reason:"journey-write-unavailable"});}
  }

  return Object.freeze({MAP_ID,SPAWN_ID,receive,revalidate,projectJourney,sameContext});
});
