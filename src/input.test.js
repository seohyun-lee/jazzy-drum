import test from 'node:test';
import assert from 'node:assert/strict';
import { instrumentForKey } from './input.js';

test('Korean IME still maps the physical D, V and Space keys', () => {
  assert.equal(instrumentForKey({ code: 'KeyD', key: 'ㅇ' }), 'hh');
  assert.equal(instrumentForKey({ code: 'KeyV', key: 'ㅍ', isComposing: true }), 'snare');
  assert.equal(instrumentForKey({ code: 'Space', key: 'Process', isComposing: true }), 'kick');
});

test('left and right cymbals use the corresponding keyboard sides', () => {
  assert.equal(instrumentForKey({ code: 'KeyF' }), 'crash');
  assert.equal(instrumentForKey({ code: 'KeyJ' }), 'crash2');
  assert.equal(instrumentForKey({ code: 'KeyN' }), 'floor');
  assert.equal(instrumentForKey({ code: 'KeyK' }), 'ride');
  assert.equal(instrumentForKey({ code: 'KeyG' }), 'tom1');
  assert.equal(instrumentForKey({ code: 'KeyH' }), 'tom2');
  assert.equal(instrumentForKey({ code: 'KeyC' }), 'hhPedal');
});

test('modifier shortcuts and held keys do not strike a drum', () => {
  assert.equal(instrumentForKey({ code: 'KeyD', key: 'ㅇ', ctrlKey: true }), null);
  assert.equal(instrumentForKey({ code: 'KeyD', key: 'ㅇ', repeat: true }), null);
});
