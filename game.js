(() => {
  'use strict';

  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d', { alpha: true });
  const map = document.getElementById('map-layer');
  const start = document.getElementById('start');
  const startScreen = document.getElementById('start-screen');
  const note = document.getElementById('load-note');
  const guide = document.getElementById('guide');
  const joystick = document.getElementById('joystick');
  const knob = document.getElementById('joystick-knob');
  const resetButton = document.getElementById('reset');

  const REF = { w: 1448, h: 1086 };
  const SPAWN = { x: 724, y: 1015 };
  const SPEED = 155;
  const DPR_LIMIT = 2;
  let manifest;
  const FRAME = { w: 384, h: 512, baseline: 480, count: 4 };
  const DRAW_HEIGHT = 78;
  const CAMERA_MIN_ZOOM = 1.0;
  const CAMERA_MAX_ZOOM = 1.22;
  const CAMERA_BASE_OFFSET_Y = 58;
  const CAMERA_LOOK_AHEAD_Y = 28;
  const DEPTH_DEBUG = new URLSearchParams(location.search).has('depthDebug');

  const files = {
    idle: './assets/sprites/shion/shion_idle.png',
    down: './assets/sprites/shion/shion_walk_down.png',
    up: './assets/sprites/shion/shion_walk_up.png',
    left: './assets/sprites/shion/shion_walk_left.png',
    right: './assets/sprites/shion/shion_walk_right.png'
  };

  const walkAreas = [
    { type: 'poly', points: [[590,1086],[858,1086],[885,955],[905,825],[910,730],[885,655],[835,605],[615,605],[570,660],[565,780],[575,925]] },
    { type: 'ellipse', cx: 724, cy: 535, rx: 300, ry: 174 },
    { type: 'poly', points: [[575,500],[875,500],[885,420],[870,340],[860,245],[850,190],[598,190],[588,250],[575,345],[565,430]] }
  ];

  const blockers = [
    { id: 'fountain', type: 'ellipse', cx: 724, cy: 548, rx: 136, ry: 88 },
    { id: 'left-pillar', type: 'ellipse', cx: 575, cy: 704, rx: 34, ry: 66 },
    { id: 'right-pillar', type: 'ellipse', cx: 873, cy: 704, rx: 34, ry: 66 }
  ];

  const foregroundOccluders = [
    {
      id: 'fountain-front',
      depthY: 625,
      box: { x: 555, y: 515, w: 338, h: 165 },
      shape: { type: 'poly', points: [[565,532],[883,532],[890,580],[868,628],[825,660],[623,660],[580,628],[558,580]] }
    },
    {
      id: 'left-garden-front',
      depthY: 835,
      box: { x: 475, y: 590, w: 165, h: 310 },
      shape: { type: 'poly', points: [[505,600],[625,590],[617,675],[603,755],[590,840],[550,885],[505,895],[482,835],[487,720]] }
    },
    {
      id: 'right-garden-front',
      depthY: 835,
      box: { x: 808, y: 590, w: 165, h: 310 },
      shape: { type: 'poly', points: [[823,590],[943,600],[961,720],[966,835],[943,895],[898,885],[858,840],[845,755],[831,675]] }
    }
  ];

  const images = {};
  const keys = new Set();
  const stick = { active: false, id: null, ox: 0, oy: 0, x: 0, y: 0 };
  const player = { x: SPAWN.x, y: SPAWN.y, dir: 'up', moving: false, frame: 0 };
  const camera = { x: SPAWN.x, y: SPAWN.y - CAMERA_BASE_OFFSET_Y, zoom: 1 };

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

  function pointInPoly(x, y, points) {
    let inside = false;
    for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
      const [xi, yi] = points[i];
      const [xj, yj] = points[j];
      const hit = ((yi > y) !== (yj > y)) && x < (xj - xi) * (y - yi) / ((yj - yi) || 0.000001) + xi;
      if (hit) inside = !inside;
    }
    return inside;
  }

  function inArea(x, y, area) {
    if (area.type === 'ellipse') {
      return ((x - area.cx) / area.rx) ** 2 + ((y - area.cy) / area.ry) ** 2 <= 1;
    }
    return pointInPoly(x, y, area.points);
  }

  function canStand(x, y) {
    const rx = x / scale.x;
    const ry = y / scale.y;
    const samples = [[0,0],[-9,0],[9,0],[0,-4],[0,5],[-7,4],[7,4]];
    const walkPoint = (px, py) => px > 4 && py > 4 && px < REF.w - 4 && py < REF.h - 4 && walkAreas.some(a => inArea(px, py, a)) && !blockers.some(a => inArea(px, py, a));
    return samples.every(([sx, sy]) => walkPoint(rx + sx, ry + sy));
  }

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('画像を読み込めません: ' + src.split('/').pop()));
      image.src = src;
    });
  }

  function waitForMap() {
    return new Promise((resolve, reject) => {
      if (map.complete && map.naturalWidth) return resolve(map);
      map.addEventListener('load', () => resolve(map), { once: true });
      map.addEventListener('error', () => reject(new Error('星門庭園マップを読み込めません')), { once: true });
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
    camera.zoom = clamp(Math.min(cssWidth / 620, cssHeight / 560), CAMERA_MIN_ZOOM, CAMERA_MAX_ZOOM);
  }

  function reset() {
    player.x = SPAWN.x * scale.x;
    player.y = SPAWN.y * scale.y;
    player.dir = 'up';
    player.moving = false;
    player.frame = 0;
    camera.x = player.x;
    camera.y = player.y - CAMERA_BASE_OFFSET_Y * scale.y;
  }

  function inputVector() {
    let x = 0;
    let y = 0;
    if (keys.has('ArrowLeft') || keys.has('a')) x -= 1;
    if (keys.has('ArrowRight') || keys.has('d')) x += 1;
    if (keys.has('ArrowUp') || keys.has('w')) y -= 1;
    if (keys.has('ArrowDown') || keys.has('s')) y += 1;
    if (stick.active) { x += stick.x; y += stick.y; }
    const len = Math.hypot(x, y);
    return len > 1 ? { x: x / len, y: y / len } : { x, y };
  }

  function updatePlayer(dt) {
    const v = inputVector();
    player.moving = Math.hypot(v.x, v.y) > 0.08;
    if (!player.moving) {
      player.frame = 0;
      anim = 0;
      return;
    }

    player.dir = Math.abs(v.x) > Math.abs(v.y)
      ? (v.x < 0 ? 'left' : 'right')
      : (v.y < 0 ? 'up' : 'down');

    const speed = SPEED * ((scale.x + scale.y) / 2);
    const nx = player.x + v.x * speed * dt;
    const ny = player.y + v.y * speed * dt;

    if (canStand(nx, ny)) {
      player.x = nx;
      player.y = ny;
    } else {
      if (canStand(nx, player.y)) player.x = nx;
      if (canStand(player.x, ny)) player.y = ny;
    }

    anim += dt;
    if (anim >= 0.12) {
      anim = 0;
      player.frame = (player.frame + 1) % FRAME.count;
    }
  }

  function cameraOffsetY() {
    let offset = CAMERA_BASE_OFFSET_Y;
    if (player.moving && player.dir === 'up') offset += CAMERA_LOOK_AHEAD_Y;
    if (player.moving && player.dir === 'down') offset -= CAMERA_LOOK_AHEAD_Y;
    return offset * scale.y;
  }

  function updateCamera(dt) {
    const viewW = cssWidth / camera.zoom;
    const viewH = cssHeight / camera.zoom;
    const halfW = viewW / 2;
    const halfH = viewH / 2;
    const targetX = clamp(player.x, halfW, Math.max(halfW, world.w - halfW));
    const targetY = clamp(player.y - cameraOffsetY(), halfH, Math.max(halfH, world.h - halfH));
    const ease = 1 - Math.exp(-6.5 * dt);
    camera.x += (targetX - camera.x) * ease;
    camera.y += (targetY - camera.y) * ease;
  }

  function viewportOrigin() {
    const viewW = cssWidth / camera.zoom;
    const viewH = cssHeight / camera.zoom;
    return {
      x: clamp(camera.x - viewW / 2, 0, Math.max(0, world.w - viewW)),
      y: clamp(camera.y - viewH / 2, 0, Math.max(0, world.h - viewH))
    };
  }

  function spriteFrame() {
    const idleIndex = { down: 0, up: 1, left: 2, right: 3 }[player.dir];
    return {
      image: player.moving ? images[player.dir] : images.idle,
      sourceX: (player.moving ? player.frame : idleIndex) * FRAME.w
    };
  }

  function drawSpritePass(image, sourceX, dx, dy, drawW, drawH, shadowColor, shadowBlur) {
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.shadowColor = shadowColor;
    ctx.shadowBlur = shadowBlur / camera.zoom;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
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

    drawSpritePass(image, sourceX, dx, dy, drawW, drawH, 'rgba(255,236,190,.22)', 5.0);
    drawSpritePass(image, sourceX, dx, dy, drawW, drawH, 'rgba(6,9,28,.86)', 2.0);

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
    gradient.addColorStop(0, 'rgba(5,7,20,.46)');
    gradient.addColorStop(0.62, 'rgba(5,7,20,.28)');
    gradient.addColorStop(1, 'rgba(5,7,20,0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(0, 0, 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function traceRefShape(shape) {
    ctx.beginPath();
    if (shape.type === 'ellipse') {
      ctx.ellipse(shape.cx * scale.x, shape.cy * scale.y, shape.rx * scale.x, shape.ry * scale.y, 0, 0, Math.PI * 2);
      return;
    }
    const points = shape.points;
    ctx.moveTo(points[0][0] * scale.x, points[0][1] * scale.y);
    for (let i = 1; i < points.length; i++) ctx.lineTo(points[i][0] * scale.x, points[i][1] * scale.y);
    ctx.closePath();
  }

  function drawMapRegion(box) {
    const sourceScaleX = map.naturalWidth / REF.w;
    const sourceScaleY = map.naturalHeight / REF.h;
    ctx.drawImage(
      map,
      box.x * sourceScaleX,
      box.y * sourceScaleY,
      box.w * sourceScaleX,
      box.h * sourceScaleY,
      box.x * scale.x,
      box.y * scale.y,
      box.w * scale.x,
      box.h * scale.y
    );
  }

  function drawForegroundOccluders() {
    const playerRefY = player.y / scale.y;
    for (const occluder of foregroundOccluders) {
      if (playerRefY >= occluder.depthY) continue;
      ctx.save();
      traceRefShape(occluder.shape);
      ctx.clip();
      drawMapRegion(occluder.box);
      ctx.restore();
    }
  }

  function drawDepthDebug() {
    if (!DEPTH_DEBUG) return;
    ctx.save();
    ctx.lineWidth = 2 / camera.zoom;
    ctx.strokeStyle = 'rgba(255,80,80,.9)';
    for (const blocker of blockers) {
      traceRefShape(blocker);
      ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(80,220,255,.9)';
    for (const occluder of foregroundOccluders) {
      traceRefShape(occluder.shape);
      ctx.stroke();
    }
    ctx.restore();
  }

  function draw() {
    const origin = viewportOrigin();
    map.style.width = world.w + 'px';
    map.style.height = world.h + 'px';
    map.style.transform = `translate3d(${-origin.x * camera.zoom}px,${-origin.y * camera.zoom}px,0) scale(${camera.zoom})`;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssWidth, cssHeight);
    ctx.save();
    ctx.scale(camera.zoom, camera.zoom);
    ctx.translate(-origin.x, -origin.y);
    drawGroundShadow();
    drawPlayer();
    drawForegroundOccluders();
    drawDepthDebug();
    ctx.restore();
  }

  function loop(now) {
    if (!running) return;
    const dt = Math.min(last ? (now - last) / 1000 : 0, 0.05);
    last = now;
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
    setTimeout(() => { guide.hidden = true; }, 6500);
  }

  function pointerDown(event) {
    if (!running) return;
    const rect = canvas.getBoundingClientRect();
    const px = event.clientX - rect.left;
    const py = event.clientY - rect.top;
    if (px > cssWidth * 0.68) return;
    stick.active = true;
    stick.id = event.pointerId;
    stick.ox = px;
    stick.oy = py;
    stick.x = 0;
    stick.y = 0;
    joystick.hidden = false;
    joystick.style.left = px + 'px';
    joystick.style.top = py + 'px';
    canvas.setPointerCapture?.(event.pointerId);
    guide.hidden = true;
    event.preventDefault();
  }

  function pointerMove(event) {
    if (!stick.active || event.pointerId !== stick.id) return;
    const rect = canvas.getBoundingClientRect();
    const px = event.clientX - rect.left;
    const py = event.clientY - rect.top;
    const max = 38;
    let dx = px - stick.ox;
    let dy = py - stick.oy;
    const len = Math.hypot(dx, dy);
    if (len > max) { dx = dx / len * max; dy = dy / len * max; }
    stick.x = dx / max;
    stick.y = dy / max;
    knob.style.transform = `translate(${dx}px,${dy}px)`;
    event.preventDefault();
  }

  function pointerEnd(event) {
    if (!stick.active || event.pointerId !== stick.id) return;
    stick.active = false;
    stick.id = null;
    stick.x = 0;
    stick.y = 0;
    knob.style.transform = 'translate(0,0)';
    joystick.hidden = true;
  }

  start.addEventListener('click', begin);
  resetButton.addEventListener('click', reset);
  canvas.addEventListener('pointerdown', pointerDown, { passive: false });
  canvas.addEventListener('pointermove', pointerMove, { passive: false });
  canvas.addEventListener('pointerup', pointerEnd);
  canvas.addEventListener('pointercancel', pointerEnd);
  window.addEventListener('resize', () => { resize(); if (ready) draw(); });
  window.addEventListener('keydown', event => {
    const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
    if (['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','w','a','s','d'].includes(key)) {
      keys.add(key);
      guide.hidden = true;
      event.preventDefault();
    }
  }, { passive: false });
  window.addEventListener('keyup', event => keys.delete(event.key.length === 1 ? event.key.toLowerCase() : event.key));

  (async () => {
    try {
      note.textContent = '星門庭園2.5Dレイヤーを読み込んでいます…';
      const manifestResponse = await fetch('./assets/sprites/shion/shion_sprite_manifest.json');
      if (!manifestResponse.ok) throw new Error('スプライト設定を読み込めません');
      manifest = await manifestResponse.json();
      if (manifest.cell_size.width !== FRAME.w || manifest.cell_size.height !== FRAME.h || manifest.baseline_y !== FRAME.baseline) {
        throw new Error('スプライト設定が実装仕様と一致しません');
      }

      const loaded = await Promise.all([
        waitForMap(),
        ...Object.entries(files).map(async ([key, src]) => { images[key] = await loadImage(src); })
      ]);
      const loadedMap = loaded[0];
      world = { w: loadedMap.naturalWidth, h: loadedMap.naturalHeight };
      scale = { x: world.w / REF.w, y: world.h / REF.h };

      for (const dir of ['down','up','left','right']) {
        if (images[dir].naturalWidth !== FRAME.w * 4 || images[dir].naturalHeight !== FRAME.h) {
          throw new Error(dir + '歩行画像サイズ不正');
        }
      }
      if (images.idle.naturalWidth !== FRAME.w * 4 || images.idle.naturalHeight !== FRAME.h) {
        throw new Error('待機画像サイズ不正');
      }

      ready = true;
      resize();
      reset();
      draw();
      start.disabled = false;
      start.textContent = '星の国へ';
      note.textContent = `2.5D Phase 1 / 前景遮蔽＋精密当たり判定 / ${world.w}×${world.h}`;
    } catch (error) {
      console.error(error);
      start.disabled = true;
      start.textContent = '起動できません';
      note.textContent = error.message;
    }
  })();
})();