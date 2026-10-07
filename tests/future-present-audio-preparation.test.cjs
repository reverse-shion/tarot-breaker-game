'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const source=fs.readFileSync('star-gate-anomaly.js','utf8');
const start=source.indexOf('async function preparePresentAudio('),end=source.indexOf('async function recoverPresent(',start);
const prepare=Function('return ('+source.slice(start,end).trim()+');')();
function fixture(playing,result=true){
 const calls=[],snapshot=Object.freeze({source:'ordinary-retained.mp3',time:42.5,playing,base:.35,coefficient:1});
 const current={clock:{assert(){}},p0:{audio:snapshot},audioFailures:[],audio:{
  setBase:v=>calls.push(['base',v]),setLevel:v=>calls.push(['gain',v]),
  holdSilent(){calls.push(['holdSilent']);return true;},
  prepareSilent(s){calls.push(['prepareSilent',s]);if(result instanceof Error)throw result;return result;}
 }};
 return {current,calls,snapshot};
}
test('black preparation retains P0 source/time while keeping the unlocked transport silent',async()=>{for(const playing of [true,false]){const f=fixture(playing);await prepare(f.current);assert.deepEqual(f.calls,[['base',.35],['gain',0],['holdSilent'],['prepareSilent',f.snapshot]]);assert.equal(f.current.p0.audio,f.snapshot);assert.equal(f.snapshot.playing,playing);assert.deepEqual(f.current.audioFailures,[]);}});
test('silent-transport preparation rejection/false is recorded without blocking visual restoration',async()=>{for(const failure of [false,new Error('seek rejected')]){const f=fixture(true,failure);await prepare(f.current);assert.equal(f.current.audioFailures.length,1);assert.match(f.current.audioFailures[0],/^P0-prepare/);assert.equal(f.calls[1][1],0);assert.equal(f.calls[2][0],'holdSilent');assert.equal(f.calls[3][0],'prepareSilent');}});
test('blackout stays silent and present reveal never asks iOS for a fresh play()',()=>{assert.match(source,/if\(!scene\.verify\(current\.p0\)\.completed\)throw new Error\('P0 verification failed'\);[\s\S]*visibility\?\.set\('shion',1\);visibility\?\.set\('shiopon',0\);visibility\?\.set\('lumiere',0\);[\s\S]*current\.restored=true;await preparePresentAudio\(current\)/);assert.match(source,/async presentVisible\(\)\{await scene\.waitDraw\(\);current\.clock\.assert\(\);await scene\.waitDraw\(\);current\.clock\.assert\(\);\}/);assert.match(source,/resumePresentAudio\(\)\{[\s\S]*audio\.setLevel\(0\);[\s\S]*audio\.revealSilent\(current\.p0\.audio\)[\s\S]*audio\.tweenCoefficient\(current\.p0\.audio\.coefficient,360,false\)/);assert.match(source,/preparePresentAudio\(current\)[\s\S]*holdSilent\(\)[\s\S]*prepareSilent\(current\.p0\.audio\)/);assert.match(source,/await recoveryClock\.tween\(550,p=>\{black\.style\.opacity=String\(1-p\);\}\);[\s\S]*await current\.scene\.waitDraw\(\);await current\.scene\.waitDraw\(\);[\s\S]*current\.audio\.revealSilent\(current\.p0\.audio\)/);assert.doesNotMatch(source,/safeResume\(current\.p0\.audio/);assert.doesNotMatch(source,/audio\.src\s*=/);});
