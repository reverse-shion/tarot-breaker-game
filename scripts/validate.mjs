import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const required = [
  'index.html',
  'game.css',
  'sky-atmosphere.css',
  'game.js',
  'scene-effects.js',
  'scene-layout.js',
  'navigation.js',
  'controls.js',
  'assets/maps/star-country-gate-garden-collision.json',
  'assets/maps/star-country-farthest-sky-background.webp',
  'assets/maps/star-country-world-islands.webp',
  'assets/maps/star-country-gate-garden-star-sky.webp',
  'assets/maps/star-country-world-clouds.webp',
  'assets/maps/star-country-gate-garden-waterfall.webp',
  'assets/maps/star-country-gate-garden-ground.webp',
  'assets/maps/star-country-gate-garden-foreground.webp',
  'assets/maps/star-country-gate-garden-fountain-base.webp',
  'assets/maps/star-country-gate-garden-fountain-crystal.webp',
  'assets/maps/star-country-gate-garden-fountain-crystal-glow.webp',
  'assets/maps/star-country-gate-garden-fountain-water.webp',
  'assets/maps/star-country-gate-garden-fountain-sparkle.webp',
  'assets/maps/star-country-gate-garden-star-gate-base.webp',
  'assets/maps/star-country-gate-garden-star-gate-inner-light.webp',
  'assets/maps/star-country-gate-garden-star-gate-particle.webp',
  'assets/maps/star-country-gate-garden-star-gate-event-fx.webp',
  'assets/sprites/shion/shion_sprite_manifest.json',
  'assets/sprites/shion/shion_idle.png',
  'assets/sprites/shion/shion_walk_down.png',
  'assets/sprites/shion/shion_walk_up.png',
  'assets/sprites/shion/shion_walk_left.png',
  'assets/sprites/shion/shion_walk_right.png',
  'assets/sprites/shiopon/shiopon_sprite_manifest.json',
  'assets/sprites/shiopon/shiopon_idle.png',
  'assets/sprites/shiopon/shiopon_walk_down.png',
  'assets/sprites/shiopon/shiopon_walk_up.png',
  'assets/sprites/shiopon/shiopon_walk_left.png',
  'assets/sprites/shiopon/shiopon_walk_right.png',
  'assets/sprites/lumiere/lumiere_sprite_manifest.json',
  'assets/sprites/lumiere/lumiere_idle.webp',
  'assets/sprites/lumiere/lumiere_hover_down.webp',
  'assets/sprites/lumiere/lumiere_hover_up.webp',
  'assets/sprites/lumiere/lumiere_hover_left.webp',
  'assets/sprites/lumiere/lumiere_hover_right.webp'
];
for (const rel of required) {
  if (!fs.existsSync(path.join(root, rel))) throw new Error(`Missing required file: ${rel}`);
}

const manifest = JSON.parse(fs.readFileSync(path.join(root, 'assets/sprites/shion/shion_sprite_manifest.json'), 'utf8'));
if (manifest.cell_size?.width !== 384 || manifest.cell_size?.height !== 512) throw new Error('Unexpected sprite cell size');
if (manifest.baseline_y !== 480) throw new Error('Unexpected baseline_y');
for (const key of ['idle','walk_down','walk_up','walk_left','walk_right']) {
  if (manifest.frame_count?.[key] !== 4) throw new Error(`Unexpected frame count: ${key}`);
}
const lumiereManifest = JSON.parse(fs.readFileSync(path.join(root, 'assets/sprites/lumiere/lumiere_sprite_manifest.json'), 'utf8'));
for (const key of ['idle','hover_down','hover_up','hover_left','hover_right']) {
  if (lumiereManifest.frame_count?.[key] !== 1) throw new Error(`Unexpected Lumiere frame count: ${key}`);
}
if (lumiereManifest.movement_type !== 'hover') throw new Error('Lumiere must use hover movement');

function pngSize(rel) {
  const b = fs.readFileSync(path.join(root, rel));
  if (b.length < 24 || b.toString('hex', 0, 8) !== '89504e470d0a1a0a') throw new Error(`Invalid PNG: ${rel}`);
  return { width: b.readUInt32BE(16), height: b.readUInt32BE(20) };
}
const standardSheets = required.filter(rel =>
  rel.endsWith('.png') &&
  (rel.includes('/shion/') || rel.includes('/shiopon/'))
);
for (const rel of standardSheets) {
  const { width, height } = pngSize(rel);
  if (width !== 1536 || height !== 512) throw new Error(`Unexpected sprite sheet size ${width}x${height}: ${rel}`);
}
// The final assets are complete lossless WebP poses, not sprite sheets.
function webpSize(rel) {
  const b = fs.readFileSync(path.join(root, rel));
  if (b.toString('ascii', 0, 4) !== 'RIFF' || b.toString('ascii', 8, 12) !== 'WEBP')
    throw new Error(`Invalid WebP: ${rel}`);
  for (let offset = 12; offset + 8 <= b.length;) {
    const kind = b.toString('ascii', offset, offset + 4);
    const length = b.readUInt32LE(offset + 4);
    const start = offset + 8;
    if (start + length > b.length) throw new Error(`Truncated WebP: ${rel}`);
    if (kind === 'VP8L' && length >= 5 && b[start] === 0x2f) {
      const bits = b.readUInt32LE(start + 1);
      return { width: (bits & 0x3fff) + 1, height: ((bits >>> 14) & 0x3fff) + 1 };
    }
    offset = start + length + (length % 2);
  }
  throw new Error(`Expected lossless WebP pose: ${rel}`);
}
if (lumiereManifest.layout !== 'single_pose') throw new Error('Expected single-pose Lumiere artwork');
for (const key of ['idle','hover_down','hover_up','hover_left','hover_right']) {
  const name = `lumiere_${key}.webp`;
  if (lumiereManifest.files[key] !== name) throw new Error(`Unexpected Lumiere filename: ${key}`);
  const size = webpSize(`assets/sprites/lumiere/${name}`);
  const pose = lumiereManifest.poses[key];
  if (pose?.width !== size.width || pose?.height !== size.height ||
      !Number.isFinite(pose.body_top) || !Number.isFinite(pose.baseline_y) ||
      !Number.isFinite(pose.center_x) || pose.body_top < 0 ||
      pose.baseline_y <= pose.body_top || pose.baseline_y > pose.height ||
      pose.center_x < 0 || pose.center_x > pose.width)
    throw new Error(`Invalid Lumiere body landmarks/dimensions: ${key}`);
}

const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
for (const ref of [
  './game.css',
  './sky-atmosphere.css',
  './game.js',
  './scene-effects.js',
  './assets/maps/star-country-farthest-sky-background.webp',
  './assets/maps/star-country-world-islands.webp',
  './assets/maps/star-country-gate-garden-star-sky.webp',
  './assets/maps/star-country-world-clouds.webp'
]) {
  if (!html.includes(ref)) throw new Error(`index.html missing reference: ${ref}`);
}
const js = fs.readFileSync(path.join(root, 'game.js'), 'utf8');
for (const token of ['requestAnimationFrame','pointerdown','shion_walk_down.png','shion_walk_up.png','shion_walk_left.png','shion_walk_right.png','lumiere_hover_down.webp','LUMIERE_COLLISION_DISTANCE']) {
  if (!js.includes(token)) throw new Error(`game.js missing expected behavior token: ${token}`);
}
const sceneJs = fs.readFileSync(path.join(root, 'scene-effects.js'), 'utf8');
for (const token of ['TarotSceneEffects','tarot-breaker:gate-state','data-scene-world','data-scene-object','drawMaskedActor','syncCamera','ready']) {
  if (!sceneJs.includes(token)) throw new Error(`scene-effects.js missing expected token: ${token}`);
}

console.log('TAROT BREAKER validation passed');
console.log('Required files:', required.length);
console.log('Dynamic Star Gate Garden assets: static far sky + celestial overlay + repeating clouds');
console.log('Shion / Shiopon sheets: 1536x512, 4 frames each');
console.log('Lumiere: five full lossless WebP poses, per-pose body landmarks');
console.log('Manifest: 384x512 cells, baseline_y=480');
