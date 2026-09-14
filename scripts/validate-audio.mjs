import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const required = [
  'audio.js',
  'audio.css',
  'assets/audio/bgm/hoshi-no-kioku_toki-no-inori.mp3',
];

for (const rel of required) {
  if (!fs.existsSync(path.join(root, rel))) {
    throw new Error(`Missing BGM file: ${rel}`);
  }
}

const bgmPath = path.join(
  root,
  'assets/audio/bgm/hoshi-no-kioku_toki-no-inori.mp3',
);
if (fs.statSync(bgmPath).size < 1_000_000) {
  throw new Error('BGM asset is unexpectedly small');
}

const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
for (const ref of ['./audio.css', './audio.js']) {
  if (!html.includes(ref)) throw new Error(`index.html missing reference: ${ref}`);
}
if (!html.includes('id="audio-toggle"')) {
  throw new Error('index.html missing BGM toggle');
}
if (html.indexOf('./audio.js') > html.indexOf('./game.js')) {
  throw new Error('audio.js must load before game.js');
}

const audioJs = fs.readFileSync(path.join(root, 'audio.js'), 'utf8');
for (const token of [
  'hoshi-no-kioku_toki-no-inori.mp3',
  'bgm.loop = true',
  'localStorage',
  'tarot-breaker:interaction-start',
  'visibilitychange',
]) {
  if (!audioJs.includes(token)) {
    throw new Error(`audio.js missing expected behavior token: ${token}`);
  }
}

console.log('TAROT BREAKER BGM validation passed');
console.log('BGM: 星の記憶、時の祈り');
console.log('Loop, persistent toggle, visibility pause and skit ducking enabled');
