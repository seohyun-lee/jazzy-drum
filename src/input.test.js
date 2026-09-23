import test from 'node:test';
import assert from 'node:assert/strict';
import { instrumentForKey } from './input.js';

test('Korean IME still maps the physical F, J and Space keys', () => {
  assert.equal(instrumentForKey({ code: 'KeyF', key: 'ㄹ' }), 'hh');
  assert.equal(instrumentForKey({ code: 'KeyJ', key: 'ㅓ', isComposing: true }), 'snare');
  assert.equal(instrumentForKey({ code: 'Space', key: 'Process', isComposing: true }), 'kick');
});

test('modifier shortcuts and held keys do not strike a drum', () => {
  assert.equal(instrumentForKey({ code: 'KeyF', key: 'ㄹ', ctrlKey: true }), null);
  assert.equal(instrumentForKey({ code: 'KeyF', key: 'ㄹ', repeat: true }), null);
});
