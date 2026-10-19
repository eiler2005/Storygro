import { readFileSync } from 'node:fs';
import { parse } from 'yaml';
import { z } from 'zod';

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
  })),
});

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
export const fetchJSON: FetchJSON = async url => {
  const response = await fetch(url, {
    headers: { 'User-Agent': 'Storygro/0.2 (https://github.com/eiler2005/Storygro)', Accept: 'application/json' },
    signal: AbortSignal.timeout(12_000),
  });
  if (!response.ok) throw new HttpError(response.status, url);
  return response.json();
};

const WikiResponse = z.object({ items: z.array(z.object({ articles: z.array(z.object({ article: z.string(), views: z.number(), rank: z.number() })) })).min(1) });
const HNItem = z.object({ id: z.number(), title: z.string().optional(), type: z.string(), url: z.string().url().optional(), score: z.number().optional(), descendants: z.number().optional(), time: z.number().optional(), deleted: z.boolean().optional(), dead: z.boolean().optional() }).nullable();

/** Interest signals, not evidence of a claim or a forecast of a post's performance. */
export async function collectTrends(input: unknown, opts: { fetchJson?: FetchJSON; now?: Date } = {}) {
  const config = TrendsConfig.parse(input);
  const request = opts.fetchJson ?? fetchJSON;
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
  const unique = [...new Map(signals.map(signal => [signal.id, signal])).values()];
  return { fetchedAt, status: sources.length && sources.every(s => s.status === 'ok') ? 'ok' : sources.some(s => s.status !== 'unavailable') ? 'partial' : 'unavailable', sources, signals: unique };
}

export const loadTrendsConfig = (path: string) => TrendsConfig.parse(parse(readFileSync(path, 'utf8')));
