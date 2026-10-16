'use strict';
// QA-only observers. Never read save bytes, issue entry tokens, or change navigation.
const fs=require('node:fs/promises'),path=require('node:path');
const traces=new WeakMap();
function safeURL(value){try{const u=new URL(value);return u.origin+u.pathname+(u.search==='?entry=continue'?u.search:'')}catch{return String(value).slice(0,120)}}
async function observe(ctx){
 const entries=[],pending=new Map();let sequence=0;
 const record=(event,data={})=>{entries.push({at:new Date().toISOString(),event,...data});if(entries.length>2500)entries.shift()};
 const trace={entries,record,pending};traces.set(ctx,trace);
 await ctx.exposeBinding('__qaLifecycle',({page},event)=>record(event.type,{url:safeURL(page.url()),document:event.document,persisted:event.persisted}));
 await ctx.addInitScript(()=>{
  const id=Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8);
  window.__qaDocument=id;
  const report=event=>window.__qaLifecycle({type:event.type,document:id,persisted:event.persisted===true}).catch(()=>{});
  for(const type of ['pageshow','pagehide','beforeunload','DOMContentLoaded','load'])window.addEventListener(type,report);
  report({type:'new-document'});
 });
 ctx.on('page',page=>{
  const pageId=++sequence;
  page.on('framenavigated',frame=>{if(frame===page.mainFrame())record('framenavigated',{pageId,url:safeURL(frame.url())})});
  for(const event of ['domcontentloaded','load','close','crash'])page.on(event,()=>record('page:'+event,{pageId,url:safeURL(page.url())}));
  page.on('pageerror',error=>record('pageerror',{pageId,message:error.message.slice(0,300)}));
  page.on('console',msg=>{
   if(msg.type()==='error'||msg.text().startsWith('[QA Runtime Entry]'))record('console:'+msg.type(),{pageId,message:msg.text().slice(0,300)});
  });
  page.on('request',req=>{
   pending.set(req,safeURL(req.url()));
   if(req.isNavigationRequest())record('document-request',{pageId,url:safeURL(req.url())});
  });
  page.on('requestfinished',req=>pending.delete(req));
  page.on('requestfailed',req=>{pending.delete(req);record('requestfailed',{pageId,url:safeURL(req.url()),reason:req.failure()?.errorText})});
 });
 return trace;
}
function instrumentRuntime(source){
 // Observation only, in intercepted test response bytes. The checked-in runtime
 // and its token consumption / location.replace behavior remain unchanged.
 const consume='const result=browserConsume();',replace='location.replace(title);';
 if(source.split(consume).length!==2||source.split(replace).length!==2)throw Error('Runtime diagnostic anchors changed');
 return source.replace(consume,consume+'console.debug("[QA Runtime Entry] consume",JSON.stringify({ok:result.ok,reason:result.reason||null}));')
  .replace(replace,'console.debug("[QA Runtime Entry] location.replace",title);'+replace);
}
async function snapshot(page){
 let timer;
 try{return await Promise.race([page.evaluate(()=>({
  url:location.origin+location.pathname+location.search,
  document:window.__qaDocument,readyState:document.readyState,
  rejected:window.__tarotRuntimeEntryRejected===true,
  titleVisible:!!document.getElementById('start-screen')&&!document.getElementById('start-screen').hidden,
  continueVisible:!!document.getElementById('continue')&&!document.getElementById('continue').hidden&&getComputedStyle(document.getElementById('continue')).display!=='none',
  entryPresent:sessionStorage.getItem('tarot-breaker:runtime-entry:v1')!==null,
  sceneReady:document.body.classList.contains('scene-ready')
 })),new Promise(resolve=>{timer=setTimeout(()=>resolve({snapshotUnavailable:'page-evaluation-timeout'}),1500)})])}
 catch(e){return {snapshotUnavailable:e.name}}
 finally{clearTimeout(timer)}
}
async function report(page,label,start,{failed=false}={}){
 const trace=traces.get(page.context());
 const events=trace.entries.slice(start),types=new Set(events.map(x=>x.event));
 const observed={label,failed,finalURL:safeURL(page.url()),state:await snapshot(page),
  absent:['beforeunload','pagehide','new-document','framenavigated','domcontentloaded','DOMContentLoaded','load','pageshow','requestfailed','pageerror','console:error','page:close','page:crash'].filter(x=>!types.has(x)),
  pendingRequests:[...trace.pending.values()],events};
 if(process.env.QA_DIAGNOSTIC_DIR){
  await fs.mkdir(process.env.QA_DIAGNOSTIC_DIR,{recursive:true});
  await fs.writeFile(path.join(process.env.QA_DIAGNOSTIC_DIR,label+'.json'),JSON.stringify(observed,null,2));
 }
 console.log('[QA reload diagnostics] '+JSON.stringify(observed));
 return observed;
}
async function reloadToTitle(page,{method='window',label}={}){
 const trace=traces.get(page.context()),start=trace.entries.length;
 trace.record('reload-start',{method,url:safeURL(page.url()),state:await snapshot(page)});
 try{
  await Promise.all([
   page.waitForURL(/\/index\.html$/,{waitUntil:'domcontentloaded',timeout:45000}),
   method==='window'?page.evaluate(()=>window.location.reload()):page.reload({waitUntil:'domcontentloaded',timeout:45000}),
  ]);
  await page.waitForURL(/\/index\.html$/,{timeout:30000});
  await page.locator('#continue').waitFor({state:'visible',timeout:30000});
  return await report(page,label,start);
 }catch(e){await report(page,label,start,{failed:true});throw e}
}
module.exports={observe,instrumentRuntime,reloadToTitle};
