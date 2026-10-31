import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { Tab } from './cdp.ts';
import { assertNoErrors, playerUrl } from './render.ts';
import { serve } from './serve.ts';
import { captionText, type LoadedSpec } from './spec.ts';
import { type SafeArea, type Timeline, workDir } from './timeline.ts';
import { REEL_ROOT } from './tools.ts';
import { stepRecord, writeApproval } from './review.ts';

const READY = "document.documentElement.dataset.ready === '1'";
const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export interface TextBox {
  t: string;
  x: number;
  y: number;
  w: number;
  h: number;
  /** px the text sticks out of the box it sits in (a card, a band, a label); 0 inside or without one */
  over?: number;
  /** reel seconds of the sample */
  at?: number;
}
export interface SceneShot {
  id: string;
  at: number;
  png: string;
  text: string;
  boxes: TextBox[];
}

/**
 * Text a viewer can actually see in the scene: on stage, not transparent, not hidden, with its box
 * in stage pixels. Elements under [data-rc-safe-ignore] (ambient background type) are not boxed.
 */
const VISIBLE_TEXT = (id: string) => `(() => {
  const root = document.querySelector('.rc-scene--${id}');
  if (!root) return { text: '', boxes: [] };
  const stage = document.getElementById('stage').getBoundingClientRect();
  const seen = new Set();
  const out = [];
  const boxes = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const txt = n.textContent.replace(/\\s+/g, ' ').trim();
    if (!txt) continue;
    const el = n.parentElement;
    let op = 1, ok = true;
    for (let e = el; e && e !== document.body; e = e.parentElement) {
      const cs = getComputedStyle(e);
      if (cs.display === 'none' || cs.visibility === 'hidden') { ok = false; break; }
      op *= Number(cs.opacity);
    }
    const range = document.createRange();
    range.selectNodeContents(n);
    const r = range.getBoundingClientRect();
    const onStage = r.width > 0 && r.right > stage.left && r.left < stage.right && r.bottom > stage.top && r.top < stage.bottom;
    if (!ok || op < 0.15 || !onStage) continue;
    // the box the text sits in: the nearest ancestor inside the scene that paints a background or a border
    let over = 0;
    for (let e = el; e && e !== root; e = e.parentElement) {
      const cs = getComputedStyle(e);
      const paints = (cs.backgroundColor !== 'rgba(0, 0, 0, 0)' && cs.backgroundColor !== 'transparent') || cs.backgroundImage !== 'none' || parseFloat(cs.borderTopWidth) > 0;
      if (!paints) continue;
      const c = e.getBoundingClientRect();
      // sideways strictly; up and down the text box is the font's full ascent and descent, taller than a
      // tight line-height although the letters sit inside, so allow 0.3 of the font size there
      const slack = parseFloat(getComputedStyle(el).fontSize) * 0.3;
      over = Math.max(0, c.left - r.left, r.right - c.right, c.top - r.top - slack, r.bottom - c.bottom - slack);
      break;
    }
    if (!el.closest('[data-rc-safe-ignore]'))
      boxes.push({ t: txt.slice(0, 60), x: r.left - stage.left, y: r.top - stage.top, w: r.width, h: r.height, over: Math.round(over) });
    if (!seen.has(txt)) { seen.add(txt); out.push(txt); }
  }
  return { text: out.join('\\n'), boxes };
})()`;

/** The moment that sums a scene up: just after its voice ends, or props.keyAt. */
export function keyMoment(s: Timeline['scenes'][number]): number {
  const k = s.props.keyAt;
  if (typeof k === 'number') return k;
  if (typeof k === 'string' && s.cues[k] !== undefined) return s.cues[k]!;
  return Math.max(0, Math.min(s.duration - 0.05, s.voiceAt + s.voice.duration + 0.15));
}

/**
 * One still and the on-screen text per scene, read from the live DOM. With `samples`, also reads
 * the text at every cue (for the safe-area check) without saving those frames.
 */
export async function captureScenes(l: LoadedSpec, tl: Timeline, opts: { samples?: boolean } = {}): Promise<SceneShot[]> {
  const dir = join(workDir(l), 'board');
  mkdirSync(dir, { recursive: true });
  const { server, origin } = await serve(l.dir);
  const tab = await Tab.open(tl.width, tl.height);
  const shots: SceneShot[] = [];
  try {
    await tab.goto(playerUrl(origin, tl), READY);
    await assertNoErrors(tab, 'storyboard');
    for (const [i, s] of tl.scenes.entries()) {
      const at = keyMoment(s);
      // sample inside the scene, outside the transition windows where scenes legitimately move
      const tIn = (s.transition?.dur ?? 0) / 2 + 0.05;
      const tOut = s.duration - (tl.scenes[i + 1]?.transition?.dur ?? 0) / 2 - 0.05;
      await tab.eval(`reel.seek(${s.start + at})`);
      const png = join(dir, `${s.id}.png`);
      writeFileSync(png, await tab.shot('jpeg', 80));
      const seen = await tab.eval<{ text: string; boxes: TextBox[] }>(VISIBLE_TEXT(s.id));
      const boxes = seen.boxes.map((b) => ({ ...b, at: s.start + at }));
      if (opts.samples) {
        // twice per cue: early (an overlay that leaves soon) and late (one still growing into its full size)
        const times = new Set(Object.values(s.cues).flatMap((v) => [0.6, 1.4].map((d) => Math.min(Math.max(v + d, tIn), tOut))));
        // and the cover: the platform shows that frame cropped
        const cover = coverTime(tl);
        if (cover >= s.start && cover < s.end) times.add(cover - s.start);
        for (const c of times) {
          await tab.eval(`reel.seek(${s.start + c})`);
          boxes.push(...(await tab.eval<{ boxes: TextBox[] }>(VISIBLE_TEXT(s.id))).boxes.map((b) => ({ ...b, at: s.start + c })));
        }
      }
      shots.push({ id: s.id, at, png, text: seen.text.replace(/\n{2,}/g, '\n').trim(), boxes });
    }
    await assertNoErrors(tab, 'storyboard');
  } finally {
    tab.close();
    server.close();
  }
  return shots;
}

/** Text boxes that reach into the platform UI margins (more than `tolerance` px). */
export function safeAreaMisses(shots: SceneShot[], safe: SafeArea, width: number, height: number, tolerance = 4) {
  const misses: { scene: string; text: string; edge: string }[] = [];
  for (const s of shots)
    for (const b of s.boxes) {
      const edge =
        b.y < safe.top - tolerance ? 'top'
        : b.y + b.h > height - safe.bottom + tolerance ? 'bottom'
        : b.x < safe.left - tolerance ? 'left'
        : b.x + b.w > width - safe.right + tolerance ? 'right'
        : '';
      if (edge && !misses.some((m) => m.scene === s.id && m.text === b.t)) misses.push({ scene: s.id, text: b.t, edge });
    }
  return misses;
}

/** Reel seconds of the cover: `stills.cover`, or the first frame, which platforms use when none is chosen. */
export const coverTime = (tl: Timeline) => tl.stills.cover ?? 0;

/** Text of the cover frame that the `cover` crop (a link preview's square) cuts off. */
export function coverTextMisses(shots: SceneShot[], tl: Timeline, tolerance = 4) {
  const crop = tl.safe.crops?.find((c) => c.name === 'cover');
  if (!crop) return [];
  const t = coverTime(tl);
  const misses: { scene: string; text: string; edge: string }[] = [];
  for (const s of shots)
    for (const b of s.boxes) {
      if (b.at === undefined || Math.abs(b.at - t) > 0.001) continue;
      const edge = b.y < crop.cut - tolerance ? 'top' : b.y + b.h > tl.height - crop.cut + tolerance ? 'bottom' : '';
      if (edge && !misses.some((m) => m.text === b.t)) misses.push({ scene: s.id, text: b.t, edge });
    }
  return misses;
}

/** Text that sticks out of its own card, band or label by more than `tolerance` px (a number wider than its badge). */
export function boxMisses(shots: SceneShot[], tolerance = 4) {
  const misses: { scene: string; text: string; edge: string; over: number }[] = [];
  for (const s of shots)
    for (const b of s.boxes)
      if ((b.over ?? 0) > tolerance && !misses.some((m) => m.scene === s.id && m.text === b.t)) misses.push({ scene: s.id, text: b.t, edge: `out of its box by ${b.over}px`, over: b.over! });
  return misses;
}

const NUM = /[−-]?[$€£]?\d[\d.,:   ]*\d?(?:\s?[kKMB%×x])?/g;

/** Facts gate: every number on screen must appear verbatim in a data file or the allowlist. */
export function factsGate(l: LoadedSpec, shots: SceneShot[]) {
  const corpus = [
    ...Object.values(l.spec.data).map((p) => readFileSync(resolve(l.dir, p), 'utf8')),
    ...l.spec.allowNumbers,
    ...l.spec.scenes.map((s) => s.say),
  ].join('\n');
  const misses: { scene: string; value: string }[] = [];
  for (const s of shots)
    for (const m of s.text.matchAll(NUM)) {
      const v = m[0].trim().replace(/[.,:]$/, '');
      if (!/\d/.test(v) || corpus.includes(v)) continue;
      // also accept the bare digits, so "$69k" passes when the facts say "$69k" inside a sentence
      const digits = v.replace(/[^\d.,:]/g, '');
      if (digits && corpus.includes(digits) && digits.length > 2) continue;
      misses.push({ scene: s.id, value: v });
    }
  return misses;
}

/**
 * Every input the approved script depends on: the spec, its data files, theme, overlay, scene modules
 * (built-in and custom) and files the props point to. Changing any of them resets the approval.
 */
export function specInputs(l: LoadedSpec): string[] {
  const files = new Set<string>([l.path]);
  const add = (p: string) => {
    if (existsSync(p) && statSync(p).isFile()) files.add(p);
  };
  // a style supplies defaults and the theme; its definition is an input like the reel itself
  if (l.style) files.add(l.style.path);
  for (const p of Object.values(l.spec.data)) files.add(resolve(l.dir, p));
  if (l.spec.theme) add(resolve(l.dir, l.spec.theme));
  if (l.spec.overlay) add(resolve(l.dir, l.spec.overlay));
  if (l.spec.voice.engine === 'audio') add(resolve(l.dir, l.spec.voice.voice));
  for (const s of l.spec.scenes) {
    if (s.voice?.source) add(resolve(l.dir, s.voice.source));
    add(s.scene.includes('/') || s.scene.endsWith('.js') ? resolve(l.dir, s.scene) : join(REEL_ROOT, 'scenes', `${s.scene}.js`));
    const walk = (v: unknown): void => {
      if (typeof v === 'string' && /\.[a-z0-9]{2,5}$/i.test(v) && !v.includes('://')) add(resolve(l.dir, v));
      else if (Array.isArray(v)) v.forEach(walk);
      else if (v && typeof v === 'object') Object.values(v).forEach(walk);
    };
    walk(s.props);
  }
  // fonts and images a theme pulls in
  if (l.spec.theme) {
    const theme = resolve(l.dir, l.spec.theme);
    if (existsSync(theme))
      for (const m of readFileSync(theme, 'utf8').matchAll(/url\(['"]?([^'")]+)['"]?\)/g))
        if (!m[1]!.includes('://') && !m[1]!.startsWith('data:')) add(resolve(theme, '..', m[1]!));
  }
  return [...files].sort();
}

export function specHash(l: LoadedSpec): string {
  const h = createHash('sha1');
  for (const f of specInputs(l)) h.update(`${relative(l.dir, f)}\0`).update(readFileSync(f)).update('\0');
  return h.digest('hex').slice(0, 12);
}

/**
 * The storyboard approval that gates rendering: the `storyboard` step in the episode's review.yaml
 * (in Git), or a local `.reel/<variant>/approved.json` written before review records existed.
 */
export function approval(l: LoadedSpec): { approved: boolean; hash: string; at?: string; by?: string; role?: 'owner' | 'agent' } {
  const hash = specHash(l);
  const rec = stepRecord(l, 'storyboard');
  if (rec) return { approved: rec.hash === hash, hash, at: rec.at, by: rec.by, role: rec.role };
  const f = join(workDir(l), 'approved.json');
  if (!existsSync(f)) return { approved: false, hash };
  const a = JSON.parse(readFileSync(f, 'utf8')) as { hash: string; at: string; by?: string };
  return { approved: a.hash === hash, hash, at: a.at, by: a.by, role: /agent|claude|technical/i.test(a.by ?? '') ? 'agent' : 'owner' };
}

/** Records the storyboard approval of the current inputs in review.yaml. */
export function approve(l: LoadedSpec, by: string, role: 'owner' | 'agent' = 'owner'): string {
  const hash = specHash(l);
  writeApproval(l, 'storyboard', { hash, at: new Date().toISOString(), by, role });
  return hash;
}

const fmt = (t: number) => `${t.toFixed(1)}`;

/** The storyboard: one card per scene — time, voice, what is on screen, sound, still. */
export function boardHtml(
  l: LoadedSpec,
  tl: Timeline,
  shots: SceneShot[],
  misses: { scene: string; value: string }[],
  safeMisses: { scene: string; text: string; edge: string }[] = [],
) {
  const { spec } = l;
  const gate = approval(l);
  const words = tl.scenes.reduce((n, s) => n + s.voice.words.length, 0);
  const speech = tl.scenes.reduce((n, s) => n + s.voice.duration, 0);
  const img = (p: string) => `data:image/jpeg;base64,${readFileSync(p).toString('base64')}`;
  const hooks = [spec.scenes[0]!.say, ...spec.hooks];
  const card = (s: Timeline['scenes'][number], i: number) => {
    const shot = shots.find((x) => x.id === s.id)!;
    const sc = spec.scenes[i]!;
    const say = esc(sc.say)
      .replace(/\{#([a-z0-9-]+)\}/g, '<span class="cue">$1</span>')
      .replace(/\{\+([\d.]+)\}/g, '<span class="cue pause">pause $1 s</span>')
      .replace(/\[([^\]]+)\]\((\/[^)]*\/)\)/g, '<span class="ph" title="$2">$1</span>');
    const sceneMiss = misses.filter((m) => m.scene === s.id);
    const sceneSafe = safeMisses.filter((m) => m.scene === s.id);
    const sa = tl.safe;
    const guide = sa
      ? `<div class="guide" style="left:${(100 * sa.left) / tl.width}%;right:${(100 * sa.right) / tl.width}%;top:${(100 * sa.top) / tl.height}%;bottom:${(100 * sa.bottom) / tl.height}%"></div>`
      : '';
    return `<section class="card">
  <header><b>S${i + 1}</b> <code>${fmt(s.start)}–${fmt(s.end)} s</code> <span class="id">${esc(s.id)}</span><span class="tag">${esc(sc.scene.replace(/^.*\//, '').replace(/\.js$/, ''))}</span></header>
  <div class="body">
    <div class="col">
      <h4>Voice</h4><p class="say">${say}</p>
      <h4>On screen</h4><p class="screen">${shot.text
        .split('\n')
        .filter(Boolean)
        .slice(0, 24)
        .map((x) => esc(x))
        .join(' <span class="sep">·</span> ')}</p>
      <h4>Sound</h4><p class="meta">music ${Math.round(s.energy * 100)}%${s.sfx.length ? ` · ${s.sfx.map((x) => `${x.kind} @${fmt(x.t - s.start)}`).join(', ')}` : ''}${s.transition ? ` · in: ${s.transition.kind}` : ''}</p>
      ${sceneMiss.length ? `<p class="warn">Numbers not in the facts: ${sceneMiss.map((m) => esc(m.value)).join(', ')}</p>` : ''}
      ${sceneSafe.length ? `<p class="warn">Text under platform UI: ${sceneSafe.map((m) => `${esc(m.text)} (${m.edge})`).join(', ')}</p>` : ''}
    </div>
    <figure><div class="frame"><img src="${img(shot.png)}">${guide}</div><figcaption>frame at ${fmt(s.start + shot.at)} s · dashed: ${esc(sa?.profile ?? '')} safe area</figcaption></figure>
  </div>
</section>`;
  };
  return `<!doctype html><html lang="${esc(tl.lang ?? 'en')}"><head><meta charset="utf-8"><title>${esc(spec.title)} — storyboard</title>
<style>
  :root { --ink:#16202c; --muted:#5e6b7a; --line:#dde3ea; --accent:#9a7420; --ok:#1f8a5b; --bad:#c2412d; }
  * { box-sizing: border-box; }
  body { margin: 0; padding: 40px 48px; font: 15px/1.5 -apple-system, "Helvetica Neue", Arial, sans-serif; color: var(--ink); background: #fff; }
  h1 { font-size: 26px; margin: 0 0 4px; } h2 { font-size: 18px; margin: 32px 0 12px; }
  h4 { margin: 10px 0 4px; font: 600 11px/1.2 ui-monospace, Menlo, monospace; letter-spacing: .12em; text-transform: uppercase; color: var(--muted); }
  .sub { color: var(--muted); margin: 0 0 20px; }
  .stats { display: flex; gap: 28px; flex-wrap: wrap; margin: 16px 0; }
  .stats div { border-left: 3px solid var(--accent); padding-left: 10px; } .stats b { display: block; font-size: 20px; }
  .gate { border: 2px solid ${gate.approved ? 'var(--ok)' : 'var(--accent)'}; border-radius: 10px; padding: 14px 18px; margin: 18px 0; }
  .gate b { color: ${gate.approved ? 'var(--ok)' : 'var(--accent)'}; font-family: ui-monospace, Menlo, monospace; font-size: 12px; letter-spacing: .1em; }
  .hook { border: 1px solid var(--line); border-radius: 10px; padding: 12px 16px; margin: 8px 0; }
  .hook.chosen { border: 2px solid var(--accent); } .hook small { color: var(--accent); font-family: ui-monospace, monospace; }
  .card { border: 1px solid var(--line); border-radius: 12px; margin: 14px 0; break-inside: avoid; overflow: hidden; }
  .card header { display: flex; gap: 12px; align-items: baseline; padding: 10px 16px; border-bottom: 1px solid var(--line); background: #fafbfc; }
  .card header b { color: var(--accent); } .card .id { color: var(--muted); } .card .tag { margin-left: auto; font: 12px ui-monospace, monospace; color: var(--muted); }
  .body { display: grid; grid-template-columns: 1fr ${tl.height > tl.width ? 220 : 360}px; gap: 18px; padding: 8px 14px 12px; }
  .frame { position: relative; } .guide { position: absolute; outline: 1.5px dashed rgba(255,255,255,.85); box-shadow: 0 0 0 1px rgba(0,0,0,.35); pointer-events: none; }
  .say { font-size: 15px; margin: 0; } .screen { margin: 0; font-size: 13px; color: var(--ink); } .sep { color: var(--line); } .cue { font: 11px ui-monospace, monospace; background: #f3ead6; color: #7a5a12; border-radius: 4px; padding: 1px 5px; margin: 0 2px; }
  .cue.pause { background: #e3eef9; color: #1f5f9f; } .ph { border-bottom: 1px dotted var(--accent); }
  ul { margin: 0; padding-left: 18px; } li { margin: 1px 0; } .meta { margin: 0; color: var(--muted); font-size: 13px; }
  .warn { color: var(--bad); font-weight: 600; }
  figure { margin: 8px 0 0; } figure img { width: 100%; border-radius: 8px; border: 1px solid var(--line); display: block; }
  figcaption { font-size: 12px; color: var(--muted); margin-top: 4px; }
  @media print { body { padding: 0; } }
</style></head><body>
<h1>${esc(spec.title)}</h1>
<p class="sub">Storyboard before recording · ${tl.width}×${tl.height} · ${tl.fps} fps · ${esc(tl.lang ?? 'en')} · voice ${esc(spec.voice.engine)} ${esc(spec.voice.voice)}${tl.scenes.some((x) => x.wav) ? '' : ' · <b>estimated timings, no voice yet</b>'}</p>
<div class="stats">
  <div><b>${fmt(tl.duration)} s</b>length</div>
  <div><b>${tl.scenes.length}</b>scenes</div>
  <div><b>${words}</b>spoken words</div>
  <div><b>${(words / Math.max(1, speech)).toFixed(2)}</b>words / s of speech</div>
  <div><b style="color:${misses.length ? 'var(--bad)' : 'var(--ok)'}">${misses.length ? `${misses.length} issue(s)` : 'clean'}</b>facts gate</div>
  <div><b style="color:${safeMisses.length ? 'var(--bad)' : 'var(--ok)'}">${safeMisses.length ? `${safeMisses.length} issue(s)` : 'clean'}</b>safe area (${esc(tl.safe?.profile ?? '-')}) · text in its box</div>
</div>
<div class="gate"><b>${gate.approved ? `APPROVED · ${esc(gate.at ?? '')}` : 'AWAITING APPROVAL'}</b><br>
${gate.approved ? 'The full render may run; any change to the script or the facts resets this gate.' : 'Read the cards, then run <code>storygro approve</code>. The full render refuses an unapproved script.'}
<br><small>script hash ${gate.hash}</small></div>
<h2>Hook</h2>
${hooks.map((h, i) => `<div class="hook${i === 0 ? ' chosen' : ''}"><small>${i === 0 ? 'Variant 1 · chosen' : `Variant ${i + 1}`}</small><br>${esc(captionText({ ...spec.scenes[0]!, say: h, caption: undefined }))}</div>`).join('')}
<h2>Scenes</h2>
${tl.scenes.map(card).join('\n')}
</body></html>`;
}

/** Writes board.html and board.pdf next to the timeline. */
export async function writeBoard(l: LoadedSpec, tl: Timeline) {
  const shots = await captureScenes(l, tl, { samples: true });
  const misses = factsGate(l, shots);
  // the board lists text that leaves the safe area and text that leaves its own box together
  const safeMisses = [...safeAreaMisses(shots, tl.safe, tl.width, tl.height), ...boxMisses(shots)];
  const html = boardHtml(l, tl, shots, misses, safeMisses);
  const dir = workDir(l);
  const htmlPath = join(dir, 'board.html');
  writeFileSync(htmlPath, html);
  const tab = await Tab.open(1200, 900);
  try {
    await tab.send('Page.navigate', { url: `file://${htmlPath}` });
    await new Promise((r) => setTimeout(r, 800));
    const pdf = await tab.send<{ data: string }>('Page.printToPDF', {
      printBackground: true,
      paperWidth: 8.27,
      paperHeight: 11.69,
      marginTop: 0.5,
      marginBottom: 0.5,
      marginLeft: 0.5,
      marginRight: 0.5,
    });
    writeFileSync(join(dir, 'board.pdf'), Buffer.from(pdf.data, 'base64'));
  } finally {
    tab.close();
  }
  return { html: htmlPath, pdf: join(dir, 'board.pdf'), misses, safeMisses, shots };
}
