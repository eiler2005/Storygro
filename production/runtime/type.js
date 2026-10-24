// Tokens and helpers shared by the typographic scenes (kinetic, timeline, process, scale). Colours and
// fonts come from the theme (--kt-* in the kinetic-type style) and fall back to the cut-paper tokens,
// so the same scenes also sit in a paper reel.

export const K = {
  bg: 'var(--kt-bg, var(--pp-paper, #11141c))',
  panel: 'var(--kt-panel, var(--pp-card, #1c2232))',
  line: 'var(--kt-line, rgba(127,127,127,.35))',
  ink: 'var(--kt-ink, var(--pp-ink, #f3ecdf))',
  muted: 'var(--kt-muted, var(--pp-muted, #8d92a3))',
  accent: 'var(--kt-accent, var(--pp-red, #ff5b37))',
  accent2: 'var(--kt-accent2, var(--pp-yellow, #ffc53d))',
  cool: 'var(--kt-cool, var(--pp-teal, #3cc4b3))',
  display: "var(--kt-display, var(--pp-display, 'Unbounded', 'Golos Text', Arial, sans-serif))",
  font: "var(--kt-font, var(--pp-font, 'Golos Text', Arial, sans-serif))",
};

const TONES = { ink: K.ink, muted: K.muted, accent: K.accent, accent2: K.accent2, cool: K.cool };
/** A tone name (ink, muted, accent, accent2, cool) or any CSS colour. */
export const toneOf = (name) => TONES[name] ?? name ?? K.ink;

const norm = (w) => String(w).toLowerCase().replace(/ё/g, 'е').replace(/[^\p{L}\p{N}]+/gu, '');

/**
 * When the words of `text` are spoken: each word is looked up in order among ctx.words (caption
 * spelling, scene seconds) starting at `after`, a few words of slack at most; null where not found.
 */
export function spokenTimes(words, text, after = -Infinity) {
  const out = [];
  let i = words.findIndex((w) => w.start >= after - 1e-6);
  if (i < 0) i = words.length;
  for (const token of String(text).split(/\s+/).filter(Boolean)) {
    const n = norm(token);
    let j = i;
    while (n && j < words.length && j - i <= 6 && norm(words[j].w) !== n) j++;
    if (n && j < words.length && j - i <= 6) {
      out.push(words[j].start);
      i = j + 1;
    } else out.push(null);
  }
  return out;
}

/** Times for every word of a line: spoken times where found, otherwise a short stagger from t0. */
export function wordTimes(spoken, t0, gap = 0.12) {
  let prev = t0 - gap;
  return spoken.map((s) => {
    const v = s !== null && s >= t0 - 1e-6 ? s : prev + gap;
    prev = v;
    return v;
  });
}

/** A field background: the theme colour with a soft light from above and a faint grid. */
export function field(h, { color = K.bg, grid = true } = {}) {
  return h('div', {
    style: {
      position: 'absolute',
      inset: '0',
      background: `radial-gradient(120% 70% at 50% 18%, rgba(255,255,255,.07), rgba(255,255,255,0) 60%), ${color}`,
      backgroundColor: color,
    },
  }, grid ? h('div', {
    style: {
      position: 'absolute',
      inset: '0',
      opacity: '.5',
      backgroundImage: `linear-gradient(${K.line} 1px, transparent 1px), linear-gradient(90deg, ${K.line} 1px, transparent 1px)`,
      backgroundSize: '72px 72px',
      maskImage: 'radial-gradient(90% 70% at 50% 45%, #000 0%, transparent 85%)',
      WebkitMaskImage: 'radial-gradient(90% 70% at 50% 45%, #000 0%, transparent 85%)',
    },
  }) : null);
}
