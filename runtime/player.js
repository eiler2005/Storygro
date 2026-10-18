// Storygro player: mounts every scene once, then draws any moment T on demand.
// Render mode: the renderer calls `await reel.seek(T)` per frame and screenshots the stage.
// Preview mode (?preview=1): plays the audio mix and follows it, with a scrubber.
import * as kit from './kit.js';

const params = new URLSearchParams(location.search);
const timelineUrl = params.get('timeline') ?? 'timeline.json';
const preview = params.has('preview');

const tl = await (await fetch(timelineUrl)).json();
const base = new URL(tl.base ?? './', new URL(timelineUrl, location.href));
const url = (p) => new URL(p, base).href;

const stage = document.getElementById('stage');
stage.style.width = `${tl.width}px`;
stage.style.height = `${tl.height}px`;
if (tl.theme) document.head.append(kit.h('link', { rel: 'stylesheet', href: url(tl.theme) }));

const layers = [];
for (const s of tl.scenes) {
  const root = kit.h('div', { class: `rc-scene rc-scene--${s.id}`, 'data-id': s.id });
  stage.append(root);
  const ctx = {
    id: s.id,
    props: s.props,
    duration: s.duration,
    voiceAt: s.voiceAt,
    cues: s.cues,
    words: s.words,
    width: tl.width,
    height: tl.height,
    kit,
    asset: (p) => url(p),
  };
  let draw;
  try {
    const mod = (await import(url(s.module))).default;
    draw = await mod.mount(root, ctx);
  } catch (e) {
    // a broken scene shows itself instead of taking the whole reel down
    window.__reelErrors = [...(window.__reelErrors ?? []), `${s.id}: ${e?.stack ?? e}`];
    root.replaceChildren(
      kit.h('pre', { style: { position: 'absolute', inset: '200px 140px', color: '#ff6b5e', font: '24px/1.4 monospace', whiteSpace: 'pre-wrap' } }, `scene ${s.id} failed:\n${e?.stack ?? e}`),
    );
    draw = () => {};
  }
  layers.push({ s, root, draw });
}

let overlay = null;
if (tl.overlay) {
  const root = kit.h('div', { class: 'rc-overlay' });
  stage.append(root);
  try {
    const mod = (await import(url(tl.overlay))).default;
    overlay = await mod.mount(root, { width: tl.width, height: tl.height, kit, scenes: tl.scenes, asset: (p) => url(p) });
  } catch (e) {
    window.__reelErrors = [...(window.__reelErrors ?? []), `overlay: ${e?.stack ?? e}`];
  }
}

const caption = kit.h('div', { class: 'rc-caption' });
if (tl.captions?.show) stage.append(caption);
const flash = kit.h('div', { class: 'rc-flash' });
stage.append(flash);

// caption phrases per scene: up to maxWords, broken after sentence punctuation
const phrases = tl.scenes.map((s) => {
  const out = [];
  let cur = [];
  for (const w of s.words) {
    cur.push(w);
    const end = /[.!?…:;—]$/.test(w.w) || (/,$/.test(w.w) && cur.length >= 4);
    if (end || cur.length >= (tl.captions?.maxWords ?? 7)) {
      out.push(cur);
      cur = [];
    }
  }
  if (cur.length) out.push(cur);
  return out;
});
const captionKey = { v: '' };

function drawCaption(T) {
  let html = '';
  tl.scenes.forEach((s, i) => {
    const lt = T - s.start;
    for (const ph of phrases[i]) {
      const a = ph[0].start - 0.08;
      const next = phrases[i][phrases[i].indexOf(ph) + 1];
      const b = next ? next[0].start - 0.08 : ph[ph.length - 1].end + 0.5;
      if (lt >= a && lt < b) {
        html = ph
          .map((w) => `<span class="rc-word${lt >= w.start - 0.03 ? ' on' : ''}">${w.w.replace(/</g, '&lt;')}</span>`)
          .join(' ');
      }
    }
  });
  if (html !== captionKey.v) {
    caption.innerHTML = html;
    captionKey.v = html;
  }
  caption.style.opacity = html ? '1' : '0';
}

function drawFrame(T) {
  let current = 0;
  layers.forEach((l, i) => {
    const s = l.s;
    const tr = s.transition; // transition into this scene
    const next = layers[i + 1]?.s;
    const half = tr && i > 0 ? tr.dur / 2 : 0;
    const halfOut = next?.transition ? next.transition.dur / 2 : 0;
    const visible = T >= s.start - half && T < s.end + halfOut;
    if (T >= s.start) current = i;
    if (!visible) {
      l.root.style.display = 'none';
      return;
    }
    l.root.style.display = '';
    try {
      l.draw(T - s.start);
    } catch (e) {
      if (!l.failed) window.__reelErrors = [...(window.__reelErrors ?? []), `${s.id} @${(T - s.start).toFixed(2)}: ${e?.stack ?? e}`];
      l.failed = true;
    }
    let opacity = 1;
    let transform = '';
    let z = 1;
    if (half && T < s.start + half) {
      const k = kit.ease.inOut(kit.clamp((T - (s.start - half)) / (2 * half)));
      z = 2;
      if (tr.kind === 'fade' || tr.kind === 'flash') opacity = k;
      if (tr.kind === 'push') transform = `translateX(${(1 - k) * 100}%)`;
      if (tr.kind === 'zoom') {
        opacity = k;
        transform = `scale(${kit.lerp(0.9, 1, k)})`;
      }
    }
    if (halfOut && T >= s.end - halfOut) {
      const k = kit.ease.inOut(kit.clamp((T - (s.end - halfOut)) / (2 * halfOut)));
      if (next.transition.kind === 'push') transform = `translateX(${-k * 100}%)`;
      if (next.transition.kind === 'zoom') transform = `scale(${kit.lerp(1, 1.12, k)})`;
      if (next.transition.kind === 'cut' && T >= s.end) opacity = 0;
    }
    if (tr?.kind === 'cut' && T < s.start) opacity = 0;
    l.root.style.opacity = String(opacity);
    l.root.style.transform = transform;
    l.root.style.zIndex = String(z);
  });
  // flash transitions: a short white bloom centred on the cut
  let f = 0;
  for (const l of layers) {
    const tr = l.s.transition;
    if (tr?.kind === 'flash') f = Math.max(f, 1 - Math.abs(T - l.s.start) / (tr.dur / 2));
  }
  flash.style.opacity = String(kit.clamp(f) * 0.85);
  const s = layers[current].s;
  overlay?.({ T, id: s.id, index: current, t: T - s.start, scene: s, duration: tl.duration });
  if (tl.captions?.show) drawCaption(T);
}

const fontsReady = document.fonts.ready;
const imagesReady = Promise.all(
  [...document.images].map((img) => (img.complete ? null : new Promise((r) => img.addEventListener('load', r, { once: true })))),
);
await Promise.all([fontsReady, imagesReady]);

window.reel = {
  timeline: tl,
  duration: tl.duration,
  async seek(T) {
    drawFrame(T);
    await new Promise((r) => requestAnimationFrame(() => r()));
    return T;
  },
};
drawFrame(0);
document.documentElement.dataset.ready = '1';

if (preview) {
  const fit = () => {
    const k = Math.min(innerWidth / tl.width, (innerHeight - 64) / tl.height);
    stage.style.transform = `scale(${k})`;
  };
  fit();
  addEventListener('resize', fit);
  const audio = new Audio(url(tl.audio));
  const bar = kit.h('input', { type: 'range', min: 0, max: tl.duration, step: 0.01, value: 0, class: 'rc-scrub' });
  const label = kit.h('span', { class: 'rc-time' });
  document.body.append(kit.h('div', { class: 'rc-controls' }, bar, label));
  bar.addEventListener('input', () => {
    audio.currentTime = Number(bar.value);
    drawFrame(audio.currentTime);
  });
  addEventListener('keydown', (e) => {
    if (e.code === 'Space') audio.paused ? audio.play() : audio.pause();
    if (e.code === 'ArrowRight') audio.currentTime += 2;
    if (e.code === 'ArrowLeft') audio.currentTime -= 2;
  });
  stage.addEventListener('click', () => (audio.paused ? audio.play() : audio.pause()));
  const loop = () => {
    const T = audio.currentTime;
    drawFrame(T);
    bar.value = String(T);
    const s = layers.findLast((l) => l.s.start <= T)?.s;
    label.textContent = `${T.toFixed(2)}s · ${s?.id ?? ''}`;
    requestAnimationFrame(loop);
  };
  loop();
}
