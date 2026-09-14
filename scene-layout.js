/* Reference-space scene geometry. Visual masks never grant permission to walk. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.TarotSceneLayout = factory();
})(typeof window === "object" ? window : this, function () {
  "use strict";
  const referenceSize = { width: 1448, height: 1086 };
  // The split foreground artwork sits about 12 reference pixels to the right
  // of the avenue centre in the reconstructed scene. Keep the authored ground,
  // fountain and collision centreline fixed, and bring only the foreground
  // cutout back onto the original avenue axis.
  const foregroundOffset = Object.freeze({ x: -12, y: 0 });
  const shiftPoints = (points, dx = 0, dy = 0) => points.map(([x,y]) => [x+dx,y+dy]);
  const shiftShape = (shape, dx = 0, dy = 0) => {
    if (shape.type === "ellipse") return {...shape,cx:shape.cx+dx,cy:shape.cy+dy};
    return {...shape,points:shiftPoints(shape.points,dx,dy)};
  };
  // The opening is at source x=720, not at the image centre (724).
  // Align it to the stair star/centreline at x=800; Lumiere stays at (810,212).
  const gate = { x: 800 - 720 * 560 / 1448, y: -70, w: 560, h: 420,
    openingX: 800, baseline: 242 };
  const legacyGate = [[629,0],[997,0],[997,269],[946,281],[881,278],
    [866,253],[763,253],[749,285],[685,283],[629,263]];
  const rect = (x,y,w,h) => ({type:"poly",points:[[x,y],[x+w,y],[x+w,y+h],[x,y+h]]});
  const occluder = (id, bounds, baseline, footArea, source="foreground", points=null) => {
    const dx = source === "foreground" ? foregroundOffset.x : 0;
    const dy = source === "foreground" ? foregroundOffset.y : 0;
    const [x,y,w,h] = bounds;
    return {
      id,
      bounds:[x+dx,y+dy,w,h],
      baseline:baseline+dy,
      footArea:shiftShape(footArea,dx,dy),
      source,
      points:shiftPoints(points || rect(...bounds).points,dx,dy),
    };
  };
  // Only real, local floor behind a visual may activate it. The long bridge
  // supports hanging in empty sky are background, never occluders.
  const occluders = [
    occluder("west-bridge-post",[215,365,63,101],448,rect(215,398,67,50)),
    occluder("west-court-post",[558,374,60,100],463,rect(554,426,74,37)),
    occluder("west-stair-post",[690,271,63,151],418,rect(696,367,73,51)),
    occluder("east-stair-post",[881,271,61,151],418,rect(864,367,76,51)),
    occluder("east-court-post",[997,370,60,103],463,rect(988,425,75,38)),
    occluder("east-bridge-post",[1213,436,66,115],532,rect(1200,470,85,62)),
    occluder("east-gazebo-post",[1410,307,38,177],471,rect(1390,414,58,57)),
    occluder("west-flower-front",[672,680,81,31],707,rect(692,666,73,41)),
    occluder("east-flower-front",[872,680,76,31],707,rect(861,666,75,41)),
    occluder("west-lower-flower-front",[647,879,83,31],902,rect(691,859,52,43)),
    occluder("east-lower-flower-front",[891,879,81,31],902,rect(878,859,65,43)),
    occluder("west-lower-post",[566,799,81,139],926,rect(597,868,78,58)),
    occluder("east-lower-post",[992,799,76,139],926,rect(965,868,83,58)),
    occluder("gate-west-pillar",[743,65,34,181],242,rect(740,198,41,44),"gate"),
    occluder("gate-east-pillar",[830,65,34,181],242,rect(824,198,44,44),"gate"),
    occluder("gate-arch",[763,27,76,136],242,rect(772,180,57,62),"gate"),
    // Only the raised front rim; the basin and crystal stay behind actors.
    occluder("fountain-front-rim",[625,543,350,66],608,rect(617,519,366,89),"fountain",
      [[627,543],[662,566],[706,585],[751,596],[800,600],[850,596],[895,585],[940,566],[973,543],[973,609],[625,609]])
  ];
  // Small physical footprints, independent of masks. The authored walk polygons
  // remain untouched; these only make the placed objects solid. Foreground
  // posts follow the same horizontal correction as their visible cutout.
  const solidBases = [
    {type:"ellipse",cx:800,cy:533,rx:170,ry:75},
    rect(746,233,28,15), rect(831,233,28,15),
    shiftShape({type:"ellipse",cx:584,cy:452,rx:14,ry:9},foregroundOffset.x,foregroundOffset.y),
    shiftShape({type:"ellipse",cx:1025,cy:452,rx:14,ry:9},foregroundOffset.x,foregroundOffset.y),
    shiftShape({type:"ellipse",cx:242,cy:438,rx:13,ry:8},foregroundOffset.x,foregroundOffset.y),
    shiftShape({type:"ellipse",cx:1238,cy:528,rx:15,ry:10},foregroundOffset.x,foregroundOffset.y)
  ];
  function contains(point, shape) {
    if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) return false;
    if (shape.type==="ellipse") return ((point.x-shape.cx)/shape.rx)**2+((point.y-shape.cy)/shape.ry)**2<=1;
    let inside=false;
    for(let i=0,j=shape.points.length-1;i<shape.points.length;j=i++) {
      const [x1,y1]=shape.points[j],[x2,y2]=shape.points[i];
      const cross=(point.x-x1)*(y2-y1)-(point.y-y1)*(x2-x1);
      if(Math.abs(cross)<1e-7 && point.x>=Math.min(x1,x2) && point.x<=Math.max(x1,x2) && point.y>=Math.min(y1,y2) && point.y<=Math.max(y1,y2)) return true;
      if((y1>point.y)!==(y2>point.y) && point.x<(x2-x1)*(point.y-y1)/(y2-y1)+x1) inside=!inside;
    }
    return inside;
  }
  function activeOccluders(foot, areas=occluders) {
    return areas.filter(area => foot.y < area.baseline && contains(foot,area.footArea));
  }
  function trace(ctx, points) {
    ctx.beginPath(); ctx.moveTo(...points[0]);
    for (const point of points.slice(1)) ctx.lineTo(...point);
    ctx.closePath();
  }
  function removeLegacyGate(ctx, dx = 0, dy = 0) {
    ctx.save(); ctx.globalCompositeOperation = "destination-out";
    trace(ctx,shiftPoints(legacyGate,dx,dy)); ctx.fill(); ctx.restore();
  }
  // Reuse the supplied star-sky behind a clipped hole. Source WebPs stay intact;
  // no regenerated architecture, image re-encoding or opaque cover over actors.
  function paintBackground(ctx, background, sky) {
    ctx.clearRect(0,0,1448,1086);
    ctx.drawImage(background,0,0,1448,1086);
    const fill = ctx.createLinearGradient(0,0,0,290);
    fill.addColorStop(0,"#263b76"); fill.addColorStop(1,"#9b95ce");
    // Soften only OUTSIDE the removal boundary: no old arch pixels survive
    // in the opaque centre, and the reused sky has no hard rectangular seam.
    for(let band=16;band>=0;band-=2) {
      const points=legacyGate.map(([x,y])=>[800+(x-800)*(1+band/175),140+(y-140)*(1+band/175)]);
      ctx.save();trace(ctx,points);ctx.clip();ctx.globalAlpha=band===0?1:.2;
      ctx.fillStyle=fill;ctx.fillRect(0,0,1448,1086);
      ctx.drawImage(sky,0,0,1448,1086);ctx.restore();
    }
  }
  function paintForeground(ctx, foreground) {
    ctx.clearRect(0,0,1448,1086);
    ctx.drawImage(foreground,foregroundOffset.x,foregroundOffset.y,1448,1086);
    removeLegacyGate(ctx,foregroundOffset.x,foregroundOffset.y);
  }
  // Derive two runtime masks from the existing artwork. The upright crystal
  // uses its own blue facet texture underneath the removed gold crossing;
  // only the detached gold gimbal rotates. No new raster asset is required.
  function splitCrystal(core, ring, image) {
    const w=image.naturalWidth || image.width, h=image.naturalHeight || image.height;
    core.clearRect(0,0,w,h);core.drawImage(image,0,0,w,h);
    const original=core.getImageData(0,0,w,h);
    // Keep the tip ornaments. Reuse the unobstructed upper blue facets to
    // complete the upright body beneath the source's broad star/metal bands.
    core.clearRect(0,140*h/1254,w,970*h/1254);
    core.save();core.scale(w/1254,h/1254);
    const silhouette=[[624,136],[747,355],[754,580],[738,744],[693,930],[638,1107],[621,1107],[550,938],[510,752],[493,577],[505,355]];
    trace(core,silhouette);core.clip();
    const blue=core.createLinearGradient(493,0,755,0);
    blue.addColorStop(0,"#ecf7ff");blue.addColorStop(.22,"#aea7ff");blue.addColorStop(.42,"#6057f3");
    blue.addColorStop(.65,"#aaa6ff");blue.addColorStop(.87,"#e9f2ff");blue.addColorStop(1,"#7779ef");
    core.fillStyle=blue;core.fillRect(490,136,270,974);
    core.drawImage(image,495*w/1254,150*h/1254,270*w/1254,168*h/1254,495,136,270,974);
    core.restore();
    const restored=core.getImageData(0,0,w,h);
    const star={type:"poly",points:[[628,450],[674,594],[820,656],[671,710],[628,830],[583,710],[434,655],[582,605]]};
    for(let y=Math.ceil(136*h/1254);y<1110*h/1254;y++) for(let x=Math.ceil(490*w/1254);x<760*w/1254;x++) {
      const i=(y*w+x)*4,p=original.data.subarray(i,i+4),point={x:x*1254/w,y:y*1254/h};
      const gold=p[0]>p[2]*1.06 && p[1]>p[0]*.54;
      if(p[3]>240 && !gold && !contains(point,star) && contains(point,{type:"poly",points:silhouette})) restored.data.set(p,i);
    }
    core.putImageData(restored,0,0);
    // The source hides its rear ring behind the crystal. Trace the same three
    // gold hoops as complete paths instead of rotating those missing pixels.
    // This is a lightweight code-native gimbal, with colours/shapes taken from
    // the supplied artwork; the crystal itself remains the supplied texture.
    ring.clearRect(0,0,w,h);ring.save();ring.scale(w/1254,h/1254);
    const metal=ring.createLinearGradient(210,350,1020,950);
    metal.addColorStop(0,"#a56922");metal.addColorStop(.2,"#f7cf72");
    metal.addColorStop(.42,"#d89432");metal.addColorStop(.6,"#fff1b7");metal.addColorStop(1,"#a66b24");
    for(const [rx,ry,angle] of [[400,127,0],[384,260,.38],[384,260,-.38]]) {
      ring.beginPath();ring.ellipse(627,665,rx,ry,angle,0,Math.PI*2);
      ring.strokeStyle="#865522";ring.lineWidth=22;ring.stroke();
      ring.strokeStyle=metal;ring.lineWidth=15;ring.stroke();
      ring.strokeStyle="rgba(255,243,193,.7)";ring.lineWidth=2;ring.stroke();
    }
    for(const [cx,cy,radius] of [[227,665,38],[1027,665,38],[627,538,29],[627,792,29],[627,665,90]]) {
      ring.beginPath();
      for(let i=0;i<8;i++) {
        const angle=i*Math.PI/4-Math.PI/2, r=i%2?radius*.23:radius;
        const x=cx+Math.cos(angle)*r,y=cy+Math.sin(angle)*r;
        if(i)ring.lineTo(x,y);else ring.moveTo(x,y);
      }
      ring.closePath();ring.fillStyle=metal;ring.fill();ring.lineWidth=3;
      ring.strokeStyle="#fff0b9";ring.stroke();
    }
    ring.restore();
  }
  return { referenceSize, foregroundOffset, gate, legacyGate, rect, trace, removeLegacyGate,
    occluders, solidBases, contains, activeOccluders,
    paintBackground, paintForeground, splitCrystal };
});
