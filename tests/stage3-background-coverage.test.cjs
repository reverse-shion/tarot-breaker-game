'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('game.js','utf8');
const body=source.slice(source.indexOf('  function stage3BackgroundBounds('),source.indexOf('  let normalCameraZoom = 1;'));
const context={};vm.createContext(context);vm.runInContext(body+';this.bounds=stage3BackgroundBounds;',context);
test('real background plane covers portrait and landscape throughout absorption including outside anchors',()=>{
 for(const [w,h] of [[390,844],[844,390]])for(const [x,y] of [[0,0],[w,h],[w/2,h/2],[-100,-100],[w+100,h+100],[117.766,38.438]]){
  const b=context.bounds(w,h,{x,y});for(const scale of [1,.99,.95,.9]){
   const left=x+scale*(b.left-x),top=y+scale*(b.top-y);
   assert.ok(left<=0&&top<=0,JSON.stringify({w,h,x,y,scale,b}));
   assert.ok(left+b.width*scale>=w&&top+b.height*scale>=h);
  }
  assert.equal(b.left+(-b.left+43),43);assert.equal(b.top+(-b.top+71),71);
 }
});
