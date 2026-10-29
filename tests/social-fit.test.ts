import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fitFilter, fitFrame, socialTargets } from '../production/src/social-fit.ts';

test('complete portrait and landscape frames fit inside every social target without cropping', () => {
  for (const target of Object.values(socialTargets())) {
    for (const [width, height] of [[1080, 1920], [1920, 1080], [1080, 1080], [1080, 1350]]) {
      const f = fitFrame(width!, height!, target);
      assert.ok(f.x >= target.left && f.y >= target.top);
      assert.ok(f.x + f.width <= target.width - target.right);
      assert.ok(f.y + f.height <= target.height - target.bottom);
      assert.equal(f.width % 2, 0);
      assert.equal(f.height % 2, 0);
      assert.ok(Math.abs(f.width / f.height - width! / height!) < 0.005, 'rounding must not distort the picture');
    }
  }
  const filter = fitFilter(1080, 1920, socialTargets().reels!, '#13294b');
  assert.ok(!filter.includes('crop'));
});

test('invalid geometry and filter input fail before encoding', () => {
  const t = socialTargets().reels!;
  assert.throws(() => fitFrame(0, 1920, t));
  assert.throws(() => fitFrame(1080, 1920, { ...t, left: 1080 }));
  assert.throws(() => fitFrame(1080, 1920, { ...t, height: 1919 }));
  assert.throws(() => fitFilter(1080, 1920, t, 'red,crop=100:100'));
});
