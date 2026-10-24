import { appendFileSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';
import { z } from 'zod';
import type { SceneSpec } from './spec.ts';
import { REEL_ROOT } from './tools.ts';

/**
 * The Russian pronunciation dictionary (production/voices/lexicon-ru.yaml): names and hard words
 * with their stress, applied to every line by py/stress.py. Here: which entries a line uses (for the
 * voice cache key), which capitalised words have no checked stress, and a lookup of the stress in
 * ru.wikipedia and ru.wiktionary for words that need an entry.
 */
export const LEXICON_PATH = join(REEL_ROOT, 'voices', 'lexicon-ru.yaml');

const Entry = z.object({
  word: z.string().min(1),
  say: z.string().regex(/\+/, 'say needs a `+` before the stressed vowel'),
  forms: z.union([z.array(z.string()), z.record(z.string(), z.string())]).optional(),
  source: z.string().min(1, 'every entry names where its stress was checked'),
  check: z.object({ right: z.string(), wrong: z.string() }).optional(),
  /** false: the stress is recorded and checked, but the engine gets the word unmarked */
  mark: z.boolean().default(true),
});
export type LexiconEntry = z.infer<typeof Entry>;
const LexiconFile = z.object({ lexicon: z.literal(1), words: z.array(Entry).default([]) });

const ACUTE = '́';
const VOWELS = 'аеёиоуыэюяАЕЁИОУЫЭЮЯ';
export const WORD = /[А-Яа-яЁё][А-Яа-яЁё+́-]*/g;
export const key = (w: string) => w.replace(/[+́]/g, '').toLowerCase().replace(/ё/g, 'е');

/** `say` with its `+` moved onto a case form that shares the letters before the stress (as py/stress.py does). */
export function formSay(say: string, form: string): string {
  const i = say.indexOf('+');
  if (key(form.slice(0, i)) !== key(say.slice(0, i)))
    throw new Error(`lexicon: form "${form}" does not share the start of "${say}"; give it as form: say`);
  return `${form.slice(0, i)}+${form.slice(i)}`;
}

export interface Lexicon {
  entries: LexiconEntry[];
  /** every written form (key) → its entry */
  forms: Map<string, LexiconEntry>;
  /** every written form (key) → how to say it, for the narration job */
  say: Map<string, string>;
}

export function loadLexicon(path = LEXICON_PATH): Lexicon {
  const entries = existsSync(path) ? LexiconFile.parse(parse(readFileSync(path, 'utf8'))).words : [];
  const forms = new Map<string, LexiconEntry>();
  const say = new Map<string, string>();
  for (const e of entries) {
    forms.set(key(e.word), e);
    say.set(key(e.word), e.say);
    const f = e.forms;
    for (const [form, fsay] of Array.isArray(f) ? f.map((x) => [x, formSay(e.say, x)] as const) : Object.entries(f ?? {})) {
      forms.set(key(form), e);
      say.set(key(form), fsay);
    }
  }
  return { entries, forms, say };
}

/** The dictionary as py/voice.py takes it: {form: {say, check}}. */
export function lexiconJob(lex: Lexicon): Record<string, { say: string; check: LexiconEntry['check'] | null; mark: boolean }> {
  return Object.fromEntries([...lex.say].map(([k, s]) => [k, { say: s, check: lex.forms.get(k)!.check ?? null, mark: lex.forms.get(k)!.mark }]));
}

/** What the narrator says: cues and pauses out, say-as replaced by its spoken form, stress marks kept. */
export function spokenWithMarks(s: Pick<SceneSpec, 'say'>): string {
  return s.say
    .replace(/\{#[a-z0-9-]+\}/g, '')
    .replace(/\{\+[\d.]+\}/g, '')
    .replace(/\[([^\]]+)\]\(\/[^)]*\/\)/g, '$1')
    .replace(/\[[^\]]+\]\(=([^)]*)\)/g, '$1');
}

/** Dictionary entries a line uses, in order of appearance (keys the voice cache: an entry that changes re-voices its lines only). */
export function entriesFor(text: string, lex: Lexicon = loadLexicon()): LexiconEntry[] {
  const out: LexiconEntry[] = [];
  for (const m of text.matchAll(WORD)) {
    const e = lex.forms.get(key(m[0]));
    if (e && !/[+́]/.test(m[0]) && !out.includes(e)) out.push(e);
  }
  return out;
}

/**
 * Capitalised words inside a sentence (names, mostly) whose stress nobody has checked: not marked by
 * the author, not in the dictionary, two syllables or more. Sentence-initial words are left out —
 * there a capital says nothing.
 */
export function uncheckedNames(text: string, lex: Lexicon = loadLexicon()): string[] {
  const out: string[] = [];
  for (const m of text.matchAll(WORD)) {
    const w = m[0];
    // ё is always stressed: a word with ё needs no check
    if (w[0] !== w[0]!.toUpperCase() || /[+́ёЁ]/.test(w) || lex.forms.has(key(w))) continue;
    if ([...w].filter((c) => VOWELS.includes(c)).length < 2) continue;
    const before = text.slice(0, m.index).replace(/[\s«"„“(—-]+$/u, '');
    if (!before || /[.!?…:]$/.test(before)) continue;
    if (!out.includes(w)) out.push(w);
  }
  return out;
}

/**
 * `word` with the stress of `token` (an acute, or ё), only when the token is the same form of the same
 * word: Russian stress moves between forms (зо́лото → золоты́х, голова́ → го́лову), so it is never carried
 * from one form to another.
 */
export function stressFrom(word: string, token: string): string | null {
  const bare = token.replace(/\u0301/g, '');
  if (key(bare) !== key(word)) return null;
  let idx = token.indexOf(ACUTE) - 1;
  if (idx < 0) idx = bare.search(/[ёЁ]/);
  if (idx < 0 || !VOWELS.includes(bare[idx]!)) return null;
  return `${word.slice(0, idx)}+${word.slice(idx)}`;
}

export interface Found {
  word: string;
  /** the script's form with `+`, e.g. Пар+иже */
  say: string;
  source: string;
}

const UA = { 'User-Agent': 'Storygro stress lookup (https://github.com/eiler2005/Storygro)' };
const STRESSED = /[А-Яа-яЁё\u0301]*[\u0301ёЁ][А-Яа-яЁё\u0301]*/g;

async function json<T>(url: string): Promise<T> {
  const r = await fetch(url, { headers: UA });
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return (await r.json()) as T;
}

function findIn(word: string, text: string, where: string): Found | null {
  for (const m of text.matchAll(STRESSED)) {
    const say = stressFrom(word, m[0]);
    if (!say) continue;
    const at = m.index ?? 0;
    const quote = text.slice(Math.max(0, at - 40), at + m[0].length + 40).replace(/\s+/g, ' ').trim();
    return { word, say, source: `${where}: «…${quote}…»` };
  }
  return null;
}

const plain = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/&#\d+;|&[a-z]+;/g, ' ').replace(/[·\u00ad]/g, '');

/**
 * Looks up the stress of this exact word form: the introductions of matching ru.wikipedia articles
 * (names, places), then ru.wiktionary — the word's own page and the pages its search finds, whose
 * declension tables carry the stress of every case form. Network; returns null when no source shows it.
 */
export async function lookupStress(word: string): Promise<Found | null> {
  const wp = 'https://ru.wikipedia.org/w/api.php?format=json&formatversion=2';
  const wt = 'https://ru.wiktionary.org/w/api.php?format=json&formatversion=2';
  try {
    const s = await json<{ query: { search: { title: string }[] } }>(`${wp}&action=query&list=search&srlimit=5&srsearch=${encodeURIComponent(word)}`);
    const titles = s.query.search.map((x) => x.title);
    if (titles.length) {
      const e = await json<{ query: { pages: { title: string; extract?: string }[] } }>(
        `${wp}&action=query&prop=extracts&exintro=1&explaintext=1&redirects=1&titles=${encodeURIComponent(titles.join('|'))}`,
      );
      const byTitle = new Map(e.query.pages.map((p) => [p.title, p.extract ?? '']));
      for (const t of titles) {
        const f = findIn(word, byTitle.get(t) ?? '', `ru.wikipedia, «${t}»`);
        if (f) return f;
      }
    }
  } catch {
    /* try the dictionary */
  }
  const pages = [word, word.toLowerCase()];
  try {
    const s = await json<{ query: { search: { title: string }[] } }>(`${wt}&action=query&list=search&srlimit=4&srsearch=${encodeURIComponent(word)}`);
    pages.push(...s.query.search.map((x) => x.title));
  } catch {
    /* only the direct pages */
  }
  for (const page of [...new Set(pages)]) {
    try {
      const p = await json<{ parse?: { title: string; text: string } }>(`${wt}&action=parse&prop=text&redirects=1&page=${encodeURIComponent(page)}`);
      if (!p.parse) continue;
      const f = findIn(word, plain(p.parse.text), `ru.wiktionary, «${p.parse.title}»`);
      if (f) return f;
    } catch {
      /* no such page */
    }
  }
  return null;
}

/** Appends looked-up words to the dictionary as YAML entries (the diff is for a person to read). */
export function appendEntries(found: Found[], path = LEXICON_PATH, day = new Date().toISOString().slice(0, 10)): void {
  const q = (s: string) => `'${s.replace(/'/g, "''")}'`;
  const block = found.map((f) => `  - word: ${f.word}\n    say: ${f.say}\n    source: ${q(`${f.source} (storygro stress --lookup, ${day})`)}`).join('\n');
  if (block) appendFileSync(path, `${block}\n`);
}
