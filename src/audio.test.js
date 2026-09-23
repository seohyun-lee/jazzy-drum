import test from 'node:test';
import assert from 'node:assert/strict';
import { DrumAudio } from './audio.js';

test('ride and two crashes render finite, distinct cymbal sounds', () => {
  const audio = new DrumAudio();
  audio.context = {
    sampleRate: 12000,
    createBuffer: (_, frames) => {
      const channel = new Float32Array(frames);
      return { length: frames, getChannelData: () => channel };
    },
  };
  const sounds = ['ride', 'crash', 'crash2'].map(name => audio.makeCymbal(name, 0).getChannelData(0));
  assert.ok(sounds[0].length < sounds[1].length);
  assert.ok(sounds[2].length < sounds[1].length);
  for (const samples of sounds) {
    assert.ok(samples.some(value => Math.abs(value) > 0.05));
    assert.ok(samples.every(Number.isFinite));
    assert.ok(samples.every(value => Math.abs(value) <= 1));
  }
  assert.notEqual(sounds[0][1000], sounds[1][1000]);
  assert.notEqual(sounds[1][1000], sounds[2][1000]);
});
