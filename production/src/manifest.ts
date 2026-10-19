import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { PROJECT_ROOT } from './tools.ts';

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
  const pkg = JSON.parse(readFileSync(join(PROJECT_ROOT, 'package.json'), 'utf8')) as { name: string; version: string };
  // a stale git first on PATH (e.g. an x86 build without Rosetta) must not hide the commit
  const git = (...args: string[]) => {
    for (const bin of ['git', '/usr/bin/git', '/opt/homebrew/bin/git']) {
      try {
        return execFileSync(bin, ['-C', PROJECT_ROOT, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
      } catch {}
    }
    return null;
  };
  const commit = git('rev-parse', 'HEAD') ?? headFromDotGit();
  const status = git('status', '--porcelain', '--', 'production');
  return { name: pkg.name, version: pkg.version, commit, dirty: status === null ? null : status.length > 0 };
}

/** The checked-out commit read from .git without running git. */
function headFromDotGit(): string | null {
  try {
    const dir = join(PROJECT_ROOT, '.git');
    const head = readFileSync(join(dir, 'HEAD'), 'utf8').trim();
    if (!head.startsWith('ref: ')) return head;
    const ref = head.slice(5);
    try {
      return readFileSync(join(dir, ref), 'utf8').trim();
    } catch {
      const packed = readFileSync(join(dir, 'packed-refs'), 'utf8');
      return packed.split('\n').find((l) => l.endsWith(` ${ref}`))?.split(' ')[0] ?? null;
    }
  } catch {
    return null;
  }
}
