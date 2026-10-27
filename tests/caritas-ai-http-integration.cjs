'use strict';
const assert=require('node:assert/strict');
const http=require('node:http');
process.env.TAROBRE_ALLOWED_ORIGIN='https://reverse-shion.github.io';
process.env.GEMINI_API_KEY='local-test-only';
const realFetch=global.fetch;
global.fetch=async(_url,options)=>{
 const body=JSON.parse(options.body);
 const prompt=body.contents[0].parts[0].text;
 const turn=prompt.includes('カリタスの視線が揺れ')?2:prompt.includes('カリタスは強く身をこわばらせ')?1:0;
 return {ok:true,json:async()=>({candidates:[{content:{parts:[{text:JSON.stringify({
  evidence:'弱さ',understandingIds:['fear_of_weakness'],shion:'弱さを見つめることも勇気だ。',caritas:'……なぜそう思う？',nextCue:Math.min(turn+1,2)
 })}]}}]})};
};
const handler=require('../api/caritas-interpret.js');
const server=http.createServer((req,res)=>{
 let raw='';
 req.on('data',chunk=>raw+=chunk);
 req.on('end',async()=>{
  try{req.body=raw?JSON.parse(raw):{};res.status=function(code){res.statusCode=code;return res;};await handler(req,res);}
  catch(err){res.statusCode=500;res.end(JSON.stringify({error:err.message}));}
 });
});
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const url='http://127.0.0.1:'+server.address().port+'/api/caritas-interpret';
 for(let turn=0;turn<3;turn++){
  const res=await realFetch(url,{method:'POST',headers:{Origin:'https://reverse-shion.github.io','Content-Type':'application/json'},
   body:JSON.stringify({reading:'月と力と星を通して、弱さを見つめる勇気を読み取りました。',turn})});
  assert.equal(res.status,200,'turn '+turn);
  assert.equal(res.headers.get('cache-control'),'no-store, max-age=0');
  const data=await res.json();
  assert.equal(typeof data.shion,'string');
  assert.equal(typeof data.caritas,'string');
  assert.deepEqual(data.understandingIds,['fear_of_weakness']);
  console.log('LOCAL HTTP integration turn '+turn+': PASS');
 }
 const denied=await realFetch(url,{method:'POST',headers:{Origin:'https://example.org','Content-Type':'application/json'},
  body:JSON.stringify({reading:'月と力と星を通して、弱さを見つめる勇気を読み取りました。',turn:0})});
 assert.equal(denied.status,403);
 console.log('LOCAL HTTP CORS rejection: PASS');
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>server.close());
