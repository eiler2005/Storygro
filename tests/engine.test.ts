import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { test, type TestContext } from 'node:test';
import { stringify } from 'yaml';
import { approval, approve } from '../src/board.ts';
import { serve } from '../src/serve.ts';
import { captionText, loadSpec } from '../src/spec.ts';
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
