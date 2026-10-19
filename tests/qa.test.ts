import assert from 'node:assert/strict';
import { test } from 'node:test';
import { heardInRange, similarity } from '../src/qa.ts';

test('a segment crossing a scene boundary does not lose the next scene first words', () => {
  const segments = [{ start: 37.1, end: 43.44, text: 'интеллект помогает В Соединённых Штатах', words: [
    { w: 'интеллект', start: 37.1, end: 37.7 }, { w: 'помогает', start: 37.8, end: 38.4 },
    { w: 'В', start: 41.2, end: 41.3 }, { w: 'Соединённых', start: 41.3, end: 42 }, { w: 'Штатах', start: 42, end: 42.5 },
  ] }];
  assert.equal(heardInRange(segments, 30.675, 40.95), 'интеллект помогает');
  assert.equal(heardInRange(segments, 40.95, 56.15), 'В Соединённых Штатах');
  assert.equal(similarity('В Соединённых Штатах', heardInRange(segments, 40.95, 56.15)).score, 1);
});

test('speech checks require word timestamps rather than silently accepting untimed segments', () => {
  assert.throws(() => heardInRange([{ start: 0, end: 10, text: 'Wrong scene assignment' }], 5, 10), /word timestamps are missing/);
});
