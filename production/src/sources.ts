/**
 * Topical signal sources for the research scan: new GitHub repositories, Hugging Face daily papers,
 * Hacker News best of the week, public Telegram channels, RSS/Atom feeds and imported X digests.
 * Each returns plain signals with their own metrics; filtering and ordering live in sift.ts.
 */
import { z } from 'zod';
import type { Signal } from './ideas.ts';

type FetchJSON = (url: string) => Promise<unknown>;
type FetchText = (url: string) => Promise<string>;
const DAY = 86_400_000;
const isoDay = (d: Date) => d.toISOString().slice(0, 10);

export const decodeEntities = (s: string) =>
  s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n))).replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)));
const stripTags = (html: string) => decodeEntities(html.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '')).replace(/[ \t]+/g, ' ').trim();
const clip = (s: string, n = 160) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);
const round = (x: number, d = 2) => Math.round(x * 10 ** d) / 10 ** d;
const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return !s.length ? 0 : s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2;
};

/** "31.4K", "1,2 тыс", "3221" → number. */
export function count(text: string): number | undefined {
  const m = text.replace(/\s/g, '').replace(',', '.').match(/^(\d+(?:\.\d+)?)(k|к|тыс\.?|m|м|млн)?$/i);
  if (!m) return undefined;
  const unit = (m[2] ?? '').toLowerCase().replace('.', '');
  const k = ['k', 'к', 'тыс'].includes(unit) ? 1e3 : ['m', 'м', 'млн'].includes(unit) ? 1e6 : 1;
  return Math.round(Number(m[1]) * k);
}

export const GitHubConfig = z.object({
  /** repositories created within this many days */
  days: z.number().int().min(1).max(30).default(7),
  minStars: z.number().int().min(0).default(30),
  /** GitHub search terms, one request each (unauthenticated limit: 10 searches a minute) */
  queries: z.array(z.string().min(1)).min(1).max(8),
});
const GitHubSearch = z.object({ items: z.array(z.object({
  full_name: z.string(), html_url: z.string(), description: z.string().nullable(), stargazers_count: z.number(),
  forks_count: z.number(), created_at: z.string(), owner: z.object({ login: z.string() }),
})) });

/** Repositories created in the window and already starred, by stars; stars per day since creation. */
export async function githubNew(config: z.infer<typeof GitHubConfig>, request: FetchJSON, now: Date, limit: number): Promise<Signal[]> {
  const since = isoDay(new Date(now.getTime() - config.days * DAY));
  const repos = new Map<string, Signal>();
  for (const query of config.queries) {
    const q = `${query} created:>=${since} stars:>=${config.minStars}`;
    const body = GitHubSearch.parse(await request(`https://api.github.com/search/repositories?q=${encodeURIComponent(q)}&sort=stars&order=desc&per_page=${limit}`));
    for (const r of body.items) {
      const age = Math.max(1, (now.getTime() - Date.parse(r.created_at)) / DAY);
      repos.set(r.full_name, {
        id: `github:${r.full_name}`, source: 'github', title: r.description ? `${r.full_name} — ${clip(r.description, 140)}` : r.full_name,
        url: r.html_url, author: r.owner.login, observedAt: now.toISOString(), period: r.created_at,
        metrics: { stars: r.stargazers_count, starsPerDay: round(r.stargazers_count / age, 1), forks: r.forks_count }, topical: true,
      });
    }
  }
  return [...repos.values()].sort((a, b) => b.metrics.stars! - a.metrics.stars!).slice(0, limit);
}

export const PapersConfig = z.object({ days: z.number().int().min(1).max(7).default(3) });
const DailyPapers = z.array(z.object({
  title: z.string().optional(), numComments: z.number().optional(), publishedAt: z.string().optional(),
  paper: z.object({ id: z.string(), title: z.string().optional(), upvotes: z.number().optional() }),
}));

/** Hugging Face daily papers of the last days, by community upvotes. */
export async function huggingFacePapers(config: z.infer<typeof PapersConfig>, request: FetchJSON, now: Date, limit: number): Promise<Signal[]> {
  const papers = new Map<string, Signal>();
  for (let ago = 0; ago < config.days; ago++) {
    const day = isoDay(new Date(now.getTime() - ago * DAY));
    for (const p of DailyPapers.parse(await request(`https://huggingface.co/api/daily_papers?date=${day}&limit=100`))) {
      const title = p.paper.title ?? p.title;
      if (!title || papers.has(p.paper.id)) continue;
      papers.set(p.paper.id, {
        id: `hf-papers:${p.paper.id}`, source: 'hf-papers', title: clip(title), url: `https://huggingface.co/papers/${p.paper.id}`,
        links: [`https://arxiv.org/abs/${p.paper.id}`], observedAt: now.toISOString(), period: day,
        metrics: { ...(p.paper.upvotes === undefined ? {} : { upvotes: p.paper.upvotes }), ...(p.numComments === undefined ? {} : { comments: p.numComments }) },
        topical: true,
      });
    }
  }
  return [...papers.values()].sort((a, b) => (b.metrics.upvotes ?? 0) - (a.metrics.upvotes ?? 0)).slice(0, limit);
}

export const HNBestConfig = z.object({ days: z.number().int().min(1).max(30).default(7), minPoints: z.number().int().min(1).default(150) });
const HNHits = z.object({ hits: z.array(z.object({
  objectID: z.string(), title: z.string().nullable().optional(), url: z.string().nullable().optional(), author: z.string().optional(),
  points: z.number().nullable().optional(), num_comments: z.number().nullable().optional(), created_at: z.string(),
})) });

/** Hacker News stories of the last days above a points threshold (not only the current front page). */
export async function hackerNewsBest(config: z.infer<typeof HNBestConfig>, request: FetchJSON, now: Date, limit: number): Promise<Signal[]> {
  const from = Math.floor(now.getTime() / 1000) - config.days * 86400;
  const body = HNHits.parse(await request(`https://hn.algolia.com/api/v1/search?tags=story&hitsPerPage=100&numericFilters=${encodeURIComponent(`created_at_i>${from},points>=${config.minPoints}`)}`));
  return body.hits.filter(h => h.title).map(h => {
    const discussionUrl = `https://news.ycombinator.com/item?id=${h.objectID}`;
    return {
      id: `hacker-news:${h.objectID}`, source: 'hn-best', title: h.title!, url: h.url || discussionUrl, discussionUrl, author: h.author,
      observedAt: now.toISOString(), period: h.created_at,
      metrics: { ...(h.points == null ? {} : { points: h.points }), ...(h.num_comments == null ? {} : { comments: h.num_comments }) },
    } satisfies Signal;
  }).sort((a, b) => (b.metrics.points ?? 0) - (a.metrics.points ?? 0)).slice(0, limit);
}

/**
 * Posts of a public Telegram channel from its web preview (t.me/s/<channel>): first line, views,
 * date and outbound links. Not an API: the markup can change. `lift` = views against the median of
 * the fetched posts of the same channel, so channels of different size compare; recent posts are
 * still collecting views, so their lift is understated.
 */
export function parseTelegram(html: string, channel: string) {
  return html.split('class="tgme_widget_message_wrap').slice(1).map(chunk => {
    const post = chunk.match(/data-post="([^"]+)"/)?.[1];
    const body = chunk.match(/class="tgme_widget_message_text[^"]*"[^>]*>([\s\S]*?)<\/div>/)?.[1] ?? '';
    const views = count(chunk.match(/tgme_widget_message_views">([^<]*)/)?.[1] ?? '');
    const date = chunk.match(/<time datetime="([^"]+)" class="time"/)?.[1];
    const links = [...body.matchAll(/href="(https?:\/\/[^"]+)"/g)].map(m => decodeEntities(m[1]!)).filter(u => !/^https?:\/\/(t\.me|telegram\.me)\//.test(u));
    const text = stripTags(body);
    // a short first line ("Гениально, имхо.") says little: keep reading up to a useful length
    const title = clip(text.split('\n').map(l => l.trim()).filter(Boolean).reduce((t, l) => (t.length < 60 ? (t ? `${t} ${l}` : l) : t), ''));
    return { post, channel, title, views, date, links: [...new Set(links)] };
  }).filter(p => p.post && p.title);
}

export async function telegramChannels(channels: string[], requestText: FetchText, now: Date, days: number, limit: number) {
  const out: { channel: string; signals: Signal[]; error?: string }[] = [];
  for (const channel of channels) {
    try {
      const posts = parseTelegram(await requestText(`https://t.me/s/${channel}`), channel);
      if (!posts.length) throw new Error('no posts in the preview (private channel or markup change?)');
      const recent = posts.filter(p => !p.date || now.getTime() - Date.parse(p.date) <= days * DAY);
      const mid = median(posts.map(p => p.views).filter((v): v is number => v !== undefined));
      out.push({ channel, signals: recent.map(p => ({
        id: `telegram:${p.post}`, source: 'telegram', title: p.title, url: `https://t.me/${p.post}`, author: channel, links: p.links,
        observedAt: now.toISOString(), period: p.date ?? now.toISOString(),
        metrics: { ...(p.views === undefined ? {} : { views: p.views }), ...(p.views !== undefined && mid ? { lift: round(p.views / mid) } : {}) },
        topical: true,
      } satisfies Signal)).sort((a, b) => (b.metrics.lift ?? 0) - (a.metrics.lift ?? 0)).slice(0, limit) });
    } catch (error) { out.push({ channel, signals: [], error: error instanceof Error ? error.message : String(error) }); }
  }
  return out;
}

export const FeedConfig = z.object({ id: z.string().regex(/^[a-z0-9-]+$/), url: z.string().url() });
const tag = (xml: string, name: string) => decodeEntities(xml.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`))?.[1] ?? '');

/** Items of an RSS or Atom feed in feed order: title, link, date. Feeds carry no engagement metrics. */
export function parseFeed(xml: string) {
  return [...xml.matchAll(/<(item|entry)(?:\s[^>]*)?>([\s\S]*?)<\/\1>/g)].map(([, , it]) => ({
    title: stripTags(tag(it!, 'title')),
    url: (tag(it!, 'link') || it!.match(/<link[^>]*href="([^"]+)"/)?.[1] || '').trim(),
    date: tag(it!, 'pubDate') || tag(it!, 'published') || tag(it!, 'updated'),
    author: stripTags(tag(it!, 'dc:creator') || tag(it!, 'name')) || undefined,
  })).filter(i => i.title && i.url);
}

const withoutTracking = (raw: string) => {
  try {
    const u = new URL(raw);
    for (const k of [...u.searchParams.keys()]) if (k.startsWith('utm_')) u.searchParams.delete(k);
    return u.toString();
  } catch { return raw; }
};

export async function feed(config: z.infer<typeof FeedConfig>, requestText: FetchText, now: Date, limit: number): Promise<Signal[]> {
  const items = parseFeed(await requestText(config.url));
  if (!items.length) throw new Error('the feed returned no items');
  return items.slice(0, limit).map((it, i) => ({
    id: `${config.id}:${it.url}`, source: config.id, title: clip(it.title), url: withoutTracking(it.url), author: it.author,
    observedAt: now.toISOString(), period: Number.isNaN(Date.parse(it.date)) ? now.toISOString() : new Date(it.date).toISOString(),
    metrics: { position: i + 1 }, topical: true,
  }));
}

/**
 * A digest of X posts pasted from Grok or written by hand: numbered blocks, each with a post link
 * (x.com/…/status/…) and optional «закладок / репостов / лайков / просмотров» (or English) counts,
 * a date line and a «Суть:» / «Summary:» line. Blocks without a status link are skipped.
 */
export function parseXDigest(text: string, observedAt: string, file = 'digest'): Signal[] {
  const blocks = text.split(/\n(?=\s*\d{1,3}[.)]\s)/);
  const out: Signal[] = [];
  for (const block of blocks) {
    const url = block.match(/https?:\/\/(?:www\.)?(?:x|twitter)\.com\/([A-Za-z0-9_]+)\/status\/(\d+)/);
    if (!url) continue;
    const metric = (names: string) => count(block.match(new RegExp(`(?:${names})\\s*:?\\s*([\\d.,]+\\s*(?:k|к|тыс|m|м|млн)?)`, 'i'))?.[1] ?? '')
      ?? count(block.match(new RegExp(`([\\d.,]+\\s*(?:k|к|тыс|m|м|млн)?)\\s+(?:${names})`, 'i'))?.[1] ?? '');
    const bookmarks = metric('закладок|закладки|bookmarks');
    const likes = metric('лайков|лайки|likes');
    const reposts = metric('репостов|репосты|reposts|retweets');
    const views = metric('просмотров|просмотры|views');
    const summary = block.match(/(?:Суть|Summary|Gist)\s*:\s*([\s\S]+?)(?:\n\s*\n|$)/i)?.[1]?.replace(/\s+/g, ' ').trim();
    const date = block.match(/(?:Дата|Date)\s*:\s*([^|\n]+)/i)?.[1]?.trim();
    const links = [...block.matchAll(/https?:\/\/[^\s)"'>]+/g)].map(m => m[0]).filter(u => !/(?:x|twitter)\.com\//.test(u));
    out.push({
      id: `x:${url[2]}`, source: 'x', title: clip(summary ?? block.replace(/^\s*\d+[.)]\s*/, '').split('\n')[0]!.trim(), 220),
      url: `https://x.com/${url[1]}/status/${url[2]}`, author: url[1], links, observedAt, period: date ?? `imported from ${file}`,
      metrics: {
        ...(bookmarks === undefined ? {} : { bookmarks }), ...(likes === undefined ? {} : { likes }),
        ...(reposts === undefined ? {} : { reposts }), ...(views === undefined ? {} : { views }),
        ...(bookmarks !== undefined && likes ? { saveRate: round(bookmarks / likes) } : {}),
      },
      topical: true,
    });
  }
  return out;
}
