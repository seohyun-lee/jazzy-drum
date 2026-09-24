import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeAudio } from './analysis.js';

test('a steady kick pulse yields the right tempo and playable note times', () => {
  const sampleRate = 11025;
  const duration = 12;
  const data = new Float32Array(sampleRate * duration);
  for (let time = 0; time < duration; time += 0.5) {
    for (let i = 0; i < sampleRate * 0.08; i++) {
      const at = Math.round(time * sampleRate) + i;
      if (at < data.length) data[at] += 0.8 * Math.sin(2 * Math.PI * 85 * i / sampleRate) * Math.exp(-i / (sampleRate * 0.025));
    }
  }
  const chart = analyzeAudio({ sampleRate, numberOfChannels: 1, getChannelData: () => data, length: data.length, duration });
  assert.ok(Math.abs(chart.bpm - 120) <= 2);
  assert.ok(chart.notes.length >= 20);
  assert.ok(chart.notes.filter(note => note.instrument === 'kick').length / chart.notes.length > 0.85);
  assert.ok(chart.notes.every(note => Math.abs(note.beat * 60 / chart.bpm - note.time) < 0.001));
});
