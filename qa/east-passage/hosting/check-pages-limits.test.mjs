import test from 'node:test';
import assert from 'node:assert/strict';
import {analyzeFiles} from './check-pages-limits.mjs';

test('normal files are accepted without exposing data', () => {
  assert.equal(analyzeFiles([{path:'index.html',type:'file',size:20}]).status,'PRECHECK_PASS');
});
test('over-size and excessive count stop the deployment', () => {
  assert.match(analyzeFiles([{path:'video.mp4',type:'file',size:26*1024*1024}]).violations.join(','),/TOO_LARGE/);
  assert.equal(analyzeFiles([{path:'a',type:'file',size:1},{path:'b',type:'file',size:1}],{maxFiles:1}).status,'STOP');
});
test('non-file and missing paths stop the deployment', () => {
  assert.equal(analyzeFiles([{path:'bad',type:'non-file',size:0}]).status,'STOP');
  assert.equal(analyzeFiles([{path:'missing',type:'missing',size:0}]).status,'STOP');
});
