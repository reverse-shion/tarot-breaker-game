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
test('unsupported Gemini evidence fails closed',async()=>{
 const original=global.fetch;
 global.fetch=async()=>({ok:true,json:async()=>({candidates:[{content:{parts:[{text:JSON.stringify({evidence:'見えない言葉',understandingIds:['self_blame'],shion:'読み',caritas:'……',nextCue:1})}]}}]})});
 try{const r=await call('POST','月と星を重ねて解釈してみたい');assert.equal(r.statusCode,502);assert.equal(r.body.error,'ai_invalid_response');}finally{global.fetch=original;}
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
  assert.equal(r.statusCode,502);
  assert.deepEqual(r.body,{error:'ai_unavailable'});
 }finally{global.fetch=original;}
});
test('Gemini invalid JSON is handled without crashing',async()=>{
 const original=global.fetch;
 global.fetch=async()=>({ok:true,json:async()=>({candidates:[{content:{parts:[{text:'not-json'}]}}]})});
 try{
  const r=await call('POST','力は相手を押さえつけることではありません');
  assert.equal(r.statusCode,502);
  assert.deepEqual(r.body,{error:'ai_unavailable'});
 }finally{global.fetch=original;}
});
