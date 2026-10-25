const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const C=require('../caritas-battle-core.js');
const H=require('../hoshisuna-caritas-collision.js');
const root=path.join(__dirname,'..');
test('three fixed cards expose exactly nine meanings and preserve their roles',()=>{
  assert.deepEqual(C.CARDS.map(c=>[c.name,c.role]),[['月','COMPASS'],['力','TRIGGER'],['星','ROUTE']]);
  assert.equal(C.CARDS.reduce((n,c)=>n+c.words.length,0),9);
});
test('all stages offer multiple valid readings and different tactics',()=>{
  for(let step=0;step<3;step++){
    const viable=[];
    for(const a of C.CARDS[0].words)for(const b of C.CARDS[1].words)for(const c of C.CARDS[2].words){
      const s={...C.newGame(),step,words:[a,b,c]};
      if(C.points(s)>=2)viable.push(c);
    }
    assert.ok(viable.length>=2);
    assert.ok(new Set(viable).size>=2);
  }
});
test('ordinary tarot readings reach max resonance without requiring skill',()=>{
 let s=C.newGame();
 s=C.read(s);assert.equal(s.resonance,34);
 s=C.select(s,0,'秘密');s=C.select(s,1,'自制');s=C.read(s);assert.equal(s.resonance,67);
 s=C.select(s,0,'無意識');s=C.select(s,1,'勇気');s=C.select(s,2,'希望');s=C.read(s);
 assert.equal(s.resonance,100);assert.equal(s.phase,'ending');assert.equal(s.used,false);
 for(let i=0;i<C.ENDING.length;i++)s=C.next(s);
 assert.equal(s.phase,'complete');
});
test('wrong reading cannot gain resonance, and defense has no resonance reward',()=>{
 let s=C.newGame();
 s=C.select(s,0,'無意識');s=C.select(s,1,'勇気');s=C.select(s,2,'希望');
 s=C.read(s);assert.equal(s.resonance,0);assert.equal(s.dark,100);
 s=C.defend(s);assert.equal(s.resonance,0);
});
test('skill is locked before enough resonance and dark reduction',()=>{
 let s=C.newGame();assert.equal(C.skill(s),s);
 s=C.read(s);assert.equal(C.skill(s),s);
 s=C.select(s,0,'秘密');s=C.select(s,1,'勇気');s=C.select(s,2,'願い');s=C.read(s);
 s=C.skill(s);assert.equal(s.resonance,100);assert.equal(s.phase,'ending');
});
test('Caritas obstacle blocks before encounter and releases after departure',()=>{
 H.setActive(true);const base={isWalkable:()=>true,segmentClear:()=>true,nearestWalkable:q=>q},collision=H.wrap(base);
 assert.equal(collision.isWalkable(1013,240),false);
 H.setActive(false);assert.equal(collision.isWalkable(1013,240),true);
 assert.equal(collision.segmentClear({x:920,y:240},{x:1110,y:240}),true);
 H.setActive(true);
});
test('new scene is isolated from default map and does not reveal identity',()=>{
 const html=fs.readFileSync(path.join(root,'hoshisuna-main.html'),'utf8');
 const event=fs.readFileSync(path.join(root,'caritas-battle-event.js'),'utf8');
 const core=fs.readFileSync(path.join(root,'caritas-battle-core.js'),'utf8');
 const css=fs.readFileSync(path.join(root,'caritas-battle-event.css'),'utf8');
 assert.match(html,/caritas-battle-event\.js/);
 assert.match(event,/params\.get\("dev"\)!=="hoshisuna"/);
 assert.match(event,/tarot-breaker:interaction-start/);
 assert.match(event,/tarot-breaker:interaction-end/);
 assert.match(event,/setActive\?\.\(false\)/);
 assert.doesNotMatch(event+core,/聖獣|王族|正体は/);
 assert.match(css,/height:100dvh/);
 assert.doesNotMatch(css,/overflow:\s*(auto|scroll)/);
});

test("Caritas battle displays the three actual tarot WebP assets in their existing roles",()=>{
 const event=fs.readFileSync(path.join(root,"caritas-battle-event.js"),"utf8");
 const css=fs.readFileSync(path.join(root,"caritas-battle-event.css"),"utf8");
 for(const [name,file] of [["月","18-the-moon.webp"],["力","08-strength.webp"],["星","17-the-star.webp"]]){
  const buf=fs.readFileSync(path.join(root,"assets/tarot/major",file));
  assert.equal(buf.toString("ascii",0,4),"RIFF",file);
  assert.equal(buf.toString("ascii",8,12),"WEBP",file);
  assert.ok(event.includes(name+':"./assets/tarot/major/'+file+'"'),name+" asset path");
 }
 assert.match(event,/image\.src=CARD_IMAGES\[card\.name\]/);
 assert.match(css,/\.cb-card-image\{[^}]*object-fit:contain/);
 assert.doesNotMatch(event,/art\.append\(newEl\("div","cb-symbol"/);
});
