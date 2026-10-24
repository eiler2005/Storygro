import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { boxMisses, type SceneShot } from '../production/src/board.ts';
import { appendEntries, entriesFor, formSay, lexiconJob, loadLexicon, nameAround, stressFrom, uncheckedNames } from '../production/src/lexicon.ts';

test('the dictionary loads: every entry has a stress mark and a source, and every listed form resolves', () => {
  const lex = loadLexicon();
  assert.ok(lex.entries.length >= 10);
  for (const e of lex.entries) {
    assert.match(e.say, /\+/, e.word);
    assert.ok(e.source.length > 10, `${e.word} needs a source`);
  }
  assert.equal(lex.say.get('лионеля'), 'Лион+еля');
  assert.equal(lex.say.get('месси'), 'М+есси');
  assert.ok(lexiconJob(lex)['месси']!.check, 'Месси carries its phoneme check to the narration');
});

test('a case form takes the stress of its entry only when it shares the letters before it', () => {
  assert.equal(formSay('Пар+иж', 'Париже'), 'Пар+иже');
  assert.throws(() => formSay('Пар+иж', 'Перижа'), /does not share/);
});

test('a line uses the entries of its words; the author\'s own marks win', () => {
  const lex = loadLexicon();
  assert.deepEqual(entriesFor('А Платини, Кройф и ван Бастен выигрывали по три.', lex).map((e) => e.word).sort(), ['Бастен', 'Кройф', 'Платини'].sort());
  assert.deepEqual(entriesFor('Это Пл+атини.', lex), []);
});

test('names without a checked stress are reported; sentence starts, ё, marks and dictionary words are not', () => {
  const lex = loadLexicon();
  const text = 'Тренер Гвардиола хвалил Хаби. Гвардиола ответил. Чёрный Мбаппе и М+ессина, а Месси молчал. Он и Ян.';
  assert.deepEqual(uncheckedNames(text, lex), ['Гвардиола', 'Хаби', 'Мбаппе']);
});

test('stress found online is taken only from the same word form: Russian stress moves between forms', () => {
  assert.equal(stressFrom('Париже', 'Пари́же'), 'Пар+иже');
  assert.equal(stressFrom('Золотых', 'Зо́лото'), null);
  assert.equal(stressFrom('Яшин', 'Я́шин'), '+Яшин');
  assert.equal(stressFrom('Чёрный', 'чёрный'), 'Ч+ёрный');
});

test('looked-up words are appended as entries with their source', (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'storygro-lex-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const path = join(dir, 'lexicon-ru.yaml');
  writeFileSync(path, 'lexicon: 1\nwords:\n');
  appendEntries([{ word: 'Ло́ндоне'.replace('́', ''), say: 'Л+ондоне', source: "ru.wiktionary, «Лондон»: «…Пр. Ло́ндоне…» it's" }], path, '2026-10-24');
  const lex = loadLexicon(path);
  assert.equal(lex.say.get('лондоне'), 'Л+ондоне');
  assert.match(lex.entries[0]!.source, /it's \(storygro stress --lookup, 2026-10-24\)$/);
  assert.match(readFileSync(path, 'utf8'), /it''s/);
});

test('text that sticks out of its own card is a visual miss; the safe area is a separate check', () => {
  const shot = (over: number): SceneShot => ({ id: 'origin', at: 1, png: '', text: '1956', boxes: [{ t: '1956', x: 0, y: 0, w: 10, h: 10, over }] });
  assert.deepEqual(boxMisses([shot(3)]), []);
  assert.deepEqual(boxMisses([shot(54), shot(54)]).map((m) => [m.scene, m.text, m.over]), [['origin', '1956', 54]]);
});

test('a name is looked up with the capitalised words around it: whose name decides the stress', () => {
  const text = 'и Лука Модрич, и Мануэль Нойер, а потом Дейн Сент-Клэр. Кевин.';
  assert.equal(nameAround(text, 'Лука'), 'Лука Модрич');
  assert.equal(nameAround(text, 'Нойер'), 'Мануэль Нойер');
  assert.equal(nameAround(text, 'Сент-Клэр'), 'Дейн Сент-Клэр');
  assert.equal(nameAround(text, 'Кевин'), 'Кевин');
});
