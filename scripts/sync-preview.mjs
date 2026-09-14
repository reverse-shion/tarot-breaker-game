// Canonical entry point + immutable asset pin. Preserve the existing public
// collision editor/data and all unrelated pages in the official site.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
const [siteRoot,version]=process.argv.slice(2);
if(!siteRoot || !/^preview-\d+$/.test(version||'')) throw new Error('Provide site checkout and preview-N version');
const out=path.resolve(siteRoot,'tarot-breaker-game-preview');
const collision=fs.readFileSync('assets/maps/star-country-gate-garden-collision.json');
const publishedCollision=fs.readFileSync(path.join(out,'star-country-gate-garden-collision.json'));
const geometry=bytes=>{const d=JSON.parse(bytes);return JSON.stringify([d.map,d.referenceSize,d.walkAreas,d.blockedAreas||[]]);};
// v1 with no blockedAreas and v2 with [] describe the same authored geometry.
if(geometry(collision)!==geometry(publishedCollision)) throw new Error('Collision geometry differs: review the user-authored data before syncing');
const commit=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const hash=value=>crypto.createHash('sha256').update(value).digest('hex');
const runtime=['game.js','game.css','fountain-polish.css','sky-atmosphere.css','cloud-motion-fix.css','scene-layout.js','scene-effects.js','navigation.js','blocked-collision.js','controls.js','dialogue.js','dialogue.css','audio.js','audio.css','lumiere-outline.js'];
const files={};
for(const name of runtime) {
 const content=fs.readFileSync(name);fs.writeFileSync(path.join(out,name),content);files[name]=hash(content);
}
let html=fs.readFileSync('index.html','utf8');
html=html.replace(/\?v=[^"\s]+/g,`?v=${version}`);
const assets=`https://raw.githubusercontent.com/reverse-shion/tarot-breaker-game/${commit}/assets/`;
html=html.replaceAll('./assets/maps/',assets+'maps/');
html=html.replace(/<p>星門庭園<\/p>/,`<p>星門庭園 — PUBLIC PREVIEW ${version.split('-')[1]}</p>`);
html=html.replace('<small id="load-note">','<a class="editor-link" href="./collision-editor.html?v=3">当たり判定を編集する</a>\n          <small id="load-note">');
html=html.replace('</head>','<style>.editor-link{display:block;width:max-content;margin:12px auto 0;color:#f1dfad;font:600 13px/1.4 system-ui,sans-serif;text-decoration:none;border-bottom:1px solid rgba(241,223,173,.55);padding:3px 1px}</style>\n  </head>');
html=html.replace(/\s*data-(?:shiopon|lumiere)-base="[^"]*"/g,'');
html=html.replace(/src="\.\/game\.js[^\"]*"/,
 `$& data-collision-url="./star-country-gate-garden-collision.json?v=${version}" data-sprite-base="${assets}sprites/shion/" data-shiopon-base="${assets}sprites/shiopon/" data-lumiere-base="${assets}sprites/lumiere/"`);
// Audio's existing public config is kept self-contained, using the same pin.
html=html.replace(/src="\.\/audio\.js[^\"]*"/,
 `$& data-bgm-url="${assets}audio/bgm/hoshi-no-kioku_toki-no-inori.mp3"`);
fs.writeFileSync(path.join(out,'index.html'),html);
fs.writeFileSync(path.join(out,'preview-source.json'),JSON.stringify({version,repository:'reverse-shion/tarot-breaker-game',commit,files,collisionSha256:hash(publishedCollision)},null,2)+'\n');
console.log(`Synced ${version} from ${commit}; editor and authored collision preserved.`);
