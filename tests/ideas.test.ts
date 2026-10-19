import assert from 'node:assert/strict';
import { test } from 'node:test';
import { collectTrends, HttpError, rankIdeas } from '../src/ideas.ts';

const item = (id: string, evidence = 5) => ({ id, title: 'A topic', thesis: 'One claim', sources: ['https://www.ilo.org/'],
  ratings: { evidence, audience: 5, utility: 4, visual: 3, timeliness: 2, ease: 4 }, rationale: 'Editorial estimate, not audience data' });

test('idea ranking is explicit, stable, and validates the backlog', () => {
  const ranked = rankIdeas({ ideas: 1, audience: 'Founders', items: [item('b', 1), item('a')] });
  assert.deepEqual(ranked.items.map(i => i.id), ['a', 'b']);
  assert.equal(ranked.items[0]!.score, 83);
  assert.throws(() => rankIdeas({ ideas: 1, audience: 'Founders', items: [item('a'), item('a')] }), /duplicate idea id/);
  assert.throws(() => rankIdeas({ ideas: 1, audience: 'Founders', items: [item('a', 6)] }));
});

test('Wikipedia falls back only on unavailable days and records the actual UTC data date', async () => {
  const calls: string[] = [];
  const report = await collectTrends({ trends: 1, wikipedia: ['ru'], hackerNews: false, limit: 2 }, {
    now: new Date('2026-10-19T00:15:00Z'),
    fetchJson: async url => {
      calls.push(url);
      if (url.endsWith('/2026/10/18')) throw new HttpError(404, url);
      return { items: [{ articles: [
        { article: 'Заглавная_страница', views: 999, rank: 1 },
        { article: 'Искусственный_интеллект', views: 100, rank: 2 },
      ] }] };
    },
  });
  assert.equal(calls.length, 2);
  assert.equal(report.status, 'ok');
  assert.equal(report.sources[0]!.period, '2026-10-17');
  assert.equal(report.signals[0]!.metrics.views, 100);
  assert.equal(report.signals[0]!.title, 'Искусственный интеллект');
});

test('rate limits stay visible, with no fallback that disguises them as a missing day', async () => {
  let calls = 0;
  const report = await collectTrends({ trends: 1, wikipedia: ['en'], hackerNews: false }, {
    fetchJson: async url => { calls++; throw new HttpError(429, url); },
  });
  assert.equal(calls, 1);
  assert.equal(report.status, 'unavailable');
  assert.match(report.sources[0]!.error!, /HTTP 429/);
  assert.deepEqual(report.signals, []);
});

test('an unavailable source does not erase other signals; failed HN items are explicit', async () => {
  const report = await collectTrends({ trends: 1, wikipedia: ['ru'], hackerNews: true, limit: 3 }, {
    now: new Date('2026-10-19T08:00:00Z'),
    fetchJson: async url => {
      if (url.includes('wikimedia')) throw new HttpError(503, url);
      if (url.endsWith('topstories.json')) return [1, 2, 3];
      if (url.includes('/2.json')) throw new Error('timeout');
      if (url.includes('/3.json')) return { id: 3, type: 'story', deleted: true };
      return { id: 1, type: 'story', title: 'A useful tool', url: 'https://example.com/tool', score: 20, descendants: 3, time: 1 };
    },
  });
  assert.equal(report.status, 'partial');
  assert.equal(report.signals.length, 1);
  assert.equal(report.signals[0]!.metrics.points, 20);
  assert.match(report.sources[1]!.error!, /1\/3/);
});

test('missing HN metrics remain missing instead of becoming observed zeros', async () => {
  const report = await collectTrends({ trends: 1, wikipedia: [], hackerNews: true, limit: 1 }, {
    fetchJson: async url => url.endsWith('topstories.json') ? [7] : { id: 7, type: 'story', title: 'No metrics yet' },
  });
  assert.deepEqual(report.signals[0]!.metrics, {});
});
