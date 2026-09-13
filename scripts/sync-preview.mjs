// Publishable files only. Run with an existing checkout of the official site:
// node scripts/sync-preview.mjs ../shion-site preview-9
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';

const siteRoot = process.argv[2];
const version = process.argv[3];
if (!siteRoot || !/^preview-\d+$/.test(version || '')) throw new Error('Provide site checkout and preview-N version');
const out = path.resolve(siteRoot, 'tarot-breaker-game-preview');
const indexPath = path.join(out, 'index.html');
const sourceCollision = fs.readFileSync('assets/maps/star-country-gate-garden-collision.json');
const publishedCollision = fs.readFileSync(path.join(out, 'star-country-gate-garden-collision.json'));
if (!sourceCollision.equals(publishedCollision)) throw new Error('Collision JSON differs: review the user-authored data before syncing');
const hash = content => crypto.createHash('sha256').update(content).digest('hex');
const hashes = {};
for (const file of ['game.js', 'navigation.js', 'controls.js', 'game.css', 'dialogue.js', 'dialogue.css']) {
  const content = fs.readFileSync(file);
  fs.writeFileSync(path.join(out, file), content);
  hashes[file] = hash(content);
}
let html = fs.readFileSync(indexPath, 'utf8');
html = html.replace(/game\.css\?v=[^"\s]+/g, `game.css?v=${version}`);
if (/dialogue\.css\?v=/.test(html)) {
  html = html.replace(/dialogue\.css\?v=[^"\s]+/g, `dialogue.css?v=${version}`);
} else {
  html = html.replace(/(<link[^>]*href="\.\/game\.css[^>]*>)/,
    `$1\n    <link rel="stylesheet" href="./dialogue.css?v=${version}">`);
}
html = html.replace(/(<div id="guide"[^>]*>)[\s\S]*?(<\/div>)/,
  '$1行きたい場所をタップするとシオンが歩きます<br>左側をドラッグすると自由に移動できます$2');
html = html.replace(/\s*<script[^>]*src="\.\/(?:navigation|controls|dialogue)\.js[^>]*><\/script>/g, '');
html = html.replace(/<script[^>]*src="\.\/game\.js[^>]*><\/script>/,
  `<script src="./navigation.js?v=${version}" defer></script>\n` +
  `  <script src="./controls.js?v=${version}" defer></script>\n` +
  `  <script src="./dialogue.js?v=${version}" defer></script>\n` +
  `  <script src="./game.js?v=${version}" data-collision-url="./star-country-gate-garden-collision.json" ` +
  `data-sprite-base="https://raw.githubusercontent.com/reverse-shion/tarot-breaker-game/main/assets/sprites/shion/" ` +
  `data-shiopon-base="https://raw.githubusercontent.com/reverse-shion/tarot-breaker-game/main/assets/sprites/shiopon/" ` +
  `data-lumiere-base="https://raw.githubusercontent.com/reverse-shion/tarot-breaker-game/main/assets/sprites/lumiere/" defer></script>`);
fs.writeFileSync(indexPath, html);
fs.writeFileSync(path.join(out, 'preview-source.json'), JSON.stringify({
  version, repository: 'reverse-shion/tarot-breaker-game',
  commit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
  files: hashes, collisionSha256: hash(sourceCollision)
}, null, 2) + '\n');
console.log(`Synced ${version}; runtime files identical, collision and editor unchanged.`);
