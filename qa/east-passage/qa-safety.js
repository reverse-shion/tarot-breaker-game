/* East passage QA-only, fail-closed origin guard and synthetic fixture.
 * Never loaded by the normal gameplay pages. No storage I/O at import time.
 */
(function(root,factory){
  const api=factory();
  if(typeof module==="object"&&module.exports)module.exports=api;
  else root.TarotEastPassageQASafety=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
"use strict";
const PROGRESS_KEY="tarot-breaker:progress-v1";
const HISTORY=Object.freeze(["alenon_prologue","landing_devil_memory","garden_shiopon_meet","garden_lumiere_gate"]);
function deniedHost(host) {
 const denied=["github.io","raw.githack.com","githack.com","github.com","githubusercontent.com","localhost","127.0.0.1"];
 return denied.some(domain=>host===domain||host.endsWith("."+domain))||/^\d{1,3}(?:\.\d{1,3}){3}$/.test(host);
}
function exactOrigin(value){
 if(typeof value!=="string"||!value.trim())return null;
 try {
  const u=new URL(value);
  if(u.protocol!=="https:"||u.username||u.password||u.search||u.hash||
     u.pathname!=="/"||!u.hostname||deniedHost(u.hostname))return null;
  if(u.port&&u.port!=="443")return null;
  return u.origin===value?u.origin:null;
 }catch(_){return null;}
}
function approve(actual,configured){
 const bound=exactOrigin(configured);
 return Object.freeze({ok:!!bound&&actual===bound,origin:bound||null,
  reason:!bound?"no-approved-disposable-origin":actual!==bound?"origin-mismatch":null});
}
function fixtureForOrigin(actual,configured){
 const gate=approve(actual,configured);
 if(!gate.ok)return Object.freeze({ok:false,reason:gate.reason});
 const match=/^https:\/\/[a-z][a-z0-9]*(?:-[a-z0-9]+)*-(8765|8766)\.app\.github\.dev$/.exec(actual);
 if(!match)return Object.freeze({ok:false,reason:"unapproved-qa-port-origin"});
 return Object.freeze({ok:true,kind:match[1]==="8765"?"pending-aftermath":"legacy-completed"});
}
function fixture(kind){
 if(!["pending-aftermath","legacy-completed"].includes(kind))throw Error("unknown-qa-fixture");
 return {version:1,checkpoint:{mapId:"star_gate_garden",spawnId:"south_gate"},
  completedEvents:kind==="legacy-completed"?[...HISTORY,"garden_star_gate_anomaly"]:[...HISTORY],
  companion:"joined_with_shion"};
}
function prepare({actualOrigin,approvedOrigin,storage,core,kind}){
 // Check origin BEFORE touching storage, fixture, or Progress.
 const gate=fixtureForOrigin(actualOrigin,approvedOrigin);
 if(!gate.ok)return Object.freeze({ok:false,reason:gate.reason});
 if(kind!==gate.kind)return Object.freeze({ok:false,reason:"fixture-port-mismatch"});
 if(!core||core.STORAGE_KEY!==PROGRESS_KEY||typeof core.validateRecord!=="function")
  return Object.freeze({ok:false,reason:"progress-core-unavailable"});
 if(!storage||typeof storage.getItem!=="function"||typeof storage.setItem!=="function")
  return Object.freeze({ok:false,reason:"storage-unavailable"});
 const record=fixture(kind);
 const valid=core.validateRecord(record);
 if(!valid.ok)return Object.freeze({ok:false,reason:"invalid-fixture:"+valid.reason});
 return Object.freeze({ok:true,record:JSON.stringify(valid.value)});
}
function seed({actualOrigin,approvedOrigin,storage,core,kind}){
 const result=prepare({actualOrigin,approvedOrigin,storage,core,kind});
 if(!result.ok)return result;
 try{
  // Never overwrite an existing disposable QA save. No removeItem/clear/reset.
  if(storage.getItem(PROGRESS_KEY)!==null)
   return Object.freeze({ok:false,reason:"existing-qa-progress-refuse-overwrite"});
  storage.setItem(PROGRESS_KEY,result.record);
  if(storage.getItem(PROGRESS_KEY)!==result.record)
   return Object.freeze({ok:false,reason:"qa-readback-mismatch"});
  return Object.freeze({ok:true,kind});
 }catch(_){return Object.freeze({ok:false,reason:"qa-storage-write-unavailable"});}
}
return Object.freeze({PROGRESS_KEY,HISTORY,approve,fixtureForOrigin,fixture,prepare,seed});
});