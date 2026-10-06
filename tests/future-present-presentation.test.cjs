'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const anomaly=fs.readFileSync('star-gate-anomaly.js','utf8');
const aftermath=fs.readFileSync('star-gate-aftermath.js','utf8');
const css=fs.readFileSync('star-gate-aftermath.css','utf8');

test('successful present return hands off from Shion-only Stage3 and preserves anomaly-rest gate',()=>{
 assert.match(anomaly,/visibility\?\.set\('shion',1\);visibility\?\.set\('shiopon',0\);visibility\?\.set\('lumiere',0\)/);
 assert.match(anomaly,/releasePresentation\(\{preserveGateAnomaly:!!current\.completed\}\)/);
 assert.match(anomaly,/cleanupGateState\(\{preserveFinal:preserveGateAnomaly\}\)/);
 assert.match(anomaly,/visibility\?\.shion!==1\|\|visibility\?\.shiopon!==0\|\|visibility\?\.lumiere!==0/);
});

test('Present Return v1.3 reveals both companions before optional checks and returns free control',()=>{
 assert.match(aftermath,/state\(s,'RETURN_RECOGNITION'\);[\s\S]*setActorVisibility\?\.\('shion',1\);[\s\S]*setActorVisibility\?\.\('shiopon',1\);[\s\S]*setActorVisibility\?\.\('lumiere',1\)/);
 assert.match(aftermath,/await s\.clock\.wait\(900\);[\s\S]*releaseControl\(s,false\);state\(s,'CHECK_COMPANIONS'\);startTalkScanner\(s\)/);
 assert.match(aftermath,/if\(s\.checked\.size<2\)\{releaseControl\(s,false\);state\(s,'CHECK_COMPANIONS'\);startTalkScanner\(s\);return;\}[\s\S]*await groupConversation\(s\)/);
 assert.match(aftermath,/if\(a0\.visibility\)a0\.visibility=\{\.\.\.a0\.visibility,shion:1,shiopon:1,lumiere:1\}/);
});

test('Aftermath weak-light cannot overwrite the corrupted black-purple gate',()=>{
 assert.match(css,/#game-shell\.sga-anomaly-rest\.aftermath-weak-light \.scene-gate-inner-light > img/);
 assert.match(css,/brightness\(\.18\) saturate\(1\.35\) hue-rotate\(28deg\) contrast\(1\.18\)/);
 assert.match(css,/sgaAnomalyBreathe 7\.2s ease-in-out infinite!important/);
});
