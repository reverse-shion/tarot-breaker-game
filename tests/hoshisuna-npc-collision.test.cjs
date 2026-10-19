const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const vm=require('node:vm');const path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../hoshisuna-map-clean.html'),'utf8');
function source(name,next){const a=html.indexOf('function '+name+'(');const b=html.indexOf(next,a);assert(a>=0&&b>a);return html.slice(a,b);}
const code=html.match(/const ACTOR_COLLISION_DISTANCE=32[^\n]*/)?.[0]+'\n'+source('separation','function movingIntoActor');
const ctx={Math};vm.createContext(ctx);vm.runInContext(code+';this.probe={clearCaritas,separation,CARITAS,ACTOR_COLLISION_DISTANCE};',ctx);
const {clearCaritas,separation,CARITAS,ACTOR_COLLISION_DISTANCE}=ctx.probe;
test('Caritas center and edge block player movement',()=>{assert.equal(clearCaritas({x:900,y:253},{x:1100,y:253}),false);assert.equal(clearCaritas({x:1013,y:253},{x:1013,y:253}),false);assert.equal(clearCaritas({x:900,y:350},{x:1100,y:350}),true);assert.deepEqual({...CARITAS},{x:1013,y:253,rx:66,ry:32});});
test('companion must start behind Shion, never ahead',()=>{assert.match(html,/const player=\{x:108,y:488,dir:'right'/);assert.match(html,/const rear=\{x:player\.x-54,y:player\.y\}/);assert.match(html,/resetFollower\(\);/);assert.match(html,/const lastFoot=footprints\[footprints\.length-1\]/);});
test('Shion and Shiopon are physically separated',()=>{assert.equal(ACTOR_COLLISION_DISTANCE,32);assert.match(html,/separation\(next,companion\)<ACTOR_COLLISION_DISTANCE/);assert.match(html,/if\(!allowed\)\{controls\.cancel\('npc-collision'\)/);assert.match(html,/Math\.hypot\(candidate\.x-player\.x,candidate\.y-player\.y\)>=ACTOR_COLLISION_DISTANCE/);});
test('Caritas remains lying in place',()=>{assert.match(html,/left:1013px;top:253px/);assert.match(html,/sg_rise_01\.webp/);assert.doesNotMatch(html,/function\s+riseCaritas\(/);});
