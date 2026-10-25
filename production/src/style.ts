import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { parse, parseDocument } from 'yaml';
import { z } from 'zod';
import { REEL_ROOT } from './tools.ts';

/**
 * A style is a reusable way of making a video — a look and a production method that many episodes
 * share: "cartoon" (generated illustrations with a recurring cast), "cut-paper", "editorial collage".
 * It lives in production/styles/<id>/ and holds reel defaults, a theme, the scene vocabulary, pacing,
 * a script structure and, for illustrated styles, how pictures are generated. A reel opts in with
 * `style: <id>`; anything the reel sets itself wins.
 */
export const STYLES_DIR = join(REEL_ROOT, 'styles');

const Range = z.tuple([z.number(), z.number()]);

export const StyleImages = z.object({
  /**
   * `mflux` generates locally on Apple silicon; `codex` asks the Codex CLI's image tool (GPT Image,
   * needs a signed-in Codex, online, not seed-reproducible); `manual` lists the prompts for a person
   */
  provider: z.enum(['mflux', 'codex', 'manual']).default('manual'),
  /** the mflux command for the model family */
  tool: z.string().regex(/^mflux-generate[a-z0-9.-]*$/).default('mflux-generate-z-image-turbo'),
  /** provider model, e.g. a Hugging Face repo */
  model: z.string().optional(),
  /** model family when `model` is a quantized or fine-tuned copy (mflux --base-model) */
  base: z.string().optional(),
  width: z.number().int().default(1280),
  height: z.number().int().default(720),
  steps: z.number().int().default(9),
  /** the look; `{subject}` is replaced by the shot's prompt with every @name expanded from the cast */
  prompt: z.string().includes('{subject}'),
  negative: z.string().optional(),
  /** recurring characters, referenced in shot prompts as @name */
  cast: z.record(z.string(), z.string()).default({}),
  /** model and its licence, for CREDITS and the manifest */
  licence: z.string().optional(),
});
export type StyleImages = z.infer<typeof StyleImages>;

export const StyleDef = z.object({
  style: z.literal(1),
  id: z.string().regex(/^[a-z0-9-]+$/),
  title: z.string().min(1),
  summary: z.string().min(1),
  status: z.enum(['stable', 'pilot']).default('pilot'),
  /** reel defaults: format, voice, music, captions, transition, safe, loudness; the reel's own values win */
  defaults: z.record(z.string(), z.unknown()).default({}),
  /** stylesheet relative to the style folder; used when the reel sets no theme */
  theme: z.string().optional(),
  /** the scene modules this style is built from */
  scenes: z.array(z.string()).min(1),
  pacing: z
    .object({
      /** seconds each picture stays on screen */
      shotSeconds: Range.optional(),
      wordsPerMinute: Range.optional(),
      /** total length, seconds */
      length: Range.optional(),
    })
    .default({}),
  /** the parts of a script in this style, in order */
  structure: z.array(z.object({ part: z.string(), does: z.string() })).default([]),
  images: StyleImages.optional(),
  /** reels made in this style, relative to the repository */
  examples: z.array(z.string()).default([]),
  /** reference analyses that informed the style */
  references: z.array(z.string()).default([]),
});
export type StyleDef = z.infer<typeof StyleDef>;

export interface LoadedStyle {
  def: StyleDef;
  dir: string;
  path: string;
}

export function loadStyle(id: string): LoadedStyle {
  if (!/^[a-z0-9-]+$/.test(id)) throw new Error(`style "${id}": use a style id such as cartoon (see storygro styles)`);
  const dir = join(STYLES_DIR, id);
  const path = join(dir, 'style.yaml');
  if (!existsSync(path)) throw new Error(`unknown style "${id}" — known: ${listStyles().map((s) => s.def.id).join(', ')}`);
  const def = StyleDef.parse(parse(readFileSync(path, 'utf8')));
  if (def.id !== id) throw new Error(`${path}: id is "${def.id}", folder is "${id}"`);
  if (def.theme && !existsSync(join(dir, def.theme))) throw new Error(`${path}: theme ${def.theme} is missing`);
  return { def, dir, path };
}

export function listStyles(): LoadedStyle[] {
  if (!existsSync(STYLES_DIR)) return [];
  return readdirSync(STYLES_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory() && existsSync(join(STYLES_DIR, d.name, 'style.yaml')))
    .map((d) => loadStyle(d.name))
    .sort((a, b) => a.def.id.localeCompare(b.def.id));
}

const isObject = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);

/**
 * The reel as written, over the style's defaults: top-level keys the reel sets win; objects (format,
 * voice, music, captions, transition) merge one level deep, so `music: { gain: 0.3 }` keeps the
 * style's tempo and key. The theme falls back to the style's own stylesheet (an absolute path).
 */
export function applyStyle(raw: Record<string, unknown>, style: LoadedStyle): Record<string, unknown> {
  const out: Record<string, unknown> = { ...raw };
  for (const [key, value] of Object.entries(style.def.defaults)) {
    if (!(key in raw)) out[key] = value;
    else if (isObject(value) && isObject(raw[key])) out[key] = { ...value, ...(raw[key] as Record<string, unknown>) };
  }
  if (!raw.theme && style.def.theme) out.theme = join(style.dir, style.def.theme);
  return out;
}

/** `@host points at the board` → the cast description in place of @host. Unknown names throw. */
export function expandCast(text: string, cast: Record<string, string>): string {
  return text.replace(/@([a-z][a-z0-9-]*)/g, (_, name: string) => {
    const who = cast[name];
    if (!who) throw new Error(`prompt names @${name}, but the cast has ${Object.keys(cast).map((k) => `@${k}`).join(', ') || 'no one'}`);
    return who;
  });
}

/** The full image prompt for one shot: the style's look around the shot's subject. */
export function shotPrompt(images: StyleImages, subject: string, cast: Record<string, string> = {}): string {
  return images.prompt.replace('{subject}', expandCast(subject.trim(), { ...images.cast, ...cast }));
}

/**
 * A new content project in a style: episode.yaml, `<lang>.reel.yaml` from the style's template,
 * an empty facts file, sources and credits. Refuses a folder that already has files.
 */
export function scaffold(dir: string, style: LoadedStyle, opts: { lang?: string; title?: string } = {}): string[] {
  const lang = opts.lang ?? 'en';
  const id = basename(resolve(dir));
  if (!/^[a-z0-9-]+$/.test(id)) throw new Error(`folder name "${id}" must be lower-case letters, digits and hyphens (it becomes the episode id)`);
  if (existsSync(dir) && readdirSync(dir).length) throw new Error(`${dir} is not empty`);
  const template = join(style.dir, 'template.reel.yaml');
  if (!existsSync(template)) throw new Error(`style ${style.def.id} has no template.reel.yaml`);
  const title = opts.title ?? id.replace(/-/g, ' ');
  let script = readFileSync(template, 'utf8').replaceAll('{title}', title).replaceAll('{lang}', lang);
  const voiceRoot = join(REEL_ROOT, 'voices');
  const russian = lang.split('-')[0] === 'ru';
  const selected = russian ? z.object({ profiles: z.array(z.object({
    rank: z.number(), engine: z.string(), model: z.string().optional(), reference: z.string(),
    speed: z.number().min(0.5).max(2), stress: z.enum(['auto', 'marks', 'off']),
  })).min(1) }).parse(parse(readFileSync(join(voiceRoot, 'preferences-ru.yaml'), 'utf8'))).profiles.sort((a, b) => a.rank - b.rank)[0]! : null;
  if (selected) {
    const doc = parseDocument(script);
    doc.set('voice', { engine: selected.engine, ...(selected.model ? { model: selected.model } : {}),
      voice: 'assets/voice/narrator-ru.wav', speed: selected.speed, stress: selected.stress });
    script = doc.toString();
  }
  mkdirSync(dir, { recursive: true });
  const files: [string, string][] = [
    [`${lang}.reel.yaml`, script],
    ['episode.yaml', `episode: 1\nid: ${id}\ntitle: ${JSON.stringify(title)}\nsources: sources.md\ncredits: CREDITS.md\nvariants:\n  - { id: ${lang}, spec: ${lang}.reel.yaml }\n`],
    [
      'facts.json',
      `${JSON.stringify(
        {
          _about: 'Every number on screen, with its source (see sources.md). Illustrative calculations say how they were computed.',
          example: { _source: 'replace: author, title, date — and the quote that contains the number', value: '0%', label: 'what the number measures' },
        },
        null,
        2,
      )}\n`,
    ],
    ['sources.md', `# Sources\n\n| # | On screen | Source and quote | Caveats |\n|---|---|---|---|\n`],
    ['CREDITS.md', `# Credits\n\n- Style: \`${style.def.id}\` (${style.def.title}).\n${style.def.images ? `- Pictures: generated with ${style.def.images.model ?? style.def.images.provider}${style.def.images.licence ? ` (${style.def.images.licence})` : ''}; prompts, seeds and checksums in images.json.\n` : ''}- Narration: synthetic; name the engine and voice here.\n`],
  ];
  if (selected) {
    const ref = resolve(voiceRoot, selected.reference);
    mkdirSync(join(dir, 'assets/voice'), { recursive: true });
    files.push(['assets/voice/narrator-ru.txt', readFileSync(ref.replace(/\.wav$/, '.txt'), 'utf8')]);
    files.push(['assets/voice/README.md', `# Russian narrator\n\nSynthetic owner-selected narrator: ${selected.engine}, speed ${selected.speed}. Source reference relative to production/voices: ${selected.reference} (ignored local media). See production/voices/references/README.md for provenance, separate model terms and restore instructions.\n${existsSync(ref) ? '\nThe exact reference WAV was copied locally.\n' : '\nReference WAV is absent in this checkout. Restore the selected original before synthesis; do not silently generate a replacement.\n'}`]);
    if (existsSync(ref)) copyFileSync(ref, join(dir, 'assets/voice/narrator-ru.wav'));
  }
  for (const [name, text] of files) writeFileSync(join(dir, name), text);
  return files.map(([name]) => join(dir, name));
}

export function stylesMarkdown(styles: LoadedStyle[]): string {
  const rows = styles.map(
    (s) =>
      `| \`${s.def.id}\` | ${s.def.title} | ${s.def.status} | ${s.def.scenes.join(', ')} | ${s.def.images ? `${s.def.images.provider}${s.def.images.model ? ` · ${s.def.images.model}` : ''}` : '—'} |`,
  );
  return ['| Style | What it is | Status | Scenes | Pictures |', '|---|---|---|---|---|', ...rows].join('\n');
}
