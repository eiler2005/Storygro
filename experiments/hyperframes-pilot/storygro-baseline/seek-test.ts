// Out-of-order seek test for Storygro's DOM/CDP player: the same four moments captured in two different
// orders (each in a fresh Chrome tab), PNG bytes compared. Output goes to a scratch dir passed as argv[2].
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { stills } from '../../../production/src/render.ts';
import { loadSpec } from '../../../production/src/spec.ts';
import type { Timeline } from '../../../production/src/timeline.ts';

const here = dirname(fileURLToPath(import.meta.url));
const scratch = process.argv[2];
const l = loadSpec(join(here, '../../../examples/ai-jobs/ru.reel.yaml'));
const tl = JSON.parse(readFileSync(join(l.dir, '.reel/ru/timeline.json'), 'utf8')) as Timeline;
const A = { 't6.4': 6.4, 't0.3': 0.3, 't4.9': 4.9, 't3.95': 3.95 };
const B = { 't4.9': 4.9, 't3.95': 3.95, 't6.4': 6.4, 't0.3': 0.3 };
await stills(l, tl, A, join(scratch, 'a'));
await stills(l, tl, B, join(scratch, 'b'));
await stills(l, tl, A, join(scratch, 'a2')); // same order again: separates run-to-run raster noise from order dependence
const h = (d: string, n: string) => createHash('md5').update(readFileSync(join(scratch, d, `${n}.png`))).digest('hex');
for (const n of Object.keys(A)) console.log(n, 'A vs B (order changed):', h('a', n) === h('b', n) ? 'identical' : 'DIFFERENT', '| A vs A (same order, fresh tab):', h('a', n) === h('a2', n) ? 'identical' : 'DIFFERENT');
