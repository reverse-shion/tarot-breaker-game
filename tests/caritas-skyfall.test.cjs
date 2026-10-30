"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),vm=require("node:vm"),fs=require("node:fs"),path=require("node:path");
const source=fs.readFileSync(path.join(__dirname,"../hoshisuna-main-game.js"),"utf8");
function fixture({originY=0,reduced=false}={}){
  const draws=[],trails=[];let surfaces=0;
  const gradient=()=>({addColorStop(){}});
  const sprite={createRadialGradient:gradient,fillRect(){},beginPath(){},moveTo(){},lineTo(){},closePath(){},fill(){},arc(){}};
  const stack=[];
  const ctx={globalAlpha:.8,imageSmoothingEnabled:false,
    save(){stack.push(this.globalAlpha);},restore(){this.globalAlpha=stack.pop();},
    createLinearGradient(...a){trails.push(a);return gradient();},
    beginPath(){},moveTo(){},lineTo(){},stroke(){},
    drawImage(...a){draws.push({alpha:this.globalAlpha,args:a});}};
  const scope={ctx,Math,caritasOwnerStarAtlas:null,
    document:{createElement(){surfaces++;return {getContext:()=>sprite};}},
    viewportOrigin:()=>({y:originY}),window:{matchMedia:()=>({matches:reduced})}};
  vm.createContext(scope);
  vm.runInContext(source.slice(source.indexOf("  const caritasOwnerSmooth ="),source.indexOf("  function getCaritasOwnerBlendSurface()")),scope);
  return {scope,ctx,draws,trails,surfaces:()=>surfaces,paint(ms){draws.length=0;trails.length=0;scope.paintCaritasSkyfall(120,300,40,ms);return draws;}};
}
test("skyfall respects the quiet 800ms anticipation and ends before the revealed body",()=>{
  const f=fixture();
  for(const ms of [0,100,500,799,800,2650,3000,5500])assert.equal(f.paint(ms).length,0);
  assert.equal(f.surfaces(),0,"no effect resource allocation during anticipation or final hold");
});
test("every star descends from sky toward Shiopon with a trailing tail, deterministically",()=>{
  const f=fixture();
  for(let index=0;index<40;index++){
    let lastY=-24;
    const birth=800+index*23,duration=700+(index%5)*55;
    for(let step=1;step<20;step++){
      const ms=birth+duration*step/20;
      const mote=f.scope.caritasSkyMoteAt(index,ms,120,-24,276);
      assert.ok(mote.head.y>lastY&&mote.head.y<276,"downward progress only, never ground-to-sky");
      assert.ok(mote.tail.y<=mote.head.y);
      assert.ok(mote.alpha>0&&mote.alpha<=1);
      assert.deepEqual(mote,f.scope.caritasSkyMoteAt(index,ms,120,-24,276),"pause cannot resample random particles");
      lastY=mote.head.y;
    }
    const end=f.scope.caritasSkyMoteAt(index,birth+duration*.999,120,-24,276);
    assert.ok(Math.abs(end.head.x-120)<9,"stars converge onto the actor");
    assert.equal(f.scope.caritasSkyMoteAt(index,birth-1,120,-24,276),null);
    assert.equal(f.scope.caritasSkyMoteAt(index,birth+duration,120,-24,276),null);
  }
});
test("sky trails adapt to camera top, reuse a three-colour sprite atlas, and preserve canvas alpha",()=>{
  for(const originY of [0,140]){
    const f=fixture({originY});assert.ok(f.paint(1400).length>0);
    for(const [tx,ty,hx,hy] of f.trails){assert.ok(hy>ty);assert.ok([tx,ty,hx,hy].every(Number.isFinite));}
    for(const c of f.draws){assert.ok(c.alpha<=.8);assert.ok([0,32,64].includes(c.args[1]));assert.deepEqual(c.args.slice(3,5),[32,32]);}
    assert.equal(f.ctx.globalAlpha,.8);
    f.paint(1750);f.paint(2200);assert.equal(f.surfaces(),1);
  }
});
test("reduced motion keeps light but removes falling trails and vertical travel",()=>{
  const f=fixture({reduced:true});assert.ok(f.paint(1400).length>0);assert.equal(f.trails.length,0);
  assert.equal(f.ctx.globalAlpha,.8);
  assert.ok(f.draws.every(c=>c.args[6]+c.args[8]/2>=231&&c.args[6]+c.args[8]/2<=276));
});
