import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { parse } from 'yaml';
import { z } from 'zod';
import { approval } from './board.ts';
import { loadEpisode, qaState } from './package.ts';
import { type LoadedSpec, loadSpec } from './spec.ts';
import { workDir } from './timeline.ts';

/**
 * Brand profile: who we speak to, what every post must disclose and which phrases we do not use.
 * It is checked by QA ("Brand rules") for every spec that names it with `brand:`.
 */
export const Brand = z.object({
  brand: z.literal(1),
  name: z.string().min(1),
  audience: z.string().min(1),
  languages: z.array(z.string()).min(1),
  /** default narrator per language for new episodes (existing episodes keep their own) */
  voice: z.record(z.string(), z.object({ engine: z.string(), voice: z.string(), speed: z.number().optional() })).default({}),
  /** a post in this language must mention at least one of these words (e.g. that the voice is synthetic) */
  disclosure: z.record(z.string(), z.object({ mustMention: z.array(z.string().min(2)).min(1) })).default({}),
  /** phrases we do not use, with the reason; matched case-insensitively in narration, captions, on-screen text and posts */
  avoid: z.array(z.object({ phrase: z.string().min(2), reason: z.string().min(1) })).default([]),
});
export type Brand = z.infer<typeof Brand>;

export const loadBrand = (path: string) => Brand.parse(parse(readFileSync(path, 'utf8')));

function strings(v: unknown, out: string[] = []): string[] {
  if (typeof v === 'string') out.push(v);
  else if (Array.isArray(v)) for (const x of v) strings(x, out);
  else if (v && typeof v === 'object') for (const x of Object.values(v)) strings(x, out);
  return out;
}

/** The brand check of one spec: avoided phrases anywhere in its text, and the post's disclosure. */
export function brandFindings(brand: Brand, l: LoadedSpec) {
  const lower = (s: string) => s.toLowerCase().replace(/ё/g, 'е');
  const texts: [string, string][] = [];
  for (const s of l.spec.scenes) {
    texts.push([`${s.id} narration`, s.say]);
    if (s.caption) texts.push([`${s.id} caption`, s.caption]);
    for (const t of strings(s.props)) texts.push([`${s.id} on screen`, t]);
  }
  const post = l.spec.post;
  if (post) texts.push(['post', [post.title ?? '', post.text].join('\n')]);
  const problems: string[] = [];
  for (const a of brand.avoid)
    for (const [where, t] of texts) if (lower(t).includes(lower(a.phrase))) problems.push(`«${a.phrase}» in ${where} (${a.reason})`);
  const rule = brand.disclosure[l.spec.lang];
  let disclosure = 'no disclosure rule for this language';
  if (rule) {
    if (!post) disclosure = 'no post text to check';
    else if (rule.mustMention.some((w) => lower(post.text).includes(lower(w)))) disclosure = 'post discloses the synthetic voice';
    else problems.push(`post does not mention any of: ${rule.mustMention.join(', ')}`);
  }
  return { ok: problems.length === 0, problems, disclosure };
}

/** A series: a recurring rubric and the episodes in it. */
export const Series = z.object({
  series: z.literal(1),
  id: z.string().regex(/^[a-z0-9-]+$/),
  title: z.string().min(1),
  audience: z.string().min(1),
  format: z.string().min(1),
  cadence: z.string().optional(),
  episodes: z.array(z.string()).default([]),
});
export type Series = z.infer<typeof Series>;

/** One row per variant of every episode in the series: length, approval, QA and the latest package. */
export function seriesStatus(path: string) {
  const abs = resolve(path);
  const series = Series.parse(parse(readFileSync(abs, 'utf8')));
  const rows = [];
  for (const ep of series.episodes) {
    const epPath = resolve(dirname(abs), ep);
    if (!existsSync(epPath)) {
      rows.push({ episode: ep, variant: '—', lang: '—', duration: null, approved: false, qa: 'missing', release: null });
      continue;
    }
    const { episode, dir } = loadEpisode(epPath);
    for (const v of episode.variants) {
      const l = loadSpec(resolve(dir, v.spec));
      const tlFile = join(workDir(l), 'timeline.json');
      const duration = existsSync(tlFile) ? (JSON.parse(readFileSync(tlFile, 'utf8')) as { duration: number }).duration : null;
      const releases = join(dir, '.reel', 'releases');
      const latest = existsSync(releases) ? readdirSync(releases).filter((d) => existsSync(join(releases, d, 'manifest.json'))).sort().at(-1) : undefined;
      rows.push({
        episode: episode.id, variant: v.id, lang: l.spec.lang, duration: duration === null ? null : Math.round(duration * 10) / 10,
        approved: approval(l).approved, qa: qaState(l).verdict, release: latest ? relative(process.cwd(), join(releases, latest)) : null,
      });
    }
  }
  return { series, rows };
}

export function seriesMarkdown(r: ReturnType<typeof seriesStatus>): string {
  return [`# ${r.series.title}`, '', `${r.series.audience} · ${r.series.format}${r.series.cadence ? ` · ${r.series.cadence}` : ''}`, '',
    '| Episode | Variant | Length | Approved | QA | Latest package |', '|---|---|---|---|---|---|',
    ...r.rows.map((x) => `| ${x.episode} | ${x.variant} (${x.lang}) | ${x.duration === null ? '—' : `${x.duration} s`} | ${x.approved ? 'yes' : 'no'} | ${x.qa} | ${x.release ?? '—'} |`),
    '', 'Local state of this checkout (ignored .reel/ folders); publication status lives in the publishing ledger.'].join('\n');
}
