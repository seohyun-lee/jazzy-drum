import test from 'node:test';
import assert from 'node:assert/strict';
import { fixedPageLayout } from './notation.js';

test('fixed score holds two measures while the playhead crosses them', () => {
  const start = fixedPageLayout(0, 0.5, 4, 800);
  const middle = fixedPageLayout(2, 0.5, 4, 800);
  const end = fixedPageLayout(3.99, 0.5, 4, 800);
  assert.deepEqual([start.startBeat, middle.startBeat, end.startBeat], [0, 0, 0]);
  assert.equal(start.xForBeat(4), middle.xForBeat(4));
  assert.ok(start.playheadX < middle.playheadX && middle.playheadX < end.playheadX);
  assert.equal(fixedPageLayout(4, 0.5, 4, 800).startBeat, 8);
});

test('count-in holds the first page and narrow screens flip each measure', () => {
  const countIn = fixedPageLayout(-1, 0.625, 3, 390);
  assert.equal(countIn.startBeat, 0);
  assert.equal(countIn.playheadX, countIn.xForBeat(0));
  assert.equal(fixedPageLayout(1.875, 0.625, 3, 390).startBeat, 3);
  assert.equal(fixedPageLayout(3.75, 0.625, 3, 390).startBeat, 6);
});
