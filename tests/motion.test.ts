import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test, type TestContext } from 'node:test';
import { stringify } from 'yaml';
import { beatGrid as kitGrid, beats, spring, springs } from '../production/runtime/kit.js';
import { loadSpec } from '../production/src/spec.ts';
import { beatGrid, buildTimeline, snapToGrid } from '../production/src/timeline.ts';

function fixture(t: TestContext, extra: Record<string, unknown>) {
  const dir = mkdtempSync(join(tmpdir(), 'storygro-motion-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const path = join(dir, 'reel.yaml');
  writeFileSync(path, stringify({ reel: 1, title: 'Motion', voice: { engine: 'none' }, ...extra }));
  return path;
}

const close = (a: number, b: number, eps = 1e-9) => Math.abs(a - b) < eps;

test('a spring holds before release, settles on the target and overshoots only a little', () => {
  assert.equal(spring(0.9, 1, { from: 3, to: 7 }), 3);
  assert.equal(spring(1, 1, { from: 3, to: 7 }), 3);
  assert.ok(close(spring(3, 1, { from: 3, to: 7 }), 7, 1e-6));
  let peak = 0;
  for (let t = 0; t < 2; t += 1 / 240) peak = Math.max(peak, spring(t, 0));
  assert.ok(peak > 1.01 && peak < 1.05, `default overshoot ${peak}`);
  assert.ok(Math.abs(spring(0.5, 0) - 1) < 0.01, 'settled after half a second');
  for (let t = 0; t < 2; t += 1 / 240) assert.ok(spring(t, 0, { damping: 40 }) <= 1 + 1e-12, 'overdamped never overshoots');
  const crit = { stiffness: 100, damping: 20 };
  assert.ok(close(spring(0.2, 0, crit), 1 - (1 + 10 * 0.2) * Math.exp(-10 * 0.2)), 'critical damping in closed form');
  const bouncy = { stiffness: 300, damping: 8 };
  assert.ok(Math.max(...Array.from({ length: 200 }, (_, i) => spring(i / 200, 0, bouncy))) > 1.3);
});

test('a spring is a pure function of time: any order gives the same values', () => {
  const ts = Array.from({ length: 50 }, (_, i) => i * 0.037);
  const forward = ts.map((t) => spring(t, 0.2, { from: -5, to: 12 }));
  const backward = [...ts].reverse().map((t) => spring(t, 0.2, { from: -5, to: 12 })).reverse();
  assert.deepEqual(forward, backward);
});

test('springs that change target never jump', () => {
  const changes = [{ at: 0.5, to: 10 }, { at: 0.8, to: -4 }, { at: 1.4, to: 2 }];
  assert.equal(springs(0, 1, changes), 1);
  for (const c of changes) assert.ok(close(springs(c.at - 1e-6, 1, changes), springs(c.at + 1e-6, 1, changes), 1e-3), `at ${c.at}`);
  assert.ok(close(springs(5, 1, changes), 2, 1e-6));
});

test('the beat grid matches score.py in the runtime and in the timeline', () => {
  for (const [bpm, dropAt] of [[96, null], [104, 7.3], [120, 0], [110, 31.9]] as const) {
    const beat = 60 / bpm;
    const bar = beat * 4;
    const origin = dropAt === null ? 0 : (dropAt % bar) - bar; // score.py: music()
    const a = beatGrid({ bpm, dropAt });
    const b = kitGrid({ bpm, dropAt });
    assert.ok(close(a.origin, origin) && close(b.origin, origin) && close(a.beat, beat) && close(b.bar, bar), `${bpm} ${dropAt}`);
    if (dropAt !== null) assert.ok(close(snapToGrid(a, dropAt + 0.01, 4), dropAt), 'the drop is a downbeat');
  }
});

test('beat helpers work in scene seconds', () => {
  const grid = kitGrid({ bpm: 120, dropAt: 3 }); // beat 0.5 s, bars at −1, 1, 3 …
  const b = beats(grid, 10); // the scene starts at reel second 10
  assert.ok(close(grid.origin, -1));
  assert.ok(close(b.at(22), 0)); // reel −1 + 22 × 0.5 = 10
  assert.equal(b.index(0), 22);
  assert.ok(close(b.next(0.1), 0.5));
  assert.ok(close(b.next(0.5), 0.5));
  assert.ok(close(b.snap(0.2), 0));
  assert.ok(close(b.snap(0.3), 0.5));
  assert.ok(close(b.next(0.1, 4), 1)); // next bar: reel 11
  assert.ok(close(b.pulse(0), 1));
  assert.ok(b.pulse(0.2) < b.pulse(0.05) && b.pulse(0.49) < 0.1);
  assert.ok(close(b.pulse(0.5), 1, 1e-6));
});

test('sound effects with snap land on the music grid; others keep their cue time', async (t) => {
  const path = fixture(t, {
    music: { bpm: 120 },
    scenes: [{ id: 'a', scene: 'statement', say: 'One {#x}two three four five', pad: [0.37, 0.4],
      sfx: [{ at: 'voice', kind: 'pop', snap: 'beat' }, { at: 'voice', kind: 'tick' }, { at: 'x', kind: 'hit', snap: 'bar' }] }],
  });
  const tl = await buildTimeline(loadSpec(path), { voice: false });
  const [pop, tick, hit] = tl.scenes[0]!.sfx;
  assert.ok(close(pop!.t, 0.5));
  assert.ok(close(tick!.t, 0.37));
  assert.ok(close(hit!.t % 2, 0) || close(hit!.t % 2, 2));
  assert.ok(!('snap' in pop!), 'the written timeline has no snap field');
});

test('motion blur is off by default and travels from the format to the timeline', async (t) => {
  const plain = await buildTimeline(loadSpec(fixture(t, { scenes: [{ id: 'a', scene: 'statement' }] })), { voice: false });
  assert.equal(plain.blur, 1);
  const blurred = loadSpec(fixture(t, { format: { preset: 'vertical', blur: 4 }, scenes: [{ id: 'a', scene: 'statement' }] }));
  assert.equal(blurred.spec.format.blur, 4);
  assert.equal((await buildTimeline(blurred, { voice: false })).blur, 4);
  assert.throws(() => loadSpec(fixture(t, { format: { blur: 0 }, scenes: [{ id: 'a', scene: 'statement' }] })));
});
