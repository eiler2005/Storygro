// Baseline: Storygro's own DOM/CDP capture of the SAME hook scene, on the same machine.
// Calls src/render.ts frames()/stills() directly with a read-only timeline.json and writes only into this folder.
// It does NOT run `storygro render` and cannot touch examples/ai-jobs/.reel outputs.
// Run from the repo root:  node_modules/.bin/tsx experiments/hyperframes-pilot/storygro-baseline/run.ts
import { mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { frames, stills } from '../../../src/render.ts';
import { loadSpec } from '../../../src/spec.ts';
import type { Timeline } from '../../../src/timeline.ts';

const here = dirname(fileURLToPath(import.meta.url));
const l = loadSpec(join(here, '../../../examples/ai-jobs/ru.reel.yaml'));
const tl = JSON.parse(readFileSync(join(l.dir, '.reel/ru/timeline.json'), 'utf8')) as Timeline;
const hook = (tl.scenes as { id: string; end: number }[])[0];
console.log(`scene ${hook.id}: 0..${hook.end}s, ${tl.width}x${tl.height}@${tl.fps}`);

const tag = process.argv[2] ?? 'run1';
const out = join(here, `hook-silent-${tag}.mp4`);
const t0 = Date.now();
await frames(l, tl, { out, from: 0, to: hook.end });
console.log(`frames() wall: ${((Date.now() - t0) / 1000).toFixed(2)} s  -> ${out}`);

if (tag === 'run1') {
  mkdirSync(join(here, 'frames'), { recursive: true });
  const t1 = Date.now();
  await stills(l, tl, { 'sg-0.30s': 9 / 30, 'sg-next+0.8s': 140 / 30, 'sg-mid-marker': 147 / 30, 'sg-end': 193 / 30 }, join(here, 'frames'));
  console.log(`stills() wall: ${((Date.now() - t1) / 1000).toFixed(2)} s`);
}
