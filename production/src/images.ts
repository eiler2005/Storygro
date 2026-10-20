import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import type { LoadedSpec } from './spec.ts';
import { shotPrompt, type StyleImages } from './style.ts';
import { ffmpeg, imageBin, run } from './tools.ts';

/**
 * Pictures for illustrated styles. A shot in a scene's `props.shots` that has a `prompt` (and, for a
 * split frame, a `splitPrompt`) names the file it needs; `storygro images` generates the missing ones
 * with the style's provider and records what made each picture in `images.json` next to the reel —
 * prompt, seed, model, licence and checksum — so a picture can be traced and regenerated. The pictures
 * themselves stay outside Git.
 */
export interface ImageJob {
  scene: string;
  shot: number;
  side: 'image' | 'split';
  /** path relative to the reel folder */
  file: string;
  subject: string;
  prompt: string;
  seed: number;
}

export interface ImageRecord {
  prompt: string;
  seed: number;
  provider: string;
  model?: string;
  width: number;
  height: number;
  steps: number;
  licence?: string;
  sha256: string;
  createdAt: string;
}

export type ImageLedger = { images: 1; files: Record<string, ImageRecord> };

const hashInt = (s: string) => Number.parseInt(createHash('sha1').update(s).digest('hex').slice(0, 8), 16);
const sha256 = (file: string) => createHash('sha256').update(readFileSync(file)).digest('hex');

export function styleImages(l: LoadedSpec): StyleImages {
  const images = l.style?.def.images;
  if (!images) throw new Error(`${l.path}: generated pictures need a style with an images section (for example style: cartoon)`);
  const own = l.spec.images;
  return { ...images, provider: own?.provider ?? images.provider, width: own?.width ?? images.width, height: own?.height ?? images.height };
}

/** Every picture the reel asks for, with its full prompt and a stable seed. */
export function imageJobs(l: LoadedSpec): ImageJob[] {
  const images = styleImages(l);
  const cast = l.spec.images?.cast ?? {};
  const base = l.spec.images?.seed ?? 7;
  const jobs: ImageJob[] = [];
  for (const scene of l.spec.scenes) {
    const shots = scene.props.shots;
    if (!Array.isArray(shots)) continue;
    shots.forEach((raw, i) => {
      const s = raw as Record<string, unknown>;
      for (const [side, key] of [['image', 'prompt'], ['split', 'splitPrompt']] as const) {
        if (typeof s[key] !== 'string' || typeof s[side] !== 'string') continue;
        const file = relative(l.dir, resolve(l.dir, s[side] as string));
        const seed = typeof s.seed === 'number' ? s.seed + (side === 'split' ? 1 : 0) : base + (hashInt(`${scene.id}:${i}:${side}`) % 100000);
        jobs.push({ scene: scene.id, shot: i, side, file, subject: s[key] as string, prompt: shotPrompt(images, s[key] as string, cast), seed });
      }
    });
  }
  const seen = new Map<string, ImageJob>();
  for (const j of jobs) {
    const prev = seen.get(j.file);
    if (prev && (prev.prompt !== j.prompt || prev.seed !== j.seed))
      throw new Error(`${j.file} is used by ${prev.scene} and ${j.scene} with different prompts; give one of them another file name`);
    seen.set(j.file, j);
  }
  return [...seen.values()];
}

const ledgerPath = (l: LoadedSpec) => join(l.dir, 'images.json');
export function loadImageLedger(l: LoadedSpec): ImageLedger {
  const f = ledgerPath(l);
  return existsSync(f) ? (JSON.parse(readFileSync(f, 'utf8')) as ImageLedger) : { images: 1, files: {} };
}

export type ImageState = 'ok' | 'missing' | 'changed' | 'hand-made';

/** ok: generated from this exact prompt and seed; changed: the prompt or seed moved since; hand-made: a file nobody recorded. */
export function imageState(l: LoadedSpec, job: ImageJob, ledger = loadImageLedger(l)): ImageState {
  if (!existsSync(join(l.dir, job.file))) return 'missing';
  const r = ledger.files[job.file];
  if (!r) return 'hand-made';
  return r.prompt === job.prompt && r.seed === job.seed ? 'ok' : 'changed';
}

/** A Markdown list of the prompts, for a person or another image tool. */
export function promptsMarkdown(l: LoadedSpec, jobs: ImageJob[]): string {
  const images = styleImages(l);
  const ledger = loadImageLedger(l);
  return [
    `# Image prompts — ${l.spec.title}`,
    '',
    `Style \`${l.style?.def.id}\`, ${images.width}×${images.height}. Save each picture at the path shown; \`storygro images\` records generated ones in images.json.`,
    '',
    ...jobs.flatMap((j) => [`## ${j.file} — ${imageState(l, j, ledger)}`, '', `Scene \`${j.scene}\`, shot ${j.shot + 1}${j.side === 'split' ? ' (right half)' : ''}, seed ${j.seed}.`, '', '```text', j.prompt, '```', '']),
  ].join('\n');
}

/** Generate the pictures that are missing (or whose prompt changed, or all with `force`). */
export async function generateImages(
  l: LoadedSpec,
  opts: { force?: boolean; only?: string; log?: (m: string) => void } = {},
): Promise<{ made: string[]; kept: string[]; handMade: string[] }> {
  const images = styleImages(l);
  const log = opts.log ?? console.log;
  const jobs = imageJobs(l).filter((j) => !opts.only || j.scene === opts.only);
  const ledger = loadImageLedger(l);
  const made: string[] = [];
  const kept: string[] = [];
  const handMade: string[] = [];
  const todo = jobs.filter((j) => {
    const s = imageState(l, j, ledger);
    if (s === 'hand-made' && !opts.force) handMade.push(j.file);
    else if (s === 'ok' && !opts.force) kept.push(j.file);
    else return true;
    return false;
  });
  if (images.provider === 'manual') {
    if (todo.length) {
      writeFileSync(join(l.dir, 'prompts.md'), `${promptsMarkdown(l, todo)}\n`);
      throw new Error(`${todo.length} picture(s) to make by hand — prompts in ${join(l.dir, 'prompts.md')}`);
    }
    return { made, kept, handMade };
  }
  const tmp = join(tmpdir(), `storygro-images-${process.pid}`);
  mkdirSync(tmp, { recursive: true });
  try {
    for (const [n, j] of todo.entries()) {
      const out = join(l.dir, j.file);
      mkdirSync(dirname(out), { recursive: true });
      const png = join(tmp, `${n}.png`);
      log(`● ${n + 1}/${todo.length} ${j.file} (seed ${j.seed})`);
      const t0 = Date.now();
      await run(
        imageBin(images.tool),
        [
          ...(images.model ? ['--model', images.model] : []),
          ...(images.base ? ['--base-model', images.base] : []),
          '--width', String(images.width), '--height', String(images.height), '--steps', String(images.steps),
          '--seed', String(j.seed), '--prompt', j.prompt, ...(images.negative ? ['--negative-prompt', images.negative] : []),
          '--output', png,
        ],
        { quiet: true },
      );
      if (out.endsWith('.png')) writeFileSync(out, readFileSync(png));
      else await run(ffmpeg(), ['-y', '-loglevel', 'error', '-i', png, '-q:v', '3', out]);
      ledger.files[j.file] = {
        prompt: j.prompt, seed: j.seed, provider: images.provider, model: images.model ?? images.base,
        width: images.width, height: images.height, steps: images.steps, licence: images.licence,
        sha256: sha256(out), createdAt: new Date().toISOString(),
      };
      writeFileSync(ledgerPath(l), `${JSON.stringify(ledger, null, 1)}\n`);
      made.push(j.file);
      log(`✔ ${j.file} ${((Date.now() - t0) / 1000).toFixed(0)} s`);
    }
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
  return { made, kept, handMade };
}
