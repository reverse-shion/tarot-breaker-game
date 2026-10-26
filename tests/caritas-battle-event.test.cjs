const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const C=require('../caritas-battle-core.js');
const H=require('../hoshisuna-caritas-collision.js');
const root=path.join(__dirname,'..');
const TYPES=['P','F','S'];
const wordFor=(i,type)=>C.CARDS[i].words.find(w=>C.TYPE[w]===type);
const selectTypes=(s,types)=>types.split('').reduce((v,t,i)=>C.select(v,i,wordFor(i,t)),s);
const vector=fs.readFileSync(path.join(__dirname,'fixtures/caritas_test_vectors_v1_3_C.csv'),'utf8').trim().split(/\r?\n/).slice(1).map(l=>{
 const [state,pattern,dark,resonance,damage]=l.split(',');
 return {state,pattern,dark:+dark,resonance:+resonance,damage:+damage};
});
test('official cards retain their real images, roles and 9 tarot meanings',()=>{
 assert.deepEqual(C.CARDS.map(c=>[c.name,c.role]),[['月','COMPASS'],['力','TRIGGER'],['星','ROUTE']]);
 assert.equal(C.CARDS.reduce((n,c)=>n+c.words.length,0),9);
 const event=fs.readFileSync(path.join(root,'caritas-battle-event.js'),'utf8');
 const css=fs.readFileSync(path.join(root,'caritas-battle-event.css'),'utf8');
 for(const [name,file] of [['月','18-the-moon.webp'],['力','08-strength.webp'],['星','17-the-star.webp']]){
  const b=fs.readFileSync(path.join(root,'assets/tarot/major',file));
  assert.equal(b.toString('ascii',0,4),'RIFF');
  assert.equal(b.toString('ascii',8,12),'WEBP');
  assert.ok(event.includes(name+':"./assets/tarot/major/'+file+'"'));
 }
 assert.match(event,/function openCard\(/);
 assert.match(event,/cb-modal-words/);
 assert.match(css,/\.cb-card-overlay/);
 assert.doesNotMatch(event,/ui\.defend|ui\.forecast/);
});
test('30 frozen vectors, all 81 positional choices, exact integer damage and stable buckets',()=>{
 assert.equal(vector.length,30);
 for(const x of vector){
  const stateDark={closed:100,storm:70,wavering:35}[x.state];
  for(const perm of new Set([x.pattern,...[x.pattern[0]+x.pattern[2]+x.pattern[1],x.pattern[1]+x.pattern[0]+x.pattern[2],x.pattern[1]+x.pattern[2]+x.pattern[0],x.pattern[2]+x.pattern[0]+x.pattern[1],x.pattern[2]+x.pattern[1]+x.pattern[0]]])){
   const s=selectTypes({...C.newGame(),dark:stateDark},perm),p=C.predict(s);
   assert.equal(p.dark,x.dark,perm+' '+x.state+' dark');
   assert.equal(p.resonance,x.resonance,perm+' '+x.state+' resonance');
   assert.equal(p.damage,x.damage,perm+' '+x.state+' damage');
   assert.equal(C.read(s).hp,100-x.damage);
   assert.equal(C.bucket(p.dark),p.darkBucket);
   assert.equal(C.bucket(p.resonance),p.resBucket);
  }
 }
 for(const dark of [71,70,36,35,1,0])assert.equal(C.stateFor(dark),dark>=71?'closed':dark>=36?'storm':dark>0?'wavering':'freed');
});
test('read without 3 selections is blocked and does not consume HP/turn',()=>{
 const s=C.newGame();assert.equal(C.read(s),s);assert.equal(C.predict(s),null);
 const partial=C.select(s,0,'不安');assert.equal(C.read(partial),partial);
});
test('ordinary readings reach resonance MAX without counterattack; either finisher ends identically',()=>{
 let s=C.newGame();
 for(let i=0;i<10;i++)s=C.read(selectTypes(s,'PPP'));
 assert.equal(s.turn,10);assert.equal(s.phase,'finisher');assert.equal(s.hp,7);
 assert.equal(s.resonance,100);assert.equal(s.lastEffect.damage,0);
 assert.equal(C.canSkill(s),true);
 const a=C.finish(s,'dialogue'),b=C.finish(s,'skill');
 assert.equal(a.dark,0);assert.equal(b.dark,0);assert.equal(a.phase,'ending');assert.equal(b.phase,'ending');
 assert.equal(a.hp,b.hp);assert.equal(a.turn,b.turn);
 assert.equal(C.finish(a,'skill'),a,'cannot execute second finisher');
});
test('minor-only cards can win by dialogue but cannot use cut-in skill',()=>{
 const minors=C.CARDS.map(c=>({...c,major:false,id:'test-'+c.id}));
 let s=C.newGame(minors);
 for(let i=0;i<10;i++)s=C.read(selectTypes(s,'PPP'));
 assert.equal(s.phase,'finisher');assert.equal(C.canSkill(s),false);
 assert.equal(C.finish(s,'skill'),s);
 assert.equal(C.finish(s,'dialogue').phase,'ending');
});
test('risk matters: all-F and all-S eventually retreat, defense command is absent',()=>{
 for(const type of ['F','S']){
  let s=C.newGame();
  for(let turn=0;turn<12&&s.phase==='read';turn++)s=C.read(selectTypes(s,type.repeat(3)));
  assert.equal(s.phase,'defeat');
 }
 assert.equal(typeof C.defend,'undefined');
});
test('Caritas still collides until purified, without edits to shared navigation',()=>{
 H.setActive(true);const collision=H.wrap({isWalkable:()=>true,segmentClear:()=>true,nearestWalkable:q=>q});
 assert.equal(collision.isWalkable(1013,240),false);
 H.setActive(false);assert.equal(collision.isWalkable(1013,240),true);
 H.setActive(true);
 const html=fs.readFileSync(path.join(root,'hoshisuna-main.html'),'utf8');
 const event=fs.readFileSync(path.join(root,'caritas-battle-event.js'),'utf8');
 assert.match(html,/caritas-battle-event\.js/);
 assert.match(event,/params\.get\("dev"\)!=="hoshisuna"/);
 assert.doesNotMatch(event,/聖獣|王族|正体は/);
});
