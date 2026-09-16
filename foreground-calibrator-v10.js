(() => {
  "use strict";
  const params = new URLSearchParams(location.search);
  if (params.get("fgAlign") !== "1") return;

  const layout = window.TarotSceneLayout;
  const scene = window.TarotSceneEffects;
  if (!layout || !scene) return;

  const REF = layout.referenceSize || { width: 1448, height: 1086 };
  const state = {
    x: Number(params.get("fgX") ?? layout.foregroundOffset?.x ?? -15),
    y: Number(params.get("fgY") ?? layout.foregroundOffset?.y ?? 0),
    scale: Number(params.get("fgScale") ?? 1),
    overview: true,
  };
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
  let overviewCanvas = null;

  function getLayers() {
    return {
      fgCanvas: document.querySelector(".scene-foreground canvas"),
      fgImage: document.querySelector(".scene-foreground img"),
      groundImage: document.querySelector(".scene-ground img"),
    };
  }

  function redrawOverview() {
    if (!overviewCanvas || !state.overview) return;
    const { fgImage, groundImage } = getLayers();
    if (!fgImage?.complete || !groundImage?.complete) return;
    const ctx = overviewCanvas.getContext("2d");
    const sx = overviewCanvas.width / REF.width;
    const sy = overviewCanvas.height / REF.height;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, overviewCanvas.width, overviewCanvas.height);
    ctx.fillStyle = "#0b1029";
    ctx.fillRect(0, 0, overviewCanvas.width, overviewCanvas.height);
    ctx.setTransform(sx, 0, 0, sy, 0, 0);
    ctx.drawImage(groundImage, 0, 0, REF.width, REF.height);
    ctx.save();
    ctx.globalAlpha = 0.86;
    ctx.drawImage(fgImage, state.x, state.y, REF.width * state.scale, REF.height * state.scale);
    ctx.restore();
    ctx.strokeStyle = "rgba(255,90,220,.95)";
    ctx.lineWidth = 2 / sx;
    ctx.beginPath();
    ctx.moveTo(REF.width / 2, 0);
    ctx.lineTo(REF.width / 2, REF.height);
    ctx.stroke();
    ctx.strokeStyle = "rgba(100,220,255,.85)";
    ctx.lineWidth = 1 / sx;
    ctx.strokeRect(1 / sx, 1 / sy, REF.width - 2 / sx, REF.height - 2 / sy);
  }

  function redraw() {
    state.scale = clamp(state.scale, 0.4, 2.0);
    const { fgCanvas, fgImage } = getLayers();
    if (!fgCanvas || !fgImage || !fgImage.complete || !fgImage.naturalWidth) return;
    const ctx = fgCanvas.getContext("2d");
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, REF.width, REF.height);
    ctx.drawImage(fgImage, state.x, state.y, REF.width * state.scale, REF.height * state.scale);
    layout.latestForegroundPlacement = Object.freeze({
      sourceW: fgImage.naturalWidth,
      sourceH: fgImage.naturalHeight,
      drawX: state.x,
      drawY: state.y,
      drawW: REF.width * state.scale,
      drawH: REF.height * state.scale,
      scale: state.scale,
      mode: "interactive-calibration-v10",
    });
    updateReadout();
    redrawOverview();
  }

  function updateReadout() {
    const out = document.getElementById("fg-align-values");
    if (out) out.textContent = `X ${Math.round(state.x)}  Y ${Math.round(state.y)}  SCALE ${state.scale.toFixed(3)}`;
  }

  function addButton(parent, label, fn, wide = false) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = label;
    Object.assign(button.style, {
      minWidth: wide ? "74px" : "46px",
      minHeight: "40px",
      borderRadius: "10px",
      border: "1px solid rgba(255,255,255,.55)",
      background: "rgba(18,23,52,.94)",
      color: "white",
      fontSize: "16px",
      fontWeight: "700",
      touchAction: "manipulation",
    });
    button.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      e.stopPropagation();
      fn();
      redraw();
    });
    parent.appendChild(button);
    return button;
  }

  function buildOverview() {
    if (document.getElementById("fg-overview-wrap")) return;
    const wrap = document.createElement("div");
    wrap.id = "fg-overview-wrap";
    Object.assign(wrap.style, {
      position: "fixed",
      left: "50%",
      top: "8px",
      transform: "translateX(-50%)",
      zIndex: "999",
      width: "min(94vw, 420px)",
      padding: "6px",
      borderRadius: "12px",
      background: "rgba(5,8,28,.90)",
      boxShadow: "0 4px 20px rgba(0,0,0,.4)",
      pointerEvents: "none",
    });

    const title = document.createElement("div");
    title.textContent = "全体プレビュー（ピンク線＝マップ中心）";
    Object.assign(title.style, {
      color: "white", font: "700 11px/1.2 system-ui,sans-serif", margin: "0 0 5px 2px"
    });
    wrap.appendChild(title);

    overviewCanvas = document.createElement("canvas");
    overviewCanvas.width = 724;
    overviewCanvas.height = 543;
    Object.assign(overviewCanvas.style, {
      width: "100%",
      height: "auto",
      display: "block",
      borderRadius: "8px",
      background: "#0b1029",
    });
    wrap.appendChild(overviewCanvas);
    document.body.appendChild(wrap);
  }

  function buildPanel() {
    if (document.getElementById("fg-align-panel")) return;
    const panel = document.createElement("div");
    panel.id = "fg-align-panel";
    Object.assign(panel.style, {
      position: "fixed", left: "8px", bottom: "8px", zIndex: "1000",
      padding: "8px", borderRadius: "12px", background: "rgba(5,8,28,.90)",
      color: "white", fontFamily: "system-ui,sans-serif", fontSize: "12px",
      display: "grid", gap: "6px", pointerEvents: "auto", touchAction: "none",
      boxShadow: "0 4px 20px rgba(0,0,0,.35)", maxWidth: "calc(100vw - 16px)",
    });
    panel.addEventListener("pointerdown", e => e.stopPropagation());

    const readout = document.createElement("div");
    readout.id = "fg-align-values";
    readout.style.fontWeight = "800";
    readout.style.fontSize = "13px";
    panel.appendChild(readout);

    const move = document.createElement("div");
    Object.assign(move.style, { display: "grid", gridTemplateColumns: "repeat(4,46px)", gap: "4px" });
    addButton(move, "←", () => state.x -= 10);
    addButton(move, "→", () => state.x += 10);
    addButton(move, "↑", () => state.y -= 10);
    addButton(move, "↓", () => state.y += 10);
    panel.appendChild(move);

    const fine = document.createElement("div");
    Object.assign(fine.style, { display: "grid", gridTemplateColumns: "repeat(4,46px)", gap: "4px" });
    addButton(fine, "-1X", () => state.x -= 1);
    addButton(fine, "+1X", () => state.x += 1);
    addButton(fine, "-1Y", () => state.y -= 1);
    addButton(fine, "+1Y", () => state.y += 1);
    panel.appendChild(fine);

    const scaleFast = document.createElement("div");
    Object.assign(scaleFast.style, { display: "grid", gridTemplateColumns: "repeat(4,46px)", gap: "4px" });
    addButton(scaleFast, "−5%", () => state.scale -= 0.05);
    addButton(scaleFast, "+5%", () => state.scale += 0.05);
    addButton(scaleFast, "−1%", () => state.scale -= 0.01);
    addButton(scaleFast, "+1%", () => state.scale += 0.01);
    panel.appendChild(scaleFast);

    const tools = document.createElement("div");
    Object.assign(tools.style, { display: "grid", gridTemplateColumns: "repeat(3,74px)", gap: "4px" });
    addButton(tools, "中央基準", () => {
      state.x = (REF.width - REF.width * state.scale) / 2;
      state.y = (REF.height - REF.height * state.scale) / 2;
    }, true);
    const overviewButton = addButton(tools, "全体ON/OFF", () => {
      state.overview = !state.overview;
      const wrap = document.getElementById("fg-overview-wrap");
      if (wrap) wrap.style.display = state.overview ? "block" : "none";
    }, true);
    overviewButton.style.fontSize = "12px";
    addButton(tools, "RESET", () => { state.x = -15; state.y = 0; state.scale = 1; }, true);
    panel.appendChild(tools);

    const note = document.createElement("div");
    note.textContent = "全体プレビューで左右・大きさを合わせ、ゲーム画面で細部を確認。合ったX/Y/SCALEを教えてください。";
    note.style.maxWidth = "230px";
    note.style.lineHeight = "1.35";
    panel.appendChild(note);

    document.body.appendChild(panel);
    updateReadout();
  }

  Promise.resolve(scene.ready).then(() => {
    buildOverview();
    buildPanel();
    redraw();
  });
})();
