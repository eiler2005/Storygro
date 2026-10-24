import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';
import { entriesFor, lexiconJob, loadLexicon, spokenWithMarks } from './lexicon.ts';
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
  /** who spoke the line: engine, model, voice and how word times were found */
  provider?: Record<string, unknown>;
  /** Russian stress given to the engine: by the author (зам+ок) or chosen by RUAccent for a listed homograph */
  stress?: { word: string; stressed: string; by: 'author' | 'auto' | 'lexicon' }[];
  /** phoneme checks of dictionary words: right (true), wrong (false) or unclear (null), and the take kept */
  checked?: { word: string; ok: boolean | null; phones: string; take: number }[];
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
  /** `snap` only while the timeline is built; the written timeline has snapped times */
  sfx: { t: number; kind: string; gain: number; dur?: number; snap?: keyof typeof SNAP_BEATS }[];
  transition: { kind: string; dur: number } | null;
  props: Record<string, unknown>;
  wav: string | null;
}
/** Platform UI margins on this stage, px. */
export interface SafeArea {
  profile: string;
  top: number;
  bottom: number;
  left: number;
  right: number;
  caption: number;
}
export interface Timeline {
  title: string;
  lang: string;
  width: number;
  height: number;
  fps: number;
  /** frames captured per output frame for motion blur; 1 = off */
  blur: number;
  duration: number;
  base: string;
  /** URL of the work folder (timeline, mix) under /spec/ */
  work: string;
  theme: string | null;
  overlay: string | null;
  audio: string;
  safe: SafeArea;
  captions: { show: boolean; maxWords: number };
  music: LoadedSpec['spec']['music'] & { dropAt: number | null };
  loudness: number;
  stills: Record<string, number>;
  cards: LoadedSpec['spec']['cards'];
  scenes: TimedScene[];
}

/** Work folder: `.reel/` for reel.yaml, `.reel/<variant>/` for `<variant>.reel.yaml`. */
export const workDir = (l: LoadedSpec) => (l.variant ? join(l.dir, '.reel', l.variant) : join(l.dir, '.reel'));
/** The work folder as the player sees it. */
export const workUrl = (l: LoadedSpec) => `/spec/${relative(l.dir, workDir(l))}`;

const hash = (s: string) => createHash('sha1').update(s).digest('hex').slice(0, 12);

/** Safe-area margins for this stage: the named profile (or one chosen by aspect), scaled to the width. */
export function safeArea(l: LoadedSpec): SafeArea {
  const zones = JSON.parse(readFileSync(join(REEL_ROOT, 'runtime', 'safe-zones.json'), 'utf8')) as Record<
    string,
    { ref: [number, number]; top: number; bottom: number; left: number; right: number; caption: number }
  >;
  const { width, height } = l.spec.format;
  const profile =
    l.spec.safe ?? (height > width * 1.5 ? 'vertical' : height > width ? 'portrait' : height === width ? 'square' : 'landscape');
  const z = zones[profile];
  if (!z || profile.startsWith('_')) throw new Error(`unknown safe-area profile "${profile}" (runtime/safe-zones.json)`);
  const k = width / z.ref[0];
  const r = (v: number) => Math.round(v * k);
  return { profile, top: r(z.top), bottom: r(z.bottom), left: r(z.left), right: r(z.right), caption: r(z.caption) };
}

/** Engines whose Russian stress comes from py/stress.py; bump the version when its output changes. */
const STRESSED_ENGINES = new Set(['qwen3', 'silero', 'chatterbox', 'yandex']);
const STRESS_VERSION = 'stress-1';

/** Narrate every scene, reusing cached lines whose text, provider and settings did not change. */
export async function narrate(l: LoadedSpec): Promise<Map<string, { meta: VoiceMeta; wav: string | null }>> {
  const dir = join(workDir(l), 'voice');
  mkdirSync(dir, { recursive: true });
  const v = l.spec.voice;
  const out = new Map<string, { meta: VoiceMeta; wav: string | null }>();
  const todo: { id: string; say: string; wav: string; json: string }[] = [];
  const lex = l.spec.lang === 'ru' && STRESSED_ENGINES.has(v.engine) ? loadLexicon() : null;
  for (const s of l.spec.scenes) {
    if (!s.say.trim() || v.engine === 'none') {
      out.set(s.id, { meta: estimate(s), wav: null });
      continue;
    }
    // English Kokoro keys stay as they were, so existing caches remain valid
    // Russian lines of engines that get stress from py/stress.py also key on its version and mode
    // and on the dictionary entries the line uses, so a new or changed entry re-voices only its lines
    const stressed = lex
      ? [`${STRESS_VERSION}:${v.stress}`, ...entriesFor(spokenWithMarks(s), lex).map((e) => JSON.stringify([e.say, e.forms ?? null, e.check ?? null]))]
      : [];
    const settings =
      v.engine === 'kokoro' && !v.model && l.spec.lang === 'en' ? [s.say, v.voice, v.speed, v.lang] : [s.say, v.engine, v.model, v.voice, v.speed, l.spec.lang, ...stressed];
    const key = hash(JSON.stringify(settings));
    const wav = join(dir, `${s.id}-${key}.wav`);
    const json = join(dir, `${s.id}-${key}.json`);
    if (!existsSync(json)) todo.push({ id: s.id, say: s.say, wav, json });
    out.set(s.id, { meta: undefined as never, wav });
  }
  if (todo.length) {
    const job = join(dir, 'job.json');
    writeFileSync(
      job,
      JSON.stringify({ engine: v.engine, model: v.model, voice: v.voice, speed: v.speed, lang: v.lang, stress: v.stress, language: l.spec.lang, dir: l.dir, lines: todo, ...(lex ? { lexicon: lexiconJob(lex) } : {}) }),
    );
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
  const say = s.say.replace(/\[([^\]]+)\]\((?:\/[^)]*\/|=[^)]*)\)/g, '$1');
  for (const part of say.split(/(\{#[a-z0-9-]+\}|\{\+[\d.]+\})/)) {
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
  return { duration: t, words, cues, provider: { engine: 'estimate' } };
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
    } else if (Array.isArray(v))
      out[k] = v.map((x) => (x && typeof x === 'object' && !Array.isArray(x) ? bind(x as Record<string, unknown>, data) : x));
    else if (v && typeof v === 'object') out[k] = bind(v as Record<string, unknown>, data);
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

  // files of the reel are served under /spec/; a style's theme and fonts live in the engine, under /rc/
  const rel = (p: string) => {
    const abs = resolve(l.dir, p);
    const inEngine = abs.startsWith(`${REEL_ROOT}${sep}`) && !abs.startsWith(`${l.dir}${sep}`);
    return inEngine ? `/rc/${relative(REEL_ROOT, abs).split(sep).join('/')}` : `/spec/${relative(l.dir, abs)}`;
  };
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
      sfx: s.sfx.map((x) => ({ t: t + at(x.at), kind: x.kind, gain: x.gain, dur: x.dur, snap: x.snap })),
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
  const grid = beatGrid({ bpm: spec.music.bpm, dropAt });
  for (const sc of scenes)
    sc.sfx = sc.sfx.map(({ snap, ...x }) => (snap ? { ...x, t: Math.max(0, snapToGrid(grid, x.t, SNAP_BEATS[snap])) } : x));
  return {
    title: spec.title,
    lang: spec.lang,
    ...spec.format,
    duration: t,
    base: '/spec/',
    work: workUrl(l),
    theme: spec.theme ? rel(spec.theme) : null,
    overlay: spec.overlay ? rel(spec.overlay) : null,
    audio: `${workUrl(l)}/mix.wav`,
    safe: safeArea(l),
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

/** The music's beat grid as score.py lays it out (runtime/kit.js has the same for scenes): the drop lands on a downbeat. */
export function beatGrid(music: { bpm: number; dropAt: number | null }): { beat: number; bar: number; origin: number } {
  const beat = 60 / music.bpm;
  const bar = beat * 4;
  return { beat, bar, origin: music.dropAt === null ? 0 : (music.dropAt % bar) - bar };
}

export const SNAP_BEATS = { beat: 1, half: 0.5, bar: 4 } as const;

/** Nearest grid point to reel second t; `step` in beats. */
export function snapToGrid(g: { beat: number; origin: number }, t: number, step: number): number {
  const len = g.beat * step;
  return g.origin + Math.round((t - g.origin) / len) * len;
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
