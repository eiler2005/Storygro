/**
 * The content workflow on top of the engine: three approvals per variant (script → storyboard →
 * release) recorded in Git, a plan document per episode that people read and comment on, and a
 * tracker across every episode that says whose move it is. See docs/explanation/content-workflow.md.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { basename, join, relative, resolve } from 'node:path';
import { parse } from 'yaml';
import { approval, captureScenes, factsGate, type SceneShot, specHash } from './board.ts';
import { imageJobs, imageState, loadImageLedger } from './images.ts';
import { loadLexicon, spokenWithMarks, uncheckedNames } from './lexicon.ts';
import { loadEpisode, qaState } from './package.ts';
import { DEFAULT_LEDGER_PATH, type Ledger, loadLedger } from './publish.ts';
import { fileHash, loadReview, type Review, scriptHash, type Step, STEPS, stepRecord, writeApproval } from './review.ts';
import { captionText, type LoadedSpec, loadSpec } from './spec.ts';
import type { Timeline } from './timeline.ts';
import { workDir } from './timeline.ts';
import { ffmpeg } from './tools.ts';

export type StepState = 'approved' | 'technical' | 'changed' | 'pending' | 'not-recorded';
export interface StepInfo { step: Step; state: StepState; by?: string; at?: string }

const master = (l: LoadedSpec) => join(workDir(l), `${l.name}.mp4`);

/** The current hash of what each step approves; release also needs a rendered master. */
export function stepHash(l: LoadedSpec, step: Step): string | undefined {
  if (step === 'script') return scriptHash(l);
  if (step === 'storyboard') return specHash(l);
  return existsSync(master(l)) ? `${specHash(l)}:${fileHash(master(l))}` : undefined;
}

export function stepStates(l: LoadedSpec): StepInfo[] {
  const recorded = !!loadReview(l.dir);
  return STEPS.map((step) => {
    if (step === 'storyboard') {
      const a = approval(l);
      if (!a.at) return { step, state: 'pending' };
      return { step, state: !a.approved ? 'changed' : a.role === 'agent' ? 'technical' : 'approved', by: a.by, at: a.at };
    }
    const rec = stepRecord(l, step);
    if (!rec) return { step, state: step === 'script' && !recorded ? 'not-recorded' : 'pending' };
    const now = stepHash(l, step);
    return { step, state: rec.hash !== now ? 'changed' : rec.role === 'agent' ? 'technical' : 'approved', by: rec.by, at: rec.at };
  });
}

/**
 * Records an approval. Release needs a master that passed QA after the storyboard was approved;
 * the storyboard needs a board to have been looked at. Agents record `agent` (technical) approvals.
 */
export function approveStep(l: LoadedSpec, step: Step, by: string, role: 'owner' | 'agent') {
  if (step === 'storyboard' && !existsSync(join(workDir(l), 'board.html')))
    throw new Error('no storyboard yet — run storygro board (or storygro plan) first');
  if (step === 'release') {
    if (!approval(l).approved) throw new Error('the storyboard is not approved in its current state');
    const qa = qaState(l);
    if (qa.verdict !== 'pass' || qa.problem) throw new Error(`release needs a master that passed QA (${qa.problem ?? qa.verdict})`);
  }
  const hash = stepHash(l, step);
  if (!hash) throw new Error('nothing to approve yet');
  writeApproval(l, step, { hash, at: new Date().toISOString(), by, role, ...(step === 'release' ? { master: fileHash(master(l)) } : {}) });
  return hash;
}

export type Stage = 'script' | 'storyboard' | 'release' | 'ready' | 'published';
export interface VariantStatus {
  episode: string;
  title: string;
  series?: string;
  dir: string;
  variant: string;
  lang: string;
  duration: number | null;
  voiced: boolean;
  steps: StepInfo[];
  qa: string;
  stage: Stage;
  /** whose move: the owner decides, the agent produces */
  turn: 'owner' | 'agent' | 'none';
  waitingFor: string;
  facts: { total: number; sourced: number };
  questions: { owner: number; agent: number };
  published: { platform: string; url?: string }[];
  plan: boolean;
}

/** A fact's source: `_source` (a quote with the reference) or `source` (a URL), whichever the file uses. */
const sourceOf = (o: Record<string, unknown>) =>
  typeof o._source === 'string' ? o._source : typeof o.source === 'string' ? o.source : undefined;

const factsCount = (l: LoadedSpec) => {
  let total = 0;
  let sourced = 0;
  for (const p of Object.values(l.spec.data)) {
    const f = resolve(l.dir, p);
    if (!existsSync(f) || !f.endsWith('.json')) continue;
    const data = JSON.parse(readFileSync(f, 'utf8')) as Record<string, unknown>;
    for (const [k, v] of Object.entries(data)) {
      if (k.startsWith('_')) continue;
      total++;
      if (v && typeof v === 'object' && sourceOf(v as Record<string, unknown>)) sourced++;
    }
  }
  return { total, sourced };
};

export function variantStatus(l: LoadedSpec, ep: { id: string; title: string; series?: string; dir: string }, ledger?: Ledger): VariantStatus {
  const steps = stepStates(l);
  const qa = qaState(l);
  const review = loadReview(l.dir);
  const tlFile = join(workDir(l), 'timeline.json');
  const tl = existsSync(tlFile) ? (JSON.parse(readFileSync(tlFile, 'utf8')) as Timeline) : undefined;
  const published = (ledger?.publications ?? [])
    .filter((p) => p.episode === ep.id && p.variant === (l.variant || p.variant) && p.state === 'published')
    .map((p) => ({ platform: p.platform, url: p.url }));
  const ok = (s: StepInfo) => s.state === 'approved' || s.state === 'not-recorded';
  const first = steps.find((s) => !ok(s));
  const stage: Stage = published.length ? 'published' : first ? first.step : 'ready';
  const missingPictures = l.style?.def.images ? imageJobs(l).some((j) => imageState(l, j) === 'missing') : false;
  const qaPassed = qa.verdict === 'pass' && !qa.problem;
  let turn: VariantStatus['turn'] = 'none';
  let waitingFor = '';
  if (stage === 'script') [turn, waitingFor] = ['owner', 'approve the script'];
  else if (stage === 'storyboard')
    [turn, waitingFor] = missingPictures || !existsSync(join(workDir(l), 'board.html')) ? ['agent', 'pictures and storyboard'] : ['owner', 'approve the storyboard'];
  else if (stage === 'release') [turn, waitingFor] = qaPassed ? ['owner', 'watch and approve the release'] : ['agent', 'render and QA'];
  else if (stage === 'ready') [turn, waitingFor] = ['owner', 'publish (manual)'];
  const openOwner = (review?.questions ?? []).filter((q) => q.open && q.for === 'owner').length;
  if (openOwner && turn !== 'owner') [turn, waitingFor] = ['owner', `answer ${openOwner} question(s)`];
  return {
    episode: ep.id, title: ep.title, series: ep.series, dir: ep.dir, variant: l.variant || 'default', lang: l.spec.lang,
    duration: tl ? Math.round(tl.duration * 10) / 10 : null, voiced: !!tl?.scenes.some((s) => (s as { wav?: string }).wav),
    steps, qa: qaPassed ? 'pass' : qa.verdict, stage, turn, waitingFor, facts: factsCount(l),
    questions: { owner: openOwner, agent: (review?.questions ?? []).filter((q) => q.open && q.for === 'agent').length },
    published, plan: existsSync(join(l.dir, `PLAN${l.variant ? `.${l.variant}` : ''}.md`)) || existsSync(join(l.dir, 'PLAN.md')),
  };
}

/** Every episode under a folder (each `<id>/episode.yaml`), every variant. */
export function tracker(videosDir: string, opts: { ledgerPath?: string } = {}) {
  const ledgerFile = opts.ledgerPath ?? DEFAULT_LEDGER_PATH;
  const ledger = existsSync(ledgerFile) ? loadLedger(ledgerFile) : undefined;
  const rows: VariantStatus[] = [];
  for (const name of readdirSync(videosDir).sort()) {
    const epPath = join(videosDir, name, 'episode.yaml');
    if (!existsSync(epPath)) continue;
    const { episode, dir } = loadEpisode(epPath);
    const series = (parse(readFileSync(epPath, 'utf8')) as { series?: string }).series;
    for (const v of episode.variants) rows.push(variantStatus(loadSpec(resolve(dir, v.spec)), { id: episode.id, title: episode.title, series, dir }, ledger));
  }
  return { generatedAt: new Date().toISOString(), rows };
}

// ── words for the documents (Russian for Russian reels, English otherwise) ──

const RU = {
  stage: { script: 'сценарий', storyboard: 'раскадровка', release: 'просмотр ролика', ready: 'готов', published: 'опубликован' },
  step: { script: 'Сценарий', storyboard: 'Раскадровка', release: 'Выпуск' },
  state: { approved: '✅ одобрено', technical: '⚙️ техническое (агент)', changed: '✏️ изменено после одобрения', pending: '⏳ ждёт', 'not-recorded': '— не записано' },
  waiting: {
    'approve the script': 'одобрить сценарий', 'pictures and storyboard': 'картинки и раскадровка', 'approve the storyboard': 'одобрить раскадровку',
    'watch and approve the release': 'посмотреть и одобрить ролик', 'render and QA': 'рендер и проверка', 'publish (manual)': 'опубликовать вручную',
  } as Record<string, string>,
  turn: { owner: 'ждёт тебя', agent: 'агент', none: '—' },
  plan: 'План', generated: 'Сгенерировано `storygro plan` из', dontEdit: 'Не правьте этот файл: текст — в спецификации ролика, вопросы и заметки — в `review.yaml`. Затем `storygro plan` заново.',
  status: 'Статус', length: 'Длительность', voiced: 'по озвучке', estimated: 'оценка по тексту', format: 'Формат', voice: 'Голос', series: 'Серия',
  approvals: 'Одобрения', who: 'Кто и когда', questions: 'Вопросы', noQuestions: 'Открытых вопросов нет.', notes: 'Заметки',
  hook: 'Хук', chosen: 'выбран', variant: 'Вариант', scenes: 'Сцены', voiceLabel: 'Голос', screen: 'На экране', pictures: 'Картинки',
  sound: 'Звук', facts: 'Факты', frame: 'кадр в ключевой момент, затем картинки сцены по порядку',
  factsTitle: 'Факты и источники', post: 'Текст поста', next: 'Что дальше', missingNumbers: 'Числа не из фактов', none: 'нет',
  howTo: 'Одобрить: `storygro approve <spec> --step script|storyboard|release` (агент — с `--agent`).',
  sec: 'с', scenesWord: 'сцен',
  stressLabel: 'Ударения', auto: 'авто, проверьте', byAuthor: 'автор', byLexicon: 'словарь',
  heard: 'На слух', right: 'верно', wrong: 'НЕВЕРНО', unclear: 'неясно', take: 'дубль',
  unchecked: 'Ударение не проверено', uncheckedHow: 'найти и добавить в словарь: `storygro stress <spec> --lookup --write`',
} as const;
const EN = {
  stage: { script: 'script', storyboard: 'storyboard', release: 'watch the cut', ready: 'ready', published: 'published' },
  step: { script: 'Script', storyboard: 'Storyboard', release: 'Release' },
  state: { approved: '✅ approved', technical: '⚙️ technical (agent)', changed: '✏️ changed since approval', pending: '⏳ waiting', 'not-recorded': '— not recorded' },
  waiting: {} as Record<string, string>,
  turn: { owner: 'waiting for you', agent: 'agent', none: '—' },
  plan: 'Plan', generated: 'Generated by `storygro plan` from', dontEdit: 'Do not edit this file: the text lives in the reel spec, questions and notes in `review.yaml`. Then run `storygro plan` again.',
  status: 'Status', length: 'Length', voiced: 'narrated', estimated: 'estimated from the text', format: 'Format', voice: 'Voice', series: 'Series',
  approvals: 'Approvals', who: 'By, when', questions: 'Questions', noQuestions: 'No open questions.', notes: 'Notes',
  hook: 'Hook', chosen: 'chosen', variant: 'Variant', scenes: 'Scenes', voiceLabel: 'Voice', screen: 'On screen', pictures: 'Pictures',
  sound: 'Sound', facts: 'Facts', frame: 'the frame at the key moment, then the scene\'s pictures in order',
  factsTitle: 'Facts and sources', post: 'Post text', next: 'Next', missingNumbers: 'Numbers not from the facts', none: 'none',
  howTo: 'Approve: `storygro approve <spec> --step script|storyboard|release` (agents add `--agent`).',
  sec: 's', scenesWord: 'scenes',
  stressLabel: 'Stress', auto: 'auto, check it', byAuthor: 'author', byLexicon: 'dictionary',
  heard: 'Heard', right: 'right', wrong: 'WRONG', unclear: 'unclear', take: 'take',
  unchecked: 'Stress not checked', uncheckedHow: 'look up and add to the dictionary: `storygro stress <spec> --lookup --write`',
};
const words = (lang: string) => (lang.startsWith('ru') ? RU : EN);

const cell = (s: string) => s.replace(/\|/g, '/').replace(/\s+/g, ' ').trim();
const day = (iso?: string) => (iso ? iso.slice(0, 10) : '');

/** Strings a viewer reads in the scene's overlays (bound props), without pictures, prompts and layout keys. */
const LAYOUT = new Set(['image', 'split', 'prompt', 'splitPrompt', 'move', 'focus', 'zoom', 'at', 'until', 'tone', 'side', 'align', 'width', 'height', 'size', 'x', 'y', 'keyAt', 'fade', 'mark', 'seed', 'kind', 'scene', 'id']);
export function screenText(props: unknown, key = ''): string[] {
  if (typeof props === 'string') return LAYOUT.has(key) || key.endsWith('From') || /^[\w./-]+\.(png|jpe?g|svg|webp|mp4|json)$/i.test(props) ? [] : [props];
  if (typeof props === 'number') return LAYOUT.has(key) ? [] : [String(props)];
  if (Array.isArray(props)) return props.flatMap((v) => screenText(v, key));
  if (props && typeof props === 'object') return Object.entries(props).flatMap(([k, v]) => (k === 'shots' ? [] : screenText(v, k)));
  return [];
}

/** `facts.a.b.value` references in a scene's props, with the nearest `_source` above them. */
function factRefs(props: unknown, data: Record<string, unknown>): { ref: string; value: string; source?: string }[] {
  const refs: string[] = [];
  const walk = (v: unknown, k = ''): void => {
    if (typeof v === 'string' && k.endsWith('From')) refs.push(v);
    else if (Array.isArray(v)) v.forEach((x) => walk(x, k));
    else if (v && typeof v === 'object') Object.entries(v).forEach(([kk, vv]) => walk(vv, kk));
  };
  walk(props);
  return [...new Set(refs)].map((ref) => {
    const parts = ref.split('.');
    let node: unknown = data;
    let source: string | undefined;
    for (const p of parts) {
      if (node && typeof node === 'object') source = sourceOf(node as Record<string, unknown>) ?? source;
      node = node && typeof node === 'object' ? (node as Record<string, unknown>)[p] : undefined;
    }
    return { ref, value: typeof node === 'string' || typeof node === 'number' ? String(node) : '', source };
  });
}

const loadData = (l: LoadedSpec) =>
  Object.fromEntries(Object.entries(l.spec.data).map(([k, p]) => {
    const f = resolve(l.dir, p);
    return [k, existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')) : {}];
  }));

/**
 * One review strip per scene: the rendered frame at the key moment, then the scene's pictures,
 * scaled to one height and kept small enough for Git (documentation previews stay ≤ 300 KiB).
 */
function strip(out: string, inputs: string[], height = 360) {
  const files = inputs.filter((f) => existsSync(f));
  if (!files.length) return false;
  for (const q of [5, 8, 12, 18]) {
    const scale = files.map((_, i) => `[${i}:v]scale=-2:${height},setsar=1[v${i}]`).join(';');
    const graph = files.length === 1 ? `${scale};[v0]null[o]` : `${scale};${files.map((_, i) => `[v${i}]`).join('')}hstack=inputs=${files.length}[o]`;
    execFileSync(ffmpeg(), ['-v', 'error', '-y', ...files.flatMap((f) => ['-i', f]), '-filter_complex', graph, '-map', '[o]', '-frames:v', '1', '-q:v', String(q), out]);
    if (statSync(out).size <= 280 * 1024) return true;
  }
  return true;
}

/** Writes PLAN.md (PLAN.<variant>.md for a variant) and preview/plan/<variant>/<scene>.jpg next to the reel. */
export async function writePlan(l: LoadedSpec, tl: Timeline, captured?: SceneShot[]) {
  const w = words(l.spec.lang);
  const shots = captured ?? (await captureScenes(l, tl));
  const misses = factsGate(l, shots);
  const lex = loadLexicon();
  const previewDir = join(l.dir, 'preview', 'plan', l.variant || 'default');
  mkdirSync(previewDir, { recursive: true });
  const planName = l.variant ? `PLAN.${l.variant}.md` : 'PLAN.md';
  const data = loadData(l);
  const jobs = l.style?.def.images ? imageJobs(l) : [];
  const ledger = jobs.length ? loadImageLedger(l) : undefined;
  const epFile = join(l.dir, 'episode.yaml');
  const ep = existsSync(epFile) ? loadEpisode(epFile).episode : undefined;
  const status = variantStatus(l, { id: ep?.id ?? basename(l.dir), title: l.spec.title ?? basename(l.dir), series: ep ? (parse(readFileSync(epFile, 'utf8')) as { series?: string }).series : undefined, dir: l.dir });
  const review: Review | undefined = loadReview(l.dir);
  const voiced = tl.scenes.some((s) => (s as { wav?: string }).wav);

  const lines: string[] = [
    `# ${w.plan}: ${l.spec.title ?? basename(l.dir)}`, '',
    `> ${w.generated} \`${basename(l.path)}\`, ${day(new Date().toISOString())}. ${w.dontEdit}`, '',
    '| | |', '|---|---|',
    `| ${w.status} | **${w.stage[status.stage]}** · ${w.turn[status.turn]}${status.waitingFor ? `: ${(w.waiting[status.waitingFor] ?? status.waitingFor)}` : ''} |`,
    `| ${w.length} | ${tl.duration.toFixed(1)} ${w.sec} (${voiced ? w.voiced : w.estimated}) · ${tl.scenes.length} ${w.scenesWord} |`,
    `| ${w.format} | ${tl.width}×${tl.height}, ${tl.fps} fps${l.style ? ` · style \`${l.style.def.id}\`` : ''} |`,
    `| ${w.voice} | ${l.spec.voice.engine}${l.spec.voice.voice ? ` · ${cell(String(l.spec.voice.voice))}` : ''}${l.spec.voice.speed ? ` · ${l.spec.voice.speed}` : ''} |`,
    ...(status.series ? [`| ${w.series} | ${status.series} |`] : []),
    '', `## ${w.approvals}`, '', `| | | ${w.who} |`, '|---|---|---|',
    ...status.steps.map((s) => `| ${w.step[s.step]} | ${w.state[s.state]} | ${cell(s.by ?? '')} ${day(s.at)} |`),
    '', w.howTo, '', `## ${w.questions}`, '',
  ];
  const qs = review?.questions ?? [];
  if (qs.length) lines.push(...qs.map((q) => `- [${q.open ? ' ' : 'x'}] **${q.for}** · ${q.ask}${q.answer ? ` — ${q.answer}` : ''}`));
  else lines.push(w.noQuestions);
  if (review?.notes) lines.push('', `**${w.notes}:** ${review.notes}`);

  const hooks = l.spec.hooks.length ? l.spec.hooks : [l.spec.scenes[0]!.say];
  lines.push('', `## ${w.hook}`, '', ...hooks.map((h, i) => `- ${w.variant} ${i + 1}${i === 0 ? ` · **${w.chosen}**` : ''}: «${captionText({ ...l.spec.scenes[0]!, say: h, caption: undefined })}»`));

  lines.push('', `## ${w.scenes}`, '');
  for (const [i, s] of tl.scenes.entries()) {
    const spec = l.spec.scenes.find((x) => x.id === s.id)!;
    const shot = shots.find((x) => x.id === s.id);
    const pics = (Array.isArray(spec.props.shots) ? spec.props.shots : []) as Record<string, unknown>[];
    const files = pics.flatMap((p) => [p.image, p.split]).filter((f): f is string => typeof f === 'string').map((f) => resolve(l.dir, f));
    const img = join(previewDir, `${s.id}.jpg`);
    const made = strip(img, [...(shot ? [shot.png] : []), ...files]);
    const text = [...new Set(screenText(s.props))];
    const refs = factRefs(spec.props, data);
    lines.push(`### ${i + 1}. ${s.id} · ${s.start.toFixed(1)}–${(s.start + s.duration).toFixed(1)} ${w.sec} · \`${spec.scene}\``, '');
    if (made) lines.push(`![${s.id}: ${w.frame}](${relative(l.dir, img)})`, '', `<sub>${w.frame}</sub>`, '');
    lines.push(`**${w.voiceLabel}:** ${captionText(spec)}`, '');
    if (text.length) lines.push(`**${w.screen}:** ${text.map((t) => `«${cell(t)}»`).join(' · ')}`, '');
    if (pics.length) {
      lines.push(`**${w.pictures}:**`, '');
      for (const p of pics) {
        const file = typeof p.image === 'string' ? relative(l.dir, resolve(l.dir, p.image)) : '';
        const job = jobs.find((j) => j.file === file);
        const st = job ? imageState(l, job, ledger) : existsSync(resolve(l.dir, file)) ? 'ok' : 'missing';
        lines.push(`- ${p.at ? `\`@${String(p.at)}\` ` : ''}${cell(String(p.prompt ?? file))} — ${st}`);
      }
      lines.push('');
    }
    const stress = s.voice?.stress ?? [];
    const by = (d: { by: string }) => (d.by === 'auto' ? w.auto : d.by === 'lexicon' ? w.byLexicon : w.byAuthor);
    if (stress.length)
      lines.push(`**${w.stressLabel}:** ${stress.map((d) => `${d.word} → ${d.stressed.replace(/\+([аеёиоуыэюяАЕЁИОУЫЭЮЯ])/g, '$1\u0301')} (${by(d)})`).join(' · ')}`, '');
    const checked = s.voice?.checked ?? [];
    if (checked.length)
      lines.push(`**${w.heard}:** ${checked.map((c) => `${c.word} — ${c.ok ? w.right : c.ok === false ? w.wrong : w.unclear} (${w.take} ${c.take + 1})`).join(' · ')}`, '');
    const sceneSpec = l.spec.scenes.find((x) => x.id === s.id);
    const unchecked = l.spec.lang.startsWith('ru') && sceneSpec ? uncheckedNames(spokenWithMarks(sceneSpec), lex) : [];
    if (unchecked.length) lines.push(`> ⚠️ ${w.unchecked}: ${unchecked.join(', ')} — ${w.uncheckedHow}`, '');
    if (s.sfx.length) lines.push(`**${w.sound}:** ${s.sfx.map((x) => `${x.kind} @${(x.t - s.start).toFixed(1)}`).join(', ')}`, '');
    if (refs.length) lines.push(`**${w.facts}:** ${refs.map((r) => `\`${r.ref}\` = «${cell(r.value)}»`).join(' · ')}`, '');
    const miss = misses.filter((m) => m.scene === s.id);
    if (miss.length) lines.push(`> ⚠️ ${w.missingNumbers}: ${miss.map((m) => m.value).join(', ')}`, '');
  }

  const facts = Object.entries(data).flatMap(([file, obj]) =>
    Object.entries(obj as Record<string, unknown>).filter(([k]) => !k.startsWith('_')).map(([k, v]) => [`${file}.${k}`, v && typeof v === 'object' ? sourceOf(v as Record<string, unknown>) : undefined] as const));
  if (facts.length)
    lines.push(`## ${w.factsTitle}`, '', '| | |', '|---|---|', ...facts.map(([k, src]) => `| \`${k}\` | ${cell(typeof src === 'string' ? src : '—')} |`), '',
      existsSync(join(l.dir, 'sources.md')) ? `→ [sources.md](sources.md)` : '', '');
  if (l.spec.post?.text) lines.push(`## ${w.post}`, '', ...l.spec.post.text.trim().split('\n').map((x) => (x ? `> ${x}` : '>')), '');

  const out = join(l.dir, planName);
  writeFileSync(out, `${lines.join('\n').replace(/\n{3,}/g, '\n\n').trim()}\n`);
  return { plan: out, previews: previewDir, misses };
}

/** The tracker as Markdown: a summary of whose move it is, then one row per variant. */
export function trackerMarkdown(t: ReturnType<typeof tracker>, from: string): string {
  const w = RU;
  const mark = (s: StepInfo) => ({ approved: '✅', technical: '⚙️', changed: '✏️', pending: '⏳', 'not-recorded': '—' })[s.state];
  const count = (stage: Stage) => t.rows.filter((r) => r.stage === stage).length;
  const owner = t.rows.filter((r) => r.turn === 'owner');
  const link = (r: VariantStatus) => {
    const plan = ['PLAN.md', `PLAN.${r.variant}.md`].map((p) => join(r.dir, p)).find((p) => existsSync(p));
    const readme = join(r.dir, 'README.md');
    const target = plan ?? (existsSync(readme) ? readme : join(r.dir, 'episode.yaml'));
    return `[${cell(r.title)}](${relative(from, target)})`;
  };
  return [
    '# Трекер выпусков', '',
    `> Сгенерировано \`storygro tracker\` ${day(t.generatedAt)}. Одобрения и вопросы — из \`review.yaml\` в Git; длительность, проверка (QA) и рендер — локальное состояние этой копии (\`.reel/\`), публикации — из журнала. Не правьте вручную.`, '',
    `**Ждут тебя: ${owner.length}** · сценарий ${count('script')} · раскадровка ${count('storyboard')} · просмотр ${count('release')} · готово ${count('ready')} · опубликовано ${count('published')}`, '',
    ...(owner.length ? ['## Ждут тебя', '', ...owner.map((r) => `- ${link(r)} (${r.variant}) — ${w.waiting[r.waitingFor] ?? r.waitingFor}`), ''] : []),
    '## Все выпуски', '',
    '| Выпуск | Вариант | Серия | Этап | Чей ход | Сценарий · раскадровка · выпуск | Длит. | QA | Факты с источником | Вопросы | Опубликовано |',
    '|---|---|---|---|---|---|---|---|---|---|---|',
    ...t.rows.map((r) => `| ${link(r)} | ${r.variant} (${r.lang}) | ${r.series ?? '—'} | ${w.stage[r.stage]} | ${w.turn[r.turn]}${r.waitingFor ? `: ${w.waiting[r.waitingFor] ?? r.waitingFor}` : ''} | ${r.steps.map(mark).join(' ')} | ${r.duration === null ? '—' : `${r.duration} с`} | ${r.qa} | ${r.facts.sourced}/${r.facts.total} | ${r.questions.owner + r.questions.agent || '—'} | ${r.published.length ? r.published.map((p) => (p.url ? `[${p.platform}](${p.url})` : p.platform)).join(', ') : '—'} |`),
    '', '✅ одобрено владельцем · ⚙️ техническое одобрение агента · ✏️ изменено после одобрения · ⏳ ждёт · — шаг не записан (выпуск старше процесса)', '',
  ].join('\n');
}

