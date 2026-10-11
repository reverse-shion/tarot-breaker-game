// Local software-Canvas evidence only. @napi-rs/canvas is supplied by the
// analysis environment; this tool is not a production or CI dependency.
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const { createCanvas, loadImage } = require("@napi-rs/canvas");
const root = path.resolve(__dirname,"..");
const dest = path.resolve(process.argv[2] || path.join(root,"docs/lumiere-hover-evidence/sway-pixel-proof"));
fs.mkdirSync(dest,{recursive:true});
let allocations=0, reads=0, writes=0;
const window = {}, document = { createElement() {
  allocations++;
  const canvas=createCanvas(1,1), get=canvas.getContext.bind(canvas);
  canvas.getContext=type=>{
    const ctx=get(type);
    if(!ctx.__tracked) {
      ctx.__tracked=true;
      const read=ctx.getImageData.bind(ctx),write=ctx.putImageData.bind(ctx);
      ctx.__evidenceRead=read;
      ctx.getImageData=(...args)=>{reads++;return read(...args)};
      ctx.putImageData=(...args)=>{writes++;return write(...args)};
    }
    return ctx;
  };
  return canvas;
} };
const source=fs.readFileSync(path.join(root,"lumiere-sway.js"),"utf8");
vm.runInNewContext(source,{window,document});
const api=window.TarotLumiereSway;
const manifest=JSON.parse(fs.readFileSync(path.join(root,"assets/sprites/lumiere/lumiere_sprite_manifest.json")));
const report={engine:"@napi-rs/canvas software rendering, NOT Safari or Device PASS",
  moduleSha256:crypto.createHash("sha256").update(source).digest("hex"),directions:[]};
const contact=createCanvas(1050,1240),paint=contact.getContext("2d");
paint.font="18px sans-serif";
(async()=>{
  let row=0;
  for(const [direction,file] of Object.entries(manifest.files)) {
    const image=await loadImage(path.join(root,"assets/sprites/lumiere",file));
    image.naturalWidth=image.width;image.naturalHeight=image.height;
    const comp=api.create(image,manifest.poses[direction]);
    const ctx=comp.canvas.getContext("2d"),{width,height}=comp;
    api.setEnabled(false);comp.draw(0);
    const baseline=Buffer.from(ctx.getImageData(0,0,width,height).data);
    const reference=createCanvas(width,height),ref=reference.getContext("2d");
    ref.imageSmoothingEnabled=true;ref.imageSmoothingQuality="high";
    ref.drawImage(image,0,0,width,height);
    assert(baseline.equals(Buffer.from(ref.getImageData(0,0,width,height).data)),"zero motion identity");
    const probes=[...Array(32)].map((_,i)=>i*2*Math.PI/32);
    probes.push(0.22*2*Math.PI/5.2+Math.PI/2,0.22*2*Math.PI/5.2+3*Math.PI/2);
    api.setEnabled(true);
    const counters={allocations,reads,writes},samples=[];
    for(const phase of probes) {
      comp.draw(phase);
      // Bypass the tracked runtime context for evidence readback.
      const pixels=ctx.__evidenceRead(0,0,width,height).data;
      let outside=0,border=0,inside=0;
      for(let y=0;y<height;y++)for(let x=0;x<width;x++) {
        const index=(y*width+x)*4;
        if(baseline.subarray(index,index+4).equals(Buffer.from(pixels.subarray(index,index+4))))continue;
        const tile=comp.regions.find(r=>x>=r.x&&x<r.x+r.w&&y>=r.y&&y<r.y+r.h);
        if(!tile)outside++;
        else if(x===tile.x||x===tile.x+tile.w-1||y===tile.y||y===tile.y+tile.h-1)border++;
        else inside++;
      }
      assert.equal(outside,0,direction+" outside region changed");
      assert.equal(border,0,direction+" root/perimeter changed");
      assert(inside>0,direction+" sway absent");
      samples.push({phase,outside,border,inside});
    }
    assert.deepEqual({allocations,reads,writes},counters,"runtime allocation/read/write");
    report.directions.push({direction,width,height,cacheBytes:comp.cacheBytes,
      originalAssetSha256:manifest.poses[direction].sha256,regions:comp.regions,
      zeroMotionIdentical:true,perFrameAllocations:0,perFrameReadbacks:0,perFramePixelWrites:0,samples});
    const columns=[{phase:0,enabled:false,label:"fixed",bg:"#fff"},
      {phase:probes.at(-2),enabled:true,label:"hair +max",bg:"#141529"},
      {phase:probes.at(-1),enabled:true,label:"hair -max",bg:"#ecd7f2"}];
    columns.forEach((c,col)=>{
      const x=col*350,y=row*310;paint.fillStyle=c.bg;paint.fillRect(x,y,350,310);
      api.setEnabled(c.enabled);comp.draw(c.phase);
      paint.drawImage(comp.canvas,x+40,y+25,280,280);
      paint.fillStyle=col===1?"#fff":"#111";paint.fillText(direction+" / "+c.label,x+10,y+20);
    });
    row++;
  }
  api.setEnabled(true);
  report.totalCacheBytes=report.directions.reduce((n,d)=>n+d.cacheBytes,0);
  fs.writeFileSync(path.join(dest,"metrics.json"),JSON.stringify(report,null,2)+"\n");
  fs.writeFileSync(path.join(dest,"contact.png"),contact.toBuffer("image/png"));
  console.log("Four directions, zero-motion identity, 34 phases protected/root/perimeter unchanged, no frame allocations/readbacks/writes PASS");
  console.log("Total extra RGBA cache bytes:",report.totalCacheBytes);
})().catch(error=>{console.error(error);process.exitCode=1;});
