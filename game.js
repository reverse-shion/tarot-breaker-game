(() => {
  "use strict";
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d", { alpha: true });
  const map = document.getElementById("map-layer");
  const start = document.getElementById("start");
  const startScreen = document.getElementById("start-screen");
  const note = document.getElementById("load-note");
  const guide = document.getElementById("guide");
  const joystick = document.getElementById("joystick");
  const knob = document.getElementById("joystick-knob");
  const resetButton = document.getElementById("reset");
  const REF = { w: 1448, h: 1086 };
  const DEFAULT_SPAWN = { x: 724, y: 1015 };
  const SPEED = 155;
  const DPR_LIMIT = 2;
  let manifest;
  const FRAME = { w: 384, h: 512, baseline: 480, count: 4 };
  const DRAW_HEIGHT = 78;
  const CAMERA_MIN_ZOOM = 1.0;
  const CAMERA_MAX_ZOOM = 1.22;
  const CAMERA_BASE_OFFSET_Y = 58;
  const CAMERA_LOOK_AHEAD_Y = 28;
  const DEPTH_DEBUG = new URLSearchParams(location.search).has("depthDebug");
  const NAV_DEBUG =
    new URLSearchParams(location.search).get("navDebug") === "1";
  const config = document.currentScript?.dataset || {};
  const COLLISION_URL =
    config.collisionUrl ||
    "./assets/maps/star-country-gate-garden-collision.json";
  const SPRITE_BASE = config.spriteBase || "./assets/sprites/shion/";
  const { createCollision, createNavigator } = window.TarotNavigation;
  const { createControls } = window.TarotControls;
  let collision,
    navigation,
    controls,
    tapEffect = null;
  let debugStatus = null;
  if (NAV_DEBUG) {
    debugStatus = document.createElement("output");
    debugStatus.id = "nav-status";
    debugStatus.className = "nav-status";
    document.getElementById("game-shell").appendChild(debugStatus);
    // A fixed CSS viewport for reproducible browser QA; never enabled normally.
    if (new URLSearchParams(location.search).get("viewport") === "390x844") {
      const shell = document.getElementById("game-shell");
      shell.style.width = "390px";
      shell.style.height = "844px";
      shell.style.maxWidth = "100%";
      shell.style.margin = "0 auto";
    }
  }
  const files = {
    idle: SPRITE_BASE + "shion_idle.png",
    down: SPRITE_BASE + "shion_walk_down.png",
    up: SPRITE_BASE + "shion_walk_up.png",
    left: SPRITE_BASE + "shion_walk_left.png",
    right: SPRITE_BASE + "shion_walk_right.png",
  };
  const images = {};
  const player = {
    x: DEFAULT_SPAWN.x,
    y: DEFAULT_SPAWN.y,
    dir: "up",
    moving: false,
    frame: 0,
  };
  const camera = {
    x: DEFAULT_SPAWN.x,
    y: DEFAULT_SPAWN.y - CAMERA_BASE_OFFSET_Y,
    zoom: 1,
  };
  let walkAreas = [];
  let collisionVersion = 0;
  let spawnRef = { ...DEFAULT_SPAWN };
  let world = { w: REF.w, h: REF.h };
  let scale = { x: 1, y: 1 };
  let cssWidth = 1;
  let cssHeight = 1;
  let dpr = 1;
  let ready = false;
  let running = false;
  let last = 0;
  let anim = 0;
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  function isWalkableRef(x, y) {
    return collision.isWalkable(x, y);
  }
  async function loadCollision() {
    const response = await fetch(COLLISION_URL, { cache: "no-store" });
    if (!response.ok) throw new Error("当たり判定データを読み込めません");
    collision = createCollision(await response.json());
    walkAreas = collision.areas;
    collisionVersion = collision.version;
    navigation = createNavigator(collision, 16);
    controls = createControls(collision, navigation);
  }
  function findNearestSpawnRef() {
    if (isWalkableRef(DEFAULT_SPAWN.x, DEFAULT_SPAWN.y))
      return { ...DEFAULT_SPAWN };
    for (let radius = 5; radius <= 320; radius += 5) {
      for (let i = 0; i < 32; i++) {
        const angle = (i / 32) * Math.PI * 2;
        const x = DEFAULT_SPAWN.x + Math.cos(angle) * radius;
        const y = DEFAULT_SPAWN.y + Math.sin(angle) * radius;
        if (isWalkableRef(x, y)) return { x, y };
      }
    }
    const first = walkAreas[0];
    if (first?.type === "poly")
      return { x: first.points[0][0], y: first.points[0][1] };
    if (first?.type === "ellipse") return { x: first.cx, y: first.cy };
    return { ...DEFAULT_SPAWN };
  }
  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () =>
        reject(new Error("画像を読み込めません: " + src.split("/").pop()));
      image.src = src;
    });
  }
  function waitForMap() {
    return new Promise((resolve, reject) => {
      if (map.complete && map.naturalWidth) return resolve(map);
      map.addEventListener("load", () => resolve(map), { once: true });
      map.addEventListener(
        "error",
        () => reject(new Error("星門庭園マップを読み込めません")),
        { once: true },
      );
    });
  }
  function resize() {
    const rect = canvas.getBoundingClientRect();
    cssWidth = Math.max(1, rect.width);
    cssHeight = Math.max(1, rect.height);
    dpr = Math.min(window.devicePixelRatio || 1, DPR_LIMIT);
    canvas.width = Math.round(cssWidth * dpr);
    canvas.height = Math.round(cssHeight * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    camera.zoom = clamp(
      Math.min(cssWidth / 620, cssHeight / 560),
      CAMERA_MIN_ZOOM,
      CAMERA_MAX_ZOOM,
    );
  }
  function reset() {
    controls?.clearInput("reset");
    tapEffect = null;
    anim = 0;
    syncStick();
    player.x = spawnRef.x * scale.x;
    player.y = spawnRef.y * scale.y;
    player.dir = "up";
    player.moving = false;
    player.frame = 0;
    camera.x = player.x;
    camera.y = player.y - CAMERA_BASE_OFFSET_Y * scale.y;
  }
  function playerRef() {
    return { x: player.x / scale.x, y: player.y / scale.y };
  }
  function updatePlayer(dt) {
    const next = controls.step(playerRef(), dt, SPEED);
    player.x = next.x * scale.x;
    player.y = next.y * scale.y;
    player.moving = next.moving;
    if (!player.moving) {
      player.frame = 0;
      anim = 0;
      return;
    }
    player.dir =
      Math.abs(next.dx) > Math.abs(next.dy)
        ? next.dx < 0
          ? "left"
          : "right"
        : next.dy < 0
          ? "up"
          : "down";
    anim += dt;
    while (anim >= 0.12) {
      anim -= 0.12;
      player.frame = (player.frame + 1) % FRAME.count;
    }
  }
  function cameraOffsetY() {
    let offset = CAMERA_BASE_OFFSET_Y;
    if (player.moving && player.dir === "up") offset += CAMERA_LOOK_AHEAD_Y;
    if (player.moving && player.dir === "down") offset -= CAMERA_LOOK_AHEAD_Y;
    return offset * scale.y;
  }
  function updateCamera(dt) {
    const viewW = cssWidth / camera.zoom;
    const viewH = cssHeight / camera.zoom;
    const halfW = viewW / 2;
    const halfH = viewH / 2;
    const targetX = clamp(player.x, halfW, Math.max(halfW, world.w - halfW));
    const targetY = clamp(
      player.y - cameraOffsetY(),
      halfH,
      Math.max(halfH, world.h - halfH),
    );
    const ease = 1 - Math.exp(-6.5 * dt);
    camera.x += (targetX - camera.x) * ease;
    camera.y += (targetY - camera.y) * ease;
  }
  function viewportOrigin() {
    const viewW = cssWidth / camera.zoom;
    const viewH = cssHeight / camera.zoom;
    return {
      x: clamp(camera.x - viewW / 2, 0, Math.max(0, world.w - viewW)),
      y: clamp(camera.y - viewH / 2, 0, Math.max(0, world.h - viewH)),
    };
  }
  function spriteFrame() {
    const idleIndex = { down: 0, up: 1, left: 2, right: 3 }[player.dir];
    return {
      image: player.moving ? images[player.dir] : images.idle,
      sourceX: (player.moving ? player.frame : idleIndex) * FRAME.w,
    };
  }
  function drawSpritePass(
    image,
    sourceX,
    dx,
    dy,
    drawW,
    drawH,
    shadowColor,
    shadowBlur,
  ) {
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.shadowColor = shadowColor;
    ctx.shadowBlur = shadowBlur / camera.zoom;
    ctx.drawImage(image, sourceX, 0, FRAME.w, FRAME.h, dx, dy, drawW, drawH);
    ctx.restore();
  }
  function drawPlayer() {
    const scaleDraw = DRAW_HEIGHT / FRAME.h;
    const drawW = FRAME.w * scaleDraw;
    const drawH = FRAME.h * scaleDraw;
    const dx = player.x - drawW / 2;
    const dy = player.y - FRAME.baseline * scaleDraw;
    const { image, sourceX } = spriteFrame();
    drawSpritePass(
      image,
      sourceX,
      dx,
      dy,
      drawW,
      drawH,
      "rgba(255,236,190,.22)",
      5,
    );
    drawSpritePass(image, sourceX, dx, dy, drawW, drawH, "rgba(6,9,28,.86)", 2);
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(image, sourceX, 0, FRAME.w, FRAME.h, dx, dy, drawW, drawH);
    ctx.restore();
  }
  function drawGroundShadow() {
    ctx.save();
    ctx.translate(player.x, player.y + 2);
    ctx.scale(1, 0.34);
    const gradient = ctx.createRadialGradient(0, 0, 2, 0, 0, 20);
    gradient.addColorStop(0, "rgba(5,7,20,.46)");
    gradient.addColorStop(0.62, "rgba(5,7,20,.28)");
    gradient.addColorStop(1, "rgba(5,7,20,0)");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(0, 0, 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  function traceRefShape(shape) {
    ctx.beginPath();
    if (shape.type === "ellipse") {
      ctx.ellipse(
        shape.cx * scale.x,
        shape.cy * scale.y,
        shape.rx * scale.x,
        shape.ry * scale.y,
        0,
        0,
        Math.PI * 2,
      );
      return;
    }
    const points = shape.points;
    ctx.moveTo(points[0][0] * scale.x, points[0][1] * scale.y);
    for (let i = 1; i < points.length; i++)
      ctx.lineTo(points[i][0] * scale.x, points[i][1] * scale.y);
    ctx.closePath();
  }
  function drawCollisionDebug() {
    if (!DEPTH_DEBUG && !NAV_DEBUG) return;
    ctx.save();
    ctx.lineWidth = 2 / camera.zoom;
    ctx.strokeStyle = "rgba(70,255,120,.95)";
    ctx.fillStyle = "rgba(70,255,120,.10)";
    for (const area of walkAreas) {
      traceRefShape(area);
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  }
  function drawTapEffect() {
    if (!tapEffect) return;
    const progress = tapEffect.age / 0.45;
    ctx.save();
    ctx.translate(tapEffect.x * scale.x, tapEffect.y * scale.y);
    ctx.globalAlpha = (1 - progress) * 0.8;
    ctx.lineWidth = 1.3 / camera.zoom;
    ctx.strokeStyle = "#c9e7ff";
    ctx.beginPath();
    ctx.ellipse(0, 0, 8 + 12 * progress, 4 + 6 * progress, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = "#fff0bd";
    ctx.beginPath();
    ctx.moveTo(-5, 0);
    ctx.lineTo(5, 0);
    ctx.moveTo(0, -7);
    ctx.lineTo(0, 7);
    ctx.stroke();
    ctx.restore();
  }
  function drawNavDebug() {
    if (!NAV_DEBUG || !controls) return;
    const state = controls.state;
    ctx.save();
    ctx.scale(scale.x, scale.y);
    ctx.fillStyle = "rgba(170,220,255,.45)";
    for (const point of navigation.nodes)
      ctx.fillRect(point.x - 1, point.y - 1, 2, 2);
    ctx.strokeStyle = "#ffe6a0";
    ctx.lineWidth = 2 / camera.zoom;
    ctx.beginPath();
    ctx.moveTo(player.x / scale.x, player.y / scale.y);
    for (const point of state.route) ctx.lineTo(point.x, point.y);
    ctx.stroke();
    for (const point of state.route) {
      ctx.beginPath();
      ctx.arc(point.x, point.y, 3, 0, Math.PI * 2);
      ctx.stroke();
    }
    if (state.requested) {
      ctx.strokeStyle = "#d9f2ff";
      ctx.beginPath();
      ctx.arc(state.requested.x, state.requested.y, 6, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
    debugStatus.textContent =
      `NAV 16px · ${navigation.nodes.length} cells\n` +
      `${player.x.toFixed(1)}, ${player.y.toFixed(1)} · ${player.dir} ${player.moving ? "walk" : "idle"} ${player.frame}\n` +
      `${state.stick.active ? "stick" : state.keys.size ? "keyboard" : state.route.length ? "auto" : "idle"} · ${state.route.length} waypoints`;
    debugStatus.dataset.state = JSON.stringify({
      player: { ...player },
      camera: { ...camera },
      origin: viewportOrigin(),
      cssWidth,
      cssHeight,
      route: state.route,
      target: state.target,
      requested: state.requested,
      stick: state.stick.active,
      suspended: state.suspended,
      reason: state.cancelReason,
    });
  }
  function draw() {
    const origin = viewportOrigin();
    map.style.width = world.w + "px";
    map.style.height = world.h + "px";
    map.style.transform = `translate3d(${-origin.x * camera.zoom}px,${-origin.y * camera.zoom}px,0) scale(${camera.zoom})`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssWidth, cssHeight);
    ctx.save();
    ctx.scale(camera.zoom, camera.zoom);
    ctx.translate(-origin.x, -origin.y);
    drawTapEffect();
    drawGroundShadow();
    drawPlayer();
    drawCollisionDebug();
    drawNavDebug();
    ctx.restore();
  }
  function loop(now) {
    if (!running) return;
    const dt = Math.min(last ? (now - last) / 1000 : 0, 0.05);
    last = now;
    if (tapEffect) {
      tapEffect.age += dt;
      if (tapEffect.age >= 0.45) tapEffect = null;
    }
    updatePlayer(dt);
    updateCamera(dt);
    draw();
    requestAnimationFrame(loop);
  }
  function begin(event) {
    event?.preventDefault();
    if (!ready || running) return;
    running = true;
    startScreen.hidden = true;
    guide.hidden = false;
    resetButton.hidden = false;
    resize();
    reset();
    last = performance.now();
    draw();
    requestAnimationFrame(loop);
    setTimeout(() => {
      guide.hidden = true;
    }, 5000);
  }
  function pointerInfo(event) {
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left,
      y = event.clientY - rect.top;
    const origin = viewportOrigin();
    return {
      id: event.pointerId,
      x,
      y,
      width: cssWidth,
      time: event.timeStamp,
      primary: event.isPrimary !== false,
      button: event.button,
      world: {
        x: (origin.x + x / camera.zoom) / scale.x,
        y: (origin.y + y / camera.zoom) / scale.y,
      },
    };
  }
  function syncStick() {
    const stick = controls?.state.stick;
    joystick.hidden = !stick?.active;
    if (!stick) return;
    joystick.style.left = stick.ox + "px";
    joystick.style.top = stick.oy + "px";
    knob.style.transform = `translate(${stick.knobX}px,${stick.knobY}px)`;
  }
  function pointerDown(event) {
    if (!running) return;
    event.preventDefault();
    if (!controls.pointerDown(pointerInfo(event))) return;
    canvas.setPointerCapture?.(event.pointerId);
    guide.hidden = true;
  }
  function pointerMove(event) {
    if (!running) return;
    event.preventDefault();
    controls.pointerMove(pointerInfo(event));
    syncStick();
  }
  function pointerEnd(event) {
    if (!running) return;
    event.preventDefault();
    const action = controls.pointerEnd(
      { ...pointerInfo(event), cancelled: event.type !== "pointerup" },
      playerRef(),
    );
    if (action) tapEffect = { ...action.point, age: 0 };
    if (canvas.hasPointerCapture?.(event.pointerId))
      canvas.releasePointerCapture(event.pointerId);
    syncStick();
  }
  function clearInput(reason) {
    controls?.clearInput(reason);
    syncStick();
  }
  start.addEventListener("click", begin);
  resetButton.addEventListener("pointerdown", () => clearInput("reset"));
  resetButton.addEventListener("click", reset);
  canvas.addEventListener("pointerdown", pointerDown, { passive: false });
  canvas.addEventListener("pointermove", pointerMove, { passive: false });
  for (const type of ["pointerup", "pointercancel", "lostpointercapture"])
    canvas.addEventListener(type, pointerEnd, { passive: false });
  for (const type of [
    "contextmenu",
    "dragstart",
    "selectstart",
    "gesturestart",
    "gesturechange",
    "gestureend",
  ]) {
    canvas.addEventListener(type, (event) => event.preventDefault(), {
      passive: false,
    });
  }
  window.addEventListener("resize", () => {
    clearInput("resize");
    resize();
    if (ready) draw();
  });
  window.addEventListener(
    "keydown",
    (event) => {
      if (running && controls.keyDown(event.key)) {
        guide.hidden = true;
        event.preventDefault();
      }
    },
    { passive: false },
  );
  window.addEventListener("keyup", (event) => controls?.keyUp(event.key));
  window.addEventListener("blur", () => clearInput("blur"));
  window.addEventListener("pagehide", () => clearInput("pagehide"));
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) clearInput("hidden");
    last = 0;
  });
  // Future dialogue/investigation hosts dispatch these events before taking input.
  window.addEventListener("tarot-breaker:interaction-start", () => {
    controls?.suspend();
    syncStick();
  });
  window.addEventListener("tarot-breaker:interaction-end", () =>
    controls?.resume(),
  );

  (async () => {
    try {
      note.textContent = "手動当たり判定データを読み込んでいます…";
      const manifestResponse = await fetch(
        SPRITE_BASE + "shion_sprite_manifest.json",
      );
      if (!manifestResponse.ok)
        throw new Error("スプライト設定を読み込めません");
      manifest = await manifestResponse.json();
      if (
        manifest.cell_size?.width !== FRAME.w ||
        manifest.cell_size?.height !== FRAME.h ||
        manifest.baseline_y !== FRAME.baseline
      ) {
        throw new Error("スプライト設定が実装仕様と一致しません");
      }
      await loadCollision();
      spawnRef = findNearestSpawnRef();
      const loaded = await Promise.all([
        waitForMap(),
        ...Object.entries(files).map(async ([key, src]) => {
          images[key] = await loadImage(src);
        }),
      ]);
      const loadedMap = loaded[0];
      world = { w: loadedMap.naturalWidth, h: loadedMap.naturalHeight };
      scale = { x: world.w / REF.w, y: world.h / REF.h };
      for (const dir of ["down", "up", "left", "right"]) {
        if (
          images[dir].naturalWidth !== FRAME.w * 4 ||
          images[dir].naturalHeight !== FRAME.h
        )
          throw new Error(dir + "歩行画像サイズ不正");
      }
      if (
        images.idle.naturalWidth !== FRAME.w * 4 ||
        images.idle.naturalHeight !== FRAME.h
      )
        throw new Error("待機画像サイズ不正");
      ready = true;
      resize();
      reset();
      draw();
      start.disabled = false;
      start.textContent = "星の国へ";
      note.textContent = "行きたい場所をタップして、星の国を歩こう";
    } catch (error) {
      console.error(error);
      start.disabled = true;
      start.textContent = "起動できません";
      note.textContent = error.message;
    }
  })();
})();
