'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const anomaly=fs.readFileSync('star-gate-anomaly.js','utf8');
const aftermath=fs.readFileSync('star-gate-aftermath.js','utf8');
const css=fs.readFileSync('star-gate-aftermath.css','utf8');const anomalyCss=fs.readFileSync('star-gate-anomaly.css','utf8');const html=fs.readFileSync('index.html','utf8');

test('successful present return hands off from Shion-only Stage3 and preserves anomaly-rest gate',()=>{
 assert.match(anomaly,/visibility\?\.set\('shion',1\);visibility\?\.set\('shiopon',0\);visibility\?\.set\('lumiere',0\)/);
 assert.match(anomaly,/releasePresentation\(\{preserveGateAnomaly:!!current\.completed\}\)/);
 assert.match(anomaly,/cleanupGateState\(\{preserveFinal:preserveGateAnomaly\}\)/);
 assert.match(anomaly,/visibility\?\.shion!==1\|\|visibility\?\.shiopon!==1\|\|visibility\?\.lumiere!==1\|\|!current\.returnCallsPlayed/);
 assert.match(anomaly,/async stageReturnFormation\(\)[\s\S]*placeReturnFormation\(\)[\s\S]*setActorVisibility\(name,1\)/);
 assert.match(anomaly,/async callReturnVoices\(\)[\s\S]*callReturnVoicesUnderBlack\(black\)/);
});

test('Present Return v1.3 stages separated companions before reveal and returns free control immediately',()=>{
 assert.match(aftermath,/state\(s,'RETURN_RECOGNITION'\);[\s\S]*placeReturnFormation\?\.\(\);[\s\S]*setActorVisibility\?\.\('shion',1\);[\s\S]*setActorVisibility\?\.\('shiopon',1\);[\s\S]*setActorVisibility\?\.\('lumiere',1\)/);
 assert.match(aftermath,/await s\.scene\.gameplayCamera\(\);[\s\S]*state\(s,'GATE_SILENCE'\);[\s\S]*releaseControl\(s,false\);\s*state\(s,'CHECK_COMPANIONS'\)/);
 assert.doesNotMatch(aftermath,/RETURN_RECOGNITION'[\s\S]{0,900}wait\(900\)/);
 assert.match(aftermath,/if\(s\.checked\.size<2\)\{releaseControl\(s,false\);state\(s,'CHECK_COMPANIONS'\);return;\}[\s\S]*await groupConversation\(s\)/);
 assert.match(aftermath,/if\(a0\.visibility\)a0\.visibility=\{\.\.\.a0\.visibility,shion:1,shiopon:1,lumiere:1\}/);assert.match(aftermath,/installTalkInput\(s\)/);assert.doesNotMatch(aftermath,/aftermath-talk|startTalkScanner|話しかける/);
});

test('Present return reuses the real inner-light asset and does not add a black backing or Aftermath anomaly override',()=>{
 assert.match(html,/scene-gate-inner-light[\s\S]*star-country-gate-garden-star-gate-inner-light\.webp/);
 assert.match(anomalyCss,/#game-shell\.sga-anomaly-rest \.scene-gate-inner-light > img[\s\S]*sgaAnomalyBreathe 7\.2s/);
 assert.doesNotMatch(anomalyCss,/rgba\(58,22,72,\.96\)|box-shadow:inset 0 0 24px/);
 assert.match(css,/aftermath-weak-light:not\(\.sga-anomaly-rest\)/);
 assert.doesNotMatch(css,/sga-anomaly-rest\.aftermath-weak-light/);
 assert.match(aftermath,/if\(!shell\.classList\.contains\('sga-anomaly-rest'\)\)shell\.classList\.add\('aftermath-weak-light'\)/);
});

test('blackout calls use canonical DialogueUI above cover, before fade, never replaying in Aftermath',()=>{
 const future=fs.readFileSync('future-stage3.js','utf8');
 const futureCss=fs.readFileSync('future-stage3.css','utf8');
 const sharedCss=fs.readFileSync('shared-dialogue.css','utf8');
 assert.match(future,/state\('PRESENT_RESTORE'\)[\s\S]*state\('RETURN_COMPANIONS_READY'\)[\s\S]*a\.stageReturnFormation\(\)[\s\S]*state\('RETURN_CALLS_UNDER_BLACK'\)[\s\S]*a\.callReturnVoices\(\)[\s\S]*state\('PRESENT_REVEAL'\)[\s\S]*a\.black\(1-p\)/);
 assert.match(anomaly,/callReturnVoicesUnderBlack\(black\)[\s\S]*document\.body\.appendChild\(layer\)[\s\S]*say\('shiopon','シオンさん！'\)[\s\S]*say\('lumiere','シオン様！'\)[\s\S]*previousMount\.appendChild\(layer\)/);
 assert.match(anomaly,/Number\(black\.style\.opacity\)!==1/);
 assert.match(futureCss,/\.sga-v192-black\{background:#000;z-index:2501\}/);
 assert.match(futureCss,/body > #anomaly-dialogue-layer\.sga-return-call\{z-index:2502!important\}/);
 assert.match(sharedCss,/\.tb-dialogue-window/);
 assert.doesNotMatch(aftermath,/showDualCall|aftermath-dual-call|SIMULTANEOUS_CALL/);
 assert.doesNotMatch(css,/\.aftermath-dual-call|\.aftermath-call/);
 assert.match(aftermath,/state\(s,'SHION_DAZED'\)[\s\S]*await sayLine\(s,'R01',RETURN\[0\]\)/);
 assert.match(aftermath,/Object\.freeze\(\["shion","……二人とも……どうしたんだ？"\]\)/);
});

test('fear scene uses actual actor facing and never repositions the P0 actors',()=>{
 assert.match(aftermath,/state\(s,'GATE_UNEASE'\);[\s\S]*face\('shion','gate'\)[\s\S]*state\(s,'GATE_SILENCE'\)/);
 assert.match(aftermath,/face\('shiopon','gate'\)[\s\S]*await sayLine\(s,'R11',RETURN\[10\]\)/);
 assert.match(aftermath,/face\('lumiere','gate'\)[\s\S]*await sayLine\(s,'R10',RETURN\[9\]\)/);
 assert.match(aftermath,/await sayLine\(s,'R14',RETURN\[13\]\)[\s\S]*face\('shion','shiopon'\)[\s\S]*releaseControl\(s,false\)/);
 assert.match(anomaly,/left:'26\.627%',top:'-2\.3%',width:'46\.746%',height:'74\.8%'/);
 assert.doesNotMatch(aftermath,/scene\.perform\(\{type:'move'/);
});
