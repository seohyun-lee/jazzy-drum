import test from 'node:test';
import assert from 'node:assert/strict';
import { guideTargets } from './guide.js';

test('guide appears one second before a hit and becomes solid at half a second', () => {
  const notes = [{ time: 3, instrument: 'snare' }];
  assert.deepEqual(guideTargets(notes, 1.999), []);
  assert.equal(guideTargets(notes, 2)[0].opacity, 0.35);
  assert.equal(guideTargets(notes, 2.499)[0].opacity, 0.35);
  assert.equal(guideTargets(notes, 2.5)[0].opacity, 1);
  assert.equal(guideTargets(notes, 3)[0].scale, 1);
});

test('simultaneous hits light both drums, repeated notes do not overlap', () => {
  const notes = [{ time: 1, instrument: 'hh' }, { time: 1, instrument: 'kick' }, { time: 1.3, instrument: 'hh' }];
  assert.deepEqual(guideTargets(notes, 0.5).map(({ instrument }) => instrument), ['hh', 'kick']);
});
