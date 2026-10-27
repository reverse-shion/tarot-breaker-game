const test=require('node:test'),assert=require('node:assert/strict');
process.env.TAROBRE_ALLOWED_ORIGIN='https://raw.githack.com,https://reverse-shion.github.io';
process.env.GEMINI_API_KEY='test-only-not-a-real-key';
const handler=require('../api/caritas-interpret.js');
let serial=0;
async function call(method,reading,origin='https://raw.githack.com'){
 const headers={origin,'x-forwarded-for':'test-'+(++serial)};
 const res={statusCode:200,headers:{},setHeader(k,v){this.headers[k]=v;return this;},status(n){this.statusCode=n;return this;},end(body){this.body=body?JSON.parse(body):null;return this;}};
 await handler({method,headers,body:{reading}},res);return res;
}
test('health check does not expose API key',async()=>{
 const r=await call('GET');assert.equal(r.statusCode,200);assert.equal(r.body.geminiConfigured,true);assert.doesNotMatch(JSON.stringify(r.body),/test-only-not-a-real-key/);
});
test('wrong origin is denied before calling Gemini',async()=>{
 const r=await call('POST','月と星の意味を考えます','https://example.org');assert.equal(r.statusCode,403);
});
test('short reading is rejected',async()=>{
 const r=await call('POST','短い');assert.equal(r.statusCode,400);
});
test('valid Gemini JSON is sanitized and returned',async()=>{
 const original=global.fetch;
 global.fetch=async()=>({ok:true,json:async()=>({candidates:[{content:{parts:[{text:JSON.stringify({evidence:'弱さを恐れている',understandingIds:['fear_of_weakness'],shion:'弱さを恐れているのかもしれない',caritas:'……',nextCue:1})}]}}]})});
 try{const r=await call('POST','カリタスは弱さを恐れているように見える');assert.equal(r.statusCode,200);assert.deepEqual(r.body.understandingIds,['fear_of_weakness']);assert.equal(r.body.previewOnly,true);}finally{global.fetch=original;}
});
test('unsupported Gemini evidence cannot earn resonance but preserves dialogue',async()=>{
 const original=global.fetch;
 global.fetch=async()=>({ok:true,json:async()=>({candidates:[{content:{parts:[{text:JSON.stringify({evidence:'見えない言葉',understandingIds:['self_blame'],shion:'読み',caritas:'……',nextCue:1})}]}}]})});
 try{const r=await call('POST','月と星を重ねて解釈してみたい');assert.equal(r.statusCode,200);assert.deepEqual(r.body.understandingIds,[]);assert.equal(r.body.evidence,'');}finally{global.fetch=original;}
});

test('allowed origin receives CORS preflight; others do not',async()=>{
 const ok=await call('OPTIONS',null,'https://raw.githack.com');
 assert.equal(ok.statusCode,204);
 assert.equal(ok.headers['Access-Control-Allow-Origin'],'https://raw.githack.com');
 const github=await call('OPTIONS',null,'https://reverse-shion.github.io');
 assert.equal(github.statusCode,204);
 assert.equal(github.headers['Access-Control-Allow-Origin'],'https://reverse-shion.github.io');
 const denied=await call('OPTIONS',null,'https://example.org');
 assert.equal(denied.statusCode,403);
 assert.equal(denied.headers['Access-Control-Allow-Origin'],undefined);
});
test('browser game has an explicit HTTPS preview endpoint',()=>{
 const fs=require('node:fs'),path=require('node:path');
 const html=fs.readFileSync(path.join(__dirname,'../hoshisuna-main.html'),'utf8');
 assert.match(html,/window\.TAROBRE_CARITAS_API_URL="https:\/\/[^"]+\/api\/caritas-interpret"/);
 assert.match(html,/TAROBRE_CARITAS_API_URL[\s\S]*caritas-battle-event\.js/);
});

test('Gemini upstream failure is handled without exposing details',async()=>{
 const original=global.fetch;
 global.fetch=async()=>({ok:false,status:429});
 try{
  const r=await call('POST','月の不安と星の希望が同時に見えます');
  assert.equal(r.statusCode,429);
  assert.deepEqual(r.body,{error:'ai_upstream_quota'});
 }finally{global.fetch=original;}
});
test('Gemini invalid JSON is handled without crashing',async()=>{
 const original=global.fetch;
 global.fetch=async()=>({ok:true,json:async()=>({candidates:[{content:{parts:[{text:'not-json'}]}}]})});
 try{
  const r=await call('POST','力は相手を押さえつけることではありません');
  assert.equal(r.statusCode,502);
  assert.deepEqual(r.body,{error:'ai_invalid_json'});
 }finally{global.fetch=original;}
});

test('emergency switch disables AI before calling Gemini',async()=>{
 const original=global.fetch;
 const prior=process.env.TAROBRE_AI_ENABLED;
 let called=false;
 global.fetch=async()=>{called=true;throw Error('should not call Gemini');};
 process.env.TAROBRE_AI_ENABLED='false';
 try{
  const r=await call('POST','月と星の読みを言葉にしてみます');
  assert.equal(r.statusCode,503);
  assert.equal(r.body.error,'ai_temporarily_disabled');
  assert.equal(called,false);
 }finally{
  global.fetch=original;
  if(prior===undefined)delete process.env.TAROBRE_AI_ENABLED;
  else process.env.TAROBRE_AI_ENABLED=prior;
 }
});

test('oversized declared body is rejected before Gemini',async()=>{
 const original=global.fetch;
 let called=false;
 global.fetch=async()=>{called=true;throw Error('should not call Gemini');};
 try{
  const headers={origin:'https://reverse-shion.github.io','x-forwarded-for':'large-'+(++serial),'content-length':'5000'};
  const res={statusCode:200,headers:{},setHeader(k,v){this.headers[k]=v;return this;},status(n){this.statusCode=n;return this;},end(body){this.body=body?JSON.parse(body):null;return this;}};
  await handler({method:'POST',headers,body:{reading:'月と星の解釈を考える'}},res);
  assert.equal(res.statusCode,413);
  assert.equal(res.body.error,'request_too_large');
  assert.equal(called,false);
 }finally{global.fetch=original;}
});

test('actual oversized JSON is rejected even without content-length',async()=>{
 const original=global.fetch;
 let called=false;
 global.fetch=async()=>{called=true;throw Error('should not call Gemini');};
 try{
  const headers={origin:'https://reverse-shion.github.io','x-forwarded-for':'body-'+(++serial)};
  const res={statusCode:200,headers:{},setHeader(k,v){this.headers[k]=v;return this;},status(n){this.statusCode=n;return this;},end(body){this.body=body?JSON.parse(body):null;return this;}};
  await handler({method:'POST',headers,body:{reading:'月の解釈を考えています',extra:'あ'.repeat(2000)}},res);
  assert.equal(res.statusCode,413);
  assert.equal(res.body.error,'request_too_large');
  assert.equal(called,false);
 }finally{global.fetch=original;}
});

test('game limits AI attempts to three and resets on a new encounter',()=>{
 const fs=require('node:fs'),path=require('node:path');
 const source=fs.readFileSync(path.join(__dirname,'../caritas-battle-event.js'),'utf8');
 assert.match(source,/const AI_CALL_LIMIT=3;/);
 assert.match(source,/if\(aiCalls>=AI_CALL_LIMIT\)/);
 assert.match(source,/aiBusy=true;render\(\);/);
 assert.match(source,/aiCalls\+\+;checkpoint\(\);/);
 assert.match(source,/if\(!response\.ok\)[\s\S]*?return;/);
 assert.match(source,/battle=C\.newGame\(\);aiCalls=0;aiRetryAt=0;aiPanelOpen=false;aiPendingRequest=null;aiPendingText="";/);
 assert.match(source,/aiCalls=Number\.isInteger\(data\.aiConfirmedCalls\)/);
 assert.match(source,/ui\.aiSend\.disabled=!reading\|\|aiBusy\|\|aiCalls>=AI_CALL_LIMIT/);
});

test('Gemini receives a distinct visible cue for each battle turn',async()=>{
 const original=global.fetch;
 const seen=[];
 global.fetch=async(_url,opts)=>{
  const prompt=JSON.parse(opts.body).contents[0].parts[0].text;
  seen.push(prompt);
  return {ok:true,json:async()=>({candidates:[{content:{parts:[{text:JSON.stringify({evidence:'',understandingIds:[],shion:'言葉を受け止めた',caritas:'……',nextCue:0})}]}}]})};
 };
 try{
  for(const turn of [0,1,2]){
   const headers={origin:'https://reverse-shion.github.io','x-forwarded-for':'turn-'+(++serial)};
   const res={statusCode:200,headers:{},setHeader(k,v){this.headers[k]=v;return this;},status(n){this.statusCode=n;return this;},end(body){this.body=body?JSON.parse(body):null;return this;}};
   await handler({method:'POST',headers,body:{reading:'月と星の関係から心の変化を読みます',turn}},res);
   assert.equal(res.statusCode,200);
  }
  assert.match(seen[0],/口を閉ざし、こちらを見ようとしない/);
  assert.match(seen[1],/身をこわばらせ、爪が地面を引っかく/);
  assert.match(seen[2],/視線が揺れ、言葉にならない本音が漏れる/);
 }finally{global.fetch=original;}
});

test('AI responses and errors explicitly disable HTTP caching',async()=>{
 const health=await call('GET');
 assert.equal(health.headers['Cache-Control'],'no-store, max-age=0');
 const invalid=await call('POST','短い');
 assert.equal(invalid.headers['Cache-Control'],'no-store, max-age=0');
});

test('Gemini 2.5 Flash disables thinking so token cap leaves room for the structured reply',async()=>{
 const original=global.fetch;
 global.fetch=async(_url,opts)=>{
  const config=JSON.parse(opts.body).generationConfig;
  assert.equal(config.thinkingConfig.thinkingBudget,0);
  assert.equal(config.maxOutputTokens,900);
  return {ok:true,json:async()=>({candidates:[{content:{parts:[{text:JSON.stringify({evidence:'',understandingIds:[],shion:'届いた',caritas:'……',nextCue:0})}]}}]})};
 };
 try{const res=await call('POST','月と力と星の意味を考えて言葉にしてみます');assert.equal(res.statusCode,200);}finally{global.fetch=original;}
});
test('iPhone card layout is fixed-height and the AI editor is collapsed initially',()=>{
 const fs=require('node:fs'),path=require('node:path');
 const js=fs.readFileSync(path.join(__dirname,'../caritas-battle-event.js'),'utf8');
 const css=fs.readFileSync(path.join(__dirname,'../caritas-battle-event.css'),'utf8');
 assert.match(js,/ui\.aiBody\.hidden=true/);
 assert.match(js,/ui\.aiToggle\.addEventListener\("click"/);
 assert.match(js,/ui\.guide\.hidden=true/);
 assert.match(css,/#caritas-event \.cb-cards\{\s*flex:0 0 auto;/);
 assert.match(css,/#caritas-event \.cb-controls\{\s*min-height:0;overflow-y:auto;/);
});
