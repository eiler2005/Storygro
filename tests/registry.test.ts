import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { REGISTRY_DOC, registryMarkdown } from '../production/scripts/registry-doc.ts';

test('docs/reference/registry.md is generated from the current sources (npm run docs:registry)', () => {
  assert.equal(readFileSync(REGISTRY_DOC, 'utf8'), registryMarkdown());
});
