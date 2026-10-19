import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Brand, brandFindings, loadBrand, Series } from '../production/src/brand.ts';
import { loadSpec, type LoadedSpec } from '../production/src/spec.ts';

const brand = Brand.parse({
  brand: 1, name: 'T', audience: 'a', languages: ['ru'],
  disclosure: { ru: { mustMention: ['синтез'] } },
  avoid: [{ phrase: 'революц', reason: 'hype' }],
});
const spec = (say: string, post?: string, props: Record<string, unknown> = {}) =>
  ({ spec: { lang: 'ru', scenes: [{ id: 'hook', say, props }], post: post === undefined ? undefined : { text: post, tags: [] } } }) as unknown as LoadedSpec;

test('brand: avoided phrases are found in narration and on-screen props, case- and ё-insensitive', () => {
  const f = brandFindings(brand, spec('Это Революция в работе', 'Голос синтезирован.', { lines: ['ещё одна революция'] }));
  assert.equal(f.ok, false);
  assert.equal(f.problems.length, 2);
  assert.match(f.problems[0]!, /hook narration/);
  assert.match(f.problems[1]!, /hook on screen/);
});

test('brand: a post without the disclosure fails, with it passes', () => {
  assert.equal(brandFindings(brand, spec('Спокойный текст', 'Источники ниже.')).ok, false);
  const ok = brandFindings(brand, spec('Спокойный текст', 'Голос синтезирован (Qwen3-TTS).'));
  assert.equal(ok.ok, true);
  assert.equal(ok.disclosure, 'post discloses the synthetic voice');
});

test('brand: the repository brand file and series files parse, and the produced episodes pass', () => {
  const b = loadBrand('content/brand.yaml');
  assert.ok(b.avoid.length > 0 && b.disclosure.ru);
  for (const v of ['ai-agent-checks', 'slidecraft-demo', 'future-of-work', 'micro1-work-data']) {
    const f = brandFindings(b, loadSpec(`content/videos/${v}/ru.reel.yaml`));
    assert.equal(f.ok, true, `${v}: ${f.problems.join('; ')}`);
  }
  assert.throws(() => Series.parse({ series: 1, id: 'Bad Id', title: 't', audience: 'a', format: 'f' }));
});
