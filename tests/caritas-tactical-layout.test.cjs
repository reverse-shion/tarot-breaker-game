'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const css=fs.readFileSync(path.join(__dirname,'../caritas-tactical-ui.css'),'utf8');
const rule=selector=>{const start=css.indexOf(selector+'{');assert.ok(start>=0,selector);return css.slice(start,css.indexOf('}',start)+1);};
test('writer forecast cannot take a full flex column or push send outside the viewport',()=>{
 const footer=rule('#caritas-event[data-rules="tactical-v1"] .cb-writing-footer');
 assert.match(footer,/display:grid/);assert.match(footer,/grid-template-columns:minmax\(0,1fr\)/);assert.match(footer,/grid-auto-flow:row/);
 const forecast=rule('#caritas-event[data-rules="tactical-v1"] .cb-writing-footer>.cb-tactical-forecast');
 assert.match(forecast,/flex-basis:auto/);assert.match(forecast,/min-width:0/);assert.match(forecast,/overflow-wrap:anywhere/);assert.match(forecast,/max-height:5em/);
 const send=rule('#caritas-event[data-rules="tactical-v1"] .cb-writing-footer>.cb-ai-send');
 assert.match(send,/box-sizing:border-box/);assert.match(send,/max-width:100%/);assert.match(send,/justify-self:stretch/);
});
test('connector is one closed triangle with vertices beneath the three nodes, not crossed gradients',()=>{
 const connector=rule('#caritas-event[data-rules="tactical-v1"] .cb-tactical-triangle::before');
 assert.doesNotMatch(connector,/linear-gradient/);
 const svg=decodeURIComponent(connector.slice(connector.indexOf('data:image/svg+xml,')+19,connector.indexOf('") center')));
 assert.match(svg,/<polygon/);assert.match(svg,/fill='none'/);assert.match(svg,/vector-effect='non-scaling-stroke'/);
 const points=/points='([^']+)'/.exec(svg)[1].split(' ').map(p=>p.split(',').map(Number));assert.equal(points.length,3);
 const boxes=[[23,0,77,64],[0,126,44,190],[56,126,100,190]];
 points.forEach(([x,y],i)=>{const [l,t,r,b]=boxes[i];assert.ok(x>=l&&x<=r&&y>=t&&y<=b);});
 const [[a,b],[c,d],[e,f]]=points;assert.ok(Math.abs((c-a)*(f-b)-(e-a)*(d-b))>1000,'nondegenerate triangle');
});
