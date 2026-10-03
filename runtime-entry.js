/* One-shot same-tab runtime handoff. Import itself has no storage/navigation effects. */
(function(root,factory){
  const api=factory();
  if(typeof module==="object"&&module.exports) module.exports=api;
  else root.TarotRuntimeEntry=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
  "use strict";
  const KEY="tarot-breaker:runtime-entry:v1";
  const VERSION=1;
  const TTL_MS=15000;

  function destinationOf(url,base){
    const parsed=new URL(url,base);
    return parsed.pathname+parsed.search;
  }

  function issue(target,{storage,base,now}={}){
    if(!storage||typeof storage.setItem!=="function"||typeof now!=="function")
      return Object.freeze({ok:false,reason:"runtime-entry-unavailable"});
    let destination;
    try{ destination=destinationOf(target,base); }
    catch(_){ return Object.freeze({ok:false,reason:"runtime-entry-target-invalid"}); }
    const issuedAt=Number(now());
    if(!Number.isFinite(issuedAt)) return Object.freeze({ok:false,reason:"runtime-entry-clock-invalid"});
    const envelope={version:VERSION,destination,issuedAt};
    try{ storage.setItem(KEY,JSON.stringify(envelope)); }
    catch(_){ return Object.freeze({ok:false,reason:"runtime-entry-write-failed"}); }
    return Object.freeze({ok:true,destination});
  }

  function consume({storage,pathname,search="",now}={}){
    if(!storage||typeof storage.getItem!=="function"||typeof storage.removeItem!=="function"||typeof now!=="function")
      return Object.freeze({ok:false,reason:"runtime-entry-unavailable"});
    let raw;
    try{ raw=storage.getItem(KEY); }
    catch(_){ return Object.freeze({ok:false,reason:"runtime-entry-read-failed"}); }
    if(raw===null) return Object.freeze({ok:false,reason:"runtime-entry-missing"});
    try{ storage.removeItem(KEY); }catch(_){}
    let envelope;
    try{ envelope=JSON.parse(raw); }catch(_){ return Object.freeze({ok:false,reason:"runtime-entry-invalid"}); }
    if(!envelope||envelope.version!==VERSION||typeof envelope.destination!=="string"||
       !Number.isFinite(envelope.issuedAt)||Object.keys(envelope).some(k=>!["version","destination","issuedAt"].includes(k)))
      return Object.freeze({ok:false,reason:"runtime-entry-invalid"});
    const age=Number(now())-envelope.issuedAt;
    if(!Number.isFinite(age)||age<0||age>TTL_MS) return Object.freeze({ok:false,reason:"runtime-entry-expired"});
    const current=String(pathname||"")+String(search||"");
    if(envelope.destination!==current) return Object.freeze({ok:false,reason:"runtime-entry-destination-mismatch"});
    return Object.freeze({ok:true});
  }

  function browserIssue(target){
    return issue(target,{storage:sessionStorage,base:location.href,now:Date.now});
  }
  function browserConsume(){
    return consume({storage:sessionStorage,pathname:location.pathname,search:location.search,now:Date.now});
  }
  function navigate(target){
    const result=browserIssue(target);
    if(!result.ok) return result;
    location.href=target;
    return result;
  }
  function requireInternal({allowDirect=false,title="./index.html"}={}){
    if(allowDirect) return Object.freeze({ok:true,direct:true});
    const result=browserConsume();
    if(result.ok) return result;
    try{ location.replace(title); }
    catch(_){ location.href=title; }
    return result;
  }

  return Object.freeze({KEY,VERSION,TTL_MS,destinationOf,issue,consume,browserIssue,browserConsume,navigate,requireInternal});
});
