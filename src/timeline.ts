import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { captionText, cueNames, type LoadedSpec, type SceneSpec } from './spec.ts';
import { python, REEL_ROOT, run } from './tools.ts';

export interface Word {
  w: string;
  start: number;
  end: number;
}
export interface VoiceMeta {
  duration: number;
  words: Word[];
  cues: Record<string, number>;
}
export interface TimedScene {
  id: string;
  module: string;
  start: number;
  end: number;
  duration: number;
  voiceAt: number;
  voice: VoiceMeta;
  /** scene seconds */
  cues: Record<string, number>;
  /** scene seconds, caption spelling */
  words: Word[];
  energy: number;
  sfx: { t: number; kind: string; gain: number; dur?: number }[];
  transition: { kind: string; dur: number } | null;
  props: Record<string, unknown>;
  wav: string | null;
}
export interface Timeline {
  title: string;
  width: number;
  height: number;
  fps: number;
  duration: number;
  base: string;
  theme: string | null;
  overlay: string | null;
  audio: string;
  captions: { show: boolean; maxWords: number };
  music: LoadedSpec['spec']['music'] & { dropAt: number | null };
  loudness: number;
  stills: Record<string, number>;
  cards: LoadedSpec['spec']['cards'];
  scenes: TimedScene[];
}

export const workDir = (l: LoadedSpec) => join(l.dir, '.reel');

const hash = (s: string) => createHash('sha1').update(s).digest('hex').slice(0, 12);

/** Narrate every scene with Kokoro, reusing cached lines whose text and voice did not change. */
export async function narrate(l: LoadedSpec): Promise<Map<string, { meta: VoiceMeta; wav: string | null }>> {
  const dir = join(workDir(l), 'voice');
  mkdirSync(dir, { recursive: true });
  const v = l.spec.voice;
  const out = new Map<string, { meta: VoiceMeta; wav: string | null }>();
  const todo: { id: string; say: string; wav: string; json: string }[] = [];
  for (const s of l.spec.scenes) {
    if (!s.say.trim() || v.engine === 'none') {
      out.set(s.id, { meta: estimate(s), wav: null });
      continue;
    }
    const key = hash(JSON.stringify([s.say, v.voice, v.speed, v.lang]));
    const wav = join(dir, `${s.id}-${key}.wav`);
    const json = join(dir, `${s.id}-${key}.json`);
    if (!existsSync(json)) todo.push({ id: s.id, say: s.say, wav, json });
    out.set(s.id, { meta: undefined as never, wav });
  }
  if (todo.length) {
    const job = join(dir, 'job.json');
    writeFileSync(job, JSON.stringify({ voice: v.voice, speed: v.speed, lang: v.lang, lines: todo }));
    await run(python(), [join(REEL_ROOT, 'py', 'voice.py'), job]);
  }
  for (const s of l.spec.scenes) {
    const o = out.get(s.id)!;
    if (o.wav) o.meta = JSON.parse(readFileSync(o.wav.replace(/\.wav$/, '.json'), 'utf8'));
  }
  return out;
}

/** Without a voice: about 2.6 words a second, cues spread over the words they precede. */
function estimate(s: SceneSpec): VoiceMeta {
  const words: Word[] = [];
  const cues: Record<string, number> = {};
  let t = 0;
  for (const part of s.say.split(/(\{#[a-z0-9-]+\}|\{\+[\d.]+\})/)) {
    const pause = part.match(/^\{\+([\d.]+)\}$/);
    if (pause) {
      t += Number(pause[1]);
      continue;
    }
    const m = part.match(/^\{#([a-z0-9-]+)\}$/);
    if (m) {
      cues[m[1]!] = t;
      continue;
    }
    for (const w of part.split(/\s+/).filter(Boolean)) {
      const d = 0.16 + w.length * 0.045;
      words.push({ w, start: t, end: t + d });
      t += d + 0.05;
      if (/[.!?]$/.test(w)) t += 0.3;
    }
  }
  return { duration: t, words, cues };
}

/** Caption words: TTS timings, with the caption spelling when the scene overrides it. */
function captionWords(s: SceneSpec, meta: VoiceMeta): Word[] {
  if (!s.caption) return meta.words;
  const text = captionText(s).split(/\s+/);
  const src = meta.words;
  if (!src.length) return [];
  // spread the caption words across the spoken span, proportional to their length
  const a = src[0]!.start;
  const b = src[src.length - 1]!.end;
  const total = text.reduce((n, w) => n + w.length + 2, 0);
  let acc = 0;
  return text.map((w) => {
    const start = a + ((b - a) * acc) / total;
    acc += w.length + 2;
    return { w, start, end: a + ((b - a) * acc) / total };
  });
}

function bind(props: Record<string, unknown>, data: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(props)) {
    if (k.endsWith('From') && typeof v === 'string') {
      const [src, ...path] = v.split('.');
      let cur: unknown = data[src!];
      for (const p of path) cur = (cur as Record<string, unknown> | undefined)?.[p];
      if (cur === undefined) throw new Error(`prop ${k}: ${v} is not in the data`);
      out[k.slice(0, -4)] = cur;
    } else if (v && typeof v === 'object' && !Array.isArray(v))
      out[k] = bind(v as Record<string, unknown>, data);
    else out[k] = v;
  }
  return out;
}

export async function buildTimeline(l: LoadedSpec, opts: { voice?: boolean } = {}): Promise<Timeline> {
  const { spec } = l;
  const voices =
    opts.voice === false
      ? new Map(spec.scenes.map((s) => [s.id, { meta: estimate(s), wav: null }]))
      : await narrate(l);
  const data: Record<string, unknown> = {};
  for (const [k, p] of Object.entries(spec.data))
    data[k] = JSON.parse(readFileSync(resolve(l.dir, p), 'utf8'));

  const rel = (p: string) => `/spec/${relative(l.dir, resolve(l.dir, p))}`;
  const moduleUrl = (m: string) => (m.includes('/') || m.endsWith('.js') ? rel(m) : `/rc/scenes/${m}.js`);
  const scenes: TimedScene[] = [];
  let t = 0;
  let prevEnergy = 0.5;
  for (const [i, s] of spec.scenes.entries()) {
    const { meta, wav } = voices.get(s.id)!;
    const voiceAt = s.pad[0];
    const duration = Math.max(s.min ?? 0, voiceAt + meta.duration + s.pad[1]);
    const cues: Record<string, number> = { start: 0, voice: voiceAt, end: duration };
    for (const name of cueNames(s.say)) {
      const c = meta.cues[name];
      if (c === undefined) throw new Error(`${s.id}: cue {#${name}} has no time`);
      cues[name] = voiceAt + c;
    }
    const at = (x: string | number) => {
      if (typeof x === 'number') return x;
      const c = cues[x];
      if (c === undefined) throw new Error(`${s.id}: unknown cue "${x}"`);
      return c;
    };
    const energy = s.energy ?? prevEnergy;
    prevEnergy = energy;
    scenes.push({
      id: s.id,
      module: moduleUrl(s.scene),
      start: t,
      end: t + duration,
      duration,
      voiceAt,
      voice: meta,
      cues,
      words: captionWords(s, meta).map((w) => ({ ...w, start: w.start + voiceAt, end: w.end + voiceAt })),
      energy,
      sfx: s.sfx.map((x) => ({ t: t + at(x.at), kind: x.kind, gain: x.gain, dur: x.dur })),
      transition: i === 0 ? null : (s.transition ?? spec.transition),
      props: bind(s.props, data),
      wav,
    });
    t += duration;
  }
  let dropAt: number | null = null;
  if (spec.music.drop) {
    const [sid, c] = spec.music.drop.split('#');
    const sc = scenes.find((x) => x.id === sid);
    if (!sc) throw new Error(`music.drop: no scene ${sid}`);
    dropAt = sc.start + (c ? (sc.cues[c] ?? 0) : 0);
  }
  return {
    title: spec.title,
    ...spec.format,
    duration: t,
    base: '/spec/',
    theme: spec.theme ? rel(spec.theme) : null,
    overlay: spec.overlay ? rel(spec.overlay) : null,
    audio: '/spec/.reel/mix.wav',
    captions: spec.captions,
    music: { ...spec.music, dropAt },
    loudness: spec.loudness,
    stills: Object.fromEntries(Object.entries(spec.stills).map(([k, v]) => [k, resolveAt(scenes, v)])),
    cards: spec.cards,
    scenes,
  };
}

export function writeTimeline(l: LoadedSpec, tl: Timeline): string {
  mkdirSync(workDir(l), { recursive: true });
  const p = join(workDir(l), 'timeline.json');
  writeFileSync(p, JSON.stringify(tl, null, 1));
  return p;
}

/** seconds | `scene` (just after its voice) | `scene@cue` | `scene@seconds` → reel seconds */
export function resolveAt(scenes: TimedScene[], x: string | number): number {
  if (typeof x === 'number' || /^[\d.]+$/.test(x)) return Number(x);
  const [id, t] = x.split('@');
  const s = scenes.find((v) => v.id === id);
  if (!s) throw new Error(`no scene ${id}`);
  if (!t) return s.start + Math.min(s.duration - 0.05, s.voiceAt + s.voice.duration + 0.15);
  return s.start + Math.min(s.cues[t] ?? Number(t), s.duration - 0.05);
}
