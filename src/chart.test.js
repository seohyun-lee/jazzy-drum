import test from 'node:test';
import assert from 'node:assert/strict';
import { INSTRUMENTS, freshChart, songs } from './chart.js';

test('four songs have distinct playable timelines and use the visible kit', () => {
  assert.equal(songs.length, 4);
  assert.equal(new Set(songs.map(song => song.id)).size, 4);
  assert.equal(new Set(songs.map(song => song.meter)).size, 2);
  const signatures = [];
  for (const song of songs) {
    const notes = freshChart(song);
    assert.ok(notes.length > 50, `${song.id} should have a full part`);
    assert.ok(notes.every(note => INSTRUMENTS[note.instrument]));
    assert.ok(notes.every(note => note.time >= 0 && note.time < song.bars * song.meter * 60 / song.bpm));
    assert.ok(notes.every((note, index) => index === 0 || notes[index - 1].time <= note.time));
    assert.ok(notes.some(note => note.instrument === 'ride' || note.instrument === 'crash2'));
    signatures.push(notes.map(note => `${note.beat}:${note.instrument}`).join('|'));
  }
  assert.equal(new Set(signatures).size, 4);
});
