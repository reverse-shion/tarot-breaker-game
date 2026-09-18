(() => {
  "use strict";

  const viewport = document.getElementById("viewport");
  const world = document.getElementById("world");
  const layerHost = document.getElementById("layer-host");
  const overlay = document.getElementById("zone-overlay");
  const mapSelect = document.getElementById("map-select");
  const mapLabel = document.getElementById("map-label");
  const status = document.getElementById("status");
  const panel = document.getElementById("editor-panel");
  const collapseButton = document.getElementById("collapse-button");
  const fitButton = document.getElementById("fit-button");
  const zoomOut = document.getElementById("zoom-out");
  const zoomIn = document.getElementById("zoom-in");
  const zoomLabel = document.getElementById("zoom-label");
  const modeButtons = [...document.querySelectorAll("[data-mode]")];
  const modeHelp = document.getElementById("mode-help");
  const undoPointButton = document.getElementById("undo-point");
  const finishAreaButton = document.getElementById("finish-area");
  const undoAreaButton = document.getElementById("undo-area");
  const deleteAreaButton = document.getElementById("delete-area");
  const clearModeButton = document.getElementById("clear-mode");
  const restoreDraftButton = document.getElementById("restore-draft");
  const copyCollisionButton = document.getElementById("copy-collision");
  const copyDepthButton = document.getElementById("copy-depth");
  const copyAllButton = document.getElementById("copy-all");
  const customMapId = document.getElementById("custom-map-id");
  const customImage = document.getElementById("custom-image");
  const customWidth = document.getElementById("custom-width");
  const customHeight = document.getElementById("custom-height");
  const loadCustomButton = document.getElementById("load-custom");
  const toast = document.getElementById("toast");

  const SVG_NS = "http://www.w3.org/2000/svg";
  const MODE_META = Object.freeze({
    walk: {
      label: "歩行可能",
      help: "歩ける範囲を囲みます。タップで頂点追加、ドラッグでマップ移動、始点付近をタップで確定。",
      key: "walkAreas",
    },
    blocked: {
      label: "通行不可",
      help: "歩行可能エリア内でも入れない障害物を囲みます。柱・壁・穴などに使います。",
      key: "blockedAreas",
    },
    behind: {
      label: "背面通過",
      help: "キャラの足元がこの範囲に入った時、前景の後ろを通る区域です。柱・門・樹木・アーチ用。",
      key: "behindForegroundAreas",
    },
  });

  const state = {
    presets: [],
    config: null,
    mode: "walk",
    current: [],
    walkAreas: [],
    blockedAreas: [],
    behindForegroundAreas: [],
    zoom: 1,
    tx: 0,
    ty: 0,
    gesture: null,
    deleteMode: false,
    loadedCollisionVersion: 1,
    loadedDepthVersion: 1,
  };

  let toastTimer = 0;

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 1400);
  }

  function stripCache(url) {
    return String(url || "").split("#")[0];
  }

  function normalizePoly(area) {
    if (
      area?.type !== "poly" ||
      !Array.isArray(area.points) ||
      area.points.length < 3
    ) return null;
    const points = area.points
      .filter((p) => Array.isArray(p) && p.length >= 2)
      .map((p) => [Number(p[0]), Number(p[1])])
      .filter((p) => Number.isFinite(p[0]) && Number.isFinite(p[1]));
    return points.length >= 3 ? { type: "poly", points } : null;
  }

  function normalizeList(list) {
    return (Array.isArray(list) ? list : []).map(normalizePoly).filter(Boolean);
  }

  function cloneAreas(list) {
    return list.map((area) => ({
      type: "poly",
      points: area.points.map((p) => [p[0], p[1]]),
    }));
  }

  function currentAreas() {
    return state[MODE_META[state.mode].key];
  }

  function draftKey() {
    return "tarot-breaker:map-zone-editor:v1:" + (state.config?.id || "custom");
  }

  function draftPayload() {
    return {
      version: 1,
      map: state.config.id,
      referenceSize: { ...state.config.referenceSize },
      walkAreas: cloneAreas(state.walkAreas),
      blockedAreas: cloneAreas(state.blockedAreas),
      behindForegroundAreas: cloneAreas(state.behindForegroundAreas),
      savedAt: Date.now(),
    };
  }

  function saveDraft() {
    if (!state.config) return;
    try {
      localStorage.setItem(draftKey(), JSON.stringify(draftPayload()));
      updateDraftButton();
    } catch (_) {}
  }

  function updateDraftButton() {
    if (!state.config) return;
    let exists = false;
    try { exists = !!localStorage.getItem(draftKey()); } catch (_) {}
    restoreDraftButton.disabled = !exists;
    restoreDraftButton.textContent = exists ? "下書き復元" : "下書きなし";
  }

  function restoreDraft() {
    try {
      const raw = localStorage.getItem(draftKey());
      if (!raw) return;
      const data = JSON.parse(raw);
      state.walkAreas = normalizeList(data.walkAreas);
      state.blockedAreas = normalizeList(data.blockedAreas);
      state.behindForegroundAreas = normalizeList(data.behindForegroundAreas);
      state.current = [];
      state.deleteMode = false;
      document.body.classList.remove("delete-mode");
      deleteAreaButton.textContent = "範囲を選択削除";
      renderZones();
      updateStatus();
      showToast("下書きを復元しました");
    } catch (_) {
      showToast("下書きを復元できませんでした");
    }
  }

  function pointInPoly(x, y, points) {
    let inside = false;
    for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
      const a = points[j];
      const b = points[i];
      if (
        (a[1] > y) !== (b[1] > y) &&
        x < ((b[0] - a[0]) * (y - a[1])) / (b[1] - a[1]) + a[0]
      ) inside = !inside;
    }
    return inside;
  }

  function polygonNode(area, className) {
    const node = document.createElementNS(SVG_NS, "polygon");
    node.setAttribute("class", "zone " + className);
    node.setAttribute(
      "points",
      area.points.map((p) => p[0] + "," + p[1]).join(" "),
    );
    return node;
  }

  function vertexNode(point, index) {
    const node = document.createElementNS(SVG_NS, "circle");
    node.setAttribute("class", "vertex" + (index === 0 ? " first" : ""));
    node.setAttribute("cx", point[0]);
    node.setAttribute("cy", point[1]);
    node.setAttribute("r", index === 0 ? "7" : "5");
    return node;
  }

  function renderZones() {
    overlay.replaceChildren();

    for (const area of state.walkAreas) {
      overlay.appendChild(polygonNode(area, "walk"));
    }
    for (const area of state.blockedAreas) {
      overlay.appendChild(polygonNode(area, "blocked"));
    }
    for (const area of state.behindForegroundAreas) {
      overlay.appendChild(polygonNode(area, "behind"));
    }

    if (state.current.length) {
      overlay.appendChild(
        polygonNode({ type: "poly", points: state.current }, "current"),
      );
      state.current.forEach((point, index) => {
        overlay.appendChild(vertexNode(point, index));
      });
    }
  }

  function updateStatus() {
    const parts = [
      "歩行" + state.walkAreas.length,
      "禁止" + state.blockedAreas.length,
      "背面" + state.behindForegroundAreas.length,
    ];
    if (state.current.length) parts.push("点" + state.current.length);
    if (state.deleteMode) parts.push("削除中");
    status.textContent = parts.join(" / ");
  }

  function setMode(mode) {
    if (!MODE_META[mode]) return;
    state.mode = mode;
    state.current = [];
    state.deleteMode = false;
    document.body.classList.remove("delete-mode");
    deleteAreaButton.textContent = "範囲を選択削除";
    modeButtons.forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.mode === mode));
    });
    modeHelp.textContent = MODE_META[mode].help;
    renderZones();
    updateStatus();
  }

  function finishCurrent() {
    if (state.current.length < 3) {
      showToast("3点以上必要です");
      return false;
    }
    currentAreas().push({
      type: "poly",
      points: state.current.map((p) => [Math.round(p[0]), Math.round(p[1])]),
    });
    state.current = [];
    saveDraft();
    renderZones();
    updateStatus();
    return true;
  }

  function deleteAreaAt(point) {
    const areas = currentAreas();
    for (let i = areas.length - 1; i >= 0; i--) {
      if (pointInPoly(point.x, point.y, areas[i].points)) {
        areas.splice(i, 1);
        saveDraft();
        renderZones();
        updateStatus();
        showToast(MODE_META[state.mode].label + "を1範囲削除");
        return true;
      }
    }
    showToast("この位置に削除対象がありません");
    return false;
  }

  async function fetchJson(url) {
    if (!url) return null;
    try {
      const response = await fetch(
        stripCache(url) + (String(url).includes("?") ? "&" : "?") + "t=" + Date.now(),
        { cache: "no-store" },
      );
      if (!response.ok) return null;
      return await response.json();
    } catch (_) {
      return null;
    }
  }

  function renderLayers(config) {
    layerHost.replaceChildren();
    for (const layer of config.layers || []) {
      const image = document.createElement("img");
      image.className = "map-layer";
      image.src = layer.src;
      image.alt = "";
      image.draggable = false;
      image.style.zIndex = String(layer.z ?? 0);
      image.style.opacity = String(layer.opacity ?? 1);
      image.style.objectFit = layer.fit || "contain";
      if (layer.blend) image.style.mixBlendMode = layer.blend;
      if (layer.x != null) image.style.left = layer.x + "px";
      if (layer.y != null) image.style.top = layer.y + "px";
      if (layer.w != null) image.style.width = layer.w + "px";
      if (layer.h != null) image.style.height = layer.h + "px";
      if (layer.x != null || layer.y != null || layer.w != null || layer.h != null) {
        image.style.right = "auto";
        image.style.bottom = "auto";
      }
      if (layer.transform) image.style.transform = layer.transform;
      if (layer.transformOrigin) image.style.transformOrigin = layer.transformOrigin;
      layerHost.appendChild(image);
    }
  }

  function applyWorldTransform() {
    world.style.transform =
      "translate3d(" + state.tx + "px," + state.ty + "px,0) scale(" + state.zoom + ")";
    zoomLabel.textContent = Math.round(state.zoom * 100) + "%";
  }

  function fitWorld() {
    if (!state.config) return;
    const w = state.config.referenceSize.width;
    const h = state.config.referenceSize.height;
    const margin = 12;
    const fit = Math.min(
      (innerWidth - margin * 2) / w,
      (innerHeight - margin * 2) / h,
    );
    state.zoom = clamp(fit, .18, 2.8);
    state.tx = (innerWidth - w * state.zoom) / 2;
    state.ty = (innerHeight - h * state.zoom) / 2;
    applyWorldTransform();
  }

  function setZoom(nextZoom, screenX = innerWidth / 2, screenY = innerHeight / 2) {
    if (!state.config) return;
    const old = state.zoom;
    const next = clamp(nextZoom, .18, 4);
    const worldX = (screenX - state.tx) / old;
    const worldY = (screenY - state.ty) / old;
    state.zoom = next;
    state.tx = screenX - worldX * next;
    state.ty = screenY - worldY * next;
    applyWorldTransform();
  }

  function screenToWorld(clientX, clientY) {
    return {
      x: (clientX - state.tx) / state.zoom,
      y: (clientY - state.ty) / state.zoom,
    };
  }

  function isUiTarget(target) {
    return !!target.closest?.("#editor-panel, #topbar");
  }

  function addPoint(clientX, clientY) {
    if (!state.config) return;
    const p = screenToWorld(clientX, clientY);
    const w = state.config.referenceSize.width;
    const h = state.config.referenceSize.height;
    const point = {
      x: clamp(p.x, 0, w),
      y: clamp(p.y, 0, h),
    };

    if (state.deleteMode) {
      deleteAreaAt(point);
      return;
    }

    if (state.current.length >= 3) {
      const first = state.current[0];
      const closeThreshold = Math.max(16, 22 / state.zoom);
      if (Math.hypot(point.x - first[0], point.y - first[1]) <= closeThreshold) {
        finishCurrent();
        return;
      }
    }

    state.current.push([Math.round(point.x), Math.round(point.y)]);
    renderZones();
    updateStatus();
  }

  function collisionPayload() {
    return {
      version: state.loadedCollisionVersion || 1,
      map: state.config.id,
      referenceSize: { ...state.config.referenceSize },
      walkAreas: cloneAreas(state.walkAreas),
      blockedAreas: cloneAreas(state.blockedAreas),
    };
  }

  function depthPayload() {
    return {
      version: state.loadedDepthVersion || 1,
      map: state.config.id,
      referenceSize: { ...state.config.referenceSize },
      behindForegroundAreas: cloneAreas(state.behindForegroundAreas),
    };
  }

  async function copyText(text, successMessage) {
    try {
      await navigator.clipboard.writeText(text);
      showToast(successMessage);
    } catch (_) {
      window.prompt("JSONをコピーしてください", text);
    }
  }

  function copyCollision() {
    copyText(JSON.stringify(collisionPayload(), null, 2), "collision JSONをコピー");
  }

  function copyDepth() {
    copyText(JSON.stringify(depthPayload(), null, 2), "depth JSONをコピー");
  }

  function copyAll() {
    const data = {
      collision: collisionPayload(),
      depth: depthPayload(),
    };
    copyText(JSON.stringify(data, null, 2), "全ゾーンJSONをコピー");
  }

  async function loadConfig(config, { keepSelect = false } = {}) {
    state.config = {
      ...config,
      referenceSize: {
        width: Number(config.referenceSize?.width) || 1448,
        height: Number(config.referenceSize?.height) || 1086,
      },
      layers: Array.isArray(config.layers) ? config.layers : [],
    };

    state.current = [];
    state.walkAreas = [];
    state.blockedAreas = [];
    state.behindForegroundAreas = [];
    state.deleteMode = false;
    document.body.classList.remove("delete-mode");
    deleteAreaButton.textContent = "範囲を選択削除";

    const w = state.config.referenceSize.width;
    const h = state.config.referenceSize.height;
    world.style.width = w + "px";
    world.style.height = h + "px";
    overlay.setAttribute("viewBox", "0 0 " + w + " " + h);

    renderLayers(state.config);
    mapLabel.textContent = state.config.label + " · " + w + "×" + h;
    status.textContent = "JSON読込中";

    const [collision, depth] = await Promise.all([
      fetchJson(state.config.collisionUrl),
      fetchJson(state.config.depthUrl),
    ]);

    if (collision) {
      state.loadedCollisionVersion = Number(collision.version) || 1;
      state.walkAreas = normalizeList(collision.walkAreas);
      state.blockedAreas = normalizeList(collision.blockedAreas);
    } else {
      state.loadedCollisionVersion = 1;
    }

    if (depth) {
      state.loadedDepthVersion = Number(depth.version) || 1;
      state.behindForegroundAreas = normalizeList(depth.behindForegroundAreas);
    } else {
      state.loadedDepthVersion = 1;
    }

    if (!keepSelect) mapSelect.value = state.config.id;
    renderZones();
    updateStatus();
    updateDraftButton();
    fitWorld();
  }

  async function loadPresets() {
    const response = await fetch("./map-zone-editor-presets.json?v=1.0.0", {
      cache: "no-store",
    });
    if (!response.ok) throw new Error("presets load failed");
    const data = await response.json();
    state.presets = Array.isArray(data.maps) ? data.maps : [];

    mapSelect.replaceChildren();
    for (const preset of state.presets) {
      const option = document.createElement("option");
      option.value = preset.id;
      option.textContent = preset.label;
      mapSelect.appendChild(option);
    }
    const customOption = document.createElement("option");
    customOption.value = "__custom__";
    customOption.textContent = "カスタム";
    mapSelect.appendChild(customOption);

    const params = new URLSearchParams(location.search);
    const image = params.get("image");
    const requested = params.get("map") || data.defaultMap || state.presets[0]?.id;

    if (image) {
      const custom = {
        id: requested || "custom-map",
        label: requested || "カスタムマップ",
        referenceSize: {
          width: Number(params.get("w")) || 1448,
          height: Number(params.get("h")) || 1086,
        },
        collisionUrl: params.get("collision") || null,
        depthUrl: params.get("depth") || null,
        layers: [{ src: image, fit: "contain", z: 10 }],
      };
      mapSelect.value = "__custom__";
      customMapId.value = custom.id;
      customImage.value = image;
      customWidth.value = custom.referenceSize.width;
      customHeight.value = custom.referenceSize.height;
      await loadConfig(custom, { keepSelect: true });
      return;
    }

    const preset =
      state.presets.find((item) => item.id === requested) ||
      state.presets[0];
    if (!preset) throw new Error("map preset not found");
    await loadConfig(preset);
  }

  function loadCustom() {
    const id = customMapId.value.trim() || "custom-map";
    const image = customImage.value.trim();
    if (!image) {
      showToast("画像URLを入力してください");
      return;
    }
    const width = clamp(Number(customWidth.value) || 1448, 64, 8192);
    const height = clamp(Number(customHeight.value) || 1086, 64, 8192);
    mapSelect.value = "__custom__";
    loadConfig(
      {
        id,
        label: id,
        referenceSize: { width, height },
        collisionUrl: null,
        depthUrl: null,
        layers: [{ src: image, fit: "contain", z: 10 }],
      },
      { keepSelect: true },
    );
  }

  modeButtons.forEach((button) => {
    button.addEventListener("click", () => setMode(button.dataset.mode));
  });

  collapseButton.addEventListener("click", () => {
    const collapsed = panel.classList.toggle("collapsed");
    collapseButton.textContent = collapsed ? "＋" : "−";
    collapseButton.setAttribute("aria-expanded", String(!collapsed));
    collapseButton.setAttribute(
      "aria-label",
      collapsed ? "パネルを開く" : "パネルを折りたたむ",
    );
  });

  fitButton.addEventListener("click", fitWorld);
  zoomIn.addEventListener("click", () => setZoom(state.zoom * 1.18));
  zoomOut.addEventListener("click", () => setZoom(state.zoom / 1.18));

  undoPointButton.addEventListener("click", () => {
    state.current.pop();
    renderZones();
    updateStatus();
  });

  finishAreaButton.addEventListener("click", finishCurrent);

  undoAreaButton.addEventListener("click", () => {
    if (state.current.length) {
      state.current = [];
    } else {
      currentAreas().pop();
      saveDraft();
    }
    renderZones();
    updateStatus();
  });

  deleteAreaButton.addEventListener("click", () => {
    state.current = [];
    state.deleteMode = !state.deleteMode;
    document.body.classList.toggle("delete-mode", state.deleteMode);
    deleteAreaButton.textContent = state.deleteMode
      ? "削除を終了"
      : "範囲を選択削除";
    renderZones();
    updateStatus();
    if (state.deleteMode) showToast("削除したい範囲の内側をタップ");
  });

  clearModeButton.addEventListener("click", () => {
    const areas = currentAreas();
    if (!areas.length && !state.current.length) return;
    if (!window.confirm(MODE_META[state.mode].label + "をすべて消しますか？")) return;
    areas.splice(0);
    state.current = [];
    saveDraft();
    renderZones();
    updateStatus();
  });

  restoreDraftButton.addEventListener("click", restoreDraft);
  copyCollisionButton.addEventListener("click", copyCollision);
  copyDepthButton.addEventListener("click", copyDepth);
  copyAllButton.addEventListener("click", copyAll);
  loadCustomButton.addEventListener("click", loadCustom);

  mapSelect.addEventListener("change", () => {
    if (mapSelect.value === "__custom__") {
      document.getElementById("custom-details").open = true;
      return;
    }
    const preset = state.presets.find((item) => item.id === mapSelect.value);
    if (preset) loadConfig(preset);
  });

  viewport.addEventListener(
    "pointerdown",
    (event) => {
      if (isUiTarget(event.target)) return;
      if (event.button != null && event.button !== 0) return;
      event.preventDefault();
      state.gesture = {
        id: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        tx: state.tx,
        ty: state.ty,
        moved: false,
        startedAt: performance.now(),
      };
      viewport.setPointerCapture?.(event.pointerId);
    },
    { passive: false },
  );

  viewport.addEventListener(
    "pointermove",
    (event) => {
      const g = state.gesture;
      if (!g || g.id !== event.pointerId) return;
      event.preventDefault();
      const dx = event.clientX - g.x;
      const dy = event.clientY - g.y;
      if (!g.moved && Math.hypot(dx, dy) >= 9) g.moved = true;
      if (g.moved) {
        state.tx = g.tx + dx;
        state.ty = g.ty + dy;
        applyWorldTransform();
      }
    },
    { passive: false },
  );

  function endPointer(event) {
    const g = state.gesture;
    if (!g || g.id !== event.pointerId) return;
    event.preventDefault();
    const elapsed = performance.now() - g.startedAt;
    if (!g.moved && elapsed < 650) {
      addPoint(event.clientX, event.clientY);
    }
    if (viewport.hasPointerCapture?.(event.pointerId)) {
      viewport.releasePointerCapture(event.pointerId);
    }
    state.gesture = null;
  }

  viewport.addEventListener("pointerup", endPointer, { passive: false });
  viewport.addEventListener("pointercancel", (event) => {
    if (state.gesture?.id === event.pointerId) state.gesture = null;
  });

  addEventListener("resize", () => {
    if (!state.gesture) fitWorld();
  });

  loadPresets().catch((error) => {
    console.error(error);
    mapLabel.textContent = "読み込みに失敗しました";
    status.textContent = "ERROR";
    showToast("エディタ設定を読み込めません");
  });
})();
