import { readFileSync } from 'node:fs';
import { parse } from 'yaml';
import { z } from 'zod';
import { sift, type Pick } from './sift.ts';
import { feed, FeedConfig, GitHubConfig, githubNew, hackerNewsBest, HNBestConfig, huggingFacePapers, PapersConfig, parseXDigest, telegramChannels } from './sources.ts';

const Rating = z.number().min(0).max(5);
export const Backlog = z.object({
  ideas: z.literal(1),
  audience: z.string().min(1),
  items: z.array(z.object({
    id: z.string().regex(/^[a-z0-9-]+$/),
    title: z.string().min(1),
    thesis: z.string().min(1),
    status: z.enum(['candidate', 'selected', 'produced', 'parked']).default('candidate'),
    sources: z.array(z.string().url()).min(1),
    ratings: z.object({ evidence: Rating, audience: Rating, utility: Rating, visual: Rating, timeliness: Rating, ease: Rating }),
    rationale: z.string().min(1),
    episode: z.string().optional(),
    /** what to watch for this idea: Wikipedia articles per language and Hacker News search phrases */
    watch: z.object({
      wikipedia: z.object({ ru: z.array(z.string()).default([]), en: z.array(z.string()).default([]) }).partial().default({}),
      hn: z.array(z.string()).default([]),
    }).optional(),
  })),
});
export type Backlog = z.infer<typeof Backlog>;

export const WEIGHTS = { evidence: 25, audience: 25, utility: 20, visual: 15, timeliness: 10, ease: 5 } as const;

export function rankIdeas(input: unknown) {
  const backlog = Backlog.parse(input);
  const ids = new Set<string>();
  for (const item of backlog.items) {
    if (ids.has(item.id)) throw new Error(`duplicate idea id: ${item.id}`);
    ids.add(item.id);
  }
  return {
    audience: backlog.audience,
    weights: WEIGHTS,
    items: backlog.items.map(item => ({
      ...item,
      score: Math.round(Object.entries(WEIGHTS).reduce((n, [key, weight]) => n + item.ratings[key as keyof typeof WEIGHTS] * weight / 5, 0) * 10) / 10,
    })).sort((a, b) => b.score - a.score || a.id.localeCompare(b.id)),
  };
}

export const loadIdeas = (path: string) => rankIdeas(parse(readFileSync(path, 'utf8')));

export const TrendsConfig = z.object({
  trends: z.literal(1),
  wikipedia: z.array(z.enum(['ru', 'en'])).max(2).default(['ru', 'en']),
  hackerNews: z.boolean().default(true),
  limit: z.number().int().min(1).max(30).default(15),
  lookbackDays: z.number().int().min(1).max(14).default(7),
  /** Google Trends daily search trends per region (public RSS, unofficial: format may change) */
  googleTrends: z.array(z.string().regex(/^[A-Z]{2}$/)).max(6).default([]),
  /** lower-case word stems that mark a signal as relevant to our audience (a rough filter, not a classifier) */
  focus: z.array(z.string().min(2)).default([]),
  /** new repositories by stars (GitHub search; GITHUB_TOKEN raises the rate limit) */
  github: GitHubConfig.optional(),
  /** Hugging Face daily papers by upvotes */
  huggingFacePapers: PapersConfig.optional(),
  /** Hacker News stories of the last days above a points threshold */
  hackerNewsBest: HNBestConfig.optional(),
  /** public Telegram channels read from their web preview (t.me/s/<name>) */
  telegram: z.array(z.string().regex(/^[A-Za-z0-9_]{4,}$/)).max(20).default([]),
  telegramDays: z.number().int().min(1).max(30).default(7),
  /** RSS/Atom feeds already scoped to our subject (a hub's weekly top, a blog) */
  feeds: z.array(FeedConfig).max(20).default([]),
  /** loud-headline markers: such items stay in the source lists but are set aside from the picks */
  hype: z.array(z.string().min(1)).default([]),
  /** markers of items we never want (adult, gambling, …): dropped and only counted */
  block: z.array(z.string().min(1)).default([]),
  /** at most this many picks from one author or channel */
  perAuthor: z.number().int().min(1).max(10).default(2),
  picks: z.number().int().min(1).max(50).default(15),
});
export type TrendsConfig = z.infer<typeof TrendsConfig>;
export interface Signal {
  id: string;
  source: string;
  title: string;
  url: string;
  discussionUrl?: string;
  observedAt: string;
  period: string;
  metrics: Record<string, number>;
  /** matches one of the configured focus stems */
  relevant?: boolean;
  /** news items Google Trends attaches to a search trend */
  related?: { title: string; url: string; source?: string }[];
  /** account, channel or repository owner */
  author?: string;
  /** other links the item points to (a post's outbound links, a paper's arXiv page) */
  links?: string[];
  /** the source is already scoped to our subject, so the item needs no focus match */
  topical?: boolean;
  /** loud-headline or block markers found in the title */
  hype?: string[];
  /** other sources that carry the same repository, paper or page */
  echo?: string[];
}
export interface SourceResult {
  source: string;
  status: 'ok' | 'partial' | 'unavailable';
  period?: string;
  error?: string;
}
export class HttpError extends Error {
  constructor(public status: number, url: string) { super(`HTTP ${status}: ${url}`); }
}
type FetchJSON = (url: string) => Promise<unknown>;
type FetchText = (url: string) => Promise<string>;
const UA = 'Storygro/0.2 (https://github.com/eiler2005/Storygro)';
export const fetchJSON: FetchJSON = async url => {
  const token = url.startsWith('https://api.github.com/') ? process.env.GITHUB_TOKEN : undefined;
  const response = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, signal: AbortSignal.timeout(12_000) });
  if (!response.ok) throw new HttpError(response.status, url);
  return response.json();
};
export const fetchText: FetchText = async url => {
  const response = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(12_000) });
  if (!response.ok) throw new HttpError(response.status, url);
  return response.text();
};

const decode = (s: string) =>
  s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").trim();
const tag = (xml: string, name: string) => decode(xml.match(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`))?.[1] ?? '');

/** "200+", "2K+", "1M+" → the lower bound Google states, as a number. */
export function trafficLowerBound(text: string): number | undefined {
  const m = text.replace(/[\s,]/g, '').match(/^(\d+(?:\.\d+)?)([KMB])?\+?$/i);
  if (!m) return undefined;
  const k = { K: 1e3, M: 1e6, B: 1e9 }[(m[2] ?? '').toUpperCase() as 'K' | 'M' | 'B'] ?? 1;
  return Math.round(Number(m[1]) * k);
}

/** Items of the Google Trends daily RSS: title, approximate traffic, time and attached news. */
export function parseGoogleTrendsRss(xml: string) {
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map(([, item]) => ({
    title: tag(item!, 'title'),
    traffic: tag(item!, 'ht:approx_traffic'),
    pubDate: tag(item!, 'pubDate'),
    news: [...item!.matchAll(/<ht:news_item>([\s\S]*?)<\/ht:news_item>/g)].map(([, n]) => ({
      title: tag(n!, 'ht:news_item_title'),
      url: tag(n!, 'ht:news_item_url'),
      source: tag(n!, 'ht:news_item_source') || undefined,
    })).filter(n => n.title && n.url),
  })).filter(i => i.title);
}

/**
 * True when the text contains one of the focus stems (case-insensitive, ё = е). A stem matches at the
 * start of a word (`работ` → «работа», «работодатели»); stems of three letters or fewer and phrases
 * match whole words only, so «ии» does not fire on «Италии» and `ai` not on «said».
 */
export function matchesFocus(text: string, focus: string[]): boolean {
  const norm = (x: string) => x.toLowerCase().replace(/ё/g, 'е');
  const t = norm(text);
  return focus.some(raw => {
    const f = norm(raw).trim();
    if (!f) return false;
    const esc = f.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const whole = f.length <= 3 || f.includes(' ');
    return new RegExp(`(^|[^\\p{L}\\p{N}])${esc}${whole ? '(?=$|[^\\p{L}\\p{N}])' : ''}`, 'u').test(t);
  });
}

const WikiResponse = z.object({ items: z.array(z.object({ articles: z.array(z.object({ article: z.string(), views: z.number(), rank: z.number() })) })).min(1) });
const HNItem = z.object({ id: z.number(), title: z.string().optional(), type: z.string(), url: z.string().url().optional(), score: z.number().optional(), descendants: z.number().optional(), time: z.number().optional(), deleted: z.boolean().optional(), dead: z.boolean().optional() }).nullable();

/** Interest signals, not evidence of a claim or a forecast of a post's performance. */
export async function collectTrends(input: unknown, opts: { fetchJson?: FetchJSON; fetchText?: FetchText; now?: Date; backlog?: unknown; imports?: { file: string; text: string }[] } = {}) {
  const config = TrendsConfig.parse(input);
  const request = opts.fetchJson ?? fetchJSON;
  const requestText = opts.fetchText ?? fetchText;
  const now = opts.now ?? new Date();
  const fetchedAt = now.toISOString();
  const sources: SourceResult[] = [];
  const signals: Signal[] = [];
  const errorText = (error: unknown) => error instanceof Error ? error.message : String(error);
  for (const language of new Set(config.wikipedia)) {
    const source = `wikipedia-${language}`;
    try {
      let found = false;
      for (let ago = 1; ago <= config.lookbackDays; ago++) {
        const day = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - ago)).toISOString().slice(0, 10);
        const url = `https://wikimedia.org/api/rest_v1/metrics/pageviews/top/${language}.wikipedia/all-access/${day.replaceAll('-', '/')}`;
        let body: unknown;
        try { body = await request(url); }
        catch (error) { if (error instanceof HttpError && error.status === 404) continue; throw error; }
        const data = WikiResponse.parse(body);
        const articles = data.items[0]!.articles.filter(a => !a.article.includes(':') && !['Main_Page', 'Заглавная_страница', '-'].includes(a.article)).slice(0, config.limit);
        for (const article of articles) signals.push({
          id: `${source}:${day}:${article.article}`, source, title: article.article.replaceAll('_', ' '),
          url: `https://${language}.wikipedia.org/wiki/${encodeURIComponent(article.article)}`,
          observedAt: fetchedAt, period: day, metrics: { views: article.views, rank: article.rank },
        });
        sources.push({ source, status: 'ok', period: day });
        found = true;
        break;
      }
      if (!found) throw new Error(`no available daily top within ${config.lookbackDays} days; data may be delayed`);
    } catch (error) { sources.push({ source, status: 'unavailable', error: errorText(error) }); }
  }
  if (config.hackerNews) {
    const source = 'hacker-news';
    try {
      const ids = z.array(z.number().int()).parse(await request('https://hacker-news.firebaseio.com/v0/topstories.json')).slice(0, config.limit);
      let failures = 0;
      // At most five concurrent requests; failed items do not erase successful ones.
      for (let i = 0; i < ids.length; i += 5) {
        const results = await Promise.allSettled(ids.slice(i, i + 5).map(async id => HNItem.parse(await request(`https://hacker-news.firebaseio.com/v0/item/${id}.json`))));
        for (const result of results) {
          if (result.status === 'rejected') { failures++; continue; }
          const item = result.value;
          if (!item || item.deleted || item.dead || item.type !== 'story' || !item.title) continue;
          const discussionUrl = `https://news.ycombinator.com/item?id=${item.id}`;
          signals.push({ id: `${source}:${item.id}`, source, title: item.title, url: item.url ?? discussionUrl, discussionUrl,
            observedAt: fetchedAt, period: item.time ? new Date(item.time * 1000).toISOString() : fetchedAt,
            metrics: { ...(item.score === undefined ? {} : { points: item.score }), ...(item.descendants === undefined ? {} : { comments: item.descendants }) } });
        }
      }
      sources.push({ source, status: failures === ids.length && ids.length ? 'unavailable' : failures ? 'partial' : 'ok', period: fetchedAt,
        ...(failures ? { error: `${failures}/${ids.length} item requests failed` } : {}) });
    } catch (error) { sources.push({ source, status: 'unavailable', error: errorText(error) }); }
  }
  for (const geo of new Set(config.googleTrends)) {
    const source = `google-trends-${geo.toLowerCase()}`;
    try {
      const items = parseGoogleTrendsRss(await requestText(`https://trends.google.com/trending/rss?geo=${geo}`)).slice(0, config.limit);
      if (!items.length) throw new Error('the feed returned no items (format change?)');
      for (const it of items) {
        const traffic = trafficLowerBound(it.traffic);
        const when = Number.isNaN(Date.parse(it.pubDate)) ? fetchedAt : new Date(it.pubDate).toISOString();
        signals.push({
          id: `${source}:${when.slice(0, 10)}:${it.title}`, source, title: it.title,
          url: `https://trends.google.com/trends/explore?geo=${geo}&q=${encodeURIComponent(it.title)}`,
          observedAt: fetchedAt, period: when,
          metrics: traffic === undefined ? {} : { approxSearches: traffic },
          ...(it.news.length ? { related: it.news.slice(0, 3) } : {}),
        });
      }
      sources.push({ source, status: 'ok', period: fetchedAt });
    } catch (error) { sources.push({ source, status: 'unavailable', error: errorText(error) }); }
  }
  const topical = async (source: string, fetch: () => Promise<Signal[]>, period = fetchedAt) => {
    try {
      const got = await fetch();
      signals.push(...got);
      sources.push({ source, status: 'ok', period });
    } catch (error) { sources.push({ source, status: 'unavailable', error: errorText(error) }); }
  };
  if (config.hackerNewsBest) await topical('hn-best', () => hackerNewsBest(config.hackerNewsBest!, request, now, config.limit));
  if (config.github) await topical('github', () => githubNew(config.github!, request, now, config.limit));
  if (config.huggingFacePapers) await topical('hf-papers', () => huggingFacePapers(config.huggingFacePapers!, request, now, config.limit));
  if (config.telegram.length) {
    const channels = await telegramChannels(config.telegram, requestText, now, config.telegramDays, config.limit);
    for (const c of channels) signals.push(...c.signals);
    const failed = channels.filter(c => c.error);
    sources.push({ source: 'telegram', period: fetchedAt,
      status: failed.length === channels.length ? 'unavailable' : failed.length ? 'partial' : 'ok',
      ...(failed.length ? { error: failed.map(c => `${c.channel}: ${c.error}`).join('; ') } : {}) });
  }
  for (const f of config.feeds) await topical(f.id, () => feed(f, requestText, now, config.limit));
  for (const imp of opts.imports ?? []) {
    const got = parseXDigest(imp.text, fetchedAt, imp.file);
    signals.push(...got);
    sources.push(got.length ? { source: `x (${imp.file})`, status: 'ok', period: 'imported digest' }
      : { source: `x (${imp.file})`, status: 'unavailable', error: 'no x.com/…/status/… links found' });
  }
  const unique = [...new Map(signals.map(signal => [signal.id, signal])).values()];
  if (config.focus.length)
    for (const signal of unique)
      if (matchesFocus([signal.title, ...(signal.related ?? []).map(r => r.title)].join(' '), config.focus)) signal.relevant = true;
  const sifted = sift(unique, { hype: config.hype, block: config.block, perAuthor: config.perAuthor, picks: config.picks });
  const watch = opts.backlog ? await watchIdeas(Backlog.parse(opts.backlog), { fetchJson: request, now }) : undefined;
  return {
    fetchedAt,
    status: sources.length && sources.every(s => s.status === 'ok') ? 'ok' : sources.some(s => s.status !== 'unavailable') ? 'partial' : 'unavailable',
    sources,
    signals: sifted.signals,
    picks: sifted.picks.map(p => ({ id: p.signal.id, score: p.score, percentile: p.percentile, reasons: p.reasons })),
    blocked: sifted.blocked.length,
    ...(watch ? { watch } : {}),
  };
}
export type TrendsReport = Awaited<ReturnType<typeof collectTrends>>;

const WikiDaily = z.object({ items: z.array(z.object({ timestamp: z.string(), views: z.number() })) });
const HNCount = z.object({ nbHits: z.number() });
const DAY = 86_400_000;
const ymd = (d: Date) => d.toISOString().slice(0, 10).replaceAll('-', '');

const MIN_DAILY_VIEWS = 50;
const MIN_HN_STORIES = 10;
const shortError = (error: unknown) =>
  error instanceof HttpError ? (error.status === 404 ? 'not found (check the article title)' : `HTTP ${error.status}`) : error instanceof Error ? error.message : String(error);

export interface WatchSignal {
  source: string;
  subject: string;
  /** average per day (Wikipedia) or count per 30 days (HN) in the recent window */
  recent?: number;
  /** the same measure over the earlier comparison window */
  previous?: number;
  ratio?: number;
  period?: string;
  note?: string;
  error?: string;
}
export const momentum = (ratio: number | undefined) =>
  ratio === undefined || !Number.isFinite(ratio) ? 'unknown' : ratio >= 1.25 ? 'rising' : ratio <= 0.8 ? 'falling' : 'steady';

/**
 * Attention around each backlog idea: Wikipedia article views (last 28 available days against the
 * 56 before them) and Hacker News stories that match a phrase (last 30 days against the average of
 * the 90 before). Context for the editor; never folded into the editorial score.
 */
export async function watchIdeas(backlog: Backlog, opts: { fetchJson?: FetchJSON; now?: Date } = {}) {
  const request = opts.fetchJson ?? fetchJSON;
  const now = opts.now ?? new Date();
  const out = [];
  for (const item of backlog.items) {
    if (!item.watch) continue;
    const signals: WatchSignal[] = [];
    for (const [lang, articles] of Object.entries(item.watch.wikipedia) as [string, string[]][])
      for (const article of articles) {
        const source = `wikipedia-${lang}`;
        const end = new Date(now.getTime() - DAY);
        const start = new Date(end.getTime() - 100 * DAY);
        const url = `https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/${lang}.wikipedia/all-access/user/${encodeURIComponent(article.replaceAll(' ', '_'))}/daily/${ymd(start)}/${ymd(end)}`;
        try {
          const days = WikiDaily.parse(await request(url)).items;
          if (days.length < 30) throw new Error(`only ${days.length} days of data`);
          // windows count back from the newest day the API actually has (data arrive late)
          const recent = days.slice(-28);
          const previous = days.slice(-84, -28);
          const avg = (xs: { views: number }[]) => xs.reduce((n, d) => n + d.views, 0) / xs.length;
          const r = avg(recent);
          const pr = previous.length >= 28 ? avg(previous) : undefined;
          signals.push({
            source, subject: article, recent: Math.round(r), previous: pr === undefined ? undefined : Math.round(pr),
            // a handful of views a day moves the ratio by chance; report it, but do not call it a trend
            ratio: pr && pr >= MIN_DAILY_VIEWS ? Math.round((r / pr) * 100) / 100 : undefined,
            ...(pr !== undefined && pr < MIN_DAILY_VIEWS ? { note: `low volume (< ${MIN_DAILY_VIEWS} views/day)` } : {}),
            period: `${recent[0]!.timestamp.slice(0, 8)}–${recent.at(-1)!.timestamp.slice(0, 8)}`,
          });
        } catch (error) { signals.push({ source, subject: article, error: shortError(error) }); }
      }
    for (const phrase of item.watch.hn) {
      const t = Math.floor(now.getTime() / 1000);
      const count = async (from: number, to: number) =>
        HNCount.parse(await request(`https://hn.algolia.com/api/v1/search_by_date?query=${encodeURIComponent(`"${phrase}"`)}&tags=story&hitsPerPage=0&numericFilters=${encodeURIComponent(`created_at_i>${from},created_at_i<=${to}`)}`)).nbHits;
      try {
        const recent = await count(t - 30 * 86400, t);
        const earlier = (await count(t - 120 * 86400, t - 30 * 86400)) / 3;
        const enough = recent + earlier >= MIN_HN_STORIES;
        signals.push({
          source: 'hacker-news', subject: phrase, recent, previous: Math.round(earlier * 10) / 10,
          ratio: enough && earlier ? Math.round((recent / earlier) * 100) / 100 : undefined,
          ...(enough ? {} : { note: `low volume (< ${MIN_HN_STORIES} stories)` }),
          period: `last 30 days to ${now.toISOString().slice(0, 10)}`,
        });
      } catch (error) { signals.push({ source: 'hacker-news', subject: phrase, error: shortError(error) }); }
    }
    const ratios = signals.map(s => s.ratio).filter((r): r is number => r !== undefined).sort((a, b) => a - b);
    const mid = ratios.length >> 1;
    const median = !ratios.length ? undefined : ratios.length % 2 ? ratios[mid] : (ratios[mid - 1]! + ratios[mid]!) / 2;
    out.push({ idea: item.id, title: item.title, status: item.status, momentum: momentum(median), median: median === undefined ? undefined : Math.round(median * 100) / 100, signals });
  }
  return out;
}

const cell = (s: string) => s.replace(/\|/g, '/').replace(/\s+/g, ' ').trim();
const metric = (m: Record<string, number>) =>
  Object.entries(m).map(([k, v]) => `${k} ${v.toLocaleString('en-US')}`).join(', ') || '—';

/** A human-readable trend report: sources and dates, what matches our focus, each source, the watchlist. */
export function trendsMarkdown(report: TrendsReport, opts: { top?: number } = {}): string {
  const top = opts.top ?? 10;
  const lines = [`# Trend scan — ${report.fetchedAt.slice(0, 16).replace('T', ' ')} UTC`, '',
    `Status: **${report.status}**. Signals are attention snapshots, not evidence for a claim and not a forecast of reach.`, '',
    '| Source | Status | Data date | Note |', '|---|---|---|---|',
    ...report.sources.map(s => `| ${s.source} | ${s.status} | ${s.period?.slice(0, 10) ?? '—'} | ${cell(s.error ?? '')} |`), ''];
  const byId = new Map(report.signals.map(s => [s.id, s]));
  lines.push('## Picks', '', 'Reading order, not a forecast: percentile on the main metric within its own source (half for general lists such as search trends), +0.5 for each other source carrying the same link (up to two), +0.25 when an X post is saved more than liked or a channel post has twice the median views. Loud headlines and blocked items are excluded; at most a few picks per author. Open the original before using anything.', '');
  if (report.picks.length)
    lines.push('| # | Signal | Source | Metrics | Why | Score |', '|---|---|---|---|---|---|',
      ...report.picks.map((p, i) => {
        const s = byId.get(p.id)!;
        return `| ${i + 1} | [${cell(s.title)}](${s.url}) | ${s.source}${s.author ? ` · ${cell(s.author)}` : ''} | ${metric(s.metrics)} | ${cell(p.reasons.join('; ')) || '—'} | ${p.score} |`;
      }), '');
  else lines.push('No topical or focus-matching signals in this scan.', '');
  const loud = report.signals.filter(s => s.hype?.length && (s.topical || s.relevant));
  if (loud.length || report.blocked)
    lines.push('## Set aside: loud headlines', '', `${report.blocked} blocked item(s) dropped. Loud items stay listed so a real story behind a loud title is not lost.`, '',
      ...(loud.length ? ['| Signal | Source | Markers |', '|---|---|---|', ...loud.map(s => `| [${cell(s.title)}](${s.url}) | ${s.source} | ${cell(s.hype!.join(', '))} |`)] : []), '');
  const relevant = report.signals.filter(s => s.relevant);
  lines.push('## Matches our focus', '');
  if (relevant.length)
    lines.push('| Signal | Source | Metrics | Link |', '|---|---|---|---|',
      ...relevant.map(s => `| ${cell(s.title)} | ${s.source} | ${metric(s.metrics)} | [open](${s.url}) |`), '');
  else lines.push('Nothing in the current snapshots matches the focus stems.', '');
  for (const source of new Set(report.signals.map(s => s.source))) {
    const items = report.signals.filter(s => s.source === source).slice(0, top);
    lines.push(`## ${source}`, '', '| # | Signal | Metrics |', '|---|---|---|',
      ...items.map((s, i) => `| ${i + 1} | [${cell(s.title)}](${s.url})${s.relevant ? ' ★' : ''} | ${metric(s.metrics)} |`), '');
  }
  if (report.watch?.length) {
    lines.push('## Watchlist: ideas in the backlog', '', 'Wikipedia: average daily views, last 28 available days vs the 56 before. Hacker News: matching stories in the last 30 days vs the 30-day average of the 90 before. Momentum is the median ratio of the signals with enough volume: ≥ 1.25 rising, ≤ 0.8 falling.', '',
      '| Idea | Status | Momentum | Median ratio | Signals with enough volume |', '|---|---|---|---|---|',
      ...report.watch.map(w => `| ${cell(w.title)} | ${w.status} | **${w.momentum}** | ${w.median ?? '—'} | ${w.signals.filter(s => s.ratio !== undefined).length} of ${w.signals.length} |`), '',
      '| Idea | Source | Subject | Recent | Previous | Ratio |', '|---|---|---|---|---|---|');
    for (const w of report.watch)
      for (const s of w.signals)
        lines.push(`| ${cell(w.title)} | ${s.source} | ${cell(s.subject.replaceAll('_', ' '))} | ${s.recent ?? '—'} | ${s.previous ?? '—'} | ${s.ratio ?? cell(s.error ? `error: ${s.error}` : s.note ?? '—')} |`);
    lines.push('');
  }
  return lines.join('\n');
}

export const loadTrendsConfig = (path: string) => TrendsConfig.parse(parse(readFileSync(path, 'utf8')));
