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
test('all 27 full interpretation combinations have independently calculated role-specific impact',()=>{
 const totals=new Set();
 for(const [state,stateDark] of [['closed',100],['storm',70],['wavering',35]]){
  const results=new Map();
  for(const a of C.CARDS[0].words)for(const b of C.CARDS[1].words)for(const c of C.CARDS[2].words){
   const words=[a,b,c],s=words.reduce((o,w,i)=>C.select(o,i,w),{...C.newGame(),dark:stateDark});
   const p=C.predict(s);
   const power=C.COMPASS_POWER[a][state],force=C.TRIGGER_FORCE[b][state],penetration=C.ROUTE_PENETRATION[c][state];
   const armor={closed:12,storm:9,wavering:7}[state];
   const expectedHit=Math.max(4,Math.round(power*force-armor*(1-penetration)));
   assert.equal(p.hit,expectedHit,words.join('/')+' '+state);
   assert.equal(p.dark,Math.min(stateDark,expectedHit));
   assert.equal(p.power,power);assert.equal(p.force,force);assert.equal(p.penetration,penetration);
   assert.equal(C.read(s).dark,stateDark-p.dark);
   assert.equal(C.readingPages(s).length,3);
   for(const sentence of C.readingPages(s))assert.ok(sentence.length>20);
   assert.equal(C.READING_OPTIONS[a].title.length>3,true);
   results.set(words.join('/'),p.hit);
   totals.add(p.hit);
  }
  assert.equal(results.size,27);
 }
 assert.ok(totals.size>=12,'different readings and changing hearts should yield meaningful variety');
 const closed=C.predict(selectTypes({...C.newGame(),dark:100},'PPP'));
 assert.equal(closed.dark,20);assert.equal(closed.resonance,27);assert.equal(closed.damage,9);
 const storm=C.predict(C.select(C.select(C.select({...C.newGame(),dark:70},0,'秘密'),1,'自制'),2,'希望'));
 assert.equal(storm.dark,22);assert.equal(storm.resonance,25);
 const wavering=C.predict(C.select(C.select(C.select({...C.newGame(),dark:35},0,'無意識'),1,'勇気'),2,'願い'));
 assert.equal(wavering.dark,28);assert.equal(wavering.resonance,31);
});
test('read without 3 selections is blocked and does not consume HP/turn',()=>{
 const s=C.newGame();assert.equal(C.read(s),s);assert.equal(C.predict(s),null);
 const partial=C.select(s,0,'不安');assert.equal(C.read(partial),partial);
});
test('ordinary readings reach resonance MAX without counterattack; either finisher ends identically',()=>{
 let s=C.newGame();
 for(let i=0;i<12&&s.phase==='read';i++)s=C.read(selectTypes(s,'PPP'));
 assert.ok(s.turn>=3);assert.equal(s.phase,'finisher');assert.ok(s.hp>0);
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
 for(let i=0;i<12&&s.phase==='read';i++)s=C.read(selectTypes(s,'PPP'));
 assert.equal(s.phase,'finisher');assert.equal(C.canSkill(s),false);
 assert.equal(C.finish(s,'skill'),s);
 assert.equal(C.finish(s,'dialogue').phase,'ending');
});
test('defensive choices change the battle outcome: reckless repetition retreats, another route can recover',()=>{
 let reckless=C.newGame();
 for(let turn=0;turn<12&&reckless.phase==='read';turn++)reckless=C.read(selectTypes(reckless,'FFF'));
 assert.equal(reckless.phase,'defeat');
 let measured=C.newGame();
 for(let turn=0;turn<12&&measured.phase==='read';turn++)measured=C.read(selectTypes(measured,'SSS'));
 assert.equal(measured.phase,'finisher');
 assert.ok(measured.hp>0);
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
