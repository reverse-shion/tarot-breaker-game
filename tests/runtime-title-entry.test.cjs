"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
const Entry=require("../runtime-entry.js");

function store(){
  const m=new Map();
  return {
    getItem:k=>m.get(k)??null,
    setItem:(k,v)=>m.set(k,v),
    removeItem:k=>m.delete(k),
    raw:k=>m.get(k)??null,
  };
}

test("runtime handoff is exact, one-shot and expires",()=>{
  const s=store();
  const issued=Entry.issue("./star-country-landing.html?from=alenon",{
    storage:s,base:"https://example.test/game/alenon.html",now:()=>1000
  });
  assert.equal(issued.ok,true);
  assert.equal(issued.destination,"/game/star-country-landing.html?from=alenon");
  const accepted=Entry.consume({
    storage:s,pathname:"/game/star-country-landing.html",search:"?from=alenon",now:()=>1200
  });
  assert.equal(accepted.ok,true);
  assert.equal(Entry.consume({storage:s,pathname:"/game/star-country-landing.html",search:"?from=alenon",now:()=>1201}).reason,"runtime-entry-missing");

  Entry.issue("./alenon.html?from=title",{storage:s,base:"https://example.test/game/index.html",now:()=>2000});
  assert.equal(Entry.consume({storage:s,pathname:"/game/alenon.html",search:"?from=landing-return",now:()=>2100}).reason,"runtime-entry-destination-mismatch");

  Entry.issue("./alenon.html?from=title",{storage:s,base:"https://example.test/game/index.html",now:()=>3000});
  assert.equal(Entry.consume({storage:s,pathname:"/game/alenon.html",search:"?from=title",now:()=>3000+Entry.TTL_MS+1}).reason,"runtime-entry-expired");
});

test("runtime-entry module import itself touches no browser state",()=>{
  const source=fs.readFileSync("runtime-entry.js","utf8");
  const h={};
  for(const key of ["sessionStorage","location","Date"]) Object.defineProperty(h,key,{get(){throw new Error(key);}});
  vm.runInNewContext(source,h);
  assert.equal(typeof h.TarotRuntimeEntry.requireInternal,"function");
});

test("cold production map entries require handoff while dev/editor entries remain directly reachable",()=>{
  const alenon=fs.readFileSync("alenon.html","utf8");
  const landing=fs.readFileSync("star-country-landing.html","utf8");
  const index=fs.readFileSync("index.html","utf8");
  for(const source of [alenon,landing,index]) assert.match(source,/runtime-entry\.js\?v=title-entry-v1/);
  assert.match(alenon,/TarotRuntimeEntry\?\.requireInternal\(\{allowDirect:tool,title:"\.\/index\.html"\}\)/);
  assert.match(landing,/TarotRuntimeEntry\?\.requireInternal\(\{allowDirect:tool,title:"\.\/index\.html"\}\)/);
  assert.match(index,/if \(\(fromLanding && !params\.has\("dev"\)\) \|\| publicGardenResume\)[\s\S]*TarotRuntimeEntry\?\.requireInternal\(\{title:"\.\/index\.html"\}\)/);
  assert.match(alenon,/p\.has\("dev"\).*p\.has\("edit"\).*p\.has\("objects"\).*p\.has\("collision"\).*p\.has\("skipPrologue"\).*p\.has\("debug"\)/s);
  assert.match(landing,/p\.has\("dev"\).*p\.has\("padEdit"\).*p\.has\("debug"\)/s);
});

test("all production cross-map exits issue one-shot handoff before navigation",()=>{
  const game=fs.readFileSync("game.js","utf8");
  const alenon=fs.readFileSync("alenon.html","utf8");
  const landing=fs.readFileSync("star-country-landing.html","utf8");
  const title=fs.readFileSync("public-continue-title.js","utf8");
  assert.match(game,/function navigateRuntime\(target\)[\s\S]*TarotRuntimeEntry\?\.navigate/);
  assert.match(game,/navigateRuntime\(landingResumeDevId \?/);
  assert.match(game,/navigateRuntime\(`\.\/alenon\.html\?from=title/);
  assert.match(alenon,/TarotRuntimeEntry\?\.navigate\) window\.TarotRuntimeEntry\.navigate\(target\)/);
  assert.equal((landing.match(/TarotRuntimeEntry\?\.navigate\) window\.TarotRuntimeEntry\.navigate\(target\)/g)||[]).length,2);
  assert.match(title,/const navigateRuntime = url =>[\s\S]*TarotRuntimeEntry\?\.navigate/);
});

test("requireInternal redirects a cold page to Title and admits an issued page exactly once",()=>{
  const make=(raw)=>{
    const s=store();
    if(raw) s.setItem(Entry.KEY,raw);
    const loc={pathname:"/game/alenon.html",search:"?from=title",href:"https://example.test/game/alenon.html?from=title",replaced:null,
      replace(value){this.replaced=value;}};
    const h={URL,JSON,Object,Number,String,sessionStorage:s,location:loc,Date:{now:()=>5000}};
    vm.createContext(h);
    vm.runInContext(fs.readFileSync("runtime-entry.js","utf8"),h);
    return h;
  };
  let h=make(null);
  const cold=h.TarotRuntimeEntry.requireInternal({title:"./index.html"});
  assert.equal(cold.ok,false);
  assert.equal(h.location.replaced,"./index.html");

  const s=store();
  Entry.issue("./alenon.html?from=title",{storage:s,base:"https://example.test/game/index.html",now:()=>4900});
  h=make(s.raw(Entry.KEY));
  const accepted=h.TarotRuntimeEntry.requireInternal({title:"./index.html"});
  assert.equal(accepted.ok,true);
  assert.equal(h.location.replaced,null);
  const second=h.TarotRuntimeEntry.requireInternal({title:"./index.html"});
  assert.equal(second.ok,false);
  assert.equal(h.location.replaced,"./index.html");
});
