#!/usr/bin/env node
/* Manual live smoke test for the protected Caritas preview API.
 * No API keys are embedded. Run only against a deployment you own.
 * Usage: CARITAS_API_URL=https://.../api/caritas-interpret node scripts/smoke-caritas-live.cjs
 * If Deployment Protection requires an automation bypass, set VERCEL_AUTOMATION_BYPASS_SECRET locally.
 */
'use strict';
const assert=require('node:assert/strict');
const url=process.env.CARITAS_API_URL;
if(!url||!/^https:\/\//.test(url)){console.error('Set CARITAS_API_URL to the HTTPS preview endpoint.');process.exit(2);}
const origin=process.env.CARITAS_ORIGIN||'https://reverse-shion.github.io';
const headers={'Content-Type':'application/json','Origin':origin};
if(process.env.VERCEL_AUTOMATION_BYPASS_SECRET)headers['x-vercel-protection-bypass']=process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
(async()=>{
 const health=await fetch(url,{method:'GET',headers,signal:AbortSignal.timeout(15000)});
 assert.equal(health.status,200,'Preview health failed (possibly SSO-protected)');
 const info=await health.json();
 assert.equal(info.geminiConfigured,true,'Gemini key not configured');
 for(const turn of [0,1,2]){
  const reading=['月は不安を見つめ、力は弱さを認める勇気、星はもう一度歩む希望を表すと読みました。','力は自分を責めすぎないこと、月は恐れを見つめること、星は進みたい願いを表します。','星の希望は無理な楽観ではなく、月の迷いを抱えたまま一歩を選ぶことだと思います。'][turn];
  const response=await fetch(url,{method:'POST',headers,signal:AbortSignal.timeout(20000),body:JSON.stringify({reading,turn,sessionId:'manual-smoke',requestId:'manual-'+turn})});
  const payload=await response.json().catch(()=>({error:'invalid_json'}));
  assert.equal(response.status,200,'Gemini live POST failed on turn '+turn+' ('+response.status+', '+String(payload.error||'no_error_code')+')');
  assert.equal(typeof payload.shion,'string');
  assert.equal(typeof payload.caritas,'string');
  assert.equal(Array.isArray(payload.understandingIds),true);
  console.log('Turn '+turn+': HTTP 200, Shion/Caritas text present, IDs '+payload.understandingIds.length);
 }
 console.log('LIVE GEMINI SMOKE PASS (3 requests; consumes provider quota).');
})().catch(error=>{console.error('LIVE GEMINI SMOKE FAIL:',error.message);process.exitCode=1;});
