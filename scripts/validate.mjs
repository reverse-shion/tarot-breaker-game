import fs from 'node:fs';
import { createHash } from 'node:crypto';
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
  'assets/sprites/lumiere/lumiere_hover-back.webp',
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
if (lumiereManifest.format !== 'RGBA WebP (lossless)' || lumiereManifest.layout !== 'single_pose' ||
    lumiereManifest.phase !== 1 || lumiereManifest.movement_type !== 'hover')
  throw new Error('Lumiere must use four fixed WebP single poses');
const expectedLumiere = {
  down: ['lumiere_idle.webp', 60, 1168, 620],
  up: ['lumiere_hover-back.webp', 74, 1127, 628],
  left: ['lumiere_hover_left.webp', 97, 1144, 480],
  right: ['lumiere_hover_right.webp', 58, 1158, 785],
};
const render = lumiereManifest.render;
if (render?.reference_body_height !== 420 || render.reference_cell_height !== 512 ||
    render.draw_cell_height !== 78 || render.bottom_gap !== 2.7 || render.bob_amplitude !== 2.4 || render.bob_period !== 5.2)
  throw new Error('Unexpected Lumiere scale/bob contract');
for (const [dir, [filename, top, baseline, center]] of Object.entries(expectedLumiere)) {
  const pose = lumiereManifest.poses?.[dir];
  if (lumiereManifest.files?.[dir] !== filename || pose?.actual_direction !== dir ||
      pose.body_top !== top || pose.baseline_y !== baseline || pose.center_x !== center)
    throw new Error(`Unexpected Lumiere direction/anchor: ${dir}`);
  const b = fs.readFileSync(path.join(root, 'assets/sprites/lumiere', filename));
  if (b.toString('ascii', 0, 4) !== 'RIFF' || b.toString('ascii', 8, 12) !== 'WEBP' || b.readUInt32LE(4) + 8 !== b.length)
    throw new Error(`Invalid WebP container: ${filename}`);
  let lossless;
  for (let offset=12; offset+8<=b.length;) {
    const type=b.toString('ascii',offset,offset+4), size=b.readUInt32LE(offset+4), end=offset+8+size;
    if (end>b.length) throw new Error(`Truncated WebP chunk: ${filename}`);
    if (type==='VP8L') {
      if (size<5 || b[offset+8]!==0x2f) throw new Error(`Invalid lossless WebP: ${filename}`);
      const bits=b.readUInt32LE(offset+9);
      lossless={width:1+(bits & 0x3fff),height:1+((bits>>>14)&0x3fff),alpha:!!(bits&0x10000000)};
    }
    offset=end+(size%2);
  }
  if (!lossless?.alpha || lossless.width!==pose.width || lossless.height!==pose.height)
    throw new Error(`Lumiere lossless alpha/dimensions mismatch: ${filename}`);
  if (createHash('sha256').update(b).digest('hex')!==pose.sha256)
    throw new Error(`Lumiere provenance SHA mismatch: ${filename}`);
}

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
for (const token of ['requestAnimationFrame','pointerdown','shion_walk_down.png','shion_walk_up.png','shion_walk_left.png','shion_walk_right.png','lumiere_idle.webp','LUMIERE_COLLISION_DISTANCE']) {
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
console.log('Lumiere: four fixed lossless RGBA WebP poses; body reference height 63.984375px');
console.log('Manifest: 384x512 cells, baseline_y=480');
