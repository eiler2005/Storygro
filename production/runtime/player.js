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

const errors = (window.__reelErrors = window.__reelErrors ?? []);
const stage = document.getElementById('stage');
stage.style.width = `${tl.width}px`;
stage.style.height = `${tl.height}px`;
if (tl.lang) document.documentElement.lang = tl.lang;
// safe-area tokens from the format's platform profile; a theme loaded after may override them
if (tl.safe) {
  const s = tl.safe;
  const wide = s.profile === 'landscape';
  const vars = {
    '--rc-safe-top': `${s.top}px`,
    '--rc-safe-bottom': `${s.bottom}px`,
    '--rc-safe-left': `${s.left}px`,
    '--rc-safe-right': `${s.right}px`,
    '--rc-safe-x': `${Math.max(s.left, s.right)}px`,
    '--rc-caption-bottom': `${s.caption}px`,
    ...(wide
      ? {}
      : {
          '--rc-caption-x': `${s.left + (tl.width - s.left - s.right) / 2}px`,
          '--rc-caption-max': `${tl.width - s.left - s.right}px`,
          '--rc-caption-width': 'max-content',
        }),
  };
  document.head.prepend(kit.h('style', { id: 'rc-safe' }, `:root{${Object.entries(vars).map(([k, v]) => `${k}:${v}`).join(';')}}`));
}
if (tl.theme) {
  const link = kit.h('link', { rel: 'stylesheet', href: url(tl.theme) });
  link.addEventListener('error', () => errors.push(`theme: ${tl.theme} did not load`));
  document.head.append(link);
}

const grid = kit.beatGrid(tl.music ?? {});
const layers = [];
for (const s of tl.scenes) {
  const root = kit.h('div', { class: `rc-scene rc-scene--${s.id}`, 'data-id': s.id });
  stage.append(root);
  const ctx = {
    id: s.id,
    props: s.props,
    duration: s.duration,
    start: s.start,
    beats: kit.beats(grid, s.start),
    voiceAt: s.voiceAt,
    cues: s.cues,
    words: s.words,
    width: tl.width,
    height: tl.height,
    safe: tl.safe,
    lang: tl.lang,
    captions: !!tl.captions?.show,
    kit,
    asset: (p) => url(p),
  };
  let draw;
  try {
    const mod = (await import(url(s.module))).default;
    draw = await mod.mount(root, ctx);
  } catch (e) {
    // a broken scene shows itself instead of taking the whole reel down; the renderer refuses it
    errors.push(`${s.id}: ${e?.stack ?? e}`);
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
    errors.push(`overlay: ${e?.stack ?? e}`);
  }
}

const caption = kit.h('div', { class: 'rc-caption' });
if (tl.captions?.show) stage.append(caption);
const flash = kit.h('div', { class: 'rc-flash' });
stage.append(flash);

// caption phrases per scene: up to maxWords, broken after sentence punctuation (also before a closing quote)
const phrases = tl.scenes.map((s) => {
  const out = [];
  let cur = [];
  for (const w of s.words) {
    cur.push(w);
    const end = /[.!?…:;—][»"”)]*$/.test(w.w) || (/,[»"”)]*$/.test(w.w) && cur.length >= 4);
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

// Returns the promises of scenes that need a moment to finish a frame (e.g. decoding a screencast
// image); seek() waits for them, so a captured frame is always complete. Draw stays a function of T.
function drawFrame(T) {
  const pending = [];
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
      const r = l.draw(T - s.start);
      if (r && typeof r.then === 'function')
        pending.push(r.catch((e) => errors.push(`${s.id} @${(T - s.start).toFixed(2)}: ${e?.stack ?? e}`)));
    } catch (e) {
      if (!l.failed) errors.push(`${s.id} @${(T - s.start).toFixed(2)}: ${e?.stack ?? e}`);
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
  return pending;
}

// a missing image or font is an error, not a silently different frame
const imageDone = (img) => {
  if (img.complete && img.naturalWidth === 0 && img.getAttribute('src')) errors.push(`image did not load: ${img.getAttribute('src')}`);
};
const imagesReady = Promise.all(
  [...document.images].map((img) =>
    img.complete
      ? imageDone(img)
      : new Promise((r) => {
          img.addEventListener('load', r, { once: true });
          img.addEventListener('error', () => r(imageDone(img)), { once: true });
        }),
  ),
);
await Promise.all([document.fonts.ready, imagesReady]);
for (const f of document.fonts) if (f.status === 'error') errors.push(`font did not load: ${f.family} ${f.weight} ${f.style}`);

if (params.has('guides') && tl.safe) {
  // review aid: platform UI zones in red, the safe box outlined
  const s = tl.safe;
  const band = (style) => kit.h('div', { style: { position: 'absolute', background: 'rgba(255,40,40,.28)', ...style } });
  stage.append(
    kit.h(
      'div',
      { class: 'rc-guides', style: { position: 'absolute', inset: '0', zIndex: 40, pointerEvents: 'none' } },
      band({ left: 0, right: 0, top: 0, height: `${s.top}px` }),
      band({ left: 0, right: 0, bottom: 0, height: `${s.bottom}px` }),
      band({ left: 0, top: `${s.top}px`, bottom: `${s.bottom}px`, width: `${s.left}px` }),
      band({ right: 0, top: `${s.top}px`, bottom: `${s.bottom}px`, width: `${s.right}px` }),
      kit.h('div', {
        style: { position: 'absolute', left: `${s.left}px`, right: `${s.right}px`, top: `${s.top}px`, bottom: `${s.bottom}px`, outline: '3px dashed rgba(255,255,255,.8)' },
      }),
      kit.h('div', { style: { position: 'absolute', left: '12px', top: '10px', font: '600 22px monospace', color: '#fff' } }, `safe: ${s.profile}`),
    ),
  );
}

window.reel = {
  timeline: tl,
  duration: tl.duration,
  async seek(T) {
    await Promise.all(drawFrame(T));
    await new Promise((r) => requestAnimationFrame(() => r()));
    return T;
  },
};
await Promise.all(drawFrame(0));
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
