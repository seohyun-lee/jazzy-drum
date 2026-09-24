import test from 'node:test';
import assert from 'node:assert/strict';
import { followTempo, tempoFromFourTaps } from './jam.js';

test('four steady hits establish the jam tempo', () => {
  assert.equal(tempoFromFourTaps([1, 1.5, 2, 2.5]), 120);
  assert.equal(tempoFromFourTaps([1, 1.75, 2.5, 3.25]), 80);
  assert.equal(tempoFromFourTaps([1, 1.5, 2.3, 2.8]), null);
});

test('the backing tempo follows beat and subdivision timing gradually', () => {
  assert.equal(followTempo(100, 0.5), 103.6);
  assert.equal(followTempo(100, 0.3), 100);
  assert.equal(followTempo(100, 0.15), 100);
});
