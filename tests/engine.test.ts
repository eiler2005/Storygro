import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { test, type TestContext } from 'node:test';
import { stringify } from 'yaml';
import { approval, approve } from '../src/board.ts';
import { serve } from '../src/serve.ts';
import { captionText, loadSpec, spokenText } from '../src/spec.ts';
import { subtitleCues, toSrt, toVtt } from '../src/subtitles.ts';
import { buildTimeline, resolveAt, workDir } from '../src/timeline.ts';

const root = resolve(import.meta.dirname, '..');
const example = join(root, 'examples/slidecraft-launch/reel.yaml');

function fixture(t: TestContext, extra: Record<string, unknown> = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'storygro-test-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const path = join(dir, 'reel.yaml');
  writeFileSync(path, stringify({
    reel: 1, title: 'Test explanation', voice: { engine: 'none' },
    scenes: [{ id: 'intro', scene: 'statement', say: 'One idea.' }], ...extra,
  }));
  return { dir, path };
}

test('the transferred launch script binds its bundled facts without SlideCraft', async () => {
  const l = loadSpec(example);
  const tl = await buildTimeline(l, { voice: false });
  const facts = JSON.parse(readFileSync(join(l.dir, 'assets/facts.json'), 'utf8'));
  assert.equal(tl.scenes.length, 11);
  assert.equal(tl.width, 1920);
  assert.equal(tl.height, 1080);
  assert.deepEqual(tl.scenes.find(s => s.id === 'build')?.props.images, facts.slides);
  assert.equal(tl.scenes[0]?.module, '/spec/scenes/night.js');
  assert.equal(tl.scenes.find(s => s.id === 'intro')?.module, '/rc/scenes/logo-reveal.js');
  assert.ok(tl.duration > 0);
  assert.ok(tl.scenes.every(s => s.wav === null && s.end > s.start));
});

test('runtime, all built-in scenes, custom scenes and bundled assets are served locally', async t => {
  const l = loadSpec(example);
  const tl = await buildTimeline(l, { voice: false });
  const { server, origin } = await serve(l.dir);
  t.after(() => new Promise<void>((done, reject) => {
    server.close(err => err ? reject(err) : done());
    server.closeAllConnections();
  }));
  function files(dir: string, prefix: string): string[] {
    return readdirSync(dir, { withFileTypes: true }).flatMap(entry =>
      entry.isDirectory() ? files(join(dir, entry.name), `${prefix}/${entry.name}`) : [`${prefix}/${entry.name}`]);
  }
  const paths = new Set([
    '/rc/runtime/index.html', '/rc/runtime/player.js', '/rc/runtime/kit.js',
    ...files(join(root, 'scenes'), '/rc/scenes'),
    ...tl.scenes.map(s => s.module), tl.theme!, tl.overlay!,
    ...files(join(l.dir, 'assets'), '/spec/assets'),
  ]);
  for (const path of paths) {
    const response = await fetch(`${origin}${path}`);
    assert.equal(response.status, 200, path);
    assert.ok((await response.arrayBuffer()).byteLength > 0, path);
  }
  const html = await (await fetch(`${origin}/rc/runtime/index.html`)).text();
  assert.match(html, /Storygro player/);
});

test('duplicate scene IDs are rejected before production', t => {
  const { path } = fixture(t, { scenes: [
    { id: 'same', scene: 'statement' }, { id: 'same', scene: 'statement' },
  ] });
  assert.throws(() => loadSpec(path), /duplicate scene id: same/);
});

test('missing facts fail instead of silently producing an empty prop', async t => {
  const { path } = fixture(t, { scenes: [
    { id: 'intro', scene: 'stack', props: { itemsFrom: 'facts.missing' } },
  ] });
  await assert.rejects(buildTimeline(loadSpec(path), { voice: false }), /facts.missing is not in the data/);
});

test('pauses, cue markers, sound effects and still references keep the same time', async t => {
  const { path } = fixture(t, { scenes: [{
    id: 'intro', scene: 'statement', say: '{#before}One {+1.5}{#after}two', pad: [0.2, 0.4],
    sfx: [{ at: 'after', kind: 'pop' }],
  }] });
  const tl = await buildTimeline(loadSpec(path), { voice: false });
  const s = tl.scenes[0]!;
  assert.equal(s.cues.before, 0.2);
  assert.ok(Math.abs(s.cues.after! - (s.words[0]!.end + 0.05 + 1.5)) < 1e-9);
  assert.equal(s.sfx[0]!.t, s.start + s.cues.after!);
  assert.equal(resolveAt(tl.scenes, 'intro@after'), s.sfx[0]!.t);
  assert.equal(captionText(loadSpec(path).spec.scenes[0]!), 'One two');
});

test('unknown sound-effect cues are rejected', async t => {
  const { path } = fixture(t, { scenes: [{
    id: 'intro', scene: 'statement', say: 'Hello', sfx: [{ at: 'missing', kind: 'pop' }],
  }] });
  await assert.rejects(buildTimeline(loadSpec(path), { voice: false }), /unknown cue "missing"/);
});

test('editing source facts or the script invalidates an existing approval', t => {
  const { dir, path } = fixture(t, { data: { facts: 'facts.json' } });
  const facts = join(dir, 'facts.json');
  writeFileSync(facts, '{"count":1}');
  const l = loadSpec(path);
  mkdirSync(workDir(l));
  assert.equal(approval(l).approved, false);
  approve(l, 'test');
  assert.equal(approval(l).approved, true);
  writeFileSync(facts, '{"count":2}');
  assert.equal(approval(l).approved, false);
  approve(l, 'test');
  writeFileSync(path, readFileSync(path, 'utf8').replace('One idea.', 'Another idea.'));
  assert.equal(approval(loadSpec(path)).approved, false);
});

test('language variants share a folder but get their own work directory and output name', t => {
  const { dir } = fixture(t);
  const ru = join(dir, 'ru.reel.yaml');
  writeFileSync(ru, stringify({ reel: 1, title: 'RU', lang: 'ru', voice: { engine: 'none' }, scenes: [{ id: 'a', scene: 'statement', say: 'Один.' }] }));
  const base = loadSpec(join(dir, 'reel.yaml'));
  const l = loadSpec(ru);
  assert.equal(base.variant, '');
  assert.equal(workDir(base), join(dir, '.reel'));
  assert.equal(l.variant, 'ru');
  assert.equal(workDir(l), join(dir, '.reel', 'ru'));
  assert.match(l.name, /-ru$/);
});

test('vertical format gets the vertical safe area, scaled to the stage width', async t => {
  const { path } = fixture(t, { format: { preset: 'vertical' } });
  const tl = await buildTimeline(loadSpec(path), { voice: false });
  assert.equal(tl.width, 1080);
  assert.equal(tl.height, 1920);
  assert.equal(tl.safe.profile, 'vertical');
  assert.ok(tl.safe.bottom > tl.safe.top && tl.safe.right >= tl.safe.left);
  const { path: p2 } = fixture(t, { format: { width: 540, height: 960 }, safe: 'shorts' });
  const half = await buildTimeline(loadSpec(p2), { voice: false });
  assert.equal(half.safe.profile, 'shorts');
  assert.equal(half.safe.right, 100); // 200 px on the 1080 reference
  const { path: p3 } = fixture(t, { safe: 'nonsense' });
  await assert.rejects(buildTimeline(loadSpec(p3), { voice: false }), /unknown safe-area profile/);
});

test('say-as hints keep the written form in captions and the spoken form for the voice', t => {
  const { path } = fixture(t, { scenes: [{ id: 'a', scene: 'statement', say: 'Упала на [11%](=одиннадцать процентов) {#x}в [ИИ](=и-и).' }] });
  const s = loadSpec(path).spec.scenes[0]!;
  assert.equal(captionText(s), 'Упала на 11% в ИИ.');
  assert.equal(spokenText(s), 'Упала на одиннадцать процентов в и-и.');
});

test('an unquoted comma that splits a YAML flow mapping is caught with a hint', t => {
  const dir = mkdtempSync(join(tmpdir(), 'storygro-test-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const path = join(dir, 'reel.yaml');
  writeFileSync(path, 'reel: 1\ntitle: x\nscenes:\n  - id: a\n    scene: outro\n    props:\n      cta: { text: Send this, to a friend, at: 1 }\n');
  assert.throws(() => loadSpec(path), /keys without values \("to a friend"\).*quote it/);
});

test('subtitles follow the caption phrases and timings', async t => {
  const { path } = fixture(t, { captions: { show: true, maxWords: 3 }, scenes: [{ id: 'a', scene: 'statement', say: 'One two three four. Five.' }] });
  const tl = await buildTimeline(loadSpec(path), { voice: false });
  const cues = subtitleCues(tl);
  assert.deepEqual(cues.map(c => c.text), ['One two three', 'four.', 'Five.']);
  assert.ok(cues.every((c, i) => c.end > c.start && (i === 0 || c.start >= cues[i - 1]!.start)));
  assert.match(toSrt(cues), /^1\n00:00:00,\d{3} --> 00:00:0\d,\d{3}\nOne two three\n/);
  assert.match(toVtt(cues), /^WEBVTT\n\n00:00:00\.\d{3} --> /);
});

test('approval covers scene code, theme and assets, not only the script', t => {
  const { dir, path } = fixture(t, {
    theme: 'theme.css',
    scenes: [{ id: 'a', scene: 'scenes/custom.js', props: { image: 'assets/pic.png' } }],
  });
  mkdirSync(join(dir, 'scenes'));
  mkdirSync(join(dir, 'assets'));
  writeFileSync(join(dir, 'theme.css'), ':root{}');
  writeFileSync(join(dir, 'scenes/custom.js'), 'export default {}');
  writeFileSync(join(dir, 'assets/pic.png'), 'a');
  const l = loadSpec(path);
  mkdirSync(workDir(l));
  approve(l, 'test');
  assert.equal(approval(l).approved, true);
  for (const [file, text] of [['assets/pic.png', 'b'], ['scenes/custom.js', 'export default {mount(){}}'], ['theme.css', ':root{--x:1}']] as const) {
    writeFileSync(join(dir, file), text);
    assert.equal(approval(loadSpec(path)).approved, false, file);
    approve(loadSpec(path), 'test');
  }
});
