(function(root,factory){const api=factory();if(typeof module==="object"&&module.exports)module.exports=api;else root.TarotDevCheckpoints=api;})(typeof globalThis!=="undefined"?globalThis:this,function(){"use strict";
const definitions=Object.freeze({
  "star-gate-choice":Object.freeze({
    id:"star-gate-choice",event:"star-gate-anomaly",segment:"star-gate-choice",map:"star_gate_garden",
    spawn:Object.freeze({landmark:"gate",offsetY:40}),
    actors:Object.freeze(["shion","shiopon","lumiere"]),
    journeyState:Object.freeze({gardenStory:Object.freeze({shioponDone:true,lumiereDone:true,joined:true})}),
    requiredRuntime:Object.freeze(["star-gate-interaction.js"]),
    entryAction:"approach gate checkpoint boot",
    emittedSignal:"tarot-breaker:star-gate-investigate",
    receivingRuntime:"star-gate-anomaly.js (next segment; intentionally not loaded in choice-only checkpoint)",
    expectedFirstBehavior:"Star Gate choice prompt is visible and Inspect dispatches the production investigate signal",
    durableWritePolicy:"FORBIDDEN"
  })
});
function get(id){return Object.prototype.hasOwnProperty.call(definitions,id)?definitions[id]:null;}function list(){return Object.values(definitions);}function isDevRequest(search){return new URLSearchParams(search||"").has("dev");}function resolve(search){const id=new URLSearchParams(search||"").get("dev");return id?get(id):null;}return Object.freeze({definitions,get,list,resolve,isDevRequest});});
