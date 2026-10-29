import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { stringify } from 'yaml';
import { embedImage, shapeVerdict, shortcode } from '../production/src/instagram.ts';
import { uploadNote } from '../production/src/package.ts';
import { loadSpec } from '../production/src/spec.ts';
import { buildTimeline } from '../production/src/timeline.ts';

test('post links of every kind give the shortcode', () => {
  assert.equal(shortcode('https://www.instagram.com/p/DfFzkZbhrdv/'), 'DfFzkZbhrdv');
  assert.equal(shortcode('https://www.instagram.com/smart_little_toons/reel/DfFzkZbhrdv/?igsh=x'), 'DfFzkZbhrdv');
  assert.equal(shortcode('instagram.com/reels/Ab-c_1/'), 'Ab-c_1');
  assert.throws(() => shortcode('https://example.com/p/x'), /not an Instagram post link/);
});

test('the embed page gives the full-size cover frame', () => {
  // shape of the public embed page on 29 October 2026
  const html = '<img class="EmbeddedMediaImage" alt="Instagram post shared by &#064;someone" src="https://scontent.cdninstagram.com/v/a.jpg?stp=dst-jpg_e15_tt6&amp;_nc_cat=103&amp;oh=1" srcset="x 640w" />';
  assert.equal(embedImage(html), 'https://scontent.cdninstagram.com/v/a.jpg?stp=dst-jpg_e15_tt6&_nc_cat=103&oh=1');
  assert.equal(embedImage('<html>deleted</html>'), null);
});

test('a stored square or 4:5 means the upload cropped the Reel', () => {
  assert.equal(shapeVerdict(1080, 1920).ok, true);
  const square = shapeVerdict(1080, 1080);
  assert.deepEqual([square.ok, square.ratio], [false, '1:1']);
  assert.match(square.note, /upload again as a Reel/);
  assert.deepEqual([shapeVerdict(1080, 1350).ratio, shapeVerdict(1080, 1350).ok], ['4:5', false]);
});

test('deliver writes upload steps for Reels in the episode language, nothing for other profiles', async (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'storygro-upload-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const spec = (name: string, extra: Record<string, unknown>) => {
    const path = join(dir, `${name}.reel.yaml`);
    writeFileSync(path, stringify({ reel: 1, title: 'T', voice: { engine: 'none' }, scenes: [{ id: 'a', scene: 'statement', say: 'One idea.' }], ...extra }));
    return loadSpec(path);
  };
  const ru = spec('ru', { lang: 'ru', format: { preset: 'vertical' }, safe: 'reels', stills: { cover: 'a@0' } });
  const note = uploadNote(ru, await buildTimeline(ru, { voice: false }))!;
  assert.match(note, /«Видео Reels»/);
  assert.match(note, /«Оригинал»/);
  assert.match(note, /-ru-cover\.png/);
  assert.match(note, /instagram-check/);
  const en = spec('en', { format: { preset: 'vertical' }, safe: 'reels' });
  assert.match(uploadNote(en, await buildTimeline(en, { voice: false }))!, /Reel[\s\S]*Original[\s\S]*the first frame/);
  const wide = spec('wide', {});
  assert.equal(uploadNote(wide, await buildTimeline(wide, { voice: false })), null);
});
