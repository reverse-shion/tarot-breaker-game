(()=>{
  "use strict";

  const REF={width:1448,height:1086};
  const STORAGE_KEY="tarot-breaker:map-editor-v8";
  const frame=document.getElementById("game-frame");
  const canvas=document.getElementById("overlay");
  const ctx=canvas.getContext("2d");
  const statusEl=document.getElementById("status");
  const countsEl=document.getElementById("counts");
  const dialog=document.getElementById("output");
  const text=dialog.querySelector("textarea");
  const restoreButton=document.getElementById("restore-local");

  const colors={walk:"#65e59c",blocked:"#ff6c77",behind:"#d88cff"};
  const labels={walk:"歩行可能",blocked:"障害物",behind:"景色の裏"};

  let mode="play";
  let draft=[];
  let collision=null;
  let depth=null;
  let initialCollision=null;
  let initialDepth=null;
  let selected=null;
  let drag=null;
  let history=[];

  const clone=value=>JSON.parse(JSON.stringify(value));
  const validPoly=area=>area?.type==="poly"&&Array.isArray(area.points)&&area.points.length>=3&&area.points.every(p=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite));

  function normalizeCollision(data){
    return {
      version:Number(data?.version)||6,
      map:data?.map||"star-country-gate-garden",
      referenceSize:{width:REF.width,height:REF.height},
      walkAreas:(Array.isArray(data?.walkAreas)?data.walkAreas:[]).filter(validPoly).map(clone),
      blockedAreas:(Array.isArray(data?.blockedAreas)?data.blockedAreas:[]).filter(validPoly).map(clone),
    };
  }

  function normalizeDepth(data){
    return {
      version:Number(data?.version)||4,
      map:data?.map||"star-country-gate-garden",
      referenceSize:{width:REF.width,height:REF.height},
      behindForegroundAreas:(Array.isArray(data?.behindForegroundAreas)?data.behindForegroundAreas:[]).filter(validPoly).map(clone),
    };
  }

  function areas(kind){
    if(kind==="walk")return collision.walkAreas;
    if(kind==="blocked")return collision.blockedAreas;
    if(kind==="behind")return depth.behindForegroundAreas;
    return [];
  }

  function resize(){
    const dpr=Math.max(1,window.devicePixelRatio||1);
    canvas.width=Math.round(innerWidth*dpr);
    canvas.height=Math.round(innerHeight*dpr);
    canvas.style.width=`${innerWidth}px`;
    canvas.style.height=`${innerHeight}px`;
    ctx.setTransform(dpr,0,0,dpr,0,0);
  }
  addEventListener("resize",resize);

  function sceneRect(){
    try{
      const doc=frame.contentDocument;
      return doc?.querySelector(".scene-background")?.getBoundingClientRect()
        ||doc?.getElementById("map-layer")?.getBoundingClientRect()
        ||doc?.getElementById("game-shell")?.getBoundingClientRect()
        ||null;
    }catch(_){return null}
  }

  function toRef(clientX,clientY){
    const r=sceneRect();
    if(!r||r.width<2||r.height<2)return null;
    if(clientX<r.left||clientX>r.right||clientY<r.top||clientY>r.bottom)return null;
    const x=Math.round((clientX-r.left)*REF.width/r.width);
    const y=Math.round((clientY-r.top)*REF.height/r.height);
    return [Math.max(0,Math.min(REF.width,x)),Math.max(0,Math.min(REF.height,y))];
  }

  function toScreen(point){
    const r=sceneRect();
    if(!r||r.width<2||r.height<2)return null;
    return [r.left+point[0]/REF.width*r.width,r.top+point[1]/REF.height*r.height];
  }

  function trace(points,close=true){
    const screen=points.map(toScreen).filter(Boolean);
    if(screen.length<2)return false;
    ctx.beginPath();
    ctx.moveTo(screen[0][0],screen[0][1]);
    for(let i=1;i<screen.length;i++)ctx.lineTo(screen[i][0],screen[i][1]);
    if(close&&screen.length>2)ctx.closePath();
    return true;
  }

  function pointInside(point,points){
    let inside=false;
    for(let i=0,j=points.length-1;i<points.length;j=i++){
      const xi=points[i][0],yi=points[i][1],xj=points[j][0],yj=points[j][1];
      const hit=((yi>point[1])!==(yj>point[1]))&&(point[0]<(xj-xi)*(point[1]-yi)/(yj-yi)+xi);
      if(hit)inside=!inside;
    }
    return inside;
  }

  function hitPolygon(point){
    for(const kind of ["behind","blocked","walk"]){
      const list=areas(kind);
      for(let i=list.length-1;i>=0;i--){
        if(pointInside(point,list[i].points))return {kind,index:i};
      }
    }
    return null;
  }

  function selectedArea(){
    if(!selected)return null;
    return areas(selected.kind)?.[selected.index]||null;
  }

  function drawArea(kind,area,isSelected=false){
    if(!trace(area.points,true))return;
    ctx.save();
    ctx.fillStyle=colors[kind]+(isSelected?"48":"24");
    ctx.strokeStyle=isSelected?"#ffffff":colors[kind];
    ctx.lineWidth=isSelected?4:2;
    ctx.fill();ctx.stroke();ctx.restore();
  }

  function drawVertices(area){
    for(let i=0;i<area.points.length;i++){
      const p=toScreen(area.points[i]);if(!p)continue;
      ctx.save();ctx.beginPath();ctx.arc(p[0],p[1],8,0,Math.PI*2);
      ctx.fillStyle="#fff";ctx.fill();ctx.lineWidth=3;ctx.strokeStyle="#172044";ctx.stroke();
      ctx.fillStyle="#172044";ctx.font="700 9px system-ui,sans-serif";ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText(String(i+1),p[0],p[1]+.5);ctx.restore();
    }
  }

  function drawDraft(){
    if(!draft.length)return;
    ctx.save();ctx.strokeStyle=colors[mode]||"#fff";ctx.fillStyle=colors[mode]||"#fff";ctx.lineWidth=3;
    if(draft.length>=2&&trace(draft,false))ctx.stroke();
    for(const point of draft){const p=toScreen(point);if(!p)continue;ctx.beginPath();ctx.arc(p[0],p[1],6,0,Math.PI*2);ctx.fill()}
    ctx.restore();
  }

  function draw(){
    ctx.clearRect(0,0,innerWidth,innerHeight);
    if(collision&&depth&&mode!=="play"){
      collision.walkAreas.forEach((a,i)=>drawArea("walk",a,selected?.kind==="walk"&&selected.index===i));
      collision.blockedAreas.forEach((a,i)=>drawArea("blocked",a,selected?.kind==="blocked"&&selected.index===i));
      depth.behindForegroundAreas.forEach((a,i)=>drawArea("behind",a,selected?.kind==="behind"&&selected.index===i));
      const area=selectedArea();
      if(mode==="edit"&&area)drawVertices(area);
      if(["walk","blocked","behind"].includes(mode))drawDraft();
    }
    requestAnimationFrame(draw);
  }

  function setStatus(message){
    statusEl.textContent=message;
    if(!collision||!depth){countsEl.textContent="";return}
    countsEl.textContent=`歩行 ${collision.walkAreas.length} / 障害物 ${collision.blockedAreas.length} / 景色裏 ${depth.behindForegroundAreas.length}`;
  }

  function defaultStatus(){
    return "緑＝歩ける場所。赤＝通れない場所。紫＝歩けるまま景色の裏に隠れる場所。";
  }

  function snapshot(){
    return {collision:clone(collision),depth:clone(depth)};
  }
  function pushHistory(){history.push(snapshot());if(history.length>30)history.shift()}
  function restoreSnapshot(snap){collision=normalizeCollision(snap.collision);depth=normalizeDepth(snap.depth);selected=null;draft=[]}

  function saveLocal(){
    try{localStorage.setItem(STORAGE_KEY,JSON.stringify({savedAt:Date.now(),collision:normalizeCollision(collision),depth:normalizeDepth(depth)}));restoreButton.disabled=false}catch(_){}
  }
  function hasLocal(){try{const s=JSON.parse(localStorage.getItem(STORAGE_KEY)||"null");return !!(s?.collision&&s?.depth)}catch(_){return false}}
  function restoreLocal(){
    try{const s=JSON.parse(localStorage.getItem(STORAGE_KEY)||"null");if(!s?.collision||!s?.depth)return false;pushHistory();collision=normalizeCollision(s.collision);depth=normalizeDepth(s.depth);selected=null;draft=[];setStatus("端末に保存していた編集内容を復元しました");return true}catch(_){return false}
  }

  async function loadData(){
    try{
      const [cRes,dRes]=await Promise.all([
        fetch(`${document.body.dataset.collisionUrl}${document.body.dataset.collisionUrl.includes("?")?"&":"?"}t=${Date.now()}`,{cache:"no-store"}),
        fetch(`${document.body.dataset.depthUrl}${document.body.dataset.depthUrl.includes("?")?"&":"?"}t=${Date.now()}`,{cache:"no-store"})
      ]);
      if(!cRes.ok)throw new Error(`collision HTTP ${cRes.status}`);
      if(!dRes.ok)throw new Error(`depth HTTP ${dRes.status}`);
      collision=normalizeCollision(await cRes.json());
      depth=normalizeDepth(await dRes.json());
      initialCollision=clone(collision);initialDepth=clone(depth);
      restoreButton.disabled=!hasLocal();setStatus(defaultStatus());resize();
    }catch(error){setStatus(`編集データの読込に失敗: ${error.message}`)}
  }

  function wireGame(){
    try{
      const doc=frame.contentDocument,win=frame.contentWindow;
      const editorLink=doc?.querySelector(".editor-link");if(editorLink)editorLink.hidden=true;
      const start=doc?.getElementById("start");if(!start)return;
      let timer=0;const tryStart=()=>{if(start.disabled)return false;start.click();if(timer)win.clearInterval(timer);return true};
      if(!tryStart())timer=win.setInterval(tryStart,100);win.setTimeout(()=>{if(timer)win.clearInterval(timer)},20000);
    }catch(error){console.warn("map editor preview setup failed",error)}
  }

  function setMode(next){
    if(next===mode)return;
    if(draft.length)draft=[];
    mode=next;selected=null;document.body.classList.toggle("play",mode==="play");
    document.querySelectorAll("[data-mode]").forEach(b=>b.classList.toggle("active",b.dataset.mode===mode));
    if(mode==="play")setStatus("PLAY：通常操作でシオンを歩かせて確認");
    else if(mode==="walk")setStatus("歩行範囲：歩ける床を囲む → 範囲確定");
    else if(mode==="blocked")setStatus("障害物：通れない場所だけを囲む → 範囲確定");
    else if(mode==="behind")setStatus("景色の裏：草・柱・花など、シオンより手前に見せたい景色を囲む → 範囲確定");
    else if(mode==="edit")setStatus("頂点編集：範囲をタップ → 白い頂点をドラッグ");
    else if(mode==="erase")setStatus("削除：消したい緑・赤・紫の範囲をタップ");
  }

  document.getElementById("tools").addEventListener("click",e=>{const b=e.target.closest("[data-mode]");if(b)setMode(b.dataset.mode)});

  function nearestVertex(clientX,clientY,area){
    let best=null,bestDistance=Infinity;
    area.points.forEach((point,index)=>{const s=toScreen(point);if(!s)return;const d=Math.hypot(s[0]-clientX,s[1]-clientY);if(d<bestDistance){bestDistance=d;best=index}});
    return bestDistance<=26?best:null;
  }

  canvas.addEventListener("pointerdown",event=>{
    if(mode==="play"||!collision||!depth)return;
    const point=toRef(event.clientX,event.clientY);if(!point)return;
    if(["walk","blocked","behind"].includes(mode)){
      draft.push(point);setStatus(`${labels[mode]}：${draft.length}点 / (${point[0]}, ${point[1]})`);return;
    }
    if(mode==="erase"){
      const hit=hitPolygon(point);if(!hit){setStatus("この位置には削除できる範囲がありません");return}
      pushHistory();areas(hit.kind).splice(hit.index,1);selected=null;saveLocal();setStatus(`${labels[hit.kind]}を削除しました`);return;
    }
    if(mode==="edit"){
      const current=selectedArea();
      if(current){const vertex=nearestVertex(event.clientX,event.clientY,current);if(vertex!==null){pushHistory();drag={pointerId:event.pointerId,kind:selected.kind,index:selected.index,vertex};canvas.setPointerCapture?.(event.pointerId);setStatus(`頂点 ${vertex+1} を移動中`);return}}
      selected=hitPolygon(point);
      if(selected)setStatus(`${labels[selected.kind]}を選択。白い頂点をドラッグして調整できます`);else setStatus("編集する範囲をタップしてください");
    }
  });

  canvas.addEventListener("pointermove",event=>{
    if(!drag||event.pointerId!==drag.pointerId)return;
    const point=toRef(event.clientX,event.clientY);if(!point)return;
    const area=areas(drag.kind)?.[drag.index];if(!area)return;
    area.points[drag.vertex]=point;setStatus(`頂点 ${drag.vertex+1}: (${point[0]}, ${point[1]})`);
  });
  function endDrag(event){if(!drag||event.pointerId!==drag.pointerId)return;if(canvas.hasPointerCapture?.(event.pointerId))canvas.releasePointerCapture(event.pointerId);drag=null;saveLocal();setStatus("頂点位置を更新しました")}
  canvas.addEventListener("pointerup",endDrag);canvas.addEventListener("pointercancel",endDrag);

  document.getElementById("undo").onclick=()=>{
    if(draft.length){draft.pop();setStatus(draft.length?`未確定：${draft.length}点`:"未確定の点を戻しました");return}
    const snap=history.pop();if(!snap){setStatus("これ以上戻せません");return}restoreSnapshot(snap);saveLocal();setStatus("直前の編集を戻しました");
  };
  document.getElementById("clear-draft").onclick=()=>{draft=[];setStatus("未確定の範囲を取り消しました")};
  document.getElementById("finish").onclick=()=>{
    if(!["walk","blocked","behind"].includes(mode)){setStatus("歩行範囲・障害物・景色の裏のどれかを選んでください");return}
    if(draft.length<3){setStatus("範囲確定には3点以上必要です");return}
    pushHistory();areas(mode).push({type:"poly",points:clone(draft)});selected={kind:mode,index:areas(mode).length-1};draft=[];saveLocal();setStatus(`${labels[mode]}を確定しました`);
  };
  document.getElementById("delete-selected").onclick=()=>{
    if(!selectedArea()){setStatus("先に『頂点編集』で削除対象を選択してください");return}
    pushHistory();const label=labels[selected.kind];areas(selected.kind).splice(selected.index,1);selected=null;saveLocal();setStatus(`${label}を削除しました`);
  };
  restoreButton.onclick=()=>restoreLocal();
  document.getElementById("reset-server").onclick=()=>{if(!initialCollision||!initialDepth)return;pushHistory();collision=clone(initialCollision);depth=clone(initialDepth);selected=null;draft=[];saveLocal();setStatus("GitHub上の初期データへ戻しました")};

  function output(){
    return JSON.stringify({collision:normalizeCollision(collision),depth:normalizeDepth(depth)},null,2);
  }
  document.getElementById("copy").onclick=async()=>{text.value=output();dialog.showModal();try{await navigator.clipboard.writeText(text.value);setStatus("当たり判定＋景色裏JSONをコピーしました")}catch(_){}};
  document.getElementById("copy-dialog").onclick=()=>navigator.clipboard.writeText(text.value);
  document.getElementById("close-dialog").onclick=()=>dialog.close();

  frame.addEventListener("load",()=>{wireGame();if(!collision)loadData()});
  if(frame.contentDocument?.readyState==="complete"){wireGame();loadData()}else loadData();
  document.body.classList.add("play");document.querySelector('[data-mode="play"]').classList.add("active");resize();requestAnimationFrame(draw);
})();