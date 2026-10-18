#!/usr/bin/env -S npx tsx
import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { approval, approve, keyMoment, specHash, writeBoard } from './board.ts';
import { engineVersion, fileEntry } from './manifest.ts';
import { deliverables, packageEpisode, qaState, writeSubtitles } from './package.ts';
import { qa } from './qa.ts';
import { cards, frames, mux, stills } from './render.ts';
import { serve } from './serve.ts';
import { loadSpec } from './spec.ts';
import { buildTimeline, resolveAt, type Timeline, workDir, workUrl, writeTimeline } from './timeline.ts';
import { python, REEL_ROOT, run } from './tools.ts';

const HELP = `storygro — explainer videos as code

  storygro voice    <reel.yaml>             narrate, write .reel/timeline.json (prints scene lengths)
  storygro score    <reel.yaml>             music + sound effects + voice → mix.wav (−14 LUFS)
  storygro still    <reel.yaml> <at>...     PNG stills; <at> = seconds | scene | scene@cue | scene@seconds
  storygro board    <reel.yaml>             storyboard before recording → board.html + board.pdf
  storygro approve  <reel.yaml>             approve the storyboard (any change to its inputs resets it)
  storygro preview  <reel.yaml>             live preview with sound in the browser
  storygro render   <reel.yaml> [--draft]   voice → score → frames → master + web MP4 → subtitles → QA
  storygro qa       <reel.yaml>             check the rendered file, scenes, numbers, safe area, speech
  storygro subs     <reel.yaml>             write <name>.srt and <name>.vtt from the timeline
  storygro carousel <carousel.yaml>         one PNG per scene at its key moment → carousel/
  storygro deliver  <reel.yaml> [dir]       copy the complete set + manifest.json to one folder
                                             (default ~/Downloads/<name>); refuses missing files
  storygro package  <episode.yaml> [dir]    all variants of an episode → one release folder + manifest

  A spec named <variant>.reel.yaml (e.g. ru.reel.yaml) works in .reel/<variant>/, so language
  variants share one folder, its scenes and assets. Nothing here publishes to social accounts.

  options: --no-voice (estimated timings, no TTS)  --draft (half size, 15 fps, no gate)
           --from <s> --to <s> (render a range)     --force (skip the approval / QA gate)
           --guides (stills with the platform safe area)  --allow-errors (render broken scenes)
           --partial (deliver what exists)          --allow-incomplete (package with recorded problems)`;

const argv = process.argv.slice(2);
const flag = (f: string) => argv.includes(f);
const opt = (f: string) => {
  const i = argv.indexOf(f);
  return i >= 0 ? argv[i + 1] : undefined;
};
const VALUED = ['--from', '--to', '--out', '--port'];
const positional = argv.filter((a, i) => !a.startsWith('--') && !VALUED.includes(argv[i - 1] ?? ''));
const [cmd, specPath, ...rest] = positional;
if (flag('--allow-errors')) process.env.STORYGRO_ALLOW_ERRORS = '1';

if (!cmd || !specPath || cmd === 'help') {
  console.log(HELP);
  process.exit(cmd ? 0 : 1);
}

if (cmd === 'package') {
  const r = packageEpisode(specPath, rest[0], { allowIncomplete: flag('--allow-incomplete') });
  console.log(`✔ release ${r.id} (${r.manifest.status})\n  ${r.root}`);
  for (const f of r.manifest.files) console.log(`  ${f.path}  ${(f.bytes / 1048576).toFixed(2)} MB`);
  process.exit(0);
}

const l = loadSpec(specPath);
const out = workDir(l);

async function timeline(voice = !flag('--no-voice')): Promise<Timeline> {
  const tl = await buildTimeline(l, { voice });
  writeTimeline(l, tl);
  return tl;
}

async function score(tl: Timeline) {
  await run(python(), [join(REEL_ROOT, 'py', 'score.py'), join(out, 'timeline.json'), out]);
  return tl;
}

const at = (tl: Timeline, x: string) => resolveAt(tl.scenes, x);
const savedTimeline = (): Timeline => {
  const f = join(out, 'timeline.json');
  if (!existsSync(f)) throw new Error(`no timeline yet — run storygro voice ${specPath}`);
  return JSON.parse(readFileSync(f, 'utf8')) as Timeline;
};

const summary = (tl: Timeline) =>
  `${tl.scenes.length} scenes, ${tl.duration.toFixed(1)} s${tl.scenes.some((s) => s.wav) ? '' : ' (estimated)'}`;

switch (cmd) {
  case 'voice': {
    const tl = await timeline();
    for (const s of tl.scenes) console.log(`  ${s.id.padEnd(12)} ${s.start.toFixed(1).padStart(5)}s +${s.duration.toFixed(1)}s`);
    const words = tl.scenes.reduce((n, s) => n + s.voice.words.length, 0);
    const speech = tl.scenes.reduce((n, s) => n + s.voice.duration, 0);
    console.log(`✔ ${summary(tl)}, ${words} words, ${(words / Math.max(speech, 0.1)).toFixed(2)} words/s → ${join(out, 'timeline.json')}`);
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
    for (const f of await stills(l, tl, shots, dir, { guides: flag('--guides') })) console.log(`✔ ${f}`);
    break;
  }
  case 'board': {
    const tl = await timeline();
    const b = await writeBoard(l, tl);
    console.log(`✔ storyboard: ${b.html}\n            ${b.pdf}`);
    if (b.misses.length) console.log(`! facts gate: ${b.misses.map((m) => `${m.scene}: ${m.value}`).join(', ')}`);
    if (b.safeMisses.length)
      console.log(`! safe area (${tl.safe.profile}): ${b.safeMisses.map((m) => `${m.scene}: "${m.text}" (${m.edge})`).join(', ')}`);
    console.log(approval(l).approved ? '✔ approved' : `… awaiting approval: storygro approve ${specPath}`);
    break;
  }
  case 'approve': {
    if (!existsSync(join(out, 'board.html'))) throw new Error('no storyboard yet — run storygro board first');
    console.log(`✔ approved inputs ${approve(l, process.env.USER ?? 'owner')}`);
    break;
  }
  case 'preview': {
    const tl = await timeline();
    if (!flag('--no-voice') && !existsSync(join(out, 'mix.wav'))) await score(tl);
    const { origin } = await serve(l.dir, Number(opt('--port') ?? 0));
    const url = `${origin}/rc/runtime/index.html?timeline=${workUrl(l)}/timeline.json&preview=1${flag('--guides') ? '&guides=1' : ''}`;
    console.log(`▶ ${url}  (space: play/pause, ←/→: seek; Ctrl+C to stop)`);
    if (process.platform === 'darwin') execFileSync('open', [url]);
    break;
  }
  case 'render': {
    const draft = flag('--draft');
    if (!draft && !flag('--force') && !approval(l).approved)
      throw new Error('the storyboard is not approved — run `storygro board`, read it, then `storygro approve`');
    const tl = await score(await timeline());
    const name = `${l.name}${draft ? '-draft' : ''}`;
    const silent = join(out, `${name}-video.mp4`);
    console.log(`● frames (${summary(tl)})`);
    const from = opt('--from') ? Number(opt('--from')) : undefined;
    await frames(l, tl, { out: silent, scale: draft ? 0.5 : 1, fps: draft ? 15 : tl.fps, from, to: opt('--to') ? Number(opt('--to')) : undefined });
    const r = await mux(l, silent, join(out, `${name}.mp4`), { webMaxMB: 25, from });
    rmSync(silent, { force: true });
    console.log(`✔ master ${r.master}\n✔ web    ${r.web} (${r.sizeMB} MB)`);
    for (const f of writeSubtitles(l, tl)) console.log(`✔ subs   ${f}`);
    if (Object.keys(tl.stills).length) for (const f of await stills(l, tl, tl.stills, join(out, 'stills'))) console.log(`✔ still  ${f}`);
    for (const f of await cards(l, tl, join(out, 'stills'))) console.log(`✔ card   ${f}`);
    if (!draft && from === undefined && !opt('--to')) await qa(l, tl, r.master);
    break;
  }
  case 'qa': {
    const r = await qa(l, savedTimeline(), join(out, `${l.name}.mp4`));
    if (r.verdict === 'fail') process.exitCode = 1;
    break;
  }
  case 'subs': {
    for (const f of writeSubtitles(l, savedTimeline())) console.log(`✔ ${f}`);
    break;
  }
  case 'carousel': {
    const tl = await timeline(false);
    const dir = join(out, 'carousel');
    rmSync(dir, { recursive: true, force: true });
    const shots = Object.fromEntries(tl.scenes.map((s, i) => [`${String(i + 1).padStart(2, '0')}-${s.id}`, s.start + keyMoment(s)]));
    for (const f of await stills(l, tl, shots, dir, { guides: flag('--guides') })) console.log(`✔ ${f}`);
    break;
  }
  case 'deliver': {
    const tl = savedTimeline();
    const d = deliverables(l, tl);
    const q = qaState(l);
    const problems = [...d.missing.map((m) => `missing ${m}`), ...(q.problem ? [q.problem] : [])];
    if (problems.length && !flag('--partial') && !flag('--force'))
      throw new Error(`deliver refused:\n${problems.map((p) => `  ✖ ${p}`).join('\n')}\n(--partial delivers what exists and records the gaps)`);
    const dir = rest[0] ?? join(homedir(), 'Downloads', l.name);
    mkdirSync(dir, { recursive: true });
    const files = [];
    for (const [src, dst] of d.required) {
      if (!existsSync(src)) continue;
      copyFileSync(src, join(dir, dst));
      files.push(fileEntry(join(dir, dst), dir));
      console.log(`✔ ${join(dir, dst)}`);
    }
    const manifest = {
      name: l.name,
      title: l.spec.title,
      lang: l.spec.lang,
      createdAt: new Date().toISOString(),
      engine: engineVersion(),
      inputsHash: specHash(l),
      approved: approval(l),
      qa: q,
      problems,
      published: false,
      files,
    };
    writeFileSync(join(dir, 'manifest.json'), JSON.stringify(manifest, null, 1));
    console.log(`✔ ${join(dir, 'manifest.json')}${problems.length ? ` (${problems.length} problem(s) recorded)` : ''}`);
    if (process.platform === 'darwin' && !process.env.CI) execFileSync('open', [dir]);
    break;
  }
  default:
    console.log(HELP);
    process.exit(1);
}
