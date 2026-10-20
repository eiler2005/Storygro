import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, extname, join } from 'node:path';
import { ffmpeg, python, REEL_ROOT, run } from './tools.ts';

/**
 * Transcripts of reference videos: what was said and when, plus the numbers that describe the pace —
 * words per minute, questions, numbers. Input is a transcript pasted from a video page (timestamp
 * lines followed by text), a local audio/video file, a direct media URL, or a page URL when yt-dlp is
 * installed. Transcribing is for studying how a piece is built; the words remain the author's.
 */
export interface Segment {
  start: number;
  end: number;
  text: string;
}

export interface Transcript {
  transcript: 1;
  source: string;
  method: 'pasted' | 'whisper';
  lang: string;
  createdAt: string;
  segments: Segment[];
}

const TIMESTAMP = /^\s*(?:(\d+):)?(\d{1,2}):(\d{2})\s*$/;
const MEDIA = /\.(mp4|m4a|mp3|wav|webm|mov|mkv|aac|ogg|flac|opus)$/i;

/** `0:00` / `1:02:03` lines, each followed by the text spoken from then on. Lines outside a segment are page chrome. */
export function parsePastedTranscript(text: string): Segment[] {
  const raw: { start: number; lines: string[] }[] = [];
  let cur: { start: number; lines: string[] } | null = null;
  for (const line of text.split(/\r?\n/)) {
    const m = TIMESTAMP.exec(line);
    if (m) {
      if (cur?.lines.length) raw.push(cur);
      cur = { start: Number(m[1] ?? 0) * 3600 + Number(m[2]) * 60 + Number(m[3]), lines: [] };
    } else if (!line.trim()) {
      if (cur?.lines.length) raw.push(cur);
      cur = null;
    } else if (cur) cur.lines.push(line.trim());
  }
  if (cur?.lines.length) raw.push(cur);
  const ordered = raw.filter((s, i) => i === 0 || s.start >= raw[i - 1]!.start);
  return ordered.map((s, i) => {
    const text = s.lines.join(' ').replace(/\s+/g, ' ').trim();
    const next = ordered[i + 1]?.start;
    return { start: s.start, end: next ?? s.start + Math.max(1, wordCount(text) / 2.6), text };
  });
}

const spoken = (text: string) => text.replace(/\[[^\]]*\]/g, ' ');
export const wordCount = (text: string) => (spoken(text).match(/[\p{L}\p{N}][\p{L}\p{N}'’.,%$-]*/gu) ?? []).length;
const clock = (s: number) => {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  return `${h ? `${h}:${String(m).padStart(2, '0')}` : m}:${String(sec).padStart(2, '0')}`;
};

export interface TranscriptStats {
  duration: number;
  words: number;
  wordsPerMinute: number;
  /** words per minute in each minute of the video */
  perMinute: number[];
  sentences: number;
  wordsPerSentence: number;
  questions: { at: number; text: string }[];
  numbers: { at: number; text: string }[];
}

export function transcriptStats(segments: Segment[]): TranscriptStats {
  const duration = segments.at(-1)?.end ?? 0;
  const words = segments.reduce((n, s) => n + wordCount(s.text), 0);
  const perMinute = Array.from({ length: Math.max(1, Math.ceil(duration / 60)) }, () => 0);
  for (const s of segments) perMinute[Math.min(perMinute.length - 1, Math.floor(s.start / 60))]! += wordCount(s.text);
  const all = segments.map((s) => s.text).join(' ');
  const sentences = (spoken(all).match(/[^.!?]+[.!?]+/g) ?? []).length || 1;
  const questions = segments.filter((s) => s.text.includes('?')).map((s) => ({ at: s.start, text: s.text }));
  const numbers = segments.flatMap((s) =>
    [...spoken(s.text).matchAll(/\$?\d[\d,]*(?:\.\d+)?\s?(?:%|percent|thousand|million|billion)?/gi)].map((m) => ({ at: s.start, text: m[0].trim() })),
  );
  return {
    duration,
    words,
    wordsPerMinute: Math.round(words / Math.max(duration / 60, 1 / 60)),
    perMinute,
    sentences,
    wordsPerSentence: Math.round((words / sentences) * 10) / 10,
    questions,
    numbers,
  };
}

/** Paragraphs of about `seconds` each, closed at a sentence end, with their start time. */
export function paragraphs(segments: Segment[], seconds = 40): { at: number; text: string }[] {
  const out: { at: number; text: string }[] = [];
  let cur: { at: number; parts: string[] } | null = null;
  for (const s of segments) {
    cur ??= { at: s.start, parts: [] };
    cur.parts.push(s.text);
    if (s.end - cur.at >= seconds && /[.!?]["”’)]*$/.test(s.text)) {
      out.push({ at: cur.at, text: cur.parts.join(' ') });
      cur = null;
    }
  }
  if (cur) out.push({ at: cur.at, text: cur.parts.join(' ') });
  return out;
}

export function transcriptMarkdown(t: Transcript): string {
  const st = transcriptStats(t.segments);
  return [
    `# Transcript — ${t.source}`,
    '',
    `${t.method === 'pasted' ? 'Pasted from the video page' : 'Whisper'} · ${t.lang} · ${clock(st.duration)} · ${st.words} words · ${st.wordsPerMinute} words/min · ${st.sentences} sentences (${st.wordsPerSentence} words each) · ${st.questions.length} questions · ${st.numbers.length} numbers`,
    '',
    'The words belong to the video’s author; keep this file for study, do not republish it.',
    '',
    ...paragraphs(t.segments).flatMap((p) => [`**[${clock(p.at)}]** ${p.text}`, '']),
  ].join('\n');
}

export function transcriptSrt(segments: Segment[]): string {
  const ts = (s: number) => {
    const ms = Math.round(s * 1000);
    const p = (n: number, w = 2) => String(n).padStart(w, '0');
    return `${p(Math.floor(ms / 3600000))}:${p(Math.floor(ms / 60000) % 60)}:${p(Math.floor(ms / 1000) % 60)},${p(ms % 1000, 3)}`;
  };
  return segments.map((s, i) => `${i + 1}\n${ts(s.start)} --> ${ts(s.end)}\n${s.text}\n`).join('\n');
}

async function whisper(file: string, lang: string): Promise<Segment[]> {
  const tmp = join(tmpdir(), `storygro-transcript-${process.pid}`);
  mkdirSync(tmp, { recursive: true });
  try {
    const wav = join(tmp, 'audio.wav');
    await run(ffmpeg(), ['-y', '-loglevel', 'error', '-i', file, '-vn', '-ac', '1', '-ar', '16000', wav]);
    const out = join(tmp, 'asr.json');
    const r = spawnSync(python(), [join(REEL_ROOT, 'py', 'asr.py'), wav, out, '--lang', lang], { encoding: 'utf8' });
    if (r.status === 3) throw new Error('Whisper is not available here (mlx-whisper needs Apple silicon); paste the transcript from the video page instead');
    if (r.status !== 0) throw new Error(`asr.py failed: ${r.stderr.slice(-1500)}`);
    return (JSON.parse(readFileSync(out, 'utf8')) as { start: number; end: number; text: string }[]).map((s) => ({
      start: s.start, end: s.end, text: s.text.trim(),
    }));
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

/** yt-dlp from STORYGRO_YTDLP, the PATH or the voice environment; undefined when it is not installed. */
function ytDlp(): string | undefined {
  const candidates = [process.env.STORYGRO_YTDLP, join(python(), '..', 'yt-dlp'), 'yt-dlp'].filter(Boolean) as string[];
  return candidates.find((c) => spawnSync(c, ['--version'], { encoding: 'utf8' }).status === 0);
}

async function download(url: string, dir: string): Promise<string> {
  mkdirSync(dir, { recursive: true });
  if (MEDIA.test(new URL(url).pathname)) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
    const file = join(dir, basename(new URL(url).pathname));
    writeFileSync(file, Buffer.from(await res.arrayBuffer()));
    return file;
  }
  const bin = ytDlp();
  if (!bin)
    throw new Error(
      `${url} is a page, not a media file. Paste its transcript into a .txt file, pass a local file, or install yt-dlp (uv pip install --python ~/.storygro/venv/bin/python yt-dlp) and respect the platform's terms.`,
    );
  await run(bin, ['-q', '--no-playlist', '-f', 'bestaudio', '-o', join(dir, 'audio.%(ext)s'), url]);
  const file = readdirSync(dir).find((f) => f.startsWith('audio.'));
  if (!file) throw new Error(`yt-dlp saved no audio for ${url}`);
  return join(dir, file);
}

/** Make a transcript from a pasted .txt, a media file or a URL; write .json, .md and .srt into `out`. */
export async function transcribe(input: string, out: string, opts: { lang?: string } = {}): Promise<{ transcript: Transcript; files: string[] }> {
  const lang = opts.lang ?? 'en';
  mkdirSync(out, { recursive: true });
  let segments: Segment[];
  let method: Transcript['method'] = 'whisper';
  if (/^https?:\/\//.test(input)) segments = await whisper(await download(input, join(out, 'media')), lang);
  else if (!existsSync(input)) throw new Error(`no such file: ${input}`);
  else if (extname(input).toLowerCase() === '.txt' || extname(input).toLowerCase() === '.md') {
    segments = parsePastedTranscript(readFileSync(input, 'utf8'));
    method = 'pasted';
    if (!segments.length) throw new Error(`${input}: no "m:ss" timestamp lines followed by text`);
  } else segments = await whisper(input, lang);
  const transcript: Transcript = { transcript: 1, source: input, method, lang, createdAt: new Date().toISOString(), segments };
  const files = [join(out, 'transcript.json'), join(out, 'transcript.md'), join(out, 'transcript.srt')];
  writeFileSync(files[0]!, `${JSON.stringify({ ...transcript, stats: transcriptStats(segments) }, null, 1)}\n`);
  writeFileSync(files[1]!, `${transcriptMarkdown(transcript)}\n`);
  writeFileSync(files[2]!, transcriptSrt(segments));
  return { transcript, files };
}

export { clock };
