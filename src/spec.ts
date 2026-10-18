import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { parse } from 'yaml';
import { z } from 'zod';

export const SFX_KINDS = [
  'whoosh',
  'pop',
  'tick',
  'hit',
  'riser',
  'scratch',
  'type',
  'ding',
  'chime',
  'thud',
  'swell',
] as const;

const Sfx = z.object({
  /** a cue name from `say` ({#name}), `start`, `end`, or seconds from the scene start */
  at: z.union([z.string(), z.number()]),
  kind: z.enum(SFX_KINDS),
  gain: z.number().default(1),
  /** seconds; for `type` and `riser` */
  dur: z.number().optional(),
});

const Transition = z.object({
  kind: z.enum(['cut', 'fade', 'push', 'zoom', 'flash']).default('fade'),
  dur: z.number().min(0).default(0.45),
});

const SceneSpec = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  /** scene module: a name from scenes/ or a path relative to the spec */
  scene: z.string(),
  /** narration; {#cue} marks a sync point, [word](/phonemes/) fixes pronunciation */
  say: z.string().default(''),
  /** caption text when it should differ from `say` */
  caption: z.string().optional(),
  /** silence before and after the voice, seconds */
  pad: z.tuple([z.number(), z.number()]).default([0.25, 0.45]),
  /** minimum length, seconds */
  min: z.number().optional(),
  /** music intensity 0..1 while this scene plays */
  energy: z.number().min(0).max(1).optional(),
  sfx: z.array(Sfx).default([]),
  transition: Transition.optional(),
  props: z.record(z.string(), z.unknown()).default({}),
});

export const ReelSpec = z.object({
  reel: z.literal(1),
  title: z.string(),
  format: z
    .object({
      width: z.number().int().default(1920),
      height: z.number().int().default(1080),
      fps: z.number().int().default(30),
    })
    .default({ width: 1920, height: 1080, fps: 30 }),
  voice: z
    .object({
      engine: z.enum(['kokoro', 'none']).default('kokoro'),
      voice: z.string().default('af_heart'),
      speed: z.number().default(1),
      lang: z.string().default('a'),
    })
    .default({ engine: 'kokoro', voice: 'af_heart', speed: 1, lang: 'a' }),
  music: z
    .object({
      bpm: z.number().default(96),
      /** root note of the progression */
      key: z.string().default('D'),
      progression: z.array(z.string()).default(['I', 'V', 'vi', 'IV']),
      gain: z.number().default(0.5),
      /** cue (scene-id or scene-id#cue) where the full beat drops in */
      drop: z.string().optional(),
    })
    .default({ bpm: 96, key: 'D', progression: ['I', 'V', 'vi', 'IV'], gain: 0.5 }),
  loudness: z.number().default(-14),
  /** JSON files whose values props can bind to: `imagesFrom: facts.slides` */
  data: z.record(z.string(), z.string()).default({}),
  /** stylesheet with the design tokens, relative to the spec */
  theme: z.string().optional(),
  /** module drawn above every scene (step bar, wordmark), relative to the spec */
  overlay: z.string().optional(),
  captions: z
    .object({ show: z.boolean().default(true), maxWords: z.number().int().default(7) })
    .default({ show: true, maxWords: 7 }),
  /** default transition between scenes */
  transition: Transition.default({ kind: 'fade', dur: 0.45 }),
  /** numbers allowed on screen although no data file holds them (clock faces, years) */
  allowNumbers: z.array(z.string()).default([]),
  /** hook variants for the storyboard; the first scene's `say` is the chosen one */
  hooks: z.array(z.string()).default([]),
  /** extra frames rendered as stills: name -> seconds, `scene`, `scene@cue` or `scene@seconds` */
  stills: z.record(z.string(), z.union([z.number(), z.string()])).default({}),
  /** share cards made from a still, letterboxed to another size (Product Hunt gallery is 1270×760) */
  cards: z
    .record(
      z.string(),
      z.object({ from: z.string(), width: z.number().int(), height: z.number().int(), background: z.string().default('#000000') }),
    )
    .default({}),
  scenes: z.array(SceneSpec).min(1),
});

export type ReelSpec = z.infer<typeof ReelSpec>;
export type SceneSpec = z.infer<typeof SceneSpec>;

export interface LoadedSpec {
  spec: ReelSpec;
  path: string;
  dir: string;
}

export function loadSpec(path: string): LoadedSpec {
  const abs = resolve(path);
  const spec = ReelSpec.parse(parse(readFileSync(abs, 'utf8')));
  const ids = new Set<string>();
  for (const s of spec.scenes) {
    if (ids.has(s.id)) throw new Error(`duplicate scene id: ${s.id}`);
    ids.add(s.id);
  }
  return { spec, path: abs, dir: dirname(abs) };
}

const CUE = /\{#([a-z0-9-]+)\}/g;
const PAUSE = /\{\+[\d.]+\}/g;
const PHONEME = /\[([^\]]+)\]\(\/[^)]*\/\)/g;

/** Caption text: cue markers removed, phoneme hints reduced to the written word. */
export function captionText(s: SceneSpec): string {
  const raw = s.caption ?? s.say;
  return raw.replace(CUE, '').replace(PAUSE, '').replace(PHONEME, '$1').replace(/\s+/g, ' ').trim();
}

export function cueNames(say: string): string[] {
  return [...say.matchAll(CUE)].map((m) => m[1]!);
}
