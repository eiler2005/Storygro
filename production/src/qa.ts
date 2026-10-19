import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { brandFindings, loadBrand } from './brand.ts';
import { captureScenes, factsGate, safeAreaMisses, type SceneShot } from './board.ts';
import { captionText, type LoadedSpec, spokenText } from './spec.ts';
import { type Timeline, workDir } from './timeline.ts';
import { ffmpeg, python, REEL_ROOT } from './tools.ts';

export type Status = 'pass' | 'fail' | 'skip';
export interface Check {
  name: string;
  status: Status;
  detail: string;
}

export interface AsrSegment {
  start: number;
  end: number;
  text: string;
  words?: { w: string; start: number; end: number }[];
}

/** An ASR segment can straddle two scenes. Assign its individual words by their own times. */
export function heardInRange(segments: AsrSegment[], start: number, end: number): string {
  if (segments.some(segment => !segment.words)) throw new Error('ASR word timestamps are missing — rerun with --words');
  return segments.flatMap(segment => segment.words!)
    .filter(word => (word.start + word.end) / 2 >= start && (word.start + word.end) / 2 < end)
    .map(word => word.w).join(' ');
}

/** Words for comparison in any script: lower case, letters and digits only, ё = е. */
export const norm = (s: string) =>
  s
    .normalize('NFKC')
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[’'`]/g, '')
    // a hyphenated compound is one word however it is written: «слайд-крафт», «слайд -крафт» and
    // «слайдкрафт» compare equal (a dash between spaced words is punctuation and stays a break)
    .replace(/(\p{L})\s?[-‐‑](?=\p{L})/gu, '$1')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean);

/** Word overlap of the script and what Whisper heard, per scene (bag of words, order-free). */
/** Number words (RU/EN cardinals and ordinals, any ending) — ASR usually writes them as digits. */
const NUMBER_WORD =
  /^(ноль|нол|один|одн|перв|два|две|двух|втор|три|трех|трет|четыр|четвер|пят|шест|сем|седьм|восем|восьм|девят|десят|одиннадцат|двенадцат|тринадцат|четырнадцат|пятнадцат|шестнадцат|семнадцат|восемнадцат|девятнадцат|двадцат|тридцат|сорок|пятьдесят|пятидесят|шестьдесят|шестидесят|семьдесят|семидесят|восемьдесят|восьмидесят|девяност|сто|двест|трист|четырест|пятьсот|пятисот|тысяч|миллион|миллиард|zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand|million|billion|first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|twelfth)/;
const PERCENT_WORD = /^(процент|percent)/;
const PERCENT_TOKEN = 'percentsign';

/**
 * Word overlap of the script and what Whisper heard, per scene (bag of words, order-free). Beyond exact
 * matches it accepts the forms ASR writes differently: a run of number words heard as one number in
 * digits («шестьдесят один» ↔ «61»), «процент» heard as «%», and a compound heard as two adjacent
 * words («таубенч» ↔ «тау бенч»). Each heard token is used once.
 */
export function similarity(script: string, heard: string): { score: number; missing: string[] } {
  const a = norm(script);
  const heardTokens = norm(heard.replace(/%/g, ` ${PERCENT_TOKEN} `));
  const b = new Map<string, number>();
  for (const w of heardTokens) b.set(w, (b.get(w) ?? 0) + 1);
  const take = (w: string) => {
    const n = b.get(w) ?? 0;
    if (n <= 0) return false;
    b.set(w, n - 1);
    return true;
  };
  const matched = a.map((w) => take(w));
  // compounds heard as two adjacent words
  for (const [i, w] of a.entries()) {
    if (matched[i]) continue;
    for (let j = 0; j + 1 < heardTokens.length; j++) {
      const x = heardTokens[j]!;
      const y = heardTokens[j + 1]!;
      if (x + y === w && (b.get(x) ?? 0) > 0 && (b.get(y) ?? 0) > 0) {
        take(x);
        take(y);
        matched[i] = true;
        break;
      }
    }
  }
  // «процент» heard as the % sign
  for (const [i, w] of a.entries()) if (!matched[i] && PERCENT_WORD.test(w)) matched[i] = take(PERCENT_TOKEN);
  // a run of number words heard as one token with digits
  for (let i = 0; i < a.length; i++) {
    if (matched[i] || !NUMBER_WORD.test(a[i]!)) continue;
    let j = i;
    while (j + 1 < a.length && !matched[j + 1] && NUMBER_WORD.test(a[j + 1]!)) j++;
    const digit = [...b.entries()].find(([k, n]) => n > 0 && /\d/.test(k));
    if (digit) {
      take(digit[0]);
      for (let k = i; k <= j; k++) matched[k] = true;
    }
    i = j;
  }
  const missing = a.filter((_, i) => !matched[i]);
  return { score: a.length ? (a.length - missing.length) / a.length : 1, missing };
}

const ok = (b: boolean): Status => (b ? 'pass' : 'fail');

/** Checks the delivered file the way a viewer and a platform will meet it. Writes QA.md and qa.json. */
export async function qa(l: LoadedSpec, tl: Timeline, video: string) {
  const checks: Check[] = [];
  if (!existsSync(video)) throw new Error(`no video to check: ${video} — run storygro render first`);
  const probe = spawnSync(ffmpeg(), ['-hide_banner', '-i', video], { encoding: 'utf8' }).stderr;
  const v = probe.match(/Video: (\w+).*?, (\w+)\(.*?\), (\d+)x(\d+)/) ?? probe.match(/Video: (\w+)[^,]*, (\w+), (\d+)x(\d+)/);
  const dur = probe.match(/Duration: (\d+):(\d+):([\d.]+)/);
  const seconds = dur ? Number(dur[1]) * 3600 + Number(dur[2]) * 60 + Number(dur[3]) : 0;
  checks.push({
    name: 'Codec and pixels',
    status: ok(!!v && v[1] === 'h264' && v[2] === 'yuv420p' && /bt709/.test(probe)),
    detail: v ? `${v[1]}, ${v[2]}` : 'no video stream',
  });
  checks.push({
    name: 'Size',
    status: ok(!!v && Number(v[3]) === tl.width && Number(v[4]) === tl.height),
    detail: v ? `${v[3]}×${v[4]}` : '?',
  });
  checks.push({ name: 'Audio track', status: ok(/Audio: aac/.test(probe)), detail: probe.match(/Audio: [^\n]*/)?.[0] ?? 'none' });
  checks.push({
    name: 'Length',
    status: ok(Math.abs(seconds - tl.duration) < 0.5),
    detail: `${seconds.toFixed(2)} s (planned ${tl.duration.toFixed(2)} s)`,
  });

  // loudness of the mix
  const mix = join(workDir(l), 'mix.wav');
  if (existsSync(mix)) {
    const ln = spawnSync(ffmpeg(), ['-hide_banner', '-i', mix, '-af', 'ebur128=peak=true', '-f', 'null', '-'], { encoding: 'utf8' }).stderr;
    const I = Number(ln.match(/I:\s+(-?[\d.]+) LUFS\s*\n\s*Threshold[\s\S]*?LRA/)?.[1] ?? ln.match(/I:\s+(-?[\d.]+) LUFS/g)?.at(-1)?.match(/-?[\d.]+/)?.[0]);
    const peak = Number(ln.match(/Peak:\s+(-?[\d.]+) dBFS/g)?.at(-1)?.match(/-?[\d.]+/)?.[0]);
    checks.push({
      name: 'Loudness',
      status: ok(Math.abs(I - tl.loudness) <= 1 && peak <= -0.5),
      detail: `${I} LUFS integrated (target ${tl.loudness}), true peak ${peak} dBFS`,
    });
  } else checks.push({ name: 'Loudness', status: 'skip', detail: 'no mix.wav' });

  // the first frame must already work as a hook: something on screen, no fade from black
  const first = spawnSync(
    ffmpeg(),
    ['-v', 'error', '-i', video, '-frames:v', '1', '-vf', 'scale=64:36,format=gray', '-f', 'rawvideo', '-'],
    { maxBuffer: 1 << 20 },
  ).stdout as Buffer;
  const mean = first.length ? first.reduce((a, b) => a + b, 0) / first.length : 0;
  const varc = first.length ? first.reduce((a, b) => a + (b - mean) ** 2, 0) / first.length : 0;
  checks.push({ name: 'Frame 0 is a hook', status: ok(varc > 40), detail: `contrast ${Math.round(varc)} (needs content, not a black frame)` });

  // no stretch of black frames anywhere (a broken scene, a missing image, an encoder gap)
  const black = spawnSync(ffmpeg(), ['-hide_banner', '-i', video, '-vf', 'blackdetect=d=0.4:pix_th=0.05', '-an', '-f', 'null', '-'], {
    encoding: 'utf8',
  }).stderr;
  const gaps = [...black.matchAll(/black_start:([\d.]+) black_end:([\d.]+)/g)].map((m) => `${Number(m[1]).toFixed(1)}–${Number(m[2]).toFixed(1)} s`);
  checks.push({ name: 'No black stretches', status: ok(!gaps.length), detail: gaps.length ? gaps.join(', ') : 'none ≥ 0.4 s' });

  // the live DOM: scene errors, numbers from the facts, text clear of the platform UI
  let shots: SceneShot[] = [];
  try {
    shots = await captureScenes(l, tl, { samples: true });
    checks.push({ name: 'Scenes render without errors', status: 'pass', detail: `${shots.length} scenes, missing images/fonts included` });
  } catch (e) {
    checks.push({ name: 'Scenes render without errors', status: 'fail', detail: String((e as Error).message).split('\n').slice(0, 3).join(' ') });
  }
  if (shots.length) {
    const misses = factsGate(l, shots);
    checks.push({
      name: 'Numbers come from the facts',
      status: ok(misses.length === 0),
      detail: misses.length ? misses.map((m) => `${m.scene}: ${m.value}`).join(', ') : `${shots.length} scenes read`,
    });
    const safe = safeAreaMisses(shots, tl.safe, tl.width, tl.height);
    checks.push({
      name: `Text clear of platform UI (${tl.safe.profile})`,
      status: ok(safe.length === 0),
      detail: safe.length ? safe.slice(0, 6).map((m) => `${m.scene}: "${m.text}" (${m.edge})`).join('; ') : 'every cue checked',
    });
  }

  // pronunciation: Whisper listens to the final mix (voice over music), scene by scene
  const voiced = tl.scenes.some((s) => s.wav);
  const asr = join(workDir(l), 'asr.json');
  if (!voiced) checks.push({ name: 'Whisper hears the script', status: 'skip', detail: 'no narration (estimated timings)' });
  else if (!existsSync(mix)) checks.push({ name: 'Whisper hears the script', status: 'skip', detail: 'no mix.wav' });
  else {
    const r = spawnSync(python(), [join(REEL_ROOT, 'py', 'asr.py'), mix, asr, '--lang', tl.lang ?? 'en', '--words'], { encoding: 'utf8' });
    if (r.status === 3) checks.push({ name: 'Whisper hears the script', status: 'skip', detail: r.stderr.trim().split('\n').at(-1) ?? 'ASR unavailable' });
    else if (r.status !== 0) checks.push({ name: 'Whisper hears the script', status: 'fail', detail: `ASR failed: ${r.stderr.slice(-300)}` });
    else {
      const segs = JSON.parse(readFileSync(asr, 'utf8')) as AsrSegment[];
      const bad: string[] = [];
      let worst = 1;
      for (const [i, s] of tl.scenes.entries()) {
        if (!s.wav) continue;
        let heard: string;
        try { heard = heardInRange(segs, s.start, s.end); }
        catch (error) { bad.push(`${s.id}: ${(error as Error).message}`); continue; }
        const sc = l.spec.scenes[i]!;
        // the narrator says the spoken form; captions may show digits; either may match what ASR writes
        const sim = [similarity(spokenText(sc), heard), similarity(captionText(sc), heard)].sort((a, b) => b.score - a.score)[0]!;
        worst = Math.min(worst, sim.score);
        if (sim.score < 0.85) bad.push(`${s.id} ${(sim.score * 100) | 0}% (missing: ${sim.missing.slice(0, 5).join(', ')})`);
      }
      checks.push({
        name: 'Whisper hears the script',
        status: ok(bad.length === 0),
        detail: bad.length ? bad.join('; ') : `every scene ≥ 85% of its words (lowest ${(worst * 100) | 0}%)`,
      });
    }
  }

  // brand profile: phrases we avoid and the disclosure every post must carry
  if (l.spec.brand) {
    const f = brandFindings(loadBrand(resolve(l.dir, l.spec.brand)), l);
    checks.push({ name: 'Brand rules', status: ok(f.ok), detail: f.ok ? f.disclosure : f.problems.slice(0, 4).join('; ') });
  }

  const count = (st: Status) => checks.filter((c) => c.status === st).length;
  const verdict = count('fail') ? 'fail' : count('skip') ? 'incomplete' : 'pass';
  const md = `# QA — ${tl.title}\n\nFile: \`${video}\`\n\n**${verdict.toUpperCase()}** · ${count('pass')} passed · ${count('fail')} failed · ${count('skip')} skipped\n\n| Check | Result | Detail |\n|---|---|---|\n${checks
    .map((c) => `| ${c.name} | ${c.status === 'fail' ? '**fail**' : c.status} | ${c.detail.replace(/\|/g, '/')} |`)
    .join(
      '\n',
    )}\n\nSkipped is not passed. These checks find technical defects; they do not replace watching and listening to the result, or checking the claims against their sources.\n\nFound a problem? Fix it, re-render, and re-run every check — not only the one that failed.\n`;
  writeFileSync(join(workDir(l), 'QA.md'), md);
  writeFileSync(join(workDir(l), 'qa.json'), JSON.stringify({ video, verdict, at: new Date().toISOString(), checks }, null, 1));
  for (const c of checks) console.log(`  ${c.status === 'pass' ? '✔' : c.status === 'skip' ? '–' : '✖'} ${c.name}: ${c.detail}`);
  console.log(`${verdict === 'pass' ? '✔' : verdict === 'fail' ? '✖' : '…'} QA ${verdict}`);
  return { checks, verdict };
}
