import test from 'node:test';
import assert from 'node:assert/strict';
import { INSTRUMENTS, freshChart, songs } from './chart.js';

test('five songs have distinct playable timelines and use the visible kit', () => {
  assert.equal(songs.length, 5);
  assert.deepEqual(songs.map(song => song.level), [1, 2, 3, 4, 5]);
  assert.deepEqual(songs.map(song => song.difficulty), ['EASY', 'EASY+', 'NORMAL', 'HARD', 'EXPERT']);
  assert.equal(new Set(songs.map(song => song.id)).size, 5);
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
  assert.equal(new Set(signatures).size, 5);
});

test('Blue Note has varied bars and alternating cymbal textures', () => {
  const song = songs.find(item => item.id === 'blue-note-walk');
  const notes = freshChart(song);
  const barSignatures = Array.from({ length: song.bars }, (_, bar) =>
    notes.filter(note => Math.floor(note.beat / song.meter) === bar)
      .map(note => `${(note.beat % song.meter).toFixed(3)}:${note.instrument}`).join('|'));
  assert.ok(new Set(barSignatures).size >= 16);
  assert.ok(notes.some(note => note.instrument === 'hh'));
  assert.ok(notes.some(note => note.instrument === 'ride'));
  assert.ok(notes.filter(note => note.instrument === 'ride').length < notes.filter(note => note.instrument === 'hh').length);
});

test('After Hours keeps a readable swing pulse with fewer ride hits', () => {
  const song = songs.find(item => item.id === 'after-hours');
  const notes = freshChart(song);
  assert.equal(notes.filter(note => note.instrument === 'ride').length, song.bars * 4);
  assert.equal(notes.filter(note => note.instrument === 'snare').length, song.bars * 2);
  assert.equal(notes.filter(note => note.instrument === 'tom2').length, 2);
});
