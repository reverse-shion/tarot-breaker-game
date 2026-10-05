'use strict';
const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const vm=require('node:vm');
const source=fs.readFileSync('star-gate-anomaly.js','utf8');
const functionSource=source.slice(source.indexOf('async function showArcanaDetail(){'),source.indexOf('function makeUi(){'));
function harness({abort=false,decoded=true}={}){
 let time=0,attached=[],waits=[];const card={naturalWidth:decoded?853:0,naturalHeight:1280,cloneNode(){return {}}};
 const clock={now:()=>time,assert(){},async wait(ms){waits.push(ms);time+=ms;if(abort)throw new Error('cancelled');}};
 const session={clock};const context={session,preparedImages:new Map([['detail.png',card]]),ASSETS:{cardDetail:'detail.png'},document:{createElement(){return{setAttribute(){},appendChild(card){this.card=card},remove(){attached=attached.filter(n=>n!==this)}}},body:{appendChild(layer){attached.push(layer)}}}};
 vm.createContext(context);vm.runInContext(functionSource+';this.show=showArcanaDetail;',context);
 return {run:()=>context.show(),session,waits,attached:()=>attached};
}
test('real detail helper displays prepared altered card for 1000ms then releases layer',async()=>{
 const h=harness();await h.run();assert.deepEqual(h.waits,[1000]);assert.equal(h.session.cardDetail.source,'detail.png');assert.equal(h.session.cardDetail.endedAt-h.session.cardDetail.startedAt,1000);assert.equal(h.attached().length,0);
});
test('detail cancellation releases its overlay while propagating to existing P0 recovery',async()=>{
 const h=harness({abort:true});await assert.rejects(h.run(),/cancelled/);assert.equal(h.attached().length,0);
});
test('detail refuses an unprepared image without displaying an overlay',async()=>{
 const h=harness({decoded:false});await assert.rejects(h.run(),/not decoded/);assert.equal(h.attached().length,0);assert.deepEqual(h.waits,[]);
});
