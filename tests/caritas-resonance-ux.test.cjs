'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const load=p=>fs.readFileSync(path.join(root,p),'utf8');

test('both delivery paths have equal top-level button cards but use unchanged core calls',()=>{
 const event=load('caritas-battle-event.js');
 assert.match(event,/methods\.append\(ui\.read,ui\.aiToggle\)/);
 assert.match(event,/ui\.aiToggle=newEl\("button","cb-ai-toggle cb-way"\)/);
 assert.match(event,/ui\.read=newEl\("button","cb-read cb-way"\)/);
 assert.match(event,/ui\.aiSend\.addEventListener\("click",sendAiReading\)/);
 assert.match(event,/ui\.read\.addEventListener\("click",\(\)=>selectDeliveryMethod\("select"\)\)/);
 assert.match(event,/ui\.read\.addEventListener\("click",\(\)=>selectDeliveryMethod\("select"\)\)/);
 assert.match(event,/ui\.selectSend\.addEventListener\("click",\(\)=>perform\("read"\)\)/);
 assert.match(event,/battle=C\.applyWrittenReading\(before,Array\.isArray\(data\.understandingIds\)\?data\.understandingIds:\[\],!firstWrittenDelivered\)/);
 assert.match(event,/const next=C\.read\(previous\)/);
});

test('rendered rewards are derived from actual game state and never change calculations',()=>{
 const event=load('caritas-battle-event.js');
 const core=load('caritas-battle-core.js');
 assert.match(event,/setText\(ui\.readBadge,p\?\("共鳴 \+"\+p\.resonance\):"3枚選択"\)/);
 assert.match(event,/Math\.min\(firstWrittenDelivered\?RESONANCE_UI\.writtenLater:RESONANCE_UI\.writtenFirst,Math\.max\(0,100-s\.resonance\)\)/);
 assert.match(event,/const RESONANCE_UI=Object\.freeze\(\{writtenFirst:50,writtenLater:25,gainPulseMs:1300\}\)/);
 assert.match(core,/const requestedBonus=firstDelivery===true\?50:25;/);
 assert.match(event,/s\.aiInsightTurn===s\.turn\?"この読みの特典は受け取り済み"/);
});

test('cards have three labeled slots, role translations, and visible disabled reasons',()=>{
 const event=load('caritas-battle-event.js');
 assert.match(event,/ui\.slots=newEl\("div","cb-reading-slots"\)/);
 assert.match(event,/\["現在地","行動","届け方"\]/);
 assert.match(event,/COMPASS:"現在地",TRIGGER:"行動",ROUTE:"届け方"/);
 assert.match(event,/viewedReadingCards\.add\(i\)/);
 assert.match(event,/ui\.selectionReason=newEl\("p","cb-selection-reason"\)/);
 assert.match(event,/chosenCount\+"\/3/);
 assert.match(event,/ui\.aiInput\.placeholder="カリタスに何を伝えたい？"/);
 assert.match(event,/ui\.slots\.hidden=true/);
});

test('existing shared typewriter/dialogue, API request, and persisted save sequence remain intact',()=>{
 const event=load('caritas-battle-event.js');
 const shared=load('shared-dialogue.js');
 assert.match(shared,/function typeLine\(/);
 assert.match(shared,/function revealAll\(/);
 assert.match(event,/saySequence\(\[\["シオン",data\.shion\],\["カリタス",data\.caritas\]\]/);
 assert.match(event,/const response=await fetch\(endpoint,\{method:"POST",signal:controller\.signal,/);
 assert.match(event,/persist\(\{\.\.\.record,battle:pendingBattle,firstWrittenDelivered:true,aiCalls:aiCalls\+1,aiConfirmedCalls:aiCalls\+1\},completeDelivery\)/);
 assert.match(event,/aiRetryVisible=true;/);
 assert.match(event,/ui\.aiWait\.hidden=!aiBusy;/);
});

test('isolated CSS retains a flexible battlefield and accessible buttons',()=>{
 const css=load('caritas-resonance-ux.css');
 const html=load('hoshisuna-main.html');
 assert.match(html,/caritas-resonance-ux\.css\?v=ux-20261102-map-farewell-v7/);
 assert.match(css,/minmax\(145px,1fr\)/);
 assert.match(css,/grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
 assert.match(css,/max-height:59dvh/);
 assert.match(css,/min-height:44px/);
 assert.match(css,/prefers-reduced-motion:reduce/);
 assert.match(css,/\.cb-gain-float/);
 assert.match(css,/\.cb-ai-wait/);
 assert.ok(!css.includes('.cb-beast{')&&!css.includes('.cb-abyss{'),'artist/presentation visual selectors must not be changed');
 const h=load('caritas-battle-event.css');
 assert.ok(h.includes('cb-beast'));
});

test('v6 explicit delivery, progress and selected tabs',()=>{
 const event=load('caritas-battle-event.js'),css=load('caritas-resonance-ux.css');
 assert.match(event,/ui\.selectSend=newEl\("button","cb-select-submit","この言葉を届ける"\)/);
 assert.match(event,/ui\.selectSend\.hidden=/);
 assert.match(event,/ui\.selectionReason\.hidden=!\(reading&&readingOpen&&deliveryMethod==="select"\)/);
 assert.match(event,/解釈 "\+chosenCount\+"\/3/);
 assert.match(css,/\.cb-select-submit\[hidden\]\{display:none!important/);
 assert.match(css,/\.cb-delivery-methods\{\s*order:4/);
 assert.match(css,/\.cb-delivery-methods \.cb-way\[aria-pressed="true"\]/);
});
