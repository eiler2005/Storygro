import assert from 'node:assert/strict';
import { test } from 'node:test';
// Scene modules are browser-native JavaScript; these helpers have no DOM dependency.
// @ts-expect-error No declaration file for the scene module.
import { motionAt, validateLayers } from '../production/scenes/collage.js';

test('collage rejects missing assets, invalid geometry and unsupported layer kinds', () => {
  const image = { kind: 'image', x: 0, y: 0, w: 1, h: 1, src: 'assets/robot.png' };
  assert.equal(validateLayers([image])[0], image);
  assert.throws(() => validateLayers([]), /layers are required/);
  assert.throws(() => validateLayers([null]), /must be an object/);
  assert.throws(() => validateLayers([{ ...image, src: '' }]), /needs src/);
  assert.throws(() => validateLayers([{ ...image, w: 0 }]), /positive size/);
  assert.throws(() => validateLayers([{ ...image, x: NaN }]), /must be finite/);
  assert.throws(() => validateLayers([{ ...image, kind: 'video' }]), /unknown kind/);
  assert.throws(() => validateLayers([{ ...image, kind: 'panel', rows: [] }]), /needs rows/);
  assert.throws(() => validateLayers([{ ...image, kind: 'panel', rows: [{}] }]), /row 0 needs text/);
});

test('collage animation supports arbitrary backward seeking, including entrance and exit', () => {
  const times = [-2, 0, 1.1, 1.3, 2, 5, 5.1, 5.5];
  const sample = (t: number) => motionAt(t, 1, 5, 'right', -3, 2);
  const sequential = new Map(times.map(t => [t, sample(t)]));
  for (const t of [5.5, 1.3, -2, 5.1, 0, 5, 2, 1.1]) assert.deepEqual(sample(t), sequential.get(t));
  assert.equal(sample(0).opacity, 0);
  assert.equal(sample(2).opacity, 1);
  assert.equal(sample(2).x, 0);
  assert.equal(sample(5.5).opacity, 0);
  for (const t of times) for (const value of Object.values(sample(t))) assert.ok(Number.isFinite(value));
});
