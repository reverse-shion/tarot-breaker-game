'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const bootstrap=fs.readFileSync('stage3-dev-bootstrap.js','utf8');
const js=fs.readFileSync('star-gate-inner-light-debug.js','utf8');
const css=fs.readFileSync('star-gate-inner-light-debug.css','utf8');
const anomaly=fs.readFileSync('star-gate-anomaly.js','utf8');
test('editor loads only from opt-in Stage3 dev route and never writes production game state',()=>{
 assert.match(bootstrap,/q.get\('gateDebug'\)==='inner-light'&&q.getAll\('gateDebug'\).length===1/);
 assert.match(js,/query.get\('dev'\)!=='star-gate-full'/);
 assert.match(js,/query.has\('entry'\)\|\|query.has\('from'\)/);
 assert.doesNotMatch(js,/TarotProgressCore|completeEvent|resetGame|TarotJourney\.set/);
 assert.match(bootstrap,/star-gate-inner-light-debug\.js\?v=1/);
});
test('same gate source, coordinate registration and rest-only image as game',()=>{
 assert.match(js,/gate-void\.webp/);assert.match(js,/shell\.classList\.add\('sga-anomaly-rest'\)/);
 for(const n of ['620','140','296','595'])assert.ok(js.includes(n));
 assert.match(anomaly,/gateVoid:"\.\/assets\/events\/gate-vision\/gate-void\.webp"/);
 assert.match(js,/frame\.dataset/);assert.match(js,/light\.dataset/);
 assert.match(js,/--sga-void-/);
});
test('touch editor provides all 4 independent controls, handles, camera, export and storage',()=>{
 for(const v of ['left','top','width','height'])assert.match(js,new RegExp("key:'"+v+"'"));
 assert.match(js,/data-range/);assert.match(js,/data-delta/);
 assert.match(js,/setPointerCapture/);assert.match(js,/pointermove/);
 assert.match(js,/frameBounds\(bounds,0/);
 assert.match(js,/localStorage\.setItem/);assert.match(js,/localStorage\.getItem/);
 assert.match(js,/clipboard\?\.writeText/);assert.match(js,/gld-export/);
 assert.match(css,/safe-area-inset-bottom/);
 assert.match(css,/#gate-light-debug-guides/);
});
