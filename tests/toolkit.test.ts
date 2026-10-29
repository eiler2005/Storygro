import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { test } from 'node:test';
import { listStyles } from '../production/src/style.ts';
import { loadToolkit, TOOLKIT_DOC, toolkitMarkdown } from '../production/src/toolkit.ts';

const root = resolve(import.meta.dirname, '..');
const toolkit = loadToolkit();

test('every CLI command is in the toolkit, and the toolkit names no command that does not exist', () => {
  const cli = readFileSync(join(root, 'production/src/cli.ts'), 'utf8');
  const help = cli.slice(cli.indexOf('const HELP'), cli.indexOf('`;', cli.indexOf('const HELP')));
  const commands = new Set([...help.matchAll(/storygro ([a-z][a-z-]*)/g)].map((m) => m[1]!));
  commands.add('help');
  const used = new Set(toolkit.entries.flatMap((e) => e.commands));
  assert.deepEqual([...commands].filter((c) => !used.has(c)), [], 'commands missing from production/toolkit.yaml');
  assert.deepEqual([...used].filter((c) => !commands.has(c)), [], 'toolkit names unknown commands');
});

test('every style and every scene module is in the toolkit', () => {
  const styles = listStyles().map((s) => s.def.id).sort();
  assert.deepEqual(toolkit.entries.filter((e) => e.kind === 'style').map((e) => e.style).sort(), styles);
  const scenes = readdirSync(join(root, 'production/scenes')).filter((f) => f.endsWith('.js')).map((f) => f.slice(0, -3)).sort();
  assert.deepEqual(toolkit.entries.flatMap((e) => e.scenes).sort(), scenes);
});

test('every docs and example path in the toolkit exists', () => {
  for (const e of toolkit.entries)
    for (const p of [e.docs, ...e.examples]) assert.ok(existsSync(join(root, p.split('#')[0]!)), `${e.id}: ${p} does not exist`);
});

test('docs/reference/toolkit.md is generated from the current toolkit (npm run docs:toolkit)', () => {
  assert.equal(readFileSync(TOOLKIT_DOC, 'utf8'), toolkitMarkdown(toolkit));
});
