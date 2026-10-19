import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Backlog, collectTrends, HttpError, matchesFocus, momentum, parseGoogleTrendsRss, rankIdeas, trafficLowerBound, trendsMarkdown, watchIdeas } from '../production/src/ideas.ts';

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

const RSS = `<?xml version="1.0"?><rss><channel><title>Daily Search Trends</title>
<item><title>нейросети &amp; работа</title><ht:approx_traffic>2K+</ht:approx_traffic><pubDate>Mon, 19 Oct 2026 11:30:00 -0700</pubDate>
<ht:news_item><ht:news_item_title>Компании внедряют ИИ</ht:news_item_title><ht:news_item_url>https://example.com/a</ht:news_item_url><ht:news_item_source>Example</ht:news_item_source></ht:news_item></item>
<item><title>парма – торино</title><ht:approx_traffic>200+</ht:approx_traffic><pubDate>Mon, 19 Oct 2026 10:00:00 -0700</pubDate>
<ht:news_item><ht:news_item_title>Прогноз на матч чемпионата Италии</ht:news_item_title><ht:news_item_url>https://example.com/b</ht:news_item_url></ht:news_item></item>
</channel></rss>`;

test('Google Trends RSS: titles, approximate traffic lower bounds, attached news', () => {
  const items = parseGoogleTrendsRss(RSS);
  assert.equal(items.length, 2);
  assert.equal(items[0]!.title, 'нейросети & работа');
  assert.equal(items[0]!.news[0]!.source, 'Example');
  assert.equal(trafficLowerBound('2K+'), 2000);
  assert.equal(trafficLowerBound('1M+'), 1_000_000);
  assert.equal(trafficLowerBound('200+'), 200);
  assert.equal(trafficLowerBound('many'), undefined);
});

test('focus stems match at word starts; short stems only as whole words', () => {
  const focus = ['ии', 'работ', 'ai', 'agent'];
  assert.equal(matchesFocus('Компании внедряют ИИ', focus), true);
  assert.equal(matchesFocus('Прогноз на матч чемпионата Италии', focus), false); // «Италии» is not «ИИ»
  assert.equal(matchesFocus('Работодатели и зарплаты', focus), true);
  assert.equal(matchesFocus('She said hello', focus), false); // «said» is not «ai»
  assert.equal(matchesFocus('AI agents at work', focus), true);
});

test('Google Trends feeds become signals with relevance marks; a broken feed stays visible', async () => {
  const report = await collectTrends({ trends: 1, wikipedia: [], hackerNews: false, googleTrends: ['RU', 'US'], focus: ['ии', 'нейросет'] }, {
    now: new Date('2026-10-19T19:00:00Z'),
    fetchText: async url => { if (url.endsWith('geo=US')) throw new HttpError(429, url); return RSS; },
  });
  assert.equal(report.status, 'partial');
  const ru = report.signals.filter(s => s.source === 'google-trends-ru');
  assert.equal(ru.length, 2);
  assert.equal(ru[0]!.metrics.approxSearches, 2000);
  assert.equal(ru[0]!.relevant, true);
  assert.equal(ru[1]!.relevant, undefined);
  assert.match(report.sources.find(s => s.source === 'google-trends-us')!.error!, /429/);
  assert.match(trendsMarkdown(report), /## Matches our focus[\s\S]*нейросети & работа/);
});

test('watchlist: windows from the newest available day, low volume is not a trend, even-count median', async () => {
  const backlog = { ideas: 1, audience: 'Founders', items: [{ ...item('agents'), watch: { wikipedia: { en: ['AI_agent'] }, hn: ['AI agent', 'rare phrase'] } }] };
  const days = (n: number, views: (i: number) => number) => Array.from({ length: n }, (_, i) => ({ timestamp: `2026${String(7 + Math.floor(i / 31)).padStart(2, '0')}${String((i % 31) + 1).padStart(2, '0')}00`, views: views(i) }));
  const watch = await watchIdeas(Backlog.parse(backlog), {
    now: new Date('2026-10-19T12:00:00Z'),
    fetchJson: async url => {
      if (url.includes('pageviews')) return { items: days(84, i => (i < 56 ? 100 : 150)) };
      if (url.includes('rare%20phrase')) return { nbHits: 1 };
      // the recent window ends now; the earlier one ends 30 days ago: 60 recent vs 120 / 3 = 40 per 30 days
      const t = Math.floor(Date.parse('2026-10-19T12:00:00Z') / 1000);
      return { nbHits: url.includes(encodeURIComponent(`created_at_i<=${t}`)) ? 60 : 120 };
    },
  });
  const [w] = watch;
  const wiki = w!.signals.find(s => s.source === 'wikipedia-en')!;
  assert.equal(wiki.recent, 150);
  assert.equal(wiki.previous, 100);
  assert.equal(wiki.ratio, 1.5);
  const rare = w!.signals.find(s => s.subject === 'rare phrase')!;
  assert.equal(rare.ratio, undefined);
  assert.match(rare.note!, /low volume/);
  assert.equal(w!.signals.find(s => s.subject === 'AI agent')!.ratio, 1.5);
  assert.equal(w!.momentum, 'rising'); // median of 1.5 and 1.5
  assert.equal(momentum(1.0), 'steady');
  assert.equal(momentum(0.7), 'falling');
  assert.equal(momentum(undefined), 'unknown');
});
