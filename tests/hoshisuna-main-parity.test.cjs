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
 ['pointerInfo','syncStick'],
 ['syncStick','placeShioponBesidePlayer'],
 ['startShioponFollow','stopShioponFollow']
]){
 test('main exact function: '+name,()=>assert.equal(fn(variant,name,next),fn(original,name,next)));
}
test('isolated entry uses Garden actors, sky, clouds, Starroad and the same Garden waterfall animation',()=>{
 assert.match(scene,/hoshisuna-main-game\.js/);
 assert.match(scene,/data-collision-url="\.\/assets\/events\/hoshisuna\/map\/starroad-collision\.json"/);
 assert.match(scene,/hoshisuna-scene-adapter\.js/);
 assert.match(scene,/star-country-world-clouds\.webp/);
 assert.match(scene,/starroad\.webp/);
 assert.doesNotMatch(scene,/story-event-guard\.js|public-continue-title\.js|single-map-occlusion\.js/);
});
test('Hoshisuna entry is isolated and no title save-reset',()=>{
 assert.match(variant,/collision = hoshisunaIsolated/);
 assert.match(variant,/if \(hoshisunaIsolated\) \{\s*player\.dir = "right"/);
 assert.match(variant,/if \(!hoshisunaIsolated && window\.TarotDialogue\?\.getState\(\)\.joined\)/);
 assert.match(variant,/!hoshisunaIsolated && !stage3Dev && enteringGardenRuntime/);
});
test('Caritas collision is applied to active shared collision before navigation and controls',()=>{
 assert.match(variant,/collision = hoshisunaIsolated\s*\? window\.TarotHoshisunaCollision\.wrap\(baseCollision\)/);
 assert.match(variant,/navigation = createNavigator\(collision, 16\)/);
 assert.match(variant,/controls = createControls\(playerCollision, navigation\)/);
 assert.match(scene,/hoshisuna-caritas-collision\.js/);
 assert.ok(scene.indexOf('hoshisuna-caritas-collision.js')<scene.indexOf('hoshisuna-main-game.js'));
 assert.match(scene,/data-world-x="950\.5"/);
 assert.match(scene,/data-world-y="166\.6"/);
});

test('main actor draw order retained; Garden-only Lumiere suppressed',()=>{const originalActors=fn(original,'drawActors','drawCollisionDebug');const starroadActors=fn(variant,'drawActors','drawCollisionDebug');assert.match(starroadActors,/shiopon\.following && a\.actor === shiopon \? player\.y - 0\.01/);assert.match(originalActors,/shiopon\.following && a\.actor === shiopon \? player\.y - 0\.01/);assert.match(starroadActors,/!hoshisunaIsolated && \(!stage3Runtime \|\| aftermathLumiereEnabled\)/);});
