import { execFileSync, spawnSync } from 'node:child_process';
import { chmodSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gitExecutable } from './check-git-media.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const git = gitExecutable();
const current = spawnSync(git, ['config', '--get', 'core.hooksPath'], { cwd: root, encoding: 'utf8' });
if (![0, 1].includes(current.status)) throw new Error(current.stderr || 'Cannot read Git hooks configuration');
if (current.stdout.trim() && current.stdout.trim() !== '.githooks') throw new Error(`Existing core.hooksPath=${current.stdout.trim()}; integrate the media guard there without replacing your hooks.`);
const localHook = resolve(root, '.git/hooks/pre-commit');
if (!current.stdout.trim() && existsSync(localHook)) throw new Error('An existing pre-commit hook is present; integrate the media guard without replacing it.');
chmodSync(resolve(root, '.githooks/pre-commit'), 0o755);
execFileSync(git, ['config', '--local', 'core.hooksPath', '.githooks'], { cwd: root });
console.log('Installed public-Git media guard (.githooks/pre-commit).');
