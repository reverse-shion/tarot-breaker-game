'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const camera=fs.readFileSync('caritas-battle-camera.css','utf8');
const html=fs.readFileSync('hoshisuna-main.html','utf8');
const label='A02 tactical 3-choice fit v1';
const index=camera.indexOf(label);
const rules=camera.slice(index);
const gate='#game-shell #caritas-event[data-camera-layout="a02"][data-rules="tactical-v1"][data-reading-complete="true"][data-reading-mode="select"]';

test('choice-sheet repair is isolated to completed tactical selection on camera A02',()=>{
  assert.ok(index>0,'layout amendment exists');
  const blocks=rules.split(/\n(?=#game-shell|@media)/g);
  assert.ok(blocks.filter(b=>b.startsWith('#game-shell')).every(b=>b.startsWith(gate)));
  assert.match(html,/caritas-battle-camera\.css\?v=a16-finisher-affinity&choice-fit=1/);
});

test('full viewport replaces 72dvh bottom sheet without cropping authored choices',()=>{
  assert.match(rules,/justify-content:center!important/);
  assert.match(rules,/height:auto!important/);
  assert.match(rules,/max-height:100%!important/);
  assert.match(rules,/\.cb-modal-words:not\(\[hidden\]\)\{/);
  assert.match(rules,/overflow-y:auto!important/,'short screens and large text have a safe fallback');
  assert.doesNotMatch(rules,/-webkit-line-clamp|text-overflow:ellipsis|overflow:hidden!important;\s*white-space:nowrap/);
});

test('all three word buttons retain readable descriptions, effects and tappable focus',()=>{
  assert.match(rules,/\.cb-modal-word-desc\{/);
  assert.match(rules,/font-size:clamp\(13px,3\.35vw,14px\)!important/);
  assert.match(rules,/\.cb-modal-impact\{/);
  assert.match(rules,/:focus-visible\{/);
  assert.match(rules,/min-height:62px!important/);
});
