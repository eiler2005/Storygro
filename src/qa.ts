import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { captureScenes, factsGate } from './board.ts';
import { captionText, type LoadedSpec } from './spec.ts';
import { type Timeline, workDir } from './timeline.ts';
import { ffmpeg, python, REEL_ROOT } from './tools.ts';

interface Check {
  name: string;
  ok: boolean;
  detail: string;
}

const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

/** Word overlap of the script and what Whisper heard, per scene (bag of words, order-free). */
function similarity(script: string, heard: string): { score: number; missing: string[] } {
  const a = norm(script);
  const b = new Map<string, number>();
  for (const w of norm(heard)) b.set(w, (b.get(w) ?? 0) + 1);
  const missing: string[] = [];
  let hit = 0;
  for (const w of a) {
    const n = b.get(w) ?? 0;
    if (n > 0) {
      hit++;
      b.set(w, n - 1);
    } else missing.push(w);
  }
  return { score: a.length ? hit / a.length : 1, missing };
}

/** Checks the delivered file the way a viewer and a platform will meet it. Writes .reel/QA.md. */
export async function qa(l: LoadedSpec, tl: Timeline, video: string) {
  const checks: Check[] = [];
  const probe = spawnSync(ffmpeg(), ['-hide_banner', '-i', video], { encoding: 'utf8' }).stderr;
  const v = probe.match(/Video: (\w+).*?, (\w+)\(.*?\), (\d+)x(\d+)/) ?? probe.match(/Video: (\w+)[^,]*, (\w+), (\d+)x(\d+)/);
  const dur = probe.match(/Duration: (\d+):(\d+):([\d.]+)/);
  const seconds = dur ? Number(dur[1]) * 3600 + Number(dur[2]) * 60 + Number(dur[3]) : 0;
  checks.push({
    name: 'Codec and pixels',
    ok: !!v && v[1] === 'h264' && v[2] === 'yuv420p' && /bt709/.test(probe),
    detail: v ? `${v[1]}, ${v[2]}` : 'no video stream',
  });
  checks.push({
    name: 'Size',
    ok: !!v && Number(v[3]) === tl.width && Number(v[4]) === tl.height,
    detail: v ? `${v[3]}×${v[4]}` : '?',
  });
  checks.push({ name: 'Audio track', ok: /Audio: aac/.test(probe), detail: probe.match(/Audio: [^\n]*/)?.[0] ?? 'none' });
  checks.push({
    name: 'Length',
    ok: Math.abs(seconds - tl.duration) < 0.5,
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
      ok: Math.abs(I - tl.loudness) <= 1 && peak <= -0.5,
      detail: `${I} LUFS integrated (target ${tl.loudness}), true peak ${peak} dBFS`,
    });
  }

  // the first frame must already work as a hook: something on screen, no fade from black
  const first = spawnSync(
    ffmpeg(),
    ['-v', 'error', '-i', video, '-frames:v', '1', '-vf', 'scale=64:36,format=gray', '-f', 'rawvideo', '-'],
    { maxBuffer: 1 << 20 },
  ).stdout as Buffer;
  const mean = first.length ? first.reduce((a, b) => a + b, 0) / first.length : 0;
  const varc = first.length ? first.reduce((a, b) => a + (b - mean) ** 2, 0) / first.length : 0;
  checks.push({ name: 'Frame 0 is a hook', ok: varc > 40, detail: `contrast ${Math.round(varc)} (needs content, not a black frame)` });

  // numbers on screen come from the facts
  const shots = await captureScenes(l, tl);
  const misses = factsGate(l, shots);
  checks.push({
    name: 'Numbers come from the facts',
    ok: misses.length === 0,
    detail: misses.length ? misses.map((m) => `${m.scene}: ${m.value}`).join(', ') : `${shots.length} scenes read`,
  });

  // pronunciation: Whisper listens to the final mix (voice over music), scene by scene
  const asr = join(workDir(l), 'asr.json');
  const r = existsSync(mix)
    ? spawnSync(python(), [join(REEL_ROOT, 'py', 'asr.py'), mix, asr], { encoding: 'utf8' })
    : null;
  if (r?.status === 0) {
    const segs = JSON.parse(readFileSync(asr, 'utf8')) as { start: number; end: number; text: string }[];
    const bad: string[] = [];
    for (const [i, s] of tl.scenes.entries()) {
      const heard = segs
        .filter((g) => (g.start + g.end) / 2 >= s.start && (g.start + g.end) / 2 < s.end)
        .map((g) => g.text)
        .join(' ');
      const script = captionText(l.spec.scenes[i]!);
      const sim = similarity(script, heard);
      if (sim.score < 0.85) bad.push(`${s.id} ${(sim.score * 100) | 0}% (missing: ${sim.missing.slice(0, 5).join(', ')})`);
    }
    checks.push({
      name: 'Whisper hears the script',
      ok: bad.length === 0,
      detail: bad.length ? bad.join('; ') : 'every scene ≥ 85% of its words',
    });
  } else checks.push({ name: 'Whisper hears the script', ok: false, detail: `not run: ${r?.stderr?.slice(-300) ?? 'no mix'}` });

  const md = `# QA — ${tl.title}\n\nFile: \`${video}\`\n\n| Check | Result | Detail |\n|---|---|---|\n${checks
    .map((c) => `| ${c.name} | ${c.ok ? 'pass' : '**fail**'} | ${c.detail.replace(/\|/g, '/')} |`)
    .join('\n')}\n\nFound a problem? Fix it, re-render, and re-run every check — not only the one that failed.\n`;
  writeFileSync(join(workDir(l), 'QA.md'), md);
  for (const c of checks) console.log(`  ${c.ok ? '✔' : '✖'} ${c.name}: ${c.detail}`);
  return checks;
}
