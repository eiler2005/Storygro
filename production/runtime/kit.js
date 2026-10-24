// Storygro scene kit: pure helpers for time-driven animation. Every visual is a function of t.

export const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, k) => a + (b - a) * k;

export const ease = {
  linear: (k) => k,
  out: (k) => 1 - (1 - k) ** 3,
  in: (k) => k ** 3,
  inOut: (k) => (k < 0.5 ? 4 * k ** 3 : 1 - (-2 * k + 2) ** 3 / 2),
  outBack: (k) => {
    const c = 1.70158;
    return 1 + (c + 1) * (k - 1) ** 3 + c * (k - 1) ** 2;
  },
  outElastic: (k) =>
    k === 0 || k === 1 ? k : 2 ** (-10 * k) * Math.sin((k * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1,
  outQuint: (k) => 1 - (1 - k) ** 5,
};

/** Progress 0..1 of a segment that starts at t0 and lasts dur, eased. */
export function p(t, t0, dur = 0.5, fn = ease.out) {
  return fn(clamp((t - t0) / dur));
}

/** Window: 0 before t0, eases in to 1, holds, eases out to 0 after t1. */
export function win(t, t0, t1, fade = 0.3, fn = ease.inOut) {
  return Math.min(p(t, t0, fade, fn), 1 - p(t, t1 - fade, fade, fn));
}

/**
 * Damped spring from `from` to `to`, released at t0 with no initial velocity. Closed form, so any
 * frame renders in any order. The defaults settle in about half a second with a 3 % overshoot.
 */
export function spring(t, t0, { from = 0, to = 1, stiffness = 180, damping = 20, mass = 1 } = {}) {
  const tau = t - t0;
  if (tau <= 0) return from;
  const d0 = from - to;
  const w0 = Math.sqrt(stiffness / mass);
  const zeta = damping / (2 * Math.sqrt(stiffness * mass));
  let d;
  if (zeta < 1) {
    const wd = w0 * Math.sqrt(1 - zeta * zeta);
    d = Math.exp(-zeta * w0 * tau) * (d0 * Math.cos(wd * tau) + ((zeta * w0 * d0) / wd) * Math.sin(wd * tau));
  } else if (zeta === 1) {
    d = (d0 + w0 * d0 * tau) * Math.exp(-w0 * tau);
  } else {
    const s = Math.sqrt(zeta * zeta - 1);
    const r1 = -w0 * (zeta - s);
    const r2 = -w0 * (zeta + s);
    d = (d0 * r2 * Math.exp(r1 * tau) - d0 * r1 * Math.exp(r2 * tau)) / (r2 - r1);
  }
  return to + d;
}

/** A value that changes target several times: one spring per change, summed, so it never jumps. */
export function springs(t, from, changes, opts = {}) {
  let v = from;
  let prev = from;
  for (const c of changes) {
    v += spring(t, c.at, { ...opts, from: 0, to: c.to - prev });
    prev = c.to;
  }
  return v;
}

/** The music's beat grid as score.py lays it out: bars from `origin`, the drop on a downbeat. */
export function beatGrid({ bpm = 96, dropAt = null } = {}) {
  const beat = 60 / bpm;
  const bar = beat * 4;
  return { bpm, beat, bar, origin: dropAt === null || dropAt === undefined ? 0 : (dropAt % bar) - bar };
}

/**
 * Beat helpers in scene seconds for a scene starting at `start` (reel seconds). `step` is in beats:
 * 1 a beat, 0.5 a half beat, 4 a bar.
 */
export function beats(grid, start = 0) {
  const g = (t) => t + start - grid.origin;
  const len = (step) => grid.beat * step;
  return {
    grid,
    /** scene time of reel beat n */
    at: (n) => grid.origin + n * grid.beat - start,
    /** reel beat index at scene time t */
    index: (t, step = 1) => Math.floor(g(t) / len(step) + 1e-9),
    /** first grid point at or after t */
    next: (t, step = 1) => Math.ceil(g(t) / len(step) - 1e-9) * len(step) + grid.origin - start,
    /** nearest grid point */
    snap: (t, step = 1) => Math.round(g(t) / len(step)) * len(step) + grid.origin - start,
    /** 1 on each grid point, decaying towards 0 until the next one */
    pulse: (t, decay = 0.18, step = 1) => {
      const since = g(t) - Math.floor(g(t) / len(step) + 1e-9) * len(step);
      return Math.exp(-since / decay);
    },
  };
}

/** DOM builder: h('div', {class: 'x', style: {left: '4px'}}, 'text', child). */
export function h(tag, attrs = {}, ...children) {
  const svg = ['svg', 'path', 'circle', 'rect', 'line', 'g', 'polyline', 'text', 'defs', 'linearGradient', 'stop'].includes(tag);
  const el = svg ? document.createElementNS('http://www.w3.org/2000/svg', tag) : document.createElement(tag);
  for (const [k, v] of Object.entries(attrs ?? {})) {
    if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k === 'html') el.innerHTML = v;
    else if (v !== undefined && v !== null && v !== false) el.setAttribute(k, v === true ? '' : String(v));
  }
  for (const c of children.flat()) if (c !== null && c !== undefined && c !== false) el.append(c instanceof Node ? c : String(c));
  return el;
}

/** Apply a style object; numbers for transform-ish keys are left to the caller. */
export function set(el, styles) {
  for (const [k, v] of Object.entries(styles)) {
    if (k.startsWith('--')) el.style.setProperty(k, String(v));
    else el.style[k] = v;
  }
}

/** Fade + rise in at t0. */
export function fadeUp(el, t, t0, dur = 0.5, dist = 24) {
  const k = p(t, t0, dur);
  set(el, { opacity: k, transform: `translateY(${(1 - k) * dist}px)` });
  return k;
}

/** Scale pop in at t0 (overshoots a little). */
export function pop(el, t, t0, dur = 0.45, from = 0.6) {
  const k = clamp((t - t0) / dur);
  set(el, { opacity: clamp(k * 3), transform: `scale(${lerp(from, 1, ease.outBack(k))})` });
  return k;
}

/** Typewriter: the visible part of `text` at time t. */
export function type(t, t0, text, cps = 28) {
  const n = Math.floor(clamp((t - t0) * cps, 0, text.length));
  return text.slice(0, n);
}

/** Animated number between from and to. */
export function count(t, t0, dur, from, to, fmt = (v) => Math.round(v).toString()) {
  return fmt(lerp(from, to, p(t, t0, dur, ease.outQuint)));
}

/** Deterministic pseudo-random generator; never use Math.random in a scene. */
export function rand(seed = 1) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) % 1_000_000) / 1_000_000;
  };
}

/** Cue time in scene seconds, with a fallback when the script lost the marker. */
export function cue(ctx, name, fallback = 0) {
  const v = ctx.cues?.[name];
  return typeof v === 'number' ? v : fallback;
}

/** Gentle camera drift so stills never look frozen. */
export function drift(t, amount = 1, speed = 0.08) {
  return `scale(${1 + amount * 0.03 * Math.min(1, t * speed)}) translate(${Math.sin(t * 0.37) * amount * 4}px, ${Math.cos(t * 0.29) * amount * 3}px)`;
}

/** Inline SVG icon marks used across scenes. */
export const icon = {
  tick: (size = 28, color = '#fff') =>
    `<svg width="${size}" height="${size}" viewBox="0 0 24 24"><path d="M5 12.5l4.2 4.2L19 7" fill="none" stroke="${color}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  cross: (size = 28, color = '#fff') =>
    `<svg width="${size}" height="${size}" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18" fill="none" stroke="${color}" stroke-width="3" stroke-linecap="round"/></svg>`,
  bang: (size = 28, color = '#fff') =>
    `<svg width="${size}" height="${size}" viewBox="0 0 24 24"><path d="M12 5v9" stroke="${color}" stroke-width="3.2" stroke-linecap="round"/><circle cx="12" cy="18.5" r="1.9" fill="${color}"/></svg>`,
};
