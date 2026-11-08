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
 assert.match(event,/setText\(ui\.writtenBadge,s\.aiInsightTurn===s\.turn\?"このターン受取済"/);
 assert.match(event,/s\.aiInsightTurn===s\.turn\?"このターンは送信済（残り"/);
});

test('cards have three labeled slots, role translations, and visible disabled reasons',()=>{
 const event=load('caritas-battle-event.js');
 assert.match(event,/ui\.slots=newEl\("div","cb-reading-slots"\)/);
 assert.match(event,/\["現在地","行動","届け方"\]/);
 assert.match(event,/COMPASS:"現在地",TRIGGER:"行動",ROUTE:"届け方"/);
 assert.match(event,/viewedReadingCards\.add\(i\)/);
 assert.match(event,/ui\.selectionReason=newEl\("p","cb-selection-reason"\)/);
 assert.match(event,/chosenCount\+"\/3/);
 assert.match(event,/ui\.aiInput\.placeholder="星獣に何を伝えたい？"/);
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
 assert.match(html,/caritas-resonance-ux\.css\?v=ux-20261103-reading-clarity-v20/);
 assert.match(css,/minmax\(145px,1fr\)/);
 assert.match(css,/grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
 assert.match(css,/max-height:59dvh/);
 assert.match(css,/min-height:44px/);
 assert.match(css,/prefers-reduced-motion:reduce/);
 assert.match(css,/\.cb-gain-float/);
 assert.match(css,/\.cb-ai-wait/);
 const battleLayout=css.slice(css.indexOf('/* v8: battle-only upper composition'),css.indexOf('/* v9 — Dialogue'));
 assert.ok(battleLayout.startsWith('/* v8:'),'battle layout adjustment is isolated and explicitly scoped');
 assert.match(battleLayout,/#caritas-event \.cb-angel\{bottom:18%;\}/);
 assert.match(battleLayout,/#caritas-event \.cb-shion-sprite\{bottom:18\.2%;\}/);
 assert.doesNotMatch(battleLayout,/\b(?:width|height|background|background-image|filter|object-fit|mask-image)\s*:/,
  'battle-only positioning must preserve original character artwork and sizes');
 const h=load('caritas-battle-event.css');
 assert.ok(h.includes('cb-beast'));
});

test('v6 explicit delivery, progress and selected tabs',()=>{
 const event=load('caritas-battle-event.js'),css=load('caritas-resonance-ux.css');
 assert.match(event,/ui\.selectSend=newEl\("button","cb-select-submit","この言葉を届ける"\)/);
 assert.match(event,/ui\.selectSend\.hidden=/);
 assert.match(event,/ui\.selectionReason\.hidden=true;/);
 assert.match(event,/解釈 "\+chosenCount\+"\/3/);
 assert.match(event,/あと"\+\(3-chosenCount\)\+"つ、解釈を選ぶ"/);
 assert.match(css,/\.cb-select-submit\[hidden\]\{display:none!important/);
 assert.match(css,/\.cb-delivery-methods\{\s*order:4/);
 assert.match(css,/\.cb-delivery-methods \.cb-way\[aria-pressed="true"\]/);
});

test('stage 2 is a real full-viewport tarot-only reading and never changes the map or reading arithmetic',()=>{
 const js=load('caritas-battle-event.js');
 const css=load('caritas-resonance-ux.css');
 const stage2=css.slice(css.indexOf('/* v11 — STAGE 2'),css.indexOf('/* v12 — STAGE 3'));
 assert.match(stage2,/\[data-reading-mode="select"\] \.cb-frame>\.cb-controls\{/);
 assert.match(stage2,/height:100dvh!important;max-height:100dvh!important/);
 assert.match(stage2,/env\(safe-area-inset-top,0px\)/);
 assert.match(stage2,/\.cb-tarot-mood/);
 assert.match(stage2,/\.cb-modal-image/);
 assert.match(stage2,/\.cb-modal-navigation/);
 assert.match(js,/root\.dataset\.readingMode=readingOpen&&reading&&deliveryMethod==="select"\?"select":"none"/);
 assert.match(js,/ui\.tarotMood=newEl\("span","cb-tarot-mood","現在の心象：閉ざす"\)/);
 assert.match(js,/ui\.modalNav\.hidden=tactical&&deliveryMethod==="select"/);
 assert.match(js,/function moveViewedCard\(step\)/);
 assert.match(js,/battle=C\.select\(battle,index,word\);modalIndex=-1;render\(\)/);
 assert.match(js,/const next=C\.read\(previous\)/);
 assert.doesNotMatch(stage2,/\.cb-beast\s*\{|\.cb-angel\s*\{|\.cb-shion-sprite\s*\{|\.cb-arena\s*\{/);
});

test('stage 3 keyboard-safe writer is isolated from the permanent battlefield and API contracts',()=>{
 const js=load('caritas-battle-event.js');
 const css=load('caritas-resonance-ux.css');
 const sheet=css.slice(css.indexOf('/* v12 — STAGE 3'));
 assert.match(sheet,/\.cb-writing-overlay\[hidden\]\{display:none!important\}/);
 assert.match(sheet,/height:100dvh;max-height:100dvh;min-height:0/);
 assert.match(sheet,/\.cb-writing-footer\{/);
 assert.match(sheet,/flex:0 0 auto/);
 assert.match(sheet,/--cb-visible-height,100dvh/);
 assert.match(sheet,/--cb-visible-top,0px/);
 assert.match(sheet,/\.cb-frame>\.cb-arena\{\s*display:block!important;/);
 assert.match(sheet,/\.cb-frame>\.cb-status-band\{\s*display:block!important;/);
 assert.match(sheet,/env\(safe-area-inset-bottom,0px\)/);
 assert.match(js,/ui\.writingOverlay=newEl\("section","cb-writing-overlay"\)/);
 assert.match(js,/ui\.writingOverlay\.hidden=!writingScreen/);
 assert.match(js,/writingFooter\.append\(ui\.writingCount,ui\.aiSend\)/);
 assert.match(js,/writingPanel\.append\(writingReference,ui\.aiPanel\)/);
 assert.match(js,/window\.visualViewport\?\.addEventListener\("resize",syncComposerViewport\)/);
 assert.match(js,/ui\.aiSend\.addEventListener\("click",sendAiReading\)/);
 assert.match(js,/const response=await fetch\(endpoint,\{method:"POST",signal:controller\.signal,/);
 assert.match(js,/battle=C\.applyWrittenReading\(before,Array\.isArray\(data\.understandingIds\)\?data\.understandingIds:\[\],!firstWrittenDelivered\)/);
 assert.doesNotMatch(sheet,/\.cb-beast\{|\.cb-abyss\{|\.cb-shion-sprite\{|\.cb-angel\{/);
});

test('stage 4 shows only actual reading choices and keeps notice away from the battlefield',()=>{
 const js=load('caritas-battle-event.js');
 const css=load('caritas-resonance-ux.css');
 const visual=css.slice(css.indexOf('/* v13 — STAGE 4'));
 assert.match(visual,/#caritas-event \.cb-tarot-review\[hidden\]\{display:none!important\}/);
 assert.match(visual,/\.cb-tarot-review-item\[data-complete="true"\]/);
 assert.match(visual,/\.cb-select-submit\{\s*order:2;position:sticky/);
 assert.match(visual,/\.cb-modal-word\[aria-pressed="true"\]/);
 assert.match(visual,/\.cb-toast\{\s*top:auto!important;bottom:clamp/);
 assert.match(visual,/\.cb-status-band \.cb-gain-float\{/);
 assert.match(visual,/prefers-reduced-motion:reduce/);
 assert.doesNotMatch(visual,/\.cb-beast\s*\{|\.cb-angel\s*\{|\.cb-shion-sprite\s*\{|\.cb-abyss\s*\{/);
 assert.match(js,/ui\.tarotReview\.hidden=!selectingTarot\|\|chosenCount===0/);
 assert.match(js,/s\.words\[i\]\?C\.READING_OPTIONS\[s\.words\[i\]\]\.title:"未選択"/);
 assert.match(js,/ui\.tarotProgress\.setAttribute\("aria-live","polite"\)/);
 assert.match(js,/setText\(ui\.gainFloat,"共鳴 ＋"\+\(visible\.resonance-lastPresentedResonance\)\)/);
 assert.match(js,/const next=C\.read\(previous\)/);
 assert.match(js,/battle=C\.applyWrittenReading\(before,Array\.isArray\(data\.understandingIds\)\?data\.understandingIds:\[\],!firstWrittenDelivered\)/);
});

test('P0/P1: card interpretations scroll fully, special selection hides HUD and no invalid UI badges repeat',()=>{
 const js=load('caritas-battle-event.js');
 const css=load('caritas-resonance-ux.css');
 const repair=css.slice(css.indexOf('/* v14 / P0'),css.indexOf('/* v16 / P2'));
 assert.match(repair,/\.cb-modal-header\{/);
 assert.match(repair,/\.cb-modal-words\{[\s\S]*?overflow-y:auto!important/);
 assert.match(repair,/\.cb-modal-navigation\{[\s\S]*?order:2/);
 assert.match(repair,/\.cb-special-selection\{\s*background:#0d1328!important/);
 assert.match(repair,/\.cb-special-reading\{[\s\S]*?white-space:nowrap/);
 assert.match(repair,/\.cb-command-prompt/);
 assert.match(repair,/\.cb-modal-reference/);
 assert.match(js,/modalHeader\.append\(ui\.modalTitle,close\)/);
 assert.match(js,/ui\.finisher\.hidden=true/);
 assert.match(js,/ui\.skillHint\.hidden=finisher/);
 assert.match(js,/ui\.modalWords\.hidden=false/);
 assert.match(js,/ui\.commandPrompt=newEl\("p","cb-command-prompt"/);
 assert.match(js,/C\.READING_OPTIONS\[s\.words\[i\]\]\.title:viewedReadingCards/);
});
test('v18: special illustration always fills viewport with separate smoke/light and no repeated title',()=>{
 const js=load('caritas-battle-event.js');
 const css=load('caritas-resonance-ux.css');
 const visual=css.slice(css.indexOf('/* v18 — cinematic full-bleed'));
 assert.match(js,/const TECHNIQUE_MOTION=Object\.freeze/);
 for(const id of ['18-the-moon','08-strength','17-the-star']){
  assert.ok(js.includes("'"+id+"':{"),id+' needs its own purification frames');
  assert.ok(visual.includes('[data-card="'+id+'"] .cb-special-art::before'),id+' needs unique smoke');
  assert.ok(visual.includes('[data-card="'+id+'"] .cb-special-art::after'),id+' needs unique light');
  assert.ok(visual.includes('[data-card="'+id+'"][data-special="PURIFICATION"] .cb-release'),id+' needs unique release');
 }
 assert.match(visual,/min-width:108%!important;min-height:108%!important/);
 assert.match(visual,/object-fit:cover!important/);
 assert.match(visual,/\.cb-special-caption\{display:none!important\}/);
 assert.match(visual,/cb-special-smoke/);
 assert.match(visual,/prefers-reduced-motion:reduce/);
 assert.match(visual,/data-special="DUAL_INCANTATION"/);
 assert.match(js,/kind!=='hold'&&kind!=='art'/);
 assert.match(js,/ui\.artPlayback\.replaceChildren\(ui\.artImage\)/);
 assert.doesNotMatch(js,/setText\(ui\.artTitle,t\.title\)/);
 assert.match(js,/short\?'600ms':'2600ms'/);
 assert.match(js,/transitionSpecial\('PURIFICATION',\{imageDisplayed:ready&&ui\.artImage\.naturalWidth>0\}\)/);
});

test('v17 iPhone keyboard never exposes cards, and writing aftermath never repeats raw submitted text',()=>{
 const css=load('caritas-resonance-ux.css');
 const js=load('caritas-battle-event.js');
 const fix=css.slice(css.indexOf('/* v17 — iPhone Safari'));
 assert.match(fix,/\[data-writing-screen="true"\] \.cb-frame\{\s*visibility:hidden!important;pointer-events:none!important;/);
 assert.match(fix,/\[data-writing-screen="true"\]::before\{\s*content:"";position:fixed;inset:0;z-index:61;/);
 assert.match(fix,/\[data-writing-screen="true"\] \.cb-writing-overlay\{\s*z-index:65!important;/);
 assert.match(fix,/\[data-writing-screen="true"\]\[data-composing="true"\] \.cb-writing-overlay/);
 assert.match(fix,/\.cb-written-quote,\s*#caritas-event \.cb-written-gain\{\s*display:none!important;/);
 assert.doesNotMatch(js,/ui\.writtenQuote|ui\.writtenGain/);
 assert.match(js,/stage\("written-light",1400,/);
 assert.match(js,/saySequence\(\[\["シオン",data\.shion\],\["カリタス",data\.caritas\]\]/);
 assert.match(js,/battle=C\.applyWrittenReading\(before,Array\.isArray\(data\.understandingIds\)\?data\.understandingIds:\[\],!firstWrittenDelivered\)/);
});

test('dual-incantation uses two large, nonwrapping lines inside the canonical shared window, for all three moves',()=>{
 const js=load('caritas-battle-event.js');
 const css=load('caritas-resonance-ux.css');
 const shared=load('shared-dialogue.css');
 const html=load('hoshisuna-main.html');
 const dual=css.slice(css.indexOf('/* Dual technique chant ONLY:'),css.indexOf('[data-card="18-the-moon"][data-special="PURIFICATION"]'));
 assert.match(dual,/#game-shell:has\(#caritas-event:not\(\[hidden\]\)\[data-special="DUAL_INCANTATION"\]\) #dialogue-layer \.tb-dialogue-text/);
 assert.match(dual,/white-space:pre!important/,'explicit newline remains, no extra wraps');
 assert.match(dual,/overflow-wrap:normal!important;word-break:keep-all!important/);
 assert.match(dual,/text-wrap:nowrap/);
 assert.match(dual,/font-size:clamp\(17px,5\.6vw,26px\)!important/);
 assert.match(dual,/font-weight:750/);
 assert.match(shared,/font-size:\s*clamp\(18px,\s*4\.6vw,\s*21px\)/,'other dialogue still uses original main style');
 assert.match(html,/ux-20261103-reading-clarity-v20/,'Safari must get the updated scoped stylesheet while retaining the dual chant');
 for(const [title,reading] of [
  ['星幻迷宮','アストラル・ミラージュ！！'],
  ['星獣咆哮','アストラル・ブレイヴ！！'],
  ['星望祈願','アストラル・グリモワール！！']
 ]){
  assert.ok(js.includes("chant:'"+title+"\\n"+reading+"'"),'each chant has exactly one intentional line break');
  assert.ok([...reading].length<=14,'longest reading must fit at 5.6vw on a 320px screen');
 }
 const baseWidth=320,dialogueTextWidth=baseWidth*.92-36;
 assert.ok(14*(baseWidth*.056)*.975<=dialogueTextWidth,'longest katakana line fits 320px iPhone dialogue');
});
