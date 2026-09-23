import test from 'node:test';
import assert from 'node:assert/strict';
import { retimeTimeline } from './timing.js';
import { songs, freshChart } from './chart.js';

test('half-tempo practice doubles note times without changing the chart', () => {
  const song = songs[1];
  const normal = freshChart(song);
  const slow = freshChart(song, song.bpm / 2);
  assert.equal(normal.length, slow.length);
  slow.forEach((note, index) => {
    assert.equal(note.time, normal[index].time * 2);
    assert.equal(note.instrument, normal[index].instrument);
  });
});

test('changing paused tempo keeps musical position and previous judgements', () => {
  const notes = [{ beat: 4, time: 2, instrument: 'kick', hit: true }, { beat: 6, time: 3, instrument: 'snare', missed: false }];
  const updated = retimeTimeline(notes, 2.5, 120, 60);
  assert.equal(updated.seconds, 5);
  assert.equal(updated.notes[0].time, 4);
  assert.equal(updated.notes[0].hit, true);
  assert.equal(updated.notes[1].time - updated.seconds, 1);
  assert.equal(notes[0].time, 2);
});

test('tempo changes preserve remaining count-in beats', () => {
  assert.equal(retimeTimeline([], -1, 120, 60).seconds, -2);
});
