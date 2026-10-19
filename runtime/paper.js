// Storygro paper kit: a cut-paper collage look for explainer scenes, built from DOM and inline SVG.
// Everything is deterministic (seeded jitter, no Math.random) and animated only through draw(t).
// Colours come from theme tokens with fallbacks, so a theme can restyle every scene:
//   --pp-paper, --pp-paper2, --pp-ink, --pp-muted, --pp-red, --pp-yellow, --pp-teal, --pp-blue,
//   --pp-card, --pp-font, --pp-display, --pp-hand (shadows are fixed: SHADOW)
import { clamp, ease, h, lerp, p, rand, set } from './kit.js';

export const C = {
  paper: 'var(--pp-paper, #f1e9da)',
  paper2: 'var(--pp-paper2, #e6dcc8)',
  ink: 'var(--pp-ink, #1d2433)',
  muted: 'var(--pp-muted, #6b6457)',
  red: 'var(--pp-red, #e2552f)',
  yellow: 'var(--pp-yellow, #f2b33d)',
  teal: 'var(--pp-teal, #2c8c80)',
  blue: 'var(--pp-blue, #3a5ba9)',
  card: 'var(--pp-card, #fbf7ef)',
  font: 'var(--pp-font, var(--rc-font, system-ui, sans-serif))',
  display: 'var(--pp-display, var(--pp-font, var(--rc-font, system-ui, sans-serif)))',
  hand: 'var(--pp-hand, var(--pp-font, cursive))',
};
export const tone = (name) => C[name] ?? name ?? C.ink;

let uid = 0;
const id = (p) => `pp-${p}-${++uid}`;

/** Drop shadow of a paper cut-out lying on paper: a crisp contact shadow plus a soft one. */
export const SHADOW = 'drop-shadow(0 2px 0 rgba(40,28,10,.22)) drop-shadow(0 12px 18px rgba(40,28,10,.16))';

/** A rough, hand-cut polygon for clip-path: rectangle edges with small seeded inward wobble. */
export function roughClip(seed = 1, wobble = 0.6, steps = 9) {
  const r = rand(seed * 7919 + 13);
  const pts = [];
  const j = () => (r() * wobble).toFixed(2);
  for (let i = 0; i <= steps; i++) pts.push(`${((100 * i) / steps).toFixed(2)}% ${j()}%`);
  for (let i = 1; i <= steps; i++) pts.push(`${100 - j()}% ${((100 * i) / steps).toFixed(2)}%`);
  for (let i = steps - 1; i >= 0; i--) pts.push(`${((100 * i) / steps).toFixed(2)}% ${100 - j()}%`);
  for (let i = steps - 1; i >= 1; i--) pts.push(`${j()}% ${((100 * i) / steps).toFixed(2)}%`);
  return `polygon(${pts.join(',')})`;
}

/** Full-bleed paper: base colour, fibre grain (SVG turbulence) and a soft vignette. */
export function paperBackground({ color = C.paper, grain = 0.5, seed = 3, decor = true } = {}) {
  const fid = id('grain');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" preserveAspectRatio="none">
  <filter id="${fid}" x="0" y="0" width="100%" height="100%">
    <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="3" seed="${seed}" stitchTiles="stitch"/>
    <feColorMatrix type="matrix" values="0 0 0 0 0.35  0 0 0 0 0.27  0 0 0 0 0.15  0 0 0 ${0.55 * grain} 0"/>
  </filter>
  <filter id="${fid}b" x="0" y="0" width="100%" height="100%">
    <feTurbulence type="fractalNoise" baseFrequency="0.012 0.03" numOctaves="2" seed="${seed + 5}"/>
    <feColorMatrix type="matrix" values="0 0 0 0 0.4  0 0 0 0 0.3  0 0 0 0 0.18  0 0 0 ${0.22 * grain} 0"/>
  </filter>
  <rect width="100%" height="100%" filter="url(#${fid}b)"/>
  <rect width="100%" height="100%" filter="url(#${fid})"/>
</svg>`;
  return h(
    'div',
    { class: 'pp-paper', style: { position: 'absolute', inset: '0', background: color, overflow: 'hidden' } },
    h('div', { style: { position: 'absolute', inset: '0' }, html: svg }),
    h('div', {
      style: { position: 'absolute', inset: '0', background: 'radial-gradient(ellipse 85% 70% at 50% 45%, transparent 55%, rgba(60,40,15,.16))' },
    }),
    ...(decor ? scraps(seed) : []),
  );
}

/** Torn paper scraps in the corners and edges (where platform UI sits anyway), for collage depth. */
function scraps(seed) {
  const r = rand(seed * 31 + 7);
  const tones = [C.yellow, C.blue, C.teal, C.red, C.paper2];
  const spots = [
    { left: -6, top: -3, w: 34, h: 9 },
    { left: 70, top: 86, w: 40, h: 12 },
    { left: -8, top: 90, w: 26, h: 8 },
    { left: 84, top: 4, w: 22, h: 7 },
  ];
  return spots.map((sp, i) => {
    const c = tones[Math.floor(r() * tones.length)];
    const rot = (r() - 0.5) * 16;
    return h('div', {
      style: {
        position: 'absolute', left: `${sp.left + (r() - 0.5) * 6}%`, top: `${sp.top + (r() - 0.5) * 3}%`, width: `${sp.w}%`, height: `${sp.h}%`,
        background: c, opacity: 0.55 + r() * 0.25, clipPath: roughClip(seed * 10 + i, 3.2, 12), transform: `rotate(${rot}deg)`, filter: SHADOW,
      },
    });
  });
}

/** A paper card with a hand-cut edge and a shadow. Returns the outer element (shadow) and the face. */
export function card({ seed = 1, color = C.card, radius = 0, wobble = 0.5, style = {}, face = {} } = {}, ...children) {
  const inner = h(
    'div',
    {
      class: 'pp-card',
      style: { position: 'absolute', inset: '0', background: color, clipPath: roughClip(seed, wobble), borderRadius: `${radius}px`, ...face },
    },
    ...children,
  );
  const outer = h('div', { style: { position: 'absolute', filter: SHADOW, willChange: 'transform', ...style } }, inner);
  return { el: outer, face: inner };
}

/** Text helper with the kit fonts. `size` is in px of the stage. */
export function text(str, { size = 48, weight = 600, color = C.ink, font = C.font, align = 'left', line = 1.15, style = {} } = {}) {
  return h('div', { style: { font: `${weight} ${size}px/${line} ${font}`, color, textAlign: align, ...style } }, str);
}

/** Split text into word spans for word-by-word reveals. */
export function words(str, style = {}) {
  return String(str)
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => h('span', { style: { display: 'inline-block', marginRight: '.26em', ...style } }, w));
}

/** Reveal word spans from t0, one every `gap` seconds, rising, fading in and settling a slight tilt. */
export function revealWords(spans, t, t0, gap = 0.07, dur = 0.45) {
  spans.forEach((w, j) => {
    const q = p(t, t0 + j * gap, dur, ease.outQuint);
    set(w, { opacity: q, transform: `translateY(${(1 - q) * 0.4}em) rotate(${(1 - q) * -3}deg)` });
  });
}

/**
 * Cut-paper person: head and body in flat colours. `kind` adds a cue for who it is:
 * junior (backpack strap), senior (glasses), worker (lanyard). Returns an SVG element sized by `size`.
 */
export function person({ size = 160, color = C.blue, skin = '#e9b48a', kind = 'worker', seed = 1 } = {}) {
  const r = rand(seed);
  const tilt = ((r() - 0.5) * 4).toFixed(2);
  const extra =
    kind === 'junior'
      ? `<path d="M34 70 L44 118" stroke="${'#1d2433'}" stroke-width="5" stroke-linecap="round" opacity=".55"/>`
      : kind === 'senior'
        ? `<g fill="none" stroke="#1d2433" stroke-width="3.2"><circle cx="43" cy="34" r="6.5"/><circle cx="58" cy="34" r="6.5"/><path d="M49.5 34h2"/></g>`
        : `<path d="M50 62 L50 92" stroke="#fbf7ef" stroke-width="4" opacity=".85"/><rect x="44" y="90" width="12" height="9" rx="2" fill="#fbf7ef"/>`;
  const svg = `<svg viewBox="0 0 100 160" width="${size * 0.625}" height="${size}" style="overflow:visible;transform:rotate(${tilt}deg)">
  <path d="M18 160 L22 92 Q24 64 50 62 Q76 64 78 92 L82 160 Z" fill="${color}"/>
  <circle cx="50" cy="34" r="22" fill="${skin}"/>
  <path d="M28 30 Q30 8 52 10 Q72 12 73 30 Q64 22 50 22 Q36 22 28 30 Z" fill="#2a2420" opacity=".9"/>
  ${extra}
</svg>`;
  return h('div', { class: 'pp-person', style: { position: 'absolute', filter: SHADOW, lineHeight: 0 }, html: svg });
}

/**
 * Scissors with blades that open and close: `draw(open)` with 0 = closed, 1 = open.
 * The pivot is the element's centre-left third.
 */
export function scissors({ size = 220, color = C.red } = {}) {
  const el = h('div', { class: 'pp-scissors', style: { position: 'absolute', width: `${size}px`, height: `${size * 0.6}px`, filter: SHADOW } });
  // one half: a blade to the right of the pivot (100,60) and a handle loop to the lower left
  const half = (flip) =>
    `<svg viewBox="0 0 200 120" width="100%" height="100%" style="position:absolute;inset:0;overflow:visible">
      <g transform="${flip ? 'translate(0,120) scale(1,-1)' : ''}">
        <path d="M92 66 C 120 58, 160 50, 198 44 C 168 58, 128 68, 96 74 Z" fill="#e3e7ec" stroke="#4d5561" stroke-width="3" stroke-linejoin="round"/>
        <path d="M100 60 L 70 86" stroke="${color}" stroke-width="14" stroke-linecap="round"/>
        <ellipse cx="48" cy="96" rx="27" ry="19" transform="rotate(-18 48 96)" fill="none" stroke="${color}" stroke-width="12"/>
      </g>
    </svg>`;
  const a = h('div', { style: { position: 'absolute', inset: '0', transformOrigin: '50% 50%' }, html: half(false) });
  const b = h('div', { style: { position: 'absolute', inset: '0', transformOrigin: '50% 50%' }, html: half(true) });
  const pin = h('div', {
    style: { position: 'absolute', left: `calc(50% - ${size * 0.03}px)`, top: `calc(50% - ${size * 0.03}px)`, width: `${size * 0.06}px`, height: `${size * 0.06}px`, borderRadius: '50%', background: '#3a414b', boxShadow: 'inset 0 0 0 2px #8a929e' },
  });
  el.append(a, b, pin);
  return {
    el,
    draw(open) {
      const ang = lerp(-4, 16, clamp(open));
      a.style.transform = `rotate(${-ang}deg)`;
      b.style.transform = `rotate(${ang}deg)`;
    },
  };
}

/** A marker stroke behind a word: grows left to right with progress k. */
export function marker({ color = C.yellow, height = '0.62em', skew = -4 } = {}) {
  const el = h('span', {
    style: {
      position: 'absolute', left: '-0.12em', right: '-0.12em', bottom: '0.06em', height, background: color, zIndex: '-1',
      transformOrigin: '0 50%', transform: `skewX(${skew}deg) scaleX(0)`, borderRadius: '0.12em', opacity: '.9',
    },
  });
  return { el, draw: (k) => (el.style.transform = `skewX(${skew}deg) scaleX(${clamp(k)})`) };
}

/** Wrap a word span so it can carry a marker behind it. */
export function markWord(span, opts) {
  const m = marker(opts);
  set(span, { position: 'relative', zIndex: '0' });
  span.prepend(m.el);
  return m;
}

/** Rubber stamp: bordered, rotated, slams in with overshoot at t0. */
export function stamp(str, { color = C.red, size = 64, rot = -8 } = {}) {
  const el = h(
    'div',
    {
      style: {
        position: 'absolute', font: `800 ${size}px/1 ${C.display}`, color, border: `${Math.max(4, size / 12)}px solid ${color}`,
        padding: `${size * 0.18}px ${size * 0.32}px`, borderRadius: `${size * 0.14}px`, textTransform: 'uppercase',
        letterSpacing: '.04em', mixBlendMode: 'multiply', whiteSpace: 'nowrap',
      },
    },
    str,
  );
  return {
    el,
    draw(t, t0) {
      const k = clamp((t - t0) / 0.32);
      set(el, { opacity: k > 0 ? clamp(k * 4) * 0.92 : 0, transform: `rotate(${rot}deg) scale(${lerp(2.2, 1, ease.outBack(k))})` });
    },
  };
}

/** Hand-drawn SVG path that draws itself: `draw(k)` with k in 0..1. Coordinates in stage px. */
export function scribble(d, { color = C.ink, width = 6, w = 1080, hgt = 1920, cap = 'round', arrow = false } = {}) {
  const pid = id('path');
  const svg = h('svg', { width: w, height: hgt, viewBox: `0 0 ${w} ${hgt}`, style: { position: 'absolute', left: 0, top: 0, overflow: 'visible', pointerEvents: 'none' } });
  svg.innerHTML = `<path id="${pid}" d="${d}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="${cap}" stroke-linejoin="round"/>${
    arrow ? `<path id="${pid}h" d="" fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"/>` : ''
  }`;
  const path = svg.querySelector(`#${pid}`);
  const head = arrow ? svg.querySelector(`#${pid}h`) : null;
  let len = 0;
  return {
    el: svg,
    draw(k) {
      if (!len) len = path.getTotalLength() || 1;
      path.style.strokeDasharray = `${len}`;
      path.style.strokeDashoffset = `${len * (1 - clamp(k))}`;
      if (head) {
        if (k < 0.98) {
          head.setAttribute('d', '');
          return;
        }
        const end = path.getPointAtLength(len);
        const prev = path.getPointAtLength(Math.max(0, len - 18));
        const a = Math.atan2(end.y - prev.y, end.x - prev.x);
        const s = width * 4.2;
        const p1 = [end.x - s * Math.cos(a - 0.5), end.y - s * Math.sin(a - 0.5)];
        const p2 = [end.x - s * Math.cos(a + 0.5), end.y - s * Math.sin(a + 0.5)];
        head.setAttribute('d', `M${p1[0]} ${p1[1]} L${end.x} ${end.y} L${p2[0]} ${p2[1]}`);
      }
    },
  };
}

/** A small source line at the bottom of the content area. */
export function sourceLine(str, { size = 26, color = C.muted } = {}) {
  return h('div', { style: { font: `500 ${size}px/1.25 ${C.font}`, color, letterSpacing: '.01em' } }, str);
}

/**
 * Safe content box of the stage: inside the platform UI margins, above the captions, and inset a
 * little more so camera drift and tilted cut-outs never push text into the UI.
 */
export function box(ctx, captionReserve, inset) {
  const s = ctx.safe ?? { top: 0, bottom: 0, left: 0, right: 0, caption: 0 };
  const reserve = captionReserve ?? (ctx.captions === false ? 0 : ctx.height > ctx.width ? Math.round(ctx.width * 0.17) : Math.round(ctx.height * 0.1));
  const m = inset ?? Math.round(Math.min(ctx.width, ctx.height) * 0.024);
  const left = s.left + m;
  const right = ctx.width - s.right - m;
  const top = s.top + m;
  const bottom = ctx.height - (ctx.captions === false ? s.bottom : Math.max(s.bottom, s.caption)) - reserve - (ctx.captions === false ? m : 0);
  return { left, right, top, bottom, width: right - left, height: bottom - top, cx: left + (right - left) / 2 };
}

/** Gentle settle: a cut-out drops onto the paper with a small rotation and overshoot. */
export function drop(el, t, t0, { from = -60, rot = 0, dur = 0.5, base = '' } = {}) {
  const k = clamp((t - t0) / dur);
  const e = ease.outBack(k);
  set(el, { opacity: clamp(k * 3), transform: `${base} translateY(${(1 - e) * from}px) rotate(${rot * (1 - e) + rot * 0.15}deg) scale(${lerp(1.06, 1, e)})` });
  return k;
}

/**
 * Shrink an element's font size until its content fits `maxWidth` (and `maxHeight`, if given).
 * Call it from draw(): the player draws only after fonts load, and the result is the same every time.
 */
export function fitText(el, { maxWidth, maxHeight = Infinity, min = 18 } = {}) {
  if (el.dataset.fitted) return;
  let size = Number.parseFloat(getComputedStyle(el).fontSize) || 48;
  const range = document.createRange();
  const fits = () => {
    range.selectNodeContents(el);
    // the text's own extent, whatever width the element box was given
    return range.getBoundingClientRect().width <= maxWidth + 1 && el.scrollHeight <= maxHeight + 1;
  };
  for (let i = 0; i < 40 && !fits() && size > min; i++) {
    size = Math.max(min, size * 0.95);
    el.style.fontSize = `${size}px`;
  }
  el.dataset.fitted = '1';
}
