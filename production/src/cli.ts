#!/usr/bin/env -S npx tsx
import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { basename, dirname, join, relative, resolve } from 'node:path';
import { generateImages, imageJobs, imageState, loadImageLedger } from './images.ts';
import { listStyles, loadStyle, scaffold, stylesMarkdown } from './style.ts';
import { clock, transcribe, transcriptStats } from './transcript.ts';
import { approval, keyMoment, specHash, writeBoard } from './board.ts';
import { STEPS, type Step } from './review.ts';
import { approveStep, tracker, trackerMarkdown, writePlan } from './workflow.ts';
import { engineVersion, fileEntry } from './manifest.ts';
import { recordCapture } from './capture.ts';
import { seriesMarkdown, seriesStatus } from './brand.ts';
import * as P from './publish.ts';
import { collectTrends, loadIdeas, loadTrendsConfig, type TrendsReport, trendsMarkdown } from './ideas.ts';
import { parse as parseYaml } from 'yaml';
import { deliverables, packageEpisode, qaState, writeSubtitles } from './package.ts';
import { qa } from './qa.ts';
import { cards, frames, mux, stills } from './render.ts';
import { serve } from './serve.ts';
import { fitSocialVideo } from './social-fit.ts';
import { loadSpec } from './spec.ts';
import { appendEntries, entriesFor, type Found, LEXICON_PATH, loadLexicon, lookupStress, nameAround, spokenWithMarks, uncheckedNames, WORD as LEX_WORD } from './lexicon.ts';
import { buildTimeline, resolveAt, type Timeline, workDir, workUrl, writeTimeline } from './timeline.ts';
import { python, REEL_ROOT, run } from './tools.ts';

const HELP = `storygro — explainer videos as code

  storygro ideas    <backlog.yaml>          rank editorial ideas (explicit 0–5 ratings, no network)
  storygro trends   <sources.yaml>          research scan: Google Trends, Wikipedia, Hacker News, GitHub, HF papers,
                                             Telegram channels, feeds; loud headlines set aside, picks ordered; no API keys
                    [--backlog backlog.yaml] [--md report.md] [--inbox dir]   watchlist per idea, report, X digests
  storygro voice    <reel.yaml>             narrate, write .reel/timeline.json (prints scene lengths)
  storygro score    <reel.yaml>             music + sound effects + voice → mix.wav (−14 LUFS)
  storygro still    <reel.yaml> <at>...     PNG stills; <at> = seconds | scene | scene@cue | scene@seconds
  storygro board    <reel.yaml>             storyboard before recording → board.html + board.pdf
  storygro plan     <reel.yaml>             review document: PLAN.<variant>.md with frames, pictures, text, facts, approvals
  storygro stress   <reel.yaml> [--lookup] [--write]   Russian stress per scene: dictionary words, author marks, unchecked
                                            names; --lookup finds them in ru.wikipedia/ru.wiktionary, --write adds them
  storygro approve  <reel.yaml> [--step script|storyboard|release] [--agent | --by name]
                                             record an approval in review.yaml (any change resets it)
  storygro tracker  <videos-dir> [--md f]   every episode: stage, whose move, approvals, QA, questions
  storygro preview  <reel.yaml>             live preview with sound in the browser
  storygro render   <reel.yaml> [--draft]   voice → score → frames → master + web MP4 → subtitles → QA
  storygro social   <reel.yaml> <dir>      optional review copies with visible padding; native Reels use render
  storygro qa       <reel.yaml>             check the rendered file, scenes, numbers, safe area, speech
  storygro subs     <reel.yaml>             write <name>.srt and <name>.vtt from the timeline
  storygro carousel <carousel.yaml>         one PNG per scene at its key moment → carousel/
  storygro series   <series.yaml> [--md f]  episodes of a series: length, approval, QA verdict, latest package
  storygro capture  <x.capture.yaml>        record a scripted browser session (frames + finger) for a screencast scene
  storygro styles                           list the styles in production/styles/ (cartoon, cut-paper, …)
  storygro new      <folder> --style <id> [--lang en] [--title "…"] [--target instagram-reels]
                                             start a content project in a style: episode, script template, facts
  storygro images   <reel.yaml> [--dry-run] [--force] [--only <scene>]
                                             generate the pictures its shots ask for (local mflux), record them in images.json
  storygro transcript <file.txt | media | url> [--out dir] [--lang en]
                                             transcript of a reference video: .json, .md, .srt and pace statistics
  storygro publish  plan <release-dir> --variant ru --platform instagram --account @handle
                    | approve <id> | mark <id> <state> [--url …] [--note …] | checklist <id> | list
                                             manual publication ledger: records uploads, uploads nothing
  storygro metrics  add <id> --window 7d --source "…" views=1200 likes=80 | report
  storygro deliver  <reel.yaml> [dir]       copy the complete set + manifest.json to one folder
                                             (default ~/Downloads/<name>); refuses missing files
  storygro package  <episode.yaml> [dir]    all variants of an episode → one release folder + manifest

  A spec named <variant>.reel.yaml (e.g. ru.reel.yaml) works in .reel/<variant>/, so language
  variants share one folder, its scenes and assets. Nothing here publishes to social accounts.

  options: --no-voice (estimated timings, no TTS)  --draft (half size, 15 fps, no gate)
           --from <s> --to <s> (render a range)     --force (skip the approval / QA gate)
           --blur <n> (motion blur: n captures per frame; overrides format.blur)
           --guides (stills with the platform safe area)  --allow-errors (render broken scenes)
           --partial (deliver what exists)          --allow-incomplete (package with recorded problems)`;

const argv = process.argv.slice(2);
const flag = (f: string) => argv.includes(f);
const opt = (f: string) => {
  const i = argv.indexOf(f);
  return i >= 0 ? argv[i + 1] : undefined;
};
const VALUED = ['--blur', '--from', '--to', '--out', '--port', '--backlog', '--md', '--variant', '--platform', '--account', '--note', '--url', '--external-id', '--window', '--source', '--at', '--ledger', '--metrics', '--style', '--lang', '--title', '--target', '--only', '--inbox', '--step', '--by'];
const positional = argv.filter((a, i) => !a.startsWith('--') && !VALUED.includes(argv[i - 1] ?? ''));
const [cmd, specPath, ...rest] = positional;
if (flag('--allow-errors')) process.env.STORYGRO_ALLOW_ERRORS = '1';

if (cmd === 'styles') {
  console.log(stylesMarkdown(listStyles()));
  process.exit(0);
}

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

if (cmd === 'publish' || cmd === 'metrics') {
  // the publication ledger and metrics snapshots: a manual adapter, nothing is uploaded from here
  const ledgerPath = opt('--ledger') ?? P.DEFAULT_LEDGER_PATH;
  const metricsPath = opt('--metrics') ?? P.DEFAULT_METRICS_PATH;
  const sub = specPath;
  const ledger = P.loadLedger(ledgerPath);
  if (cmd === 'publish' && sub === 'plan') {
    const dir = rest[0];
    if (!dir) throw new Error('usage: storygro publish plan <release-dir> --variant ru --platform instagram --account @handle');
    const r = P.planPublication(ledger, {
      releaseDir: dir, manifest: JSON.parse(readFileSync(join(dir, 'manifest.json'), 'utf8')),
      variant: opt('--variant') ?? '', platform: opt('--platform') ?? '', account: opt('--account') ?? '', again: flag('--again'),
    });
    P.saveLedger(ledgerPath, r.ledger);
    console.log(`✔ draft ${r.publication.id}\n  next: storygro publish approve '${r.publication.id}'`);
  } else if (cmd === 'publish' && sub === 'approve') {
    P.saveLedger(ledgerPath, P.transition(ledger, rest[0] ?? '', 'approved', { note: opt('--note') }).ledger);
    console.log(`✔ approved ${rest[0]}`);
  } else if (cmd === 'publish' && sub === 'mark') {
    const r = P.transition(ledger, rest[0] ?? '', rest[1] ?? '', { note: opt('--note'), url: opt('--url'), externalId: opt('--external-id') });
    P.saveLedger(ledgerPath, r.ledger);
    console.log(`✔ ${r.publication.id} → ${r.publication.state}`);
  } else if (cmd === 'publish' && sub === 'checklist') {
    const pub = P.findPublication(ledger, rest[0] ?? '');
    const post = pub.files.find((f) => f.role === 'post');
    console.log(P.checklist(pub, post ? readFileSync(join(pub.releaseDir, post.path), 'utf8') : undefined));
  } else if (cmd === 'publish' && sub === 'list') {
    console.log(P.publicationsMarkdown(ledger));
  } else if (cmd === 'metrics' && sub === 'add') {
    const pairs = rest.slice(1).filter((x) => x.includes('='));
    const r = P.addSnapshot(ledger, P.loadMetrics(metricsPath), {
      publicationId: rest[0] ?? '', window: opt('--window') ?? '', capturedAt: opt('--at') ?? new Date().toISOString(),
      source: opt('--source') ?? '', values: P.parseMetricPairs(pairs),
    });
    P.saveMetrics(metricsPath, r.store);
    console.log(`✔ snapshot ${r.snapshot.window} for ${rest[0]}`);
  } else if (cmd === 'metrics' && sub === 'report') {
    console.log(P.metricsReport(ledger, P.loadMetrics(metricsPath)));
  } else throw new Error(`unknown: ${cmd} ${sub} — see storygro help`);
  process.exit(0);
}

if (cmd === 'capture') {
  const r = await recordCapture(specPath, { out: opt('--out'), log: (m) => process.stdout.write(`${m}\r`) });
  console.log(`\n✔ ${r.meta.frames} frames, ${r.meta.duration} s at ${r.meta.fps} fps, ${r.meta.pixels.width}×${r.meta.pixels.height} → ${r.out}`);
  if (r.meta.taps.length) console.log(`  taps at ${r.meta.taps.map((t) => `${t.t}s`).join(', ')}`);
  process.exit(0);
}

if (cmd === 'new') {
  const id = opt('--style');
  if (!id) throw new Error('usage: storygro new <folder> --style <id> [--lang en] [--title "…"] [--target instagram-reels] — see storygro styles');
  const style = loadStyle(id);
  for (const f of scaffold(specPath, style, { lang: opt('--lang'), title: opt('--title'), target: opt('--target') })) console.log(`✔ ${f}`);
  console.log(`  next: write the script, then ${style.def.images ? `storygro images ${join(specPath, `${opt('--lang') ?? 'en'}.reel.yaml`)} and ` : ''}storygro board`);
  process.exit(0);
}

if (cmd === 'transcript') {
  const outDir = opt('--out') ?? join('.reel', 'transcripts', basename(specPath).replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9-]+/g, '-'));
  const r = await transcribe(specPath, outDir, { lang: opt('--lang') });
  const st = transcriptStats(r.transcript.segments);
  console.log(
    `✔ ${r.transcript.method}: ${clock(st.duration)}, ${st.words} words, ${st.wordsPerMinute} words/min, ${st.sentences} sentences, ${st.questions.length} questions, ${st.numbers.length} numbers`,
  );
  for (const f of r.files) console.log(`✔ ${f}`);
  process.exit(0);
}

if (cmd === 'images') {
  const ls = loadSpec(specPath);
  if (flag('--dry-run')) {
    const ledger = loadImageLedger(ls);
    for (const j of imageJobs(ls).filter((j) => !opt('--only') || j.scene === opt('--only')))
      console.log(`  ${imageState(ls, j, ledger).padEnd(9)} ${j.file}  (seed ${j.seed})\n            ${j.prompt}`);
    process.exit(0);
  }
  const r = await generateImages(ls, { force: flag('--force'), only: opt('--only') });
  console.log(`✔ ${r.made.length} made, ${r.kept.length} up to date${r.handMade.length ? `, ${r.handMade.length} hand-made kept (${r.handMade.join(', ')})` : ''}`);
  process.exit(0);
}

if (cmd === 'tracker') {
  // every episode under a folder: stage, whose move, approvals, QA, facts, questions, publications
  const md = trackerMarkdown(tracker(specPath, { ledgerPath: opt('--ledger') }), dirname(resolve(opt('--md') ?? 'TRACKER.md')));
  const dest = opt('--md');
  if (dest) {
    writeFileSync(dest, md);
    console.log(`✔ ${dest}`);
  } else console.log(md);
  process.exit(0);
}

if (cmd === 'series') {
  const r = seriesStatus(specPath);
  const md = seriesMarkdown(r);
  const dest = opt('--md');
  if (dest) {
    writeFileSync(dest, `${md}\n`);
    console.log(`✔ ${dest}`);
  } else console.log(md);
  process.exit(0);
}

/** X digests pasted from Grok or by hand: *.md / *.txt files in the inbox folder (or one file). */
function inboxFiles(path: string | undefined) {
  if (!path) return [];
  const files = statSync(path).isDirectory()
    ? readdirSync(path).filter(f => /\.(md|txt)$/i.test(f)).sort().map(f => join(path, f))
    : [path];
  return files.map(file => ({ file: basename(file), text: readFileSync(file, 'utf8') }));
}

if (cmd === 'ideas' || cmd === 'trends') {
  const backlogPath = opt('--backlog');
  const report =
    cmd === 'ideas'
      ? loadIdeas(specPath)
      : await collectTrends(loadTrendsConfig(specPath), {
        ...(backlogPath ? { backlog: parseYaml(readFileSync(backlogPath, 'utf8')) } : {}),
        imports: inboxFiles(opt('--inbox')),
      });
  const json = JSON.stringify(report, null, 2);
  const dest = opt('--out');
  if (dest) {
    mkdirSync(join(dest, '..'), { recursive: true });
    writeFileSync(dest, `${json}\n`);
    console.log(`✔ ${dest}`);
  } else if (!opt('--md')) console.log(json);
  const md = opt('--md');
  if (md && cmd === 'trends') {
    mkdirSync(join(md, '..'), { recursive: true });
    writeFileSync(md, `${trendsMarkdown(report as TrendsReport)}\n`);
    console.log(`✔ ${md}`);
  }
  if ('status' in report && report.status === 'unavailable') process.exitCode = 1;
  process.exit(process.exitCode ?? 0);
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
  case 'social': {
    if (!rest[0]) throw new Error('usage: storygro social <reel.yaml> <new-output-dir>');
    if (!approval(l).approved) throw new Error('source storyboard changed — approve and render the source first');
    const q = qaState(l);
    if (q.problem) throw new Error(`social export refused: ${q.problem}`);
    await fitSocialVideo(join(out, `${l.name}.mp4`), resolve(rest[0]));
    break;
  }
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
    // script → storyboard → release, recorded in review.yaml; an agent records only technical approvals
    const step = opt('--step') ?? 'storyboard';
    if (!(STEPS as readonly string[]).includes(step)) throw new Error(`--step must be one of ${STEPS.join(', ')}`);
    const agent = flag('--agent');
    if (!agent && !opt('--by') && !process.env.STORYGRO_APPROVER && !process.stdin.isTTY)
      throw new Error('not run from a terminal: an agent records a technical approval with --agent; a person passes --by <name>');
    const by = opt('--by') ?? (agent ? 'agent' : (process.env.STORYGRO_APPROVER ?? process.env.USER ?? 'owner'));
    const hash = approveStep(l, step as Step, by, agent ? 'agent' : 'owner');
    console.log(`✔ ${step} ${agent ? 'technically approved (agent)' : `approved by ${by}`} · ${hash} → ${relative(process.cwd(), join(l.dir, 'review.yaml'))}`);
    break;
  }
  case 'stress': {
    // the narrator's stress, scene by scene: dictionary words, the author's marks, names nobody checked
    if (!l.spec.lang.startsWith('ru')) {
      console.log('stress: the dictionary and the checks are for Russian reels');
      break;
    }
    const lex = loadLexicon();
    const all = new Map<string, string>();
    for (const s of l.spec.scenes) {
      const text = spokenWithMarks(s);
      const dict = entriesFor(text, lex).map((e) => e.say);
      const marked = [...text.matchAll(LEX_WORD)].map((m) => m[0]).filter((w) => /[+\u0301]/.test(w));
      const unchecked = uncheckedNames(text, lex);
      for (const w of unchecked) if (!all.has(w)) all.set(w, nameAround(text, w));
      console.log(`  ${s.id.padEnd(12)} dictionary: ${dict.join(', ') || '—'} · author: ${marked.join(', ') || '—'}${unchecked.length ? ` · ! unchecked: ${unchecked.join(', ')}` : ''}`);
    }
    if (!all.size) {
      console.log('✔ every capitalised word has a checked stress');
      break;
    }
    if (!flag('--lookup')) {
      console.log(`! ${all.size} word(s) without a checked stress — look them up: storygro stress ${specPath} --lookup [--write]`);
      break;
    }
    const found: Found[] = [];
    for (const [w, context] of all) {
      const f = await lookupStress(w, context);
      if (f) {
        found.push(f);
        console.log(`  ✔ ${w} → ${f.say.replace(/\+(.)/, '$1\u0301')}   ${f.source}`);
      } else console.log(`  ? ${w}: not found — mark it by hand (+) in the script or add it to ${relative(process.cwd(), LEXICON_PATH)}`);
    }
    if (flag('--write') && found.length) {
      appendEntries(found);
      console.log(`✔ ${found.length} entr${found.length === 1 ? 'y' : 'ies'} → ${relative(process.cwd(), LEXICON_PATH)}; read the diff, then storygro voice ${specPath}`);
    }
    break;
  }
  case 'plan': {
    // the review document: storyboard frames + pictures + text per scene, approvals, questions, facts
    const tl = await timeline();
    const b = await writeBoard(l, tl);
    const p = await writePlan(l, tl, b.shots);
    console.log(`✔ ${relative(process.cwd(), p.plan)}\n  previews: ${relative(process.cwd(), p.previews)}`);
    if (p.misses.length) console.log(`! facts gate: ${p.misses.map((m) => `${m.scene}: ${m.value}`).join(', ')}`);
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
    if (opt('--blur')) {
      tl.blur = Math.max(1, Math.round(Number(opt('--blur'))));
      writeTimeline(l, tl);
    }
    const name = `${l.name}${draft ? '-draft' : ''}`;
    const silent = join(out, `${name}-video.mp4`);
    console.log(`● frames (${summary(tl)})`);
    const from = opt('--from') ? Number(opt('--from')) : undefined;
    await frames(l, tl, { out: silent, scale: draft ? 0.5 : 1, fps: draft ? 15 : tl.fps, blur: draft ? 1 : tl.blur, from, to: opt('--to') ? Number(opt('--to')) : undefined });
    const r = await mux(l, silent, join(out, `${name}.mp4`), { webMaxMB: 25, from });
    rmSync(silent, { force: true });
    console.log(`✔ master ${r.master}\n✔ web    ${r.web} (${r.sizeMB} MB)`);
    for (const f of writeSubtitles(l, tl)) console.log(`✔ subs   ${f}`);
    if (Object.keys(tl.stills).length) for (const f of await stills(l, tl, tl.stills, join(out, 'stills'))) console.log(`✔ still  ${f}`);
    for (const f of await cards(l, tl, join(out, 'stills'))) console.log(`✔ card   ${f}`);
    if (!draft && from === undefined && !opt('--to')) {
      const result = await qa(l, tl, r.master);
      if (result.verdict !== 'pass') process.exitCode = 1;
    }
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
