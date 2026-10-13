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

test('full garden panorama is painted beneath black and safely handed off after unlock',()=>{
 const game=fs.readFileSync('game.js','utf8');
 assert.match(anomaly,/frameBounds\(GATE_BOUNDS,0,\{padding:14,minZoom:\.48\}\)/);
 assert.match(anomaly,/framed\?\.completed[\s\S]*overscanCoversViewport\(state\)/);
 assert.match(anomaly,/const unlocked=current\.scene\.unlock\(current\.id\);[\s\S]*armReturnCamera\?\.\(current\.id\)/);
 assert.match(anomaly,/abandonReturnCamera\?\.\(current\.id\)/);
 for(const method of ['armReturnCamera','takeReturnCamera','abandonReturnCamera','returnToGameplayCamera'])assert.ok(game.includes(method+'('));
 assert.match(aftermath,/if\(!s\.returnFraming\)await s\.scene\.gameplayCamera\(\)/);
 assert.match(aftermath,/await sayLine\(s,'R06',RETURN\[5\]\)[\s\S]*returnToGameplayCamera\(1550\)[\s\S]*await sayLine\(s,'R07',RETURN\[6\]\)/);
 assert.match(aftermath,/if\(handoff\)\{a0\.camera=\{\.\.\.handoff\.safeCamera\};a0\.cameraRef=\{\.\.\.handoff\.safeCameraRef\};\}/);
 assert.match(anomaly,/left:'26\.627%',top:'-2\.3%',width:'46\.746%',height:'74\.8%'/);
});

test('iPhone regression: refused Aftermath is diagnosed and panoramic camera is abandoned',()=>{
 const after=fs.readFileSync('star-gate-aftermath.js','utf8');
 assert.match(after,/REJECTED_ELIGIBILITY/);
 assert.match(after,/CAPTURE_FAILED/);
 assert.match(after,/HANDOFF_FAILED/);
 assert.match(after,/OPENING_FAILED/);
 assert.match(after,/getDiagnostic:\(\)=>lastStartAttempt/);
 assert.match(anomaly,/const status=aftermath\?\.getDiagnostic\?\.\(\)\?\.status/);
 assert.match(anomaly,/state==='NOT_STARTED'\|\|!state\|\|status!=='ACCEPTED'/);
 assert.match(anomaly,/if\(current\.completed&&current\.restored\)\{[\s\S]*const aftermath=window\.TarotStarGateAftermath/);
 assert.match(anomaly,/if\(!abandoned&&current\.scene\.getState\(\)\.owner===null&&window\.TarotCinematicCamera\?\.getState\?\.\(\)\?\.owned===false\)[\s\S]*window\.TarotCinematicCamera\?\.release\(\)/);
 assert.match(anomaly,/showReturnDiagnostic\(\)/);
 assert.match(anomaly,/get\('returnDebug'\)!=='1'/);
 assert.match(anomaly,/returnCameraHandoff:!!current\.returnCameraHandoff/);
 assert.match(anomaly,/left:'26\.627%',top:'-2\.3%',width:'46\.746%',height:'74\.8%'/);
});

test('real iPhone error regression: adapter cannot reference block-scoped normalCameraTarget',()=>{
 const game=fs.readFileSync('game.js','utf8');
 const adapterStart=game.indexOf('  if (stage3Dev) {\n    // Observe physical releases');
 const cameraBlock=game.indexOf('  if (stage3Dev) {\n  function beginCinematicPan',adapterStart);
 assert.ok(adapterStart>=0&&cameraBlock>adapterStart,'both blocks must exist');
 const adapter=game.slice(adapterStart,cameraBlock);
 const cameraApi=game.slice(cameraBlock);
 assert.doesNotMatch(adapter,/const target=normalCameraTarget\(\)/);
 assert.match(adapter,/const target=window\.TarotCinematicCamera\?\.getNormalTarget\?\.\(\)/);
 assert.match(adapter,/if\(!Number\.isFinite\(target\?\.x\)\|\|!Number\.isFinite\(target\?\.y\)\)return false/);
 assert.match(cameraApi,/function normalCameraTarget\(\)[\s\S]*getNormalTarget\(\)\s*\{\s*return\s*\{\s*\.\.\.normalCameraTarget\(\)\s*\};?\s*\}/);
});

test('only the R06 return pan duration matches the established 1550ms first gate framing',()=>{
 assert.match(anomaly,/frameBounds\(GATE_BOUNDS,1550,\{padding:14,minZoom:\.48\}\)/);
 assert.match(aftermath,/await sayLine\(s,'R06',RETURN\[5\]\)[\s\S]*returnToGameplayCamera\(1550\)[\s\S]*await sayLine\(s,'R07',RETURN\[6\]\)/);
 assert.doesNotMatch(aftermath,/returnToGameplayCamera\(450\)/);
});
