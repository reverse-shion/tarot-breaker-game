(() => {
  "use strict";
  if (window.__TAROT_STAGE3_ENTRY_REJECTED__ === true) return;

  const canvas = document.getElementById("game");
  let ctx = canvas.getContext("2d", { alpha: true });
  const map = document.getElementById("map-layer");
  const start = document.getElementById("start");
  const startScreen = document.getElementById("start-screen");
  const note = document.getElementById("load-note");
  const guide = document.getElementById("guide");
  const joystick = document.getElementById("joystick");
  const knob = document.getElementById("joystick-knob");


  const REF = { w: 1448, h: 1086 };
  const DEFAULT_SPAWN = { x: 724, y: 1015 };
  const SPEED = 155;
  const DPR_LIMIT = 2;
  const FRAME = { w: 384, h: 512, baseline: 480, count: 4 };
  const DRAW_HEIGHT = 78;
  const SHIOPON_DRAW_HEIGHT = 76;
  const LUMIERE_DRAW_HEIGHT = 78;
  const ACTOR_OUTLINES = {
    player: { color: "rgba(54,31,34,.92)", width: 0.72, opacity: 0.72 },
    shiopon: { color: "rgba(43,25,78,.96)", width: 1.05, opacity: 0.9 },
  };
  const SHIOPON_SPEED = 52;
  const SHIOPON_HOME = { x: 810, y: 800 };
  const SHIOPON_WANDER_RADIUS = 48;
  const SHIOPON_FOLLOW_SPEED = 210;
  const SHIOPON_FOLLOW_CATCHUP_SPEED = 285;
  const SHIOPON_FOLLOW_SPRINT_SPEED = 360;
  const SHIOPON_FOLLOW_DISTANCE = 56;
  const SHIOPON_FOLLOW_STOP = 5;
  const SHIOPON_FOLLOW_MIN_GAP = 44;
  const SHIOPON_FOLLOW_REPLAN_INTERVAL = 0.18;
  const SHIOPON_FOLLOW_REPLAN_DISTANCE = 14;
  const SHIOPON_FOLLOW_EMERGENCY_GAP = 260;
  const SHIOPON_RACE_SPEED = 235;
  const SHIOPON_RACE_DISTANCE = 92;
  const SHIOPON_TRIP_DURATION = 0.2;
  const SHIOPON_TRIP_ANGLE = Math.PI * 0.32;
  const ACTOR_COLLISION_DISTANCE = 26;
  const LUMIERE_HOME = { x: 810, y: 212 };
  const LUMIERE_COLLISION_DISTANCE = 32;
  const LUMIERE_BOB_AMPLITUDE = 2.4;
  const LUMIERE_BOB_PERIOD = 5.2;
  const LUMIERE_BOTTOM_GAP = 2.7;
  const CAMERA_MIN_ZOOM = 1.0;
  const CAMERA_MAX_ZOOM = 1.22;
  const CAMERA_BASE_OFFSET_Y = 58;
  const CAMERA_LOOK_AHEAD_Y = 28;
  const STAGE_LANDMARKS = Object.freeze({
    flower: Object.freeze({ x: 930, y: 770 }),
    fountain: Object.freeze({ x: 810, y: 500 }),
    gate: Object.freeze({ x: 810, y: 105 }),
  });
  const STAGE_DIRECTIONS = Object.freeze({
    down: Object.freeze({ x: 0, y: 1 }),
    up: Object.freeze({ x: 0, y: -1 }),
    left: Object.freeze({ x: -1, y: 0 }),
    right: Object.freeze({ x: 1, y: 0 }),
  });
  function navigateRuntime(target) {
    if (window.TarotRuntimeEntry?.navigate) {
      const result = window.TarotRuntimeEntry.navigate(target);
      if (result?.ok) return true;
      console.warn("[Runtime Entry] handoff unavailable", result?.reason);
      return false;
    }
    location.href = target;
    return true;
  }

  const params = new URLSearchParams(location.search);
  // Isolated Hoshisuna map selector. Main actor, camera, controls, sprites,
  // routing, and Shiopon follow algorithms below remain identical to main.
  const hoshisunaIsolated = location.pathname.endsWith("/hoshisuna-main.html") && params.get("dev") === "hoshisuna";
  const transformationReplay = hoshisunaIsolated &&
    params.getAll("preview").length === 1 && params.get("preview") === "manifestation";
  const stage3Dev = ["star-gate-full", "star-gate-from-lumiere"].includes(params.get("dev")) && window.__TAROT_DEV_STAGE3__ === true;
  const stage3Runtime = stage3Dev || window.__TAROT_PUBLIC_STAR_GATE__ === true;
  const enteringFromLanding = params.get("from") === "landing";
  const gardenResumeDev = stage3Dev || (params.get("from") === null &&
    /^garden-resume-(before-shiopon|after-shiopon|after-lumiere)$/.test(params.get("dev") || ""));
  const gardenResumePublic = params.getAll("entry").length === 1 && params.get("entry") === "continue" &&
    !params.has("from") && !params.has("dev");
  const enteringGardenRuntime = enteringFromLanding || gardenResumeDev || gardenResumePublic || hoshisunaIsolated;
  const landingResumeDevId = enteringFromLanding && /^landing-resume-(arrival|memory-complete|waiting)$/.test(params.get("dev") || "")
    ? params.get("dev")
    : null;
  if (enteringGardenRuntime && startScreen) startScreen.hidden = true;
  const DEPTH_DEBUG = params.has("depthDebug");
  const NAV_DEBUG = params.get("navDebug") === "1";

  const config = document.currentScript?.dataset || {};
  const COLLISION_URL =
    config.collisionUrl || "./assets/maps/star-country-gate-garden-collision.json";
  const SPRITE_BASE = config.spriteBase || "./assets/sprites/shion/";
  const SHIOPON_BASE = hoshisunaIsolated ? "./assets/sprites/shiopon/" : stage3Runtime ? "./assets/sprites/shiopon/" : (
    config.shioponBase ||
    "https://raw.githubusercontent.com/reverse-shion/tarot-breaker-game/main/assets/sprites/shiopon/");
  const LUMIERE_BASE = stage3Runtime ? "./assets/sprites/lumiere/" : (
    config.lumiereBase ||
    "./assets/sprites/lumiere/");

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
  let leavingMap = false;
  let gardenExitArmed = false;
  let gardenExitRef = { ...DEFAULT_SPAWN };
  const eastPassage = window.TarotGardenEastPassage;
  const eastPassageLine = eastPassage?.B_LINE;
  const eastPassageFeedback = eastPassage?.createFeedbackThrottle?.(1500);
  let eastPassageAttempt = false;
  let eastPassageDialogue = null;
  let eastPassageDialogueActive = false;
  let last = 0;
  let anim = 0;
  let lumiereManifest;

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
    down: LUMIERE_BASE + "lumiere_idle.webp",
    up: LUMIERE_BASE + "lumiere_hover-back.webp",
    left: LUMIERE_BASE + "lumiere_hover_left.webp",
    right: LUMIERE_BASE + "lumiere_hover_right.webp",
  };
  const images = {};
  const shioponImages = {};
  // Isolated Caritas invocation only. This atlas is the already-approved official
  // four-view Shioriel art; quadrant 0 (top-left) is the screen-facing portrait.
  let caritasShiorielAtlas = null;
  // Owner supplied 12-frame animated WebP converted lossily only into a
  // transparent 4x3 sprite atlas; no character drawing is regenerated.
  let caritasOwnerTransformationAtlas = null;
  let caritasOwnerBlendSurface = null;
  let caritasOwnerStarAtlas = null;
  let caritasResonanceSprites = null;
  let caritasTarotBack = null;
  const caritasTarotSpread={active:false,elapsed:0,since:0,paused:false};
  // Pre-transformation only. A single shared clock governs all five lights:
  // Shion, three tarot cards and Shiopon. The 5500ms transformation is separate.
  const caritasChant={phase:"idle",elapsed:0,since:0,paused:false,sealedAt:0};
  let caritasTarotShionBounds=null,caritasFoxBounds=null;
  let caritasSafeNavigator=null,caritasSafeNavigatorKey="";
  const CARITAS_OWNER_TILE = 160;
  const CARITAS_OWNER_FRAME_TIMES_MS = Object.freeze([800,500,500,500,230,230,240,350,370,380,600,800]);
  const CARITAS_MANIFESTATION_DURATION_MS = 5500;
  const caritasInvocation = { phase:"idle", locked:false, elapsed:0, since:0, paused:false, fx:null };
  const caritasInvocationProgress = () => caritasInvocation.phase==="charging"
    ? Math.min(1,(caritasInvocation.elapsed+(caritasInvocation.paused?0:Math.max(0,performance.now()-caritasInvocation.since)))/CARITAS_MANIFESTATION_DURATION_MS)
    : caritasInvocation.phase==="revealed"?1:0;
  const lumiereImages = {};
  const lumiereCompositors = {};

  function validateLumiereManifest(value) {
    const render = value?.render;
    if (value?.format !== "RGBA WebP (lossless)" || value.layout !== "single_pose" ||
        value.movement_type !== "hover" || value.phase !== 2 || value.localized_sway !== true ||
        render?.reference_body_height !== 420 || render.reference_cell_height !== FRAME.h ||
        render.draw_cell_height !== DRAW_HEIGHT || render.bottom_gap !== LUMIERE_BOTTOM_GAP ||
        render.bob_amplitude !== LUMIERE_BOB_AMPLITUDE || render.bob_period !== LUMIERE_BOB_PERIOD)
      throw new Error("リュミエール設定が実装仕様と一致しません");
    for (const dir of ["down", "up", "left", "right"]) {
      const pose = value.poses?.[dir];
      if (LUMIERE_BASE + value.files?.[dir] !== lumiereFiles[dir] ||
          pose?.actual_direction !== dir || !Number.isInteger(pose.width) || pose.width <= 0 ||
          !Number.isInteger(pose.height) || pose.height <= 0 ||
          !Number.isFinite(pose.body_top) || !Number.isFinite(pose.baseline_y) ||
          pose.body_top < 0 || pose.baseline_y <= pose.body_top || pose.baseline_y > pose.height ||
          !Number.isFinite(pose.center_x) || pose.center_x < 0 || pose.center_x > pose.width)
        throw new Error("リュミエール" + dir + "アンカー設定不正");
    }
  }

  const player = {
    x: DEFAULT_SPAWN.x,
    y: DEFAULT_SPAWN.y,
    dir: "up",
    moving: false,
    frame: 0,
    stageOffsetY: 0,
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
    following: false,
    followRoute: [],
    followReplan: 0,
    followTarget: null,
    scripted: null,
    rotation: 0,
    visualOffsetY: 0,
    stageOffsetY: 0,
    hidden: window.TarotGardenDevTransit?.context?.companion === "waiting_at_landing",
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
    stageOffsetY: 0,
  };
  const camera = {
    x: DEFAULT_SPAWN.x,
    y: DEFAULT_SPAWN.y - CAMERA_BASE_OFFSET_Y,
    zoom: 1,
  };
  const stageMotions = { shion: null, shiopon: null, lumiere: null };
  let stageCommandId = 0;
  // Page-local Aftermath ownership; absent from ordinary gameplay.
  let aftermathPaused = false;
  let aftermathFocusBaseline = null;
  let aftermathOwner = null;
  let aftermathLumiereEnabled = true;
  const aftermathMotions = new Set();
  const heldKeys = new Set(), heldPointers = new Set();
  const releaseKeys = new Set(), releasePointers = new Set();

  const cinematicCamera = {
    active: false,
    owned: false,
    generation: 0,
    allowOverscan: false,
    startX: 0,
    startY: 0,
    startZoom: 1,
    targetX: 0,
    targetY: 0,
    targetZoom: 1,
    elapsed: 0,
    duration: 0,
    resolve: null,
  };
  const actorVisibility = { shion: 1, shiopon: 1, lumiere: 1 };
  const VISION_REGISTRATION = Object.freeze({
    // Static cinematic plate registration. Coverage safety is validated
    // against every reachable Future Vision camera shot, not unused world edges.
    // Keep the authored gate / stair / fountain axis centered while revealing
    // more of the ruins above the player.
    scale: 1.10,
    offsetX: -72,
    offsetY: -330,
  });
  const visionWorld = { image: null, src: "", opacity: 0, active: false, token: 0 };

  function loadVisionWorld(src, {signal, prepared, token = ++visionWorld.token} = {}) {
    const interrupted = () => { const error = new Error("Future Vision entry interrupted"); error.name = "AbortError"; return error; };
    const live = () => !signal?.aborted && token === visionWorld.token;
    if (!live()) return Promise.reject(interrupted());
    if (prepared) {
      if (!prepared.complete || !prepared.naturalWidth || !prepared.naturalHeight)
        return Promise.reject(new Error("Future Vision prepared image unavailable"));
      visionWorld.image = prepared;
      visionWorld.src = src;
      return Promise.resolve(prepared);
    }
    if (visionWorld.image && visionWorld.src === src && visionWorld.image.complete)
      return Promise.resolve(visionWorld.image);
    const image = new Image();
    image.decoding = "async";
    return new Promise((resolve, reject) => {
      let settled = false;
      const finish = (error) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        signal?.removeEventListener("abort", abort);
        image.onload = image.onerror = null;
        if (error) {
          if (token === visionWorld.token) visionWorld.token++;
          reject(error);
        } else resolve(image);
      };
      const abort = () => finish(interrupted());
      const timeout = setTimeout(() => finish(new Error("Future Vision image/decode deadline")), 10000);
      signal?.addEventListener("abort", abort, {once:true});
      image.onload = async () => {
        try { await image.decode(); } catch (error) { finish(error); return; }
        if (settled) return;
        if (!live()) { finish(interrupted()); return; }
        if (!image.naturalWidth || !image.naturalHeight) { finish(new Error("Future Vision decoded image unavailable")); return; }
        visionWorld.image = image;
        visionWorld.src = src;
        finish();
      };
      image.onerror = () => finish(new Error("Future Vision world image failed to load"));
      image.src = src;
    });
  }

  function drawVisionWorld() {
    if (!visionWorld.active || !visionWorld.image || visionWorld.opacity <= 0) return;
    ctx.save();
    ctx.globalAlpha = visionWorld.opacity;
    ctx.imageSmoothingEnabled = true;
    // Cinematic Vision is a single authored plate registered once into the
    // multi-layer garden world. Registration is immutable for the whole vision.
    const r = VISION_REGISTRATION;
    ctx.drawImage(
      visionWorld.image,
      r.offsetX * scale.x,
      r.offsetY * scale.y,
      world.w * r.scale,
      world.h * r.scale,
    );
    ctx.restore();
  }



  // Keep the shrinking background plane's outer edge outside the viewport.
  // Artwork registration and its scale are unchanged; only the drawing surface grows.
  function stage3BackgroundBounds(width,height,anchor) {
    const left=Math.floor(Math.min(0,-anchor.x/9))-1;
    const top=Math.floor(Math.min(0,-anchor.y/9))-1;
    const right=Math.ceil(Math.max(width,width+(width-anchor.x)/9))+1;
    const bottom=Math.ceil(Math.max(height,height+(height-anchor.y)/9))+1;
    return {left,top,width:right-left,height:bottom-top};
  }

  let normalCameraZoom = 1;
  let absorptionSurface = null;
  let sceneLockOwner = null;
  let sceneLockPrior = null;
  // One-time Stage3 to Aftermath return-camera lease.
  let returnCameraHandoff = null;
  let outsideInteraction = false;

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
    const data = await response.json();
    // Shared navigation ignores blockedAreas; apply Starroad's NPC exclusion
    // to all collision methods (including pathfinding), never to main Garden.
    const baseCollision = createCollision(!hoshisunaIsolated && window.TarotSceneLayout ? {
      ...data, blockedAreas: [...(data.blockedAreas || []), ...window.TarotSceneLayout.solidBases],
    } : data);
    collision = hoshisunaIsolated
      ? window.TarotHoshisunaCollision.wrap(baseCollision)
      : baseCollision;
    walkAreas = collision.areas;
    collisionVersion = collision.version;
    // The authored pathfinder remains unchanged across lock/unlock.
    // Guard player movement only; scripted actors, map surfaces and
    // verified Garden exits continue to use the base collision.
    const playerCollision = !hoshisunaIsolated && enteringGardenRuntime && eastPassage?.validLine?.(eastPassageLine) ? {
      ...collision,
      segmentClear(from, to) {
        if (!collision.segmentClear(from, to)) return false;
        if (!eastPassage.wouldBlock(from, to, eastPassageLine, false)) return true;
        if (eastPassage.routeKnown()) return true;
        // Navigation search may probe the wall from far away. Only a
        // nearby step originating from Shion may trigger his remark.
        if (running && !eastPassageDialogueActive && !sceneLockOwner &&
            refDistance(from, playerRef()) <= 9 &&
            eastPassage.distanceToLine(playerRef(), eastPassageLine) <= 36) {
          eastPassageAttempt = true;
        }
        return false;
      },
    } : collision;
    navigation = createNavigator(collision, 16);
    controls = createControls(playerCollision, navigation);
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
    const image = new Image();
    // Lumiere's localized sway compositor reads pixels with getImageData().
    // RawGitHack can redirect WebP assets to a different origin; request CORS
    // before src is assigned so the resulting Canvas stays origin-clean.
    if (Object.values(lumiereFiles).includes(src)) image.crossOrigin = "anonymous";
    image.src = src;
    return window.TarotSceneEffects.waitImage(image);
  }

  function waitForMap() {
    return window.TarotSceneEffects.waitImage(map);
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    cssWidth = Math.max(1, rect.width);
    cssHeight = Math.max(1, rect.height);
    dpr = Math.min(window.devicePixelRatio || 1, DPR_LIMIT);
    canvas.width = Math.round(cssWidth * dpr);
    canvas.height = Math.round(cssHeight * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    normalCameraZoom = clamp(
      Math.min(cssWidth / 620, cssHeight / 560),
      CAMERA_MIN_ZOOM,
      CAMERA_MAX_ZOOM,
    );
    if (!cinematicCamera.owned) camera.zoom = normalCameraZoom;
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
    shiopon.following = false;
    shiopon.followRoute = [];
    shiopon.followReplan = 0;
    shiopon.followTarget = null;
    shiopon.scripted = null;
    shiopon.rotation = 0;
    shiopon.visualOffsetY = 0;
    shiopon.stageOffsetY = 0;
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
    lumiere.stageOffsetY = 0;
  }

  function reset() {
    cancelAllStageMotions(false);
    controls?.clearInput("reset");
    tapEffect = null;
    anim = 0;
    syncStick();
    player.x = spawnRef.x * scale.x;
    player.y = spawnRef.y * scale.y;
    player.dir = "up";
    player.moving = false;
    player.frame = 0;
    player.stageOffsetY = 0;
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

  function stageActor(actorId) {
    return { shion: player, shiopon, lumiere }[actorId] || null;
  }

  function stageActorRef(actorId) {
    if (actorId === "shion") return playerRef();
    if (actorId === "shiopon") return shioponRef();
    if (actorId === "lumiere") return lumiereRef();
    return null;
  }

  function stageTargetRef(target) {
    if (typeof target === "string")
      return stageActorRef(target) || STAGE_LANDMARKS[target] || null;
    if (Number.isFinite(target?.x) && Number.isFinite(target?.y))
      return { x: target.x, y: target.y };
    return null;
  }

  function resolvedStageAction(id, result = { completed: true, skipped: false }) {
    return Object.freeze({
      id,
      promise: Promise.resolve(result),
      finish() {},
      cancel() {},
    });
  }

  function settleStageMotion(actorId, motion, { snap = false, skipped = false } = {}) {
    if (stageMotions[actorId] !== motion) return;
    const actor = stageActor(actorId);
    if (actor && snap && motion.kind === "move") {
      actor.x = motion.final.x * scale.x;
      actor.y = motion.final.y * scale.y;
    }
    if (actor) {
      actor.stageOffsetY = 0;
      actor.moving = false;
      actor.frame = 0;
      if ("anim" in actor) actor.anim = 0;
    }
    if (actorId === "shion") anim = 0;
    stageMotions[actorId] = null;
    motion.resolve({ completed: true, skipped });
  }

  function cancelAllStageMotions(snap = false) {
    for (const actorId of Object.keys(stageMotions)) {
      const motion = stageMotions[actorId];
      if (motion) settleStageMotion(actorId, motion, { snap, skipped: true });
    }
  }

  function legalStageRoute(actorId, current, requested) {
    if (actorId === "lumiere") return [{ ...requested }];
    if (!collision || !navigation) return [];

    const destination = isWalkableRef(requested.x, requested.y)
      ? requested
      : collision.nearestWalkable(requested);
    if (!destination) return [];
    if (collision.segmentClear(current, destination)) return [{ ...destination }];
    return (
      navigation.findPath(current, destination)?.points
        ?.slice(1)
        .map((point) => ({ ...point })) || []
    );
  }

  function performStageCommand(command = {}) {
    const id = ++stageCommandId;
    const actorId = command.actor;
    const actor = stageActor(actorId);
    if (!actor) return resolvedStageAction(id, { completed: false, skipped: false });

    if (command.type === "face" || command.type === "lookTarget") {
      const target = stageTargetRef(command.target);
      const current = stageActorRef(actorId);
      if (target && current)
        setDirection(actor, target.x - current.x, target.y - current.y);
      actor.moving = false;
      actor.frame = 0;
      return resolvedStageAction(id);
    }

    if (!ready) return resolvedStageAction(id, { completed: false, skipped: false });
    const existing = stageMotions[actorId];
    if (existing)
      settleStageMotion(actorId, existing, { snap: true, skipped: true });

    const current = stageActorRef(actorId);
    if (command.type === "bounce") {
      let resolveMotion;
      const motion = {
        id,
        kind: "bounce",
        elapsed: 0,
        duration: clamp(Number(command.duration) || 320, 80, 900) / 1000,
        height: clamp(Number(command.height) || 7, 1, 14),
        resolve: (value) => resolveMotion(value),
      };
      const promise = new Promise((resolve) => {
        resolveMotion = resolve;
      });
      stageMotions[actorId] = motion;
      return Object.freeze({
        id,
        promise,
        finish: () =>
          settleStageMotion(actorId, motion, { snap: true, skipped: true }),
        cancel: () =>
          settleStageMotion(actorId, motion, { snap: false, skipped: true }),
      });
    }

    let requested = null;
    if (command.type === "approach") {
      const target = stageTargetRef(command.target);
      if (target) {
        let dx = current.x - target.x;
        let dy = current.y - target.y;
        let length = Math.hypot(dx, dy);
        if (length < 1e-6) {
          dx = 0;
          dy = 1;
          length = 1;
        }
        const gap = clamp(Number(command.distance) || 46, 32, 90);
        requested = {
          x: target.x + (dx / length) * gap,
          y: target.y + (dy / length) * gap,
        };
      }
    } else if (command.type === "step") {
      const direction = STAGE_DIRECTIONS[command.direction || actor.dir];
      if (direction) {
        const distance = clamp(Number(command.distance) || 12, 2, 64);
        requested = {
          x: current.x + direction.x * distance,
          y: current.y + direction.y * distance,
        };
      }
    } else if (command.type === "move") {
      requested = stageTargetRef(command.target || command.to);
    }

    if (!requested) return resolvedStageAction(id, { completed: false, skipped: false });
    const caritasSafe=hoshisunaIsolated&&actorId==="shiopon"&&command.caritasSafe===true;
    const caritasCards=caritasSafe&&caritasTarotSpread.active;
    const route=caritasSafe
      ?caritasSafeRoute(current,requested,caritasCards)
      :legalStageRoute(actorId,current,requested);
    if (!route.length)
      return resolvedStageAction(id, { completed: false, skipped: false });

    let previous = current;
    let routeDistance = 0;
    for (const point of route) {
      routeDistance += refDistance(previous, point);
      previous = point;
    }
    if (routeDistance < 0.5) return resolvedStageAction(id);

    let resolveMotion;
    const duration = clamp(Number(command.duration) || 240, 80, 1400) / 1000;
    const motion = {
      id,
      kind: "move",
      route,
      final: { ...route.at(-1) },
      speed: routeDistance / duration,
      caritasSafe,caritasCards,
      anim: 0,
      resolve: (value) => resolveMotion(value),
    };
    const promise = new Promise((resolve) => {
      resolveMotion = resolve;
    });
    stageMotions[actorId] = motion;
    return Object.freeze({
      id,
      promise,
      finish: () =>
        settleStageMotion(actorId, motion, { snap: true, skipped: true }),
      cancel: () =>
        settleStageMotion(actorId, motion, { snap: false, skipped: true }),
    });
  }

  function updateStageActor(actorId, dt) {
    const motion = stageMotions[actorId];
    if (!motion) return false;
    if (stage3Runtime && aftermathPaused && aftermathMotions.has(motion.id)) return true;
    const actor = stageActor(actorId);

    if (motion.kind === "bounce") {
      motion.elapsed += dt;
      const progress = clamp(motion.elapsed / motion.duration, 0, 1);
      actor.stageOffsetY = -Math.sin(progress * Math.PI) * motion.height * scale.y;
      actor.moving = false;
      actor.frame = 0;
      if (progress >= 1) settleStageMotion(actorId, motion);
      return true;
    }

    const current = stageActorRef(actorId);
    while (motion.route.length && refDistance(current, motion.route[0]) <= 0.75)
      motion.route.shift();
    const target = motion.route[0];
    if (!target) {
      settleStageMotion(actorId, motion, { snap: true });
      return true;
    }

    const dx = target.x - current.x;
    const dy = target.y - current.y;
    const distance = Math.hypot(dx, dy);
    const step = Math.min(distance, motion.speed * dt);
    const next={x:current.x+(dx/distance)*step,y:current.y+(dy/distance)*step};
    if(motion.caritasSafe&&!caritasSafeCollision(motion.caritasCards).segmentClear(current,next)){
      settleStageMotion(actorId,motion,{skipped:true});
      return true;
    }
    actor.x = next.x * scale.x;
    actor.y = next.y * scale.y;
    actor.moving = true;
    setDirection(actor, dx, dy);
    if (actorId !== "lumiere") {
      motion.anim += dt;
      const frameDuration = actorId === "shion" ? 0.12 : 0.13;
      while (motion.anim >= frameDuration) {
        motion.anim -= frameDuration;
        actor.frame = (actor.frame + 1) % FRAME.count;
      }
    }
    if (step >= distance - 1e-6) {
      motion.route.shift();
      if (!motion.route.length)
        settleStageMotion(actorId, motion, { snap: true });
    }
    return true;
  }

  function showEastPassageDialogue() {
    if (!eastPassageAttempt || !eastPassageFeedback) return;
    eastPassageAttempt = false;
    if (!running || eastPassageDialogueActive || sceneLockOwner ||
        outsideInteraction || window.TarotDialogue?.getState?.().active) return;
    if (!eastPassageFeedback.permit(performance.now())) return;
    if (!window.TarotDialogueUI?.create) return;
    if (!eastPassageDialogue) {
      eastPassageDialogue = window.TarotDialogueUI.create({
        mount: document.getElementById("game-shell"),
        ids: {layer: "east-passage-dialogue", advance: "east-passage-advance",
          speaker: "east-passage-speaker", text: "east-passage-text"},
        onAdvance() {
          eastPassageDialogue?.hide();
          eastPassageDialogueActive = false;
          if (!sceneLockOwner && !outsideInteraction) controls?.resume();
        },
      });
    }
    eastPassageDialogueActive = true;
    controls?.suspend();
    syncStick();
    eastPassageDialogue.show({actor: "shion", speaker: "シオン",
      text: "……この先は、しばらく使っていない道だ。今は引き返そう。"});
  }

  function updatePlayer(dt) {
    if (leavingMap) return;
    if (updateStageActor("shion", dt)) return;
    const from = playerRef();
    const next = controls.step(from, dt, SPEED);
    if (eastPassageAttempt) showEastPassageDialogue();

    // A proximity event can begin inside the wrapped controls.step call.
    if (stageMotions.shion) {
      player.x = next.x * scale.x;
      player.y = next.y * scale.y;
      player.moving = false;
      player.frame = 0;
      anim = 0;
      return;
    }

    const shioponBlocked =
      !shiopon.hidden && !shiopon.following && movingIntoActor(from, next, shioponRef());
    const npcBlocked =
      next.moving &&
      (shioponBlocked ||
        (!hoshisunaIsolated && !(stage3Runtime && !aftermathLumiereEnabled) && movingIntoActor(
          from,
          next,
          lumiereRef(),
          LUMIERE_COLLISION_DISTANCE,
        )));
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

    if (next.y < gardenExitRef.y - 8) gardenExitArmed = true;

    // South edge of Star Gate Garden returns to the PAD landing map.
    // Keep a small x window around the entrance path so ordinary movement near
    // the lower corners cannot trigger a map transition.
    const gardenPos = { x: next.x, y: next.y };
    if (
      !hoshisunaIsolated && !stage3Dev && enteringGardenRuntime && gardenExitArmed && !leavingMap && next.moving &&
      !window.TarotDialogue?.getState().active &&
      next.dy > 0 && gardenPos.y >= gardenExitRef.y - 4 &&
      gardenPos.x >= 610 &&
      gardenPos.x <= 838
    ) {
      leavingMap = true;
      if (landingResumeDevId) {
        const transit = window.TarotGardenDevTransit;
        if (!transit?.ok) {
          leavingMap = false;
          controls.cancel("dev-return-blocked");
          return;
        }
        try {
          transit.progress.commitArrival({
            sourceMapId: "star_gate_garden",
            destinationMapId: "star_country_landing",
            spawnId: "garden_entrance",
            reason: "garden_to_landing",
          });
        } catch (error) {
          leavingMap = false;
          controls.cancel("dev-return-failed");
          console.warn("[Garden Continue] return was not committed", error);
          return;
        }
      } else {
        window.TarotJourney?.set("companion", shiopon.following ? { mode: "following" } : null);
      }
      controls.cancel("map-return");
      navigateRuntime(landingResumeDevId ? `./star-country-landing.html?from=garden&dev=${encodeURIComponent(landingResumeDevId)}` : "./star-country-landing.html?from=garden");
      return;
    }

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

  function faceShioponTowardPlayer() {
    if (!ready) return;
    const current = shioponRef();
    const playerNow = playerRef();
    shiopon.target = null;
    shiopon.moving = false;
    shiopon.frame = 0;
    shiopon.anim = 0;
    setDirection(shiopon, playerNow.x - current.x, playerNow.y - current.y);
  }

  function shioponFollowTarget() {
    const playerNow = playerRef();
    const behind = {
      up: { x: 0, y: 1 },
      down: { x: 0, y: -1 },
      left: { x: 1, y: 0 },
      right: { x: -1, y: 0 },
    }[player.dir] || { x: 0, y: 1 };

    for (const gap of [
      SHIOPON_FOLLOW_DISTANCE,
      SHIOPON_FOLLOW_DISTANCE + 8,
      SHIOPON_FOLLOW_DISTANCE - 8,
    ]) {
      const candidate = {
        x: playerNow.x + behind.x * gap,
        y: playerNow.y + behind.y * gap,
      };
      if (
        isWalkableRef(candidate.x, candidate.y) &&
        refDistance(candidate, playerNow) >= SHIOPON_FOLLOW_MIN_GAP
      ) {
        return candidate;
      }
    }

    const fallback = collision.nearestWalkable({
      x: playerNow.x + behind.x * SHIOPON_FOLLOW_DISTANCE,
      y: playerNow.y + behind.y * SHIOPON_FOLLOW_DISTANCE,
    });
    if (
      fallback &&
      refDistance(fallback, playerNow) >= SHIOPON_FOLLOW_MIN_GAP
    ) {
      return fallback;
    }
    return shioponRef();
  }

  function moveShioponFollowStep(current, next, target) {
    if (isWalkableRef(next.x, next.y) && collision.segmentClear(current, next))
      return next;

    const horizontal = { x: next.x, y: current.y };
    const vertical = { x: current.x, y: next.y };
    const candidates = [horizontal, vertical]
      .filter(
        (point) =>
          isWalkableRef(point.x, point.y) &&
          collision.segmentClear(current, point),
      )
      .sort((a, b) => refDistance(a, target) - refDistance(b, target));
    return candidates[0] || current;
  }

  function planShioponFollowRoute(current, target) {
    if (collision.segmentClear(current, target)) return [{ ...target }];
    const plan = navigation?.findPath(current, target);
    return plan?.points?.slice(1).map((point) => ({ ...point })) || [];
  }

  function updateShioponFollow(dt) {
    const current = shioponRef();
    const playerNow = playerRef();
    const target = shioponFollowTarget();
    const playerGap = refDistance(current, playerNow);
    const targetMoved =
      !shiopon.followTarget ||
      refDistance(shiopon.followTarget, target) >= SHIOPON_FOLLOW_REPLAN_DISTANCE;

    shiopon.followReplan -= dt;
    if (
      targetMoved ||
      shiopon.followReplan <= 0 ||
      !shiopon.followRoute.length
    ) {
      shiopon.followRoute = planShioponFollowRoute(current, target);
      shiopon.followTarget = { ...target };
      shiopon.followReplan = SHIOPON_FOLLOW_REPLAN_INTERVAL;
    }

    while (
      shiopon.followRoute.length &&
      refDistance(current, shiopon.followRoute[0]) <= SHIOPON_FOLLOW_STOP
    ) {
      shiopon.followRoute.shift();
    }

    let waypoint = shiopon.followRoute[0];
    if (!waypoint && playerGap > SHIOPON_FOLLOW_EMERGENCY_GAP) {
      if (isWalkableRef(target.x, target.y)) {
        shiopon.x = target.x * scale.x;
        shiopon.y = target.y * scale.y;
        shiopon.followRoute = [];
        shiopon.followTarget = { ...target };
        shiopon.moving = false;
        shiopon.frame = 0;
        shiopon.anim = 0;
        shiopon.dir = player.dir;
        return;
      }
    }
    waypoint ||= target;

    const dx = waypoint.x - current.x;
    const dy = waypoint.y - current.y;
    const distance = Math.hypot(dx, dy);
    if (distance <= SHIOPON_FOLLOW_STOP) {
      shiopon.moving = false;
      shiopon.frame = 0;
      shiopon.anim = 0;
      shiopon.dir = player.dir;
      return;
    }

    const speed =
      playerGap > 170
        ? SHIOPON_FOLLOW_SPRINT_SPEED
        : playerGap > 95
          ? SHIOPON_FOLLOW_CATCHUP_SPEED
          : SHIOPON_FOLLOW_SPEED;
    const step = Math.min(distance, speed * dt);
    let next = {
      x: current.x + (dx / distance) * step,
      y: current.y + (dy / distance) * step,
    };
    next = moveShioponFollowStep(current, next, waypoint);

    if (refDistance(next, playerNow) < SHIOPON_FOLLOW_MIN_GAP) {
      const awayX = current.x - playerNow.x;
      const awayY = current.y - playerNow.y;
      const awayLength = Math.hypot(awayX, awayY);
      if (awayLength > 1e-6) {
        const separated = {
          x: playerNow.x + (awayX / awayLength) * SHIOPON_FOLLOW_MIN_GAP,
          y: playerNow.y + (awayY / awayLength) * SHIOPON_FOLLOW_MIN_GAP,
        };
        if (isWalkableRef(separated.x, separated.y)) next = separated;
      } else {
        next = target;
      }
    }

    if (next.x === current.x && next.y === current.y) {
      shiopon.followReplan = 0;
      shiopon.moving = false;
      shiopon.frame = 0;
      shiopon.anim = 0;
      return;
    }

    shiopon.x = next.x * scale.x;
    shiopon.y = next.y * scale.y;
    shiopon.moving = true;
    setDirection(shiopon, next.x - current.x, next.y - current.y);
    shiopon.anim += dt;
    while (shiopon.anim >= 0.13) {
      shiopon.anim -= 0.13;
      shiopon.frame = (shiopon.frame + 1) % FRAME.count;
    }
  }

  function startShioponRace() {
    if (!ready) return;
    const current = shioponRef();
    const requested = { x: current.x, y: current.y - SHIOPON_RACE_DISTANCE };
    const target = collision.nearestWalkable(requested) || current;
    const plan = navigation?.findPath(current, target);
    const route =
      plan?.points?.slice(1).map((point) => ({ ...point })) ||
      (collision.segmentClear(current, target) ? [{ ...target }] : []);

    shiopon.following = false;
    shiopon.followRoute = [];
    shiopon.followTarget = null;
    shiopon.target = null;
    shiopon.scripted = { type: "race", phase: "run", route, elapsed: 0 };
    shiopon.rotation = 0;
    shiopon.visualOffsetY = 0;
    shiopon.dir = "up";
    shiopon.moving = route.length > 0;
    shiopon.frame = 0;
    shiopon.anim = 0;
  }

  function tripShiopon() {
    if (!ready) return;
    if (!shiopon.scripted)
      shiopon.scripted = { type: "race", phase: "trip", route: [], elapsed: 0 };
    shiopon.scripted.phase = "trip";
    shiopon.scripted.elapsed = 0;
    shiopon.moving = false;
    shiopon.frame = 0;
    shiopon.anim = 0;
  }

  function recoverShiopon() {
    if (!ready) return;
    shiopon.scripted = null;
    shiopon.rotation = 0;
    shiopon.visualOffsetY = 0;
    shiopon.moving = false;
    shiopon.frame = 0;
    shiopon.anim = 0;
    faceShioponTowardPlayer();
  }

  function updateShioponScript(dt) {
    const script = shiopon.scripted;
    if (!script) return;

    if (script.phase === "run") {
      const current = shioponRef();
      while (script.route.length && refDistance(current, script.route[0]) <= 3)
        script.route.shift();
      const target = script.route[0];
      if (!target) {
        shiopon.moving = false;
        shiopon.frame = 0;
        shiopon.anim = 0;
        shiopon.dir = "up";
        return;
      }
      const dx = target.x - current.x;
      const dy = target.y - current.y;
      const distance = Math.hypot(dx, dy);
      const step = Math.min(distance, SHIOPON_RACE_SPEED * dt);
      const next = {
        x: current.x + (dx / distance) * step,
        y: current.y + (dy / distance) * step,
      };
      if (isWalkableRef(next.x, next.y) && collision.segmentClear(current, next)) {
        shiopon.x = next.x * scale.x;
        shiopon.y = next.y * scale.y;
        shiopon.moving = true;
        setDirection(shiopon, dx, dy);
        shiopon.anim += dt;
        while (shiopon.anim >= 0.1) {
          shiopon.anim -= 0.1;
          shiopon.frame = (shiopon.frame + 1) % FRAME.count;
        }
      } else {
        script.route = planShioponFollowRoute(current, target);
      }
      return;
    }

    if (script.phase === "trip") {
      script.elapsed += dt;
      const progress = clamp(script.elapsed / SHIOPON_TRIP_DURATION, 0, 1);
      const eased = 1 - (1 - progress) ** 3;
      shiopon.rotation = SHIOPON_TRIP_ANGLE * eased;
      shiopon.visualOffsetY = Math.sin(progress * Math.PI) * 3;
      shiopon.moving = false;
      shiopon.frame = 0;
      if (progress >= 1) {
        script.phase = "fallen";
        shiopon.visualOffsetY = 0;
      }
      return;
    }

    shiopon.moving = false;
    shiopon.frame = 0;
  }

  function updateShiopon(dt) {
    if (stage3Runtime && aftermathPaused) return;
    if (shiopon.hidden) return;
    if (updateStageActor("shiopon", dt)) return;
    // Scripted Caritas first invocation owns this very same actor, not a clone.
    if (hoshisunaIsolated && caritasInvocation.locked) {
      shiopon.moving=false;shiopon.frame=0;return;
    }
    if (shiopon.scripted) {
      updateShioponScript(dt);
      return;
    }

    if (npcSuspended) {
      shiopon.moving = false;
      shiopon.frame = 0;
      return;
    }

    if (shiopon.following) {
      updateShioponFollow(dt);
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
    if (stage3Runtime && (aftermathPaused || !aftermathLumiereEnabled)) return;
    updateStageActor("lumiere", dt);
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
    if (stage3Runtime && aftermathPaused && aftermathOwner) return;
    if (cinematicCamera.active) {
      cinematicCamera.elapsed += dt;
      const t = cinematicCamera.duration > 0 ? Math.min(1, cinematicCamera.elapsed / cinematicCamera.duration) : 1;
      const eased = t * t * (3 - 2 * t);
      camera.x = cinematicCamera.startX + (cinematicCamera.targetX - cinematicCamera.startX) * eased;
      camera.y = cinematicCamera.startY + (cinematicCamera.targetY - cinematicCamera.startY) * eased;
      camera.zoom = cinematicCamera.startZoom + (cinematicCamera.targetZoom - cinematicCamera.startZoom) * eased;
      if (t >= 1) {
        cinematicCamera.active = false;
        const done = cinematicCamera.resolve;
        cinematicCamera.resolve = null;
        done?.({ completed: true });
      }
      return;
    }
    if (cinematicCamera.owned) return;


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
    if (cinematicCamera.owned && cinematicCamera.allowOverscan) return {x: camera.x - viewW / 2, y: camera.y - viewH / 2};
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
    sourceY,
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
      sourceY,
      sourceW,
      sourceH,
      dx,
      dy,
      drawW,
      drawH,
    );
    ctx.restore();
  }

  function drawOutlinePass(
    image,
    sourceX,
    sourceY,
    sourceW,
    sourceH,
    dx,
    dy,
    drawW,
    drawH,
    { color, width, opacity },
  ) {
    const step = width / camera.zoom;
    const offsets = [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
      [-0.72, -0.72],
      [0.72, -0.72],
      [-0.72, 0.72],
      [0.72, 0.72],
    ];
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.filter = "brightness(0)";
    ctx.globalAlpha = opacity;
    ctx.shadowColor = color;
    ctx.shadowBlur = 0;
    for (const [offsetX, offsetY] of offsets) {
      ctx.shadowOffsetX = offsetX * step;
      ctx.shadowOffsetY = offsetY * step;
      ctx.drawImage(
        image,
        sourceX,
        sourceY,
        sourceW,
        sourceH,
        dx,
        dy,
        drawW,
        drawH,
      );
    }
    ctx.restore();
  }

  function drawActor(
    actor,
    actorImages,
    drawHeight,
    glowColor,
    {
      frameSpec = FRAME,
      hover = false,
      visualOffsetY = 0,
      rotation = 0,
      outline = ACTOR_OUTLINES.player,
    } = {},
  ) {
    if (hover) {
      const dir = actorImages[actor.dir] ? actor.dir : "down";
      const compositor = lumiereCompositors[dir];
      const image = compositor.draw(actor.bobPhase);
      const pose = lumiereManifest.poses[dir];
      const bodyHeight = DRAW_HEIGHT * lumiereManifest.render.reference_body_height / FRAME.h;
      const poseScale = bodyHeight / (pose.baseline_y - pose.body_top);
      ctx.save();
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.globalAlpha = 1;
      // Keep the existing Lumiere shadow; do not add outlines or glow effects.
      ctx.shadowColor = "rgba(54,41,58,.65)";
      ctx.shadowBlur = 0.7 / camera.zoom;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
      ctx.drawImage(image, 0, 0, compositor.width, compositor.height,
        actor.x - pose.center_x * poseScale,
        actor.y - LUMIERE_BOTTOM_GAP * scale.y - pose.baseline_y * poseScale + visualOffsetY,
        pose.width * poseScale, pose.height * poseScale);
      ctx.restore();
      return;
    }
    const scaleDraw = drawHeight / frameSpec.h;
    const sourceRect = { x: 0, y: 0, w: frameSpec.w, h: frameSpec.h };
    const drawW = sourceRect.w * scaleDraw;
    const drawH = sourceRect.h * scaleDraw;
    const dx = actor.x - drawW / 2;
    const dy = actor.y - frameSpec.baseline * scaleDraw + visualOffsetY;
    const rotated = Math.abs(rotation) > 1e-6;
    if (rotated) {
      ctx.save();
      ctx.translate(actor.x, actor.y);
      ctx.rotate(rotation);
      ctx.translate(-actor.x, -actor.y);
    }
    const { image, sourceX } = hover
      ? {
          image: actorImages.hover,
          sourceX: actor.frame * frameSpec.w + sourceRect.x,
        }
      : spriteFrame(actor, actorImages, frameSpec);
    drawOutlinePass(
      image,
      sourceX,
      sourceRect.y,
      sourceRect.w,
      sourceRect.h,
      dx,
      dy,
      drawW,
      drawH,
      outline,
    );
    drawSpritePass(
      image,
      sourceX,
      sourceRect.y,
      sourceRect.w,
      sourceRect.h,
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
      sourceRect.y,
      sourceRect.w,
      sourceRect.h,
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
      sourceRect.y,
      sourceRect.w,
      sourceRect.h,
      dx,
      dy,
      drawW,
      drawH,
    );
    ctx.restore();
    if (rotated) ctx.restore();
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

  let futureCurrentShionSurface = null;
  function drawFutureCurrentShionComposite(entry, opacity) {
    futureCurrentShionSurface ||= document.createElement("canvas");
    const surface = futureCurrentShionSurface;
    const density = Math.min(2, dpr * camera.zoom);
    const left = player.x - 84 * scale.x;
    const top = player.y + player.stageOffsetY - 110 * scale.y;
    const width = 168 * scale.x, height = 142 * scale.y;
    const pixelWidth = Math.ceil(width * density), pixelHeight = Math.ceil(height * density);
    if (surface.width !== pixelWidth || surface.height !== pixelHeight) {surface.width=pixelWidth; surface.height=pixelHeight;}
    const target=surface.getContext("2d");
    target.setTransform(1,0,0,1,0,0); target.clearRect(0,0,pixelWidth,pixelHeight);
    target.setTransform(pixelWidth/width,0,0,pixelHeight/height,-left*pixelWidth/width,-top*pixelHeight/height);
    target.globalAlpha=1;
    const previous=ctx; ctx=target;
    try {
      drawGroundShadowAt({x:player.x,y:player.y+player.stageOffsetY},20,.46);
      drawActor(entry.actor,entry.actorImages,entry.drawHeight,entry.glowColor,entry.options);
    } finally {ctx=previous;}
    ctx.save(); ctx.globalAlpha *= opacity;
    ctx.drawImage(surface,0,0,pixelWidth,pixelHeight,left,top,width,height);
    ctx.restore();
  }



  // This effect samples the ACTUAL approved map sprites. No generated character
  // substitute, hard-coded screenshot or extra asset download is involved.
  // Cache once when invocation starts; never sample canvas pixels per frame.
  function prepareCaritasPixelManifestation() {
    const source = shioponImages.idle || shioponImages.down;
    if (!source || !caritasShiorielAtlas) return null;
    const result = { fragments:[], silhouette:null, source };
    const sample = document.createElement("canvas");
    sample.width=96;sample.height=128;
    try {
      const g=sample.getContext("2d",{willReadFrequently:true});
      g.imageSmoothingEnabled=false;
      g.drawImage(source,0,0,FRAME.w,FRAME.h,0,0,96,128);
      const rgba=g.getImageData(0,0,96,128).data;
      // Use tiles from Shiopon's real sprite; omit transparent background.
      for(let row=0;row<128;row+=7)for(let col=0;col<96;col+=7){
        const px=Math.min(95,col+3),py=Math.min(127,row+3);
        const alpha=rgba[(py*96+px)*4+3];
        if(alpha<90 || (col*17+row*13)%5===0)continue;
        const hash=((col*41+row*31)%97)/97;
        result.fragments.push({
          sx:col*FRAME.w/96,sy:row*FRAME.h/128,
          sw:Math.min(7,96-col)*FRAME.w/96,
          sh:Math.min(7,128-row)*FRAME.h/128,
          vx:(hash-.5)*54,vy:24+hash*49,
          delay:(row/128)*.24+hash*.10
        });
      }
      // Build a colored silhouette from Shioriel's own front-facing pixels.
      // The crystal, ears, long hair, robes, and wings keep their real outline.
      const aura=document.createElement("canvas");
      aura.width=caritasShiorielAtlas.naturalWidth/2;
      aura.height=caritasShiorielAtlas.naturalHeight/2;
      const a=aura.getContext("2d");
      a.drawImage(caritasShiorielAtlas,0,0,aura.width,aura.height,0,0,aura.width,aura.height);
      a.globalCompositeOperation="source-in";
      a.fillStyle="#d0adff";a.fillRect(0,0,aura.width,aura.height);
      result.silhouette=aura;
    } catch(err) {
      // A blocked canvas read must never block Caritas gameplay.
      console.warn("[Caritas] pixel-dissolve unavailable; retaining starfield",err);
    }
    return result;
  }

  function paintCaritasPixelFragments(actor,t) {
    const fx=caritasInvocation.fx;
    if(!fx?.fragments.length||t<.18||t>.86)return;
    const unit=SHIOPON_DRAW_HEIGHT/FRAME.h;
    const left=actor.x-FRAME.w*unit/2;
    const top=actor.y-FRAME.baseline*unit+actor.visualOffsetY+actor.stageOffsetY;
    const progress=Math.min(1,Math.max(0,(t-.18)/.65));
    ctx.save();ctx.imageSmoothingEnabled=false;
    for(const f of fx.fragments){
      const p=Math.min(1,Math.max(0,(progress-f.delay)/(1-f.delay)));
      if(p<=0||p>=1)continue;
      const brightness=Math.sin(Math.PI*p);
      const x=left+f.sx*unit+f.vx*p*p;
      const y=top+f.sy*unit-f.vy*p*p;
      const w=f.sw*unit*(1-.45*p),h=f.sh*unit*(1-.45*p);
      ctx.globalAlpha=.95*Math.pow(1-p,.7);
      ctx.drawImage(fx.source,f.sx,f.sy,f.sw,f.sh,x,y,w,h);
      if(brightness>.35 && f.vy>59){
        // A small prismatic core: sparkling fragments retain pixelated edges.
        ctx.globalAlpha=brightness*.75;
        ctx.fillStyle=(f.vx>0)?"#f8dc9c":"#c7adff";
        ctx.fillRect(x+w/2-1,y+h/2-1,2.2,2.2);
      }
    }
    ctx.restore();
  }

  // Pixel-art light cocoon in world coordinates. Characters themselves stay
  // untouched: this only paints small, camera-transformed light tiles behind them.
  function paintCaritasStarlightCocoon(x,y,t) {
    if(t<.16||t>.94)return;
    const entering=Math.min(1,Math.max(0,(t-.16)/.20));
    const departing=Math.min(1,Math.max(0,(.94-t)/.19));
    const strength=Math.min(entering,departing);
    const baseY=y-45;
    ctx.save();ctx.imageSmoothingEnabled=false;
    // Two opposing ribbons enclose Shiopon before the silhouette reforms.
    // Sampling the same t each frame prevents jump cuts on high-refresh phones.
    for(const side of [-1,1]){
      for(let i=0;i<31;i++){
        const u=i/30;
        const wave=Math.sin(u*Math.PI*2+t*11+side)*2.4;
        const spread=(22+18*Math.sin(Math.PI*u))*Math.min(1,.45+t*1.3);
        const px=Math.round(x+side*(spread+wave));
        const py=Math.round(baseY+u*95-48);
        const pulse=.72+.28*Math.sin(t*10+i*.47);
        const alpha=strength*pulse*(i%5===0?.88:.54);
        ctx.fillStyle=i%7===0?"rgba(255,219,156,"+alpha+")"
          :"rgba(184,151,255,"+alpha+")";
        const size=(i%6===0?3:2)/camera.zoom;
        ctx.fillRect(px-size/2,py-size/2,size,size);
      }
    }
    // Rising gold-violet sparks inside the cocoon; small and rhythmic, not noise.
    for(let i=0;i<14;i++){
      const u=((i*0.618034+t*.95)%1);
      const angle=i*2.39996+t*5;
      const px=x+Math.cos(angle)*(5+u*13);
      const py=y-4-u*90;
      const alpha=strength*(.38+.50*u);
      ctx.fillStyle=i%4===0?"rgba(255,228,165,"+alpha+")"
        :"rgba(213,181,255,"+alpha+")";
      const d=(i%3===0?3:2)/camera.zoom;
      ctx.fillRect(Math.round(px),Math.round(py),d,d);
    }
    ctx.restore();
  }

  function paintCaritasWingUnfold(x,y,height,t){
    const opening=Math.min(1,Math.max(0,(t-.72)/.23));
    if(!opening||opening>=1&&t>.99)return;
    const ease=1-Math.pow(1-opening,3);
    ctx.save();ctx.imageSmoothingEnabled=false;
    for(const side of [-1,1]){
      for(let ray=0;ray<3;ray++){
        // Luminous pixel tiles fan outward; no smooth CSS-like line overlay.
        const span=(28+ray*15)*ease;
        const climb=(12+ray*12)*ease;
        for(let step=0;step<=12;step++){
          const p=step/12;
          const px=x+side*(11+span*p);
          const py=y-height*.63-climb*Math.sin(p*Math.PI*.65)-ray*3*p;
          const alpha=(.75*(1-opening*.35))*(1-p*.32);
          ctx.fillStyle=ray===1?"rgba(255,221,157,"+alpha+")"
            :"rgba(189,164,255,"+alpha+")";
          const tile=(step%4===0?3.4:2.3)/camera.zoom;
          ctx.fillRect(Math.round(px),Math.round(py),tile,tile);
        }
      }
    }
    ctx.restore();
  }

  // The map sprites use 384x512 source cells with transparent margins.
  // Measure their actually visible height once, not the whole 76/78px cell.
  // This avoids an apparent size jump at the first animation frame.
  let caritasOwnerMapScale=null;
  function measureCaritasVisibleMapActor(image,drawHeight){
    if(!image)return null;
    try{
      const sample=document.createElement("canvas");
      sample.width=96;sample.height=128;
      const g=sample.getContext("2d",{willReadFrequently:true});
      g.imageSmoothingEnabled=false;
      g.drawImage(image,0,0,FRAME.w,FRAME.h,0,0,96,128);
      const rgba=g.getImageData(0,0,96,128).data;
      let minY=128,maxY=-1,minX=96,maxX=-1;
      for(let y=0;y<128;y++)for(let x=0;x<96;x++){
        if(rgba[(y*96+x)*4+3]>100){
          if(y<minY)minY=y;
          if(y>maxY)maxY=y;
          if(x<minX)minX=x;
          if(x>maxX)maxX=x;
        }
      }
      if(maxY<minY)return null;
      return {
        height:(maxY-minY+1)*drawHeight/128,
        footOffset:((maxY+1)-FRAME.baseline*128/FRAME.h)*drawHeight/128,
        // Alpha bounds in the same world coordinates as drawActor().
        // Place the three cards beside the visible head/arms, not the empty 384x512 cell.
        topOffset:(minY-FRAME.baseline*128/FRAME.h)*drawHeight/128,
        leftOffset:(minX-48)*drawHeight/128,
        rightOffset:(maxX+1-48)*drawHeight/128
      };
    }catch(error){
      console.warn("[Caritas] map body sampling unavailable; keeping conservative scale",error);
      return null;
    }
  }
  function measureCaritasOwnerMapScale(){
    if(caritasOwnerMapScale)return caritasOwnerMapScale;
    const shiopon=measureCaritasVisibleMapActor(shioponImages.idle||shioponImages.down,SHIOPON_DRAW_HEIGHT);
    const shion=measureCaritasVisibleMapActor(images.idle||images.down,DRAW_HEIGHT);
    caritasOwnerMapScale={
      shioponHeight:shiopon?.height||SHIOPON_DRAW_HEIGHT*.70,
      // Shioriel must finish at Shion's visible on-map height.
      shionHeight:shion?.height||DRAW_HEIGHT*.77,
      shioponFootOffset:shiopon?.footOffset||0
    };
    return caritasOwnerMapScale;
  }

  function caritasTarotElapsed(){
    return caritasTarotSpread.elapsed+(caritasTarotSpread.paused?0:
      Math.max(0,performance.now()-caritasTarotSpread.since));
  }

  function caritasTarotLayout(actor,drawHeight,aspect){
    const height=drawHeight*.34,width=height*aspect,gap=9;
    if(!caritasTarotShionBounds)
      caritasTarotShionBounds=measureCaritasVisibleMapActor(images.idle||images.down,drawHeight);
    const bounds=caritasTarotShionBounds;
    const feet=actor.y+actor.stageOffsetY;
    const armY=feet-drawHeight*.44;
    return [
      // One card just above Shion's visible head; no collision with the sprite.
      {x:actor.x,y:feet+(bounds?.topOffset??-drawHeight*.86)-gap-height/2,width,height},
      // Two at equal arm height, with a visible air gap outside either arm.
      {x:actor.x+(bounds?.leftOffset??-drawHeight*.26)-gap-width/2,y:armY,width,height},
      {x:actor.x+(bounds?.rightOffset??drawHeight*.26)+gap+width/2,y:armY,width,height}
    ];
  }

  function paintCaritasTarotSpread(){
    if(!hoshisunaIsolated||!caritasTarotSpread.active||!caritasTarotBack)return;
    const phase=caritasInvocation.phase;
    if(phase==="revealed")return;
    const entrance=caritasOwnerSmooth(caritasTarotElapsed()/450);
    const fade=phase==="charging"?1-caritasOwnerSmooth((caritasInvocationProgress()*CARITAS_MANIFESTATION_DURATION_MS-4100)/600):1;
    if(entrance*fade<=0)return;
    const reduced=window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    const lift=reduced?0:(1-entrance)*8;
    const cards=caritasTarotLayout(player,DRAW_HEIGHT,caritasTarotBack.naturalWidth/caritasTarotBack.naturalHeight);
    ctx.save();ctx.globalAlpha*=entrance*fade;
    ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality="high";
    // Even before the chant the cards glow faintly; in the chant they share
    // exactly the same white/pearl-gold pulse as Shion and Shiopon.
    const sharedGlow=caritasChantStrength();
    // The original shadow-only treatment disappeared on real iPhone screens.
    // Paint a genuine diffuse halo BEHIND the official card, and a narrow,
    // pearl-white luminous frame OVER it. No HTML or extra card sprites.
    const baseGlow=reduced?.76:.70+.08*Math.sin(caritasTarotElapsed()*Math.PI/1100);
    const light=Math.min(1.35,baseGlow+sharedGlow*.44);
    for(const card of cards){
      const y=card.y+lift,left=card.x-card.width/2,top=y-card.height/2;
      const radius=Math.max(card.height*.90,card.width*1.40);
      if(typeof ctx.createRadialGradient==="function"){
        const halo=ctx.createRadialGradient(card.x,y,card.width*.20,card.x,y,radius);
        halo.addColorStop(0,`rgba(255,248,212,${.48*light})`);
        halo.addColorStop(.42,`rgba(255,221,146,${.28*light})`);
        halo.addColorStop(1,"rgba(255,218,146,0)");
        ctx.fillStyle=halo;
        ctx.fillRect(card.x-radius,y-radius,radius*2,radius*2);
      }
      ctx.shadowColor=`rgba(255,246,207,${.75+Math.min(.23,sharedGlow*.20)})`;
      ctx.shadowBlur=(13+sharedGlow*8)/camera.zoom;
      ctx.shadowOffsetX=0;ctx.shadowOffsetY=0;
      ctx.drawImage(caritasTarotBack,left,top,card.width,card.height);
      // The luminous border is a separate intentional layer. A plain blurred
      // image shadow was not visible enough at the card's ~18x27px map size.
      ctx.save();
      ctx.shadowBlur=0;
      ctx.strokeStyle=`rgba(255,253,226,${Math.min(.95,.47+sharedGlow*.30)})`;
      ctx.lineWidth=.8/camera.zoom;
      if(typeof ctx.strokeRect==="function")
        ctx.strokeRect(left-.75,top-.75,card.width+1.5,card.height+1.5);
      ctx.restore();
    }
    ctx.restore();
  }

  // Caritas encounter only: pathfinding must respect BOTH the authored Starroad
  // collision AND the visible Shion / floating card silhouettes. A normal
  // Stage move checks only map foot-points, so it may cut through either actor.
  function caritasSafeCollision(includeCards){
    const shion=playerRef();
    if(!caritasFoxBounds)
      caritasFoxBounds=measureCaritasVisibleMapActor(shioponImages.idle||shioponImages.down,SHIOPON_DRAW_HEIGHT);
    const fox=caritasFoxBounds;
    const foxLeft=fox?.leftOffset??-15,foxRight=fox?.rightOffset??15;
    const foxTop=fox?.topOffset??-58,foxBottom=foxTop+(fox?.height??60);
    const cards=includeCards&&caritasTarotBack
      ?caritasTarotLayout(player,DRAW_HEIGHT,caritasTarotBack.naturalWidth/caritasTarotBack.naturalHeight).map(card=>({
        left:card.x-card.width/2-foxRight-4,
        right:card.x+card.width/2-foxLeft+4,
        top:card.y-card.height/2-foxBottom-4,
        bottom:card.y+card.height/2-foxTop+4
      })):[];
    const valid=p=>collision.isWalkable(p.x,p.y)&&
      refDistance(p,shion)>=ACTOR_COLLISION_DISTANCE+8&&
      cards.every(r=>p.x<r.left||p.x>r.right||p.y<r.top||p.y>r.bottom);
    return {
      ...collision,
      isWalkable:(x,y)=>valid({x,y}),
      nearestWalkable:p=>valid(p)?{...p}:null,
      segmentClear(a,b){
        if(!valid(a)||!valid(b)||!collision.segmentClear(a,b))return false;
        // Max 3px per sample: prevents a fast stage frame tunneling through
        // the Shion radius or any portrait-card rectangle.
        const steps=Math.max(1,Math.ceil(refDistance(a,b)/3));
        for(let i=1;i<steps;i++){
          const t=i/steps;
          if(!valid({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t}))return false;
        }
        return true;
      }
    };
  }

  function caritasSafeRoute(from,target,includeCards){
    const blocked=caritasSafeCollision(includeCards);
    if(!blocked.isWalkable(from.x,from.y)||!blocked.isWalkable(target.x,target.y))return [];
    if(blocked.segmentClear(from,target))return [{...target}];
    const key=(includeCards?"cards":"left")+":"+player.x+":"+player.y;
    if(!caritasSafeNavigator||caritasSafeNavigatorKey!==key){
      caritasSafeNavigator=window.TarotNavigation.createNavigator(blocked,12);
      caritasSafeNavigatorKey=key;
    }
    const points=caritasSafeNavigator.findPath(from,target)?.points?.slice(1)||[];
    let last=from;
    for(const point of points){
      if(!blocked.segmentClear(last,point))return [];
      last=point;
    }
    return points.map(p=>({...p}));
  }

  function caritasChantElapsed(){
    return caritasChant.elapsed+(caritasChant.paused?0:
      Math.max(0,performance.now()-caritasChant.since));
  }
  // Peak occurs while the final invocation line is visible, BEFORE the 5.5s
  // transformation begins. Never start a second "synchronization" inside it.
  function caritasChantStrength(){
    if(!hoshisunaIsolated||caritasChant.phase==="idle"||caritasInvocation.phase!=="idle")return 0;
    const elapsed=caritasChantElapsed();
    const reduced=window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    const ramp=caritasOwnerSmooth(elapsed/600);
    const sharedBeat=reduced?1:.85+.15*Math.cos(elapsed*Math.PI/760);
    // A single crest on "来臨せよ", then sustained connected light while
    // that line is being read. Previously it vanished in 650ms on iPhone.
    const crest=caritasChant.phase==="sealed"&&!reduced
      ? .48*(1-caritasOwnerSmooth((elapsed-caritasChant.sealedAt)/1000)):0;
    const peak=caritasChant.phase==="sealed"?.26+crest:0;
    return Math.max(0,Math.min(1.35,ramp*(sharedBeat+peak)));
  }
  // Connected starlight is drawn AFTER cards and actors. This is essential:
  // the previous effects were hidden behind the opaque character sprites.
  // All threads and motes share the same clock, pearl-white/gold palette and
  // luminosity. No solid laser beam or additional character art is used.
  function paintCaritasChantWorld(){
    const strength=caritasChantStrength();
    if(strength<=0||!caritasTarotSpread.active)return;
    const atlas=getCaritasSkyStarAtlas();
    if(!atlas)return;
    const elapsed=caritasChantElapsed();
    const reduced=window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    const sizes=caritasOwnerMapScale||measureCaritasOwnerMapScale();
    const cards=caritasTarotBack?caritasTarotLayout(player,DRAW_HEIGHT,
      caritasTarotBack.naturalWidth/caritasTarotBack.naturalHeight):[];
    if(cards.length!==3)return;
    const shion={x:player.x,y:player.y+player.stageOffsetY-sizes.shionHeight*.52};
    const fox={x:shiopon.x,y:shiopon.y+shiopon.stageOffsetY+
      shiopon.visualOffsetY-sizes.shioponHeight*.55};
    const nodes=[
      {...shion,rx:20,ry:sizes.shionHeight*.38},
      ...cards.map(c=>({x:c.x,y:c.y,rx:c.width*.78,ry:c.height*.72})),
      {...fox,rx:20,ry:sizes.shioponHeight*.42}
    ];
    const time=reduced?0:elapsed/1000;
    const alpha=Math.min(1,strength);
    ctx.save();
    const originalAlpha=ctx.globalAlpha;
    ctx.imageSmoothingEnabled=true;
    // Four linked paths: Shion feeds all cards, all three cards answer the
    // fox. Draw as curved, broken constellations of warm stars, never rays.
    const connections=[];
    for(let i=0;i<3;i++){
      connections.push([nodes[0],nodes[i+1],i,0]);
      connections.push([nodes[i+1],nodes[4],i,1]);
    }
    const curve=(a,b,group,p)=>{
      const spread=group===0?-1:1;
      const bend=(b.x-a.x)*.11+spread*(group===0?7:12);
      const mid={x:(a.x+b.x)/2+bend,y:(a.y+b.y)/2-Math.min(25,Math.abs(a.x-b.x)*.14)};
      const v=1-p;
      return {x:v*v*a.x+2*v*p*mid.x+p*p*b.x,
        y:v*v*a.y+2*v*p*mid.y+p*p*b.y};
    };
    // Continuous faint structure makes the link readable even at zero motion.
    for(const [a,b,index,group] of connections){
      const count=13;
      for(let i=1;i<count;i++){
        const p=i/count,pos=curve(a,b,group,p);
        const travel=reduced?.50:((time*(group===0?.38:.50)+i/count+index*.12)%1);
        const wave=reduced?.64:Math.max(.18,1-Math.abs(travel-p)*2.3);
        const sparkle=(i+index*3)%5===0;
        const size=(sparkle?9:5)/camera.zoom;
        ctx.globalAlpha=originalAlpha*alpha*wave*(sparkle?.56:.32);
        ctx.drawImage(atlas,(sparkle?0:1)*32,0,32,32,
          pos.x-size/2,pos.y-size/2,size,size);
      }
    }
    // Identical breathing light at each of the five real world-space nodes.
    // The tiny offset between them only avoids perfectly overlapping dots;
    // it never changes the shared brightness or color.
    for(let node=0;node<nodes.length;node++){
      const center=nodes[node];
      for(let i=0;i<9;i++){
        const angle=i*2.399963+time*.30;
        const drift=reduced?1:1+.07*Math.sin(time*1.5+i*.8);
        const x=center.x+Math.cos(angle)*center.rx*drift;
        const y=center.y+Math.sin(angle)*center.ry*drift;
        const white=i%3===0,size=(white?13:9)/camera.zoom;
        ctx.globalAlpha=originalAlpha*alpha*(white?.76:.46);
        ctx.drawImage(atlas,white?0:1,0,32,32,x-size/2,y-size/2,size,size);
      }
    }
    // One shared focal crest, near Shiopon rather than on top of the cards.
    if(caritasChant.phase==="sealed"){
      const p=Math.max(0,1-caritasOwnerSmooth((elapsed-caritasChant.sealedAt)/1100));
      const radius=(16+18*(1-p))/camera.zoom;
      const halo=ctx.createRadialGradient(fox.x,fox.y,0,fox.x,fox.y,radius);
      halo.addColorStop(0,`rgba(255,251,226,${.36*p+.10})`);
      halo.addColorStop(.48,`rgba(255,226,153,${.19*p+.05})`);
      halo.addColorStop(1,"rgba(255,223,160,0)");
      ctx.globalAlpha=originalAlpha;
      ctx.fillStyle=halo;ctx.fillRect(fox.x-radius,fox.y-radius,radius*2,radius*2);
    }
    ctx.restore();
  }

  // Invocation-only light: transformation hold after the finished chant.
  // Existing transformation-only light: the large descending light belongs
  // to the five-and-a-half-second transformation, NOT the earlier chant.
  function caritasResonanceAt(elapsed,reduced=false){
    const fade=1-caritasOwnerSmooth((elapsed-4100)/600);
    const shared=.70*fade*(reduced?1:.94+.06*Math.cos(elapsed*Math.PI/900));
    return {
      shion:shared,
      shiopon:shared*(1-caritasOwnerSmooth((elapsed-2100)/200)),
      sky:caritasOwnerSmooth((elapsed-800)/650)*(1-caritasOwnerSmooth((elapsed-2350)/500)),
      dim:caritasOwnerSmooth(elapsed/700)*fade
    };
  }

  function caritasResonanceElapsed(){
    return hoshisunaIsolated&&caritasInvocation.phase==="charging"
      ?caritasInvocationProgress()*CARITAS_MANIFESTATION_DURATION_MS:-1;
  }

  function paintCaritasResonanceWorld(){
    // The connected chant effect is drawn in the foreground, after sprites.
    if(caritasChant.phase!=="idle"&&caritasInvocation.phase==="idle")return;
    const elapsed=caritasResonanceElapsed();
    if(elapsed<0||elapsed>=4700)return;
    const reduced=window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    const light=caritasResonanceAt(elapsed,reduced),origin=viewportOrigin();
    const sizes=caritasOwnerMapScale||measureCaritasOwnerMapScale();
    const sx=shiopon.x,sy=shiopon.y+shiopon.stageOffsetY+shiopon.visualOffsetY;
    ctx.save();
    // Dim the map behind both actors, never paint a full-screen white flash.
    ctx.fillStyle=`rgba(15,13,35,${light.dim*.30})`;
    ctx.fillRect(origin.x,origin.y,cssWidth/camera.zoom,cssHeight/camera.zoom);
    const pool=(x,y,height,power)=>{
      if(power<=0)return;
      ctx.save();ctx.translate(x,y-height*.47);ctx.scale(.70,1);
      const glow=ctx.createRadialGradient(0,0,3,0,0,height*1.05);
      glow.addColorStop(0,`rgba(255,239,190,${power*.32})`);
      glow.addColorStop(.45,`rgba(236,199,124,${power*.16})`);
      glow.addColorStop(1,"rgba(205,175,255,0)");
      ctx.fillStyle=glow;ctx.fillRect(-height*1.05,-height*1.05,height*2.1,height*2.1);ctx.restore();
    };
    pool(player.x,player.y+player.stageOffsetY,sizes.shionHeight,light.shion);
    pool(sx,sy,sizes.shioponHeight,light.shiopon);
    if(light.sky>0){
      const skyY=Math.min(origin.y-24,sy-180);
      const descent=reduced?1:caritasOwnerSmooth((elapsed-800)/650);
      const bottom=skyY+(sy+12-skyY)*descent;
      // Overlapping soft-edged curtains, 26–150px wide, rather than hairline rays.
      for(const [offset,topWidth,baseWidth,alpha] of [[0,150,66,.34],[-28,64,30,.22],[24,54,26,.20]]){
        const topX=sx+offset*1.7,baseX=sx+offset*.35;
        const left=Math.min(topX-topWidth/2,baseX-baseWidth/2);
        const right=Math.max(topX+topWidth/2,baseX+baseWidth/2);
        const curtain=ctx.createLinearGradient(left,0,right,0);
        curtain.addColorStop(0,"rgba(255,236,192,0)");
        curtain.addColorStop(.35,`rgba(252,224,164,${alpha*light.sky})`);
        curtain.addColorStop(.5,`rgba(255,247,216,${alpha*light.sky})`);
        curtain.addColorStop(.65,`rgba(252,224,164,${alpha*light.sky})`);
        curtain.addColorStop(1,"rgba(255,236,192,0)");
        ctx.fillStyle=curtain;ctx.beginPath();ctx.moveTo(topX-topWidth/2,skyY);
        ctx.lineTo(topX+topWidth/2,skyY);ctx.lineTo(baseX+baseWidth/2,bottom);
        ctx.quadraticCurveTo(baseX,bottom+18,baseX-baseWidth/2,bottom);
        ctx.closePath();ctx.fill();
      }
    }
    ctx.restore();
  }

  // Tint the exact current sprite alpha, retaining its face, pose and dimensions.
  // Cache one small surface per actor; never recolour an enclosing rectangle.
  function paintCaritasResonantActor(actor,actorImages,drawHeight,offset,kind,elapsed){
    const chantPower=caritasChantStrength();
    if((elapsed<0||elapsed>=4700)&&chantPower<=0)return;
    const reduced=window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    const strength=chantPower>0?Math.min(1.25,chantPower):caritasResonanceAt(elapsed,reduced)[kind];
    if(!strength)return;
    const {image,sourceX}=spriteFrame(actor,actorImages,FRAME);
    if(!image)return;
    if(!caritasResonanceSprites)caritasResonanceSprites={};
    let cached=caritasResonanceSprites[kind];
    if(!cached){
      const surface=document.createElement("canvas");surface.width=96;surface.height=128;
      const context=surface.getContext("2d");if(!context)return;
      cached=caritasResonanceSprites[kind]={surface,context,image:null,sourceX:-1};
    }
    if(cached.image!==image||cached.sourceX!==sourceX){
      const g=cached.context;g.clearRect(0,0,96,128);g.imageSmoothingEnabled=false;
      g.globalCompositeOperation="source-over";
      g.drawImage(image,sourceX,0,FRAME.w,FRAME.h,0,0,96,128);
      g.globalCompositeOperation="source-in";g.fillStyle="#fff0c4";g.fillRect(0,0,96,128);
      g.globalCompositeOperation="source-over";cached.image=image;cached.sourceX=sourceX;
    }
    const width=FRAME.w*drawHeight/FRAME.h;
    ctx.save();ctx.globalAlpha*=strength*(chantPower>0?.42:.26);ctx.globalCompositeOperation="screen";
    ctx.imageSmoothingEnabled=false;ctx.shadowColor="rgba(255,227,164,.28)";ctx.shadowBlur=14/camera.zoom;
    if(Math.abs(actor.rotation||0)>1e-6){ctx.translate(actor.x,actor.y);ctx.rotate(actor.rotation);ctx.translate(-actor.x,-actor.y);}
    ctx.drawImage(cached.surface,0,0,96,128,actor.x-width/2,
      actor.y-FRAME.baseline*drawHeight/FRAME.h+offset,width,drawHeight);
    ctx.restore();
  }

  const caritasOwnerSmooth = (value) => {
    const p=Math.max(0,Math.min(1,value));
    return p*p*(3-2*p);
  };

  // The small sprite atlas is drawn once in the map renderer, not with DOM/CSS.
  // Gold / lavender / blue-white cores share a soft halo and four-point flare.
  function getCaritasSkyStarAtlas(){
    if(caritasOwnerStarAtlas!==null)return caritasOwnerStarAtlas||null;
    try{
      const surface=document.createElement("canvas");surface.width=96;surface.height=32;
      const g=surface.getContext("2d");
      if(!g)throw new Error("star atlas context unavailable");
      // Star-white and pearl gold dominate; lavender is only an accent.
      const colors=[[255,246,223],[255,221,165],[205,183,225]];
      for(let i=0;i<3;i++){
        const [r,b,v]=colors[i],cx=i*32+16;
        const halo=g.createRadialGradient(cx,16,0,cx,16,14);
        halo.addColorStop(0,`rgba(${r},${b},${v},.75)`);
        halo.addColorStop(.3,`rgba(${r},${b},${v},.32)`);
        halo.addColorStop(1,`rgba(${r},${b},${v},0)`);
        g.fillStyle=halo;g.fillRect(i*32,0,32,32);
        g.fillStyle=`rgba(${r},${b},${v},.95)`;
        g.beginPath();g.moveTo(cx,5);g.lineTo(cx+1.5,14.5);
        g.lineTo(cx+7,16);g.lineTo(cx+1.5,17.5);
        g.lineTo(cx,27);g.lineTo(cx-1.5,17.5);
        g.lineTo(cx-7,16);g.lineTo(cx-1.5,14.5);g.closePath();g.fill();
        g.fillStyle="#fff8e7";g.beginPath();g.arc(cx,16,1.4,0,Math.PI*2);g.fill();
      }
      caritasOwnerStarAtlas=surface;
      return surface;
    }catch(_){caritasOwnerStarAtlas=false;return null;}
  }

  // Every mote originates above the visible sky and converges DOWNWARD.
  // No randomness or secondary clock: suspension paints the exact same path.
  function caritasSkyMoteAt(index,elapsed,x,skyY,catchY){
    const birth=800+index*23;
    const duration=700+(index%5)*55;
    const progress=(elapsed-birth)/duration;
    if(progress<=0||progress>=1)return null;
    const startX=x+Math.sin(index*2.399963)*(44+(index%4)*10);
    const endX=x+Math.sin(index*1.73)*8;
    const at=p=>{
      const converge=caritasOwnerSmooth(p);
      return {x:startX*(1-converge)+endX*converge+Math.sin(p*Math.PI)*Math.cos(index)*5,
        y:skyY+(catchY-skyY)*Math.pow(p,1.35)};
    };
    return {head:at(progress),tail:at(Math.max(0,progress-.12)),progress,
      alpha:caritasOwnerSmooth(progress/.12)*caritasOwnerSmooth((1-progress)/.20)};
  }

  function paintCaritasSkyfall(x,feetY,bodyHeight,elapsed){
    if(elapsed<=800||elapsed>=2650)return;
    const atlas=getCaritasSkyStarAtlas();
    if(!atlas)return;
    const catchY=feetY-bodyHeight*.60;
    const skyY=Math.min(viewportOrigin().y-24,catchY-160);
    const reduced=window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    ctx.save();
    const baseAlpha=ctx.globalAlpha;
    ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality="high";
    for(let i=0;i<40;i++){
      const mote=caritasSkyMoteAt(i,elapsed,x,skyY,catchY);
      if(!mote)continue;
      const color=i%3;
      const rgb=color===0?"255,246,223":color===1?"255,221,165":"205,183,225";
      const head=reduced?{x:x+Math.sin(i*2.399963)*23,y:catchY-(i%6)*9}:mote.head;
      if(!reduced){
        const tail=mote.tail;
        const trail=ctx.createLinearGradient(tail.x,tail.y,head.x,head.y);
        trail.addColorStop(0,`rgba(${rgb},0)`);
        trail.addColorStop(1,`rgba(${rgb},${mote.alpha*.32})`);
        ctx.strokeStyle=trail;ctx.lineWidth=i%7===0?9:5;ctx.lineCap="round";
        ctx.beginPath();ctx.moveTo(tail.x,tail.y);ctx.lineTo(head.x,head.y);ctx.stroke();
      }
      const size=i%7===0?26:18+(i%3);
      ctx.globalAlpha=baseAlpha*mote.alpha*(i%7===0?1:.92);
      ctx.drawImage(atlas,color*32,0,32,32,head.x-size/2,head.y-size/2,size,size);
      ctx.globalAlpha=baseAlpha;
    }
    ctx.restore();
  }

  // The reveal settles locally; the incoming light itself comes from the sky.
  function paintCaritasOwnerStarlight(x,feetY,bodyHeight,elapsed){
    if(elapsed<4100||elapsed>=4700)return;
    const p=caritasOwnerSmooth((elapsed-4100)/600);
    const strength=Math.sin(p*Math.PI);
    ctx.save();ctx.imageSmoothingEnabled=false;
    for(let i=0;i<16;i++){
      const angle=i*2.399963,radius=20+14*p;
      const px=x+Math.cos(angle)*(radius+5*Math.sin(i*.7));
      const py=feetY-4-bodyHeight*(i%6)/8+p*9;
      ctx.fillStyle=i%3===0?"rgba(255,221,163,"+(strength*.6)+")":"rgba(191,164,255,"+(strength*.4)+")";
      const d=i%5===0?2.4:1.5;ctx.fillRect(px-d/2,py-d/2,d,d);
    }
    ctx.translate(x,feetY);ctx.scale(1,.32);
    ctx.strokeStyle="rgba(215,186,255,"+(.38*strength)+")";ctx.lineWidth=1;
    ctx.beginPath();ctx.arc(0,0,22+18*p,0,Math.PI*2);ctx.stroke();
    ctx.restore();
  }

  function getCaritasOwnerBlendSurface(){
    if(caritasOwnerBlendSurface)return caritasOwnerBlendSurface;
    try{
      const surface=document.createElement("canvas");
      surface.width=surface.height=CARITAS_OWNER_TILE;
      const context=surface.getContext("2d");
      if(!context)return null;
      caritasOwnerBlendSurface={surface,context};
      return caritasOwnerBlendSurface;
    }catch(_){return null;}
  }

  // Native map Shiopon -> cocoon -> fixed-size Shioriel -> quiet hold.
  // The event timer and this renderer both use the same 5500ms duration.
  function drawCaritasOwnerTransformation(actor,phase,t){
    const image=caritasOwnerTransformationAtlas;
    if(!image)return false;
    const elapsed=phase==="revealed"?CARITAS_MANIFESTATION_DURATION_MS:
      Math.min(CARITAS_MANIFESTATION_DURATION_MS,Math.max(0,t*CARITAS_MANIFESTATION_DURATION_MS));
    let frame=CARITAS_OWNER_FRAME_TIMES_MS.length-1,until=0,frameStart=0;
    for(let i=0;i<CARITAS_OWNER_FRAME_TIMES_MS.length;i++){
      until+=CARITAS_OWNER_FRAME_TIMES_MS[i];
      if(elapsed<until){frame=i;frameStart=until-CARITAS_OWNER_FRAME_TIMES_MS[i];break;}
    }
    const scale=caritasOwnerMapScale || measureCaritasOwnerMapScale();
    // Complete all size/centre changes inside the opaque cocoon, BEFORE
    // frame 7 shows a face at 3000ms. No visible bodily inflation afterward.
    const blend=caritasOwnerSmooth((elapsed-2300)/650);
    const bodyHeight=scale.shioponHeight*(1-blend)+scale.shionHeight*blend;
    // Crown-to-sole span excludes Shioriel's horn, ears, wings and light.
    const sourceBodyHeight=109*(1-blend)+113*blend;
    const height=CARITAS_OWNER_TILE*bodyHeight/sourceBodyHeight,width=height;
    const x=actor.x,y=actor.y+actor.stageOffsetY+actor.visualOffsetY;
    const centerX=84*(1-blend)+79.5*blend;
    const feetY=y+scale.shioponFootOffset;
    paintCaritasSkyfall(x,feetY,scale.shioponHeight,elapsed);
    paintCaritasOwnerStarlight(x,feetY,bodyHeight,elapsed);
    if(elapsed<2300){
      ctx.save();
      ctx.globalAlpha*=1-caritasOwnerSmooth((elapsed-2100)/200);
      drawActor(actor,shioponImages,SHIOPON_DRAW_HEIGHT,"rgba(235,210,255,.22)",{
        outline:ACTOR_OUTLINES.shiopon,
        visualOffsetY:actor.visualOffsetY+actor.stageOffsetY,rotation:actor.rotation
      });
      paintCaritasResonantActor(actor,shioponImages,SHIOPON_DRAW_HEIGHT,
        actor.visualOffsetY+actor.stageOffsetY,"shiopon",elapsed);
      ctx.restore();
      if(elapsed<=1900)return true;
      frame=4;
    }
    const left=x-centerX*width/CARITAS_OWNER_TILE;
    const top=feetY-145*height/CARITAS_OWNER_TILE;
    const paint=(index,alpha)=>{
      if(alpha<=0)return;
      ctx.save();ctx.globalAlpha*=alpha;
      ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality="high";
      ctx.drawImage(image,(index%4)*CARITAS_OWNER_TILE,
        Math.floor(index/4)*CARITAS_OWNER_TILE,
        CARITAS_OWNER_TILE,CARITAS_OWNER_TILE,left,top,width,height);
      ctx.restore();
    };
    const dissolve=(previous,next,mix)=>{
      if(mix<=0){paint(previous,1);return;}
      if(mix>=1){paint(next,1);return;}
      const buffer=getCaritasOwnerBlendSurface();
      if(!buffer){paint(previous,1);paint(next,mix);return;}
      const g=buffer.context;
      g.clearRect(0,0,CARITAS_OWNER_TILE,CARITAS_OWNER_TILE);
      g.imageSmoothingEnabled=true;
      // Add premultiplied layers on a TRANSPARENT 160px surface. Source-over
      // weighted directly on the map dims opaque light to 75% mid-transition.
      g.globalCompositeOperation="source-over";g.globalAlpha=1-mix;
      g.drawImage(image,(previous%4)*CARITAS_OWNER_TILE,Math.floor(previous/4)*CARITAS_OWNER_TILE,
        CARITAS_OWNER_TILE,CARITAS_OWNER_TILE,0,0,CARITAS_OWNER_TILE,CARITAS_OWNER_TILE);
      g.globalCompositeOperation="lighter";g.globalAlpha=mix;
      g.drawImage(image,(next%4)*CARITAS_OWNER_TILE,Math.floor(next/4)*CARITAS_OWNER_TILE,
        CARITAS_OWNER_TILE,CARITAS_OWNER_TILE,0,0,CARITAS_OWNER_TILE,CARITAS_OWNER_TILE);
      g.globalAlpha=1;g.globalCompositeOperation="source-over";
      ctx.save();ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality="high";
      ctx.drawImage(buffer.surface,0,0,CARITAS_OWNER_TILE,CARITAS_OWNER_TILE,left,top,width,height);
      ctx.restore();
    };
    if(elapsed<2300){
      paint(4,caritasOwnerSmooth((elapsed-1900)/400));
    }else if(elapsed>=4700){
      // Full 800ms static final hold; finish all dissolves BEFORE this point.
      paint(11,1);
    }else if(frame===10&&elapsed>=4440){
      dissolve(10,11,caritasOwnerSmooth((elapsed-4440)/260));
    }else if(frame===4){
      paint(frame,1);
    }else{
      const duration=frame===7?280:frame===10?260:140;
      dissolve(frame-1,frame,caritasOwnerSmooth((elapsed-frameStart)/duration));
    }
    return true;
  }

  function drawCaritasInvocation(actor) {
    const phase=caritasInvocation.phase;
    if(phase==="idle")return false;
    const t=caritasInvocationProgress();
    window.TarotCaritasManifestationAudio?.syncMute?.();
    if(caritasOwnerTransformationAtlas)return drawCaritasOwnerTransformation(actor,phase,t);
    const x=actor.x,y=actor.y+actor.stageOffsetY;
    const centerY=y-43;
    ctx.save();
    if(phase==="charging"){
      const rise=Math.min(1,t/.22);
      // The three "Stellan" echoes swell without strobing the whole scene.
      const echoes=[.18,.43,.69].reduce((sum,beat)=>sum+
        Math.exp(-Math.pow((t-beat)/.075,2)),0);
      const strength=.62+.26*rise+.22*Math.min(1,echoes);
      // A local dim halo isolates the event from the bright Starroad pixels.
      const dusk=ctx.createRadialGradient(x,centerY,25,x,centerY,145);
      dusk.addColorStop(0,"rgba(32,22,69,0)");
      dusk.addColorStop(.56,"rgba(34,23,72,.08)");
      dusk.addColorStop(1,"rgba(14,12,43,.26)");
      ctx.fillStyle=dusk;ctx.beginPath();ctx.arc(x,centerY,145,0,Math.PI*2);ctx.fill();
      // Soft, broad violet-blue light column, not a white rectangle.
      ctx.save();ctx.translate(x,centerY-7);ctx.scale(.70,1.20);
      const column=ctx.createRadialGradient(0,0,7,0,0,69);
      column.addColorStop(0,"rgba(213,164,255,"+(.42*strength)+")");
      column.addColorStop(.28,"rgba(157,125,245,"+(.34*strength)+")");
      column.addColorStop(.65,"rgba(101,150,236,"+(.21*strength)+")");
      column.addColorStop(1,"rgba(68,112,219,0)");
      ctx.fillStyle=column;ctx.beginPath();ctx.arc(0,0,69,0,Math.PI*2);ctx.fill();
      ctx.restore();
      // Energy rises from the feet: the broad floor-ring makes the source clear.
      ctx.save();ctx.translate(x,y-3);
      const ground=ctx.createRadialGradient(0,0,3,0,0,54);
      ground.addColorStop(0,"rgba(238,199,255,"+(.45*strength)+")");
      ground.addColorStop(.42,"rgba(130,113,238,"+(.28*strength)+")");
      ground.addColorStop(1,"rgba(98,142,227,0)");
      ctx.scale(1,.38);ctx.fillStyle=ground;ctx.beginPath();ctx.arc(0,0,54,0,Math.PI*2);ctx.fill();
      ctx.strokeStyle="rgba(210,174,255,"+(.70*strength)+")";
      ctx.lineWidth=3.3;ctx.beginPath();ctx.ellipse(0,0,40+rise*5,31+rise*3,0,0,Math.PI*2);ctx.stroke();
      ctx.restore();
      // Three clearly legible coloured rings, each changing phase slowly.
      const palettes=[[211,152,255],[131,177,255],[255,220,155]];
      for(let ring=0;ring<3;ring++){
        ctx.save();ctx.translate(x,centerY);
        ctx.rotate((ring%2?-.25:.22)+t*(ring%2?-.34:.29));
        const [r,g,b]=palettes[ring];
        const alpha=ring===0?.74:ring===1?.62:.52;
        ctx.strokeStyle="rgba("+r+","+g+","+b+","+(alpha*strength)+")";
        ctx.lineWidth=[3.3,2.7,2.2][ring];
        ctx.shadowColor="rgba("+r+","+g+","+b+","+(strength*.50)+")";
        ctx.shadowBlur=5/camera.zoom;
        ctx.beginPath();
        ctx.ellipse(0,0,26+t*9+ring*10,43+t*6+ring*7,0,0,Math.PI*2);
        ctx.stroke();ctx.restore();
      }
      // Clearly visible star motes circulate inward/outward, not random white noise.
      for(let k=0;k<24;k++){
        const a=k*2.39996+t*(.8+(k%3)*.18);
        const radius=15+((k*17)%39)+(k%2?10*t:-7*t);
        const px=x+Math.cos(a)*radius;
        const py=centerY+Math.sin(a)*radius*.88;
        const bright=.65+.35*Math.sin(t*12+k*.67);
        const gold=k%6===0;
        ctx.fillStyle=gold
          ?"rgba(255,223,159,"+(bright*.90)+")"
          :"rgba(195,170,255,"+(bright*.94)+")";
        const size=1.2+(k%4)*.42;
        ctx.beginPath();ctx.arc(px,py,size,0,Math.PI*2);ctx.fill();
        if(k%5===0){
          ctx.strokeStyle=gold?"rgba(255,226,169,.65)":"rgba(147,197,255,.66)";
          ctx.lineWidth=1.05;ctx.beginPath();
          ctx.moveTo(px-size-2,py);ctx.lineTo(px+size+2,py);
          ctx.moveTo(px,py-size-2);ctx.lineTo(px,py+size+2);
          ctx.stroke();
        }
      }
    }
    // Keep the luminous cocoon behind the approved sprite artwork.
    if(phase==="charging")paintCaritasStarlightCocoon(x,y,t);
    // Dissolve Shiopon's original map sprite from the feet upward. Actual
    // sprite-pixel fragments travel into the silhouette, rather than one crossfade.
    const dissolve=phase==="charging"?Math.min(1,Math.max(0,(t-.19)/.43)):1;
    if(dissolve<1){
      // y already includes stageOffsetY; do not apply the stage offset twice.
      const shioTop=y-FRAME.baseline*(SHIOPON_DRAW_HEIGHT/FRAME.h)
        +actor.visualOffsetY;
      ctx.save();
      ctx.beginPath();
      ctx.rect(x-100,shioTop-12,200,
        Math.max(0,(SHIOPON_DRAW_HEIGHT+24)*(1-dissolve)));
      ctx.clip();
      drawActor(actor,shioponImages,SHIOPON_DRAW_HEIGHT,"rgba(235,210,255,.22)",{
        outline:ACTOR_OUTLINES.shiopon,visualOffsetY:actor.visualOffsetY+actor.stageOffsetY,rotation:actor.rotation
      });
      ctx.restore();
    }
    paintCaritasPixelFragments(actor,t);
    const reveal=phase==="revealed"?1:Math.min(1,Math.max(0,(t-.51)/.40));
    if(reveal>0&&caritasShiorielAtlas){
      const image=caritasShiorielAtlas;
      const sw=image.naturalWidth/2,sh=image.naturalHeight/2;
      // Keep the approved 96-world-pixel size and original foot anchor.
      const height=96*(phase==="charging"?.91+.09*Math.min(1,(t-.55)/.45):1);
      const width=height*sw/sh;
      const top=y-height+5,left=x-width/2;
      const fx=caritasInvocation.fx;
      const silhouetteAlpha=phase==="revealed"?0:Math.max(0,Math.min(1,(t-.48)/.19));
      if(fx?.silhouette&&silhouetteAlpha>0){
        const band=height*reveal;
        ctx.save();
        ctx.beginPath();ctx.rect(left-12,top+height-band-5,width+24,band+14);ctx.clip();
        ctx.globalAlpha*=silhouetteAlpha*.72;
        ctx.shadowColor="#d6a7ff";ctx.shadowBlur=20/camera.zoom;
        ctx.drawImage(fx.silhouette,left,top,width,height);
        ctx.restore();
      }
      paintCaritasWingUnfold(x,y,height,t);
      const revealedAlpha=phase==="revealed"?1:Math.min(1,Math.max(0,(t-.72)/.19));
      // The real Shioriel art appears progressively from the feet upward,
      // inside the same world-space actor slot. A fade alone looked like a swap.
      const formed=phase==="revealed"?1:Math.min(1,Math.max(0,(t-.68)/.25));
      const revealEase=formed*formed*(3-2*formed);
      if(revealedAlpha>0&&revealEase>0){
        const visibleHeight=height*revealEase;
        ctx.save();
        ctx.beginPath();
        ctx.rect(left-3,top+height-visibleHeight-3,width+6,visibleHeight+8);
        ctx.clip();
        ctx.globalAlpha*=revealedAlpha;
        // The official high-resolution pixel illustration keeps its approved
        // downsampling; only the separate light effects use hard-edged tiles.
        ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality="high";
        ctx.shadowColor="rgba(166,125,231,.68)";
        ctx.shadowBlur=7/camera.zoom;
        ctx.drawImage(image,0,0,sw,sh,left,top,width,height);
        ctx.restore();
      }
      // A single restrained shockwave when the wings finish opening.
      if(phase==="charging"&&t>.83&&t<.98){
        const p=(t-.83)/.15;
        ctx.save();ctx.translate(x,y-35);ctx.scale(1,.35);
        ctx.strokeStyle="rgba(255,225,170,"+(.72*(1-p))+")";
        ctx.lineWidth=(2.5*(1-p))/camera.zoom;
        ctx.shadowColor="#ceaeff";ctx.shadowBlur=9/camera.zoom;
        ctx.beginPath();ctx.arc(0,0,28+105*p,0,Math.PI*2);ctx.stroke();
        ctx.restore();
      }
    }
    ctx.restore();
    return true;
  }

  // Caritas-local alpha masks: only the inner rim is invaded at rest.
  // The body remains untouched until the voluntary approach triggers surge.
  const caritasAbyss={phase:"edge",opacity:0,clock:0,masks:new Map()};
  function caritasAbyssMasks(image){
    if(!image?.complete||!image.naturalWidth)return null;
    const key=image.currentSrc||image.src;
    if(caritasAbyss.masks.has(key))return caritasAbyss.masks.get(key);
    const w=250,h=192;
    const surface=()=>{const c=document.createElement("canvas");c.width=w;c.height=h;return c;};
    const silhouette=surface(),sc=silhouette.getContext("2d");
    const fit=Math.min(w/image.naturalWidth,h/image.naturalHeight);
    const iw=image.naturalWidth*fit,ih=image.naturalHeight*fit;
    sc.drawImage(image,(w-iw)/2,(h-ih)/2,iw,ih);
    // Find the creature's actual opaque torso, not the frame center or floor.
    let left=w,top=h,right=-1,bottom=-1,total=0,sumX=0,sumY=0;
    try{
      const pixels=sc.getImageData(0,0,w,h).data;
      for(let py=0;py<h;py++)for(let px=0;px<w;px++){
        const a=pixels[(py*w+px)*4+3];if(a<32)continue;
        left=Math.min(left,px);right=Math.max(right,px);
        top=Math.min(top,py);bottom=Math.max(bottom,py);
        total+=a;sumX+=a*px;sumY+=a*py;
      }
    }catch(_){}
    if(right<left){left=(w-iw)/2;right=left+iw;top=(h-ih)/2;bottom=top+ih;}
    const bw=Math.max(1,right-left),bh=Math.max(1,bottom-top);
    const origin={x:Math.max(left+bw*.32,Math.min(left+bw*.68,total?sumX/total:left+bw*.5)),
                  y:Math.max(top+bh*.34,Math.min(top+bh*.55,total?sumY/total:top+bh*.46))};
    sc.globalCompositeOperation="source-in";sc.fillStyle="#190d27";sc.fillRect(0,0,w,h);
    // Erode an exact copy of the alpha silhouette, then subtract its core.
    // This leaves hair, shoulders, limbs and tail edges, never a box outline.
    const core=surface(),cc=core.getContext("2d");cc.drawImage(silhouette,0,0);
    cc.globalCompositeOperation="destination-in";
    for(const [dx,dy] of [[3,0],[-3,0],[0,3],[0,-3],[2,2],[-2,2],[2,-2],[-2,-2]])
      cc.drawImage(silhouette,dx,dy);
    const edge=surface(),ec=edge.getContext("2d");ec.drawImage(silhouette,0,0);
    ec.globalCompositeOperation="destination-out";ec.drawImage(core,0,0);
    // Cache 17 silhouette-clipped radial flood steps: center -> whole body in 400ms.
    const reach=Math.max(...[[left,top],[right,top],[left,bottom],[right,bottom]]
      .map(([px,py])=>Math.hypot(px-origin.x,py-origin.y)));
    const flood=Array.from({length:17},(_,step)=>{
      const canvas=surface(),fc=canvas.getContext("2d");
      fc.drawImage(silhouette,0,0);fc.globalCompositeOperation="destination-in";
      const radius=reach*(.12+.98*step/16);
      const g=fc.createRadialGradient(origin.x,origin.y,0,origin.x,origin.y,radius);
      g.addColorStop(0,"rgba(255,255,255,1)");
      g.addColorStop(.72,"rgba(255,255,255,.96)");
      g.addColorStop(.89,"rgba(255,255,255,.62)");
      g.addColorStop(1,"rgba(255,255,255,0)");
      fc.fillStyle=g;fc.fillRect(0,0,w,h);return canvas;
    });
    const masks={silhouette,edge,flood,origin,bounds:{left,top,right,bottom},size:{w,h}};
    caritasAbyss.masks.set(key,masks);return masks;
  }
  function updateCaritasAbyss(dt){
    caritasAbyss.clock+=dt;
    if(caritasAbyss.phase==="edge"||caritasAbyss.phase==="cleared")caritasAbyss.opacity=0;
    else caritasAbyss.opacity=Math.min(1,caritasAbyss.opacity+dt/.4);
  }
  function caritasAbyssOrigin(masks,rect){
    return {x:rect.x+rect.w*masks.origin.x/masks.size.w,
            y:rect.y+rect.h*masks.origin.y/masks.size.h};
  }
  function paintCaritasMiasma(){
    if(!hoshisunaIsolated||caritasAbyss.phase==="cleared"||
       document.body.classList.contains("caritas-departed"))return;
    const actor=document.querySelector(".hoshi-caritas");
    const image=actor?.querySelector("img");
    const masks=caritasAbyssMasks(image);if(!masks)return;
    // Use the visible actor's exact world rectangle, never a detached ground point.
    const coords=[actor.dataset.worldX,actor.dataset.worldY,actor.dataset.worldW,actor.dataset.worldH].map(Number);
    if(coords.some(n=>!Number.isFinite(n))||coords[2]<=0||coords[3]<=0)return;
    const [wx,wy,ww,wh]=coords;
    const x=wx*scale.x,y=wy*scale.y,w=ww*scale.x,h=wh*scale.y;
    const {x:centerX,y:centerY}=caritasAbyssOrigin(masks,{x,y,w,h});
    const strength=caritasAbyss.opacity,time=caritasAbyss.clock;
    ctx.save();ctx.imageSmoothingEnabled=true;
    ctx.globalAlpha=.64+.34*strength;
    ctx.drawImage(masks.edge,x,y,w,h);
    // Faint inner heart in the resting state; never on the surrounding ground.
    ctx.globalAlpha=.24+.06*Math.sin(time*2.4);
    ctx.drawImage(masks.flood[0],x,y,w,h);
    if(strength>0){
      const frame=Math.min(16,Math.ceil(strength*16));
      ctx.globalAlpha=Math.min(.96,.36+.64*strength);
      ctx.drawImage(masks.flood[frame],x,y,w,h);
      if(strength>=.99){
        ctx.globalAlpha=.68;ctx.drawImage(masks.silhouette,x,y,w,h);
      }
      // Smoke starts at the torso and expands only as the radial flood expands.
      const bodyW=(masks.bounds.right-masks.bounds.left)*w/masks.size.w;
      const bodyH=(masks.bounds.bottom-masks.bounds.top)*h/masks.size.h;
      const spread=Math.pow(strength,.85);
      for(let i=0;i<10;i++){
        const angle=i*Math.PI*2/10+Math.sin(time*.75+i)*.08;
        const drift=Math.sin(time*1.4+i*1.7);
        const cx=centerX+Math.cos(angle)*bodyW*.32*spread;
        const cy=centerY+Math.sin(angle)*bodyH*.27*spread+drift*1.1*scale.y;
        const radius=Math.max(1,(5+14*strength+drift)*Math.min(scale.x,scale.y));
        const cloud=ctx.createRadialGradient(cx,cy,0,cx,cy,radius);
        cloud.addColorStop(0,"rgba(18,7,30,.68)");
        cloud.addColorStop(.50,"rgba(42,13,58,.50)");
        cloud.addColorStop(.83,"rgba(62,25,83,.20)");
        cloud.addColorStop(1,"rgba(38,13,53,0)");
        ctx.globalAlpha=.58*strength;ctx.fillStyle=cloud;
        ctx.beginPath();ctx.arc(cx,cy,radius,0,Math.PI*2);ctx.fill();
      }
    }
    ctx.restore();
  }

  function drawActors() {
    paintCaritasResonanceWorld();
    paintCaritasMiasma();
    paintCaritasTarotSpread();
    if (!hoshisunaIsolated && !visionWorld.active && (!stage3Runtime || aftermathLumiereEnabled)) drawGroundShadowAt(lumiere, 18, 0.2);
    if (!visionWorld.active && !shiopon.hidden) drawGroundShadowAt(shiopon, 17, 0.36);
    if (!visionWorld.active) drawGroundShadowAt(player, 20, 0.46);

    const actors = [
      {
        actor: lumiere,
        actorImages: lumiereImages,
        drawHeight: LUMIERE_DRAW_HEIGHT,
        glowColor: "rgba(226,210,255,.34)",
        options: {
          hover: true,
          visualOffsetY: lumiere.bobOffsetY + lumiere.stageOffsetY,
        },
      },
      {
        actor: shiopon,
        actorImages: shioponImages,
        drawHeight: SHIOPON_DRAW_HEIGHT,
        glowColor: "rgba(235,210,255,.22)",
        options: {
          outline: ACTOR_OUTLINES.shiopon,
          visualOffsetY: shiopon.visualOffsetY + shiopon.stageOffsetY,
          rotation: shiopon.rotation,
        },
      },
      {
        actor: player,
        actorImages: images,
        drawHeight: DRAW_HEIGHT,
        glowColor: "rgba(255,236,190,.22)",
        options: {
          visualOffsetY: player.stageOffsetY,
        },
      },
    ].filter(entry => (entry.actor !== shiopon || !shiopon.hidden) &&
      (entry.actor !== lumiere || (!hoshisunaIsolated && (!stage3Runtime || aftermathLumiereEnabled)))).sort((a, b) => {
      const ay =
        shiopon.following && a.actor === shiopon ? player.y - 0.01 : a.actor.y;
      const by =
        shiopon.following && b.actor === shiopon ? player.y - 0.01 : b.actor.y;
      return ay - by;
    });

    for (const entry of actors) {
      const actorId = entry.actor === player ? "shion" : entry.actor === shiopon ? "shiopon" : "lumiere";
      if (visionWorld.active && actorId !== "shion") continue;
      const opacity = stage3Runtime ? actorVisibility[actorId] : 1;
      if (opacity <= 0) continue;
      if (visionWorld.active && actorId === "shion") {drawFutureCurrentShionComposite(entry,opacity); continue;}
      ctx.save(); ctx.globalAlpha *= opacity;
      const paint = (target) => {
        const original = ctx;
        ctx = target;
        try {
          if(!(hoshisunaIsolated && actorId==="shiopon" && drawCaritasInvocation(entry.actor))) {
            drawActor(entry.actor, entry.actorImages, entry.drawHeight,
              entry.glowColor, entry.options);
            if(actorId==="shion"||actorId==="shiopon")paintCaritasResonantActor(entry.actor,entry.actorImages,entry.drawHeight,
              entry.options.visualOffsetY,actorId,caritasResonanceElapsed());
          }
        } finally { ctx = original; }
      };
      if (window.TarotSceneEffects && !visionWorld.active) {
        window.TarotSceneEffects.drawMaskedActor(ctx, entry.actor, scale,
          Math.min(2, dpr * camera.zoom), paint);
      } else paint(ctx);
      ctx.restore();
    }
    // Foreground connectors and stars must NOT be obscured by opaque actors.
    if(hoshisunaIsolated)paintCaritasChantWorld();
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
      `Shiopon ${shiopon.x.toFixed(1)}, ${shiopon.y.toFixed(1)} · ${shiopon.scripted?.phase || (shiopon.following ? "follow" : "wander")} · ${shiopon.dir} ${shiopon.moving ? "walk" : "idle"}\n` +
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
        following: shiopon.following,
        scripted: shiopon.scripted,
        followRoute: shiopon.followRoute,
        rotation: shiopon.rotation,
        stageOffsetY: shiopon.stageOffsetY,
      },
      lumiere: {
        x: lumiere.x,
        y: lumiere.y,
        dir: lumiere.dir,
        moving: lumiere.moving,
        frame: lumiere.frame,
        bobPhase: lumiere.bobPhase,
        bobOffsetY: lumiere.bobOffsetY,
        stageOffsetY: lumiere.stageOffsetY,
        homeRef: lumiere.homeRef,
      },
      stage: Object.fromEntries(
        Object.entries(stageMotions).map(([actorId, motion]) => [
          actorId,
          motion ? { id: motion.id, kind: motion.kind } : null,
        ]),
      ),
      actorCollisionDistance: ACTOR_COLLISION_DISTANCE,
      actorGap: refDistance(playerRef(), shioponRef()),
      shioponFollowDistance: SHIOPON_FOLLOW_DISTANCE,
      shioponFollowMinGap: SHIOPON_FOLLOW_MIN_GAP,
      lumiereCollisionDistance: LUMIERE_COLLISION_DISTANCE,
      lumiereGap: refDistance(playerRef(), lumiereRef()),
      world: { ...world },
      scale: { ...scale },
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
    window.TarotSceneEffects?.syncCamera({ world, origin, zoom: camera.zoom });
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssWidth, cssHeight);
    if (visionWorld.active && !absorptionSurface) {ctx.fillStyle = "#000"; ctx.fillRect(0, 0, cssWidth, cssHeight);}
    ctx.save();
    ctx.scale(camera.zoom, camera.zoom);
    ctx.translate(-origin.x, -origin.y);
    if (!absorptionSurface) drawVisionWorld();
    if (!visionWorld.active) drawTapEffect();
    drawActors();
    drawCollisionDebug();
    drawNavDebug();
    window.TarotSceneEffects?.drawDebug(ctx, { player, shiopon, lumiere }, scale, camera.zoom);
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
    if(hoshisunaIsolated){
      updateCaritasAbyss(dt);
    }
    updatePlayer(dt);
    updateShiopon(dt);
    if (!hoshisunaIsolated) updateLumiere(dt);
    updateCamera(dt);
    draw();
    requestAnimationFrame(loop);
  }

  function begin(event) {
    event?.preventDefault();
    if (!ready || running) return;

    // Root title may start a new game. Any validated Garden runtime entry
    // (Landing handoff, dev Continue, or Public Continue) must never fall through
    // to the New Game reset/navigation path.
    if (!enteringGardenRuntime) {
      if (start) start.disabled = true;
      // The title transition is owned by public-continue-title.js. A failed
      // durable reset must also release its departing state, not merely this button.
      function reportStartFailure(message) {
        if (start) start.disabled = false;
        if (note) note.textContent = message;
        window.dispatchEvent(new CustomEvent("tarot-breaker:title-new-game-failed", { detail: { message } }));
      }
      let progress;
      try { progress = window.TarotProgressCore?.createProgress(); }
      catch (_) { progress = null; }
      if (!progress) {
        reportStartFailure("セーブ機能を初期化できません");
        return;
      }
      let reset;
      try { reset = progress.resetGame("title-new-game"); }
      catch (_) { reset = null; }
      if (!reset?.persisted) {
        reportStartFailure("セーブデータを初期化できません。再試行してください");
        return;
      }
      window.TarotJourney?.reset();
      const audioDebug = new URLSearchParams(location.search).get("audioDebug") === "1" ? "&audioDebug=1" : "";
      const orbComparison = audioDebug && new URLSearchParams(location.search).get("orbOutput") === "webAudio"
        ? "&orbOutput=webAudio" : "";
      navigateRuntime(`./alenon.html?from=title&build=6bc2a38e${audioDebug}${orbComparison}`);
      return;
    }

    running = true;
    startScreen.hidden = true;
    window.dispatchEvent(new CustomEvent("tarot-breaker:world-enter"));
    guide.hidden = true;
    resize();
    reset();
    if (hoshisunaIsolated) {
      player.dir = "right";
      shiopon.hidden = false;
      actorVisibility.lumiere = 0;
      // Spawn behind Shion before activating the original main follow logic.
      const startBehind = {x:spawnRef.x-56,y:spawnRef.y};
      if (!collision.isWalkable(startBehind.x,startBehind.y)) throw new Error("hoshisuna-rear-spawn-invalid");
      shiopon.x = startBehind.x * scale.x;
      shiopon.y = startBehind.y * scale.y;
      shiopon.dir = "right";
      startShioponFollow();
    }
    if (!hoshisunaIsolated && window.TarotDialogue?.getState().joined) {
      startShioponFollow();
      if (enteringGardenRuntime) placeShioponBesidePlayer();
    }
    if (window.__TAROT_PUBLIC_STAR_GATE__ === true) window.TarotStarGatePublic?.restoreCompleted?.();
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
    if (!running || (stage3Runtime && releasePointers.has(event.pointerId))) return;
    event.preventDefault();
    if (!controls.pointerDown(pointerInfo(event))) return;
    window.TarotAudio?.startFromMovement();
    canvas.setPointerCapture?.(event.pointerId);
    guide.hidden = true;
  }

  function pointerMove(event) {
    if (!running || (stage3Runtime && releasePointers.has(event.pointerId))) return;
    event.preventDefault();
    controls.pointerMove(pointerInfo(event));
    syncStick();
  }

  function pointerEnd(event) {
    if (stage3Runtime && releasePointers.has(event.pointerId)) { releasePointers.delete(event.pointerId); clearInput("aftermath-release"); return; }
    if (!running) return;
    event.preventDefault();
    const action = controls.pointerEnd(
      { ...pointerInfo(event), cancelled: event.type !== "pointerup" },
      playerRef(),
    );
    if (event.type === "pointerup" && !window.TarotDialogue?.getState().active)
      window.TarotAudio?.startFromMovement();
    if (action) tapEffect = { ...action.point, age: 0 };
    if (canvas.hasPointerCapture?.(event.pointerId))
      canvas.releasePointerCapture(event.pointerId);
    syncStick();
  }

  function clearInput(reason) {
    controls?.clearInput(reason);
    syncStick();
  }

  function placeShioponBesidePlayer() {
    const playerNow = playerRef();
    const sideGap = SHIOPON_FOLLOW_DISTANCE;
    const candidates = [
      { x: playerNow.x - sideGap, y: playerNow.y },
      { x: playerNow.x + sideGap, y: playerNow.y },
      shioponFollowTarget(),
    ];
    const safe = candidates.find(
      (candidate) =>
        isWalkableRef(candidate.x, candidate.y) &&
        refDistance(candidate, playerNow) >= SHIOPON_FOLLOW_MIN_GAP,
    );
    if (!safe) return false;
    shiopon.x = safe.x * scale.x;
    shiopon.y = safe.y * scale.y;
    return true;
  }

  function startShioponFollow() {
    if (!ready) return;
    shiopon.scripted = null;
    shiopon.rotation = 0;
    shiopon.visualOffsetY = 0;
    shiopon.following = true;
    shiopon.followRoute = [];
    shiopon.followReplan = 0;
    shiopon.followTarget = null;
    shiopon.target = null;
    shiopon.wait = 0;
    shiopon.moving = false;
    shiopon.frame = 0;
    shiopon.anim = 0;
    const current = shioponRef();
    const target = shioponFollowTarget();
    if (
      refDistance(current, playerRef()) > SHIOPON_FOLLOW_EMERGENCY_GAP &&
      isWalkableRef(target.x, target.y)
    ) {
      shiopon.x = target.x * scale.x;
      shiopon.y = target.y * scale.y;
    }
    shiopon.dir = player.dir;
  }

  function stopShioponFollow() {
    shiopon.following = false;
    shiopon.followRoute = [];
    shiopon.followReplan = 0;
    shiopon.followTarget = null;
    shiopon.target = null;
    shiopon.moving = false;
    shiopon.frame = 0;
    shiopon.anim = 0;
    shiopon.wait = 0.9 + Math.random() * 1.4;
  }

  const sceneryPrior = new Map();
  function setVisionScenery(hidden) {
    for (const node of [map, ...document.querySelectorAll("[data-scene-world], [data-scene-object]")]) {
      if (hidden) {
        if (!sceneryPrior.has(node)) sceneryPrior.set(node, node.style.visibility);
        node.style.visibility = "hidden";
      } else if (sceneryPrior.has(node)) {
        node.style.visibility = sceneryPrior.get(node); sceneryPrior.delete(node);
      }
    }
  }
  if (stage3Runtime) window.TarotStage3Scene = Object.freeze({
    capture() {
      if (!ready || !running || !map.complete || !images.idle?.complete || !collision || cssWidth <= 1 || cssHeight <= 1) throw new Error("P0 current resources not prepared");
      if (visionWorld.active) throw new Error("P0 must precede Future Vision");
      return { mapId: "star_gate_garden", player: {...playerRef(), dir: player.dir},
        camera: {...camera}, viewport: {width:cssWidth,height:cssHeight}, owner:sceneLockOwner, npcLogical: {companion:stage3Dev ? window.TarotStage3DevFixture.context.companion : (shiopon.following ? "joined_with_shion" : (shiopon.hidden ? "waiting_at_landing" : "not_joined")), story:{...window.TarotJourney?.get("gardenStory")}}, actors: {shiopon: {...shioponRef(), dir:shiopon.dir, stageOffsetY:shiopon.stageOffsetY, visualOffsetY:shiopon.visualOffsetY, rotation:shiopon.rotation, following:shiopon.following}, lumiere: {...lumiereRef(), dir:lumiere.dir, stageOffsetY:lumiere.stageOffsetY}}, visibility: {...actorVisibility}, inputSuspended: !!controls?.state.suspended,
        npcSuspended, hidden: shiopon.hidden, captured: performance.now() };
    },
    lock(owner) {
      if (sceneLockOwner && sceneLockOwner !== owner) throw new Error("Scene lock already owned");
      if (!sceneLockOwner) sceneLockPrior = {suspended: !!controls?.state.suspended, npcSuspended};
      sceneLockOwner = owner; controls?.suspend(); npcSuspended = true; clearInput("stage3-dev");
    },
    unlock(owner) {
      if (sceneLockOwner !== owner) return false;
      sceneLockOwner = null;
      if (!sceneLockPrior?.suspended && !outsideInteraction) controls?.resume();
      npcSuspended = !!sceneLockPrior?.npcSuspended || outsideInteraction;
      cinematicCamera.generation++;cinematicCamera.owned=false; cinematicCamera.allowOverscan=false;
      sceneLockPrior = null; return true;
    },
    freezeCamera() {
      cinematicCamera.generation++;
      if (cinematicCamera.resolve) cinematicCamera.resolve({completed:false,interrupted:true});
      cinematicCamera.resolve = null; cinematicCamera.active = false; cinematicCamera.owned = true;
      return {...camera};
    },
    waitDraw({alive=()=>true}={}) { return new Promise(resolve => requestAnimationFrame(() => {if(alive())draw();resolve({completed:alive()});})); },
    prepareBackground({anchor={x:cssWidth/2,y:cssHeight/2}}={}) {
      if (!visionWorld.active || !visionWorld.image?.complete) throw new Error("Ruins not prepared");
      const surface = document.createElement("canvas");
      const bounds=stage3BackgroundBounds(cssWidth,cssHeight,anchor);
      surface.width = Math.ceil(bounds.width*dpr); surface.height = Math.ceil(bounds.height*dpr);
      surface.stage3Preparation={bounds,viewport:{width:cssWidth,height:cssHeight},anchor:{...anchor}};
      const target = surface.getContext("2d");
      target.setTransform(dpr,0,0,dpr,0,0); target.fillStyle = "#000";
      target.fillRect(0,0,bounds.width,bounds.height);
      target.translate(-bounds.left,-bounds.top);
      const origin = viewportOrigin(); target.scale(camera.zoom,camera.zoom); target.translate(-origin.x,-origin.y);
      const previous = ctx; ctx = target; try {drawVisionWorld();} finally {ctx=previous;}
      Object.assign(surface.style, {position:"absolute",left:bounds.left+"px",top:bounds.top+"px",width:bounds.width+"px",height:bounds.height+"px",pointerEvents:"none",zIndex:"0",transformOrigin:(anchor.x-bounds.left)+"px "+(anchor.y-bounds.top)+"px"});
      surface.dataset.stage3Background = "true";
      return surface;
    },
    activateAbsorption(surface) {
      if (!surface?.stage3Preparation || surface.stage3Preparation.viewport.width!==cssWidth || surface.stage3Preparation.viewport.height!==cssHeight || surface.width!==Math.ceil(surface.stage3Preparation.bounds.width*dpr) || surface.height!==Math.ceil(surface.stage3Preparation.bounds.height*dpr)) throw new Error("Invalid background preparation");
      if (absorptionSurface) throw new Error("Background already active");
      absorptionSurface = surface;
      const substrate = document.createElement("div"); substrate.dataset.stage3Substrate="true";
      Object.assign(substrate.style,{position:"absolute",inset:"0",background:"#080A12",zIndex:"0",pointerEvents:"none"});
      canvas.parentNode.insertBefore(substrate,canvas); canvas.parentNode.insertBefore(surface,canvas);
      draw(); return surface;
    },
    removeAbsorption() {
      absorptionSurface?.remove(); absorptionSurface=null;
      document.querySelectorAll("[data-stage3-substrate]").forEach(node=>node.remove());
    },
    async restore(p0, {alive=()=>true}={}) {
      if(!alive())throw new Error("Expired P0 restoration");
      if (!p0 || p0.mapId !== "star_gate_garden" || !ready) throw new Error("P0 unavailable");
      cancelAllStageMotions(false);
      this.removeAbsorption();
      visionWorld.active=false; visionWorld.opacity=0; visionWorld.token++;
      setVisionScenery(false);
      player.x=p0.player.x*scale.x; player.y=p0.player.y*scale.y; player.dir=p0.player.dir;
      player.stageOffsetY=0; player.moving=false; player.frame=0;
      for (const [id, actor] of [["shiopon",shiopon],["lumiere",lumiere]]) {
        const saved=p0.actors[id]; actor.x=saved.x*scale.x; actor.y=saved.y*scale.y; actor.dir=saved.dir;
        actor.stageOffsetY=saved.stageOffsetY; actor.moving=false; actor.frame=0;
      }
      shiopon.visualOffsetY=p0.actors.shiopon.visualOffsetY; shiopon.rotation=p0.actors.shiopon.rotation;
      shiopon.following=p0.actors.shiopon.following; shiopon.followRoute=[]; shiopon.followTarget=null;
      shiopon.hidden=p0.npcLogical.companion === "waiting_at_landing";
      for (const id of Object.keys(actorVisibility)) actorVisibility[id]=p0.visibility[id];
      if (cinematicCamera.resolve) cinematicCamera.resolve({completed:false,interrupted:true});
      cinematicCamera.generation++;cinematicCamera.active=false; cinematicCamera.resolve=null; cinematicCamera.owned=true;
      cinematicCamera.allowOverscan=false; Object.assign(camera,p0.camera);
      if (cssWidth !== p0.viewport.width || cssHeight !== p0.viewport.height) camera.zoom=normalCameraZoom;
      await this.waitDraw({alive});
      if(!alive())throw new Error("Expired P0 restoration");
      if (!this.verify(p0).completed) throw new Error("P0 verification failed");
      return {completed:true};
    },
    verify(p0) {
      const logical = window.TarotJourney?.get("gardenStory");
      const expectedHidden = p0?.npcLogical.companion === "waiting_at_landing";
      const logicalMatch = !!p0 && ["shioponDone","lumiereDone","joined"].every(key=>logical?.[key] === p0.npcLogical.story[key]);
      return {completed: !!p0 && ready && !visionWorld.active && !absorptionSurface &&
        Math.abs(playerRef().x-p0.player.x)<.01 && Math.abs(playerRef().y-p0.player.y)<.01 &&
        Object.keys(actorVisibility).every(id=>actorVisibility[id]===p0.visibility[id]) &&
        shiopon.hidden===expectedHidden && logicalMatch &&
        !!controls && controls.state.suspended && !!sceneLockOwner && cinematicCamera.owned,
        mapId:"star_gate_garden", player:{...playerRef(),dir:player.dir},
        npc:{shioponHidden:shiopon.hidden,logical}, camera:{...camera}, owner:sceneLockOwner};
    },
    getState() {return {presentPrepared:!!(ready && running && map.complete && images.idle?.complete && collision && cssWidth>1 && cssHeight>1),vision:visionWorld.active,absorption:!!absorptionSurface,viewport:{width:cssWidth,height:cssHeight,dpr},owner:sceneLockOwner};},
  });

  if (stage3Runtime) {
    // Observe physical releases independently of UI propagation. No time-based cooldown.
    window.addEventListener("keydown", e => heldKeys.add(e.key), true);
    window.addEventListener("keyup", e => heldKeys.delete(e.key), true);
    window.addEventListener("pointerdown", e => heldPointers.add(e.pointerId), true);
    for (const name of ["pointerup", "pointercancel"]) window.addEventListener(name, e => heldPointers.delete(e.pointerId), true);
    for (const name of ["pointerup", "pointercancel"]) window.addEventListener(name, e => releasePointers.delete(e.pointerId));
    window.addEventListener("blur",()=>{heldKeys.clear();heldPointers.clear();releaseKeys.clear();releasePointers.clear();});
    function clearAftermathInput() {
      for (const key of heldKeys) releaseKeys.add(key);
      for (const id of heldPointers) releasePointers.add(id);
      clearInput("aftermath");
    }
    function captureAftermath() {
      if (!ready || !running || visionWorld.active || absorptionSurface || sceneLockOwner)
        throw new Error("Aftermath requires a cleaned-up present garden");
      return {actors:Object.fromEntries(["shion","shiopon","lumiere"].map(id => {
        const actor=stageActor(id); return [id,{...stageActorRef(id),dir:actor.dir,stageOffsetY:actor.stageOffsetY/scale.y}];
      })), following:shiopon.following,hidden:shiopon.hidden,rotation:shiopon.rotation,
      visualOffsetY:shiopon.visualOffsetY/scale.y,visibility:{...actorVisibility},camera:{...camera},cameraRef:{x:camera.x/scale.x,y:camera.y/scale.y},
      lumiereEnabled:aftermathLumiereEnabled,inputSuspended:!!controls?.state.suspended,npcSuspended,owner:sceneLockOwner,viewport:{width:cssWidth,height:cssHeight}};
    }
    function lumiereRenderRect() {
      const origin=viewportOrigin();
      const pose=lumiereManifest?.poses[lumiere.dir]||lumiereManifest?.poses.down;
      if(!pose)return {left:0,right:0,top:0,bottom:0,width:0,height:0};
      const bodyHeight=DRAW_HEIGHT*lumiereManifest.render.reference_body_height/FRAME.h;
      const poseScale=bodyHeight/(pose.baseline_y-pose.body_top);
      const visualOffset=lumiere.bobOffsetY+lumiere.stageOffsetY;
      const left=(lumiere.x-pose.center_x*poseScale-origin.x)*camera.zoom;
      const top=(lumiere.y-LUMIERE_BOTTOM_GAP*scale.y-pose.baseline_y*poseScale+visualOffset-origin.y)*camera.zoom;
      const right=left+pose.width*poseScale*camera.zoom;
      const imageBottom=top+pose.height*poseScale*camera.zoom;
      const x=(lumiere.x-origin.x)*camera.zoom,y=(lumiere.y-origin.y)*camera.zoom;
      const unionLeft=Math.min(left-2,x-18*camera.zoom);
      const unionRight=Math.max(right+2,x+18*camera.zoom);
      const unionTop=Math.min(top-2,y-5*camera.zoom);
      const unionBottom=Math.max(imageBottom+2,y+9*camera.zoom);
      return {left:unionLeft,right:unionRight,top:unionTop,bottom:unionBottom,
        width:unionRight-unionLeft,height:unionBottom-unionTop};
    }
    window.TarotAftermathScene=Object.freeze({
      capture:captureAftermath,captureA0:captureAftermath,
      lock(owner){window.TarotStage3Scene.lock(owner);aftermathOwner=owner;clearAftermathInput();},
      unlock(owner){clearAftermathInput();const released=window.TarotStage3Scene.unlock(owner);if(released)aftermathOwner=null;return released;},
      clearInput:clearAftermathInput,
      // Stage3 unlock is unchanged. Reclaim framing in the same JS task
      // before notifying Aftermath, and abandon it if unconsumed.
      armReturnCamera(id){
        if(!Number.isFinite(id)||sceneLockOwner||!ready||!running||visionWorld.active||absorptionSurface||returnCameraHandoff)return false;
        // normalCameraTarget is private to the separate cinematic-camera
        // block. Access it through that block's API, never by free variable.
        const target=window.TarotCinematicCamera?.getNormalTarget?.();
        if(!Number.isFinite(target?.x)||!Number.isFinite(target?.y))return false;
        returnCameraHandoff={id,generation:++cinematicCamera.generation,viewport:{width:cssWidth,height:cssHeight},
          safeCamera:{x:target.x,y:target.y,zoom:normalCameraZoom},
          safeCameraRef:{x:target.x/scale.x,y:target.y/scale.y}};
        cinematicCamera.owned=true;cinematicCamera.allowOverscan=true;
        return true;
      },
      takeReturnCamera(id){
        const lease=returnCameraHandoff;
        if(!lease||lease.id!==id||sceneLockOwner||!cinematicCamera.owned||lease.generation!==cinematicCamera.generation)return null;
        if(lease.viewport.width!==cssWidth||lease.viewport.height!==cssHeight)return null;
        returnCameraHandoff=null;
        return {safeCamera:{...lease.safeCamera},safeCameraRef:{...lease.safeCameraRef}};
      },
      abandonReturnCamera(id){
        const lease=returnCameraHandoff;
        if(!lease||lease.id!==id)return false;
        returnCameraHandoff=null;
        if(sceneLockOwner||!cinematicCamera.owned||lease.generation!==cinematicCamera.generation)return false;
        window.TarotCinematicCamera.release();draw();return true;
      },
      async returnToGameplayCamera(duration=450){
        if(!aftermathOwner||sceneLockOwner!==aftermathOwner)return {completed:false,reason:"owner"};
        const vp={width:cssWidth,height:cssHeight};
        const done=await window.TarotCinematicCamera.returnToPlayer(duration);
        if(!done?.completed||sceneLockOwner!==aftermathOwner||
           cssWidth!==vp.width||cssHeight!==vp.height)return {completed:false,reason:"interrupted"};
        window.TarotCinematicCamera.release();
        const drawResult=await window.TarotStage3Scene.waitDraw();
        return {completed:drawResult?.completed===true};
      },
      cancelReturnPan(){
        if(aftermathOwner&&sceneLockOwner===aftermathOwner)window.TarotStage3Scene.freezeCamera();
      },
      pause(value){aftermathPaused=!!value;},setHiddenPaused(value){aftermathPaused=!!value;},
      setActorVisibility(actorId,value){
        if(!(actorId in actorVisibility))return false;
        actorVisibility[actorId]=clamp(Number(value)||0,0,1);draw();return true;
      },
      placeReturnFormation(){
        const shion=playerRef();
        // Preserve Lumiere's restored pre-blackout world position exactly.
        // Only Shiopon is repositioned beside her; this avoids the artificial
        // Shion-centered symmetry that looked staged on device.
        const lumiereAnchor={...stageActorRef("lumiere")};
        const preferred={x:lumiereAnchor.x-62,y:lumiereAnchor.y};
        const alternate={x:lumiereAnchor.x+62,y:lumiereAnchor.y};
        let shioponPlaced=preferred;
        if(!isWalkableRef(preferred.x,preferred.y)){
          shioponPlaced=isWalkableRef(alternate.x,alternate.y)
            ?alternate:(collision.nearestWalkable(preferred)||preferred);
        }
        shiopon.x=shioponPlaced.x*scale.x;shiopon.y=shioponPlaced.y*scale.y;
        shiopon.stageOffsetY=0;shiopon.visualOffsetY=0;shiopon.rotation=0;
        shiopon.moving=false;shiopon.frame=0;shiopon.followRoute=[];shiopon.followTarget=null;shiopon.target=null;
        // Keep the authored return formation stable while the player freely checks both companions.
        shiopon.wait=Number.POSITIVE_INFINITY;
        lumiere.stageOffsetY=0;lumiere.moving=false;lumiere.frame=0;
        setDirection(shiopon,lumiereAnchor.x-shioponPlaced.x,lumiereAnchor.y-shioponPlaced.y);
        setDirection(lumiere,shion.x-lumiereAnchor.x,shion.y-lumiereAnchor.y);
        draw();
        return {shion:{...shion},shiopon:{...shioponPlaced},lumiere:{...lumiereAnchor}};
      },
      face(actor,target){return performStageCommand({type:"face",actor,target});},
      perform(command){const action=performStageCommand(command);aftermathMotions.add(action.id);action.promise.finally(()=>aftermathMotions.delete(action.id));return action;},
      gameplayCamera(){aftermathFocusBaseline=null;window.TarotCinematicCamera.release();return Promise.resolve({completed:true});},
      focusGate(){
        window.TarotStage3Scene.freezeCamera();
        // A small, clamped focus shift at the existing gameplay zoom, never an upper pan.
        if(!aftermathFocusBaseline)aftermathFocusBaseline={x:camera.x/scale.x,y:camera.y/scale.y};
        camera.zoom=normalCameraZoom;
        const baselineY=aftermathFocusBaseline.y*scale.y,gateY=105*scale.y;
        const desiredY=gateY-cssHeight*.30/camera.zoom+cssHeight/2/camera.zoom;
        camera.y=Math.max(baselineY-36*scale.y,Math.min(baselineY+36*scale.y,desiredY));
        camera.x=aftermathFocusBaseline.x*scale.x;draw();return Promise.resolve({completed:true});
      },
      nearGate(distance=46){return refDistance(playerRef(),{x:810,y:105})<=distance;},
      hitTestActor(clientX,clientY){
        const rect=canvas.getBoundingClientRect();
        const px=clientX-rect.left,py=clientY-rect.top,origin=viewportOrigin();
        const candidates=["lumiere","shiopon"].map(id=>{
          const actor=stageActor(id),ref=stageActorRef(id);
          const x=(ref.x*scale.x-origin.x)*camera.zoom;
          const feetY=(actor.y+actor.stageOffsetY-origin.y)*camera.zoom;
          const halfW=(id==="lumiere"?54:34)*camera.zoom;
          const height=(id==="lumiere"?88:82)*camera.zoom;
          const top=feetY-height,bottom=feetY+10*camera.zoom;
          return {id,x,centerY:(top+bottom)/2,left:x-halfW,right:x+halfW,top,bottom};
        }).filter(hit=>px>=hit.left&&px<=hit.right&&py>=hit.top&&py<=hit.bottom);
        candidates.sort((a,b)=>Math.hypot(px-a.x,py-a.centerY)-Math.hypot(px-b.x,py-b.centerY));
        return candidates[0]?.id||null;
      },
      moveAway(){return this.nearGate(62)?this.perform({type:"step",actor:"shion",direction:"down",distance:12,duration:240}).promise:Promise.resolve({completed:true});},
      flightPose(ref,offsetY=0){lumiere.x=ref.x*scale.x;lumiere.y=ref.y*scale.y;lumiere.stageOffsetY=offsetY*scale.y;lumiere.dir="right";lumiere.moving=false;},
      setLumiereDeparted(value=true){aftermathLumiereEnabled=!value;},
      setLumiereEnabled(value){aftermathLumiereEnabled=!!value;},
      getState(){return {actors:Object.fromEntries(["shion","shiopon","lumiere"].map(id=>[id,{...stageActorRef(id),dir:stageActor(id).dir}])),following:shiopon.following,lumiereEnabled:aftermathLumiereEnabled,visibility:{...actorVisibility},lumiereRect:lumiereRenderRect(),viewport:{width:cssWidth,height:cssHeight},camera:{...camera},owner:sceneLockOwner,inputSuspended:!!controls?.state.suspended,npcSuspended};},
      async restore(a0){
        for(const id of aftermathMotions){for(const actorId of Object.keys(stageMotions)){const motion=stageMotions[actorId];if(motion?.id===id)settleStageMotion(actorId,motion,{skipped:true});}}
        aftermathMotions.clear();aftermathPaused=false;
        for(const [id,saved] of Object.entries(a0.actors)){const actor=stageActor(id);actor.x=saved.x*scale.x;actor.y=saved.y*scale.y;actor.dir=saved.dir;actor.stageOffsetY=saved.stageOffsetY*scale.y;actor.moving=false;}
        shiopon.following=a0.following;shiopon.hidden=a0.hidden;shiopon.rotation=a0.rotation;shiopon.visualOffsetY=a0.visualOffsetY*scale.y;shiopon.followRoute=[];shiopon.followTarget=null;
        Object.assign(actorVisibility,a0.visibility);aftermathLumiereEnabled=a0.lumiereEnabled;
        window.TarotStage3Scene.freezeCamera();Object.assign(camera,a0.camera);
        camera.x=a0.cameraRef.x*scale.x;camera.y=a0.cameraRef.y*scale.y;
        if(cssWidth!==a0.viewport.width||cssHeight!==a0.viewport.height)camera.zoom=normalCameraZoom;
        aftermathFocusBaseline=null;clearAftermathInput();draw();
        return {completed:this.verify(a0).completed};
      },
      verify(a0){return {completed:!!a0&&!visionWorld.active&&!absorptionSurface&&Object.entries(a0.actors).every(([id,saved])=>refDistance(stageActorRef(id),saved)<.01&&stageActor(id).dir===saved.dir&&Math.abs(stageActor(id).stageOffsetY/scale.y-saved.stageOffsetY)<.01)&&Object.keys(actorVisibility).every(id=>actorVisibility[id]===a0.visibility[id])&&aftermathLumiereEnabled===a0.lumiereEnabled&&shiopon.following===a0.following&&shiopon.hidden===a0.hidden&&Math.abs(shiopon.rotation-a0.rotation)<1e-6&&Math.abs(shiopon.visualOffsetY/scale.y-a0.visualOffsetY)<.01&&Math.abs(camera.x/scale.x-a0.cameraRef.x)<.01&&Math.abs(camera.y/scale.y-a0.cameraRef.y)<.01&&Math.abs(camera.zoom-((cssWidth!==a0.viewport.width||cssHeight!==a0.viewport.height)?normalCameraZoom:a0.camera.zoom))<1e-6&&sceneLockOwner===aftermathOwner&&!!aftermathOwner&&!!controls?.state.suspended&&npcSuspended&&sceneLockPrior?.suspended===a0.inputSuspended&&!!sceneLockPrior?.npcSuspended===!!a0.npcSuspended};},
    });
  }

  if (stage3Runtime) {
  function beginCinematicPan(targetX, targetY, targetZoom, duration, allowOverscan = false) {
    cinematicCamera.generation++;
    if (cinematicCamera.resolve)
      cinematicCamera.resolve({ completed: false, interrupted: true });
    cinematicCamera.active = true;
    cinematicCamera.owned = true;
    cinematicCamera.allowOverscan = allowOverscan;
    cinematicCamera.startX = camera.x;
    cinematicCamera.startY = camera.y;
    cinematicCamera.startZoom = camera.zoom;
    cinematicCamera.targetX = targetX;
    cinematicCamera.targetY = targetY;
    cinematicCamera.targetZoom = targetZoom;
    cinematicCamera.elapsed = 0;
    cinematicCamera.duration = Math.max(0, duration / 1000);
    return new Promise(resolve => { cinematicCamera.resolve = resolve; });
  }

  function normalCameraTarget() {
    const viewW = cssWidth / normalCameraZoom;
    const viewH = cssHeight / normalCameraZoom;
    const halfW = viewW / 2;
    const halfH = viewH / 2;
    return {
      x: clamp(player.x, halfW, Math.max(halfW, world.w - halfW)),
      y: clamp(player.y - cameraOffsetY(), halfH, Math.max(halfH, world.h - halfH)),
    };
  }

  window.TarotCinematicCamera = Object.freeze({
    // Safe read-only bridge for Stage3->Aftermath return framing. It stays
    // in this same lexical block as normalCameraTarget().
    getNormalTarget() { return { ...normalCameraTarget() }; },
    panTo(target = {}, duration = 1200, options = {}) {
      const ref = stageTargetRef(target);
      if (!ref) return Promise.resolve({ completed: false });
      const zoom = Number.isFinite(options.zoom) && options.zoom > 0
        ? options.zoom
        : camera.zoom;
      return beginCinematicPan(
        ref.x * scale.x,
        ref.y * scale.y,
        zoom,
        duration,
        options.allowOverscan === true,
      );
    },
    frameBounds(bounds = {}, duration = 1200, options = {}) {
      const left = Number(bounds.left);
      const top = Number(bounds.top);
      const right = Number(bounds.right);
      const bottom = Number(bounds.bottom);
      if (![left, top, right, bottom].every(Number.isFinite) || right <= left || bottom <= top)
        return Promise.resolve({ completed: false });
      const padding = clamp(Number(options.padding) || 16, 0, Math.min(cssWidth, cssHeight) / 3);
      const boundsW = (right - left) * scale.x;
      const boundsH = (bottom - top) * scale.y;
      const fitZoom = Math.min(
        (cssWidth - padding * 2) / boundsW,
        (cssHeight - padding * 2) / boundsH,
        normalCameraZoom,
      );
      const minZoom = Number.isFinite(options.minZoom) ? options.minZoom : 0.55;
      const zoom = clamp(fitZoom, Math.min(minZoom, normalCameraZoom), normalCameraZoom);
      const renderedHeight = boundsH * zoom;
      const topInset = clamp(
        Number(options.topInset) || (cssHeight - renderedHeight) * 0.12,
        padding,
        Math.max(padding, cssHeight * 0.12),
      );
      const originX = ((left + right) * 0.5) * scale.x - cssWidth / zoom / 2;
      const originY = top * scale.y - topInset / zoom;
      return beginCinematicPan(
        originX + cssWidth / zoom / 2,
        originY + cssHeight / zoom / 2,
        zoom,
        duration,
        true,
      );
    },
    returnToPlayer(duration = 1200) {
      const target = normalCameraTarget();
      return beginCinematicPan(target.x, target.y, normalCameraZoom, duration, true);
    },
    release() {
      cinematicCamera.generation++;
      if (cinematicCamera.resolve)
        cinematicCamera.resolve({ completed: false, interrupted: true });
      cinematicCamera.active = false;
      cinematicCamera.owned = false;
      cinematicCamera.allowOverscan = false;
      cinematicCamera.resolve = null;
      camera.zoom = normalCameraZoom;
      const target = normalCameraTarget();
      camera.x = target.x;
      camera.y = target.y;
    },
    getState: () => ({
      active: cinematicCamera.active,
      owned: cinematicCamera.owned,
      allowOverscan: cinematicCamera.allowOverscan,
      camera: { ...camera },
      origin: viewportOrigin(),
      viewport: { width: cssWidth, height: cssHeight, normalZoom: normalCameraZoom },
      world: { ...world },
      scale: { ...scale },
      player: playerRef(),
    }),
    isViewportInsideWorld() {
      const origin = viewportOrigin();
      const viewW = cssWidth / camera.zoom;
      const viewH = cssHeight / camera.zoom;
      const epsilon = 0.5;
      return origin.x >= -epsilon && origin.y >= -epsilon &&
        origin.x + viewW <= world.w + epsilon &&
        origin.y + viewH <= world.h + epsilon;
    },
  });
  window.TarotVisionWorld = Object.freeze({
    async begin(src, options = {}) {
      const token = ++visionWorld.token;
      await loadVisionWorld(src, {...options, token});
      if (options.signal?.aborted || token !== visionWorld.token) {
        const error = new Error("Future Vision entry expired"); error.name = "AbortError"; throw error;
      }
      visionWorld.active = true;
      setVisionScenery(true);
      visionWorld.opacity = 0;
      return { completed: true };
    },
    setOpacity(opacity) {
      visionWorld.opacity = clamp(Number(opacity) || 0, 0, 1);
    },
    end() {
      visionWorld.active = false;
      setVisionScenery(false);
      visionWorld.opacity = 0;
      visionWorld.image = null;
      visionWorld.src = "";
      visionWorld.token += 1;
    },
    getState: () => ({
      active: visionWorld.active,
      opacity: visionWorld.opacity,
      src: visionWorld.src,
      world: { width: world.w / scale.x, height: world.h / scale.y },
      registration: { ...VISION_REGISTRATION },
    }),
  });

  window.TarotActorScreenAnchor = Object.freeze({
    get(actorId = "shion") {
      if (actorId !== "shion") return null;
      const origin = viewportOrigin();
      const scaleDraw = DRAW_HEIGHT / FRAME.h;
      const drawW = FRAME.w * scaleDraw;
      const drawH = FRAME.h * scaleDraw;
      const feetY = player.y + player.stageOffsetY;
      return {
        x: (player.x - origin.x) * camera.zoom,
        feetY: (feetY - origin.y) * camera.zoom,
        width: drawW * camera.zoom,
        height: drawH * camera.zoom,
      };
    },
  });
  window.TarotActorVisibility = Object.freeze({
    set(actorId, opacity) { if (actorId in actorVisibility) actorVisibility[actorId] = clamp(Number(opacity) || 0, 0, 1); },
    reset() { actorVisibility.shion = actorVisibility.shiopon = actorVisibility.lumiere = 1; },
    getState: () => ({ ...actorVisibility }),
  });

  }

  if (hoshisunaIsolated) window.TarotHoshisunaAbyss=Object.freeze({
    setPhase(phase){
      if(!["edge","surge","engulfed","cleared"].includes(phase))return false;
      caritasAbyss.phase=phase;
      if(phase==="edge"||phase==="cleared")caritasAbyss.opacity=0;
      if(ready&&running)draw();
      return true;
    },
    getState:()=>({phase:caritasAbyss.phase,opacity:caritasAbyss.opacity})
  });

  if (hoshisunaIsolated) window.TarotHoshisunaManifestation=Object.freeze({
    // Before any card appears, move the real follower to the FAR LEFT.
    // It is an actual collision-checked walk, never a teleport or clone.
    prepareLeft(){
      if(!ready||!running||caritasInvocation.locked||caritasTarotSpread.active)
        return Promise.resolve({completed:false,reason:"left-not-ready"});
      const front=playerRef(),from=shioponRef();
      const candidates=[
        {x:front.x-69,y:front.y-12},
        {x:front.x-71,y:front.y-13},
        {x:front.x-64,y:front.y-12},
        {x:front.x-65,y:front.y-8},
        {x:front.x-66,y:front.y-17},
        {x:front.x-60,y:front.y-17}
      ];
      // Reserve clearance for the next step BEFORE the cards are deployed.
      // A staging point that traps the visible fox under the left tarot
      // cannot be chosen merely because it is walkable before deployment.
      const roomAhead=spot=>[18,15,12,9,6].some(n=>
        caritasSafeCollision(true).segmentClear(spot,{x:spot.x,y:spot.y-n}));
      const safe=candidates.filter(spot=>caritasSafeRoute(from,spot,false).length);
      const spot=safe.find(roomAhead)||safe[0];
      if(spot){
        const move=performStageCommand({type:"move",actor:"shiopon",target:spot,duration:460,caritasSafe:true});
        return move.promise.then(out=>out.completed&&!out.skipped
          ?{completed:true,position:{...shioponRef()}}
          :collision.isWalkable(shioponRef().x,shioponRef().y)
            ?{completed:true,position:{...shioponRef()},staged:false,reason:"left-walk-interrupted"}
            :{completed:false,reason:"left-walk-interrupted"});
      }
      // Never abort the entire transformation because a staging walk has
      // no available corridor. Remain on the current legal map footpoint.
      return Promise.resolve(collision.isWalkable(from.x,from.y)&&
        refDistance(from,front)>=ACTOR_COLLISION_DISTANCE+8
        ?{completed:true,position:{...from},staged:false,reason:"left-route-blocked"}
        :{completed:false,reason:"left-position-unsafe"});
    },
    startChant(){
      if(!ready||!running||!caritasTarotSpread.active||caritasInvocation.phase!=="idle")return false;
      if(caritasChant.phase!=="idle")return true;
      caritasChant.phase="rising";caritasChant.elapsed=0;caritasChant.sealedAt=0;
      caritasChant.paused=document.hidden;caritasChant.since=performance.now();
      return true;
    },
    sealChant(){
      if(caritasChant.phase==="idle")return false;
      if(caritasChant.phase==="sealed")return true;
      caritasChant.sealedAt=caritasChantElapsed();
      caritasChant.phase="sealed";
      return true;
    },
    deployCards(){
      if(!ready||!running||!caritasTarotBack||caritasTarotSpread.active||caritasInvocation.phase!=="idle")return false;
      caritasTarotSpread.active=true;caritasTarotSpread.elapsed=0;
      caritasTarotSpread.since=performance.now();caritasTarotSpread.paused=document.hidden;
      draw();return true;
    },
    moveForward(){
      if(!ready||!running||!caritasShiorielAtlas||caritasInvocation.locked)
        return Promise.resolve({completed:false,reason:"not-ready"});
      const from=shioponRef();
      // The preceding prepareLeft() established the exact safe staging point.
      // One deliberate 18-world-pixel step toward Caritas (north), not a
      // second large reposition or a teleport across Shion/the tarot.
      const candidates=[
        {x:from.x,y:from.y-18},
        {x:from.x-3,y:from.y-18},
        {x:from.x+3,y:from.y-18},
        {x:from.x,y:from.y-15},
        {x:from.x,y:from.y-12}
      ];
      let spot=null;
      for(const candidate of candidates){
        if(caritasSafeCollision(true).segmentClear(from,candidate)&&
           caritasSafeRoute(from,candidate,true).length){spot=candidate;break;}
      }
      if(!spot){
        // No tunneling through a card, Shion or the authored terrain; the
        // invocation still continues from this very same valid footpoint.
        caritasInvocation.locked=true;
        shiopon.dir="down";shiopon.frame=0;shiopon.moving=false;
        draw();
        return Promise.resolve({completed:true,stepped:false,
          reason:"one-step-route-blocked",position:{...from}});
      }
      caritasInvocation.locked=true;
      const move=performStageCommand({type:"move",actor:"shiopon",target:spot,duration:440,caritasSafe:true});
      return move.promise.then(out=>{
        if(!out.completed||out.skipped){
          // A collision detected during the walk must not teleport the fox.
          // Keep the last legal position and complete the map manifestation.
          shiopon.dir="down";shiopon.frame=0;shiopon.moving=false;
          draw();
          return {completed:true,stepped:false,
            reason:"move-interrupted",position:{...shioponRef()}};
        }
        shiopon.dir="down";shiopon.frame=0;shiopon.moving=false;
        draw();
        return {completed:true,stepped:true,position:{...shioponRef()}};
      });
    },
    faceFront(){
      if(!caritasInvocation.locked)return false;
      shiopon.dir="down";shiopon.frame=0;shiopon.moving=false;
      draw();return true;
    },
    begin(){
      if(!caritasInvocation.locked||caritasInvocation.phase!=="idle"||!caritasShiorielAtlas)return false;
      // No second completion beat: invocation is already sealed.
      caritasChant.phase="idle";caritasChant.elapsed=0;caritasChant.sealedAt=0;
      caritasChant.paused=false;
      caritasInvocation.phase="charging";caritasInvocation.elapsed=0;
      caritasInvocation.fx=caritasOwnerTransformationAtlas?null:prepareCaritasPixelManifestation();
      caritasInvocation.paused=document.hidden;
      caritasInvocation.since=performance.now();
      window.TarotCaritasManifestationAudio?.begin?.();
      draw();return true;
    },
    reveal(){
      if(!caritasInvocation.locked||caritasInvocation.phase!=="charging")return false;
      caritasInvocation.phase="revealed";
      caritasInvocation.elapsed=CARITAS_MANIFESTATION_DURATION_MS;
      window.TarotCaritasManifestationAudio?.clear?.();
      draw();return true;
    },
    pause(){
      if(caritasChant.phase!=="idle"&&!caritasChant.paused){
        caritasChant.elapsed=caritasChantElapsed();caritasChant.paused=true;
      }
      if(caritasTarotSpread.active&&!caritasTarotSpread.paused){
        caritasTarotSpread.elapsed=caritasTarotElapsed();caritasTarotSpread.paused=true;
      }
      if(caritasInvocation.phase!=="charging"||caritasInvocation.paused)return;
      caritasInvocation.elapsed+=Math.max(0,performance.now()-caritasInvocation.since);
      caritasInvocation.paused=true;
      window.TarotCaritasManifestationAudio?.pause?.();
    },
    resume(){
      if(caritasChant.phase!=="idle"&&caritasChant.paused&&!document.hidden){
        caritasChant.since=performance.now();caritasChant.paused=false;
      }
      if(caritasTarotSpread.active&&caritasTarotSpread.paused&&!document.hidden){
        caritasTarotSpread.since=performance.now();caritasTarotSpread.paused=false;
      }
      if(caritasInvocation.phase!=="charging"||!caritasInvocation.paused||document.hidden)return;
      caritasInvocation.since=performance.now();caritasInvocation.paused=false;
      window.TarotCaritasManifestationAudio?.resume?.();
    },
    clear(){
      window.TarotCaritasManifestationAudio?.clear?.();
      // An interrupted/retried event must not leave the fox's scripted
      // collision route running invisibly after returning to the world.
      if(stageMotions.shiopon?.caritasSafe)
        settleStageMotion("shiopon",stageMotions.shiopon,{skipped:true});
      caritasTarotSpread.active=false;caritasTarotSpread.elapsed=0;
      caritasChant.phase="idle";caritasChant.elapsed=0;
      caritasChant.sealedAt=0;caritasChant.paused=false;
      caritasSafeNavigator=null;caritasSafeNavigatorKey="";
      caritasTarotSpread.since=0;caritasTarotSpread.paused=false;
      // Reset the actual canvas sprite BEFORE the battle overlay goes away.
      // Idempotent: also safe during the returning phase and on final finish.
      caritasInvocation.phase="idle";caritasInvocation.locked=false;
      caritasInvocation.elapsed=0;caritasInvocation.paused=false;caritasInvocation.since=0;
      caritasInvocation.fx=null;caritasOwnerBlendSurface=null;caritasOwnerStarAtlas=null;caritasResonanceSprites=null;
      shiopon.hidden=false;shiopon.rotation=0;
      shiopon.visualOffsetY=0;shiopon.stageOffsetY=0;
      shiopon.frame=0;shiopon.anim=0;shiopon.moving=false;
      shiopon.target=null;shiopon.followRoute=[];shiopon.followTarget=null;
      shiopon.followReplan=0;
      if(ready)faceShioponTowardPlayer();
      if(ready&&running)draw();
      return true;
    },
    getState:()=>({phase:caritasInvocation.phase,locked:caritasInvocation.locked,
      cardsActive:caritasTarotSpread.active,cardBackReady:!!caritasTarotBack,
      chantPhase:caritasChant.phase,chantStrength:caritasChantStrength(),
      position:{...shioponRef()},direction:shiopon.dir,atlasReady:!!caritasShiorielAtlas,
      pixelFragments:caritasInvocation.fx?.fragments.length||0,hasSilhouette:!!caritasInvocation.fx?.silhouette,
      ownerAnimationReady:!!caritasOwnerTransformationAtlas,ownerFrameCount:CARITAS_OWNER_FRAME_TIMES_MS.length})
  });

  window.TarotStage = Object.freeze({
    perform: performStageCommand,
    finishAll: () => cancelAllStageMotions(true),
    cancelAll: () => cancelAllStageMotions(false),
    getState: () => ({
      actors: {
        shion: { ...playerRef(), dir: player.dir },
        shiopon: { ...shioponRef(), dir: shiopon.dir },
        lumiere: { ...lumiereRef(), dir: lumiere.dir },
      },
      motions: Object.fromEntries(
        Object.entries(stageMotions).map(([actorId, motion]) => [
          actorId,
          motion ? { id: motion.id, kind: motion.kind } : null,
        ]),
      ),
    }),
    landmarks: STAGE_LANDMARKS,
  });

  start?.addEventListener("click", begin);
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
      if (stage3Runtime && releaseKeys.has(event.key)) return;
      if (running && controls.keyDown(event.key)) {
        window.TarotAudio?.startFromMovement();
        guide.hidden = true;
        event.preventDefault();
      }
    },
    { passive: false },
  );
  window.addEventListener("keyup", (event) => { releaseKeys.delete(event.key); controls?.keyUp(event.key); });
  window.addEventListener("blur", () => clearInput("blur"));
  window.addEventListener("pagehide", () => clearInput("pagehide"));
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) clearInput("hidden");
    last = 0;
  });

  window.addEventListener("tarot-breaker:interaction-start", () => {
    outsideInteraction = true;
    controls?.suspend();
    npcSuspended = true;
    syncStick();
  });
  window.addEventListener("tarot-breaker:interaction-end", () => {
    outsideInteraction = false;
    cancelAllStageMotions(true);
    if (!sceneLockOwner) { controls?.resume(); npcSuspended = false; }
  });
  window.addEventListener("tarot-breaker:shiopon-face-player", faceShioponTowardPlayer);
  window.addEventListener("tarot-breaker:shiopon-race-start", startShioponRace);
  window.addEventListener("tarot-breaker:shiopon-trip", tripShiopon);
  window.addEventListener("tarot-breaker:shiopon-recover", recoverShiopon);
  window.addEventListener("tarot-breaker:shiopon-follow-start", startShioponFollow);
  window.addEventListener("tarot-breaker:shiopon-follow-stop", stopShioponFollow);

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

      const lumiereResponse = await fetch(LUMIERE_BASE + "lumiere_sprite_manifest.json");
      if (!lumiereResponse.ok) throw new Error("リュミエール設定を読み込めません");
      lumiereManifest = await lumiereResponse.json();
      validateLumiereManifest(lumiereManifest);

      await loadCollision();
      const southExitRef = collision.nearestWalkable(DEFAULT_SPAWN);
      if (!hoshisunaIsolated && (!southExitRef || southExitRef.y >= DEFAULT_SPAWN.y))
        throw new Error("garden-south-exit-unavailable");
      if (hoshisunaIsolated) {
        spawnRef = {x:108,y:488};
        // Opt-in author preview only: a legal Starroad spot near Caritas.
        // The existing follower spawns 56 world units behind Shion, also on
        // walkable ground. Default ?dev=hoshisuna spawn remains unchanged.
        if(transformationReplay)spawnRef = {x:1088,y:331};
        if (!collision.isWalkable(spawnRef.x,spawnRef.y)) throw new Error("hoshisuna-player-spawn-invalid");
        gardenExitRef = {...spawnRef};
      } else if (stage3Dev) {
        spawnRef = {...window.TarotStage3DevFixture.context.spawn};
        gardenExitRef = {...spawnRef};
      } else if (gardenResumeDev || gardenResumePublic) {
        const session = gardenResumePublic ? window.TarotGardenContinueTransit : window.TarotGardenDevTransit;
        if (!session?.ok || session.context?.mapId !== "star_gate_garden" ||
            session.context?.spawnId !== "south_gate" || session.spawn?.x !== 724 || session.spawn?.y !== 944 ||
            !collision.isWalkable(session.spawn.x, session.spawn.y) || session.spawn.y >= southExitRef.y - 8)
          throw new Error("garden-continue-spawn-invalid");
        spawnRef = {x:session.spawn.x, y:session.spawn.y};
        gardenExitRef = {...southExitRef};
      } else {
        spawnRef = findNearestSpawnRef();
        gardenExitRef = {...southExitRef};
      }
      if (enteringFromLanding)
        spawnRef = collision.nearestWalkable({x: spawnRef.x, y: spawnRef.y - 16});

      const loaded = await Promise.all([
        waitForMap(),
        window.TarotSceneEffects.ready,
        ...Object.entries(files).map(async ([key, src]) => {
          images[key] = await loadImage(src);
        }),
        ...Object.entries(shioponFiles).map(async ([key, src]) => {
          shioponImages[key] = await loadImage(src);
        }),
        ...(hoshisunaIsolated ? [
          loadImage("./assets/tarot/backs/tarot-card-back.webp").then(image=>{caritasTarotBack=image;}),
          loadImage("./assets/sprites/shioriel/shioriel-four-directions.webp").then(image=>{
            if(image.naturalWidth!==1086||image.naturalHeight!==1448)
              throw new Error("シオリエル正面・四面図の寸法不正");
            caritasShiorielAtlas=image;
          }),
          loadImage("./assets/events/hoshisuna/battle/shiopon-shioriel-transformation-atlas.webp").then(image=>{
            if(image.naturalWidth!==640||image.naturalHeight!==480)
              throw new Error("変身アトラスは640×480px（160px×12コマ）が必要です");
            caritasOwnerTransformationAtlas=image;
          }).catch(err=>{
            // If the optional effect asset fails, keep the old safe manifestation.
            console.warn("[Caritas] owner transformation unavailable",err);
          }),
        ] : []),
        ...Object.entries(lumiereFiles).map(async ([key, src]) => {
          lumiereImages[key] = await loadImage(src);
        }),
      ]);

      const loadedMap = loaded[0];
      if (!loadedMap.naturalWidth || !loadedMap.naturalHeight)
        throw new Error("背景画像サイズを取得できません");

      // Artwork files may be replaced with a larger source canvas, but game
      // coordinates, collision data and every authored scene layer share the
      // fixed 1448x1086 reference space. Keeping the world canonical prevents
      // a replacement image's aspect ratio from stretching actors or shifting
      // interaction points. Each raster layer handles its own visual fit.
      world = { w: REF.w, h: REF.h };
      scale = { x: 1, y: 1 };

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

      for (const dir of ["down", "up", "left", "right"]) {
        const pose = lumiereManifest.poses[dir];
        if (lumiereImages[dir].naturalWidth !== pose.width ||
            lumiereImages[dir].naturalHeight !== pose.height)
          throw new Error("リュミエール" + dir + "浮遊画像サイズ不正");
      }

      if (typeof window.TarotLumiereSway?.create !== "function")
        throw new Error("リュミエール揺れ描画を読み込めません");
      for (const dir of ["down", "up", "left", "right"]) {
        const compositor = window.TarotLumiereSway.create(lumiereImages[dir], lumiereManifest.poses[dir]);
        if (!compositor?.canvas || typeof compositor.draw !== "function" ||
            !Number.isInteger(compositor.width) || compositor.width <= 0 ||
            !Number.isInteger(compositor.height) || compositor.height <= 0 ||
            compositor.canvas.width !== compositor.width || compositor.canvas.height !== compositor.height)
          throw new Error("リュミエール" + dir + "揺れ描画設定不正");
        lumiereCompositors[dir] = compositor;
      }

      if (document.body.classList.contains("scene-load-error")) return;
      if (gardenResumePublic) {
        const fresh = window.TarotGardenPublicContinue?.revalidate(window.TarotGardenContinueTransit, {
          search: location.search,
          storage: window.localStorage,
        });
        if (!fresh?.ok) throw new Error(fresh?.reason || "garden-public-revalidate-failed");
        const projected = window.TarotGardenPublicContinue.projectJourney(fresh, {
          journey: window.TarotJourney,
          storage: window.sessionStorage,
        });
        if (!projected?.ok) throw new Error(projected?.reason || "garden-public-project-failed");
        window.TarotGardenContinueTransit = fresh;
        if (window.__TAROT_PUBLIC_STAR_GATE__ === true &&
            window.TarotStarGateProgressAuthority?.rebind?.(fresh.progress) !== true) throw new Error("Star Gate Progress authority unavailable");
      }
      if (window.__TAROT_PUBLIC_STAR_GATE__ === true) {
        if (typeof window.TarotStarGatePublic?.prepareRestoration !== "function" ||
            typeof window.TarotStarGatePublic?.restoreCompleted !== "function") throw new Error("Star Gate observer unavailable");
        await window.TarotStarGatePublic.prepareRestoration();
      }
      ready = true;
      resize();
      reset();
      draw();

      if (start) {
        start.disabled = false;
      }
      note.textContent =
        gardenResumePublic
          ? "保存地点から星門庭園を再開"
          : params.get("from") === "landing"
            ? "PAD離着陸場から星門庭園へ到着"
            : "星門庭園の読み込み完了";

      // begin() applies the existing PAD spawn/companion handoff and draws
      // again. Keep that final frame behind the gate light, not the earlier reset.
      if (enteringGardenRuntime) {
        begin();
        document.body.classList.add("scene-rendered");
        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        if (document.body.classList.contains("scene-load-error")) return;
        clearTimeout(window.gardenArrivalTimeout);
      }
      document.body.classList.remove("scene-booting", "scene-load-error", "scene-rendered");
      document.body.classList.add("scene-ready");
    } catch (error) {
      window.__lastGardenBootError = error?.message || String(error);
      if (enteringGardenRuntime) window.failGardenArrival?.();
      running = false;
      ready = false;
      console.error(error);
      if (start) {
        start.disabled = true;
        const titleJp = start.querySelector?.(".title-screen__choice-jp");
        const titleEn = start.querySelector?.(".title-screen__choice-en");
        if (titleJp) {
          titleJp.textContent = "起動できません";
          if (titleEn) titleEn.textContent = "ERROR";
        } else {
          start.textContent = "起動できません";
        }
      }
      note.textContent = error.message;
      document.body.classList.remove("scene-booting", "scene-ready");
      document.body.classList.add("scene-load-error");
      const loadError = document.getElementById("load-error");
      if (loadError) {
        loadError.textContent = "読み込みに失敗しました。再読み込みしてください。";
        loadError.hidden = false;
      }
    }
  })();
})();
