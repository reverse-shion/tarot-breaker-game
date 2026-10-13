'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');

test('both future media requests opt into anonymous CORS before starting their load',()=>{
 const requests=[];
 class Audio{
  constructor(src){if(src!==undefined)this.src=src;}
  set src(value){requests.push({url:value,cors:this.crossOrigin});}
  pause(){} addEventListener(){} removeEventListener(){}
 }
 class Context{
  constructor(){this.currentTime=0;this.destination={};}
  createMediaElementSource(){return{connect(){},disconnect(){}};}
  createGain(){return{gain:{value:0,cancelScheduledValues(){}},connect(){},disconnect(){}};}
 }
 const window={__TAROT_DEV_STAGE3__:true,TarotAudio:{enabled:false},AudioContext:Context,addEventListener(){},removeEventListener(){}};
 const document={hidden:false,addEventListener(){},removeEventListener(){}};
 vm.runInNewContext(fs.readFileSync('future-vision-audio.js','utf8'),{window,document,Audio,location:{search:'?dev=star-gate-full'},URLSearchParams,requestAnimationFrame:()=>1,cancelAnimationFrame(){}});
 const failures=[],api=window.TarotFutureVisionAudio.create({clock:{now:()=>0},signal:new AbortController().signal,failures,id:1});
 assert.deepEqual(requests,[{url:'./assets/audio/bgm/future_ruins.mp3',cors:'anonymous'},{url:'./assets/audio/bgm/future_fix.mp3',cors:'anonymous'}]);
 assert.deepEqual(failures,[]);api.dispose();
});
