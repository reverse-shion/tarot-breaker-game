'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const Base=require('../caritas-battle-core.js');
const C=require('../caritas-tactical-core.js')(Base);
const root=path.join(__dirname,'..');
const event=fs.readFileSync(path.join(root,'caritas-battle-event.js'),'utf8');
const cameraCss=fs.readFileSync(path.join(root,'caritas-battle-camera.css'),'utf8');
const html=fs.readFileSync(path.join(root,'hoshisuna-main.html'),'utf8');
const words={moon:['不安','秘密','無意識'],strength:['忍耐','勇気'],star:['希望','癒し','願い']};

test('three heart states speak their complete authored voices, with persistent physical clues',()=>{
 for(const [dark,key,count] of [[100,'closed',2],[70,'storm',4],[35,'wavering',3]]){
  const obs=C.observation({...C.newGame(),dark});
  assert.equal(C.stateFor(dark),key);
  assert.equal(obs.voices.length,count);
  assert.ok(obs.voices.every(line=>line.length>15));
  assert.ok(obs.clue.length>15);
 }
 assert.match(C.observation({...C.newGame(),dark:100}).voices[0],/喰らってやる/);
 assert.match(C.observation({...C.newGame(),dark:70}).voices[3],/助けてくれ/);
 assert.match(C.observation({...C.newGame(),dark:35}).voices[2],/私は、私でいられるのか/);
});
test('all 18 tactical readings keep three authored, coherent Shion speeches',()=>{
 let count=0;
 for(const mood of [100,70,35])for(const moon of words.moon)
  for(const strength of words.strength)for(const star of words.star){
   const battle={...C.newGame(),dark:mood,words:[moon,strength,star]};
   const pages=C.readingPages(battle,{stormVoiceHeardThisTurn:true});
   assert.equal(pages.length,3);
   assert.ok(pages.every(line=>line.length>=10));
   assert.match(pages[2],/君|俺/);
   const prediction=C.predict(battle);
   assert.ok(prediction);
   assert.equal(typeof C.reaction(battle,prediction),'string');
   count++;
  }
 assert.equal(count,54); // 3 Moon x 2 Strength x 3 Star x 3 heart states.
});
test('secret references only speech that was heard, with no invented quoted plea',()=>{
 const battle={...C.newGame(),dark:70,words:['秘密','勇気','癒し']};
 assert.equal(C.readingPages(battle,{stormVoiceHeardThisTurn:true})[0],'聞こえた。『頼む』って言ったよな。');
 assert.equal(C.readingPages(battle,{stormVoiceHeardThisTurn:false})[0],'今、何か言おうとしただろ。途中までは聞こえた。');
 const closed={...battle,dark:100},wavering={...battle,dark:35};
 assert.match(C.readingPages(closed)[0],/『来るな』/);
 assert.match(C.readingPages(wavering)[0],/怖いんだな/);
});
test('tactical replies depend on established heart state and action; written fear cannot be invented',()=>{
 const actual=(dark,trigger,route='癒し')=>{
  const s={...C.newGame(),dark,words:['不安',trigger,route]};
  return C.reaction(s,C.predict(s));
 };
 assert.match(actual(100,'忍耐'),/そこで止まれ/);
 assert.match(actual(100,'勇気'),/近づくなと言ったはず/);
 assert.match(actual(70,'忍耐'),/アビスが……止まらぬ/);
 assert.match(actual(70,'勇気'),/もう少し/);
 assert.match(actual(35,'忍耐','希望'),/この道の先か/);
 assert.match(actual(35,'勇気','願い'),/話してくれ/);
 const sample={...C.newGame(),dark:35,words:['無意識','忍耐','癒し']};
 assert.match(C.reaction(sample,C.predict(sample),{writtenShion:'大丈夫だ、ここにいる'}),/少し、息がつける/);
 assert.match(C.reaction(sample,C.predict(sample),{writtenShion:'俺も怖い。'}),/お前も怖いのか/);
});
test('combat math and saved battle rules stay unchanged in the voice revision',()=>{
 const initial=C.newGame();
 assert.deepEqual(C.optionsFor(C.CARDS[1]),['忍耐','勇気']);
 for(const mood of [100,70,35])for(const a of words.moon)for(const b of words.strength)
  for(const c of words.star){
   const s={...initial,dark:mood,words:[a,b,c]};
   const p=C.predict(s),n=C.read(s);
   assert.equal(n.dark,mood-p.dark);
   assert.equal(n.hp,s.hp-p.damage);
   assert.equal(n.resonance,s.resonance+p.resonance);
  }
});
test('presentation tracks voice per run, waits for Strength step, and keeps sound assets intact',()=>{
 assert.match(event,/const HEART_VOICE_KEY=/);
 assert.match(event,/Object\.prototype\.hasOwnProperty\.call\(heartVoiceTurns,state\)/);
 assert.match(event,/sessionStorage\.setItem\(HEART_VOICE_KEY\+record\.battleRunId/);
 assert.match(event,/readingPagesForCurrent\(previous\)/);
 assert.match(event,/readingStepPending=tactical&&previous\.words\[1\]==="勇気"/);
 assert.match(event,/applyOutcome\(selected,next,p,\{writtenShion:data\.shion\}\)/);
 assert.match(event,/playHeartVoiceOnce\(\);/);
 assert.match(cameraCss,/data-reading-step="true"/);
 assert.match(html,/audio\.js\?v=20261110-d994-bgm-only&return=3/);
 assert.match(html,/caritas-tactical-core\.js\?v=20261112-abyss-voice-v1/);
});
