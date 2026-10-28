import { spawn } from 'node:child_process';
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
  /** reference pictures of the cast members the shot names (`images.refs`), paths relative to the reel folder */
  refs: { file: string; who: string[] }[];
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
  /** the reference pictures it was made from: path relative to the reel → SHA-256 */
  refs?: Record<string, string>;
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
  return {
    ...images,
    prompt: own?.prompt ?? images.prompt,
    provider: own?.provider ?? images.provider,
    model: own?.model ?? (own?.provider && own.provider !== images.provider ? undefined : images.model),
    base: own?.provider && own.provider !== images.provider ? undefined : images.base,
    licence: own?.provider === 'codex' && images.provider !== 'codex' ? CODEX_LICENCE : images.licence,
    width: own?.width ?? images.width,
    height: own?.height ?? images.height,
  };
}

/** The reference pictures for the cast members a shot names, each file once, in the order the names appear. */
export function shotRefs(l: LoadedSpec, subject: string): { file: string; who: string[] }[] {
  const refs = l.spec.images?.refs ?? {};
  const out = new Map<string, string[]>();
  for (const m of subject.matchAll(/@([a-z][a-z0-9-]*)/g)) {
    const name = m[1] as string;
    const files = refs[name];
    if (!files) continue;
    for (const f of typeof files === 'string' ? [files] : files) {
      const file = relative(l.dir, resolve(l.dir, f));
      const who = out.get(file) ?? [];
      if (!who.includes(name)) who.push(name);
      out.set(file, who);
    }
  }
  return [...out].map(([file, who]) => ({ file, who }));
}

/** Every picture the reel asks for, with its full prompt and a stable seed. */
export function imageJobs(l: LoadedSpec): ImageJob[] {
  const images = styleImages(l);
  const cast = l.spec.images?.cast ?? {};
  const base = l.spec.images?.seed ?? 7;
  for (const [name, files] of Object.entries(l.spec.images?.refs ?? {})) {
    if (!(name in cast) && !(name in images.cast)) throw new Error(`images.refs names @${name}, who is not in the cast`);
    for (const f of typeof files === 'string' ? [files] : files)
      if (!existsSync(resolve(l.dir, f))) throw new Error(`images.refs.${name}: ${f} is missing`);
  }
  const jobs: ImageJob[] = [];
  for (const scene of l.spec.scenes) {
    const shots = Array.isArray(scene.props.shots) ? (scene.props.shots as Record<string, unknown>[]) : [];
    // the picture of an illustration's portrait card is made like a shot, after the scene's shots
    const portrait = scene.props.portrait as Record<string, unknown> | undefined;
    const all: [Record<string, unknown>, string][] = shots.map((s, i) => [s, String(i)]);
    if (portrait && typeof portrait === 'object') all.push([portrait, 'portrait']);
    all.forEach(([s, slot], i) => {
      for (const [side, key] of [['image', 'prompt'], ['split', 'splitPrompt']] as const) {
        if (typeof s[key] !== 'string' || typeof s[side] !== 'string') continue;
        const file = relative(l.dir, resolve(l.dir, s[side] as string));
        const seed = typeof s.seed === 'number' ? s.seed + (side === 'split' ? 1 : 0) : base + (hashInt(`${scene.id}:${slot}:${side}`) % 100000);
        jobs.push({ scene: scene.id, shot: i, side, file, subject: s[key] as string, prompt: shotPrompt(images, s[key] as string, cast), seed, refs: shotRefs(l, s[key] as string) });
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

const refHashes = (l: LoadedSpec, job: ImageJob): Record<string, string> =>
  Object.fromEntries(job.refs.map((r) => [r.file, sha256(join(l.dir, r.file))]));

/** ok: generated from this exact prompt, seed and references; changed: one of them moved since; hand-made: a file nobody recorded. */
export function imageState(l: LoadedSpec, job: ImageJob, ledger = loadImageLedger(l)): ImageState {
  if (!existsSync(join(l.dir, job.file))) return 'missing';
  const r = ledger.files[job.file];
  if (!r) return 'hand-made';
  if (r.prompt !== job.prompt || r.seed !== job.seed) return 'changed';
  const want = refHashes(l, job);
  const had = r.refs ?? {};
  return Object.keys(want).length === Object.keys(had).length && Object.entries(want).every(([f, h]) => had[f] === h) ? 'ok' : 'changed';
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
    ...jobs.flatMap((j) => [
      `## ${j.file} — ${imageState(l, j, ledger)}`,
      '',
      `Scene \`${j.scene}\`, shot ${j.shot + 1}${j.side === 'split' ? ' (right half)' : ''}, seed ${j.seed}.${j.refs.length ? ` References: ${j.refs.map((r) => `${r.file} (${r.who.map((w) => `@${w}`).join(', ')})`).join(', ')}.` : ''}`,
      '',
      '```text',
      j.prompt,
      '```',
      '',
    ]),
  ].join('\n');
}

export const CODEX_LICENCE = 'GPT Image through the Codex CLI image tool; under the OpenAI terms the output belongs to the account holder';

/**
 * Pictures from the Codex CLI's image tool (GPT Image): the jobs go out in batches, a few Codex
 * sessions at a time, each told to save every picture under a numbered name; each picture is then
 * scaled to cover the reel's size and centre-cropped. Shots that name cast members with reference
 * pictures (`images.refs`) go in batches of their own with those pictures attached. Not reproducible
 * by seed — the ledger says so.
 */
async function codexPictures(l: LoadedSpec, images: StyleImages, todo: ImageJob[], ledger: ImageLedger, log: (m: string) => void): Promise<string[]> {
  const made: string[] = [];
  const missing: string[] = [];
  const batch = 5;
  const parallel = 3;
  const byRefs = new Map<string, ImageJob[]>();
  for (const j of todo) {
    const key = j.refs.map((r) => r.file).join('|');
    byRefs.set(key, [...(byRefs.get(key) ?? []), j]);
  }
  const groups: ImageJob[][] = [];
  for (const jobs of byRefs.values()) for (let i = 0; i < jobs.length; i += batch) groups.push(jobs.slice(i, i + batch));
  const bin = process.env.STORYGRO_CODEX ?? 'codex';
  const one = async (group: ImageJob[], g: number) => {
    const dir = join(tmpdir(), `storygro-codex-${process.pid}-${g}`);
    mkdirSync(dir, { recursive: true });
    const refs = group[0]?.refs ?? [];
    try {
      const task = [
        ...(refs.length
          ? [
              `The ${refs.length === 1 ? 'attached picture is a character reference' : `${refs.length} attached pictures are character references`} from our own series: ${refs.map((r, i) => `${refs.length > 1 ? `picture ${i + 1} shows ` : 'it shows '}${r.who.join(' and ')}`).join('; ')}. Pass ${refs.length === 1 ? 'it' : 'them'} to the image tool with every prompt and keep these characters exactly as in the reference: the same face, fur, colours, clothes and body proportions; only the pose, expression, scene and light change.`,
              '',
            ]
          : []),
        `Use your image generation tool to create ${group.length} separate images, each in portrait orientation (tall, 1024x1536 or the closest tall size), one after another with exactly these prompts. Save each image into the current working directory under the given file name (copy it from wherever the tool stores it). Reply with the list of saved files. Do nothing else.`,
        '',
        ...group.flatMap((j, i) => [`${i}.png — prompt: ${j.prompt}`, '']),
      ].join('\n');
      log(`● codex batch ${g + 1}/${groups.length}: ${group.map((j) => j.file).join(', ')}${refs.length ? ` (refs: ${refs.map((r) => r.file).join(', ')})` : ''}`);
      const t0 = Date.now();
      const attach = refs.flatMap((r) => ['-i', resolve(l.dir, r.file)]);
      await new Promise<void>((resolve, reject) => {
        const p = spawn(bin, ['exec', '--skip-git-repo-check', ...(images.model ? ['-m', images.model] : []), '-c', 'model_reasoning_effort=low', '--sandbox', 'workspace-write', ...attach, '-C', dir, '-'], { stdio: ['pipe', 'ignore', 'pipe'] });
        let err = '';
        p.stderr.on('data', (d) => (err = (err + d).slice(-4000)));
        p.on('error', reject);
        p.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`codex exited ${code}: ${err.slice(-800)}`))));
        p.stdin.end(task);
      });
      for (const [i, j] of group.entries()) {
        const png = join(dir, `${i}.png`);
        // the image tool may decline a prompt: keep the others, report this one, a rerun retries only it
        if (!existsSync(png)) {
          missing.push(j.file);
          log(`! codex did not save ${j.file} (batch ${g + 1}) — the tool may have declined the prompt`);
          continue;
        }
        const out = join(l.dir, j.file);
        mkdirSync(dirname(out), { recursive: true });
        await run(ffmpeg(), ['-y', '-loglevel', 'error', '-i', png, '-vf', `scale=${images.width}:${images.height}:force_original_aspect_ratio=increase,crop=${images.width}:${images.height}`, '-q:v', '2', out]);
        ledger.files[j.file] = {
          prompt: j.prompt, seed: j.seed, provider: 'codex', model: images.model ? `${images.model} (Codex image tool)` : 'Codex image tool',
          width: images.width, height: images.height, steps: 0, licence: images.licence ?? CODEX_LICENCE,
          ...(j.refs.length ? { refs: refHashes(l, j) } : {}),
          sha256: sha256(out), createdAt: new Date().toISOString(),
        };
        made.push(j.file);
      }
      writeFileSync(ledgerPath(l), `${JSON.stringify(ledger, null, 1)}\n`);
      log(`✔ codex batch ${g + 1}/${groups.length} in ${((Date.now() - t0) / 1000).toFixed(0)} s`);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  };
  const failed: string[] = [];
  for (let i = 0; i < groups.length; i += parallel) {
    const runs = await Promise.allSettled(groups.slice(i, i + parallel).map((grp, k) => one(grp, i + k)));
    for (const r of runs) if (r.status === 'rejected') failed.push(String(r.reason?.message ?? r.reason));
  }
  if (missing.length || failed.length)
    throw new Error(`${made.length} picture(s) made; not made: ${[...missing, ...failed].join('; ')} — change the prompt if the tool declined it, then run storygro images again`);
  return made;
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
  if (images.provider === 'codex') {
    made.push(...(await codexPictures(l, images, todo, ledger, log)));
    return { made, kept, handMade };
  }
  if (todo.some((j) => j.refs.length)) log(`! ${images.provider} cannot take reference pictures; images.refs is ignored`);
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
