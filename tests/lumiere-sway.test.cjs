const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");
const root = path.resolve(__dirname, "..");

function harness() {
  let allocations = 0, reads = 0, writes = 0;
  const calls = [];
  const ctx = {
    drawImage(...args) { calls.push({ args, alpha:this.globalAlpha, mode:this.globalCompositeOperation }); },
    clearRect(...args) { calls.push({ clear:args }); },
    getImageData(x,y,w,h) { reads++; return { data:new Uint8ClampedArray(w*h*4).fill(255) }; },
    createImageData(w,h) { return { data:new Uint8ClampedArray(w*h*4) }; },
    putImageData() { writes++; },
  };
  const window = {};
  vm.runInNewContext(fs.readFileSync(path.join(root,"lumiere-sway.js"),"utf8"), {
    window, document:{ createElement() { allocations++; return { width:0,height:0,getContext:()=>ctx }; } },
  });
  return { api:window.TarotLumiereSway, calls,
    counts:()=>({ allocations,reads,writes }) };
}

test("local sway has fixed roots/perimeter and bounded smooth displacement", () => {
  const { api } = harness();
  for (const p of [0,0.1,0.5,0.9,1]) {
    assert.equal(api.weight(0,p),0); assert.equal(api.weight(1,p),0);
    assert.equal(api.weight(p,0),0); assert.equal(api.weight(p,1),0);
  }
  for(let i=0;i<=100;i++)for(let j=0;j<=100;j++) {
    const w=api.weight(i/100,j/100);assert(w>=0&&w<=1);
  }
  for(const kind of ["hair","hem"])for(let i=0;i<=624;i++) {
    const phase=i*2*Math.PI/312;
    assert(Math.abs(api.motion(kind,phase))<=1);
    assert(Math.abs(api.motion(kind,phase)-api.motion(kind,phase+2*Math.PI))<1e-12);
  }
  // Candidate C shifts visually readable motion toward the free tips.
  // The root and entire tile perimeter must remain strictly fixed.
  assert(api.weight(.5,.8) > .95, "free-tip band should move strongly");
  assert(api.weight(.5,.15) < .25, "attachment region must be quiet");
  assert(api.weight(.5,.96) < .4, "end boundary must taper smoothly");
  assert(api.weight(.05,.8) < .25, "side seams must remain stable");
  assert.notEqual(api.motion("hair",1.2),api.motion("hem",1.2),
    "hair and hem should follow at different delays");
    assert.throws(()=>api.motion("hair",NaN),/phase/);
});

test("all four source regions exclude conservative fixed face/torso/legs/wings areas", () => {
  const { api } = harness();
  const protectedRects = {
    down:[[475,200,265,500],[535,700,165,485],[180,175,900,310]],
    up:[[545,75,170,1060],[180,175,900,315]],
    left:[[290,215,290,210],[350,425,365,320],[553,930,117,225],[645,150,370,415]],
    right:[[715,180,245,225],[660,405,250,325],[540,960,172,200],[205,120,445,315]],
  };
  for(const direction of ["down","up","left","right"]) {
    const list=api.getRegions(direction);assert(list.some(r=>r[4]==="hair"));assert(list.some(r=>r[4]==="hem"));
    for(const [x,y,w,h] of list) {
      assert(x>=0&&y>=0&&x+w<=1254&&y+h<=1254);
      for(const [px,py,pw,ph] of protectedRects[direction])
        assert(x+w<=px||x>=px+pw||y+h<=py||y>=py+ph,direction+" fixed region overlap");
    }
  }
});

test("sway caches build only at readiness and reuse capacity during two cycles and A/B", () => {
  const { api,counts,calls }=harness();
  const manifest=JSON.parse(fs.readFileSync(path.join(root,"assets/sprites/lumiere/lumiere_sprite_manifest.json")));
  for(const direction of ["down","up","left","right"]) {
    const pose=manifest.poses[direction];
    const compositor=api.create({naturalWidth:1254,naturalHeight:1254},pose);
    const initial=counts(),canvas=compositor.canvas;
    for(let i=0;i<624;i++)assert.equal(compositor.draw(i*2*Math.PI/312),canvas);
    api.setEnabled(false);assert.equal(compositor.draw(0),canvas);
    api.setEnabled(true);assert.equal(compositor.draw(0),canvas);
    assert.deepEqual(counts(),initial);
    assert(compositor.width/(1254*(63.984375/(pose.baseline_y-pose.body_top)))>=2.44);
    assert(compositor.cacheBytes<1024*1024);
    assert.equal(calls.at(-1).mode,"lighter");
  }
  assert.throws(()=>api.create({naturalWidth:1,naturalHeight:1},manifest.poses.down),/source/);
  assert.throws(()=>api.create({naturalWidth:1254,naturalHeight:1254},
    {...manifest.poses.down,body_top:1167}),/capacity/);
});

test("Candidate C envelope keeps visible motion close to the free tips, not the anchor", () => {
  const {api} = harness();
  for (const direction of ["down","up","left","right"]) {
    for (const region of api.getRegions(direction)) {
      const nearRoot=api.weight(0.5,0.15);
      const nearTip=api.weight(0.5,0.8);
      assert(nearTip > nearRoot*4, direction+" free tip should move more than root");
      assert.equal(api.weight(0.5,1),0);
      assert.equal(api.weight(0,0.8),0);
      assert.equal(api.weight(1,0.8),0);
    }
  }
});

test("Candidate C uses one periodic phase with distinct hair and hem follow delays", () => {
  const {api} = harness();
  let different=false;
  for (let step=0; step<=520; step++) {
    const phase=step*Math.PI*2/520;
    const a=api.motion("hair",phase);
    const b=api.motion("hem",phase);
    if(Math.abs(a-b)>0.01)different=true;
    assert(Math.abs(a-api.motion("hair",phase+2*Math.PI))<1e-12);
    assert(Math.abs(b-api.motion("hem",phase+2*Math.PI))<1e-12);
  }
  assert(different,"the hem should follow the hair at its own phase delay");
});

test("Candidate C exposes actual amplitudes and initialization-only pixel diagnostics", () => {
  const {api,counts} = harness();
  assert.equal(api.config.candidate,"C");
  assert.equal(api.config.amplitude.hair,2.2);
  assert.equal(api.config.amplitude.hem,1.35);
  assert.equal(api.config.bobPeriod,5.2);
  assert.equal(api.getDiagnostics("down"),null);
  const manifest=JSON.parse(fs.readFileSync(path.join(root,
    "assets/sprites/lumiere/lumiere_sprite_manifest.json")));
  const compositor=api.create({naturalWidth:1254,naturalHeight:1254},manifest.poses.down);
  const result=api.getDiagnostics("down");
  assert.equal(result.direction,"down");
  assert(result.foreground>0);
  assert.equal(result.regions.length,4);
  // Uniform mock RGBA means no visible differences; only a real source asset
  // can establish active hair/hem silhouettes.
  assert.equal(result.changed,0);
  assert.equal(result.silhouette,0);
  const before=counts();
  for(let i=0;i<625;i++) compositor.draw(i*2*Math.PI/312);
  assert.deepEqual(counts(),before);
});

test("Candidate C never folds a narrow curl: horizontal inverse-mesh slope stays bounded", () => {
  const {api} = harness();
  const manifest=JSON.parse(fs.readFileSync(path.join(root,
    "assets/sprites/lumiere/lumiere_sprite_manifest.json")));
  for(const direction of ["down","up","left","right"]) {
    const pose=manifest.poses[direction];
    const compositor=api.create({naturalWidth:1254,naturalHeight:1254},pose);
    const density=(compositor.width/1254)/(63.984375/(pose.baseline_y-pose.body_top));
    const diag=api.getDiagnostics(direction);
    assert.equal(diag.regions.length,api.getRegions(direction).length);
    for(let i=0;i<diag.regions.length;i++) {
      const m=diag.regions[i], region=compositor.regions[i];
      assert(m.maxReference<=api.config.amplitude[m.kind]+1e-12);
      assert(m.maxReference*density*Math.PI/(region.w-1) <= 0.801,
        direction+" "+m.kind+" can fold its inverse mesh");
      assert(m.maxReference>0);
    }
  }
});
