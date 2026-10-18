#!/usr/bin/env -S npx tsx
import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { approval, approve, writeBoard } from './board.ts';
import { qa } from './qa.ts';
import { cards, frames, mux, stills } from './render.ts';
import { serve } from './serve.ts';
import { loadSpec } from './spec.ts';
import { buildTimeline, resolveAt, type Timeline, workDir, writeTimeline } from './timeline.ts';
import { python, REEL_ROOT, run } from './tools.ts';

const HELP = `storygro — explainer videos as code

  storygro voice   <reel.yaml>              narrate (Kokoro), write .reel/timeline.json
  storygro score   <reel.yaml>              music + sound effects + voice → .reel/mix.wav (−14 LUFS)
  storygro still   <reel.yaml> <at>...      PNG stills; <at> = seconds | scene | scene@seconds
  storygro board   <reel.yaml>              storyboard before recording → .reel/board.html + board.pdf
  storygro approve <reel.yaml>              approve the storyboard (any script change resets it)
  storygro preview <reel.yaml>              live preview with sound in the browser
  storygro render  <reel.yaml> [--draft]    voice → score → frames → master + web MP4 → QA
  storygro qa      <reel.yaml>              check the rendered file, numbers and pronunciation
  storygro deliver <reel.yaml> [dir]        copy video, web copy, poster, cards, storyboard, QA to one folder
                                             (default ~/Downloads/<reel>) and show it in Finder

  options: --no-voice (estimated timings, no TTS)  --draft (half size, 15 fps, no gate)
           --from <s> --to <s> (render a range)     --force (skip the approval gate)`;

const argv = process.argv.slice(2);
const flag = (f: string) => argv.includes(f);
const opt = (f: string) => {
  const i = argv.indexOf(f);
  return i >= 0 ? argv[i + 1] : undefined;
};
const positional = argv.filter((a, i) => !a.startsWith('--') && !['--from', '--to', '--out'].includes(argv[i - 1] ?? ''));
const [cmd, specPath, ...rest] = positional;

if (!cmd || !specPath || cmd === 'help') {
  console.log(HELP);
  process.exit(cmd ? 0 : 1);
}

const l = loadSpec(specPath);
const out = join(workDir(l));

async function timeline(): Promise<Timeline> {
  const tl = await buildTimeline(l, { voice: !flag('--no-voice') });
  writeTimeline(l, tl);
  return tl;
}

async function score(tl: Timeline) {
  const job = join(out, 'timeline.json');
  await run(python(), [join(REEL_ROOT, 'py', 'score.py'), job, out]);
  return tl;
}

const at = (tl: Timeline, x: string) => resolveAt(tl.scenes, x);

const summary = (tl: Timeline) =>
  `${tl.scenes.length} scenes, ${tl.duration.toFixed(1)} s${flag('--no-voice') ? ' (estimated)' : ''}`;

switch (cmd) {
  case 'voice': {
    const tl = await timeline();
    for (const s of tl.scenes) console.log(`  ${s.id.padEnd(12)} ${s.start.toFixed(1).padStart(5)}s +${s.duration.toFixed(1)}s`);
    console.log(`✔ ${summary(tl)} → ${join(out, 'timeline.json')}`);
    break;
  }
  case 'score': {
    await score(await timeline());
    console.log(`✔ ${join(out, 'mix.wav')}`);
    break;
  }
  case 'still': {
    const tl = await timeline();
    const shots = Object.fromEntries(rest.map((x) => [x.replace(/[@/]/g, '_'), at(tl, x)]));
    const dir = opt('--out') ?? join(out, 'stills');
    for (const f of await stills(l, tl, shots, dir)) console.log(`✔ ${f}`);
    break;
  }
  case 'board': {
    const tl = await timeline();
    const b = await writeBoard(l, tl);
    console.log(`✔ storyboard: ${b.html}\n            ${b.pdf}`);
    if (b.misses.length) console.log(`! facts gate: ${b.misses.map((m) => `${m.scene}: ${m.value}`).join(', ')}`);
    console.log(approval(l).approved ? '✔ approved' : '… awaiting approval: storygro approve <reel.yaml>');
    break;
  }
  case 'approve': {
    if (!existsSync(join(out, 'board.html'))) throw new Error('no storyboard yet — run storygro board first');
    console.log(`✔ approved script ${approve(l, process.env.USER ?? 'owner')}`);
    break;
  }
  case 'preview': {
    const tl = await timeline();
    if (!flag('--no-voice') && !existsSync(join(out, 'mix.wav'))) await score(tl);
    const { origin } = await serve(l.dir, Number(opt('--port') ?? 0));
    const url = `${origin}/rc/runtime/index.html?timeline=/spec/.reel/timeline.json&preview=1`;
    console.log(`▶ ${url}  (space: play/pause, ←/→: seek; Ctrl+C to stop)`);
    if (process.platform === 'darwin') execFileSync('open', [url]);
    break;
  }
  case 'render': {
    const draft = flag('--draft');
    if (!draft && !flag('--force') && !approval(l).approved)
      throw new Error('the storyboard is not approved — run `storygro board`, read it, then `storygro approve`');
    const tl = await score(await timeline());
    const name = `${l.spec.scenes.length ? (l.path.split('/').at(-2) ?? 'reel') : 'reel'}${draft ? '-draft' : ''}`;
    const silent = join(out, `${name}-video.mp4`);
    console.log(`● frames (${summary(tl)})`);
    await frames(l, tl, {
      out: silent,
      scale: draft ? 0.5 : 1,
      fps: draft ? 15 : tl.fps,
      from: opt('--from') ? Number(opt('--from')) : undefined,
      to: opt('--to') ? Number(opt('--to')) : undefined,
    });
    const r = await mux(l, silent, join(out, `${name}.mp4`), { webMaxMB: 25, from: opt('--from') ? Number(opt('--from')) : undefined });
    console.log(`✔ master ${r.master}\n✔ web    ${r.web} (${r.sizeMB} MB)`);
    if (Object.keys(tl.stills).length) for (const f of await stills(l, tl, tl.stills, join(out, 'stills'))) console.log(`✔ still  ${f}`);
    for (const f of await cards(l, tl, join(out, 'stills'))) console.log(`✔ card   ${f}`);
    if (!draft) await qa(l, tl, r.master);
    break;
  }
  case 'qa': {
    const tl = JSON.parse(readFileSync(join(out, 'timeline.json'), 'utf8')) as Timeline;
    const name = l.path.split('/').at(-2) ?? 'reel';
    await qa(l, tl, join(out, `${name}.mp4`));
    break;
  }
  case 'deliver': {
    const name = l.path.split('/').at(-2) ?? 'reel';
    const dir = rest[0] ?? join(homedir(), 'Downloads', name);
    mkdirSync(dir, { recursive: true });
    const tl = JSON.parse(readFileSync(join(out, 'timeline.json'), 'utf8')) as Timeline;
    const files: [string, string][] = [
      [`${name}.mp4`, `${name}.mp4`],
      [`${name}-web.mp4`, `${name}-web.mp4`],
      ['board.pdf', `${name}-storyboard.pdf`],
      ['QA.md', `${name}-QA.md`],
      ...[...Object.keys(tl.stills), ...Object.keys(tl.cards)].map((k): [string, string] => [join('stills', `${k}.png`), `${name}-${k}.png`]),
    ];
    for (const [src, dst] of files) {
      if (!existsSync(join(out, src))) continue;
      copyFileSync(join(out, src), join(dir, dst));
      console.log(`✔ ${join(dir, dst)}`);
    }
    if (process.platform === 'darwin') execFileSync('open', [dir]);
    break;
  }
  default:
    console.log(HELP);
    process.exit(1);
}
