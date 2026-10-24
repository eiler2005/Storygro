import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { test } from 'node:test';

const py = join(import.meta.dirname, '..', 'production', 'py');
/** Runs pure functions of py/stress.py (no RUAccent needed) with the system Python. */
const run = (code: string) =>
  JSON.parse(execFileSync('python3', ['-c', `import sys, json; sys.path.insert(0, ${JSON.stringify(py)}); import stress\n${code}`], { encoding: 'utf8' }));

test('stress marks render in the form each engine reads', () => {
  const r = run(`print(json.dumps({s: stress.render("Дверь на зам+ок, табличка вместо замка́.", s) for s in ["plus", "acute", "upper", "none"]}))`);
  assert.equal(r.plus, 'Дверь на зам+ок, табличка вместо замк+а.');
  assert.equal(r.acute, 'Дверь на замо́к, табличка вместо замка́.');
  assert.equal(r.upper, 'Дверь на замОк, табличка вместо замкА.');
  assert.equal(r.none, 'Дверь на замок, табличка вместо замка.');
});

test('upper style keeps a capitalised word from reading as an abbreviation', () => {
  const r = run(`print(json.dumps([stress.render(t, "upper") for t in ["З+амок на холме.", "Зам+ок, а не табличка.", "+Органе"]]))`);
  assert.deepEqual(r, ['зАмок на холме.', 'ЗамОк, а не табличка.', 'Органе']);
});

test('marks mode reports the author marks; off removes them; engines without a style get the text as is', () => {
  const r = run(`print(json.dumps([stress.prepare("Это ст+оит дорого.", "upper", "marks"), stress.prepare("Это ст+оит дорого.", "upper", "off"), stress.prepare("Это ст+оит.", None)]))`);
  assert.deepEqual(r[0], ['Это стОит дорого.', [{ word: 'стоит', stressed: 'ст+оит', by: 'author' }]]);
  assert.deepEqual(r[1], ['Это стоит дорого.', []]);
  assert.deepEqual(r[2], ['Это ст+оит.', []]);
});

test('caption words lose stress marks but keep hyphens and pluses that are not stress', () => {
  const r = run(`print(json.dumps([stress.clean(w) for w in ["зам+ок,", "замо́к", "ИИ-агенты", "+7", "C++"]]))`);
  assert.deepEqual(r, ['замок,', 'замок', 'ИИ-агенты', '+7', 'C++']);
});

test('the Yandex SpeechKit request: v1 endpoint, API key or IAM token, lpcm, stress marks kept', () => {
  const r = JSON.parse(execFileSync('python3', ['-c', `import sys, json, urllib.parse; sys.path.insert(0, ${JSON.stringify(join(py, 'voices'))}); sys.modules['numpy'] = type(sys)('numpy'); import yandex
url, h, body = yandex.build_request("Дверь на зам+ок.", "filipp", 1.1, env={"YANDEX_API_KEY": "k"})
url2, h2, body2 = yandex.build_request("Текст.", "alena", 1, emotion="good", env={"YANDEX_IAM_TOKEN": "t", "YANDEX_FOLDER_ID": "f"})
try:
    yandex.build_request("x", env={}); missing = None
except SystemExit as e: missing = str(e)
print(json.dumps([url, h, dict(urllib.parse.parse_qsl(body.decode())), h2, dict(urllib.parse.parse_qsl(body2.decode())), missing]))`], { encoding: 'utf8' }));
  assert.equal(r[0], 'https://tts.api.cloud.yandex.net/speech/v1/tts:synthesize');
  assert.equal(r[1].Authorization, 'Api-Key k');
  assert.deepEqual(r[2], { text: 'Дверь на зам+ок.', lang: 'ru-RU', voice: 'filipp', speed: '1.10', format: 'lpcm', sampleRateHertz: '48000' });
  assert.equal(r[3].Authorization, 'Bearer t');
  assert.equal(r[4].folderId, 'f');
  assert.equal(r[4].emotion, 'good');
  assert.match(r[5], /YANDEX_API_KEY/);
});

test('without RUAccent (as in CI) auto stress falls back to the hand marks instead of failing', () => {
  const r = run(`print(json.dumps([stress.prepare("Дверь на замок, а ключ под замк+ом.", "upper"), stress.prepare("Дверь на замок.", "acute", "auto", "all")]))`);
  assert.deepEqual(r[0], ['Дверь на замок, а ключ под замкОм.', [{ word: 'замком', stressed: 'замк+ом', by: 'author' }]]);
  assert.deepEqual(r[1], ['Дверь на замок.', []]);
});

test('a plus before a consonant (a typo) is dropped, never read aloud', () => {
  assert.deepEqual(run(`print(json.dumps([stress.render("ключ под зам+ком", s) for s in ["upper", "plus"]]))`), ['ключ под замком', 'ключ под замком']);
});

test('dictionary words take their stress in every line; the author\'s marks win; capitals are kept', () => {
  const r = run(`stress.use_lexicon({"месси": {"say": "М+есси"}, "лионеля": {"say": "Лион+еля"}})
print(json.dumps([stress.prepare("У Лионеля Месси и у месси.", "upper", "auto"), stress.prepare("Это М+есси.", "plus", "marks"), stress.prepare("Месси.", None)]))`);
  assert.equal(r[0][0], 'У ЛионЕля мЕсси и у мЕсси.');
  assert.deepEqual(r[0][1].map((d: { by: string }) => d.by), ['lexicon', 'lexicon', 'lexicon']);
  assert.deepEqual(r[1], ['Это М+есси.', [{ word: 'Месси', stressed: 'М+есси', by: 'author' }]]);
  assert.deepEqual(r[2], ['Месси.', []]);
});

test('a dictionary word with mark: false is recorded and checked but reaches the engine unmarked', () => {
  const r = run(`stress.use_lexicon({"золотой": {"say": "Золот+ой", "mark": False, "check": {"right": "a", "wrong": "b"}}})
print(json.dumps([stress.prepare("Это «Золотой мяч».", "upper", "auto"), stress.checks_for("Золотой")]))`);
  assert.equal(r[0][0], 'Это «Золотой мяч».');
  assert.deepEqual(r[0][1], [{ word: 'Золотой', stressed: 'Золот+ой', by: 'lexicon' }]);
  assert.deepEqual(r[1], { right: 'a', wrong: 'b' });
});
