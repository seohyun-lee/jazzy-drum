import test from 'node:test';
import assert from 'node:assert/strict';
import { instrumentForKey } from './input.js';

test('Korean IME still maps the physical S, D and Space keys', () => {
  assert.equal(instrumentForKey({ code: 'KeyS', key: 'ㄴ' }), 'hh');
  assert.equal(instrumentForKey({ code: 'KeyD', key: 'ㅇ', isComposing: true }), 'snare');
  assert.equal(instrumentForKey({ code: 'Space', key: 'Process', isComposing: true }), 'kick');
});

test('left and right cymbals use the corresponding keyboard sides', () => {
  assert.equal(instrumentForKey({ code: 'KeyA' }), 'crash');
  assert.equal(instrumentForKey({ code: 'KeyU' }), 'crash2');
  assert.equal(instrumentForKey({ code: 'KeyK' }), 'ride');
});

test('modifier shortcuts and held keys do not strike a drum', () => {
  assert.equal(instrumentForKey({ code: 'KeyS', key: 'ㄴ', ctrlKey: true }), null);
  assert.equal(instrumentForKey({ code: 'KeyS', key: 'ㄴ', repeat: true }), null);
});
