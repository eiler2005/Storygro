import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { REEL_ROOT } from './tools.ts';

export interface FileEntry {
  path: string;
  bytes: number;
  sha256: string;
}

export function fileEntry(file: string, root: string): FileEntry {
  return {
    path: relative(root, file),
    bytes: statSync(file).size,
    sha256: createHash('sha256').update(readFileSync(file)).digest('hex'),
  };
}

/** Storygro version and commit that produced an output; `dirty` when the checkout had local edits. */
export function engineVersion(): { name: string; version: string; commit: string | null; dirty: boolean | null } {
  const pkg = JSON.parse(readFileSync(join(REEL_ROOT, 'package.json'), 'utf8')) as { name: string; version: string };
  const git = (...args: string[]) => {
    try {
      return execFileSync('git', ['-C', REEL_ROOT, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    } catch {
      return null;
    }
  };
  const commit = git('rev-parse', 'HEAD');
  const status = commit === null ? null : git('status', '--porcelain', '--', 'src', 'runtime', 'scenes', 'py');
  return { name: pkg.name, version: pkg.version, commit, dirty: status === null ? null : status.length > 0 };
}
