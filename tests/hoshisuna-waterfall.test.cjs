const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
const root=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(root,'hoshisuna-main.html'),'utf8');
const css=fs.readFileSync(path.join(root,'game.css'),'utf8');
const effects=fs.readFileSync(path.join(root,'scene-effects.js'),'utf8');
const source=(p)=>path.join(root,p);
const gitBlob=(p)=>cp.execFileSync('git',['hash-object',source(p)],{encoding:'utf8'}).trim();
test('cleaned Starroad remains byte-exact and falls are unchanged',()=>{
 assert.equal(gitBlob('assets/events/hoshisuna/map/starroad.webp'),'c05db8c2ae2ec72ffcfc3496ffa7fc0a2ce41e33');
 assert.equal(gitBlob('assets/events/hoshisuna/map/falls.webp'),'b1cbcf1729e0758f9e0d4c26d05c10c7d86ba18d');
});
test('all visible Starroad entry references use new asset version',()=>{
 const src='./assets/events/hoshisuna/map/starroad.webp?asset=c05db8c2';
 assert.ok((html.split(src).length-1)>=4);
 assert.doesNotMatch(html,/starroad\.webp"/);
 assert.match(html,/class="scene-world-layer scene-back scene-ground"[^>]*><img[^>]*starroad\.webp\?asset=/);
});
test('two waterfall image layers use the transparent new falls, not old Garden waterfall',()=>{
 const matches=html.match(/class="scene-world-layer scene-back scene-waterfall scene-waterfall-(?:base|flow)"[^>]*>[\s\S]*?<img[^>]+falls\.webp\?asset=b1cbcf17/g)||[];
 assert.equal(matches.length,2);
 assert.doesNotMatch(html,/star-country-gate-garden-waterfall\.webp/);
 assert.doesNotMatch(html,/\.scene-background,\.scene-waterfall,/);
 assert.match(html,/\.scene-ground\{display:block!important;z-index:3!important\}/);
 assert.match(html,/#game-shell \.scene-waterfall\{display:block!important;z-index:11!important;pointer-events:none\}/);
 assert.match(html,/\.scene-foreground\{z-index:10!important;pointer-events:none\}/);
 const groundZ=Number(html.match(/\.scene-ground\{display:block!important;z-index:(\d+)!important\}/)?.[1]);
 const waterfallZ=Number(html.match(/#game-shell \.scene-waterfall\{display:block!important;z-index:(\d+)!important/)?.[1]);
 const foregroundZ=Number(html.match(/\.scene-foreground\{z-index:(\d+)!important/)?.[1]);
 assert.ok(waterfallZ>groundZ && waterfallZ>foregroundZ,'falls must be in front of both Starroad layers');
});
test('reuse Garden main waterfall draw-mask and unmodified two-phase motion',()=>{
 assert.match(html,/src="\.\/scene-effects\.js\?/);
 assert.match(html,/href="\.\/game\.css\?/);
 assert.match(effects,/for\(const l of document\.querySelectorAll\("\.scene-waterfall"\)\)/);
 assert.match(effects,/p\.drawImage\(img,0,0,REF\.w,REF\.h\)/);
 assert.match(effects,/l\.style\.maskImage=`url\("\$\{img\.src\}"\)`/);
 assert.match(css,/\.scene-waterfall canvas \{ animation: waterfall-flow 2\.2s linear infinite; \}/);
 assert.match(css,/\.scene-waterfall-flow canvas \{ animation-delay: -1\.1s; \}/);
 assert.match(css,/@keyframes waterfall-flow\s*\{[\s\S]*?translate3d\(0,-8px,0\)[\s\S]*?translate3d\(0,8px,0\)/);
 assert.match(css,/\.scene-waterfall canvas \{ animation-duration:5s; \}/);
});

test('the existing Garden animation is not disabled by the Hoshisuna overlay',()=>{
 const rule=html.match(/<style id="hoshisuna-only-scene">([\s\S]*?)<\/style>/)?.[1]||'';
 assert.doesNotMatch(rule,/\.scene-waterfall[^{}]*\{[^}]*animation\s*:\s*none/);
 assert.doesNotMatch(rule,/\.scene-waterfall[^{}]*\{[^}]*opacity\s*:\s*0/);
 assert.ok(rule.includes('z-index:11!important'));
 assert.match(html,/<div class="scene-world-layer scene-back scene-waterfall scene-waterfall-base"[^>]*><img[^>]*falls\.webp[^>]*><canvas width="1448" height="1086"><\/canvas><\/div>/);
 assert.match(html,/<div class="scene-world-layer scene-back scene-waterfall scene-waterfall-flow"[^>]*><img[^>]*falls\.webp[^>]*><canvas width="1448" height="1086"><\/canvas><\/div>/);
});

test('falls appear after ground and foreground in DOM as well as by z-index',()=>{
  const ground=html.indexOf('scene-world-layer scene-back scene-ground');
  const foreground=html.indexOf('scene-world-layer scene-front scene-foreground');
  const waterfallBase=html.indexOf('scene-world-layer scene-back scene-waterfall scene-waterfall-base');
  const waterfallFlow=html.indexOf('scene-world-layer scene-back scene-waterfall scene-waterfall-flow');
  assert.ok(ground>=0 && foreground>ground && waterfallBase>foreground && waterfallFlow>waterfallBase);
  assert.equal((html.match(/scene-waterfall scene-waterfall-base/g)||[]).length,1);
  assert.equal((html.match(/scene-waterfall scene-waterfall-flow/g)||[]).length,1);
});
