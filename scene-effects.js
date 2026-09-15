(() => {
  "use strict";

  const shell = document.getElementById("game-shell");
  const map = document.getElementById("map-layer");
  if (!shell || !map) return;

  const REF = { w: 1448, h: 1086 };
  const worldLayers = [...document.querySelectorAll("[data-scene-world]")];
  const objectLayers = [...document.querySelectorAll("[data-scene-object]")];
  const validGateStates = new Set(["normal", "unstable", "event"]);
  const params = new URLSearchParams(location.search);

  const layout = window.TarotSceneLayout;
  let lastCamera = "";
  const masks = new Map();
  let actorSurface;
  const debug = params.get("sceneDebug") === "1";
  let debugOutput;

  function prepareOccluders(foreground) {
    for (const area of layout.occluders) {
      const [x,y,w,h]=area.bounds;
      const surface=document.createElement("canvas"); surface.width=w; surface.height=h;
      const paint=surface.getContext("2d"); paint.translate(-x,-y);
      layout.trace(paint,area.points); paint.clip();
      if (area.source==="foreground") paint.drawImage(foreground,0,0);
      else {
        const layer=document.querySelector(area.source==="gate" ? ".scene-gate-base" : ".scene-fountain-base");
        const b=layer.dataset;
        paint.drawImage(layer.querySelector("img"),Number(b.worldX),Number(b.worldY),Number(b.worldW),Number(b.worldH));
      }
      masks.set(area.id,{surface,x,y,w,h});
    }
  }
  // Mask each actor in isolation: a rear actor must never cause a foreground
  // redraw that covers another actor standing in front of the same object.
  function drawMaskedActor(ctx, actor, scale, density, draw) {
    const active=layout.activeOccluders({x:actor.x/scale.x,y:actor.y/scale.y});
    if (!active.length) { draw(ctx); return; }
    actorSurface ||= document.createElement("canvas");
    const left=actor.x-84*scale.x, top=actor.y-110*scale.y;
    const width=168*scale.x, height=142*scale.y;
    const pw=Math.ceil(width*density), ph=Math.ceil(height*density);
    if(actorSurface.width!==pw || actorSurface.height!==ph) {
      actorSurface.width=pw; actorSurface.height=ph;
    }
    const paint=actorSurface.getContext("2d");
    paint.setTransform(1,0,0,1,0,0); paint.clearRect(0,0,pw,ph);
    paint.setTransform(pw/width,0,0,ph/height,-left*pw/width,-top*ph/height);
    draw(paint);
    paint.save(); paint.globalCompositeOperation="destination-out";
    for(const area of active) {
      const mask=masks.get(area.id);
      if(mask) paint.drawImage(mask.surface,mask.x*scale.x,mask.y*scale.y,mask.w*scale.x,mask.h*scale.y);
    }
    paint.restore();
    ctx.drawImage(actorSurface,0,0,pw,ph,left,top,width,height);
  }
  function drawDebug(ctx, actors, scale, zoom) {
    if(!debug) return;
    ctx.save(); ctx.scale(scale.x,scale.y); ctx.lineWidth=1/zoom;
    ctx.font="10px monospace";
    for(const area of layout.occluders) {
      ctx.strokeStyle="#529aff"; ctx.fillStyle="rgba(60,130,255,.08)";
      layout.trace(ctx,area.footArea.points); ctx.fill(); ctx.stroke();
      ctx.strokeRect(...area.bounds); ctx.setLineDash([4,3]);
      ctx.beginPath(); ctx.moveTo(area.bounds[0],area.baseline);
      ctx.lineTo(area.bounds[0]+area.bounds[2],area.baseline); ctx.stroke();
      ctx.setLineDash([]);
    }
    const states={};
    for(const [name,actor] of Object.entries(actors)) {
      const foot={x:actor.x/scale.x,y:actor.y/scale.y};
      states[name]={...foot,occluders:layout.activeOccluders(foot).map(area=>area.id)};
      ctx.strokeStyle="#fff"; ctx.fillStyle="#fff";
      ctx.beginPath();ctx.arc(foot.x,foot.y,3/zoom,0,Math.PI*2);ctx.stroke();
      ctx.fillText(name,foot.x+5,foot.y+12);
    }
    ctx.strokeStyle="#ffe277";ctx.setLineDash([6,4]);
    ctx.beginPath();ctx.moveTo(layout.gate.openingX,0);ctx.lineTo(layout.gate.openingX,395);ctx.stroke();
    ctx.restore();
    debugOutput.textContent="SCENE 1.1 · "+Object.entries(states).map(([name,s])=>`${name}: ${s.occluders.join(",")||"clear"}`).join(" · ");
    debugOutput.dataset.state=JSON.stringify({gate:layout.gate,actors:states});
  }
  let gateState = "normal";

  function setGateState(next = "normal") {
    const state = validGateStates.has(next) ? next : "normal";
    gateState = state;
    shell.dataset.gateState = state;
    return state;
  }

  // Called by the game's draw loop, so actors and scenery use the same camera
  // in the same frame. No second RAF, layout reads, or per-frame CSS size writes.
  function syncCamera({ world, origin, zoom }) {
    const signature = [world.w,world.h,origin.x,origin.y,zoom].join(",");
    if (signature === lastCamera) return;
    lastCamera = signature;
    const transform = `translate3d(${-origin.x * zoom}px,${-origin.y * zoom}px,0) scale(${zoom})`;
    for (const layer of worldLayers) {
      layer.style.width = `${world.w}px`; layer.style.height = `${world.h}px`;
      layer.style.transform = transform;
    }
    const sx = world.w / REF.w, sy = world.h / REF.h;
    for (const layer of objectLayers) {
      const {worldX:x,worldY:y,worldW:w,worldH:h} = layer.dataset;
      layer.style.left = "0px"; layer.style.top = "0px";
      layer.style.width = `${Number(w) * sx}px`;
      layer.style.height = `${Number(h) * sy}px`;
      layer.style.transform = `translate3d(${(Number(x)*sx-origin.x)*zoom}px,${(Number(y)*sy-origin.y)*zoom}px,0) scale(${zoom})`;
    }
  }
  function waitImage(img) {
    if (img.complete && img.naturalWidth) return Promise.resolve(img);
    return new Promise((resolve,reject) => {
      img.addEventListener("load", () => resolve(img), {once:true});
      img.addEventListener("error", () => reject(new Error("庭園レイヤーを読み込めません")), {once:true});
    });
  }
  const ready = Promise.all([map,...document.querySelectorAll(".scene-world-layer img, .scene-object img")].map(waitImage))
    .then(() => {
      const background = document.querySelector(".scene-background canvas");
      const foreground = document.querySelector(".scene-foreground canvas");
      layout.paintBackground(background.getContext("2d"),map,document.querySelector(".scene-star-sky img"));
      layout.paintForeground(foreground.getContext("2d"),document.querySelector(".scene-foreground img"));
      prepareOccluders(foreground);
      for(const layer of document.querySelectorAll(".scene-waterfall")) {
        const img=layer.querySelector("img"), paint=layer.querySelector("canvas").getContext("2d");
        paint.drawImage(img,0,0,REF.w,REF.h);layout.removeLegacyGate(paint);
        layer.style.maskImage=`url("${img.src}")`;
        layer.style.webkitMaskImage=`url("${img.src}")`;
      }
      layout.splitCrystal(document.querySelector(".scene-crystal-core").getContext("2d"),
        document.querySelector(".scene-crystal-ring").getContext("2d"),
        document.querySelector(".scene-fountain-crystal img"));
      shell.dataset.sceneReady = "true";
    });
  // Report through the game's startup error UI; avoid an unhandled rejection
  // when sprites or collision take longer than a failed scene image.
  ready.catch(() => {});

  window.addEventListener("tarot-breaker:gate-state", (event) => {
    const requested =
      typeof event.detail === "string" ? event.detail : event.detail?.state;
    setGateState(requested || "normal");
  });

  if (debug) {
    shell.classList.add("scene-debug");
    debugOutput=document.createElement("output");debugOutput.id="scene-status";
    debugOutput.className="scene-status";shell.appendChild(debugOutput);
  }
  setGateState(params.get("gateState") || "normal");

  window.TarotSceneEffects = Object.freeze({
    ready, syncCamera, drawMaskedActor, drawDebug,
    setGateState,
    getGateState: () => gateState,
    referenceSize: Object.freeze({ ...REF }),
  });

  window.dispatchEvent(
    new CustomEvent("tarot-breaker:scene-ready", {
      detail: { gateState },
    }),
  );
})();
