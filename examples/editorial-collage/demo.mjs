// Illustrative fixture for the video, not a production email validator or a measured AI result.
import assert from 'node:assert/strict';

const buggy = _value => true;
const fixed = value => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
const cases = [
  { label: 'normal', input: 'person@example.com', expected: true },
  { label: 'empty', input: '', expected: false },
  { label: 'spaces', input: '   ', expected: false },
  { label: 'no-domain', input: 'person@', expected: false },
];
for (const example of cases) {
  assert.equal(fixed(example.input), example.expected, example.label);
  console.log(JSON.stringify({ case: example.label, expected: example.expected, before: buggy(example.input), after: fixed(example.input), illustrative: true }));
}
assert.equal(buggy(''), true); // the exact failure the video shows
