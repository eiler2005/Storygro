import assert from 'node:assert/strict';
import { test } from 'node:test';
import { heardInRange, norm, similarity } from '../production/src/qa.ts';

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

test('hyphenated compounds compare equal however ASR spaces them; spaced dashes stay breaks', () => {
  assert.deepEqual(norm('Ссылка на слайд -крафт'), norm('Ссылка на слайдкрафт'));
  assert.deepEqual(norm('кто-то пришёл'), ['ктото', 'пришел']);
  assert.deepEqual(norm('работа - это задачи'), ['работа', 'это', 'задачи']);
  assert.equal(similarity('Ссылка на Слайдкрафт в описании', 'Ссылка на слайд-крафт в описании.').score, 1);
});

test('number words heard as digits, «процент» as %, compounds as two words; nothing is matched twice', () => {
  const r = similarity('лучший агент двадцать четвёртого года решал шестьдесят один процент задач восемь раз подряд таубенч',
    'лучший агент 24-го года решал 61% задач 8 раз подряд Тау Бенч');
  assert.equal(r.score, 1, r.missing.join(' '));
  // one heard number cannot stand in for two separate numbers
  const twice = similarity('восемь раз и девять раз', '8 раз и раз');
  assert.deepEqual(twice.missing, ['девять']);
  // a number word with no number heard stays missing
  assert.deepEqual(similarity('восемь раз', 'раз').missing, ['восемь']);
});
