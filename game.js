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
  const FRAME = { w: 384, h: 512, baseline: 480, count: 4 };
  const DRAW_HEIGHT = 78;
  const SHIOPON_DRAW_HEIGHT = 76;
  const LUMIERE_DRAW_HEIGHT = 78;
  const SHIOPON_SPEED = 52;
  const SHIOPON_HOME = { x: 810, y: 800 };
  const SHIOPON_WANDER_RADIUS = 48;
  const ACTOR_COLLISION_DISTANCE = 26;
  const LUMIERE_HOME = { x: 810, y: 212 };
  const LUMIERE_COLLISION_DISTANCE = 32;
  const LUMIERE_BOB_AMPLITUDE = 3;
  const LUMIERE_BOB_PERIOD = 2.4;
  const LUMIERE_FRAME_SECONDS = 0.22;
  const CAMERA_MIN_ZOOM = 1.0;
  const CAMERA_MAX_ZOOM = 1.22;
  const CAMERA_BASE_OFFSET_Y = 58;
  const CAMERA_LOOK_AHEAD_Y = 28;
  const params = new URLSearchParams(location.search);
  const DEPTH_DEBUG = params.has("depthDebug");
  const NAV_DEBUG = params.get("navDebug") === "1";

  const config = document.currentScript?.dataset || {};
  const COLLISION_URL =
    config.collisionUrl || "./assets/maps/star-country-gate-garden-collision.json";
  const SPRITE_BASE = config.spriteBase || "./assets/sprites/shion/";
  const SHIOPON_BASE =
    config.shioponBase ||
    "https://raw.githubusercontent.com/reverse-shion/tarot-breaker-game/main/assets/sprites/shiopon/";
  const LUMIERE_BASE =
    config.lumiereBase ||
    "https://raw.githubusercontent.com/reverse-shion/tarot-breaker-game/main/assets/sprites/lumiere/";

  const { createCollision, createNavigator } = window.TarotNavigation;
  const { createControls } = window.TarotControls;

  let manifest;
  let collision;
  let navigation;
  let controls;
  let tapEffect = null;
  let debugStatus = null;
  let npcSuspended = false;
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
  let lumiereFrame = { ...FRAME };

  if (NAV_DEBUG) {
    debugStatus = document.createElement("output");
    debugStatus.id = "nav-status";
    debugStatus.className = "nav-status";
    document.getElementById("game-shell").appendChild(debugStatus);
    if (params.get("viewport") === "390x844") {
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
  const shioponFiles = {
    idle: SHIOPON_BASE + "shiopon_idle.png",
    down: SHIOPON_BASE + "shiopon_walk_down.png",
    up: SHIOPON_BASE + "shiopon_walk_up.png",
    left: SHIOPON_BASE + "shiopon_walk_left.png",
    right: SHIOPON_BASE + "shiopon_walk_right.png",
  };
  const lumiereFiles = {
    hover: LUMIERE_BASE + "lumiere_hover_down.png",
  };
  const images = {};
  const shioponImages = {};
  const lumiereImages = {};

  const player = {
    x: DEFAULT_SPAWN.x,
    y: DEFAULT_SPAWN.y,
    dir: "up",
    moving: false,
    frame: 0,
  };
  const shiopon = {
    x: SHIOPON_HOME.x,
    y: SHIOPON_HOME.y,
    homeRef: { ...SHIOPON_HOME },
    dir: "left",
    moving: false,
    frame: 0,
    anim: 0,
    wait: 1.2,
    target: null,
  };
  const lumiere = {
    x: LUMIERE_HOME.x,
    y: LUMIERE_HOME.y,
    homeRef: { ...LUMIERE_HOME },
    dir: "down",
    moving: false,
    frame: 0,
    anim: 0,
    bobPhase: 0,
    bobOffsetY: 0,
  };
  const camera = {
    x: DEFAULT_SPAWN.x,
    y: DEFAULT_SPAWN.y - CAMERA_BASE_OFFSET_Y,
    zoom: 1,
  };

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const randomDirection = () =>
    ["down", "up", "left", "right"][Math.floor(Math.random() * 4)];
  const refDistance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

  function isWalkableRef(x, y) {
    return collision.isWalkable(x, y);
  }

  function movingIntoActor(
    from,
    to,
    other,
    collisionDistance = ACTOR_COLLISION_DISTANCE,
  ) {
    const before = refDistance(from, other);
    const after = refDistance(to, other);
    return after < collisionDistance && after < before - 1e-6;
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

  function resetShiopon() {
    let home = { ...SHIOPON_HOME };
    if (!isWalkableRef(home.x, home.y))
      home = collision.nearestWalkable(home) || home;
    shiopon.homeRef = home;
    shiopon.x = home.x * scale.x;
    shiopon.y = home.y * scale.y;
    shiopon.dir = "left";
    shiopon.moving = false;
    shiopon.frame = 0;
    shiopon.anim = 0;
    shiopon.wait = 0.9 + Math.random() * 1.4;
    shiopon.target = null;
  }

  function resetLumiere() {
    lumiere.x = LUMIERE_HOME.x * scale.x;
    lumiere.y = LUMIERE_HOME.y * scale.y;
    lumiere.homeRef = { ...LUMIERE_HOME };
    lumiere.dir = "down";
    lumiere.moving = false;
    lumiere.frame = 0;
    lumiere.anim = 0;
    lumiere.bobPhase = 0;
    lumiere.bobOffsetY = 0;
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
    resetShiopon();
    resetLumiere();
    camera.x = player.x;
    camera.y = player.y - CAMERA_BASE_OFFSET_Y * scale.y;
  }

  function playerRef() {
    return { x: player.x / scale.x, y: player.y / scale.y };
  }

  function shioponRef() {
    return { x: shiopon.x / scale.x, y: shiopon.y / scale.y };
  }

  function lumiereRef() {
    return { x: lumiere.x / scale.x, y: lumiere.y / scale.y };
  }

  function setDirection(actor, dx, dy) {
    if (Math.abs(dx) < 1e-8 && Math.abs(dy) < 1e-8) return;
    actor.dir =
      Math.abs(dx) > Math.abs(dy)
        ? dx < 0
          ? "left"
          : "right"
        : dy < 0
          ? "up"
          : "down";
  }

  function updatePlayer(dt) {
    const from = playerRef();
    const next = controls.step(from, dt, SPEED);

    const npcBlocked =
      next.moving &&
      (movingIntoActor(from, next, shioponRef()) ||
        movingIntoActor(
          from,
          next,
          lumiereRef(),
          LUMIERE_COLLISION_DISTANCE,
        ));
    if (npcBlocked) {
      setDirection(player, next.dx, next.dy);
      controls.cancel("npc-blocked");
      player.moving = false;
      player.frame = 0;
      anim = 0;
      return;
    }

    player.x = next.x * scale.x;
    player.y = next.y * scale.y;
    player.moving = next.moving;
    if (!player.moving) {
      player.frame = 0;
      anim = 0;
      return;
    }
    setDirection(player, next.dx, next.dy);
    anim += dt;
    while (anim >= 0.12) {
      anim -= 0.12;
      player.frame = (player.frame + 1) % FRAME.count;
    }
  }

  function chooseShioponTarget() {
    if (Math.random() < 0.25) {
      shiopon.dir = randomDirection();
      shiopon.wait = 0.7 + Math.random() * 1.5;
      return;
    }

    const current = shioponRef();
    const playerNow = playerRef();
    for (let attempt = 0; attempt < 28; attempt++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 14 + Math.random() * SHIOPON_WANDER_RADIUS;
      const candidate = {
        x: shiopon.homeRef.x + Math.cos(angle) * radius,
        y: shiopon.homeRef.y + Math.sin(angle) * radius,
      };
      if (!isWalkableRef(candidate.x, candidate.y)) continue;
      if (!collision.segmentClear(current, candidate)) continue;
      if (refDistance(candidate, playerNow) < ACTOR_COLLISION_DISTANCE + 4)
        continue;
      shiopon.target = candidate;
      setDirection(
        shiopon,
        candidate.x - current.x,
        candidate.y - current.y,
      );
      shiopon.moving = true;
      return;
    }

    shiopon.dir = randomDirection();
    shiopon.wait = 0.8 + Math.random() * 1.4;
  }

  function stopShioponNearPlayer(current, playerNow) {
    shiopon.target = null;
    shiopon.moving = false;
    shiopon.frame = 0;
    shiopon.anim = 0;
    shiopon.wait = 0.7 + Math.random() * 1.3;
    setDirection(shiopon, playerNow.x - current.x, playerNow.y - current.y);
  }

  function updateShiopon(dt) {
    if (npcSuspended) {
      shiopon.moving = false;
      shiopon.frame = 0;
      return;
    }

    if (!shiopon.target) {
      shiopon.moving = false;
      shiopon.frame = 0;
      shiopon.anim = 0;
      shiopon.wait -= dt;
      if (shiopon.wait <= 0) chooseShioponTarget();
      return;
    }

    const current = shioponRef();
    const dx = shiopon.target.x - current.x;
    const dy = shiopon.target.y - current.y;
    const distance = Math.hypot(dx, dy);

    if (distance <= 2.5) {
      shiopon.x = shiopon.target.x * scale.x;
      shiopon.y = shiopon.target.y * scale.y;
      shiopon.target = null;
      shiopon.moving = false;
      shiopon.frame = 0;
      shiopon.anim = 0;
      shiopon.wait = 1.0 + Math.random() * 2.2;
      return;
    }

    const step = Math.min(distance, SHIOPON_SPEED * dt);
    const next = {
      x: current.x + (dx / distance) * step,
      y: current.y + (dy / distance) * step,
    };
    const playerNow = playerRef();

    if (movingIntoActor(current, next, playerNow)) {
      stopShioponNearPlayer(current, playerNow);
      return;
    }

    if (!isWalkableRef(next.x, next.y) || !collision.segmentClear(current, next)) {
      shiopon.target = null;
      shiopon.moving = false;
      shiopon.frame = 0;
      shiopon.wait = 0.7 + Math.random() * 1.3;
      return;
    }

    shiopon.x = next.x * scale.x;
    shiopon.y = next.y * scale.y;
    shiopon.moving = true;
    setDirection(shiopon, dx, dy);
    shiopon.anim += dt;
    while (shiopon.anim >= 0.16) {
      shiopon.anim -= 0.16;
      shiopon.frame = (shiopon.frame + 1) % FRAME.count;
    }
  }

  function updateLumiere(dt) {
    lumiere.anim += dt;
    while (lumiere.anim >= LUMIERE_FRAME_SECONDS) {
      lumiere.anim -= LUMIERE_FRAME_SECONDS;
      lumiere.frame = (lumiere.frame + 1) % lumiereFrame.count;
    }
    lumiere.bobPhase =
      (lumiere.bobPhase + (dt * Math.PI * 2) / LUMIERE_BOB_PERIOD) %
      (Math.PI * 2);
    lumiere.bobOffsetY =
      Math.sin(lumiere.bobPhase) * LUMIERE_BOB_AMPLITUDE * scale.y;
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
    const targetX = clamp(
      player.x,
      halfW,
      Math.max(halfW, world.w - halfW),
    );
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

  function spriteFrame(actor, actorImages, frameSpec = FRAME) {
    const idleIndex = { down: 0, up: 1, left: 2, right: 3 }[actor.dir];
    return {
      image: actor.moving ? actorImages[actor.dir] : actorImages.idle,
      sourceX: (actor.moving ? actor.frame : idleIndex) * frameSpec.w,
    };
  }

  function drawSpritePass(
    image,
    sourceX,
    sourceW,
    sourceH,
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
    ctx.drawImage(
      image,
      sourceX,
      0,
      sourceW,
      sourceH,
      dx,
      dy,
      drawW,
      drawH,
    );
    ctx.restore();
  }

  function drawActor(
    actor,
    actorImages,
    drawHeight,
    glowColor,
    { frameSpec = FRAME, hover = false, visualOffsetY = 0 } = {},
  ) {
    const scaleDraw = drawHeight / frameSpec.h;
    const drawW = frameSpec.w * scaleDraw;
    const drawH = frameSpec.h * scaleDraw;
    const dx = actor.x - drawW / 2;
    const dy = actor.y - frameSpec.baseline * scaleDraw + visualOffsetY;
    const { image, sourceX } = hover
      ? {
          image: actorImages.hover,
          sourceX: actor.frame * frameSpec.w,
        }
      : spriteFrame(actor, actorImages, frameSpec);
    drawSpritePass(
      image,
      sourceX,
      frameSpec.w,
      frameSpec.h,
      dx,
      dy,
      drawW,
      drawH,
      glowColor,
      5,
    );
    drawSpritePass(
      image,
      sourceX,
      frameSpec.w,
      frameSpec.h,
      dx,
      dy,
      drawW,
      drawH,
      "rgba(6,9,28,.86)",
      2,
    );
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(
      image,
      sourceX,
      0,
      frameSpec.w,
      frameSpec.h,
      dx,
      dy,
      drawW,
      drawH,
    );
    ctx.restore();
  }

  function drawGroundShadowAt(actor, radius, opacity) {
    ctx.save();
    ctx.translate(actor.x, actor.y + 2);
    ctx.scale(1, 0.34);
    const gradient = ctx.createRadialGradient(0, 0, 2, 0, 0, radius);
    gradient.addColorStop(0, `rgba(5,7,20,${opacity})`);
    gradient.addColorStop(
      0.62,
      `rgba(5,7,20,${opacity * 0.61})`,
    );
    gradient.addColorStop(1, "rgba(5,7,20,0)");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawActors() {
    drawGroundShadowAt(lumiere, 18, 0.2);
    drawGroundShadowAt(shiopon, 17, 0.36);
    drawGroundShadowAt(player, 20, 0.46);

    const actors = [
      {
        actor: lumiere,
        actorImages: lumiereImages,
        drawHeight: LUMIERE_DRAW_HEIGHT,
        glowColor: "rgba(226,210,255,.34)",
        options: {
          frameSpec: lumiereFrame,
          hover: true,
          visualOffsetY: lumiere.bobOffsetY,
        },
      },
      {
        actor: shiopon,
        actorImages: shioponImages,
        drawHeight: SHIOPON_DRAW_HEIGHT,
        glowColor: "rgba(235,210,255,.22)",
      },
      {
        actor: player,
        actorImages: images,
        drawHeight: DRAW_HEIGHT,
        glowColor: "rgba(255,236,190,.22)",
      },
    ].sort((a, b) => a.actor.y - b.actor.y);

    for (const entry of actors) {
      drawActor(
        entry.actor,
        entry.actorImages,
        entry.drawHeight,
        entry.glowColor,
        entry.options,
      );
    }
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
    ctx.ellipse(
      0,
      0,
      8 + 12 * progress,
      4 + 6 * progress,
      0,
      0,
      Math.PI * 2,
    );
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

    ctx.strokeStyle = "#e4b8ff";
    ctx.beginPath();
    ctx.arc(
      shiopon.homeRef.x,
      shiopon.homeRef.y,
      SHIOPON_WANDER_RADIUS,
      0,
      Math.PI * 2,
    );
    ctx.stroke();

    const sr = shioponRef();
    ctx.strokeStyle = "#ffb7df";
    ctx.beginPath();
    ctx.arc(sr.x, sr.y, ACTOR_COLLISION_DISTANCE, 0, Math.PI * 2);
    ctx.stroke();

    const lr = lumiereRef();
    ctx.strokeStyle = "#aeeeff";
    ctx.beginPath();
    ctx.arc(lr.x, lr.y, LUMIERE_COLLISION_DISTANCE, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    debugStatus.textContent =
      `NAV 16px · ${navigation.nodes.length} cells\n` +
      `${player.x.toFixed(1)}, ${player.y.toFixed(1)} · ${player.dir} ${player.moving ? "walk" : "idle"} ${player.frame}\n` +
      `Shiopon ${shiopon.x.toFixed(1)}, ${shiopon.y.toFixed(1)} · ${shiopon.dir} ${shiopon.moving ? "walk" : "idle"}\n` +
      `Lumiere ${lumiere.x.toFixed(1)}, ${lumiere.y.toFixed(1)} · fixed hover ${lumiere.frame}\n` +
      `${state.stick.active ? "stick" : state.keys.size ? "keyboard" : state.route.length ? "auto" : "idle"} · ${state.route.length} waypoints`;

    debugStatus.dataset.state = JSON.stringify({
      player: { ...player },
      shiopon: {
        x: shiopon.x,
        y: shiopon.y,
        dir: shiopon.dir,
        moving: shiopon.moving,
        frame: shiopon.frame,
        wait: shiopon.wait,
        target: shiopon.target,
        homeRef: shiopon.homeRef,
      },
      lumiere: {
        x: lumiere.x,
        y: lumiere.y,
        dir: lumiere.dir,
        moving: lumiere.moving,
        frame: lumiere.frame,
        bobOffsetY: lumiere.bobOffsetY,
        homeRef: lumiere.homeRef,
      },
      actorCollisionDistance: ACTOR_COLLISION_DISTANCE,
      actorGap: refDistance(playerRef(), shioponRef()),
      lumiereCollisionDistance: LUMIERE_COLLISION_DISTANCE,
      lumiereGap: refDistance(playerRef(), lumiereRef()),
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
      collisionVersion,
    });
  }

  function draw() {
    const origin = viewportOrigin();
    map.style.width = world.w + "px";
    map.style.height = world.h + "px";
    map.style.transform =
      `translate3d(${-origin.x * camera.zoom}px,${-origin.y * camera.zoom}px,0) scale(${camera.zoom})`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssWidth, cssHeight);
    ctx.save();
    ctx.scale(camera.zoom, camera.zoom);
    ctx.translate(-origin.x, -origin.y);
    drawTapEffect();
    drawActors();
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
    updateShiopon(dt);
    updateLumiere(dt);
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
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
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

  window.addEventListener("tarot-breaker:interaction-start", () => {
    controls?.suspend();
    npcSuspended = true;
    syncStick();
  });
  window.addEventListener("tarot-breaker:interaction-end", () => {
    controls?.resume();
    npcSuspended = false;
  });

  (async () => {
    try {
      note.textContent = "手動当たり判定とキャラクターを読み込んでいます…";
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
        ...Object.entries(shioponFiles).map(async ([key, src]) => {
          shioponImages[key] = await loadImage(src);
        }),
        ...Object.entries(lumiereFiles).map(async ([key, src]) => {
          lumiereImages[key] = await loadImage(src);
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
        if (
          shioponImages[dir].naturalWidth !== FRAME.w * 4 ||
          shioponImages[dir].naturalHeight !== FRAME.h
        )
          throw new Error("しおぽん" + dir + "歩行画像サイズ不正");
      }
      if (
        images.idle.naturalWidth !== FRAME.w * 4 ||
        images.idle.naturalHeight !== FRAME.h
      )
        throw new Error("待機画像サイズ不正");
      if (
        shioponImages.idle.naturalWidth !== FRAME.w * 4 ||
        shioponImages.idle.naturalHeight !== FRAME.h
      )
        throw new Error("しおぽん待機画像サイズ不正");

      if (
        lumiereImages.hover.naturalWidth % FRAME.count !== 0 ||
        lumiereImages.hover.naturalHeight <= 0
      )
        throw new Error("リュミエール浮遊画像サイズ不正");
      lumiereFrame = {
        w: lumiereImages.hover.naturalWidth / FRAME.count,
        h: lumiereImages.hover.naturalHeight,
        baseline:
          lumiereImages.hover.naturalHeight * (FRAME.baseline / FRAME.h),
        count: FRAME.count,
      };

      ready = true;
      resize();
      reset();
      draw();
      start.disabled = false;
      start.textContent = "星の国へ";
      note.textContent = "しおぽんとリュミエールが待つ星門庭園を歩いてみよう";
    } catch (error) {
      console.error(error);
      start.disabled = true;
      start.textContent = "起動できません";
      note.textContent = error.message;
    }
  })();
})();
