import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test, type TestContext } from 'node:test';
import { stringify } from 'yaml';
import { approve, approval } from '../production/src/board.ts';
import { loadSpec } from '../production/src/spec.ts';
import { buildTimeline, sceneVoice } from '../production/src/timeline.ts';

function fixture(t: TestContext, scenes: unknown[]) {
  const dir = mkdtempSync(join(tmpdir(), 'storygro-narration-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const file = join(dir, 'reel.yaml');
  writeFileSync(file, stringify({ reel: 1, title: 'Reviewed narration', voice: { engine: 'omnivoice', model: 'k2-fsa/OmniVoice', voice: 'narrator.wav', speed: .96, stress: 'marks' }, scenes }));
  return { dir, file };
}

test('a reviewed clip and a slower closing line retain the narrator in other scenes', t => {
  const { file } = fixture(t, [
    { id: 'body', scene: 'illustration' },
    { id: 'name', scene: 'illustration', voice: { source: 'name.wav' } },
    { id: 'ending', scene: 'illustration', voice: { speed: .82 } },
  ]);
  const l = loadSpec(file), [body, name, ending] = l.spec.scenes.map(s => sceneVoice(l, s));
  assert.deepEqual(body, l.spec.voice);
  assert.equal(name!.engine, 'audio'); assert.equal(name!.voice, 'name.wav'); assert.equal(name!.speed, 1); assert.equal(name!.model, undefined);
  assert.equal(ending!.engine, 'omnivoice'); assert.equal(ending!.voice, 'narrator.wav'); assert.equal(ending!.speed, .82);
  assert.equal(l.spec.voice.speed, .96);
});

test('replacing a reviewed narration clip resets storyboard approval', t => {
  const { dir, file } = fixture(t, [{ id: 'name', scene: 'illustration', voice: { source: 'name.wav' } }]);
  writeFileSync(join(dir, 'name.wav'), 'first source bytes');
  const l = loadSpec(file); approve(l, 'agent', 'agent'); assert.equal(approval(l).approved, true);
  writeFileSync(join(dir, 'name.wav'), 'corrected source bytes');
  assert.equal(approval(l).approved, false);
});

test('a missing narration source fails before calling a synthesis provider', async t => {
  const { file } = fixture(t, [{ id: 'name', scene: 'illustration', say: 'A name.', voice: { source: 'missing.wav' } }]);
  await assert.rejects(buildTimeline(loadSpec(file)), /name: narration source missing/);
});

test('a scene rejects an empty clip path or a nonpositive pace', t => {
  for (const voice of [{ source: '' }, { speed: 0 }, { speed: -1 }]) {
    const { file } = fixture(t, [{ id: 'bad', scene: 'illustration', voice }]);
    assert.throws(() => loadSpec(file));
  }
});

test('an imported clip requires its transcript and cannot duplicate audio through pause splitting', async t => {
  for (const [say, expected] of [['', /needs its transcript/], ['A {+1} name.', /already timed/]] as const) {
    const { file } = fixture(t, [{ id: 'name', scene: 'illustration', say, voice: { source: 'name.wav' } }]);
    await assert.rejects(buildTimeline(loadSpec(file)), expected);
  }
});
