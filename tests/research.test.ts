import assert from 'node:assert/strict';
import { test } from 'node:test';
import { collectTrends, type Signal, trendsMarkdown } from '../production/src/ideas.ts';
import { canonical, sift } from '../production/src/sift.ts';
import { count, parseFeed, parseTelegram, parseXDigest } from '../production/src/sources.ts';

const DIGEST = `Полезные посты в X за 7 дней

1. @BrianRoemmele
Ссылка: https://x.com/BrianRoemmele/status/2109853221808435364
Дата: 12.10, 20:46 PT | закладок: 3221 | репостов: 166 | лайков: 2068
Суть: Бот переносит в нового ассистента то, что Claude уже знает о пользователе.

2. @mattpocockuk
Ссылка: https://x.com/mattpocockuk/status/2110818314499072493
Date: 15.10 | 1.1K bookmarks | likes: 1697
Summary: Ask agents to model frontend logic as a state machine, see https://github.com/statelyai/xstate

3. A line without any post link is ignored.
`;

test('X digest: posts, Russian and English counts, save rate, outbound links', () => {
  const s = parseXDigest(DIGEST, '2026-10-20T00:00:00Z', 'inbox.md');
  assert.equal(s.length, 2);
  assert.equal(s[0]!.author, 'BrianRoemmele');
  assert.deepEqual(s[0]!.metrics, { bookmarks: 3221, likes: 2068, reposts: 166, saveRate: 1.56 });
  assert.match(s[0]!.title, /^Бот переносит/);
  assert.equal(s[0]!.period, '12.10, 20:46 PT');
  assert.equal(s[1]!.metrics.bookmarks, 1100);
  assert.deepEqual(s[1]!.links, ['https://github.com/statelyai/xstate']);
});

test('counts with suffixes', () => {
  assert.equal(count('31.4K'), 31400);
  assert.equal(count('1,2 тыс'), 1200);
  assert.equal(count('3221'), 3221);
  assert.equal(count('n/a'), undefined);
});

const post = (n: number, views: string, text: string, date = '2026-10-19T10:00:00+00:00') =>
  `<div class="tgme_widget_message_wrap js-widget_message_wrap"><div class="tgme_widget_message" data-post="chan/${n}">
  <div class="tgme_widget_message_text js-message_text" dir="auto">${text}</div>
  <span class="tgme_widget_message_views">${views}</span><time datetime="${date}" class="time">10:00</time></div></div>`;

test('Telegram preview: text, views, outbound links without t.me, short first lines extended', () => {
  const html = post(1, '12.8K', '<b>Короткая</b><br/>Вторая строка про <a href="https://github.com/a/b">репозиторий</a> и <a href="https://t.me/other">канал</a>')
    + post(2, '900', 'Пост без ссылок');
  const posts = parseTelegram(html, 'chan');
  assert.equal(posts.length, 2);
  assert.equal(posts[0]!.post, 'chan/1');
  assert.equal(posts[0]!.views, 12800);
  assert.equal(posts[0]!.title, 'Короткая Вторая строка про репозиторий и канал');
  assert.deepEqual(posts[0]!.links, ['https://github.com/a/b']);
});

test('RSS and Atom feeds', () => {
  const rss = parseFeed('<rss><channel><item><title><![CDATA[Статья &amp; разбор]]></title><link>https://habr.com/ru/articles/1/</link><pubDate>Mon, 19 Oct 2026 10:00:00 GMT</pubDate><dc:creator><![CDATA[author]]></dc:creator></item></channel></rss>');
  assert.deepEqual(rss, [{ title: 'Статья & разбор', url: 'https://habr.com/ru/articles/1/', date: 'Mon, 19 Oct 2026 10:00:00 GMT', author: 'author' }]);
  const atom = parseFeed('<feed><entry><title>Post</title><link href="https://blog.example/p"/><updated>2026-10-19</updated></entry></feed>');
  assert.equal(atom[0]!.url, 'https://blog.example/p');
});

test('canonical keys: repos, papers, tracking parameters, front pages', () => {
  assert.equal(canonical('http://github.com/DeepSeek-AI/DeepInfer/tree/main'), 'github:deepseek-ai/deepinfer');
  assert.equal(canonical('https://huggingface.co/papers/2610.22471'), canonical('https://arxiv.org/abs/2610.22471v2'));
  assert.equal(canonical('https://habr.com/ru/articles/1/?utm_source=rss'), 'habr.com/ru/articles/1');
  assert.notEqual(canonical('https://trends.google.com/trends/explore?q=a'), canonical('https://trends.google.com/trends/explore?q=b'));
  assert.equal(canonical('https://www.anthropic.com/'), undefined);
});

const sig = (id: string, source: string, metrics: Record<string, number>, extra: Partial<Signal> = {}): Signal =>
  ({ id, source, title: id, url: `https://example.com/${id}`, observedAt: '', period: '', metrics, topical: true, ...extra });

test('sift: blocked dropped, loud set aside, echoes found, one pick per story, author cap, half weight for general lists', () => {
  const r = sift([
    sig('repo', 'github', { stars: 900 }, { url: 'https://github.com/a/tool' }),
    sig('tg-repo', 'telegram', { views: 10, lift: 0.5 }, { links: ['https://github.com/a/tool'] }),
    sig('tg-loud', 'telegram', { views: 99, lift: 3 }, { title: 'This is INSANE 🤯' }),
    sig('tg-bad', 'telegram', { views: 50, lift: 1 }, { title: 'NSFW pack' }),
    sig('x1', 'x', { bookmarks: 300, likes: 100, saveRate: 3 }, { author: 'Loud' }),
    sig('x2', 'x', { bookmarks: 200, likes: 300, saveRate: 0.67 }, { author: 'loud' }),
    sig('x3', 'x', { bookmarks: 100, likes: 300, saveRate: 0.33 }, { author: 'LOUD' }),
    sig('trend', 'google-trends-ru', { approxSearches: 2000 }, { topical: false, relevant: true }),
    sig('off-topic', 'wikipedia-en', { views: 1e6 }, { topical: false }),
  ], { hype: ['insane', '🤯'], block: ['nsfw'], perAuthor: 2 });
  assert.deepEqual(r.blocked.map(s => s.id), ['tg-bad']);
  assert.deepEqual(r.signals.find(s => s.id === 'tg-loud')!.hype, ['insane', '🤯']);
  assert.deepEqual(r.signals.find(s => s.id === 'repo')!.echo, ['telegram']);
  const ids = r.picks.map(p => p.signal.id);
  assert.ok(!ids.includes('tg-loud') && !ids.includes('off-topic'));
  assert.ok(ids.includes('repo') && !ids.includes('tg-repo'), 'the echoed telegram post is the same story');
  assert.deepEqual(ids.filter(i => i.startsWith('x')), ['x1', 'x2']);
  assert.equal(r.picks.find(p => p.signal.id === 'x1')!.score, 1.25);
  assert.equal(r.picks.find(p => p.signal.id === 'trend')!.score, 0.5);
});

test('research scan: topical sources, imports and picks; one failed channel is partial, not silent', async () => {
  const now = new Date('2026-10-20T12:00:00Z');
  const report = await collectTrends({
    trends: 1, wikipedia: [], hackerNews: false, limit: 5,
    hackerNewsBest: { days: 7, minPoints: 100 },
    github: { days: 7, minStars: 10, queries: ['claude'] },
    huggingFacePapers: { days: 1 },
    telegram: ['good_channel', 'gone_channel'],
    feeds: [{ id: 'habr-ai', url: 'https://habr.com/rss' }],
    hype: ['insane'],
  }, {
    now,
    imports: [{ file: 'inbox.md', text: DIGEST }],
    fetchJson: async url => {
      if (url.includes('hn.algolia')) return { hits: [{ objectID: '1', title: 'Show HN: a tool', url: 'https://github.com/a/tool', author: 'pg', points: 300, num_comments: 40, created_at: '2026-10-18T00:00:00Z' }] };
      if (url.includes('api.github.com')) return { items: [{ full_name: 'a/tool', html_url: 'https://github.com/a/tool', description: 'A tool', stargazers_count: 400, forks_count: 3, created_at: '2026-10-16T12:00:00Z', owner: { login: 'a' } }] };
      if (url.includes('daily_papers')) return [{ paper: { id: '2610.1', title: 'A paper', upvotes: 50 }, numComments: 2 }];
      throw new Error(`unexpected ${url}`);
    },
    fetchText: async url => {
      if (url.endsWith('/good_channel')) return post(7, '2K', 'Insane news about a tool <a href="https://github.com/a/tool">link</a>');
      if (url.endsWith('/gone_channel')) throw new Error('HTTP 404');
      return '<rss><item><title>Статья</title><link>https://habr.com/a/?utm_source=rss</link></item></rss>';
    },
  });
  assert.equal(report.status, 'partial');
  assert.match(report.sources.find(s => s.source === 'telegram')!.error!, /gone_channel: HTTP 404/);
  const repo = report.signals.find(s => s.id === 'github:a/tool')!;
  assert.equal(repo.metrics.starsPerDay, 100);
  assert.deepEqual(repo.echo, ['hn-best', 'telegram']);
  assert.equal(report.signals.find(s => s.source === 'habr-ai')!.url, 'https://habr.com/a/');
  assert.equal(report.signals.filter(s => s.source === 'x').length, 2);
  assert.equal(report.picks[0]!.id, 'github:a/tool');
  const md = trendsMarkdown(report);
  assert.match(md, /## Picks/);
  assert.match(md, /also in hn-best, telegram/);
  assert.match(md, /## Set aside: loud headlines[\s\S]*Insane news/);
  assert.match(md, /## x\n/);
});
