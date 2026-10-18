import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { Tab } from './cdp.ts';
import { serve } from './serve.ts';
import { captionText, type LoadedSpec } from './spec.ts';
import { type Timeline, workDir } from './timeline.ts';

const READY = "document.documentElement.dataset.ready === '1'";
const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export interface SceneShot {
  id: string;
  at: number;
  png: string;
  text: string;
}

/** Text a viewer can actually see in the scene: on stage, not transparent, not hidden. */
const VISIBLE_TEXT = (id: string) => `(() => {
  const root = document.querySelector('.rc-scene--${id}');
  if (!root) return '';
  const stage = document.getElementById('stage').getBoundingClientRect();
  const seen = new Set();
  const out = [];
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
    const r = el.getBoundingClientRect();
    const onStage = r.width > 0 && r.right > stage.left && r.left < stage.right && r.bottom > stage.top && r.top < stage.bottom;
    if (!ok || op < 0.15 || !onStage) continue;
    if (!seen.has(txt)) { seen.add(txt); out.push(txt); }
  }
  return out.join('\\n');
})()`;

/** The moment that sums a scene up: just after its voice ends, or props.keyAt. */
function keyMoment(s: Timeline['scenes'][number]): number {
  const k = s.props.keyAt;
  if (typeof k === 'number') return k;
  if (typeof k === 'string' && s.cues[k] !== undefined) return s.cues[k]!;
  return Math.max(0, Math.min(s.duration - 0.05, s.voiceAt + s.voice.duration + 0.15));
}

/** One still and the on-screen text per scene, read from the live DOM. */
export async function captureScenes(l: LoadedSpec, tl: Timeline): Promise<SceneShot[]> {
  const dir = join(workDir(l), 'board');
  mkdirSync(dir, { recursive: true });
  const { server, origin } = await serve(l.dir);
  const tab = await Tab.open(tl.width, tl.height);
  const shots: SceneShot[] = [];
  try {
    await tab.goto(`${origin}/rc/runtime/index.html?timeline=/spec/.reel/timeline.json`, READY);
    for (const s of tl.scenes) {
      const at = keyMoment(s);
      await tab.eval(`reel.seek(${s.start + at})`);
      const png = join(dir, `${s.id}.png`);
      writeFileSync(png, await tab.shot('jpeg', 80));
      const text = await tab.eval<string>(VISIBLE_TEXT(s.id));
      shots.push({ id: s.id, at, png, text: text.replace(/\n{2,}/g, '\n').trim() });
    }
  } finally {
    tab.close();
    server.close();
  }
  return shots;
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

export function specHash(l: LoadedSpec): string {
  const parts = [readFileSync(l.path, 'utf8')];
  for (const p of Object.values(l.spec.data)) parts.push(readFileSync(resolve(l.dir, p), 'utf8'));
  return createHash('sha1').update(parts.join('\0')).digest('hex').slice(0, 12);
}

export function approval(l: LoadedSpec): { approved: boolean; hash: string; at?: string } {
  const hash = specHash(l);
  const f = join(workDir(l), 'approved.json');
  if (!existsSync(f)) return { approved: false, hash };
  const a = JSON.parse(readFileSync(f, 'utf8'));
  return { approved: a.hash === hash, hash, at: a.at };
}

export function approve(l: LoadedSpec, by: string): string {
  const hash = specHash(l);
  writeFileSync(
    join(workDir(l), 'approved.json'),
    JSON.stringify({ hash, at: new Date().toISOString(), by }, null, 1),
  );
  return hash;
}

const fmt = (t: number) => `${t.toFixed(1)}`;

/** The storyboard: one card per scene — time, voice, what is on screen, sound, still. */
export function boardHtml(l: LoadedSpec, tl: Timeline, shots: SceneShot[], misses: { scene: string; value: string }[]) {
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
    </div>
    <figure><img src="${img(shot.png)}"><figcaption>frame at ${fmt(s.start + shot.at)} s</figcaption></figure>
  </div>
</section>`;
  };
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${esc(spec.title)} — storyboard</title>
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
  .body { display: grid; grid-template-columns: 1fr 360px; gap: 18px; padding: 8px 14px 12px; }
  .say { font-size: 15px; margin: 0; } .screen { margin: 0; font-size: 13px; color: var(--ink); } .sep { color: var(--line); } .cue { font: 11px ui-monospace, monospace; background: #f3ead6; color: #7a5a12; border-radius: 4px; padding: 1px 5px; margin: 0 2px; }
  .cue.pause { background: #e3eef9; color: #1f5f9f; } .ph { border-bottom: 1px dotted var(--accent); }
  ul { margin: 0; padding-left: 18px; } li { margin: 1px 0; } .meta { margin: 0; color: var(--muted); font-size: 13px; }
  .warn { color: var(--bad); font-weight: 600; }
  figure { margin: 8px 0 0; } figure img { width: 100%; border-radius: 8px; border: 1px solid var(--line); display: block; }
  figcaption { font-size: 12px; color: var(--muted); margin-top: 4px; }
  @media print { body { padding: 0; } }
</style></head><body>
<h1>${esc(spec.title)}</h1>
<p class="sub">Storyboard before recording · ${tl.width}×${tl.height} · ${tl.fps} fps · voice ${esc(spec.voice.voice)}</p>
<div class="stats">
  <div><b>${fmt(tl.duration)} s</b>length</div>
  <div><b>${tl.scenes.length}</b>scenes</div>
  <div><b>${words}</b>spoken words</div>
  <div><b>${(words / Math.max(1, speech)).toFixed(2)}</b>words / s of speech</div>
  <div><b style="color:${misses.length ? 'var(--bad)' : 'var(--ok)'}">${misses.length ? `${misses.length} issue(s)` : 'clean'}</b>facts gate</div>
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
  const shots = await captureScenes(l, tl);
  const misses = factsGate(l, shots);
  const html = boardHtml(l, tl, shots, misses);
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
  return { html: htmlPath, pdf: join(dir, 'board.pdf'), misses, shots };
}
