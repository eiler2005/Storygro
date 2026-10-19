import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
// Browser-independent Node script also runs as the hook/CI entry point.
// @ts-expect-error JavaScript module has no declarations.
import { checkIndex, gitExecutable, mediaProblem } from '../production/scripts/check-git-media.mjs';

test('public Git rejects generated media by type and large blobs by size', () => {
  assert.match(mediaProblem('clip.MP4', 1), /outside Git/);
  assert.match(mediaProblem('voice.wav', 1), /outside Git/);
  assert.match(mediaProblem('demo.gif', 1), /outside Git/);
  assert.match(mediaProblem('data.txt', 1048577), /1 MiB/);
  assert.match(mediaProblem('docs/media/preview.png', 307201), /300 KiB/);
  assert.match(mediaProblem('episode/.reel/voice.json', 1), /output\/cache/);
  assert.equal(mediaProblem('production/scenes/collage.js', 5000), null);
  assert.equal(mediaProblem('content/videos/topic/assets/font.ttf', 778272), null);
  assert.equal(mediaProblem('content/videos/topic/preview/strip.jpg', 200000), null);
});

test('the guard checks staged blobs even if the working copy is small or deleted', t => {
  const dir = mkdtempSync(join(tmpdir(), 'storygro-media-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const git = (...args: string[]) => execFileSync(gitExecutable(), args, { cwd: dir, stdio: 'pipe' });
  git('init', '-q');
  writeFileSync(join(dir, 'blob.txt'), Buffer.alloc(1048577, 'x'));
  writeFileSync(join(dir, 'clip.mp4'), 'small but prohibited');
  git('add', 'blob.txt', 'clip.mp4');
  writeFileSync(join(dir, 'blob.txt'), 'small unstaged replacement');
  rmSync(join(dir, 'clip.mp4'));
  const problems = checkIndex(dir);
  assert.deepEqual(problems.map((p: { path: string }) => p.path).sort(), ['blob.txt', 'clip.mp4']);
  assert.equal(problems.find((p: { path: string }) => p.path === 'blob.txt').bytes, 1048577);
  git('rm', '--cached', 'clip.mp4');
  git('add', 'blob.txt');
  assert.deepEqual(checkIndex(dir), []);
});
