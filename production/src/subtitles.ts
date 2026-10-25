import type { Timeline, Word } from './timeline.ts';

export interface Cue {
  start: number;
  end: number;
  text: string;
}

/** Caption phrases exactly as the player groups them: up to maxWords, broken after punctuation. */
export function phrases(words: Word[], maxWords: number): Word[][] {
  const out: Word[][] = [];
  let cur: Word[] = [];
  for (const w of words) {
    cur.push(w);
    const end = /[.!?…:;—][»"”)]*$/.test(w.w) || (/,[»"”)]*$/.test(w.w) && cur.length >= 4);
    if (end || cur.length >= maxWords) {
      out.push(cur);
      cur = [];
    }
  }
  if (cur.length) out.push(cur);
  return out;
}

/** Reel-time subtitle cues; a phrase stays until the next one starts (or 0.5 s after its last word). */
export function subtitleCues(tl: Timeline): Cue[] {
  const cues: Cue[] = [];
  for (const s of tl.scenes) {
    const ph = phrases(s.words, tl.captions?.maxWords ?? 7);
    ph.forEach((p, i) => {
      const next = ph[i + 1];
      const start = s.start + Math.max(0, p[0]!.start - 0.08);
      const end = s.start + (next ? next[0]!.start - 0.08 : Math.min(p[p.length - 1]!.end + 0.5, s.duration));
      cues.push({ start, end: Math.max(end, start + 0.3), text: p.map((w) => w.w).join(' ') });
    });
  }
  return cues;
}

const stamp = (t: number, sep: string) => {
  const ms = Math.max(0, Math.round(t * 1000));
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const s = Math.floor((ms % 60_000) / 1000);
  const pad = (n: number, k = 2) => String(n).padStart(k, '0');
  return `${pad(h)}:${pad(m)}:${pad(s)}${sep}${pad(ms % 1000, 3)}`;
};

export const toSrt = (cues: Cue[]) =>
  cues.map((c, i) => `${i + 1}\n${stamp(c.start, ',')} --> ${stamp(c.end, ',')}\n${c.text}\n`).join('\n');

export const toVtt = (cues: Cue[]) =>
  `WEBVTT\n\n${cues.map((c) => `${stamp(c.start, '.')} --> ${stamp(c.end, '.')}\n${c.text}\n`).join('\n')}`;
