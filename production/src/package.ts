import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { parse } from 'yaml';
import { z } from 'zod';
import { approval, specHash } from './board.ts';
import { engineVersion, type FileEntry, fileEntry } from './manifest.ts';
import { type LoadedSpec, loadSpec } from './spec.ts';
import { subtitleCues, toSrt, toVtt } from './subtitles.ts';
import { type Timeline, workDir } from './timeline.ts';

/** An episode: one topic and its sources, produced as several self-contained language variants. */
export const Episode = z.object({
  episode: z.literal(1),
  id: z.string().regex(/^[a-z0-9-]+$/),
  title: z.string(),
  series: z.string().optional(),
  /** research notes with the sources every claim comes from, relative to the episode file */
  sources: z.string().optional(),
  credits: z.string().optional(),
  variants: z
    .array(
      z.object({
        id: z.string().regex(/^[a-z0-9-]+$/),
        /** the video spec of this variant */
        spec: z.string(),
        /** a separate carousel spec (its own card script, rendered with `storygro carousel`) */
        carousel: z.string().optional(),
      }),
    )
    .min(1),
});
export type Episode = z.infer<typeof Episode>;

export function loadEpisode(path: string) {
  const abs = resolve(path);
  return { episode: Episode.parse(parse(readFileSync(abs, 'utf8'))), path: abs, dir: dirname(abs) };
}

/** Writes `<name>.srt` and `<name>.vtt` next to the render outputs from the timeline's caption words. */
export function writeSubtitles(l: LoadedSpec, tl: Timeline): string[] {
  const cues = subtitleCues(tl);
  const srt = join(workDir(l), `${l.name}.srt`);
  const vtt = join(workDir(l), `${l.name}.vtt`);
  writeFileSync(srt, toSrt(cues));
  writeFileSync(vtt, toVtt(cues));
  return [srt, vtt];
}

/** Rendered outputs of a variant: what must exist, and what may. */
export function deliverables(l: LoadedSpec, tl: Timeline) {
  const w = workDir(l);
  const required: [string, string][] = [
    [join(w, `${l.name}.mp4`), `${l.name}.mp4`],
    [join(w, `${l.name}-web.mp4`), `${l.name}-web.mp4`],
    [join(w, `${l.name}.srt`), `${l.name}.srt`],
    [join(w, `${l.name}.vtt`), `${l.name}.vtt`],
    [join(w, 'board.pdf'), `${l.name}-storyboard.pdf`],
    [join(w, 'QA.md'), `${l.name}-QA.md`],
    ...[...Object.keys(tl.stills), ...Object.keys(tl.cards)].map((k): [string, string] => [join(w, 'stills', `${k}.png`), `${l.name}-${k}.png`]),
  ];
  return { required, missing: required.filter(([src]) => !existsSync(src)).map(([src]) => src) };
}

/** QA result of the current master, or why it cannot be trusted. */
export function qaState(l: LoadedSpec): { verdict: string; problem?: string } {
  const f = join(workDir(l), 'qa.json');
  const master = join(workDir(l), `${l.name}.mp4`);
  if (!existsSync(f)) return { verdict: 'missing', problem: 'no qa.json — run storygro render (or qa)' };
  const q = JSON.parse(readFileSync(f, 'utf8')) as { verdict: string; at: string; video: string };
  if (existsSync(master) && new Date(q.at).getTime() + 1000 < statSync(master).mtimeMs)
    return { verdict: q.verdict, problem: 'the master was rendered after the last QA run — run storygro qa' };
  return { verdict: q.verdict, problem: q.verdict === 'pass' ? undefined : `QA ${q.verdict}` };
}

const timelineOf = (l: LoadedSpec): Timeline => {
  const f = join(workDir(l), 'timeline.json');
  if (!existsSync(f)) throw new Error(`${l.name}: no timeline — run storygro render ${l.path}`);
  return JSON.parse(readFileSync(f, 'utf8')) as Timeline;
};

/**
 * Collects an episode into one release folder: per variant the master and web video, subtitles,
 * cover, storyboard, QA, post text and carousel; at the root the sources, credits and a manifest
 * with checksums and the inputs that produced each file. Refuses incomplete or unchecked variants.
 */
export function packageEpisode(path: string, out: string | undefined, opts: { allowIncomplete?: boolean } = {}) {
  const { episode, dir } = loadEpisode(path);
  const problems: string[] = [];
  const plan: { variant: string; l: LoadedSpec; tl: Timeline; files: [string, string][]; carousel: string[] }[] = [];
  for (const v of episode.variants) {
    const l = loadSpec(resolve(dir, v.spec));
    const tl = timelineOf(l);
    if (!existsSync(join(workDir(l), `${l.name}.srt`))) writeSubtitles(l, tl);
    const d = deliverables(l, tl);
    for (const m of d.missing) problems.push(`${v.id}: missing ${m}`);
    const q = qaState(l);
    if (q.problem) problems.push(`${v.id}: ${q.problem}`);
    if (!approval(l).approved) problems.push(`${v.id}: script and facts are not approved in their current state (storygro approve)`);
    let carousel: string[] = [];
    if (v.carousel) {
      const c = loadSpec(resolve(dir, v.carousel));
      const cdir = join(workDir(c), 'carousel');
      carousel = existsSync(cdir) ? readdirSync(cdir).filter((f) => f.endsWith('.png')).sort().map((f) => join(cdir, f)) : [];
      if (carousel.length !== c.spec.scenes.length) problems.push(`${v.id}: carousel not rendered — run storygro carousel ${c.path}`);
    }
    plan.push({ variant: v.id, l, tl, files: d.required.filter(([src]) => existsSync(src)), carousel });
  }
  if (problems.length && !opts.allowIncomplete)
    throw new Error(`release refused:\n${problems.map((p) => `  ✖ ${p}`).join('\n')}\n(--allow-incomplete packages anyway and records the problems)`);

  const day = new Date().toISOString().slice(0, 10);
  const root = resolve(out ?? join(dir, '.reel', 'releases', `${episode.id}-${day}`));
  mkdirSync(root, { recursive: true });
  const entries: FileEntry[] = [];
  const copy = (src: string, rel: string) => {
    const dst = join(root, rel);
    mkdirSync(dirname(dst), { recursive: true });
    copyFileSync(src, dst);
    entries.push(fileEntry(dst, root));
  };
  const variants = plan.map(({ variant, l, tl, files, carousel }) => {
    for (const [src, name] of files) copy(src, join(variant, name));
    carousel.forEach((f) => copy(f, join(variant, 'carousel', basename(f))));
    const post = l.spec.post;
    if (post) {
      const md = `${post.title ? `# ${post.title}\n\n` : ''}${post.text.trim()}\n${post.tags.length ? `\n${post.tags.map((t) => `#${t}`).join(' ')}\n` : ''}`;
      writeFileSync(join(root, variant, 'post.md'), md);
      entries.push(fileEntry(join(root, variant, 'post.md'), root));
    }
    const providers = [...new Set(tl.scenes.map((s) => JSON.stringify(s.voice.provider ?? { engine: s.wav ? 'unknown' : 'none' })))].map(
      (p) => JSON.parse(p) as unknown,
    );
    return {
      id: variant,
      lang: l.spec.lang,
      spec: l.path.slice(dir.length + 1),
      title: l.spec.title,
      format: `${tl.width}×${tl.height}@${tl.fps}${(tl.blur ?? 1) > 1 ? ` blur ${tl.blur}` : ''}`,
      duration: +tl.duration.toFixed(2),
      inputsHash: specHash(l),
      approved: approval(l),
      qa: qaState(l),
      voice: providers,
    };
  });
  for (const extra of [episode.sources, episode.credits]) if (extra) copy(resolve(dir, extra), basename(extra));
  const id = `${episode.id}-${day}-${createHash('sha256').update(entries.map((e) => e.sha256).join('')).digest('hex').slice(0, 8)}`;
  const manifest = {
    release: id,
    episode: { id: episode.id, title: episode.title, series: episode.series ?? null },
    createdAt: new Date().toISOString(),
    engine: engineVersion(),
    status: problems.length ? 'incomplete' : 'ready-for-review',
    problems,
    published: false,
    variants,
    files: entries,
  };
  writeFileSync(join(root, 'manifest.json'), JSON.stringify(manifest, null, 1));
  writeFileSync(
    join(root, 'README.md'),
    `# ${episode.title}\n\nRelease \`${id}\` · ${manifest.status} · not published.\n\n${variants
      .map((v) => `- **${v.id}** (${v.lang}): ${v.format}, ${v.duration} s, QA ${v.qa.verdict}`)
      .join('\n')}\n\nEvery file is listed with its SHA-256 in \`manifest.json\`. Before posting: watch each video with sound on a phone, read the post text, check the claims against the sources, then publish to a named account.\n${problems.length ? `\nProblems recorded at packaging:\n${problems.map((p) => `- ${p}`).join('\n')}\n` : ''}`,
  );
  return { root, id, manifest };
}
