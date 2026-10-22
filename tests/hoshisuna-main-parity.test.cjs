const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const original=fs.readFileSync(path.join(__dirname,'../game.js'),'utf8');
const variant=fs.readFileSync(path.join(__dirname,'../hoshisuna-main-game.js'),'utf8');
const scene=fs.readFileSync(path.join(__dirname,'../hoshisuna-main.html'),'utf8');
function fn(text,name,next){const a=text.indexOf('  function '+name+'(');const b=text.indexOf('  function '+next+'(',a+5);assert.ok(a>=0&&b>a,name+' section not found');return text.slice(a,b);}
for(const [name,next] of [
 ['shioponFollowTarget','moveShioponFollowStep'],
 ['moveShioponFollowStep','planShioponFollowRoute'],
 ['planShioponFollowRoute','updateShioponFollow'],
 ['updateShioponFollow','startShioponRace'],
 ['updateCamera','drawSpritePass'],
 ['drawActor','drawGroundShadowAt'],
 ['drawActors','drawCollisionDebug'],
 ['pointerInfo','syncStick'],
 ['syncStick','placeShioponBesidePlayer'],
 ['startShioponFollow','stopShioponFollow']
]){
 test('main exact function: '+name,()=>assert.equal(fn(variant,name,next),fn(original,name,next)));
}
test('isolated entry uses Garden actors, sky, clouds, Starroad only',()=>{
 assert.match(scene,/hoshisuna-main-game\.js/);
 assert.match(scene,/data-collision-url="\.\/assets\/events\/hoshisuna\/map\/starroad-collision\.json"/);
 assert.match(scene,/hoshisuna-scene-adapter\.js/);
 assert.match(scene,/star-country-world-clouds\.webp/);
 assert.match(scene,/starroad\.webp/);
 assert.doesNotMatch(scene,/story-event-guard\.js|public-continue-title\.js|single-map-occlusion\.js/);
});
test('Hoshisuna entry is isolated and no title save-reset',()=>{
 assert.match(variant,/hoshisunaIsolated \? \{/);
 assert.match(variant,/if \(hoshisunaIsolated\) \{\s*player\.dir = "right"/);
 assert.match(variant,/if \(!hoshisunaIsolated && window\.TarotDialogue\?\.getState\(\)\.joined\)/);
 assert.match(variant,/!hoshisunaIsolated && !stage3Dev && enteringGardenRuntime/);
});
test('Caritas body excluded from existing shared navigation graph',()=>{
 assert.match(variant,/points:\[\[934,150\],\[1092,150\],\[1092,272\],\[934,272\]\]/);
 assert.match(scene,/data-world-x="950\.5"/);
 assert.match(scene,/data-world-y="166\.6"/);
});
