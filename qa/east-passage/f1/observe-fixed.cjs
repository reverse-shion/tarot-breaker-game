'use strict';
// --require runs in the Node test coordinator too; only its worker may write.
if(process.env.NODE_TEST_CONTEXT!=='child-v8')return;
// Node-side evidence around the frozen fixture. No test/HTML/browser script
// replacements. Both engine jobs preload these identical bytes.
const fs=require('node:fs'),path=require('node:path');
const {identities,ROOT,HELPER}=require('./common.cjs');
const output=process.env.F1_OBSERVATION_FILE;
if(!output)throw Error('F1_OBSERVATION_FILE required');
const state={identity:identities(),playwright:require('playwright/package.json').version,engine:null,events:[],trace:[]};
let trace;
function flush(){state.trace=trace?.entries||[];fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(state,null,2))}
function note(type,data={}){state.events.push({at:new Date().toISOString(),type,...data});flush()}
const helper=require(path.join(ROOT,HELPER)),observe=helper.observe;
helper.observe=async function(...args){trace=await observe.apply(this,args);note('fixed-observer-attached');return trace};
const {webkit}=require('playwright'),launch=webkit.launch;
webkit.launch=async function(...args){
 note('browser-launch-start');
 let browser;
 try{browser=await launch.apply(this,args)}catch(e){note('browser-launch-failed',{name:e.name,message:e.message});throw e}
 const browsers=JSON.parse(fs.readFileSync(path.join(path.dirname(require.resolve('playwright-core/package.json')),'browsers.json'),'utf8'));
 state.engine={version:browser.version(),registry:browsers.browsers.find(x=>x.name==='webkit'),executable:webkit.executablePath()};
 note('browser-launched');
 const newContext=browser.newContext;
 browser.newContext=async function(...options){
  const ctx=await newContext.apply(this,options),newPage=ctx.newPage;
  ctx.on('close',()=>note('context-close'));
  ctx.newPage=async function(...values){
   const page=await newPage.apply(this,values),locator=page.locator,wait=page.waitForFunction,reload=page.reload;
   page.on('crash',()=>note('page-crash'));page.on('pageerror',e=>note('page-error',{message:e.message}));
   page.locator=function(...selectors){
    const result=locator.apply(this,selectors),tap=result.tap;
    if(selectors[0]==='#play')result.tap=async function(...params){
     note('tap-start');try{const value=await tap.apply(this,params);note('tap-success');return value}
     catch(e){note('tap-failed',{name:e.name,message:e.message});throw e}
    };
    return result;
   };
   page.waitForFunction=async function(...params){
    try{
     const handle=await wait.apply(this,params);
     // This is the frozen fixture's actual playing/currentTime predicate.
     const playback=await page.evaluate(()=>({playing:window.playing===true,paused:audio.paused,currentTime:audio.currentTime}));
     note('playback-confirmed',playback);return handle;
    }catch(e){note('playback-confirmation-failed',{name:e.name,message:e.message});throw e}
   };
   page.reload=async function(...params){
    note('reload-call',{options:params[0]});
    try{const value=await reload.apply(this,params);note('reload-return');return value}
    catch(e){note('reload-error',{name:e.name,message:e.message,stack:e.stack});throw e}
   };
   return page;
  };
  return ctx;
 };
 const close=browser.close;
 browser.close=async function(...params){note('browser-close-start');try{return await close.apply(this,params)}finally{note('browser-close-return')}};
 return browser;
};
process.on('exit',flush);
process.on('uncaughtExceptionMonitor',e=>note('uncaught-error',{name:e.name,message:e.message}));
flush();
