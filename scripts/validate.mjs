import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const required = [
  'index.html',
  'game.css',
  'game.js',
  'assets/maps/star-country-gate-garden.webp',
  'assets/sprites/shion/shion_sprite_manifest.json',
  'assets/sprites/shion/shion_idle.png',
  'assets/sprites/shion/shion_walk_down.png',
  'assets/sprites/shion/shion_walk_up.png',
  'assets/sprites/shion/shion_walk_left.png',
  'assets/sprites/shion/shion_walk_right.png'
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

function pngSize(rel) {
  const b = fs.readFileSync(path.join(root, rel));
  if (b.length < 24 || b.toString('hex', 0, 8) !== '89504e470d0a1a0a') throw new Error(`Invalid PNG: ${rel}`);
  return { width: b.readUInt32BE(16), height: b.readUInt32BE(20) };
}
for (const rel of required.filter(x => x.endsWith('.png'))) {
  const { width, height } = pngSize(rel);
  if (width !== 1536 || height !== 512) throw new Error(`Unexpected sprite sheet size ${width}x${height}: ${rel}`);
}

const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
for (const ref of ['./game.css','./game.js','./assets/maps/star-country-gate-garden.webp']) {
  if (!html.includes(ref)) throw new Error(`index.html missing reference: ${ref}`);
}
const js = fs.readFileSync(path.join(root, 'game.js'), 'utf8');
for (const token of ['requestAnimationFrame','pointerdown','shion_walk_down.png','shion_walk_up.png','shion_walk_left.png','shion_walk_right.png']) {
  if (!js.includes(token)) throw new Error(`game.js missing expected behavior token: ${token}`);
}

console.log('TAROT BREAKER validation passed');
console.log('Required files:', required.length);
console.log('Sprite sheets: 1536x512, 4 frames each');
console.log('Manifest: 384x512 cells, baseline_y=480');
