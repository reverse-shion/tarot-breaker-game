const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d', { alpha: false });
const startScreen = document.getElementById('start-screen');
const startButton = document.getElementById('start');
const loadNote = document.getElementById('load-note');
const guide = document.getElementById('guide');
const joystick = document.getElementById('joystick');
const knob = document.getElementById('joystick-knob');
const resetButton = document.getElementById('reset');

const MAP_URL = './assets/maps/star-country-gate-garden.webp';
const PLAYER_WORLD_HEIGHT = 52;
const PLAYER_WORLD_WIDTH = 33;
const SPEED = 155;
const DPR_LIMIT = 2;
const DEBUG = new URLSearchParams(location.search).get('debug') === '1';

const map = new Image();
let world = { width: 1448, height: 1086 };
let spawn = { x: 724, y: 1015 };
let loaded = false;
let running = false;
let cssWidth = 1;
let cssHeight = 1;
let dpr = 1;
let last = 0;

const player = { x: spawn.x, y: spawn.y, dir: 'up', moving: false };
const camera = { x: spawn.x, y: spawn.y, zoom: 1 };
const keys = new Set();
const stick = { active: false, id: null, ox: 0, oy: 0, x: 0, y: 0 };

// Scale Test only. Final collision will be replaced with a walkability mask.
const walkAreas = [
  { type: 'poly', points: [[590,1086],[858,1086],[885,955],[905,825],[910,730],[885,655],[835,605],[615,605],[570,660],[565,780],[575,925]] },
  { type: 'ellipse', cx: 724, cy: 535, rx: 300, ry: 174 },
  { type: 'poly', points: [[575,500],[875,500],[885,420],[870,340],[860,245],[850,190],[598,190],[588,250],[575,345],[565,430]] }
];
const blockers = [
  { type: 'ellipse', cx: 724, cy: 545, rx: 128, ry: 84 }
];

let debugHud = null;
if (DEBUG) {
  debugHud = document.createElement('div');
  debugHud.style.cssText = 'position:absolute;left:10px;top:10px;z-index:20;padding:7px 9px;border-radius:8px;background:rgba(5,8,24,.76);color:#fff;font:11px/1.45 ui-monospace,monospace;pointer-events:none;white-space:pre;';
  document.getElementById('game-shell').appendChild(debugHud);
}

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

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

function walkPoint(x, y) {
  if (x < 4 || y < 4 || x > world.width - 4 || y > world.height - 4) return false;
  return walkAreas.some(a => inArea(x, y, a)) && !blockers.some(a => inArea(x, y, a));
}

// Player coordinate = center of the feet, not the center of the artwork.
function canStand(x, y) {
  return walkPoint(x, y) && walkPoint(x - 6, y) && walkPoint(x + 6, y) && walkPoint(x, y + 3);
}

function resize() {
  const rect = canvas.getBoundingClientRect();
  cssWidth = Math.max(1, rect.width);
  cssHeight = Math.max(1, rect.height);
  dpr = Math.min(window.devicePixelRatio || 1, DPR_LIMIT);
  canvas.width = Math.round(cssWidth * dpr);
  canvas.height = Math.round(cssHeight * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  // Keep Shion readable instead of fitting the full map into the screen.
  const scaleByViewport = Math.min(cssWidth / 620, cssHeight / 560);
  camera.zoom = clamp(scaleByViewport, 0.88, 1.22);
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
  if (!player.moving) return;

  player.dir = Math.abs(v.x) > Math.abs(v.y)
    ? (v.x < 0 ? 'left' : 'right')
    : (v.y < 0 ? 'up' : 'down');

  const nx = player.x + v.x * SPEED * dt;
  const ny = player.y + v.y * SPEED * dt;

  if (canStand(nx, ny)) {
    player.x = nx;
    player.y = ny;
  } else {
    if (canStand(nx, player.y)) player.x = nx;
    if (canStand(player.x, ny)) player.y = ny;
  }
}

function updateCamera(dt) {
  const viewW = cssWidth / camera.zoom;
  const viewH = cssHeight / camera.zoom;
  const halfW = viewW / 2;
  const halfH = viewH / 2;
  const targetX = clamp(player.x, halfW, world.width - halfW);
  const targetY = clamp(player.y - 42, halfH, world.height - halfH);
  const ease = 1 - Math.exp(-7 * dt);
  camera.x += (targetX - camera.x) * ease;
  camera.y += (targetY - camera.y) * ease;
}

function drawProxyShion(x, y) {
  // Temporary 52px proxy. It exists only to lock world/camera scale before final sprite animation.
  const h = PLAYER_WORLD_HEIGHT;
  const w = PLAYER_WORLD_WIDTH;

  ctx.fillStyle = 'rgba(10,9,28,.25)';
  ctx.beginPath();
  ctx.ellipse(x, y + 1, 10, 3.5, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#d8ad63';
  ctx.beginPath();
  ctx.arc(x, y - h + 11, 8.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#f5efe3';
  ctx.strokeStyle = '#9b7b45';
  ctx.lineWidth = 1.25;
  ctx.beginPath();
  ctx.moveTo(x - 8, y - h + 18);
  ctx.lineTo(x + 8, y - h + 18);
  ctx.lineTo(x + w * .36, y - 8);
  ctx.lineTo(x - w * .36, y - 8);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#171c3d';
  ctx.fillRect(x - 6, y - 14, 4, 14);
  ctx.fillRect(x + 2, y - 14, 4, 14);
}

function drawArea(area, fill, stroke) {
  ctx.beginPath();
  if (area.type === 'ellipse') {
    ctx.ellipse(area.cx, area.cy, area.rx, area.ry, 0, 0, Math.PI * 2);
  } else {
    area.points.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
    ctx.closePath();
  }
  ctx.fillStyle = fill;
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 2 / camera.zoom;
  ctx.fill();
  ctx.stroke();
}

function draw() {
  const viewW = cssWidth / camera.zoom;
  const viewH = cssHeight / camera.zoom;
  const sx = clamp(camera.x - viewW / 2, 0, Math.max(0, world.width - viewW));
  const sy = clamp(camera.y - viewH / 2, 0, Math.max(0, world.height - viewH));

  ctx.save();
  ctx.scale(camera.zoom, camera.zoom);
  ctx.translate(-sx, -sy);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(map, 0, 0, world.width, world.height);

  if (DEBUG) {
    walkAreas.forEach(a => drawArea(a, 'rgba(80,255,160,.10)', 'rgba(80,255,160,.72)'));
    blockers.forEach(a => drawArea(a, 'rgba(255,70,90,.18)', 'rgba(255,70,90,.9)'));
  }

  drawProxyShion(player.x, player.y);

  if (DEBUG) {
    ctx.fillStyle = '#ffda69';
    ctx.beginPath();
    ctx.arc(player.x, player.y, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  if (debugHud) {
    debugHud.textContent = `SCALE TEST FOUNDATION\nmap ${world.width}x${world.height} WebP\nShion proxy ${PLAYER_WORLD_HEIGHT}px\nzoom ${camera.zoom.toFixed(2)}\npos ${player.x.toFixed(0)}, ${player.y.toFixed(0)}`;
  }
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

function reset() {
  player.x = spawn.x;
  player.y = spawn.y;
  player.dir = 'up';
  player.moving = false;
  camera.x = spawn.x;
  camera.y = spawn.y - 42;
}

function startGame(event) {
  event?.preventDefault();
  if (!loaded || running) return;
  running = true;
  startScreen.hidden = true;
  guide.hidden = false;
  resetButton.hidden = false;
  resize();
  reset();
  last = performance.now();
  draw();
  requestAnimationFrame(loop);
  setTimeout(() => guide.classList.add('is-gone'), 6500);
}

function pointerDown(e) {
  if (!running) return;
  if (e.pointerType === 'mouse' && e.button !== 0) return;
  const rect = canvas.getBoundingClientRect();
  const px = e.clientX - rect.left;
  const py = e.clientY - rect.top;
  if (px > cssWidth * 0.68) return;
  stick.active = true;
  stick.id = e.pointerId;
  stick.ox = px;
  stick.oy = py;
  stick.x = 0;
  stick.y = 0;
  joystick.hidden = false;
  joystick.style.left = `${px}px`;
  joystick.style.top = `${py}px`;
  canvas.setPointerCapture?.(e.pointerId);
  guide.classList.add('is-gone');
  e.preventDefault();
}

function pointerMove(e) {
  if (!stick.active || e.pointerId !== stick.id) return;
  const rect = canvas.getBoundingClientRect();
  const px = e.clientX - rect.left;
  const py = e.clientY - rect.top;
  const max = 38;
  let dx = px - stick.ox;
  let dy = py - stick.oy;
  const len = Math.hypot(dx, dy);
  if (len > max) { dx = dx / len * max; dy = dy / len * max; }
  stick.x = dx / max;
  stick.y = dy / max;
  knob.style.transform = `translate(${dx}px,${dy}px)`;
  e.preventDefault();
}

function pointerEnd(e) {
  if (!stick.active || e.pointerId !== stick.id) return;
  stick.active = false;
  stick.id = null;
  stick.x = 0;
  stick.y = 0;
  knob.style.transform = 'translate(0,0)';
  joystick.hidden = true;
}

startButton.addEventListener('click', startGame);
resetButton.addEventListener('click', reset);
canvas.addEventListener('pointerdown', pointerDown, { passive: false });
canvas.addEventListener('pointermove', pointerMove, { passive: false });
canvas.addEventListener('pointerup', pointerEnd);
canvas.addEventListener('pointercancel', pointerEnd);
window.addEventListener('resize', () => { resize(); if (loaded) draw(); });
window.addEventListener('keydown', e => {
  const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  if (['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','w','a','s','d'].includes(key)) {
    keys.add(key);
    guide.classList.add('is-gone');
    e.preventDefault();
  }
}, { passive: false });
window.addEventListener('keyup', e => keys.delete(e.key.length === 1 ? e.key.toLowerCase() : e.key));

map.onload = () => {
  world = { width: map.naturalWidth, height: map.naturalHeight };
  spawn = { x: Math.round(world.width * 0.5), y: Math.round(world.height * 0.935) };
  player.x = spawn.x;
  player.y = spawn.y;
  camera.x = spawn.x;
  camera.y = spawn.y - 42;
  loaded = true;
  resize();
  draw();
  startButton.disabled = false;
  startButton.textContent = '星の国へ';
  loadNote.textContent = `${world.width}×${world.height} WebP / Shion proxy 52px`;
};

map.onerror = () => {
  startButton.disabled = true;
  startButton.textContent = '起動できません';
  loadNote.textContent = 'マップ画像の読み込みに失敗しました';
};

map.src = MAP_URL;
