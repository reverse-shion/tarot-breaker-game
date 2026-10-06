'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const anomaly=fs.readFileSync('star-gate-anomaly.js','utf8');
const aftermath=fs.readFileSync('star-gate-aftermath.js','utf8');
const css=fs.readFileSync('star-gate-aftermath.css','utf8');

test('successful present return reveals Shion alone and preserves anomaly-rest gate',()=>{
 assert.match(anomaly,/visibility\?\.set\('shion',1\);visibility\?\.set\('shiopon',0\);visibility\?\.set\('lumiere',0\)/);
 assert.match(anomaly,/releasePresentation\(\{preserveGateAnomaly:!!current\.completed\}\)/);
 assert.match(anomaly,/cleanupGateState\(\{preserveFinal:preserveGateAnomaly\}\)/);
 assert.match(anomaly,/visibility\?\.shion!==1\|\|visibility\?\.shiopon!==0\|\|visibility\?\.lumiere!==0/);
});

test('Aftermath owns companion reveal after the Shion-only beat',()=>{
 assert.match(aftermath,/state\(s,'INTRODUCTION'\);[\s\S]*await s\.clock\.wait\(300\);[\s\S]*setActorVisibility\?\.\('lumiere',1\)[\s\S]*setActorVisibility\?\.\('shiopon',1\)/);
 assert.match(aftermath,/if\(a0\.visibility\)a0\.visibility=\{\.\.\.a0\.visibility,shion:1,shiopon:1,lumiere:1\}/);
});

test('Aftermath weak-light cannot overwrite the corrupted black-purple gate',()=>{
 assert.match(css,/#game-shell\.sga-anomaly-rest\.aftermath-weak-light \.scene-gate-inner-light > img/);
 assert.match(css,/brightness\(\.18\) saturate\(1\.35\) hue-rotate\(28deg\) contrast\(1\.18\)/);
 assert.match(css,/sgaAnomalyBreathe 7\.2s ease-in-out infinite!important/);
});
