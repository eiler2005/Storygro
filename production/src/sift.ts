/**
 * Editorial sifting of collected signals: drop blocked items, set loud headlines aside, notice the
 * same link in several sources, and order the rest into a short reading list ("picks"). A reading
 * order for the editor, not a forecast of reach and not evidence for any claim.
 */
import { matchesFocus, type Signal } from './ideas.ts';

/** A stable key for "the same thing": GitHub repo, arXiv paper, otherwise host + path. */
export function canonical(raw: string): string | undefined {
  let u: URL;
  try { u = new URL(raw); } catch { return undefined; }
  const host = u.hostname.replace(/^www\./, '').toLowerCase();
  const parts = u.pathname.split('/').filter(Boolean);
  if (host === 'github.com' && parts.length >= 2) return `github:${parts[0]}/${parts[1]}`.toLowerCase();
  const arxiv = (host === 'arxiv.org' && ['abs', 'pdf', 'html'].includes(parts[0] ?? '') && parts[1])
    || (host === 'huggingface.co' && parts[0] === 'papers' && parts[1]);
  if (arxiv) return `arxiv:${arxiv.replace(/\.pdf$/, '').replace(/v\d+$/, '')}`;
  if (host === 'youtube.com' && u.searchParams.get('v')) return `youtube:${u.searchParams.get('v')}`;
  if (host === 'youtu.be' && parts[0]) return `youtube:${parts[0]}`;
  if (!parts.length) return undefined; // a site's front page is not "the same thing"
  const query = [...u.searchParams].filter(([k]) => !/^(utm_|ref$|source$|s$|t$)/.test(k)).sort(([a], [b]) => a.localeCompare(b));
  return `${host}/${parts.join('/')}${query.length ? `?${new URLSearchParams(query)}` : ''}`.toLowerCase();
}

/** Terms from the list that occur in the text, with the same word-boundary rules as focus stems. */
export const markers = (text: string, terms: string[]) => terms.filter(t => matchesFocus(text, [t]));

const PRIMARY = ['bookmarks', 'upvotes', 'points', 'lift', 'stars', 'approxSearches', 'views'] as const;

export interface Pick { signal: Signal; score: number; percentile: number; reasons: string[] }

export function sift(signals: Signal[], opts: { hype?: string[]; block?: string[]; perAuthor?: number; picks?: number } = {}) {
  const text = (s: Signal) => [s.title, ...(s.related ?? []).map(r => r.title)].join(' ');
  const blocked: Signal[] = [];
  const kept: Signal[] = [];
  for (const s of signals) {
    const b = markers(text(s), opts.block ?? []);
    if (b.length) { blocked.push({ ...s, hype: b }); continue; }
    const h = markers(text(s), opts.hype ?? []);
    kept.push(h.length ? { ...s, hype: h } : s);
  }

  // the same repository / paper / page seen by more than one source
  const bySource = new Map<string, Set<string>>();
  const keys = (s: Signal) => [...new Set([s.url, ...(s.links ?? [])].map(canonical).filter((k): k is string => !!k))];
  for (const s of kept) for (const k of keys(s)) (bySource.get(k) ?? bySource.set(k, new Set()).get(k)!).add(s.source);
  for (const s of kept) {
    const others = new Set(keys(s).flatMap(k => [...bySource.get(k)!]).filter(src => src !== s.source));
    if (others.size) s.echo = [...others].sort();
  }

  // percentile of each signal within its own source on that source's main metric
  const percentile = new Map<Signal, number>();
  for (const source of new Set(kept.map(s => s.source))) {
    const group = kept.filter(s => s.source === source);
    const key = PRIMARY.find(k => group.some(s => s.metrics[k] !== undefined));
    const ordered = key
      ? [...group].sort((a, b) => (b.metrics[key] ?? -1) - (a.metrics[key] ?? -1))
      : [...group].sort((a, b) => (a.metrics.position ?? 0) - (b.metrics.position ?? 0));
    ordered.forEach((s, i) => percentile.set(s, group.length === 1 ? 1 : 1 - i / (group.length - 1)));
  }

  const candidates: Pick[] = kept.filter(s => (s.topical || s.relevant) && !s.hype).map(s => {
    // general attention lists (search trends, encyclopedia tops) reach us by a word match only: half weight
    const pct = (percentile.get(s) ?? 0) * (s.topical ? 1 : 0.5);
    const reasons: string[] = [];
    let score = pct;
    if (s.echo) { score += 0.5 * Math.min(2, s.echo.length); reasons.push(`also in ${s.echo.join(', ')}`); }
    if ((s.metrics.saveRate ?? 0) >= 1) { score += 0.25; reasons.push(`saved more than liked (${s.metrics.saveRate})`); }
    if ((s.metrics.lift ?? 0) >= 2) { score += 0.25; reasons.push(`${s.metrics.lift}× the channel median`); }
    if ((s.metrics.starsPerDay ?? 0) >= 50) reasons.push(`${s.metrics.starsPerDay} stars a day`);
    return { signal: s, score: Math.round(score * 100) / 100, percentile: Math.round(pct * 100) / 100, reasons };
  }).sort((a, b) => b.score - a.score || a.signal.id.localeCompare(b.signal.id));

  // one loud account should not fill the list
  const perAuthor = opts.perAuthor ?? 2;
  const seen = new Map<string, number>();
  const picks: Pick[] = [];
  const taken = new Set<string>();
  for (const c of candidates) {
    // one pick per story: the same repository or page from another source is already in its reasons
    const ks = keys(c.signal);
    if (ks.some(k => taken.has(k))) continue;
    const who = c.signal.author ? `${c.signal.source}:${c.signal.author.toLowerCase()}` : undefined;
    if (who && (seen.get(who) ?? 0) >= perAuthor) continue;
    if (who) seen.set(who, (seen.get(who) ?? 0) + 1);
    picks.push(c);
    for (const k of ks) taken.add(k);
    if (picks.length >= (opts.picks ?? 15)) break;
  }
  return { signals: kept, blocked, picks };
}
