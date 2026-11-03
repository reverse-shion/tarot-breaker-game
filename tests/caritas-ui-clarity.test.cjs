'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const event=read('caritas-battle-event.js');
const core=read('caritas-battle-core.js');
const css=read('caritas-resonance-ux.css');
const shared=read('shared-dialogue.js');

function pagerForWidth(innerWidth){
 const start=event.indexOf('function paginateWrittenSpeech(value){');
 const end=event.indexOf('\nfunction saySequence(',start);
 assert.ok(start>=0&&end>start,'the encounter-only pager must exist');
 return new Function('window',event.slice(start,end)+'\nreturn paginateWrittenSpeech;')({innerWidth});
}

test('AI long text paginates within three visible lines, without dropping characters',()=>{
 const paragraph='カリタス、闇に呑まれるのが怖いのではなく、自分の意志を失って大切なものを傷つけるのが怖いのではないかな。'.repeat(6);
 for(const width of [320,375,430]){
  const pages=pagerForWidth(width)(paragraph);
  assert.ok(pages.length>1);
  assert.ok(pages.every(p=>p.split('\n').length<=3));
  assert.equal(pages.join('').replaceAll('\n',''),paragraph);
 }
});

test('newline and ASCII text also remain readable without changing speaker order',()=>{
 const pages=pagerForWidth(320)('自分が怖かった。\nそれでも前へ進みたい。\n'+('You can choose again. '.repeat(8)));
 assert.equal(pages.join('').replaceAll('\n',''),'自分が怖かった。それでも前へ進みたい。'+('You can choose again. '.repeat(8)).trim());
 assert.ok(pages.every(p=>p.split('\n').length<=3));
 assert.match(event,/dialogueLines=response==="written"\?lines\.flatMap/);
 assert.match(event,/:\s*lines;\s*dialogueIndex=0/,'authored scenes stay untouched');
 assert.match(shared,/function typeLine\(/,'shared dialogue typing remains canonical');
});

test('rewards are explanations of committed values; original AI/core rules stay intact',()=>{
 assert.match(event,/writtenReward\.bonus\+writtenReward\.insight/);
 assert.match(event,/const reward=battle\.lastWrittenReward/);
 assert.match(event,/reward\.bonus\+"／理解＋"\+reward\.insight/);
 assert.match(core,/const requestedBonus=firstDelivery===true\?50:25;/);
 assert.match(core,/Math\.min\(12,4\*count,100-s\.resonance\)/);
 assert.match(event,/battle=C\.applyWrittenReading\(before,Array\.isArray\(data\.understandingIds\)\?data\.understandingIds:\[\],!firstWrittenDelivered\)/);
 assert.match(event,/persist\(\{\.\.\.record,battle:pendingBattle,firstWrittenDelivered:true,aiCalls:aiCalls\+1,aiConfirmedCalls:aiCalls\+1\},completeDelivery\)/);
});

test('one primary action per screen; writer references explain the role and keyboard keeps textarea',()=>{
 assert.match(css,/\[data-reading-mode="select"\] \.cb-delivery-methods,/);
 assert.match(css,/\[data-reading-mode="select"\] \.cb-card \.cb-chosen/);
 assert.match(event,/\["月｜現在地","力｜行動","星｜届け方"\]/);
 assert.match(event,/カリタスの返答を待っています…/);
 assert.match(event,/aiBusy\?"送信中"/);
 assert.match(event,/このターンは送信済（残り/);
 assert.match(css,/\[data-composing="true"\] \.cb-writing-overlay \.cb-ai-input\{[\s\S]*?max-height:none!important/);
 assert.match(css,/\.cb-writing-overlay \.cb-ai-body\{[\s\S]*?border:0!important/);
});

test('event preflight admits only the isolated NOT TESTED Caritas target',()=>{
 const {spawnSync}=require('node:child_process');
 const run=spawnSync(process.execPath,['scripts/event-preflight.cjs','--target','caritas-heart-resonance'],{
  cwd:root,encoding:'utf8',timeout:15000
 });
 assert.equal(run.status,0,(run.stderr||'')+'\n'+(run.stdout||''));
 const result=JSON.parse(run.stdout);
 assert.equal(result.event,'hoshisuna-caritas');
 assert.equal(result.status,'NOT TESTED');
 assert.equal(result.changeAuthorized,true);
 assert.equal(result.productionEnabled,false);
});
