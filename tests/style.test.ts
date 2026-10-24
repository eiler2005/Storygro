import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { test } from 'node:test';
import { specInputs } from '../production/src/board.ts';
import { generateImages, imageJobs, styleImages } from '../production/src/images.ts';
import { loadSpec } from '../production/src/spec.ts';
import { applyStyle, expandCast, listStyles, loadStyle, scaffold, shotPrompt } from '../production/src/style.ts';
import { buildTimeline } from '../production/src/timeline.ts';
import { parsePastedTranscript, transcriptStats } from '../production/src/transcript.ts';

const root = resolve(import.meta.dirname, '..');
const cartoonEpisode = join(root, 'content/videos/ai-buys-work-knowledge/en.reel.yaml');

test('every style in production/styles loads, with a theme and a template', () => {
  const styles = listStyles();
  assert.deepEqual(styles.map((s) => s.def.id), ['cartoon', 'cut-paper', 'editorial-collage', 'kinetic-type']);
  for (const s of styles) assert.ok(readFileSync(join(s.dir, 'template.reel.yaml'), 'utf8').includes(`style: ${s.def.id}`));
});

test('a reel overrides style defaults; objects merge one level deep; the theme falls back to the style', () => {
  const style = loadStyle('cartoon');
  const merged = applyStyle({ reel: 1, music: { gain: 0.3 }, captions: { show: false } }, style);
  assert.equal((merged.music as { gain: number; bpm: number }).gain, 0.3);
  assert.equal((merged.music as { gain: number; bpm: number }).bpm, 92);
  assert.deepEqual(merged.captions, { show: false, maxWords: 4 });
  assert.ok(String(merged.theme).endsWith(join('production', 'styles', 'cartoon', 'theme.css')));
  assert.equal(applyStyle({ theme: 'mine.css' }, style).theme, 'mine.css');
});

test('a styled reel loads with the style applied, serves its theme from /rc/ and hashes style.yaml', async () => {
  const l = loadSpec(cartoonEpisode);
  assert.equal(l.style?.def.id, 'cartoon');
  assert.equal(l.spec.format.width, 1920);
  assert.equal(l.spec.voice.engine, 'qwen3');
  assert.equal(l.spec.captions.maxWords, 4);
  const tl = await buildTimeline(l, { voice: false });
  assert.equal(tl.theme, '/rc/styles/cartoon/theme.css');
  assert.ok(specInputs(l).includes(l.style!.path));
});

test('shot prompts expand the cast and keep stable seeds; unknown names fail', () => {
  const l = loadSpec(cartoonEpisode);
  const jobs = imageJobs(l);
  assert.equal(jobs.length, new Set(jobs.map((j) => j.file)).size);
  const hook = jobs.find((j) => j.file === 'shots/hook-1.jpg')!;
  assert.match(hook.prompt, /procurement manager/);
  assert.match(hook.prompt, /^Flat comic book illustration/);
  assert.doesNotMatch(hook.prompt, /@maria/);
  assert.deepEqual(imageJobs(loadSpec(cartoonEpisode)).map((j) => j.seed), jobs.map((j) => j.seed));
  assert.ok(jobs.some((j) => j.side === 'split'));
  assert.throws(() => expandCast('@nobody waves', { host: 'a host' }), /@nobody/);
  assert.equal(shotPrompt(loadStyle('cartoon').def.images!, '@bot waves').includes('blue face screen'), true);
});

test('a reel can override the picture size of its style, for a vertical cut', (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'storygro-size-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const project = join(dir, 'vertical-cartoon');
  scaffold(project, loadStyle('cartoon'), { title: 'Vertical' });
  const spec = join(project, 'en.reel.yaml');
  writeFileSync(spec, readFileSync(spec, 'utf8').replace(/^  seed: 7$/m, '  seed: 7\n  width: 720\n  height: 1280'));
  const l = loadSpec(spec);
  assert.deepEqual([styleImages(l).width, styleImages(l).height], [720, 1280]);
  assert.deepEqual([styleImages(loadSpec(cartoonEpisode)).width, styleImages(loadSpec(cartoonEpisode)).height], [1280, 720]);
  writeFileSync(spec, readFileSync(spec, 'utf8').replace('width: 720', 'width: 721'));
  assert.throws(() => loadSpec(spec));
});

test('new <folder> --style scaffolds a project that loads', (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'storygro-style-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const project = join(dir, 'my-first-cartoon');
  scaffold(project, loadStyle('cartoon'), { title: 'My first cartoon' });
  const l = loadSpec(join(project, 'en.reel.yaml'));
  assert.equal(l.spec.title, 'My first cartoon');
  assert.equal(imageJobs(l).length, 4);
  assert.throws(() => scaffold(project, loadStyle('cartoon')), /not empty/);
});

test('a kinetic-type project scaffolds and builds: dark tokens, captions off, motion blur on', async (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'storygro-style-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const project = join(dir, 'words');
  scaffold(project, loadStyle('kinetic-type'), { title: 'Words', lang: 'en' });
  const l = loadSpec(join(project, 'en.reel.yaml'));
  const tl = await buildTimeline({ ...l, spec: { ...l.spec, voice: { ...l.spec.voice, engine: 'none' } } }, { voice: false });
  assert.equal(tl.blur, 4);
  assert.equal(tl.captions.show, false);
  assert.deepEqual(tl.scenes.map((s) => s.module), ['/rc/scenes/kinetic.js', '/rc/scenes/process.js', '/rc/scenes/scale.js', '/rc/scenes/kinetic.js']);
  assert.match(tl.theme ?? '', /styles\/kinetic-type\/theme\.css$/);
});

test('an episode can replace the picture prompt of its style, which must keep {subject}', (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'storygro-style-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const path = join(dir, 'reel.yaml');
  const shot = { id: 'a', scene: 'illustration', props: { shots: [{ image: 'shots/a.jpg', prompt: '@kid waves' }] } };
  writeFileSync(path, `reel: 1\nstyle: cartoon\ntitle: x\nimages: { prompt: 'Picture book. {subject}. No text.', cast: { kid: a girl } }\nscenes: [${JSON.stringify(shot)}]\n`);
  const l = loadSpec(path);
  assert.equal(imageJobs(l)[0]!.prompt, 'Picture book. a girl waves. No text.');
  writeFileSync(path, readFileSync(path, 'utf8').replace('{subject}', 'nothing'));
  assert.throws(() => loadSpec(path), /must contain \{subject\}/);
});

test('the manual provider writes every missing prompt to prompts.md instead of generating', async (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'storygro-manual-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const project = join(dir, 'by-hand');
  scaffold(project, loadStyle('cartoon'));
  const spec = join(project, 'en.reel.yaml');
  writeFileSync(spec, readFileSync(spec, 'utf8').replace('  seed: 7\n', '  seed: 7\n  provider: manual\n'));
  await assert.rejects(generateImages(loadSpec(spec), { log: () => {} }), /4 picture\(s\) to make by hand/);
  const md = readFileSync(join(project, 'prompts.md'), 'utf8');
  assert.match(md, /## shots\/hook-1\.jpg — missing/);
  assert.match(md, /mustard cardigan/);
});

test('a pasted transcript becomes timed segments; page chrome is dropped', () => {
  const text = '0:00\nWhat if I told you\n0:02\nthat it costs $5,000?\n1:01:05\nlate line.\n\nAll videos\n\nRelated\n56:00\n';
  const segs = parsePastedTranscript(text);
  assert.deepEqual(segs.map((s) => s.start), [0, 2, 3665]);
  assert.equal(segs[0]!.end, 2);
  assert.equal(segs[1]!.text, 'that it costs $5,000?');
  const st = transcriptStats(segs);
  assert.equal(st.words, 11);
  assert.equal(st.questions.length, 1);
  assert.deepEqual(st.numbers.map((n) => n.text), ['$5,000']);
});

test('a transcript file with no timestamps is refused by the parser result', () => {
  const dir = mkdtempSync(join(tmpdir(), 'storygro-tr-'));
  try {
    writeFileSync(join(dir, 'x.txt'), 'just text\nno times\n');
    assert.deepEqual(parsePastedTranscript(readFileSync(join(dir, 'x.txt'), 'utf8')), []);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('an episode can switch its pictures to the codex provider with its own model and licence', (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'storygro-style-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const path = join(dir, 'reel.yaml');
  writeFileSync(path, `reel: 1\nstyle: cartoon\ntitle: x\nimages: { provider: codex, model: gpt-6-astra, width: 1088, height: 1920 }\nscenes: [{ id: a, scene: illustration, props: { shots: [{ image: shots/a.jpg, prompt: 'a ball' }] } }]\n`);
  const images = styleImages(loadSpec(path));
  assert.equal(images.provider, 'codex');
  assert.equal(images.model, 'gpt-6-astra');
  assert.equal(images.base, undefined);
  assert.match(images.licence ?? '', /Codex image tool|OpenAI/);
  assert.equal(images.width, 1088);
});
