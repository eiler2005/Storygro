import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
// @ts-expect-error JavaScript module has no declarations.
import { anchors, brokenLinks } from '../production/scripts/check-doc-links.mjs';
// @ts-expect-error JavaScript module has no declarations.
import { gitExecutable } from '../production/scripts/check-git-media.mjs';

test('heading anchors follow GitHub slugs, including Cyrillic and repeats', () => {
  const a = anchors('# Title\n## 9. Brand profile and series\n## Где проверять\n## Title\n```\n## not a heading\n```');
  assert.ok(a.has('9-brand-profile-and-series'));
  assert.ok(a.has('где-проверять'));
  assert.ok(a.has('title-1'));
  assert.ok(!a.has('not-a-heading'));
});

test('relative links must resolve; URLs and narration markup are ignored', (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'storygro-links-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  execFileSync(gitExecutable(), ['init', '-q'], { cwd: dir });
  mkdirSync(join(dir, 'docs'));
  writeFileSync(join(dir, 'docs/a.md'), '# A\n## Part\n');
  writeFileSync(
    join(dir, 'README.md'),
    '[ok](docs/a.md#part) [gone](docs/b.md) [bad](docs/a.md#nope) [web](https://example.com) [11%](=eleven percent)\n',
  );
  const problems = brokenLinks(dir) as { target: string; reason: string }[];
  assert.deepEqual(
    problems.map((p) => `${p.target} ${p.reason}`),
    ['docs/b.md missing file', 'docs/a.md#nope missing heading'],
  );
});
