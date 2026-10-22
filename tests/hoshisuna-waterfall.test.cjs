const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
const root=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(root,'hoshisuna-main.html'),'utf8');
const css=fs.readFileSync(path.join(root,'game.css'),'utf8');
const effects=fs.readFileSync(path.join(root,'scene-effects.js'),'utf8');
const source=(p)=>path.join(root,p);
const gitBlob=(p)=>cp.execFileSync('git',['hash-object',source(p)],{encoding:'utf8'}).trim();
test('Starroad and falls are byte-exact assets already merged to main',()=>{
 assert.equal(gitBlob('assets/events/hoshisuna/map/starroad.webp'),'2dc27814f091758f08a50061bde8a954e00192aa');
 assert.equal(gitBlob('assets/events/hoshisuna/map/falls.webp'),'b1cbcf1729e0758f9e0d4c26d05c10c7d86ba18d');
});
test('all visible Starroad entry references use new asset version',()=>{
 const src='./assets/events/hoshisuna/map/starroad.webp?asset=2dc27814';
 assert.ok((html.split(src).length-1)>=4);
 assert.doesNotMatch(html,/starroad\.webp"/);
 assert.match(html,/class="scene-world-layer scene-back scene-ground"[^>]*><img[^>]*starroad\.webp\?asset=/);
});
test('two waterfall image layers use the transparent new falls, not old Garden waterfall',()=>{
 const matches=html.match(/class="scene-world-layer scene-back scene-waterfall scene-waterfall-(?:base|flow)"[^>]*>[\\s\\S]*?<img[^>]+falls\.webp\?asset=b1cbcf17/g)||[];
 assert.equal(matches.length,2);
 assert.doesNotMatch(html,/star-country-gate-garden-waterfall\.webp/);
 assert.doesNotMatch(html,/\.scene-background,\.scene-waterfall,/);
 assert.match(html,/\.scene-ground\{display:block!important;z-index:3!important\}/);
});
test('reuse Garden main waterfall draw-mask and unmodified two-phase motion',()=>{
 assert.match(html,/src="\.\/scene-effects\.js\?/);
 assert.match(html,/src="\.\/game\.css\?/);
 assert.match(effects,/for\(const l of document\.querySelectorAll\("\.scene-waterfall"\)\)/);
 assert.match(effects,/p\.drawImage\(img,0,0,REF\.w,REF\.h\)/);
 assert.match(effects,/l\.style\.maskImage=`url\("\$\{img\.src\}"\)`/);
 assert.match(css,/\.scene-waterfall canvas \{ animation: waterfall-flow 2\.2s linear infinite; \}/);
 assert.match(css,/\.scene-waterfall-flow canvas \{ animation-delay: -1\.1s; \}/);
 assert.match(css,/@keyframes waterfall-flow\s*\{[\s\S]*?translate3d\(0,-8px,0\)[\s\S]*?translate3d\(0,8px,0\)/);
 assert.match(css,/\.scene-waterfall canvas \{ animation-duration:5s; \}/);
});
