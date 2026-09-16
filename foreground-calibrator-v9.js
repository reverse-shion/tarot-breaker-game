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
  };

  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

  function redraw() {
    state.scale = clamp(state.scale, 0.6, 1.25);
    const canvas = document.querySelector(".scene-foreground canvas");
    const image = document.querySelector(".scene-foreground img");
    if (!canvas || !image || !image.complete || !image.naturalWidth) return;
    const ctx = canvas.getContext("2d");
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, REF.width, REF.height);
    ctx.drawImage(image, state.x, state.y, REF.width * state.scale, REF.height * state.scale);
    layout.latestForegroundPlacement = Object.freeze({
      sourceW: image.naturalWidth,
      sourceH: image.naturalHeight,
      drawX: state.x,
      drawY: state.y,
      drawW: REF.width * state.scale,
      drawH: REF.height * state.scale,
      scale: state.scale,
      mode: "interactive-calibration",
    });
    updateReadout();
  }

  function updateReadout() {
    const out = document.getElementById("fg-align-values");
    if (out) out.textContent = `X ${Math.round(state.x)}  Y ${Math.round(state.y)}  SCALE ${state.scale.toFixed(3)}`;
  }

  function addButton(parent, label, fn) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = label;
    Object.assign(button.style, {
      minWidth: "44px", minHeight: "40px", borderRadius: "10px",
      border: "1px solid rgba(255,255,255,.55)", background: "rgba(18,23,52,.92)",
      color: "white", fontSize: "17px", fontWeight: "700", touchAction: "manipulation",
    });
    button.addEventListener("pointerdown", (e) => { e.preventDefault(); e.stopPropagation(); fn(); redraw(); });
    parent.appendChild(button);
  }

  function buildPanel() {
    if (document.getElementById("fg-align-panel")) return;
    const panel = document.createElement("div");
    panel.id = "fg-align-panel";
    Object.assign(panel.style, {
      position: "fixed", left: "8px", bottom: "8px", zIndex: "1000",
      padding: "8px", borderRadius: "12px", background: "rgba(5,8,28,.88)",
      color: "white", fontFamily: "system-ui,sans-serif", fontSize: "12px",
      display: "grid", gap: "6px", pointerEvents: "auto", touchAction: "none",
      boxShadow: "0 4px 20px rgba(0,0,0,.35)",
    });
    panel.addEventListener("pointerdown", e => e.stopPropagation());

    const readout = document.createElement("div");
    readout.id = "fg-align-values";
    readout.style.fontWeight = "700";
    panel.appendChild(readout);

    const move = document.createElement("div");
    Object.assign(move.style, { display: "grid", gridTemplateColumns: "repeat(4,44px)", gap: "4px" });
    addButton(move, "←", () => state.x -= 10);
    addButton(move, "→", () => state.x += 10);
    addButton(move, "↑", () => state.y -= 10);
    addButton(move, "↓", () => state.y += 10);
    panel.appendChild(move);

    const fine = document.createElement("div");
    Object.assign(fine.style, { display: "grid", gridTemplateColumns: "repeat(4,44px)", gap: "4px" });
    addButton(fine, "-1X", () => state.x -= 1);
    addButton(fine, "+1X", () => state.x += 1);
    addButton(fine, "-1Y", () => state.y -= 1);
    addButton(fine, "+1Y", () => state.y += 1);
    panel.appendChild(fine);

    const scale = document.createElement("div");
    Object.assign(scale.style, { display: "grid", gridTemplateColumns: "repeat(3,58px)", gap: "4px" });
    addButton(scale, "−1%", () => state.scale -= 0.01);
    addButton(scale, "+1%", () => state.scale += 0.01);
    addButton(scale, "RESET", () => { state.x = -15; state.y = 0; state.scale = 1; });
    panel.appendChild(scale);

    const note = document.createElement("div");
    note.textContent = "最前面だけを動かします。合った時のX/Y/SCALEをそのまま教えてください。";
    note.style.maxWidth = "190px";
    note.style.lineHeight = "1.35";
    panel.appendChild(note);

    document.body.appendChild(panel);
    updateReadout();
  }

  Promise.resolve(scene.ready).then(() => {
    buildPanel();
    redraw();
  });
})();
