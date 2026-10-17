import test from 'node:test';
import assert from 'node:assert/strict';
import {validateOrigin} from './verify-host.mjs';

test('allows only a single exact distinct HTTPS hostname', () => {
  assert.equal(validateOrigin('https://shion-qa-a.pages.dev'), 'https://shion-qa-a.pages.dev');
  for (const input of [
    '', 'http://shion-qa-a.pages.dev', 'https://shion-qa-a.pages.dev/',
    'https://shion-qa-a.pages.dev/qa', 'https://shion-qa-a.pages.dev?x=1',
    'https://reverse-shion.github.io', 'https://raw.githack.com',
    'https://github.com', 'https://a.github.io', 'https://127.0.0.1',
    'https://localhost', 'https://[::1]'
  ]) assert.throws(() => validateOrigin(input), input);
});