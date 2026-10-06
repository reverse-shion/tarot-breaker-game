'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const source=fs.readFileSync('star-gate-anomaly.js','utf8');
const start=source.indexOf('async function preparePresentAudio('),end=source.indexOf('async function recoverPresent(',start);
const prepare=Function('return ('+source.slice(start,end).trim()+');')();
function fixture(playing,result=true){
 const calls=[],snapshot=Object.freeze({source:'ordinary-retained.mp3',time:42.5,playing,base:.35,coefficient:1});
 const current={clock:{assert(){}},p0:{audio:snapshot},audioFailures:[],audio:{setBase:v=>calls.push(['base',v]),setLevel:v=>calls.push(['gain',v]),async resume(s){calls.push(['resume',s]);if(result instanceof Error)throw result;return result;}}};
 return {current,calls,snapshot};
}
test('black preparation retains P0 source/time and never plays stopped or playing P0',async()=>{for(const playing of [true,false]){const f=fixture(playing);await prepare(f.current);assert.deepEqual(f.calls,[['base',.35],['gain',0],['resume',{...f.snapshot,playing:false}]]);assert.equal(f.current.p0.audio,f.snapshot);assert.equal(f.snapshot.playing,playing);assert.deepEqual(f.current.audioFailures,[]);}});
test('preparation rejection/false is recorded without blocking visual restoration',async()=>{for(const failure of [false,new Error('seek rejected')]){const f=fixture(true,failure);await prepare(f.current);assert.equal(f.current.audioFailures.length,1);assert.match(f.current.audioFailures[0],/^P0-prepare/);assert.equal(f.calls[1][1],0);assert.equal(f.calls[2][1].playing,false);}});
test('preparation follows current verification under black; actual P0 playing state is used only at reveal',()=>{assert.match(source,/if\(!scene\.verify\(current\.p0\)\.completed\)throw new Error\('P0 verification failed'\);[\s\S]*visibility\?\.set\('shion',1\);visibility\?\.set\('shiopon',0\);visibility\?\.set\('lumiere',0\);[\s\S]*current\.restored=true;await preparePresentAudio\(current\)/);assert.match(source,/resumePresentAudio\(\)\{current\.futureAudio\?\.pause\('PRESENT'\);audio\.setBase\(current\.p0\.audio\.base\);audio\.setLevel\(0\);safeResume\(current\.p0\.audio,'P0'\)/);assert.match(source,/presentAudioLevel:p=>audio\.setLevel\(p\*current\.p0\.audio\.coefficient\)/);assert.doesNotMatch(source,/audio\.src\s*=/);});
